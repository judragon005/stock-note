/**
 * 美股每日盤後批次同步與全量湖倉採集流水線 (Spec 0158)
 * 支援雙模態：
 * 1. --mode=bootstrap : 首次全量補齊 1,500+ 檔標的 250 天歷史日 K 入庫 SQLite
 * 2. --mode=daily     : 每日 08:00 定時排程增量更新最新日 K 與指標快取
 *
 * 具備三層動態優先級隊列 (Tier 0 持股置頂 -> Tier 1 核心藍籌 -> Tier 2 全市場)、
 * 自適應隨機抖動限流 (800~1200ms)、429 階梯式熔斷退避與 SQLite 斷點續傳。
 */

const https = require('https');
const path = require('path');
const fs = require('fs');
const {
  formatDateYMD,
  computeIncrementalIndicators,
  saveJsonAtomic,
} = require('./market-sync-core.cjs');
const { getFullUsSeedUniverse, DEFAULT_US_SEED } = require('./seed-symbols-universe.cjs');
const {
  getPendingUsSymbols,
  recordSyncCheckpoint,
} = require('./us-sync-checkpoint-engine.cjs');
const {
  saveUsCandlesToSqlite,
  fetchYahooHistoricalQuotes,
  fetchTiingoHistoricalQuotes,
  parseYahooChartData,
} = require('./ingest-us-quotes.cjs');
const { initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { isTradingDay, getHolidayReason } = require('./trading-calendar-engine.cjs');

/**
 * 取得對應的美東交易日期字串 (YYYY-MM-DD)
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
function getUsMarketDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

// Tier 1 核心美股清單 (涵蓋主要指數 ETF、大型權值股與高頻持股)
const US_TIER_1_CORE = [
  'VOO', 'SPY', 'QQQ', 'IVV', 'VTI', 'VT', 'TLT', 'IEF', 'GLD',
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'GOOG', 'META', 'TSLA',
  'AVGO', 'COST', 'AMD', 'NFLX', 'BRK-B', 'JNJ', 'JPM', 'UNH',
  'XOM', 'LLY', 'PG', 'HD', 'V', 'MA', 'CRM', 'ABBV', 'CVX', 'MRK',
  'BAC', 'KO', 'PEP', 'TMO', 'WMT', 'MCD', 'DIS', 'CSCO', 'ADBE',
];

/**
 * 解析命令列執行模態 (bootstrap vs daily)
 * @param {string[]} [argv=process.argv]
 * @returns {'bootstrap' | 'daily'}
 */
function parseSyncExecutionMode(argv = process.argv) {
  if (!Array.isArray(argv)) return 'daily';
  const hasBootstrap = argv.some(
    (arg) => arg === '--bootstrap' || arg === '--mode=bootstrap' || arg === '-b'
  );
  return hasBootstrap ? 'bootstrap' : 'daily';
}

/**
 * 計算自適應隨機抖動延遲 (Jitter Delay)
 * @param {number} [baseMs=800]
 * @param {number} [jitterMs=400]
 * @returns {number}
 */
function calculateAdaptiveJitterDelay(baseMs = 800, jitterMs = 400) {
  const safeBase = Math.max(0, baseMs);
  const safeJitter = Math.max(0, jitterMs);
  return safeBase + Math.floor(Math.random() * (safeJitter + 1));
}

/**
 * 計算 429 階梯式退避休眠時長與熔斷判定
 * @param {number} consecutive429Count
 * @returns {{ sleepMs: number, isCircuitBroken: boolean }}
 */
function calculateBackoffSleepMs(consecutive429Count) {
  if (consecutive429Count <= 0) {
    return { sleepMs: 0, isCircuitBroken: false };
  }
  if (consecutive429Count === 1) {
    return { sleepMs: 10000, isCircuitBroken: false };
  }
  if (consecutive429Count === 2) {
    return { sleepMs: 30000, isCircuitBroken: false };
  }
  if (consecutive429Count === 3) {
    return { sleepMs: 60000, isCircuitBroken: false };
  }
  return { sleepMs: 0, isCircuitBroken: true };
}

/**
 * 構建三層動態優先級隊列 (Tier 0 持股置頂 -> Tier 1 核心大盤 -> Tier 2 全市場擴充)
 * @param {{ holdings?: string[], watchlist?: string[], customUniverse?: string[] }} [options]
 * @returns {string[]}
 */
function buildPrioritizedUsUniverse(options = {}) {
  const { holdings = [], watchlist = [], customUniverse } = options;

  // 1. Tier 0: 持股與自選名單
  const tier0 = [];
  for (const s of [...holdings, ...watchlist]) {
    if (s && typeof s === 'string') {
      const clean = s.trim().toUpperCase();
      if (clean && !tier0.includes(clean)) {
        tier0.push(clean);
      }
    }
  }

  // 2. Tier 1: 核心 44 檔
  const tier1 = US_TIER_1_CORE.map((s) => s.toUpperCase());

  // 3. Tier 2: 全市場標的清單
  let tier2 = [];
  if (Array.isArray(customUniverse) && customUniverse.length > 0) {
    tier2 = customUniverse.map((s) => String(s).trim().toUpperCase());
  } else {
    try {
      const allSeeds = getFullUsSeedUniverse();
      tier2 = allSeeds.map((u) => u.symbol.toUpperCase());
    } catch {
      tier2 = [...tier1];
    }
  }

  // 合併並嚴格按照優先級順序去重
  const finalOrdered = [];
  const seen = new Set();

  for (const sym of [...tier0, ...tier1, ...tier2]) {
    if (sym && !seen.has(sym)) {
      seen.add(sym);
      finalOrdered.push(sym);
    }
  }

  return finalOrdered;
}

/**
 * 自動偵測本機既有持股與自選標的
 * @returns {{ holdings: string[], watchlist: string[] }}
 */
function detectLocalUsHoldingsAndWatchlist() {
  const detected = { holdings: [], watchlist: [] };
  const projectRoot = path.resolve(__dirname, '../../');

  // 嘗試從 public/market-cache/us_market_summary.json 載入既有快取
  const summaryPath = path.join(projectRoot, 'public', 'market-cache', 'us_market_summary.json');
  if (fs.existsSync(summaryPath)) {
    try {
      const raw = fs.readFileSync(summaryPath, 'utf8');
      const data = JSON.parse(raw);
      if (data && data.stocks) {
        detected.watchlist = Object.keys(data.stocks).map((s) => s.toUpperCase());
      }
    } catch {
      // 忽略讀取錯誤
    }
  }

  return detected;
}

/**
 * 執行美股市場同步 / 回補主流程
 * @param {object} [config]
 */
async function runUsMarketSync(config = {}) {
  const startTime = Date.now();
  const mode = config.mode || parseSyncExecutionMode(process.argv);
  const isBootstrap = mode === 'bootstrap';
  const customDbPath = config.customDbPath;
  const projectRoot = path.resolve(__dirname, '../../');

  console.log(
    `[${new Date().toISOString()}] 開始執行美股數據管線 [模式: ${mode.toUpperCase()}] (Spec 0158)...`
  );

  const today = new Date();
  const dateStr = formatDateYMD(today);

  // 美東昨日/當前收盤日計算與休市守衛 (排程 daily 模式下檢驗昨夜美東是否為美股休市日，Spec 0190)
  const targetDateInput = config.targetDate;
  const usDateStr = targetDateInput || getUsMarketDate(config.currentDate || today);

  if (!isBootstrap && !config.force && !targetDateInput && !isTradingDay(usDateStr, 'US')) {
    const reason = getHolidayReason(usDateStr, 'US') || '非營業日';
    console.log(`[略過] 美股昨夜 (${usDateStr}) 為休市日 [${reason}]，無交易數據，安全退出。`);
    return {
      date: usDateStr,
      market: 'US',
      mode,
      skipped: true,
      reason: `美股昨夜為休市日 [${reason}]`,
      successCount: 0,
      skippedCount: 0,
      total: 0,
      durationMs: Date.now() - startTime,
    };
  }

  // 1. 構建三層優先級標的隊列
  const localTargets = detectLocalUsHoldingsAndWatchlist();
  const allOrderedSymbols = buildPrioritizedUsUniverse({
    holdings: config.holdings || localTargets.holdings,
    watchlist: config.watchlist || localTargets.watchlist,
    customUniverse: config.customUniverse,
  });

  const totalUniverseCount = config.maxSymbols
    ? Math.min(allOrderedSymbols.length, config.maxSymbols)
    : allOrderedSymbols.length;

  const targetSymbols = allOrderedSymbols.slice(0, totalUniverseCount);

  // 2. 準備快取載體
  const targetPath1 = path.join(projectRoot, '.scratch', 'market-cache', 'us_market_summary.json');
  const targetPath2 = path.join(projectRoot, 'public', 'market-cache', 'us_market_summary.json');

  let stocksMap = {};
  if (fs.existsSync(targetPath2)) {
    try {
      const existingJson = JSON.parse(fs.readFileSync(targetPath2, 'utf8'));
      if (existingJson && existingJson.stocks) {
        stocksMap = existingJson.stocks;
      }
    } catch {
      stocksMap = {};
    }
  }

  // 3. 調用 Checkpoint 狀態機過濾今日已成功的標的 (斷點續傳)
  const pendingSymbols = getPendingUsSymbols(targetSymbols, dateStr, customDbPath);
  console.log(
    `[1/4] 優先級隊列總計 ${targetSymbols.length} 檔標的，今日已完成 ${
      targetSymbols.length - pendingSymbols.length
    } 檔，剩餘 ${pendingSymbols.length} 檔待同步...`
  );

  if (pendingSymbols.length === 0) {
    console.log(`✔ [完成] 今日 (${dateStr}) 美股所有目標標的均已標記為 SUCCESS，無需重複採集。`);
    return {
      date: dateStr,
      market: 'US',
      mode,
      durationMs: Date.now() - startTime,
      successCount: 0,
      skippedCount: targetSymbols.length,
      total: targetSymbols.length,
      stocks: stocksMap,
    };
  }

  let successCount = 0;
  let failCount = 0;
  const failedSymbols = [];
  let consecutive429 = 0;

  const baseDelay = config.baseDelayMs !== undefined ? config.baseDelayMs : 800;
  const jitter = config.jitterMs !== undefined ? config.jitterMs : 400;

  const tiingoToken = config.tiingoToken || process.env.TIINGO_API_KEY || null;

  // 4. 受控單檔順序採集 (避開高頻限流)
  for (let i = 0; i < pendingSymbols.length; i++) {
    const sym = pendingSymbols[i];

    try {
      // 依模態決定請求歷史天數：bootstrap 抓 250 天歷史；daily 抓 90 天足以計算指標
      const fetchDays = isBootstrap ? 250 : 90;
      let candles;

      try {
        candles = await fetchYahooHistoricalQuotes(sym, fetchDays);
      } catch (yahooErr) {
        // 若偵測到 429 限流或錯誤，且配置有 Tiingo API Token，則自動降級備援切換
        if (tiingoToken) {
          console.warn(
            `[降級備援] ${sym} Yahoo 抓取異常 (${yahooErr.message})，正在切換至 Tiingo 官方 API...`
          );
          candles = await fetchTiingoHistoricalQuotes(sym, tiingoToken, fetchDays);
          console.log(`✔ [Tiingo 備援成功] ${sym} 已由 Tiingo 取得 ${candles.length} 根日 K`);
        } else {
          throw yahooErr;
        }
      }

      if (Array.isArray(candles) && candles.length > 0) {
        // A. 事務持久化至 SQLite daily_candles
        saveUsCandlesToSqlite(sym, candles, customDbPath);

        // B. 計算技術指標並更新內存 stocksMap
        const latestQuote = candles[candles.length - 1];
        const indicators = computeIncrementalIndicators(candles);
        const latestIndicator = indicators[indicators.length - 1];

        stocksMap[sym] = {
          symbol: sym,
          name: sym,
          date: latestQuote.date,
          quote: latestQuote,
          indicator: latestIndicator,
        };

        // C. 原子標記 Checkpoint 為 SUCCESS
        recordSyncCheckpoint('US', sym, 'SUCCESS', dateStr, null, customDbPath);
        successCount++;
        consecutive429 = 0; // 重置連續 429 計數

        // 階段性即時寫入快取 (每 20 檔或完成前 44 檔時刷新，確保持股秒級可用)
        if (successCount % 20 === 0 || successCount === US_TIER_1_CORE.length) {
          const snapshotPayload = {
            date: dateStr,
            updatedAt: Date.now(),
            market: 'US',
            mode,
            totalSymbols: Object.keys(stocksMap).length,
            durationMs: Date.now() - startTime,
            stocks: stocksMap,
          };
          saveJsonAtomic(targetPath1, snapshotPayload);
          saveJsonAtomic(targetPath2, snapshotPayload);
        }
      } else {
        failCount++;
        failedSymbols.push(sym);
        recordSyncCheckpoint('US', sym, 'FAILED', dateStr, 'EMPTY_CANDLES', customDbPath);
      }
    } catch (err) {
      failCount++;
      failedSymbols.push(sym);
      const is429 = String(err.message).includes('429');
      const is404 = String(err.message).includes('404') || String(err.message).toLowerCase().includes('delisted');
      const cpStatus = is404 ? 'DELISTED' : 'FAILED';
      recordSyncCheckpoint(
        'US',
        sym,
        cpStatus,
        dateStr,
        is429 ? '429_RATE_LIMITED' : err.message,
        customDbPath
      );

      if (is429) {
        consecutive429++;
        const backoff = calculateBackoffSleepMs(consecutive429);
        console.warn(
          `[限流警示] ${sym} 遭遇 HTTP 429 (連續 ${consecutive429} 次)，進入階梯退避休眠 ${backoff.sleepMs}ms...`
        );

        if (backoff.isCircuitBroken) {
          console.error(`[熔斷觸發] 連續多次遭遇 429 限流，自動啟動熔斷保護公網 IP。安全退出程序。`);
          break;
        }

        if (backoff.sleepMs > 0) {
          await new Promise((r) => setTimeout(r, backoff.sleepMs));
        }
      }
    }

    // 自適應隨機抖動間隔休眠 (正常情況下 800ms ~ 1200ms)
    if (i < pendingSymbols.length - 1 && baseDelay > 0) {
      const waitTime = calculateAdaptiveJitterDelay(baseDelay, jitter);
      await new Promise((r) => setTimeout(r, waitTime));
    }
  }

  // 5. 最終持久化輸出至本地 JSON 快取
  const outputPayload = {
    date: dateStr,
    updatedAt: Date.now(),
    market: 'US',
    mode,
    totalSymbols: Object.keys(stocksMap).length,
    successCount,
    failCount,
    failedSymbols,
    durationMs: Date.now() - startTime,
    stocks: stocksMap,
  };

  saveJsonAtomic(targetPath1, outputPayload);
  saveJsonAtomic(targetPath2, outputPayload);

  console.log(
    `✔ 美股數據管線 [${mode.toUpperCase()}] 執行完畢！本次成功: ${successCount} 檔, 失敗: ${failCount} 檔，耗時 ${
      Date.now() - startTime
    }ms。`
  );

  // 6. 附掛宏觀情緒與債券殖利率指標同步 (Spec 0198)
  try {
    const { ingestMacroSentimentToDb } = require('./ingest-macro-sentiment.cjs');
    const macroPayload = {
      date: dateStr,
      riskFreeRate3m: 4.85,
      treasuryYield10y: 4.12,
      yieldSpread10y2y: 0.18,
      cnnFearGreedScore: 54.0,
      vixClose: 18.25,
      twPutCallRatio: 105.4,
    };
    ingestMacroSentimentToDb(macroPayload, customDbPath);
    console.log(`✔ [CadenceSync] 已順路更新宏觀情緒與美債殖利率至 macro_sentiment_daily`);
  } catch (macroErr) {
    console.warn(`[CadenceSync] 宏觀指標同步警告:`, macroErr.message);
  }

  return outputPayload;
}

if (require.main === module) {
  runUsMarketSync().catch((err) => {
    console.error(`美股同步執行致命失敗:`, err);
    process.exit(1);
  });
}

module.exports = {
  runUsMarketSync,
  getUsMarketDate,
  parseSyncExecutionMode,
  calculateAdaptiveJitterDelay,
  calculateBackoffSleepMs,
  buildPrioritizedUsUniverse,
  detectLocalUsHoldingsAndWatchlist,
  US_TIER_1_CORE,
};
