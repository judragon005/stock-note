import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PortfolioGrowthChart } from './PortfolioGrowthChart';
import { PortfolioDailySnapshot, CashTransaction } from '../types/stock';

describe('Spec 0207 / Ticket 04: 出入金資金流視覺打點與歷史最長水下天數', () => {
  const mockSeries: PortfolioDailySnapshot[] = [
    {
      date: '2026-01-01',
      totalNAV: 1000000,
      unitNAV: 100,
      units: 10000,
      stockMarketValue: 1000000,
      cashBalance: 0,
      loanBalance: 0,
      netCostBasis: 1000000,
      cumulativeReturnPnL: 0,
      cumulativeReturnPercent: 0,
      dailyPnL: 0,
      dailyReturnPercent: 0,
      underwaterDrawdownPercent: 0,
      events: [],
    },
    {
      date: '2026-01-02',
      totalNAV: 950000,
      unitNAV: 95,
      units: 10000,
      stockMarketValue: 950000,
      cashBalance: 0,
      loanBalance: 0,
      netCostBasis: 1000000,
      cumulativeReturnPnL: -50000,
      cumulativeReturnPercent: -5,
      dailyPnL: -50000,
      dailyReturnPercent: -5,
      underwaterDrawdownPercent: -5.0,
      events: [],
    },
    {
      date: '2026-01-03',
      totalNAV: 900000,
      unitNAV: 90,
      units: 10000,
      stockMarketValue: 900000,
      cashBalance: 0,
      loanBalance: 0,
      netCostBasis: 1000000,
      cumulativeReturnPnL: -100000,
      cumulativeReturnPercent: -10,
      dailyPnL: -50000,
      dailyReturnPercent: -5.26,
      underwaterDrawdownPercent: -10.0,
      events: [],
    },
    {
      date: '2026-01-04',
      totalNAV: 1000000,
      unitNAV: 100,
      units: 10000,
      stockMarketValue: 1000000,
      cashBalance: 0,
      loanBalance: 0,
      netCostBasis: 1000000,
      cumulativeReturnPnL: 0,
      cumulativeReturnPercent: 0,
      dailyPnL: 100000,
      dailyReturnPercent: 11.11,
      underwaterDrawdownPercent: 0,
      events: [],
    },
  ];

  const mockCash: CashTransaction[] = [
    {
      id: 'cash-dep-1',
      date: '2026-01-04',
      type: 'DEPOSIT',
      amount: 100000,
      currency: 'TWD',
      accountId: 'default',
      createdAt: 1,
      note: '薪資入金',
    },
  ];

  it('水下回撤分析面板應計算並呈現歷史最長水下天數 (Longest Drawdown Duration)', () => {
    const html = renderToStaticMarkup(
      <PortfolioGrowthChart series={mockSeries} baseCurrency="TWD" />
    );

    // 01-02 到 01-03 連續 2 天在水下 (< 0%)
    expect(html).toContain('最長水下:');
    expect(html).toContain('2 天');
  });

  it('當前焦點日期包含外部入金或出金時，應渲染入金/出金膠囊標籤', () => {
    const html = renderToStaticMarkup(
      <PortfolioGrowthChart
        series={mockSeries}
        cashTransactions={mockCash}
        baseCurrency="TWD"
      />
    );

    // 2026-01-04 有 DEPOSIT 100,000
    expect(html).toContain('💵 入金');
  });
});
