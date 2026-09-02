import { describe, it, expect } from 'vitest';
import { aggregateDividendReport } from './dividendAggregator';
import { TradeRecord } from '../types/stock';
import { ReceivableDividend } from '../types/dividend';

describe('Dividend Aggregator Engine (股利數據聚合引擎)', () => {
  const mockTrades: TradeRecord[] = [
    {
      id: 't-div-1',
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      type: 'DIVIDEND',
      date: '2026-03-20',
      shares: 1000,
      price: 4.0, // 4,000 TWD
      currency: 'TWD',
      fee: 0,
      tax: 0,
      createdAt: 1710921600000,
    },
    {
      id: 't-div-2',
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      type: 'DIVIDEND',
      date: '2026-06-18',
      shares: 1000,
      price: 4.5, // 4,500 TWD
      currency: 'TWD',
      fee: 0,
      tax: 0,
      createdAt: 1718697600000,
    },
    {
      id: 't-div-3',
      symbol: 'VOO',
      name: '標普500',
      market: 'US',
      type: 'DIVIDEND',
      date: '2026-06-25',
      shares: 10,
      price: 1.8, // 18 USD (稅前), 假設稅 5.4 USD (實收 12.6 USD ➔ 403 TWD)
      currency: 'USD',
      fee: 0,
      tax: 5.4,
      createdAt: 1719302400000,
    },
    {
      id: 't-div-old',
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      type: 'DIVIDEND',
      date: '2025-06-15',
      shares: 1000,
      price: 3.5, // 3,500 TWD
      currency: 'TWD',
      fee: 0,
      tax: 0,
      createdAt: 1686816000000,
    },
  ];

  const mockReceivables: ReceivableDividend[] = [
    {
      id: 'rec-1',
      symbol: '2454',
      name: '聯發科',
      market: 'TW',
      currency: 'TWD',
      exDate: '2026-07-10',
      payDate: '2026-08-05',
      sharesHeldOnExDate: 500,
      cashDividendPerShare: 30,
      estimatedGrossDividend: 15000,
      estimatedTaxOrFee: 0,
      estimatedNetDividend: 15000,
      estimatedNetDividendInTWD: 15000,
      status: 'PENDING_PAYMENT',
    },
  ];

  it('能正確計算全歷史、當年度、去年同期股息與 YoY 成長率', () => {
    const report = aggregateDividendReport(mockTrades, mockReceivables, 2026, 32.0, '2026-12-31');

    // 2026 年實領股利：4,000 + 4,500 + (12.6 * 32 = 403) = 8,903 TWD
    // 2025 年實領股利：3,500 TWD
    expect(report.currentYearDividendsTWD).toBe(8903);
    expect(report.previousYearDividendsTWD).toBe(3500);
    // YoY = (8,903 - 3,500) / 3,500 * 100 = 154.37%
    expect(report.yoyGrowthPercent).toBeCloseTo(154.37, 1);
    expect(report.totalHistoricalDividendsTWD).toBe(12403);
  });

  it('能正確生成 12 個月份的月度現金流分佈', () => {
    const report = aggregateDividendReport(mockTrades, mockReceivables, 2026, 32.0, '2026-12-31');

    expect(report.monthlyDistribution).toHaveLength(12);
    // 3月 (Index 2) = 4,000
    expect(report.monthlyDistribution[2].netTWD).toBe(4000);
    // 6月 (Index 5) = 4,500 + 403 = 4,903
    expect(report.monthlyDistribution[5].netTWD).toBe(4903);
  });

  it('能正確排序全歷史與當年度 Top 貢獻排行榜', () => {
    const report = aggregateDividendReport(mockTrades, mockReceivables, 2026, 32.0, '2026-12-31');

    expect(report.topDividendContributors.length).toBeGreaterThanOrEqual(2);
    expect(report.topDividendContributors[0].symbol).toBe('2330');
    expect(report.topDividendContributors[0].totalDividendsTWD).toBe(12000); // 4000+4500+3500

    expect(report.currentYearTopContributors.length).toBeGreaterThanOrEqual(2);
    expect(report.currentYearTopContributors[0].symbol).toBe('2330');
    expect(report.currentYearTopContributors[0].totalDividendsTWD).toBe(8500); // 4000+4500
  });
});
