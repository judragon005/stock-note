import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PortfolioGrowthChart } from './PortfolioGrowthChart';
import { PortfolioDailySnapshot } from '../types/stock';
import * as benchmarkDataModule from '../engine/benchmarkData';

describe('Spec 0207 / Ticket 03: 大盤基準非同步湖倉日 K 水合與重繪', () => {
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
      events: [],
    },
    {
      date: '2026-01-02',
      totalNAV: 1050000,
      unitNAV: 105,
      units: 10000,
      stockMarketValue: 1050000,
      cashBalance: 0,
      loanBalance: 0,
      netCostBasis: 1000000,
      cumulativeReturnPnL: 50000,
      cumulativeReturnPercent: 5,
      dailyPnL: 50000,
      dailyReturnPercent: 5,
      events: [],
    },
  ];

  it('初始指定基準為 SPY 時，組件應安全完成靜態初次渲染並呈現基準標籤', () => {
    const html = renderToStaticMarkup(
      <PortfolioGrowthChart
        series={mockSeries}
        baseCurrency="USD"
        initialBenchmark="SPY"
      />
    );

    expect(html).toContain('SPY 標普500 ETF');
  });

  it('loadBenchmarkDailyPricesAsync 能成功非同步抓取 SQLite 湖倉並快取最新日 K', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candles: [
          { date: '2026-01-01', close: 500 },
          { date: '2026-01-02', close: 510 },
        ],
      }),
    });

    const prices = await benchmarkDataModule.loadBenchmarkDailyPricesAsync('SPY', mockFetch);
    expect(prices['2026-01-01']).toBe(500);
    expect(prices['2026-01-02']).toBe(510);
  });
});
