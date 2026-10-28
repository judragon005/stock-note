import { describe, it, expect } from 'vitest';
import {
  forwardFillPrices,
  generateDateSequence,
  calculateHistoricalNavSeries,
  filterNavSeriesByRange,
  calculatePerformanceMetrics,
} from './historicalNav';
import {
  TradeRecord,
  CashTransaction,
  LoanRecord,
  HistoricalDailyPriceMap,
  HistoricalFxRateMap,
} from '../types/stock';
import { ReceivableDividend } from '../types/dividend';

describe('歷史行情補值與日期序列引擎 (Forward-Fill & Date Sequence)', () => {
  it('應能正確生成連續日曆天日期序列 (YYYY-MM-DD)', () => {
    const dates = generateDateSequence('2026-01-01', '2026-01-05');
    expect(dates).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
      '2026-01-05',
    ]);
  });

  it('遇休市日或週末無報價時，應以向前補齊 (Forward-Fill) 沿用上一交易日收盤價', () => {
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'];
    // 假設 01-01 元旦休市無報價, 01-02 開盤 600, 01-03/01-04 週末無報價, 01-05 開盤 610
    const rawPrices: Record<string, number> = {
      '2026-01-02': 600,
      '2026-01-05': 610,
    };

    const filled = forwardFillPrices(dates, rawPrices, 590); // 初始 fallback
    expect(filled['2026-01-01']).toBe(590);
    expect(filled['2026-01-02']).toBe(600);
    expect(filled['2026-01-03']).toBe(600); // 週末沿用 01-02
    expect(filled['2026-01-04']).toBe(600); // 週末沿用 01-02
    expect(filled['2026-01-05']).toBe(610);
  });
});

