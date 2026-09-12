import { describe, it, expect } from 'vitest';
import {
  calculateMarginSvgPoints,
  formatCurrencyMillions,
  getDuPontDriverBadge,
} from './FinancialTrendsLayer';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';

describe('FinancialTrendsLayer (Layer 2 UI Logic & TDD Tests)', () => {
  const sampleRecords: (QuarterlyFinancialRecord | any)[] = [
    {
      symbol: '2330',
      year: 2024,
      quarter: 3,
      revenue: 759692,
      grossProfit: 439000,
      operatingProfit: 360000,
      netIncome: 325258,
      operatingCashFlow: 390000,
      freeCashFlow: 210000,
      totalAssets: 6000000,
      totalLiabilities: 2000000,
      totalEquity: 4000000,
      accountsReceivable: 250000,
      inventory: 300000,
      cashAndEquivalents: 1500000,
      interestBearingDebt: 600000,
      shortTermDebt: 100000,
      longTermDebt: 500000,
    },
    {
      symbol: '2330',
      year: 2024,
      quarter: 4,
      revenue: 860000,
      grossProfit: 500000,
      operatingProfit: 410000,
      netIncome: 370000,
      operatingCashFlow: 450000,
      freeCashFlow: 260000,
      totalAssets: 6200000,
      totalLiabilities: 2100000,
      totalEquity: 4100000,
      accountsReceivable: 270000,
      inventory: 310000,
      cashAndEquivalents: 1600000,
      interestBearingDebt: 620000,
      shortTermDebt: 110000,
      longTermDebt: 510000,
    },
  ];

  it('1. 三率折線 SVG 點陣座標運算不會產生 NaN 或空字串', () => {
    const grossPoints = calculateMarginSvgPoints(sampleRecords, 'grossMargin', 300, 150);
    expect(grossPoints).toBeTruthy();
    expect(grossPoints).not.toContain('NaN');
    expect(grossPoints.split(' ').length).toBe(sampleRecords.length);
  });

  it('2. 負值或空陣列應回傳安全空點陣，不產生除以零錯誤', () => {
    const emptyPoints = calculateMarginSvgPoints([], 'grossMargin', 300, 150);
    expect(emptyPoints).toBe('');

    const zeroRevRecord: (QuarterlyFinancialRecord | any)[] = [
      {
        ...sampleRecords[0],
        revenue: 0,
        grossProfit: 0,
      },
    ];
    const zeroPoints = calculateMarginSvgPoints(zeroRevRecord, 'grossMargin', 300, 150);
    expect(zeroPoints).not.toContain('NaN');
  });

  it('3. 金額百萬/億級別格式化正確', () => {
    expect(formatCurrencyMillions(325258)).toBe('3,253 億');
    expect(formatCurrencyMillions(50)).toBe('50 百萬');
    expect(formatCurrencyMillions(-12000)).toBe('-120 億');
  });

  it('4. 杜邦主驅動力標籤顯示與風險警示正確', () => {
    const levInfo = getDuPontDriverBadge('LEVERAGE');
    expect(levInfo.label).toContain('財務槓桿');
    expect(levInfo.isWarning).toBe(true);

    const profInfo = getDuPontDriverBadge('PROFITABILITY');
    expect(profInfo.label).toContain('產品獲利率');
    expect(profInfo.isWarning).toBe(false);

    const effInfo = getDuPontDriverBadge('EFFICIENCY');
    expect(effInfo.label).toContain('資產週轉效率');
    expect(effInfo.isWarning).toBe(false);
  });
});
