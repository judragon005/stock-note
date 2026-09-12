/**
 * 「市場沒說什麼」六大逆向鑑識與防雷雷達引擎 (Spec 0123)
 * Forensic Fraud & "The Unspoken" Contrarian Radar Engine
 */

import type {
  QuarterlyFinancialRecord,
  ForensicAnomaly,
} from '../types/financialForensic';
import { calculateTurnoverMetrics } from './financialTurnoverEngine';

function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!denominator || !Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * 評估股息發放純度 (evaluateDividendPurity)
 */
export function evaluateDividendPurity(
  dividendPaid: number,
  freeCashFlow: number
): 'ORGANIC_CASH_FLOW' | 'CAPITAL_RESERVE' | 'DEBT_FINANCED' | 'NO_DIVIDEND' {
  if (!dividendPaid || dividendPaid <= 0) {
    return 'NO_DIVIDEND';
  }
  if (freeCashFlow <= 0) {
    return 'DEBT_FINANCED';
  }
  if (dividendPaid > freeCashFlow * 1.25) {
    return 'CAPITAL_RESERVE';
  }
  return 'ORGANIC_CASH_FLOW';
}

/**
 * 執行六大逆向鑑識規則，檢測「市場沒說什麼」的隱形財務風險 (detectForensicAnomalies)
 * records 預期按時間由新到舊排序 (records[0] 為最新一季)
 */
