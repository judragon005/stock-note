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
    // 00878 為季配 (頻率年化 4 次)：(0.55 * 4 / 18.0) * 100 = 12.2%
    expect(html).toContain('YOC 12.2%');
    expect(html).toContain('實質填息');
  });

  it('對於未來預約發放款項，若有提供 onInstantSettle 應呈現一鍵已入帳按鈕', () => {
    const html = renderToStaticMarkup(<DividendHistoryTable {...defaultProps} />);
    expect(html).toContain('一鍵已入帳');
    expect(html).toContain('預約待入');
  });

  it('Spec 0227 / Ticket 04: 表頭應顯示口徑提示橫幅，明確區隔銀行實領流水與待發放應收行事曆，並提供跳轉錨點', () => {
    const html = renderToStaticMarkup(<DividendHistoryTable {...defaultProps} />);
    expect(html).toContain('統計口徑說明：本表為銀行已入帳實領流水');
    expect(html).toContain('除息待入帳行事曆');
    expect(html).toContain('href="#receivable-calendar"');
    expect(html).toContain('查閱除息待入帳行事曆 ➔');
  });

  it('Spec 0228 / Ticket 04: 當傳入 dueReceivables 時應渲染官方已發放·待核對入帳專區', () => {
    const mockDue0056 = [
      {
        id: 'rec-due-0056',
        symbol: '0056',
        name: '元大高股息',
        market: 'TW' as const,
        currency: 'TWD' as const,
        exDate: '2026-10-22',
        payDate: '2026-11-11',
        sharesHeldOnExDate: 7000,
        cashDividendPerShare: 1.07,
        estimatedGrossDividend: 7490,
        estimatedTaxOrFee: 10,
        estimatedNetDividend: 7480,
        estimatedNetDividendInTWD: 7480,
        status: 'DUE_FOR_RECONCILIATION' as const,
      },
    ];

    const html = renderToStaticMarkup(
      <DividendHistoryTable {...defaultProps} dueReceivables={mockDue0056} />
    );

    expect(html).toContain('官方已發放·待核對入帳款項');
    expect(html).toContain('0056');
    expect(html).toContain('7,000 股');
    expect(html).toContain('NT$ 7,480');
    expect(html).toContain('確認網銀已入帳');
  });

  describe('Spec 0229 / Ticket 02: 填息標籤防隱形自癒測試', () => {
    it('當持股已被賣出清倉 (holdingsMap 無該標的) 時，應渲染 "已結清" 膠囊而非隱形空白', () => {
      // 00919 不在 mockHoldings 內
      const html = renderToStaticMarkup(<DividendHistoryTable {...defaultProps} />);
      expect(html).toContain('00919');
      expect(html).toContain('已結清部位');
    });

    it('當缺乏除息參考價時，應渲染 "待補除息價" 膠囊', () => {
      const tradeWithoutExPrice: TradeRecord = {
        id: 'trade-no-exprice',
        symbol: '00878',
        name: '國泰永續高股息',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        date: '2026-08-15',
        shares: 1000,
        price: 0.55,
        fee: 0,
        tax: 0,
        createdAt: 3,
      };

      const html = renderToStaticMarkup(
        <DividendHistoryTable
          {...defaultProps}
          dividendTrades={[tradeWithoutExPrice]}
        />
      );
      expect(html).toContain('待補除息價');
    });
  });

  describe('Spec 0230 / Issue 09 & 10: YOC 頻率年化與歷史外幣匯率快照穿透', () => {
    it('Issue 09: 季配與月配標的在計算 YOC 時應依配息頻率進行年化 (台積電單季 4.0 元在成本 1000 元時年化顯示 1.6%)', () => {
      const tsmcTrade: TradeRecord = {
        id: 'trade-tsmc',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        date: '2026-04-10',
        payDate: '2026-04-10',
        shares: 1000,
        price: 4.0, // 單季 4.0 元
        fee: 0,
        tax: 0,
        createdAt: 10,
      };

      const tsmcHolding: HoldingPosition = {
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        shares: 1000,
        avgCost: 1000.0, // 成本 1000 元
        totalCostBasis: 1000000,
        adjustedCostBasis: 1000000,
        currentPrice: 1050.0,
        marketValue: 1050000,
        grossMarketValue: 1050000,
        estimatedSellTax: 3150,
        estimatedSellFee: 1496,
        netMarketValue: 1045354,
        unrealizedPnL: 50000,
        unrealizedPnLPercent: 5.0,
        unrealizedPnLBroker: 45354,
        unrealizedPnLBrokerPercent: 4.54,
        realizedPnL: 0,
      } as unknown as HoldingPosition;

      const html = renderToStaticMarkup(
        <DividendHistoryTable
          {...defaultProps}
          dividendTrades={[tsmcTrade]}
          holdings={[tsmcHolding]}
        />
      );

      // 單季 4.0 元年化 4 次 = 16 元，成本 1000 元，年化 YOC = 1.6% (非 0.4%)
      expect(html).toContain('YOC 1.6%');
    });

    it('Issue 10: 歷史外幣交易折合台幣應優先採用 trade.exchangeRate 成交匯率快照', () => {
      const historicalUsTrade: TradeRecord = {
        id: 'trade-historical-us',
        symbol: 'AAPL',
        name: 'Apple',
        market: 'US',
        currency: 'USD',
        type: 'DIVIDEND',
        date: '2021-05-15',
        payDate: '2021-05-15',
        shares: 100,
        price: 1.0, // 100 USD
        tax: 30.0, // 30 USD
        fee: 0,
        exchangeRate: 28.0, // 歷史成交當日匯率快照 28.0
        createdAt: 11,
      };

      // 傳入的即時匯率為 32.5
      const html = renderToStaticMarkup(
        <DividendHistoryTable
          {...defaultProps}
          usdToTwdRate={32.5}
          dividendTrades={[historicalUsTrade]}
          holdings={[]}
        />
      );

      // 實領 70 USD * 歷史匯率 28.0 = NT$ 1,960 (若誤用即時匯率 32.5 則會是 2,275)
      expect(html).toContain('NT$ 1,960');
      expect(html).not.toContain('NT$ 2,275');
    });

    it('Ticket #546: 全部帳戶模式下，同一標的於 B 帳戶已結清但 A 帳戶仍持有時，A 帳戶股利不得誤標為已結清部位', () => {
      const tradeAccA: TradeRecord = {
        id: 't-acc-a',
        accountId: 'acc-a',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        date: '2026-09-16',
        payDate: '2026-10-15',
        shares: 1000,
        price: 4.5,
        tax: 0,
        fee: 10,
        createdAt: 1,
      };
      const holdingsMulti = [
        {
          symbol: '2330',
          accountId: 'acc-a',
          name: '台積電',
          market: 'TW' as const,
          currency: 'TWD' as const,
          shares: 1000,
          avgCost: 600,
          totalCostBasis: 600000,
          currentPrice: 900,
          marketValue: 900000,
          unrealizedPnL: 300000,
          unrealizedPnLPercent: 50,
          realizedPnL: 0,
          totalDividends: 4490,
          yieldOnCostPercent: 0.75,
        },
        {
          symbol: '2330',
          accountId: 'acc-b',
          name: '台積電',
          market: 'TW' as const,
          currency: 'TWD' as const,
          shares: 0,
          avgCost: 0,
          totalCostBasis: 0,
          currentPrice: 900,
          marketValue: 0,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          realizedPnL: 10000,
          totalDividends: 0,
          yieldOnCostPercent: 0,
        },
      ];

      const html = renderToStaticMarkup(
        <DividendHistoryTable
          {...defaultProps}
          dividendTrades={[tradeAccA]}
          holdings={holdingsMulti as any}
        />
      );

      expect(html).not.toContain('已結清部位');
    });
  });
});
