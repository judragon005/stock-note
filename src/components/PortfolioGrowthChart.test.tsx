import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PortfolioGrowthChart } from './PortfolioGrowthChart';
import { PortfolioDailySnapshot } from '../types/stock';

describe('PortfolioGrowthChart - 資產走勢與雙模切換 (Ticket 07)', () => {
  const mockSeries: PortfolioDailySnapshot[] = [
    {
      date: '2026-01-01',
      totalNAV: 1000000,
      unitNAV: 100.0,
      units: 10000,
      stockMarketValue: 600000,
      cashBalance: 400000,
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
      totalNAV: 1060000,
      unitNAV: 106.0,
      units: 10000,
      stockMarketValue: 660000,
      cashBalance: 400000,
      loanBalance: 0,
      netCostBasis: 1000000,
      cumulativeReturnPnL: 60000,
      cumulativeReturnPercent: 6.0,
      dailyPnL: 60000,
      dailyReturnPercent: 6.0,
      events: [],
    },
  ];

  it('應呈現 AUM 金額模式與 Unit NAV 淨值走勢雙模切換按鈕', () => {
    const html = renderToStaticMarkup(
      <PortfolioGrowthChart series={mockSeries} baseCurrency="TWD" />
    );

    expect(html).toContain('資產金額 (AUM)');
    expect(html).toContain('淨值走勢 (Unit NAV %)');
  });

  it('在 UNIT_NAV 模式下應呈現百分比刻度', () => {
    const html = renderToStaticMarkup(
      <PortfolioGrowthChart series={mockSeries} baseCurrency="TWD" initialChartMode="UNIT_NAV" />
    );

    // 歸一化模式下 Y 軸文字應包含 % 符號
    expect(html).toContain('%');
  });

  it('當歷史淨值序列為空時，應安全渲染無資料佔位提示', () => {
    const html = renderToStaticMarkup(
      <PortfolioGrowthChart series={[]} baseCurrency="TWD" />
    );

    expect(html).toContain('尚無足夠的歷史淨值數據');
  });
});
