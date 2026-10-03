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
  const delistedRow = db.prepare("SELECT count(*) as count FROM sync_checkpoints WHERE market = 'US' AND status = 'DELISTED'").get();
  const delistedCount = delistedRow?.count || 0;

  // 3. 最新交易日存入之日 K 標的數與總 K 線筆數
  const latestDateRow = db.prepare("SELECT max(date) as maxDate FROM daily_candles").get();
  const latestCandleDate = latestDateRow?.maxDate || dateStr;
  const candlesRow = db.prepare("SELECT count(DISTINCT symbol) as count FROM daily_candles WHERE date = ?").get(latestCandleDate);
  const candlesCount = candlesRow?.count || 0;
  const totalCandlesRow = db.prepare("SELECT count(*) as total FROM daily_candles").get();
  const totalCandles = totalCandlesRow?.total || 0;

  const activeUniverse = Math.max(1, totalUsRegistered - delistedCount);
  const coverageRate = activeUniverse > 0 ? (successCount / activeUniverse) * 100 : 0;

  return {
    auditDate: dateStr,
    latestCandleDate,
    market: 'US',
    totalUsRegistered,
    delistedCount,
    activeUniverse,
    successCount,
    failedCount,
    candlesCount,
    totalCandles,
    coverageRate: Number(Math.min(100, coverageRate).toFixed(2)),
    status: totalUsRegistered >= 1500 ? 'HEALTHY_UNIVERSE' : 'TIER_1_ONLY',
  };
}

/**
 * 稽核 SQLite 湖倉中台股標的涵蓋率、三大法人籌碼歷史與擴展維度
 * @param {string} [targetDate]
 * @param {string} [customDbPath]
 * @returns {object}
 */