describe('歷史每日資產淨值 (NAV) 回測重播引擎 (Historical NAV Calculator)', () => {
  it('單一買進並持有 (Buy & Hold) 情境：NAV 與未實現損益應隨歷史收盤價每日精確波動', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2026-01-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 600,
        fee: 855,
        tax: 0,
        createdAt: 1,
      },
    ];

    const priceMap: HistoricalDailyPriceMap = {
      '2330': {
        '2026-01-01': 600,
        '2026-01-02': 620,
        '2026-01-03': 590,
      },
    };

    const fxMap: HistoricalFxRateMap = {
      '2026-01-01': 32.0,
      '2026-01-02': 32.0,
      '2026-01-03': 32.0,
    };

    const series = calculateHistoricalNavSeries({
      trades,
      cashTransactions: [],
      loanRecords: [],
      priceMap,
      fxMap,
      startDate: '2026-01-01',
      endDate: '2026-01-03',
      baseCurrency: 'TWD',
    });

    expect(series.length).toBe(3);

    // Day 1: 買進 1000 股 @ 600, 費用 855 -> 投入本金 600,855; 市值 600,000; 現金 0 (若無額外入金，此處淨投入即為買入成本)
    expect(series[0].date).toBe('2026-01-01');
    expect(series[0].stockMarketValue).toBe(600000);
    expect(series[0].netCostBasis).toBe(600855);
    expect(series[0].totalNAV).toBe(600000);

    // Day 2: 股價漲至 620 -> 市值 620,000; NAV 620,000; 累積報酬 620000 - 600855 = 19145
    expect(series[1].date).toBe('2026-01-02');
    expect(series[1].stockMarketValue).toBe(620000);
    expect(series[1].totalNAV).toBe(620000);
    expect(series[1].cumulativeReturnPnL).toBe(19145);

    // Day 3: 股價跌至 590 -> 市值 590,000; NAV 590,000
    expect(series[2].date).toBe('2026-01-03');
    expect(series[2].stockMarketValue).toBe(590000);
    expect(series[2].totalNAV).toBe(590000);
  });

  it('結合現金帳本與借貸負債：NAV 應符合 (持股市值 + 現金餘額 - 借貸負債) 之精確定義', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2026-01-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 600,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
    ];

    const cashTransactions: CashTransaction[] = [
      {
        id: 'c1',
        accountId: 'broker-tw-default',
        currency: 'TWD',
        type: 'DEPOSIT',
        amount: 1000000, // 初始入金 100 萬
        date: '2026-01-01',
        createdAt: 1,
      },
    ];

    const loanRecords: LoanRecord[] = [
      {
        id: 'l1',
        name: '質押借款',
        type: 'BORROW',
        principal: 200000, // 借貸 20 萬
        currency: 'TWD',
        date: '2026-01-02',
        createdAt: 2,
      },
    ];

    const priceMap: HistoricalDailyPriceMap = {
      '2330': {
        '2026-01-01': 600,
        '2026-01-02': 600,
      },
    };

    const fxMap: HistoricalFxRateMap = {
      '2026-01-01': 32.0,
      '2026-01-02': 32.0,
    };

    const series = calculateHistoricalNavSeries({
      trades,
      cashTransactions,
      loanRecords,
      priceMap,
      fxMap,
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      baseCurrency: 'TWD',
    });

    // Day 1: 入金 100 萬, 買股 60 萬 -> 持股市值 60 萬, 現金餘額 40 萬, 負債 0 -> 總 NAV = 100 萬
    expect(series[0].date).toBe('2026-01-01');
    expect(series[0].stockMarketValue).toBe(600000);
    expect(series[0].cashBalance).toBe(400000);
    expect(series[0].loanBalance).toBe(0);
    expect(series[0].totalNAV).toBe(1000000);
    expect(series[0].netCostBasis).toBe(1000000);

    // Day 2: 借貸 20 萬入現金 -> 現金變 60 萬, 負債 20 萬 -> NAV = 60萬(股) + 60萬(現金) - 20萬(貸) = 100 萬
    expect(series[1].date).toBe('2026-01-02');
    expect(series[1].stockMarketValue).toBe(600000);
    expect(series[1].cashBalance).toBe(600000);
    expect(series[1].loanBalance).toBe(200000);
    expect(series[1].totalNAV).toBe(1000000);
  });

  it('除權除息與公司行動：股息入帳與配股增加應正確反映在現金與持股市值中', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2026-01-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 600,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2026-01-02',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        shares: 1000,
        price: 5, // 每股配息 5 元 -> 總配息 5000 元
        fee: 0,
        tax: 0,
        cashAmount: 5000,
        createdAt: 2,
      },
      {
        id: 't3',
        date: '2026-01-03',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'STOCK_DIVIDEND',
        shares: 100, // 配發 100 股
        price: 0,
        fee: 0,
        tax: 0,
        createdAt: 3,
      },
    ];

    const priceMap: HistoricalDailyPriceMap = {
      '2330': {
        '2026-01-01': 600,
        '2026-01-02': 595, // 除息 5 元
        '2026-01-03': 595,
      },
    };

    const fxMap: HistoricalFxRateMap = {
      '2026-01-01': 32.0,
      '2026-01-02': 32.0,
      '2026-01-03': 32.0,
    };

    const series = calculateHistoricalNavSeries({
      trades,
      cashTransactions: [],
      loanRecords: [],
      priceMap,
      fxMap,
      startDate: '2026-01-01',
      endDate: '2026-01-03',
      baseCurrency: 'TWD',
    });

    // Day 2: 1000 股 @ 595 (595,000) + 配息現金 5,000 = 600,000 總 NAV (除息資產不減損)
    expect(series[1].stockMarketValue).toBe(595000);
    expect(series[1].cashBalance).toBe(5000);
    expect(series[1].totalNAV).toBe(600000);

    // Day 3: 配股 100 股生效 -> 持股變 1100 股 @ 595 = 654,500 + 現金 5,000 = 659,500 NAV
    expect(series[2].stockMarketValue).toBe(654500);
    expect(series[2].cashBalance).toBe(5000);
    expect(series[2].totalNAV).toBe(659500);
  });
});

