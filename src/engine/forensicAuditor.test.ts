import { describe, it, expect } from 'vitest';
import { evaluateForensicWarnings } from './forensicAuditor';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';

const createQuarter = (
  year: number,
  quarter: number,
  revenue: number,
  netIncome: number,
  ar: number,
  inv: number,
  cfo: number,
  capex: number,
  totalAssets = 1000,
  totalLiabilities = 400,
  shortTermDebt?: number,
  longTermDebt?: number,
  cash = 300
): QuarterlyFinancialRecord => ({
  symbol: '2330',
  market: 'TW',
  year,
  quarter,
  periodDate: `${year}-0${quarter * 3}-30`,
  updatedAt: Date.now(),
  income: {
    revenue,
    grossProfit: revenue * 0.5,
    operatingIncome: revenue * 0.4,
    netIncome,
    eps: netIncome / 100,
  },
  balanceSheet: {
    totalAssets,
    totalLiabilities,
    totalEquity: totalAssets - totalLiabilities,
    accountsReceivable: ar,
    inventory: inv,
    cashAndEquivalents: cash,
    shortTermDebt,
    longTermDebt,
  },
  cashFlow: {
    operatingCashFlow: cfo,
    capitalExpenditure: capex,
  },
});

describe('forensicAuditor', () => {
  it('Ticket 09: 應收帳款與存貨剪刀差應嚴格比對去年同期 (YoY)，而非上一季 (QoQ)', () => {
    // 假設 2024Q1 (淡季, 營收80) 比 2023Q4 (旺季, 營收100) QoQ大幅下降，
    // 但比 2023Q1 (去年同期淡季, 營收70) YoY 是成長的！
    const q2023q1 = createQuarter(2023, 1, 70, 20, 30, 20, 25, 10);
    const q2023q4 = createQuarter(2023, 4, 100, 30, 50, 30, 35, 10);
    const q2024q1 = createQuarter(2024, 1, 80, 25, 33, 21, 30, 10); // 營收 YoY +14.2%, 應收 YoY +10%

    const chronological = [q2023q1, q2023q4, q2024q1];
    const results = evaluateForensicWarnings({
      latestRecord: q2024q1,
      chronological,
      isFinancialStock: false,
    });

    const arCheck = results.find((r) => r.id === 'ar_scissor');
    expect(arCheck).toBeDefined();
    // 去年同期 YoY 比對正常，不應觸發塞貨假警報
    expect(arCheck?.isAlert).toBe(false);
    expect(arCheck?.comparisonType).toBe('YOY');
  });

  it('Ticket 09: 當應收增速真 YoY 顯著高於營收真 YoY (>20%) 時觸發剪刀差紅燈', () => {
    const q2023q1 = createQuarter(2023, 1, 100, 20, 50, 20, 25, 10);
    const q2024q1 = createQuarter(2024, 1, 100, 20, 90, 20, 25, 10); // 營收 YoY 0%, 應收 YoY +80%

    const chronological = [q2023q1, q2024q1];
    const results = evaluateForensicWarnings({
      latestRecord: q2024q1,
      chronological,
      isFinancialStock: false,
    });

    const arCheck = results.find((r) => r.id === 'ar_scissor');
    expect(arCheck?.isAlert).toBe(true);
  });

  it('Ticket 10: 當 FCF 為負但 CFO 強勁且主要因高額 Capex 擴產時，標註為「良性資本擴張期」非致命失血', () => {
    // 兩季 FCF 為負，但 CFO 高達 50，Capex 高達 80
    const q1 = createQuarter(2024, 1, 100, 30, 20, 20, 50, 80);
    const q2 = createQuarter(2024, 2, 110, 35, 20, 20, 55, 90);

    const chronological = [q1, q2];
    const results = evaluateForensicWarnings({
      latestRecord: q2,
      chronological,
      isFinancialStock: false,
    });

    const fcfCheck = results.find((r) => r.id === 'fcf_health');
    expect(fcfCheck).toBeDefined();
    expect(fcfCheck?.status).toBe('CAPEX_EXPANSION'); // 良性資本擴張期
    expect(fcfCheck?.isAlert).toBe(false); // 不是致命紅燈
  });

  it('Ticket 10: 負債結構檢驗優先使用有息負債，過濾 IFRS 16 租賃負債虛胖', () => {
    // 總負債 750 / 總資產 1000 = 75% (若依總負債比率會大於 70% 誤報)
    // 但金融短期+長期借款只有 100 + 100 = 200 (有息負債比僅 20%)
    const q = createQuarter(2024, 1, 100, 20, 20, 20, 30, 10, 1000, 750, 100, 100);

    const results = evaluateForensicWarnings({
      latestRecord: q,
      chronological: [q],
      isFinancialStock: false,
    });

    const debtCheck = results.find((r) => r.id === 'debt_structure');
    expect(debtCheck?.isAlert).toBe(false);
    expect(debtCheck?.filteredIfrs16).toBe(true);
  });

  it('Ticket 11: 每股淨現金 (Net-Net Cash) 正確計算並於充沛時給予財務堡壘標籤', () => {
    // 現金 500, 有息負債 100, 總資產 1000, 淨現金 400
    const q = createQuarter(2024, 1, 100, 20, 20, 20, 30, 10, 1000, 300, 50, 50, 500);

    const results = evaluateForensicWarnings({
      latestRecord: q,
      chronological: [q],
      isFinancialStock: false,
      sharesOutstanding: 100, // 100 股
    });

    const cashCheck = results.find((r) => r.id === 'net_cash');
    expect(cashCheck).toBeDefined();
    expect(cashCheck?.isNetCashCompany).toBe(true);
    expect(cashCheck?.netCashPerShare).toBe(4.0); // (500 - 100) / 100 = 4.0
  });

  it('Ticket 12: 董監事股權質押比率 > 40% 亮起斷頭風險紅燈', () => {
    const q = createQuarter(2024, 1, 100, 20, 20, 20, 30, 10);

    const results = evaluateForensicWarnings({
      latestRecord: q,
      chronological: [q],
      isFinancialStock: false,
      directorPledgeRatio: 45.5,
    });

    const pledgeCheck = results.find((r) => r.id === 'director_pledge');
    expect(pledgeCheck).toBeDefined();
    expect(pledgeCheck?.isAlert).toBe(true);
    expect(pledgeCheck?.status).toBe('ALERT');
    expect(pledgeCheck?.desc).toContain('45.5%');
  });
});
