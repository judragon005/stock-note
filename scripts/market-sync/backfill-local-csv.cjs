/**
 * 台股全市場全歷史數據回補與四層容錯修復管線 (Spec 0134 / Issue #73)
 * 以本機既有歷史數據庫為主力來源，結合交易日曆對齊、停牌前值填補、差距稽核與雙目的地沉澱
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const {
  formatDateYMD,
  parseCleanNumber,
  parseTwseT86BulkData,
  parseTpexT86BulkData,
  parseTwseDailyQuotesBulk,
  parseTpexDailyQuotesBulk,
  computeIncrementalIndicators,
  saveJsonAtomic,
} = require('./market-sync-core.cjs');

// 本機數據庫路徑
const HISTORICAL_BASE_DIR = 'D:\\APP\\諮詢\\私人\\股市\\台股加權指數_歷史數據\\上市櫃股票與債券_歷史數據';
const TAIEX_CSV_PATH = 'D:\\APP\\諮詢\\私人\\股市\\台股加權指數_歷史數據\\TAIEX_history_all.csv';
const STOCKS_DIR = path.join(HISTORICAL_BASE_DIR, '全市場股票與債券歷史數據庫');
const CHIPS_DIR = path.join(HISTORICAL_BASE_DIR, '全歷史籌碼與融資融券數據庫');

/**
 * 1. 讀取加權指數基準交易日曆
 */
function loadTaiexTradingCalendar(csvPath = TAIEX_CSV_PATH) {
  if (!fs.existsSync(csvPath)) {
    console.warn(`[日曆警告] 找不到大盤指數檔案: ${csvPath}`);
    return [];
  }
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const dates = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const d = parts[0]?.trim();
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      dates.push(d);
    }
  }

  return Array.from(new Set(dates)).sort();
}

/**
 * 2. 解析個股歷史日 K CSV 檔案
 */
function parseStockHistoryCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const candles = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 5) continue;

    const date = parts[0].trim();
    const open = parseCleanNumber(parts[1]);
    const high = parseCleanNumber(parts[2]);
    const low = parseCleanNumber(parts[3]);
    const close = parseCleanNumber(parts[4]);
    const volume = parts[7] !== undefined ? parseCleanNumber(parts[7]) : 0;

    if (date && close > 0) {
      candles.push({
        date,
        open: open > 0 ? open : close,
        high: high > 0 ? high : close,
        low: low > 0 ? low : close,
        close,
        volume,
      });
    }
  }

  return candles.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 快速計算 14 日 Wilder Smoothing RSI 指標
 */
function calculateQuickRsi(closes, period = 14) {
  if (!Array.isArray(closes) || closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
}

/**
 * 3. 交易日曆對齊與停牌前值填補 (第二層容錯，二分搜尋 O(log M) 最佳化)
 */
function alignCandlesWithCalendar(candles, calendar) {
  if (!Array.isArray(candles) || candles.length === 0) return [];
  if (!Array.isArray(calendar) || calendar.length === 0) return [...candles];

  const candleMap = new Map();
  for (const c of candles) {
    if (c && c.date) candleMap.set(c.date, c);
  }

  const firstDate = candles[0].date;
  const lastDate = candles[candles.length - 1].date;

  // 二分搜尋起迄索引
  let low = 0;
  let high = calendar.length - 1;
  let startIdx = calendar.length;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (calendar[mid] >= firstDate) {
      startIdx = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  low = 0;
  high = calendar.length - 1;
  let endIdx = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (calendar[mid] <= lastDate) {
      endIdx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const relevantCalendar = startIdx <= endIdx ? calendar.slice(startIdx, endIdx + 1) : [];
  const result = [];
  let prevClose = candles[0].close;

  for (const calDate of relevantCalendar) {
    const existing = candleMap.get(calDate);
    if (existing) {
      result.push(existing);
      prevClose = existing.close;
    } else {
      // 停牌前值填補
      result.push({
        date: calDate,
        open: prevClose,
        high: prevClose,
        low: prevClose,
        close: prevClose,
        volume: 0,
        isHalted: true,
      });
    }
  }

  return result;
}

/**
 * 4. 解析個股歷史三大法人籌碼 CSV 檔案
 */
function parseChipHistoryCsv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const chipsByDate = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 6) continue;

    const date = parts[0].trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const instType = String(parts[2] || '').trim();
    const netShares = parseCleanNumber(parts[5]); // 股數

    if (!chipsByDate[date]) {
      chipsByDate[date] = {
        foreignNetShares: 0,
        trustNetShares: 0,
        dealerNetShares: 0,
        totalNetShares: 0,
      };
    }

    const netLots = Math.round(netShares / 1000); // 換算張數
    if (instType.includes('Foreign')) {
      chipsByDate[date].foreignNetShares += netLots;
    } else if (instType.includes('Investment_Trust') || instType.includes('Trust')) {
      chipsByDate[date].trustNetShares += netLots;
    } else if (instType.includes('Dealer')) {
      chipsByDate[date].dealerNetShares += netLots;
    }
    chipsByDate[date].totalNetShares += netLots;
  }

  return chipsByDate;
}