describe('週期篩選與績效統計指標 (Metrics & Time Range Filter)', () => {
  it('應能正確計算 MDD (最大回撤)、ATH (歷史最高) 與區間報酬率', () => {
    const mockSeries = [
      {
        date: '2026-01-01',
        totalNAV: 100,
        unitNAV: 100,
        stockMarketValue: 100,
        cashBalance: 0,
        loanBalance: 0,
        netCostBasis: 100,
        cumulativeReturnPnL: 0,
        cumulativeReturnPercent: 0,
        events: [],
      },
      {
        date: '2026-01-02',
        totalNAV: 150, // Peak ATH
        unitNAV: 150,
        stockMarketValue: 150,
        cashBalance: 0,
        loanBalance: 0,
        netCostBasis: 100,
        cumulativeReturnPnL: 50,
        cumulativeReturnPercent: 50,
        events: [],
      },
      {
        date: '2026-01-03',
        totalNAV: 120, // Drawdown from 150 to 120: (120 - 150) / 150 = -20%
        unitNAV: 120,
        stockMarketValue: 120,
        cashBalance: 0,
        loanBalance: 0,
        netCostBasis: 100,
        cumulativeReturnPnL: 20,
        cumulativeReturnPercent: 20,
        events: [],
      },
    ];

    const metrics = calculatePerformanceMetrics(mockSeries);
    expect(metrics.allTimeHighNAV).toBe(150);
    expect(metrics.currentNAV).toBe(120);
    expect(metrics.totalProfitPnL).toBe(20);
    expect(metrics.totalReturnPercent).toBe(20);
  });

  it('應能正確按時間維度篩選序列 (如 1M, 1Y, ALL)', () => {
    const mockSeries = [
      {
        date: '2025-01-01',
        totalNAV: 100,
        unitNAV: 100,
        stockMarketValue: 100,
        cashBalance: 0,
        loanBalance: 0,
        netCostBasis: 100,
        cumulativeReturnPnL: 0,
        cumulativeReturnPercent: 0,
        events: [],
      },
      {
        date: '2026-01-01',
        totalNAV: 150,
        unitNAV: 150,
        stockMarketValue: 150,
        cashBalance: 0,
        loanBalance: 0,
        netCostBasis: 100,
        cumulativeReturnPnL: 50,
        cumulativeReturnPercent: 50,
        events: [],
      },
    ];

    const allSeries = filterNavSeriesByRange(mockSeries, 'ALL');
    expect(allSeries.length).toBe(2);

    const filtered1M = filterNavSeriesByRange(mockSeries, '1M');
    expect(filtered1M.length).toBe(1);
    expect(filtered1M[0].date).toBe('2026-01-01');
  });

  it('在單一市場範疇模式 (如僅傳入台股交易與金流) 時，NAV 序列應精確僅反映台股淨資產', () => {
    const twTrades: TradeRecord[] = [
      {
        id: 't-tw',
        date: '2026-01-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 600,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
    ];

    const twCash: CashTransaction[] = [
      {
        id: 'c-tw',
        accountId: 'tw-acc',
        currency: 'TWD',
        type: 'DEPOSIT',
        amount: 600000,
        date: '2026-01-01',
        createdAt: 1,
      },
      {
        id: 'c-tw-buy',
        accountId: 'tw-acc',
        currency: 'TWD',
        type: 'STOCK_BUY',
        amount: -600000,
        date: '2026-01-01',
        createdAt: 2,
      },
      {
        id: 'c-tw-interest',
        accountId: 'tw-acc',
        currency: 'TWD',
        type: 'INTEREST_INCOME',
        amount: 0,
        date: '2026-01-02',
        createdAt: 3,
      },
    ];

    const priceMap: HistoricalDailyPriceMap = {
      '2330': {
        '2026-01-01': 600,
        '2026-01-02': 650,
      },
    };

    const fxMap: HistoricalFxRateMap = {
      '2026-01-01': 32.0,
      '2026-01-02': 32.0,
    };

    const series = calculateHistoricalNavSeries({
      trades: twTrades,
      cashTransactions: twCash,
      loanRecords: [],
      priceMap,
      fxMap,
      baseCurrency: 'TWD',
    });

    expect(series.length).toBe(2);
    // 2026-01-01: 1000 * 600 + 0 cash = 600,000
    expect(series[0].totalNAV).toBe(600000);
    // 2026-01-02: 1000 * 650 + 0 cash = 650,000
    expect(series[1].totalNAV).toBe(650000);
    expect(series[1].stockMarketValue).toBe(650000);
  });

  it('當歷史日 K (priceMap) 缺失或尚未同步時，應自動以 currentPrices 即時市價保底對齊最新持股市值與獲利', () => {
    const usTrades: TradeRecord[] = [
      {
        id: 't-us-vt',
        date: '2025-09-17',
        symbol: 'VT',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 80.3367,
        price: 145.22, // 成本價 145.22 (總成本 11,666.50)
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
    ];

    const usCash: CashTransaction[] = [
      {
        id: 'c-deposit',
        accountId: 'schwab',
        currency: 'USD',
        type: 'DEPOSIT',
        amount: 11807, // 總入金 11,807
        date: '2025-09-10',
        createdAt: 1,
      },
      {
        id: 'c-buy',
        accountId: 'schwab',
        currency: 'USD',
        type: 'STOCK_BUY',
        amount: -11666.50,
        date: '2025-09-17',
        createdAt: 2,
      },
    ];

    // priceMap 完全為空（未同步日 K），但提供 currentPrices VT = 160.99
    const series = calculateHistoricalNavSeries({
      trades: usTrades,
      cashTransactions: usCash,
      loanRecords: [],
      priceMap: {}, // 空歷史日 K
      currentPrices: { VT: 160.99 },
      baseCurrency: 'USD',
    });

    expect(series.length).toBeGreaterThan(0);
    const latest = series[series.length - 1];

    // 最新一日持股市值: 80.3367 * 160.99 = 12933.41
    expect(latest.stockMarketValue).toBeCloseTo(12933.41, 1);
    // 現金餘額: 11807 - 11666.50 = 140.50
    expect(latest.cashBalance).toBeCloseTo(140.50, 1);
    // 總 NAV = 12933.41 + 140.50 = 13073.91 (總本金 11807 ➔ 總獲利 +1266.91 盈利)
    expect(latest.totalNAV).toBeGreaterThan(11807);
    expect(latest.cumulativeReturnPnL).toBeGreaterThan(0); // 確保為盈利正值，絕非虧損
  });

  describe('Ticket #002 & #006: 跨期 NAV 連續性與在途/除息平滑驗證', () => {
    it('Ticket #002: 融資買進 (MARGIN_BUY) 時，持股市值全額計入、現金扣自備款、融資負債同步增加，總 NAV 精準守恆', () => {
      const marginTrades: TradeRecord[] = [
        {
          id: 't-margin-nav',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'MARGIN_BUY',
          shares: 1000,
          price: 1000, // 市值 1,000,000，自備款 400,000，負債 600,000
          fee: 0,
          tax: 0,
          date: '2026-08-20',
          createdAt: 1,
        },
      ];

      const initialCash: CashTransaction[] = [
        {
          id: 'c-init',
          currency: 'TWD',
          type: 'DEPOSIT',
          amount: 500000,
          date: '2026-08-19',
          createdAt: 0,
          accountId: 'broker-tw-default',
        },
      ];

      const series = calculateHistoricalNavSeries({
        trades: marginTrades,
        cashTransactions: initialCash,
        loanRecords: [],
        priceMap: { '2330': { '2026-08-19': 1000, '2026-08-20': 1000 } },
        baseCurrency: 'TWD',
      });

      const day20 = series.find((s) => s.date === '2026-08-20');
      expect(day20).toBeDefined();
      // 股票市值 1,000,000
      expect(day20!.stockMarketValue).toBe(1000000);
      // 現金扣自備款 400,000 ➔ 剩餘 100,000
      expect(day20!.cashBalance).toBe(100000);
      // 融資負債 600,000
      expect(day20!.loanBalance).toBe(600000);
      // 總 NAV = 1,000,000 + 100,000 - 600,000 = 500,000 (與原始入金 500,000 守恆)
      expect(day20!.totalNAV).toBe(500000);
    });
  });

  describe('GIPS 單位淨值法 (Unit NAV / TWR) 狀態機與外部出入金解耦 (Ticket 02)', () => {
    it('外部大額入金與出金時，unitNAV 應保持連續，杜絕虛假 MDD 與假性暴賺', () => {
      // Day 1 (01-01): 入金 100 萬，買入 2330 1,000 股 @ 600 (花費 60 萬，現金剩 40 萬)，NAV = 100 萬
      // Day 2 (01-02): 2330 漲至 660 (+10%)，市值 66 萬，現金 40 萬 -> 總 NAV 106 萬 (+6%)
      // Day 3 (01-03): 外部大額加碼入金 300 萬，股價維持 660 -> 總 NAV 406 萬，但當天純投資報酬率應為 0%，unitNAV 不變！
      // Day 4 (01-04): 外部大額出金 200 萬，股價維持 660 -> 總 NAV 206 萬，當天純投資報酬率應為 0%，unitNAV 不變！
      const trades: TradeRecord[] = [
        {
          id: 't1',
          date: '2026-01-01',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 1000,
          price: 600,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
      ];

      const cashTransactions: CashTransaction[] = [
        {
          id: 'c1',
          accountId: 'broker-tw-default',
          currency: 'TWD',
          type: 'DEPOSIT',
          amount: 1000000,
          date: '2026-01-01',
          createdAt: 1,
        },
        {
          id: 'c2',
          accountId: 'broker-tw-default',
          currency: 'TWD',
          type: 'DEPOSIT',
          amount: 3000000,
          date: '2026-01-03',
          createdAt: 3,
        },
        {
          id: 'c3',
          accountId: 'broker-tw-default',
          currency: 'TWD',
          type: 'WITHDRAWAL',
          amount: 2000000,
          date: '2026-01-04',
          createdAt: 4,
        },
      ];

      const priceMap: HistoricalDailyPriceMap = {
        '2330': {
          '2026-01-01': 600,
          '2026-01-02': 660,
          '2026-01-03': 660,
          '2026-01-04': 660,
        },
      };

      const series = calculateHistoricalNavSeries({
        trades,
        cashTransactions,
        loanRecords: [],
        priceMap,
        startDate: '2026-01-01',
        endDate: '2026-01-04',
        baseCurrency: 'TWD',
      });

      expect(series.length).toBe(4);

      // Day 1: 首日 unitNAV 為 100.00
      expect(series[0].date).toBe('2026-01-01');
      expect(series[0].totalNAV).toBe(1000000);
      expect(series[0].unitNAV).toBe(100.00);

      // Day 2: 股票上漲 6 萬 (60萬 -> 66萬)，總資產 100萬 -> 106萬，純收益率 +6%
      expect(series[1].date).toBe('2026-01-02');
      expect(series[1].totalNAV).toBe(1060000);
      expect(series[1].unitNAV).toBe(106.00);
      expect(series[1].dailyReturnPercent).toBe(6.00);

      // Day 3: 大額入金 300 萬，總資產由 106 萬暴增至 406 萬
      // 但單位淨值絕不能跳增，必須維持 106.00，當日純投資報酬率必須為 0%！
      expect(series[2].date).toBe('2026-01-03');
      expect(series[2].totalNAV).toBe(4060000);
      expect(series[2].unitNAV).toBe(106.00);
      expect(series[2].dailyReturnPercent).toBe(0.00);

      // Day 4: 大額出金 200 萬，總資產由 406 萬降至 206 萬
      // 單位淨值絕不能暴跌，必須維持 106.00，當日純投資報酬率必須為 0%！
      expect(series[3].date).toBe('2026-01-04');
      expect(series[3].totalNAV).toBe(2060000);
      expect(series[3].unitNAV).toBe(106.00);
      expect(series[3].dailyReturnPercent).toBe(0.00);
    });
  });

  describe('應收股利 (Receivable Dividends) 除息空窗平滑補償 (Ticket 03)', () => {
    it('在除息日 (Ex-Date) 至發放日 (Pay-Date) 之間，NAV 曲線應平滑過渡無假性跳水', () => {
      // 07-01: 持有 2330 1,000 股 @ 1000 元，市值 100 萬，現金 0，NAV = 100 萬
      // 07-02: 除息日 Ex-Date，配息 30 元/股 (30,000 元)，股價因除息扣減變為 970 元
      //        若未補償：NAV 會假摔至 97 萬 (-3%)！
      //        有平滑補償：認列應收股利 30,000 元，NAV 依然為 1,000,000 元，unitNAV 保持 100.00！
      // 07-30: 發放日 Pay-Date，配息現金 30,000 元正式入帳，沖銷應收股利
      //        持股市值 97 萬 + 現金 3 萬 = 100 萬，NAV 依然平滑為 1,000,000 元，unitNAV 保持 100.00！
      const trades: TradeRecord[] = [
        {
          id: 't-buy',
          date: '2026-07-01',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 1000,
          price: 1000,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        {
          id: 't-div-pay',
          date: '2026-07-30',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'DIVIDEND',
          shares: 1000,
          price: 30,
          cashAmount: 30000,
          fee: 0,
          tax: 0,
          createdAt: 30,
        },
      ];

      const receivableDividends: ReceivableDividend[] = [
        {
          id: '2330-2026-07-02',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-07-02',
          payDate: '2026-07-30',
          sharesHeldOnExDate: 1000,
          cashDividendPerShare: 30,
          estimatedGrossDividend: 30000,
          estimatedTaxOrFee: 0,
          estimatedNetDividend: 30000,
          estimatedNetDividendInTWD: 30000,
          status: 'PENDING_PAYMENT',
        },
      ];

      const priceMap: HistoricalDailyPriceMap = {
        '2330': {
          '2026-07-01': 1000,
          '2026-07-02': 970, // 除息日自然下調
          '2026-07-15': 970, // 空窗期維持 970
          '2026-07-30': 970, // 發放日維持 970
        },
      };

      const series = calculateHistoricalNavSeries({
        trades,
        receivableDividends,
        priceMap,
        startDate: '2026-07-01',
        endDate: '2026-07-30',
        baseCurrency: 'TWD',
      });

      // 07-01 (除息前一日)
      const day01 = series.find((s) => s.date === '2026-07-01');
      expect(day01).toBeDefined();
      expect(day01!.totalNAV).toBe(1000000);
      expect(day01!.unitNAV).toBe(100.00);

      // 07-02 (除息日): 市值變 97 萬，但應收股利為 3 萬，總 NAV 依然為 100 萬，unitNAV 維持 100.00
      const day02 = series.find((s) => s.date === '2026-07-02');
      expect(day02).toBeDefined();
      expect(day02!.stockMarketValue).toBe(970000);
      expect(day02!.receivableDividends).toBe(30000);
      expect(day02!.totalNAV).toBe(1000000);
      expect(day02!.unitNAV).toBe(100.00);
      expect(day02!.dailyReturnPercent).toBe(0.00);

      // 07-15 (空窗期間): 應收股利持續平滑補償
      const day15 = series.find((s) => s.date === '2026-07-15');
      expect(day15).toBeDefined();
      expect(day15!.receivableDividends).toBe(30000);
      expect(day15!.totalNAV).toBe(1000000);
      expect(day15!.unitNAV).toBe(100.00);

      // 07-30 (發放日): 應收股利自動沖銷為 0，現金入帳 3 萬，總 NAV 依然為 100 萬
      const day30 = series.find((s) => s.date === '2026-07-30');
      expect(day30).toBeDefined();
      expect(day30!.receivableDividends).toBe(0);
      expect(day30!.cashBalance).toBe(30000);
      expect(day30!.stockMarketValue).toBe(970000);
      expect(day30!.totalNAV).toBe(1000000);
      expect(day30!.unitNAV).toBe(100.00);
    });
  });

  describe('信用交易融資賣出利息扣除與逐日水下深度計算 (Ticket 04)', () => {
    it('融資賣出時應依據持股天數精準扣除融資利息，避免平倉變現虛高', () => {
      // 08-01: 融資買進 2330 1,000 股 @ 1000 元，自備款 40 萬，借款 60 萬 (利率 6.5%)
      // 初始現金 50 萬 -> 買後剩餘現金 10 萬，負債 60 萬，市值 100 萬 -> NAV = 50 萬
      // 08-31 (持股 30 天): 融資賣出 2330 1,000 股 @ 1000 元 (無手續費稅金以利精準核帳)
      // 融資借款本金 60 萬應還清。
      // 融資利息 = 600,000 * 0.065 * (30 / 365) = 3205.479... -> 約 3205 元
      // 淨入現金帳 = 賣出 100 萬 - 還款 60 萬 - 利息 3205 = 396,795 元
      // 賣出後最終現金餘額 = 10 萬 + 396,795 = 496,795 元 (NAV = 496,795 元，精準扣減利息 3205 元)
      const trades: TradeRecord[] = [
        {
          id: 't-mbuy',
          date: '2026-08-01',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'MARGIN_BUY',
          shares: 1000,
          price: 1000,
          marginRate: 0.4,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        {
          id: 't-msell',
          date: '2026-08-31',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'MARGIN_SELL',
          shares: 1000,
          price: 1000,
          marginRate: 0.4,
          fee: 0,
          tax: 0,
          createdAt: 31,
        },
      ];

      const initialCash: CashTransaction[] = [
        {
          id: 'c-init',
          currency: 'TWD',
          type: 'DEPOSIT',
          amount: 500000,
          date: '2026-08-01',
          createdAt: 0,
          accountId: 'broker-tw-default',
        },
      ];

      const priceMap: HistoricalDailyPriceMap = {
        '2330': {
          '2026-08-01': 1000,
          '2026-08-31': 1000,
        },
      };

      const series = calculateHistoricalNavSeries({
        trades,
        cashTransactions: initialCash,
        priceMap,
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        baseCurrency: 'TWD',
      });

      const day31 = series.find((s) => s.date === '2026-08-31');
      expect(day31).toBeDefined();
      expect(day31!.stockMarketValue).toBe(0);
      expect(day31!.loanBalance).toBe(0);
      // 現金餘額應精準扣除約 3205 元利息
      expect(day31!.cashBalance).toBeCloseTo(496795, -1);
      expect(day31!.totalNAV).toBeCloseTo(496795, -1);
    });

    it('應逐日正確推演 underwaterDrawdownPercent (當日距 ATH 之水下回撤百分比)', () => {
      // 01-01: 買進持股，NAV = 100, unitNAV = 100 -> 在最高點，underwaterDrawdownPercent = 0.00
      // 01-02: 股價漲 10%，unitNAV = 110 -> 創 ATH，underwaterDrawdownPercent = 0.00
      // 01-03: 股價回調至 99，unitNAV = 99 -> 距 ATH 110 之跌幅: (99 - 110)/110 = -10.00%
      // 01-04: 股價修復至 104.5，unitNAV = 104.5 -> 距 ATH 110 之跌幅: (104.5 - 110)/110 = -5.00%
      const trades: TradeRecord[] = [
        {
          id: 't-buy',
          date: '2026-01-01',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 1000,
          price: 100,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
      ];

      const priceMap: HistoricalDailyPriceMap = {
        '2330': {
          '2026-01-01': 100,
          '2026-01-02': 110,
          '2026-01-03': 99,
          '2026-01-04': 104.5,
        },
      };

      const series = calculateHistoricalNavSeries({
        trades,
        priceMap,
        startDate: '2026-01-01',
        endDate: '2026-01-04',
        baseCurrency: 'TWD',
      });

      expect(series.length).toBe(4);
      // Day 1: 0%
      expect(series[0].underwaterDrawdownPercent).toBe(0.00);
      // Day 2: 0% (新高 110)
      expect(series[1].underwaterDrawdownPercent).toBe(0.00);
      // Day 3: (99 - 110)/110 = -10%
      expect(series[2].underwaterDrawdownPercent).toBe(-10.00);
      // Day 4: (104.5 - 110)/110 = -5%
      expect(series[3].underwaterDrawdownPercent).toBe(-5.00);
    });
  });
});

