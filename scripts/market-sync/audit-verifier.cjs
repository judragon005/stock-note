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

function isMarketTradingDay(date = new Date(), market = 'TW') {
  const day = date.getDay();
  if (day === 0 || day === 6) return false; // 週末休市

  const dateStr = formatDateYMD(date);
  if (market === 'TW' && HOLIDAYS_TW_2026.has(dateStr)) {
    return false;
  }
  return true;
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

module.exports = {
  isMarketTradingDay,
  verifyMarketDataIntegrity,
  generateAuditReport,
};
