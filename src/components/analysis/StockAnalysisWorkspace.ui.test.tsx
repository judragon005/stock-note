import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StockAnalysisWorkspace } from './StockAnalysisWorkspace';
import type { HoldingPosition } from '../../types/stock';

// Mock dependencies
vi.mock('../../engine/financialReportService', () => ({
  loadOrFetchFinancialReport: vi.fn().mockResolvedValue({
    symbol: '2330',
    historicalRecords: [],
    industryAttribute: 'STANDARD',
  }),
}));

vi.mock('../../engine/dividendService', () => ({
  fetchCompanyDividendHistory: vi.fn().mockResolvedValue([]),
}));

describe('StockAnalysisWorkspace UI & ETF Gatekeeper (Ticket 01, 02, 03)', () => {
  const mockHoldings = [
    {
      symbol: '0050',
      name: '元大台灣50',
      shares: 1000,
      avgCost: 150,
      currentPrice: 160,
      market: 'TW',
      totalCostBasis: 150000,
      marketValue: 160000,
      unrealizedPnL: 10000,
      unrealizedPnLPercent: 6.67,
    },
    {
      symbol: '2330',
      name: '台積電',
      shares: 500,
      avgCost: 900,
      currentPrice: 950,
      market: 'TW',
      totalCostBasis: 450000,
      marketValue: 475000,
      unrealizedPnL: 25000,
      unrealizedPnLPercent: 5.56,
    },
  ] as unknown as HoldingPosition[];

  it('Ticket 01: 頁面頂部不應存在快捷標的膠囊列 (Stock Pills)', () => {
    const html = renderToStaticMarkup(
      <StockAnalysisWorkspace
        holdings={mockHoldings}
        trades={[]}
        currentPrices={{ '2330': 950, '0050': 160 }}
      />
    );

    expect(html).not.toContain('快捷標的:');
  });

  it('Ticket 02: 初始標的應自動避開 ETF 並選取普通股 (2330)，且下拉選單排除 ETF', () => {
    const html = renderToStaticMarkup(
      <StockAnalysisWorkspace
        holdings={mockHoldings}
        trades={[]}
        currentPrices={{ '2330': 950, '0050': 160 }}
      />
    );

    // 下拉選單中不應包含 0050，只包含普通股 2330
    expect(html).toContain('2330 - 台積電');
    expect(html).not.toContain('<option value="0050"');
  });

  it('Ticket 03: 當選中 ETF 標的時，橫幅應明確提示「建議前往【主力戰情室】檢視」', () => {
    // 傳入 ETF 持倉
    const etfHoldings = [
      {
        symbol: '0050',
        name: '元大台灣50',
        shares: 1000,
        avgCost: 150,
        currentPrice: 160,
        market: 'TW',
        totalCostBasis: 150000,
        marketValue: 160000,
        unrealizedPnL: 10000,
        unrealizedPnLPercent: 6.67,
      },
    ] as unknown as HoldingPosition[];

    const html = renderToStaticMarkup(
      <StockAnalysisWorkspace
        holdings={etfHoldings}
        trades={[]}
        currentPrices={{ '0050': 160 }}
        initialSymbol="0050"
      />
    );

    // 橫幅文字應符合規格書規定
    expect(html).toContain('建議前往【主力戰情室】檢視');
  });
});
