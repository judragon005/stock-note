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
 * 全域回補進度狀態
 */
let backfillGlobalStatus = {
  isRunning: false,
  market: 'ALL',
  progressPct: 0,
  currentTask: 'IDLE',
  currentDate: null,
  completedDays: 0,
  totalDays: 250,
  tw: { status: 'idle', totalQuotes: 0, totalChips: 0 },
  us: { status: 'idle', totalQuotes: 0, successCount: 0, failCount: 0 },
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
    currentTask: 'IDLE',
    currentDate: null,
    completedDays: 0,
    totalDays: 250,
    tw: { status: 'idle', totalQuotes: 0, totalChips: 0 },
    us: { status: 'idle', totalQuotes: 0, successCount: 0, failCount: 0 },
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

/**
 * 啟動非同步背景回補任務
 * @param {object} [options]
 * @returns {{ started: boolean, message: string }}
 */
function triggerBackfillTask(options = {}) {
  if (backfillGlobalStatus.isRunning) {
    return { started: false, message: '歷史回補任務已在背景執行中' };
  }

  const market = options.market || 'ALL';
  const days = options.days || 250;
  const throttleMs = options.throttleMs !== undefined ? options.throttleMs : 3000;

  backfillGlobalStatus.isRunning = true;
  backfillGlobalStatus.market = market;
  backfillGlobalStatus.totalDays = days;
  backfillGlobalStatus.completedDays = 0;
  backfillGlobalStatus.progressPct = 0;
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
      });
    } catch (err) {
      backfillGlobalStatus.error = err.message;
      console.error(`[BackfillDaemon] 背景回補任務發生錯誤:`, err);
    } finally {
      backfillGlobalStatus.isRunning = false;
      backfillGlobalStatus.updatedAt = Date.now();
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
      onProgress: (p) => {
        backfillGlobalStatus.completedDays = p.index;
        backfillGlobalStatus.currentDate = p.date;
        backfillGlobalStatus.progressPct = Math.round((p.index / p.total) * (market === 'ALL' ? 50 : 100));
        backfillGlobalStatus.tw.totalQuotes += p.quotesCount;
        backfillGlobalStatus.tw.totalChips += p.chipsCount;
        backfillGlobalStatus.updatedAt = Date.now();

        // 定期記錄至 SQLite Checkpoint
        saveBackfillCheckpoint(db, 'TW_DATE_DRIVEN_BACKFILL', {
          lastProcessedDate: p.date,
          completedDays: p.index,
          totalDays: p.total,
          totalQuotes: backfillGlobalStatus.tw.totalQuotes,
          totalChips: backfillGlobalStatus.tw.totalChips,
        });
      },
    });

    backfillGlobalStatus.tw.status = 'completed';
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
      backfillGlobalStatus.us.successCount = usRes?.successCount || 0;
      backfillGlobalStatus.us.failCount = usRes?.failCount || 0;
      backfillGlobalStatus.us.totalQuotes = (usRes?.successCount || 0) * days;
      console.log(`✔ [美股軌道] 全量採集完成！成功: ${usRes?.successCount} 檔, 失敗: ${usRes?.failCount} 檔。`);
    } catch (err) {
      backfillGlobalStatus.us.status = 'error';
      console.warn(`[美股軌道] 執行警告:`, err.message);
    }
  }

  backfillGlobalStatus.progressPct = 100;
  backfillGlobalStatus.currentTask = 'DONE';
  backfillGlobalStatus.updatedAt = Date.now();

  console.log(`\n======================================================`);
  console.log(`🎉 [Spec 0168] 台美雙軌歷史全回補管線圓滿完成！`);
  console.log(`======================================================\n`);
}

module.exports = {
  parseBackfillCliArgs,
  getBackfillCheckpoint,
  saveBackfillCheckpoint,
  getBackfillGlobalStatus,
  triggerBackfillTask,
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
