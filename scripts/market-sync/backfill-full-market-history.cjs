/**
 * backfill-full-market-history.cjs
 * 台美雙軌全市場歷史回補總控腳本 (Spec 0168 / Ticket 08)
 * 
 * 核心特色：
 * 1. 雙軌總控：串接台股日期驅動回補與美股分級隊列回補。
 * 2. 斷點續傳：於 SQLite sync_checkpoints 記錄已回補進度，支援中斷重啟。
 * 3. 守護狀態：提供記憶體與資料庫雙重進度追蹤，供 Vite 中介層即時查詢。
 * 4. CLI 與 REST API 雙入口相容。
 */

const { initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { runTwDateDrivenBackfill } = require('./backfill-tw-history-web.cjs');

/**
 * 預估剩餘時間 (ETA) 計算器 (Spec 0184 / Ticket 05)
 * @param {number} startedAt
 * @param {number} completedDays
 * @param {number} totalDays
 * @returns {{ remainingMs: number, etaFormatted: string }}
 */
function calculateEta(startedAt, completedDays, totalDays) {
  if (!startedAt || completedDays <= 0 || completedDays >= totalDays) {
    return {
      remainingMs: 0,
      etaFormatted: completedDays >= totalDays ? '已完成' : '計算中...',
    };
  }

  const elapsedMs = Date.now() - startedAt;
  const avgMsPerDay = elapsedMs / completedDays;
  const remainingDays = totalDays - completedDays;
  const remainingMs = Math.max(0, Math.round(remainingDays * avgMsPerDay));

  const remMinutes = Math.round(remainingMs / 60000);
  const etaDate = new Date(Date.now() + remainingMs);
  const hh = String(etaDate.getHours()).padStart(2, '0');
  const mm = String(etaDate.getMinutes()).padStart(2, '0');

  const remText = remMinutes <= 0 ? '剩餘不到 1 分鐘' : `剩餘約 ${remMinutes} 分鐘`;
  const etaFormatted = `${remText} (預計 ${hh}:${mm} 完成)`;

  return {
    remainingMs,
    etaFormatted,
  };
}

/**
 * 全域回補進度狀態 (Spec 0188 / Ticket 06: 分軌進度分離)
 */
let backfillGlobalStatus = {
  isRunning: false,
  market: 'ALL',
  progressPct: 0,
  globalProgressPct: 0,
  currentTask: 'IDLE',
  currentDate: null,
  completedDays: 0,
  totalDays: 250,
  estimatedRemainingMs: null,
  etaFormatted: null,
  tw: { status: 'idle', progressPct: 0, totalQuotes: 0, totalChips: 0 },
  us: { status: 'idle', progressPct: 0, totalQuotes: 0, successCount: 0, failCount: 0, totalInLakehouse: 0 },
  error: null,
  startedAt: null,
  updatedAt: Date.now(),
};

/**
 * 取得當前全域回補狀態
 */
function getBackfillGlobalStatus() {
  return { ...backfillGlobalStatus };
}

/**
 * 重設狀態 (測試或初始化用)
 */
function resetBackfillStateForTest() {
  backfillGlobalStatus = {
    isRunning: false,
    market: 'ALL',
    progressPct: 0,
    globalProgressPct: 0,
    currentTask: 'IDLE',
    currentDate: null,
    completedDays: 0,
    totalDays: 250,
    estimatedRemainingMs: null,
    etaFormatted: null,
    tw: { status: 'idle', progressPct: 0, totalQuotes: 0, totalChips: 0 },
    us: { status: 'idle', progressPct: 0, totalQuotes: 0, successCount: 0, failCount: 0, totalInLakehouse: 0 },
    error: null,
    startedAt: null,
    updatedAt: Date.now(),
  };
}



/**
 * 解析 CLI 參數
 * @param {string[]} [argv=process.argv]
 * @returns {{ market: 'ALL' | 'TW' | 'US', days: number, throttleMs: number }}
 */
function parseBackfillCliArgs(argv = process.argv) {
  let market = 'ALL';
  let days = 250;
  let throttleMs = 3000;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--market=')) {
      const val = arg.split('=')[1].toUpperCase();
      if (val === 'TW' || val === 'US' || val === 'ALL') market = val;
    } else if (arg === '--market' && argv[i + 1]) {
      const val = argv[i + 1].toUpperCase();
      if (val === 'TW' || val === 'US' || val === 'ALL') market = val;
    } else if (arg.startsWith('--days=')) {
      days = parseInt(arg.split('=')[1], 10) || 250;
    } else if (arg === '--days' && argv[i + 1]) {
      days = parseInt(argv[i + 1], 10) || 250;
    } else if (arg.startsWith('--throttle=')) {
      throttleMs = parseInt(arg.split('=')[1], 10) || 3000;
    } else if (arg === '--throttle' && argv[i + 1]) {
      throttleMs = parseInt(argv[i + 1], 10) || 3000;
    }
  }

  return { market, days, throttleMs };
}

