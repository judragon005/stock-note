import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DividendHistoryTable } from './DividendHistoryTable';
import { TradeRecord, HoldingPosition } from '../../types/stock';

describe('DividendHistoryTable (歷史明細表、YOC 成本殖利率與填息標籤)', () => {
  const mockTrades: TradeRecord[] = [
    {
      id: 'trade-1',
      symbol: '00878',
      name: '國泰永續高股息',
      market: 'TW',
      currency: 'TWD',
      type: 'DIVIDEND',
      date: '2026-06-15',
      shares: 10000,
      price: 0.55,
      exPrice: 21.0,
      fee: 0,
      tax: 0,
      createdAt: 1,
    },
    {
      id: 'trade-future',
      symbol: '00919',
      name: '群益台灣精選高息',
      market: 'TW',
      currency: 'TWD',
      type: 'DIVIDEND',
      date: '2026-12-15',
      payDate: '2026-12-30',
      shares: 5000,
      price: 0.72,
      fee: 0,
      tax: 0,
      createdAt: 2,
    },
  ];

  const mockHoldings: HoldingPosition[] = [
    {
      symbol: '00878',
      name: '國泰永續高股息',
      market: 'TW',
      currency: 'TWD',
      shares: 10000,
      avgCost: 18.0,
      totalCostBasis: 180000,
      adjustedCostBasis: 180000,
      currentPrice: 22.0,
      marketValue: 220000,
      grossMarketValue: 220000,
      estimatedSellTax: 660,
      estimatedSellFee: 313,
      netMarketValue: 219027,
      unrealizedPnL: 40000,
      unrealizedPnLPercent: 22.2,
      unrealizedPnLBroker: 39027,
      unrealizedPnLBrokerPercent: 21.68,
      realizedPnL: 0,
      totalDividends: 5500,
      totalCapitalReturned: 0,
      totalStockDividendsShares: 0,
      totalReturnPnL: 45500,
      totalReturnPercent: 25.28,
      yieldOnCostPercent: 3.06,
    },
  ];

  const defaultProps = {
    dividendTrades: mockTrades,
    allScopedTrades: mockTrades,
    holdings: mockHoldings,
    selectedYear: 2026,
    usdToTwdRate: 32.0,
    todayStr: '2026-11-12',
    searchQuery: '',
    onSearchChange: vi.fn(),
    tableYearFilter: 'SELECTED_YEAR' as const,
    onTableYearFilterChange: vi.fn(),
    rankMode: 'YEAR' as const,
    onRankModeChange: vi.fn(),
    activeContributors: [
      {
        symbol: '00878',
        name: '國泰永續高股息',
        market: 'TW' as const,
        totalDividendsTWD: 5500,
        percentageOfTotal: 60,
      },
    ],
    reconciliationList: [],
    showReconciliationPanel: false,
    onToggleReconciliationPanel: vi.fn(),
    onInstantSettle: vi.fn(),
  };

  it('應正確呈現明細表格內容與 YOC 成本殖利率', () => {
    const html = renderToStaticMarkup(<DividendHistoryTable {...defaultProps} />);
    expect(html).toContain('00878');
    expect(html).toContain('國泰永續高股息');
    // YOC: (0.55 / 18.0) * 100 = 3.1%
    expect(html).toContain('YOC 3.1%');
    expect(html).toContain('實質填息');
  });

  it('對於未來預約發放款項，若有提供 onInstantSettle 應呈現一鍵已入帳按鈕', () => {
    const html = renderToStaticMarkup(<DividendHistoryTable {...defaultProps} />);
    expect(html).toContain('一鍵已入帳');
    expect(html).toContain('預約待入');
  });
});