/**
 * 5. 全市場全歷史回補主排程
 */
async function runFullMarketHistoryBackfill() {
  const startTime = Date.now();
  console.log(`======================================================================`);
  console.log(`[${new Date().toISOString()}] 開始執行台股全市場全歷史回補 (Spec 0134 / Issue #73)...`);
  console.log(`======================================================================`);

  // 1. 載入大盤交易日曆
  const calendar = loadTaiexTradingCalendar();
  const latestMarketDate = calendar[calendar.length - 1] || formatDateYMD(new Date());
  console.log(`[1/5] 已載入加權指數交易日曆，共 ${calendar.length} 個交易日 (最新日: ${latestMarketDate})`);

  // 2. 掃描個股 CSV 目錄
  if (!fs.existsSync(STOCKS_DIR)) {
    throw new Error(`找不到個股歷史數據庫目錄: ${STOCKS_DIR}`);
  }
  const stockFiles = fs.readdirSync(STOCKS_DIR).filter((f) => f.endsWith('.csv'));
  console.log(`[2/5] 偵測到本機個股歷史數據庫共 ${stockFiles.length} 檔標的，開始批次剖析與日曆對齊...`);

  // 建立籌碼檔快速索引
  const chipFileMap = new Map();
  if (fs.existsSync(CHIPS_DIR)) {
    const chipFiles = fs.readdirSync(CHIPS_DIR).filter((f) => f.includes('三大法人'));
    for (const cf of chipFiles) {
      const sym = cf.split('_')[0];
      if (sym) chipFileMap.set(sym, path.join(CHIPS_DIR, cf));
    }
    console.log(`      已建立三大法人歷史檔案索引共 ${chipFileMap.size} 檔`);
  }

  const stocksSummaryMap = {};
  const compactHistoryMap = {};
  const gapsAuditList = [];

  let processedCount = 0;
  let haltedFilledCount = 0;

  for (const filename of stockFiles) {
    const parts = filename.split('_');
    const symbol = parts[0]?.trim();
    const name = parts[1]?.trim() || symbol;
    if (!symbol) continue;

    const fullPath = path.join(STOCKS_DIR, filename);
    const rawCandles = parseStockHistoryCsv(fullPath);
    if (rawCandles.length === 0) continue;

    // 對齊日曆
    const alignedCandles = alignCandlesWithCalendar(rawCandles, calendar);
    const haltedCount = alignedCandles.filter((c) => c.isHalted).length;
    if (haltedCount > 0) haltedFilledCount += haltedCount;

    // 讀取法人籌碼
    const chipPath = chipFileMap.get(symbol);
    const chipsByDate = chipPath ? parseChipHistoryCsv(chipPath) : {};

    // 差距稽核
    const latestStockDate = alignedCandles[alignedCandles.length - 1]?.date;
    const isUpToDate = latestStockDate >= latestMarketDate;
    if (!isUpToDate) {
      let type = '個股';
      if (symbol.startsWith('00') && (symbol.includes('K') || symbol.includes('U'))) {
        type = '外幣ETF/期貨反向';
      } else if (symbol.startsWith('00')) {
        type = '台幣ETF';
      }

      gapsAuditList.push({
        symbol,
        name,
        type,
        latestStockDate,
        latestMarketDate,
      });
    }

    // 最新日數據與指標
    const latestCandle = alignedCandles[alignedCandles.length - 1];
    const latestChip = chipsByDate[latestCandle.date] || {
      foreignNetShares: 0,
      trustNetShares: 0,
      dealerNetShares: 0,
      totalNetShares: 0,
    };

    // 計算最新指標 (取最近 120 根 K 棒加速運算)
    const recentCandles = alignedCandles.slice(-120);
    const indicatorPoints = computeIncrementalIndicators(recentCandles);
    const lastPoint = indicatorPoints[indicatorPoints.length - 1];
    const computedRsi = calculateQuickRsi(recentCandles.map((c) => c.close), 14);

    stocksSummaryMap[symbol] = {
      symbol,
      name,
      market: 'TW',
      date: latestCandle.date,
      open: latestCandle.open,
      high: latestCandle.high,
      low: latestCandle.low,
      close: latestCandle.close,
      volume: latestCandle.volume,
      indicators: {
        ma5: lastPoint?.ma?.ma5 || latestCandle.close,
        ma10: lastPoint?.ma?.ma10 || latestCandle.close,
        ma20: lastPoint?.ma?.ma20 || latestCandle.close,
        ma60: lastPoint?.ma?.ma60 || latestCandle.close,
        rsi14: computedRsi,
        boxUpper: lastPoint?.box?.boxUpper || latestCandle.high,
        boxLower: lastPoint?.box?.boxLower || latestCandle.low,
      },
      chips: {
        foreignNetShares: latestChip.foreignNetShares,
        trustNetShares: latestChip.trustNetShares,
        dealerNetShares: latestChip.dealerNetShares,
        totalNetShares: latestChip.totalNetShares,
      },
    };

    // 精簡歷史序列 (只取最近 60 根供前端高速加載)
    compactHistoryMap[symbol] = alignedCandles.slice(-60).map((c) => ({
      d: c.date,
      o: c.open,
      h: c.high,
      l: c.low,
      c: c.close,
      v: c.volume,
    }));

    processedCount++;
  }

  console.log(`[3/5] 完成 ${processedCount} 檔標的解析，填補停牌前值記錄共 ${haltedFilledCount} 筆`);
  console.log(`[4/5] 差距稽核：共有 ${gapsAuditList.length} 檔標的最新記錄落後大盤最新日 (${latestMarketDate})`);

  // 輸出差距稽核日誌
  const gapsAuditPath = path.join(process.cwd(), '.scratch', 'market-cache', 'backfill_gaps_audit.json');
  saveJsonAtomic(gapsAuditPath, {
    auditTime: new Date().toISOString(),
    latestMarketDate,
    totalLaggingSymbols: gapsAuditList.length,
    laggingSymbols: gapsAuditList.slice(0, 100), // 取前 100 檔摘要
  });

  // 5. 雙目的地持久化沉澱
  console.log(`[5/5] 持久化寫入 public/market-cache/ 與 IndexedDB 緊湊封裝包...`);
  const outputSummary = {
    updatedAt: new Date().toISOString(),
    market: 'TW',
    totalSymbols: processedCount,
    durationMs: Date.now() - startTime,
    stocks: stocksSummaryMap,
  };

  const targetSummaryPath = path.join(process.cwd(), 'public', 'market-cache', 'tw_market_summary.json');
  const targetHistoryPath = path.join(process.cwd(), 'public', 'market-cache', 'tw_market_ohlcv_compact.json');
  const auditReportPath = path.join(process.cwd(), 'public', 'market-cache', 'backfill_audit_report.json');

  saveJsonAtomic(targetSummaryPath, outputSummary);
  saveJsonAtomic(targetHistoryPath, compactHistoryMap);

  const auditReport = {
    reportDate: new Date().toISOString(),
    totalSymbolsProcessed: processedCount,
    totalHaltedFilled: haltedFilledCount,
    laggingSymbolsCount: gapsAuditList.length,
    durationMs: Date.now() - startTime,
    summaryFilePath: targetSummaryPath,
    compactHistoryFilePath: targetHistoryPath,
    status: 'SUCCESS',
  };
  saveJsonAtomic(auditReportPath, auditReport);

  console.log(`✔ 全市場全歷史數據回補完成！`);
  console.log(`  - 成功處理標的數: ${processedCount} 檔`);
  console.log(`  - 填補停牌前值數: ${haltedFilledCount} 筆`);
  console.log(`  - 耗時: ${Date.now() - startTime}ms`);
  console.log(`  - 秒讀總表位置: ${targetSummaryPath}`);
  console.log(`  - 稽核報告位置: ${auditReportPath}`);
}

if (require.main === module) {
  runFullMarketHistoryBackfill().catch((err) => {
    console.error(`全歷史回補失敗:`, err);
    process.exit(1);
  });
}

module.exports = {
  loadTaiexTradingCalendar,
  parseStockHistoryCsv,
  alignCandlesWithCalendar,
  parseChipHistoryCsv,
  runFullMarketHistoryBackfill,
};
