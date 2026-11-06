import { describe, it, expect } from 'vitest';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';
import {
  calculateInstitutionalScoring,
  generate12AnalystsPrompt,
} from './institutionalScoringEngine';

describe('institutionalScoringEngine (機構級投研 8 維度評分與總覽)', () => {
  const mockHealthyRecords = [
    {
      year: 2024,
      quarter: 1,
      periodDate: '2024-03-31',
      income: {
        revenue: 100000,
        grossProfit: 45000,
        operatingIncome: 25000,
        netIncome: 22000,
        eps: 2.2,
      },
      balanceSheet: {
        totalAssets: 200000,
        totalLiabilities: 60000,
        totalEquity: 140000,
        cashAndEquivalents: 50000,
        accountsReceivable: 15000,
        inventory: 12000,
        currentAssets: 100000,
        currentLiabilities: 30000,
      },
      cashFlow: {
        operatingCashFlow: 30000, // CFO > NI (純度高)
        capitalExpenditure: -8000,
      },
    },
    {
      year: 2024,
      quarter: 2,
      periodDate: '2024-06-30',
      income: {
        revenue: 110000,
        grossProfit: 50000,
        operatingIncome: 28000,
        netIncome: 25000,
        eps: 2.5,
      },
      balanceSheet: {
        totalAssets: 220000,
        totalLiabilities: 65000,
        totalEquity: 155000,
        cashAndEquivalents: 55000,
        accountsReceivable: 16000,
        inventory: 13000,
        currentAssets: 110000,
        currentLiabilities: 32000,
      },
      cashFlow: {
        operatingCashFlow: 32000,
        capitalExpenditure: -9000,
      },
    },
    {
      year: 2024,
      quarter: 3,
      periodDate: '2024-09-30',
      income: {
        revenue: 125000,
        grossProfit: 58000,
        operatingIncome: 33000,
        netIncome: 30000,
        eps: 3.0,
      },
      balanceSheet: {
        totalAssets: 240000,
        totalLiabilities: 70000,
        totalEquity: 170000,
        cashAndEquivalents: 62000,
        accountsReceivable: 18000,
        inventory: 14000,
        currentAssets: 125000,
        currentLiabilities: 35000,
      },
      cashFlow: {
        operatingCashFlow: 38000,
        capitalExpenditure: -10000,
      },
    },
    {
      year: 2024,
      quarter: 4,
      periodDate: '2024-12-31',
      income: {
        revenue: 140000,
        grossProfit: 65000,
        operatingIncome: 38000,
        netIncome: 35000,
        eps: 3.5,
      },
      balanceSheet: {
        totalAssets: 270000,
        totalLiabilities: 75000,
        totalEquity: 195000,
        cashAndEquivalents: 75000,
        accountsReceivable: 19000,
        inventory: 15000,
        currentAssets: 145000,
        currentLiabilities: 40000,
      },
      cashFlow: {
        operatingCashFlow: 45000,
        capitalExpenditure: -12000,
      },
    },
  ] as unknown as QuarterlyFinancialRecord[];

  it('應能正確計算 8 維度評分卡，總權重必須為 100%', () => {
    const summary = calculateInstitutionalScoring({
      records: mockHealthyRecords,
      currentPrice: 120,
      revenueRecords: [
        { yearMonth: '2024-10', revenue: 46000, yoyRate: 15.2, isAllTimeHigh: 0 },
        { yearMonth: '2024-11', revenue: 47000, yoyRate: 16.8, isAllTimeHigh: 0 },
        { yearMonth: '2024-12', revenue: 51000, yoyRate: 21.4, isAllTimeHigh: 1 },
      ],
      directorPledgeRatio: 5.0, // 安全
      symbol: '2330',
      stockName: '台積電',
    });

    const totalWeight = summary.dimensions.reduce((acc, d) => acc + d.weight, 0);
    expect(totalWeight).toBe(100);

    expect(summary.totalScore).toBeGreaterThanOrEqual(75);
    expect(summary.overallGrade).toMatch(/強力買進|穩健偏多/);
    expect(summary.dimensions).toHaveLength(8);

    // 驗證財報說了什麼 vs 沒說什麼
    expect(summary.whatFinancialsSaid.length).toBeGreaterThan(0);
    expect(summary.whatFinancialsDidntSay.length).toBeGreaterThan(0);

    // 驗證交易決策與買進區間
    expect(summary.tradeDecision.targetBuyRange[0]).toBeLessThanOrEqual(summary.tradeDecision.targetBuyRange[1]);
    expect(summary.tradeDecision.invalidationConditions.length).toBeGreaterThan(0);
  });

  it('當董監事質押率大於等於 40% 時，財務安全分數應顯著扣分且發出斷頭警戒', () => {
    const summary = calculateInstitutionalScoring({
      records: mockHealthyRecords,
      currentPrice: 120,
      directorPledgeRatio: 55.0, // 高危險斷頭
      symbol: '2330',
      stockName: '台積電',
    });

    const safetyDim = summary.dimensions.find((d) => d.name === '財務安全');
    expect(safetyDim).toBeDefined();
    expect(safetyDim!.score).toBeLessThanOrEqual(3);
    expect(summary.whatFinancialsDidntSay.some((s) => s.includes('董監質押'))).toBe(true);
  });

  it('應能正確生成「12 位分析師投研 Prompt」，無 Token 消耗且格式規範健全', () => {
    const prompt = generate12AnalystsPrompt({
      symbol: '2330',
      stockName: '台積電',
      market: 'TW',
      currentPrice: 1050,
      records: mockHealthyRecords,
      revenueRecords: [
        { yearMonth: '2024-12', revenue: 51000, yoyRate: 21.4, isAllTimeHigh: 1 },
      ],
      directorPledgeRatio: 5.0,
      holdingCost: 950,
    });

    expect(prompt).toContain('# ROLE：台美股機構級財報研究與投資決策系統');
    expect(prompt).toContain('股票代號：2330');
    expect(prompt).toContain('公司名稱：台積電');
    expect(prompt).toContain('持有成本：950');
    expect(prompt).toContain('12 位專業分析師');
    expect(prompt).toContain('Reverse DCF');
  });
});
