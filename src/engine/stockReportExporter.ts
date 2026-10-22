/**
 * 個股深度財務與法務會計鑑識研報產生器 (Markdown Exporter)
 * 匯出結構完整、格式嚴謹的專業繁體中文研究報告
 */

import type { QuarterlyFinancialRecord } from '../types/financialForensic';
import { evaluateForensicWarnings } from './forensicAuditor';
import { formatFinancialAmount } from '../utils/formatters';

export interface StockReportExportOptions {
  symbol: string;
  stockName: string;
  market: 'TW' | 'US';
  currentPrice: number;
  records: QuarterlyFinancialRecord[];
  piotroskiScore?: number;
  directorPledgeRatio?: number;
}

export function generateStockForensicMarkdownReport(options: StockReportExportOptions): string {
  const { symbol, stockName, market, currentPrice, records, piotroskiScore, directorPledgeRatio } = options;
  const now = new Date().toISOString().split('T')[0];

  if (!records || records.length === 0) {
    return `# ${stockName} (${symbol}) 深度財務與法務會計鑑識研報\n\n> 產製日期：${now} | 市場：${market} | 現價：${currentPrice} 元\n\n⚠️ 暫無足夠之歷史季度財報記錄，無法產出完整鑑識研報。`;
  }

  // 排序由新到舊
  const sorted = [...records].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.quarter - a.quarter;
  });

  const latest = sorted[0];
  const chronological = [...records].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.quarter - b.quarter;
  });

  // 計算排雷燈
  const forensicChecks = evaluateForensicWarnings({
    latestRecord: latest,
    chronological,
    isFinancialStock: false,
    directorPledgeRatio,
  });

  const alertCount = forensicChecks.filter((c) => c.isAlert).length;

  let report = `# ${stockName} (${symbol}) 深度財務與法務會計鑑識研報\n\n`;
  report += `> 產製日期: ${now} | 市場類別: ${market} | 即時現價: ${currentPrice} 元\n\n`;

  // 概覽與綜合評分
  report += `## 一、 核心評級與總結\n\n`;
  if (typeof piotroskiScore === 'number') {
    report += `- **Piotroski F-Score**: ${piotroskiScore} / 9 分 (${piotroskiScore >= 7 ? '財務極為穩健優異' : piotroskiScore <= 3 ? '弱勢警示' : '中性一般'})\n`;
  }
  report += `- **最新財報季度**: ${latest.year} 年第 ${latest.quarter} 季 (${latest.periodDate})\n`;
  report += `- **法務會計排雷狀態**: ${alertCount === 0 ? '🟢 全數安全無異常 (0 雷點)' : `🚨 觸發 ${alertCount} 項排雷警報`}\n\n`;

  // 近 8 季核心數據表
  report += `### 1. 近期核心損益與資產負債摘要\n\n`;
  report += `| 季度 | 營業收入 | 營業毛利 | 稅後淨利 | EPS (元) | 營業現金流 | 自由現金流 |\n`;
  report += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  const recentQuarters = sorted.slice(0, 8);
  for (const q of recentQuarters) {
    const rev = formatFinancialAmount(q.income?.revenue || 0);
    const gp = formatFinancialAmount(q.income?.grossProfit || 0);
    const ni = formatFinancialAmount(q.income?.netIncome || 0);
    const eps = q.income?.eps?.toFixed(2) || '-';
    const cfo = formatFinancialAmount(q.cashFlow?.operatingCashFlow || 0);
    const fcf = formatFinancialAmount((q.cashFlow?.operatingCashFlow || 0) - (q.cashFlow?.capitalExpenditure || 0));
    report += `| ${q.year}Q${q.quarter} | ${rev} | ${gp} | ${ni} | ${eps} | ${cfo} | ${fcf} |\n`;
  }

  report += `\n### 2. 法務會計排雷防雷燈檢驗\n\n`;
  for (const c of forensicChecks) {
    const icon = c.isAlert ? '🔴' : c.status === 'CAPEX_EXPANSION' ? '🔵' : c.status === 'WARNING' ? '🟡' : '🟢';
    report += `#### ${icon} ${c.title} [${c.status === 'CAPEX_EXPANSION' ? '良性擴張' : c.isAlert ? '紅燈警戒' : '綠燈通過'}]\n\n`;
    report += `- **鑑識結果**: ${c.desc}\n\n`;
  }

  report += `---\n\n`;
  report += `*本研報係由投資戰情室自動萃取公開財報與歷史數據合成，僅供研究參考，非投資建議。*\n`;

  return report;
}

export function downloadMarkdownFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
