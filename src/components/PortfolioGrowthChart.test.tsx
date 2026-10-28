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

  describe('Ticket 08: 穿倉負淨值防禦與破產警戒線', () => {
    it('當遭遇融資穿倉負淨值時，應正確繪製破產警戒線且無 NaN 崩潰', () => {
      const negativeSeries: PortfolioDailySnapshot[] = [
        {
          date: '2026-03-01',
          totalNAV: 200000,
          unitNAV: 100,
          stockMarketValue: 600000,
          cashBalance: 0,
          loanBalance: 400000,
          netCostBasis: 200000,
          cumulativeReturnPnL: 0,
          cumulativeReturnPercent: 0,
          events: [],
        },
        {
          date: '2026-03-02',
          totalNAV: -100000, // 融資斷頭穿倉，持股崩跌至 30 萬但借款 40 萬 -> 總 NAV = -100,000
          unitNAV: 50,
          stockMarketValue: 300000,
          cashBalance: 0,
          loanBalance: 400000,
          netCostBasis: 200000,
          cumulativeReturnPnL: -300000,
          cumulativeReturnPercent: -150,
          events: ['融資追繳斷頭'],
        },
      ];

      const html = renderToStaticMarkup(
        <PortfolioGrowthChart series={negativeSeries} baseCurrency="TWD" />
      );

      // 應繪製破產警戒紅線
      expect(html).toContain('破產警戒線');
      // SVG 路徑不得出現 NaN
      expect(html).not.toContain('NaN');
    });
  });
});