function auditTwLakehouseUniverse(targetDate, customDbPath) {
  const { getSqliteDbConnection } = require('./sqlite-db-core.cjs');
  let db;
  try {
    db = getSqliteDbConnection(customDbPath);
  } catch {
    return { status: 'NO_SQLITE', totalTwRegistered: 0 };
  }

  const dateStr = targetDate || formatDateYMD(new Date());

  // 1. 台股註冊標的數
  const totalTwRow = db.prepare("SELECT count(*) as count FROM symbols_meta WHERE market = 'TW'").get();
  const totalTwRegistered = totalTwRow?.count || 0;

  // 2. 籌碼總記錄數與日期區間
  const chipsStats = db.prepare("SELECT count(*) as count, min(date) as minDate, max(date) as maxDate, count(DISTINCT date) as days FROM tw_institutional_chips").get();
  const totalChips = chipsStats?.count || 0;
  const chipsMinDate = chipsStats?.minDate || 'N/A';
  const chipsMaxDate = chipsStats?.maxDate || 'N/A';
  const chipsDays = chipsStats?.days || 0;

  // 3. 最新籌碼交易日之涵蓋標的數
  const latestChipsSymRow = db.prepare("SELECT count(DISTINCT symbol) as count FROM tw_institutional_chips WHERE date = ?").get(chipsMaxDate);
  const latestChipsSymbols = latestChipsSymRow?.count || 0;

  // 4. 台股最新日 K 交易日與當日標的數
  const latestDateRow = db.prepare("SELECT max(date) as maxDate FROM daily_candles WHERE symbol LIKE '%.TW' OR symbol NOT LIKE '%[A-Za-z]%'").get();
  const latestCandleDate = latestDateRow?.maxDate || chipsMaxDate;
  const twCandlesOnLatestRow = db.prepare("SELECT count(DISTINCT symbol) as count FROM daily_candles WHERE date = ? AND (symbol LIKE '%.TW' OR symbol NOT LIKE '%[A-Za-z]%')").get(latestCandleDate);
  const candlesCount = twCandlesOnLatestRow?.count || 0;

  // 5. 擴展維度：集保大戶與月營收
  const tdccCount = db.prepare("SELECT count(*) as count FROM tw_tdcc_distribution").get()?.count || 0;
  const revCount = db.prepare("SELECT count(*) as count FROM tw_monthly_revenue").get()?.count || 0;

  return {
    auditDate: dateStr,
    latestCandleDate,
    market: 'TW',
    totalTwRegistered,
    totalChips,
    chipsMinDate,
    chipsMaxDate,
    chipsDays,
    latestChipsSymbols,
    candlesCount,
    tdccCount,
    revCount,
    status: totalChips > 0 && chipsMaxDate >= '2026-09-01' ? 'HEALTHY_UNIVERSE' : 'NEEDS_BACKFILL',
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
  auditTwLakehouseUniverse,
  auditFullLakehouseSpectrum,
  HOLIDAYS_TW_2026,
  HOLIDAYS_US_2026,
};

// 若作為 CLI 腳本直接執行
if (require.main === module) {
  console.log('🔍 [Lakehouse Audit] 正在稽核全市場 SQLite 湖倉與快取健康度...\n');

  // 1. 台股稽核
  const twAudit = auditTwLakehouseUniverse();
  console.log(`================================================================================`);
  console.log(` 🇹🇼  台股湖倉資料完整度稽核報告 (${twAudit.auditDate})`);
  console.log(`================================================================================`);
  console.log(`- 湖倉註冊標的數 : ${twAudit.totalTwRegistered.toLocaleString()} 檔`);
  console.log(`- 最新籌碼交易日 : ${twAudit.chipsMaxDate} (當日覆蓋: ${twAudit.latestChipsSymbols.toLocaleString()} 檔)`);
  console.log(`- 三大法人與資券 : ${twAudit.totalChips.toLocaleString()} 筆 (共 ${twAudit.chipsDays} 個交易日, ${twAudit.chipsMinDate} ~ ${twAudit.chipsMaxDate})`);
  console.log(`- 最新日 K 交易日: ${twAudit.latestCandleDate} (當日涵蓋: ${twAudit.candlesCount.toLocaleString()} 檔)`);
  console.log(`- 集保千張大戶數 : ${twAudit.tdccCount.toLocaleString()} 筆${twAudit.tdccCount === 0 ? ' (建議: node scripts/market-sync/ingest-tw-tdcc.cjs)' : ''}`);
  console.log(`- 月營收歷史筆數 : ${twAudit.revCount.toLocaleString()} 筆${twAudit.revCount === 0 ? ' (建議: node scripts/market-sync/ingest-tw-monthly-revenue.cjs)' : ''}`);
  console.log(`- 湖倉健康狀態   : ${twAudit.status}`);
  console.log(`================================================================================\n`);

  // 2. 美股稽核
  const usAudit = auditUsLakehouseUniverse();
  const pendingCount = Math.max(0, usAudit.totalUsRegistered - usAudit.successCount - usAudit.failedCount - usAudit.delistedCount);
  console.log(`================================================================================`);
  console.log(` 🏛️  美股湖倉資料完整度稽核報告 (${usAudit.auditDate})`);
  console.log(`================================================================================`);
  console.log(`- 湖倉註冊母體   : ${usAudit.totalUsRegistered.toLocaleString()} 檔`);
  console.log(`- 活躍上市標的   : ${usAudit.activeUniverse.toLocaleString()} 檔 (已排除下市/併購標的)`);
  console.log(`- 今日成功同步數 : ${usAudit.successCount.toLocaleString()} 檔`);
  console.log(`- 已下市/併購隔離: ${usAudit.delistedCount.toLocaleString()} 檔 (標記為 DELISTED，日更自動跳過)`);
  console.log(`- 待同步 / 排程中: ${pendingCount.toLocaleString()} 檔`);
  console.log(`- 同步失敗 / 異常: ${usAudit.failedCount.toLocaleString()} 檔`);
  console.log(`- 最新交易日標的 : ${usAudit.candlesCount.toLocaleString()} 檔 (美東收盤: ${usAudit.latestCandleDate})`);
  console.log(`- 湖倉總日 K 筆數: ${usAudit.totalCandles.toLocaleString()} 筆`);
  console.log(`- 活躍標的涵蓋率 : ${usAudit.coverageRate}%`);
  console.log(`- 湖倉健康狀態   : ${usAudit.status}`);
  console.log(`================================================================================\n`);

  // 3. 六大核心表全光譜統計
  const spectrum = auditFullLakehouseSpectrum();
  console.log(`================================================================================`);
  console.log(` 📊  全市場數據湖倉 (SQLite) 六大核心表全光譜`);
  console.log(`================================================================================`);
  console.log(`- symbols_meta           : ${spectrum.tables.symbolsMeta.toLocaleString()} 檔`);
  console.log(`- daily_candles          : ${spectrum.tables.dailyCandles.toLocaleString()} 筆`);
  console.log(`- tw_institutional_chips : ${spectrum.tables.chips.toLocaleString()} 筆`);
  console.log(`- tw_tdcc_distribution   : ${spectrum.tables.tdcc.toLocaleString()} 筆`);
  console.log(`- tw_monthly_revenue     : ${spectrum.tables.revenue.toLocaleString()} 筆`);
  console.log(`- sync_checkpoints       : ${spectrum.tables.checkpoints.toLocaleString()} 筆`);
  console.log(`================================================================================\n`);

  // 4. 嘗試讀取 JSON 快取以產出綜合稽核報表
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
  console.log(`✔ 綜合稽核報告已儲存至 public/market-cache/sync_audit_report.json (整體狀態: ${fullReport.systemOverall})`);
}

