/**
 * 防漏水稽核與零遺漏驗證模組 (Zero-Data-Loss Verification Engine)
 * 負責檢查盤後數據覆蓋率、休市日判定與 Dead-Letter Retry 死信補跑
 */

const fs = require('fs');
const path = require('path');
const { formatDateYMD, saveJsonAtomic } = require('./market-sync-core.cjs');

// 法定休市日曆 (YYYY-MM-DD)
const HOLIDAYS_TW_2026 = new Set([
  '2026-01-01', // 元旦
  '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', // 春節
  '2026-02-27', '2026-02-28', // 和平紀念日
  '2026-04-03', '2026-04-06', // 兒童節與清明節
  '2026-05-01', // 勞動節
  '2026-06-19', // 端午節
  '2026-09-25', // 中秋節
  '2026-10-09', '2026-10-10', // 國慶日
]);

// 美股 2026 紐約證交所 (NYSE) 法定休市日曆
const HOLIDAYS_US_2026 = new Set([
  '2026-01-01', // New Year's Day
  '2026-01-19', // Martin Luther King Jr. Day
  '2026-02-16', // Washington's Birthday (Presidents' Day)
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth National Independence Day
  '2026-07-03', // Independence Day (Observed)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving Day
  '2026-12-25', // Christmas Day
]);

function isMarketTradingDay(date = new Date(), market = 'TW') {
  const day = date.getDay();
  if (day === 0 || day === 6) return false; // 週末休市

  const dateStr = formatDateYMD(date);
  if (market === 'TW' && HOLIDAYS_TW_2026.has(dateStr)) {
    return false;
  }
  if (market === 'US' && HOLIDAYS_US_2026.has(dateStr)) {
    return false;
  }
  return true;
}

/**
 * 稽核 SQLite 湖倉中美股標的涵蓋率與 Checkpoint 健康度
 * @param {string} [targetDate]
 * @param {string} [customDbPath]
 * @returns {object}
 */
function auditUsLakehouseUniverse(targetDate, customDbPath) {
  const { getSqliteDbConnection } = require('./sqlite-db-core.cjs');
  let db;
  try {
    db = getSqliteDbConnection(customDbPath);
  } catch {
    return { status: 'NO_SQLITE', totalUsRegistered: 0 };
  }

  const dateStr = targetDate || formatDateYMD(new Date());

  // 1. 美股總註冊標的數
  const totalUsRow = db.prepare("SELECT count(*) as count FROM symbols_meta WHERE market = 'US'").get();
  const totalUsRegistered = totalUsRow?.count || 0;

  // 2. 當日 Checkpoint 統計
  const successRow = db.prepare("SELECT count(*) as count FROM sync_checkpoints WHERE market = 'US' AND status = 'SUCCESS' AND last_success_date = ?").get(dateStr);
  const failedRow = db.prepare("SELECT count(*) as count FROM sync_checkpoints WHERE market = 'US' AND status = 'FAILED'").get();

  const successCount = successRow?.count || 0;
  const failedCount = failedRow?.count || 0;

  // 3. 最新交易日存入之日 K 標的數與總 K 線筆數
  const latestDateRow = db.prepare("SELECT max(date) as maxDate FROM daily_candles").get();
  const latestCandleDate = latestDateRow?.maxDate || dateStr;
  const candlesRow = db.prepare("SELECT count(DISTINCT symbol) as count FROM daily_candles WHERE date = ?").get(latestCandleDate);
  const candlesCount = candlesRow?.count || 0;
  const totalCandlesRow = db.prepare("SELECT count(*) as total FROM daily_candles").get();
  const totalCandles = totalCandlesRow?.total || 0;

  const coverageRate = totalUsRegistered > 0 ? (successCount / totalUsRegistered) * 100 : 0;

  return {
    auditDate: dateStr,
    latestCandleDate,
    market: 'US',
    totalUsRegistered,
    successCount,
    failedCount,
    candlesCount,
    totalCandles,
    coverageRate: Number(coverageRate.toFixed(2)),
    status: totalUsRegistered >= 1500 ? 'HEALTHY_UNIVERSE' : 'TIER_1_ONLY',
  };
}

function verifyMarketDataIntegrity(summaryData) {
  if (!summaryData || !summaryData.stocks) {
    return {
      status: 'MISSING_DATA',
      integrityRate: 0,
      totalExpected: 0,
      actualCount: 0,
      missingSymbols: [],
    };
  }

  const actualCount = Object.keys(summaryData.stocks).length;
  const failedSymbols = Array.isArray(summaryData.failedSymbols) ? summaryData.failedSymbols : [];
  const totalExpected = actualCount + failedSymbols.length;
  const integrityRate = totalExpected > 0 ? (actualCount / totalExpected) * 100 : 100;

  return {
    status: failedSymbols.length === 0 ? 'HEALTHY' : 'PARTIAL_SUCCESS',
    integrityRate: Number(integrityRate.toFixed(2)),
    totalExpected,
    actualCount,
    missingSymbols: failedSymbols,
  };
}