export function detectForensicAnomalies(
  records: QuarterlyFinancialRecord[]
): ForensicAnomaly[] {
  if (!records || records.length === 0) {
    return [];
  }

  const anomalies: ForensicAnomaly[] = [];
  const latest = records[0];
  const previous = records.length > 1 ? records[1] : undefined;
  // 4 季前 (同季度 YoY 比較基準)
  const yoyBaseline = records.length >= 5 ? records[4] : previous;

  // -------------------------------------------------------------
  // 規則 1: 塞貨與庫存滯銷背離 (CHANNEL_STUFFING_DIVERGENCE)
  // -------------------------------------------------------------
  if (yoyBaseline && yoyBaseline.income.revenue > 0) {
    const revenueGrowth =
      ((latest.income.revenue - yoyBaseline.income.revenue) / yoyBaseline.income.revenue) * 100;

    const latestTurnover = calculateTurnoverMetrics(latest);
    const baselineTurnover = calculateTurnoverMetrics(yoyBaseline);

    const dsoDiff = latestTurnover.dsoDays - baselineTurnover.dsoDays;
    const dioDiff = latestTurnover.dioDays - baselineTurnover.dioDays;

    if (revenueGrowth > 0 && (dsoDiff >= 20 || dioDiff >= 25)) {
      anomalies.push({
        type: 'CHANNEL_STUFFING_DIVERGENCE',
        severity: 'DANGEROUS',
        title: '營收創高但應收帳款與存貨週轉天數異常飆升',
        summary: `市場只看到營收成長 ${revenueGrowth.toFixed(1)}%，但應收天數大幅增加 ${dsoDiff.toFixed(1)} 天、存貨天數增加 ${dioDiff.toFixed(1)} 天，呈現典型塞貨或產品滯銷特徵，未來恐面臨大額呆帳與跌價損失。`,
        metrics: {
          revenueYoY: Number(revenueGrowth.toFixed(1)),
          dsoChange: Number(dsoDiff.toFixed(1)),
          dioChange: Number(dioDiff.toFixed(1)),
        },
      });
    }
  }

  // -------------------------------------------------------------
  // 規則 2: 紙上富貴與現金流脫鉤 (EARNINGS_QUALITY_DECOUPLING)
  // -------------------------------------------------------------
  const { netIncome } = latest.income;
  const { operatingCashFlow } = latest.cashFlow;
  if (netIncome > 0) {
    const cfoRatio = safeDivide(operatingCashFlow, netIncome);
    if (operatingCashFlow <= 0 || cfoRatio < 0.6) {
      anomalies.push({
        type: 'EARNINGS_QUALITY_DECOUPLING',
        severity: 'DANGEROUS',
        title: '稅後淨利獲利亮眼，但營業活動現金流嚴重脫鉤',
        summary: `本季稅後淨利為正，但營業活動現金流 (CFO) 呈現淨流出或比率偏低 (${(cfoRatio * 100).toFixed(1)}% < 60%)，呈現典型紙上富貴現象，獲利多為未收回帳款或資產重估利益，缺乏真實現金入帳支撐。`,
        metrics: {
          netIncome,
          operatingCashFlow,
          cfoToNetIncomeRatio: Number(cfoRatio.toFixed(2)),
        },
      });
    }
  }

  // -------------------------------------------------------------
  // 規則 3: 借債配息與老本掏空 (DEBT_FUNDED_DIVIDEND)
  // -------------------------------------------------------------
  const dividendPaid = latest.cashFlow.dividendPaid || 0;
  const fcf = operatingCashFlow - Math.abs(latest.cashFlow.capitalExpenditure);
  if (dividendPaid > 0) {
    const isDebtFunded = dividendPaid > fcf * 1.5;
    const isLiabilitiesRising =
      yoyBaseline && latest.balanceSheet.totalLiabilities > yoyBaseline.balanceSheet.totalLiabilities;

    if (isDebtFunded && isLiabilitiesRising) {
      anomalies.push({
        type: 'DEBT_FUNDED_DIVIDEND',
        severity: 'WARNING',
        title: '自由現金流不足，靠舉債或消耗資本公積維持配息',
        summary: `表面殖利率看似誘人，但自由現金流 (FCF) 無法覆蓋股息支出，且總負債較去年同期上升，公司正陷入借債配息風險，透過舉債或消耗資本公積掏空老本。`,
        metrics: {
          dividendPaid,
          freeCashFlow: fcf,
        },
      });
    }
  }

  // -------------------------------------------------------------
  // 規則 4: 業外美化與本業衰退 (CORE_BUSINESS_DECAY)
  // -------------------------------------------------------------
  if (yoyBaseline && yoyBaseline.income.operatingIncome > 0 && yoyBaseline.income.netIncome > 0) {
    const netIncomeYoY =
      ((latest.income.netIncome - yoyBaseline.income.netIncome) / yoyBaseline.income.netIncome) * 100;
    const opIncomeYoY =
      ((latest.income.operatingIncome - yoyBaseline.income.operatingIncome) /
        yoyBaseline.income.operatingIncome) *
      100;

    if (netIncomeYoY >= 15 && opIncomeYoY <= -10) {
      anomalies.push({
        type: 'CORE_BUSINESS_DECAY',
        severity: 'WARNING',
        title: '本業獲利衰退，靠業外處分資產或轉投資美化 EPS',
        summary: `本業營業利益衰退 ${Math.abs(opIncomeYoY).toFixed(1)}%，但稅後淨利卻年增 ${netIncomeYoY.toFixed(1)}%，呈現業外美化現象，顯示獲利高度依賴一次性賣祖產或投資評價，不具備本業可持續性。`,
        metrics: {
          netIncomeYoY: Number(netIncomeYoY.toFixed(1)),
          operatingIncomeYoY: Number(opIncomeYoY.toFixed(1)),
        },
      });
    }
  }

  // -------------------------------------------------------------
  // 規則 5: 美股 SBC 股權稀釋黑洞 (SBC_DILUTION_WARNING)
  // -------------------------------------------------------------
  if (latest.market === 'US' && latest.cashFlow.stockBasedCompensation) {
    const sbc = latest.cashFlow.stockBasedCompensation;
    const sbcRatio = safeDivide(sbc, latest.income.revenue) * 100;

    if (sbcRatio > 15) {
      anomalies.push({
        type: 'SBC_DILUTION_WARNING',
        severity: 'WARNING',
        title: '高額股權激勵 (SBC) 持續稀釋普通股每股實質權益',
        summary: `美股科技股 Non-GAAP 獲利優於預期，但 SBC 佔總營收高達 ${sbcRatio.toFixed(1)}% (> 15%)，高管期權激勵正在大幅侵蝕現有普通股東實質獲利。`,
        metrics: {
          sbcAmount: sbc,
          sbcToRevenueRatio: Number(sbcRatio.toFixed(1)),
        },
      });
    }
  }

  // -------------------------------------------------------------
  // 規則 6: 審計查核意見異常 (AUDITOR_OPINION_RISK)
  // -------------------------------------------------------------
  if (latest.auditInfo) {
    const { opinionType } = latest.auditInfo;
    if (opinionType !== 'UNQUALIFIED' && opinionType !== 'UNREVIEWED') {
      anomalies.push({
        type: 'AUDITOR_OPINION_RISK',
        severity: 'DANGEROUS',
        title: '會計師查核審計意見異常或保留',
        summary: `簽證會計師對本期財務報告出具非無保留意見 (${opinionType})，可能涉及重大存貨減損、未釐清訴訟或資產真偽存疑，屬最高審計風險。`,
      });
    }
  }

  return anomalies;
}
