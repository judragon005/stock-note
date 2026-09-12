/**
 * 穿透式財報深度研報 Markdown 生成管線 (Spec 0123)
 * Financial Forensic Markdown Report Pipeline
 */

import type { FinancialForensicReport, TrafficLightColor } from '../types/financialForensic';

function getLightBadge(color: TrafficLightColor): string {
  switch (color) {
    case 'GREEN':
      return '🟢 正常健全';
    case 'YELLOW':
      return '🟡 體質警戒';
    case 'RED':
      return '🔴 重大風險';
    default:
      return '⚪ 未知/不適用';
  }
}

/**
 * 產出結構化 Markdown 深度財報研報
 */
export function generateFinancialForensicMarkdown(report: FinancialForensicReport): string {
  const {
    symbol,
    companyName,
    latestPeriod,
    overallScore,
    overallGrade,
    trafficLights,
    executiveSummary,
    duPont,
    anomalies,
    industryAttribute,
  } = report;

  const lines: string[] = [];

  // 1. 標題與基本資訊
  lines.push(`# 📊 ${symbol} ${companyName} 穿透式財報深度研報`);
  lines.push(`> 最新結算季度：**${latestPeriod}** ｜ 產生時間：${new Date().toLocaleDateString('zh-TW')} ｜ 產業模型：${industryAttribute === 'FINANCIALS' ? '🏦 金融保險專用' : industryAttribute === 'CYCLICAL' ? '⚠️ 強週期循環' : '標準模型'}`);
  lines.push('');

  // 2. 0 秒核心決策卡
  lines.push('## 🎯 0 秒核心決策戰報 (Executive Summary)');
  lines.push('');
  lines.push(`- **綜合健康評分**：**${overallScore} / 100**（評級：\`${overallGrade}\`）`);
  lines.push(`- **核心操盤結論**：${executiveSummary}`);
  lines.push('');

  // 3. 四大維度指示燈
  lines.push('### 🚦 四大體質維度指示燈 (Traffic Lights)');
  lines.push('');
  lines.push('| 維度類別 | 狀態評估 | 核心焦點 |');
  lines.push('| :--- | :---: | :--- |');
  lines.push(`| **獲利能力 (Profitability)** | ${getLightBadge(trafficLights.profitability)} | 毛利率、營益率、淨利率走勢與 ROE |`);
  lines.push(`| **安全性與償債 (Safety)** | ${getLightBadge(trafficLights.safety)} | 負債比率、速動比率、真實淨現金水位 (Net Cash) |`);
  lines.push(`| **營運效率 (Efficiency)** | ${getLightBadge(trafficLights.efficiency)} | 應收帳款天數 (DSO)、存貨週轉 (DIO)、現金轉換週期 (CCC) |`);
  lines.push(`| **現金流健康 (Cash Flow)** | ${getLightBadge(trafficLights.cashFlow)} | 營業現金流 (CFO)、自由現金流 (FCF)、股息發放純度 |`);
  lines.push('');

  // 4. 杜邦分析三因子拆解
  lines.push('## 🔬 杜邦 ROE 三因子拆解 (DuPont Analysis)');
  lines.push('');
  lines.push(`- **股東權益報酬率 (ROE)**：**${duPont.roe.toFixed(2)}%**`);
  lines.push(`- **主驅動力量**：${duPont.primaryDriver === 'LEVERAGE' ? '⚠️ **高財務槓桿推升 (需防範利率與景氣反轉)**' : duPont.primaryDriver === 'EFFICIENCY' ? '⚡ **高資產週轉效率推升**' : '🛡️ **高產品獲利率/定價權推升 (最優質)**'}`);
  lines.push('');
  lines.push('| 杜邦因子 | 讀數 | 解讀 |');
  lines.push('| :--- | :---: | :--- |');
  lines.push(`| 1. 稅後淨利率 (Net Margin) | **${duPont.netMargin.toFixed(2)}%** | 反映產品定價權與本業獲利純度 |`);
  lines.push(`| 2. 資產週轉率 (Asset Turnover) | **${duPont.assetTurnover.toFixed(4)} 次** | 反映資產運用效率與銷貨動能 |`);
  lines.push(`| 3. 權益乘數 (Equity Multiplier) | **${duPont.equityMultiplier.toFixed(2)} 倍** | 反映公司財務槓桿放大倍數 |`);
  lines.push('');

  // 5. 「市場沒說什麼」六大逆向鑑識排查
  lines.push('## 🔍 「市場沒說什麼」逆向鑑識防雷排查 (Forensic Radar)');
  lines.push('');
  if (anomalies.length === 0) {
    lines.push('> 🟢 **財務體質扎實，未檢出結構性背離**：本標的無塞貨庫存積壓、無紙上富貴現金脫鉤、無借債配息或業外虛胖跡象。');
  } else {
    lines.push(`> ⚠️ **共檢測出 ${anomalies.length} 項潛在結構性背離警訊**：`);
    lines.push('');
    for (const anom of anomalies) {
      const badge = anom.severity === 'DANGEROUS' ? '🔴 **【高危警報】**' : '🟡 **【關注警戒】**';
      lines.push(`### ${badge} ${anom.title}`);
      lines.push(`- **實質真相**：${anom.summary}`);
      if (anom.metrics) {
        const metricStrs = Object.entries(anom.metrics).map(([k, v]) => `${k}: ${v}`);
        lines.push(`- **數據佐證**：\`${metricStrs.join(', ')}\``);
      }
      lines.push('');
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('*本報告由股票紀錄與分析儀 (Spec 0123 鑑識引擎) 自動生成，數據僅供研究與投資紀律參考，非特定投資建議。*');

  return lines.join('\n');
}