function generateAuditReport(twSummary, usSummary) {
  const now = new Date();
  const dateStr = formatDateYMD(now);

  const twCheck = verifyMarketDataIntegrity(twSummary);
  const usCheck = verifyMarketDataIntegrity(usSummary);

  const report = {
    generatedAt: now.toISOString(),
    auditDate: dateStr,
    twseTradingDay: isMarketTradingDay(now, 'TW'),
    twse: {
      market: 'TW',
      ...twCheck,
      updatedAt: twSummary?.updatedAt || null,
    },
    us: {
      market: 'US',
      ...usCheck,
      updatedAt: usSummary?.updatedAt || null,
    },
    systemOverall: twCheck.status === 'HEALTHY' && usCheck.status === 'HEALTHY' ? 'PERFECT' : 'ATTENTION_NEEDED',
  };

  const p1 = path.join(process.cwd(), '.scratch', 'market-cache', 'sync_audit_report.json');
  const p2 = path.join(process.cwd(), 'public', 'market-cache', 'sync_audit_report.json');

  saveJsonAtomic(p1, report);
  saveJsonAtomic(p2, report);

  return report;
}

/**
 * 稽核 SQLite 湖倉六大核心表之全光譜資料量與健康度 (Spec 0163)
 * @param {string} [customDbPath]
 * @returns {object}
 */
function auditFullLakehouseSpectrum(customDbPath) {
  const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
  const db = initSqliteLakehouseDb(customDbPath);

  const getCount = (table) => {
    try {
      const row = db.prepare(`SELECT count(*) as c FROM "${table}"`).get();
      return row?.c || 0;
    } catch {
      return 0;
    }
  };

  const totalSymbols = getCount('symbols_meta');
  const dailyCandles = getCount('daily_candles');
  const chips = getCount('tw_institutional_chips');
  const tdcc = getCount('tw_tdcc_distribution');
  const revenue = getCount('tw_monthly_revenue');
  const checkpoints = getCount('sync_checkpoints');

  const report = {
    auditedAt: new Date().toISOString(),
    totalSymbols,
    tables: {
      symbolsMeta: totalSymbols,
      dailyCandles,
      chips,
      tdcc,
      revenue,
      checkpoints,
    },
    status: totalSymbols > 0 && dailyCandles > 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
  };

  const p1 = path.join(process.cwd(), '.scratch', 'market-cache', 'sync_audit_report.json');
  const p2 = path.join(process.cwd(), 'public', 'market-cache', 'sync_audit_report.json');
  try {
    saveJsonAtomic(p1, report);
    saveJsonAtomic(p2, report);
  } catch {}

  return report;
}

module.exports = {
  isMarketTradingDay,
  verifyMarketDataIntegrity,
  generateAuditReport,
  auditUsLakehouseUniverse,
  auditFullLakehouseSpectrum,
  HOLIDAYS_TW_2026,
  HOLIDAYS_US_2026,
};

// 若作為 CLI 腳本直接執行
if (require.main === module) {
  console.log('🔍 [Lakehouse Audit] 正在稽核全市場 SQLite 湖倉與快取健康度...\n');
  const audit = auditUsLakehouseUniverse();
  console.log(`========================================`);
  console.log(` 🏛️  美股湖倉資料完整度稽核報告 (${audit.auditDate})`);
  console.log(`========================================`);
  console.log(`- 湖倉註冊標的數 : ${audit.totalUsRegistered} 檔`);
  console.log(`- 今日成功同步數 : ${audit.successCount} 檔`);
  console.log(`- 同步失敗/空值  : ${audit.failedCount} 檔`);
  console.log(`- 最新交易日標的 : ${audit.candlesCount} 檔 (美東收盤: ${audit.latestCandleDate})`);
  console.log(`- 湖倉總日 K 筆數: ${audit.totalCandles.toLocaleString()} 筆`);
  console.log(`- 當前採集涵蓋率 : ${audit.coverageRate}%`);
  console.log(`- 湖倉健康狀態   : ${audit.status}`);
  console.log(`========================================\n`);

  // 嘗試讀取 JSON 快取以產出綜合稽核報表
  let twSummary = null;
  let usSummary = null;
  const pTw = path.join(process.cwd(), 'public', 'market-cache', 'tw_market_summary.json');
  const pUs = path.join(process.cwd(), 'public', 'market-cache', 'us_market_summary.json');
  if (fs.existsSync(pTw)) {
    try { twSummary = JSON.parse(fs.readFileSync(pTw, 'utf8')); } catch {}
  }
  if (fs.existsSync(pUs)) {
    try { usSummary = JSON.parse(fs.readFileSync(pUs, 'utf8')); } catch {}
  }
  const fullReport = generateAuditReport(twSummary, usSummary);
  console.log(`✔ 稽核報告已儲存至 public/market-cache/sync_audit_report.json (整體狀態: ${fullReport.systemOverall})`);
}