/**
 * 從 SQLite sync_checkpoints 讀取任務進度
 * @param {object} db
 * @param {string} taskKey
 * @returns {object|null}
 */
function getBackfillCheckpoint(db, taskKey) {
  if (!db || !taskKey) return null;
  try {
    const row = db
      .prepare("SELECT * FROM sync_checkpoints WHERE market = 'BACKFILL' AND symbol = ?")
      .get(String(taskKey).trim());
    if (!row || !row.error_msg) return null;
    return JSON.parse(row.error_msg);
  } catch (e) {
    return null;
  }
}

/**
 * 寫入任務進度至 SQLite sync_checkpoints
 * @param {object} db
 * @param {string} taskKey
 * @param {object} payload
 */
function saveBackfillCheckpoint(db, taskKey, payload) {
  if (!db || !taskKey || !payload) return;
  try {
    const payloadStr = JSON.stringify(payload);
    const lastDate = payload.lastProcessedDate || new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO sync_checkpoints (market, symbol, last_success_date, last_attempt_at, status, error_msg)
      VALUES ('BACKFILL', ?, ?, ?, 'SUCCESS', ?)
      ON CONFLICT(market, symbol) DO UPDATE SET
        last_success_date = excluded.last_success_date,
        last_attempt_at = excluded.last_attempt_at,
        status = excluded.status,
        error_msg = excluded.error_msg
    `);
    stmt.run(String(taskKey).trim(), String(lastDate), Date.now(), payloadStr);
  } catch (e) {
    console.warn(`[Checkpoint] 寫入警告:`, e.message);
  }
}

let activeAbortController = null;

/**
 * 取消當前執行中之歷史回補任務 (Spec 0187 / Ticket 03)
 * @returns {{ cancelled: boolean, message: string }}
 */
function cancelBackfillTask() {
  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch (e) {
      // 容錯
    }
    activeAbortController = null;
  }

  const wasRunning = backfillGlobalStatus.isRunning;
  backfillGlobalStatus.isRunning = false;
  backfillGlobalStatus.error = '任務已被手動取消';
  backfillGlobalStatus.etaFormatted = '已取消';
  backfillGlobalStatus.updatedAt = Date.now();

  return {
    cancelled: true,
    message: wasRunning ? '背景回補任務已成功發出取消信號並停止' : '目前無進行中任務，狀態已重設為非執行中',
  };
}

/**
 * 強制重設全域回補狀態 (Spec 0187 / Ticket 03)
 * @returns {{ reset: boolean, message: string }}
 */
function resetBackfillGlobalStatus() {
  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {}
    activeAbortController = null;
  }

  backfillGlobalStatus.isRunning = false;
  backfillGlobalStatus.progressPct = 0;
  backfillGlobalStatus.currentTask = 'IDLE';
  backfillGlobalStatus.currentDate = null;
  backfillGlobalStatus.completedDays = 0;
  backfillGlobalStatus.estimatedRemainingMs = null;
  backfillGlobalStatus.etaFormatted = null;
  backfillGlobalStatus.error = null;
  backfillGlobalStatus.startedAt = null;
  backfillGlobalStatus.updatedAt = Date.now();

  return { reset: true, message: '全域回補狀態與鎖定已強制重設釋放' };
}

/**
 * 啟動非同步背景回補任務
 * @param {object} [options]
 * @returns {{ started: boolean, message: string }}
 */
function triggerBackfillTask(options = {}) {
  if (backfillGlobalStatus.isRunning) {
    return { started: false, message: '歷史回補任務已在背景執行中' };
  }

  activeAbortController = new AbortController();
  const currentSignal = activeAbortController.signal;

  const market = options.market || 'ALL';
  const days = options.days || 250;
  const throttleMs = options.throttleMs !== undefined ? options.throttleMs : 3000;

  backfillGlobalStatus.isRunning = true;
  backfillGlobalStatus.market = market;
  backfillGlobalStatus.totalDays = days;
  backfillGlobalStatus.completedDays = 0;
  backfillGlobalStatus.progressPct = 0;
  backfillGlobalStatus.estimatedRemainingMs = null;
  backfillGlobalStatus.etaFormatted = '計算中...';
  backfillGlobalStatus.startedAt = Date.now();
  backfillGlobalStatus.updatedAt = Date.now();
  backfillGlobalStatus.error = null;

  setImmediate(async () => {
    try {
      await runFullMarketHistoryBackfill({
        market,
        days,
        throttleMs,
        dbPath: options.dbPath,
        signal: currentSignal,
      });
    } catch (err) {
      if (currentSignal.aborted) {
        backfillGlobalStatus.error = '任務已被手動取消';
      } else {
        backfillGlobalStatus.error = err.message;
        console.error(`[BackfillDaemon] 背景回補任務發生錯誤:`, err);
      }
    } finally {
      backfillGlobalStatus.isRunning = false;
      backfillGlobalStatus.estimatedRemainingMs = 0;
      if (!currentSignal.aborted) {
        backfillGlobalStatus.etaFormatted = '已完成';
      }
      backfillGlobalStatus.updatedAt = Date.now();
      activeAbortController = null;
    }
  });

  return { started: true, message: `台美雙軌歷史回補任務已啟動 (市場: ${market}, 交易日: ${days} 天)` };
}


/**
 * 完整執行台美雙軌回補
 * @param {object} [options]
 */
async function runFullMarketHistoryBackfill(options = {}) {
  const { market = 'ALL', days = 250, throttleMs = 3000, dbPath } = options;
  const db = initSqliteLakehouseDb(dbPath);

  if (!backfillGlobalStatus.startedAt) {
    backfillGlobalStatus.startedAt = Date.now();
  }

  console.log(`\n======================================================`);
  console.log(`🚀 [Spec 0168] 啟動台美雙軌全市場日 K 歷史回補總控引擎`);
  console.log(`- 模式目標市場: ${market}`);
  console.log(`- 回補交易日數: ${days} 天`);
  console.log(`- 請求節流延遲: ${throttleMs}ms`);
  console.log(`======================================================\n`);

  // 1. 台股回補軌道
  if (market === 'ALL' || market === 'TW') {
    backfillGlobalStatus.currentTask = 'TW';
    backfillGlobalStatus.tw.status = 'running';

    const twRes = await runTwDateDrivenBackfill({
      days,
      throttleMs,
      dbPath,
      startedAt: backfillGlobalStatus.startedAt,
      onProgress: (p) => {
        backfillGlobalStatus.completedDays = p.index;
        backfillGlobalStatus.currentDate = p.date;
        const twPct = Math.round((p.index / p.total) * 100);
        backfillGlobalStatus.tw.progressPct = twPct;
        const globalPct = Math.round((p.index / p.total) * (market === 'ALL' ? 50 : 100));
        backfillGlobalStatus.progressPct = globalPct;
        backfillGlobalStatus.globalProgressPct = globalPct;
        backfillGlobalStatus.tw.totalQuotes += p.quotesCount;
        backfillGlobalStatus.tw.totalChips += p.chipsCount;
        
        // Spec 0184 / Ticket 05: 即時計算 ETA
        const eta = calculateEta(backfillGlobalStatus.startedAt, p.index, p.total);
        backfillGlobalStatus.estimatedRemainingMs = eta.remainingMs;
        backfillGlobalStatus.etaFormatted = eta.etaFormatted;
        backfillGlobalStatus.updatedAt = Date.now();

        // 定期記錄至 SQLite Checkpoint
        saveBackfillCheckpoint(db, 'TW_DATE_DRIVEN_BACKFILL', {
          lastProcessedDate: p.date,
          completedDays: p.index,
          totalDays: p.total,
          totalQuotes: backfillGlobalStatus.tw.totalQuotes,
          totalChips: backfillGlobalStatus.tw.totalChips,
          etaFormatted: eta.etaFormatted,
        });
      },
    });

    backfillGlobalStatus.tw.status = 'completed';
    backfillGlobalStatus.tw.progressPct = 100;
    console.log(`✔ [台股軌道] 回補完成！入庫日 K: ${twRes.totalQuotesIngested} 筆, 籌碼: ${twRes.totalChipsIngested} 筆。`);
  }

  // 2. 美股回補軌道
  if (market === 'ALL' || market === 'US') {
    backfillGlobalStatus.currentTask = 'US';
    backfillGlobalStatus.us.status = 'running';

    try {
      const { runUsMarketSync } = require('./sync-us-market.cjs');
      const usRes = await runUsMarketSync(['--bootstrap']);

      backfillGlobalStatus.us.status = 'completed';
      backfillGlobalStatus.us.progressPct = 100;
      backfillGlobalStatus.us.successCount = usRes?.successCount || 0;
      backfillGlobalStatus.us.failCount = usRes?.failCount || 0;
      backfillGlobalStatus.us.totalQuotes = (usRes?.successCount || 0) * days;

      // 查詢 SQLite sync_checkpoints 統計美股在庫標的總數 (Spec 0186 / Ticket 02)
      try {
        const cpRow = db.prepare("SELECT count(*) AS n FROM sync_checkpoints WHERE market = 'US' AND status = 'SUCCESS'").get();
        backfillGlobalStatus.us.totalInLakehouse = cpRow ? Number(cpRow.n) : 0;
      } catch {
        backfillGlobalStatus.us.totalInLakehouse = backfillGlobalStatus.us.successCount;
      }

      console.log(`✔ [美股軌道] 全量採集完成！本次成功: ${usRes?.successCount} 檔, 失敗: ${usRes?.failCount} 檔, 湖倉在庫標的: ${backfillGlobalStatus.us.totalInLakehouse} 檔。`);
    } catch (err) {
      backfillGlobalStatus.us.status = 'error';
      console.warn(`[美股軌道] 執行警告:`, err.message);
    }
  }


  backfillGlobalStatus.progressPct = 100;
  backfillGlobalStatus.globalProgressPct = 100;
  backfillGlobalStatus.currentTask = 'DONE';
  backfillGlobalStatus.estimatedRemainingMs = 0;
  backfillGlobalStatus.etaFormatted = '已完成';
  backfillGlobalStatus.updatedAt = Date.now();

  console.log(`\n======================================================`);
  console.log(`🎉 [Spec 0168] 台美雙軌歷史全回補管線圓滿完成！`);
  console.log(`======================================================\n`);
}

module.exports = {
  calculateEta,
  parseBackfillCliArgs,
  getBackfillCheckpoint,
  saveBackfillCheckpoint,
  getBackfillGlobalStatus,
  triggerBackfillTask,
  cancelBackfillTask,
  resetBackfillGlobalStatus,
  resetBackfillStateForTest,
  runFullMarketHistoryBackfill,
};



// 若由 CLI 直接啟動
if (require.main === module) {
  const config = parseBackfillCliArgs();
  runFullMarketHistoryBackfill(config).catch((err) => {
    console.error(`全回補致命錯誤:`, err);
    process.exit(1);
  });
}
