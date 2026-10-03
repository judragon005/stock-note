/**
 * backfill-historical-chips-gap.cjs
 * 台股三大法人與信用交易斷層全量自動回補引擎 (Spec 0163 / Ticket 05)
 * 負責自動補回 2026-08-15 至 2026-10-02 期間之 35 個交易日歷史籌碼
 */

const { formatDateYMD } = require('./market-sync-core.cjs');
const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { runTwMarketSync } = require('./sync-tw-market.cjs');

// 2026 台灣法定休市日
const HOLIDAYS_TW_2026 = new Set([
  '2026-01-01',
  '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20',
  '2026-02-27', '2026-02-28',
  '2026-04-03', '2026-04-06',
  '2026-05-01',
  '2026-06-19',
  '2026-09-25', // 中秋節
  '2026-10-09', '2026-10-10',
]);

/**
 * 產生兩日期間的所有有效交易日清單 (排除週末與休市日)
 * @param {string} startDateStr - YYYY-MM-DD
 * @param {string} endDateStr - YYYY-MM-DD
 * @param {Set<string>} [holidays]
 * @returns {string[]}
 */
function generateTradingDaysList(startDateStr, endDateStr, holidays = HOLIDAYS_TW_2026) {
  const result = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const curr = new Date(start);
  while (curr <= end) {
    const day = curr.getDay();
    const dateStr = formatDateYMD(curr);

    // 排除週六 (6)、週日 (0) 與國定休市日
    if (day !== 0 && day !== 6 && (!holidays || !holidays.has(dateStr))) {
      result.push(dateStr);
    }
    curr.setDate(curr.getDate() + 1);
  }
  return result;
}

/**
 * 取得指定標的或全市場已在 tw_institutional_chips 的日期清單
 * @param {string} [symbol='2330']
 * @param {string} [customDbPath]
 * @returns {Set<string>}
 */
function getExistingChipDates(symbol = '2330', customDbPath) {
  const db = initSqliteLakehouseDb(customDbPath);
  const rows = db.prepare('SELECT date FROM tw_institutional_chips WHERE symbol = ?').all(symbol);
  return new Set(rows.map(r => r.date));
}

/**
 * 執行歷史籌碼斷層回補管線
 * @param {object} [options]
 * @returns {Promise<{ totalDays: number, processedDays: number, skippedDays: number }>}
 */
async function runHistoricalChipsGapBackfill(options = {}) {
  const startDate = options.startDate || '2026-08-15';
  const endDate = options.endDate || '2026-10-02';
  const isResume = options.resume !== false;
  const isDryRun = !!options.dryRun;
  const delayMs = options.delayMs || 1500;
  const customDbPath = options.customDbPath;

  console.log(`[Backfill] 啟動歷史籌碼斷層回補 (${startDate} ~ ${endDate})...`);
  const tradingDays = generateTradingDaysList(startDate, endDate);
  console.log(`[Backfill] 區間內有效交易日共 ${tradingDays.length} 天。`);

  let existingDates = new Set();
  if (isResume) {
    try {
      existingDates = getExistingChipDates('2330', customDbPath);
    } catch {}
  }

  let processedDays = 0;
  let skippedDays = 0;

  for (let i = 0; i < tradingDays.length; i++) {
    const targetDate = tradingDays[i];

    if (isResume && existingDates.has(targetDate)) {
      console.log(`[略過 ${i + 1}/${tradingDays.length}] 日期 ${targetDate} 已存在 2330 籌碼數據。`);
      skippedDays++;
      continue;
    }

    console.log(`[執行 ${i + 1}/${tradingDays.length}] 正在回補交易日: ${targetDate}...`);
    if (isDryRun) {
      processedDays++;
      continue;
    }

    try {
      await runTwMarketSync(targetDate);
      processedDays++;
    } catch (err) {
      console.warn(`[回補警告] 日期 ${targetDate} 同步異常:`, err.message);
    }

    if (i < tradingDays.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  console.log(`✔ [Backfill 完成] 共處理 ${processedDays} 天，略過 ${skippedDays} 天。`);
  return { totalDays: tradingDays.length, processedDays, skippedDays };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const startArg = args.find(a => a.startsWith('--start='))?.split('=')[1] || '2026-08-15';
  const endArg = args.find(a => a.startsWith('--end='))?.split('=')[1] || '2026-10-02';
  const dryRun = args.includes('--dry-run');

  runHistoricalChipsGapBackfill({
    startDate: startArg,
    endDate: endArg,
    dryRun,
  }).catch(err => {
    console.error('回補腳本失敗:', err);
    process.exit(1);
  });
}

module.exports = {
  HOLIDAYS_TW_2026,
  generateTradingDaysList,
  runHistoricalChipsGapBackfill,
};
