import { describe, it, expect } from 'vitest';
import { calculateHoldingsAndSummary, calculateTaiwanFee, calculateTaiwanTax, getHoldingsAsOfDate, applyTradeToShares } from './calculator';
import { TradeRecord } from '../types/stock';

describe('applyTradeToShares 純函式股數異動計算', () => {
  it('買進與增資應累加股數', () => {
    expect(applyTradeToShares(1000, { type: 'BUY', shares: 500 })).toBe(1500);
    expect(applyTradeToShares(1000, { type: 'CAPITAL_INCREASE', shares: 200 })).toBe(1200);
  });

  it('賣出與減資應扣減股數且不小於 0', () => {
    expect(applyTradeToShares(1000, { type: 'SELL', shares: 400 })).toBe(600);
    expect(applyTradeToShares(1000, { type: 'SELL', shares: 1500 })).toBe(0);
    expect(applyTradeToShares(1000, { type: 'CAPITAL_REDUCTION', shares: 200 })).toBe(800);
    expect(applyTradeToShares(1000, { type: 'CAPITAL_REDUCTION', ratio: 0.2 })).toBe(800);
  });

  it('除權配股與分割應正確乘除調整股數', () => {
    expect(applyTradeToShares(1000, { type: 'STOCK_DIVIDEND', shares: 50 })).toBe(1050);
    expect(applyTradeToShares(1000, { type: 'STOCK_DIVIDEND', ratio: 0.05 })).toBe(1050);
    expect(applyTradeToShares(100, { type: 'STOCK_SPLIT', ratio: 10 })).toBe(1000);
  });

  it('股息事件不影響持有股數', () => {
    expect(applyTradeToShares(1000, { type: 'DIVIDEND', shares: 1000 })).toBe(1000);
  });
});

describe('股票會計與損益計算引擎 (Stock Accounting Engine)', () => {
  it('應正確計算單筆與分批買進的移動加權平均成本 (Moving Weighted Average)', () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2026-01-10',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 600,
        fee: 855, // 600000 * 0.001425
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2026-02-10',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 700,
        fee: 997, // 700000 * 0.001425
        tax: 0,
        createdAt: 2,
      },
    ];

    const currentPrices = { '2330': 750 };
    const { holdings } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const tsMC = holdings.find((h) => h.symbol === '2330');
    expect(tsMC).toBeDefined();
    expect(tsMC?.shares).toBe(2000);
    // 總成本 = (600000 + 855) + (700000 + 997) = 1,301,852
    expect(tsMC?.totalCostBasis).toBe(1301852);
    // 平均成本 = 1301852 / 2000 = 650.926
    expect(tsMC?.avgCost).toBeCloseTo(650.926, 2);
    // 市值 = 2000 * 750 = 1,500,000
    expect(tsMC?.marketValue).toBe(1500000);
    // 未實現損益 = 1500000 - 1301852 = 198,148
    expect(tsMC?.unrealizedPnL).toBe(198148);
  });

  it('應正確結算部分賣出的已實現損益與剩餘持倉成本 (Partial Sell Realized PnL)', () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2026-01-10',
        symbol: 'AAPL',
        name: 'Apple',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 10,
        price: 150,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2026-02-15',
        symbol: 'AAPL',
        name: 'Apple',
        market: 'US',
        currency: 'USD',
        type: 'SELL',
        shares: 4,
        price: 200,
        fee: 1,
        tax: 0,
        createdAt: 2,
      },
    ];

    const currentPrices = { AAPL: 210 };
    const { holdings, summary } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const aapl = holdings.find((h) => h.symbol === 'AAPL');
    expect(aapl).toBeDefined();
    expect(aapl?.shares).toBe(6);
    // 賣出 4 股，買入成本 = 4 * 150 = 600
    // 賣出收入淨額 = 4 * 200 - 1 = 799
    // 已實現損益 = 799 - 600 = 199
    expect(aapl?.realizedPnL).toBe(199);
    // 剩餘 6 股總成本 = 6 * 150 = 900
    expect(aapl?.totalCostBasis).toBe(900);
    expect(aapl?.avgCost).toBe(150);
    expect(summary.usd.realizedPnL).toBe(199);
  });

  it('應正確記錄股息並不影響持股成本與股數 (Dividend Handling)', () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2026-01-01',
        symbol: '0050',
        name: '元大台灣50',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 150,
        fee: 213,
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2026-03-01',
        symbol: '0050',
        name: '元大台灣50',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        shares: 0,
        price: 0,
        fee: 0,
        tax: 0,
        note: '2025Q4 配息',
        createdAt: 2,
      },
    ];

    // 為配息設定金額（以 fee 存負數或 price*shares，此處支援以 price 作為單股配息或直接在 tax/fee 結算）
    // 我們在引擎中設計：若 DIVIDEND，金額 = (price > 0 && shares > 0 ? price * shares : fee > 0 ? fee : 3000)
    trades[1].price = 3;
    trades[1].shares = 1000; // 領 3000 元股息

    const currentPrices = { '0050': 160 };
    const { holdings, summary } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const etf = holdings.find((h) => h.symbol === '0050');
    expect(etf?.shares).toBe(1000);
    expect(etf?.totalDividends).toBe(3000);
    expect(summary.twd.totalDividends).toBe(3000);
  });

  it('應正確匯總雙幣別資產並支援 USD/TWD 匯率換算 (Multi-Currency Summary)', () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2026-01-01',
        symbol: '2330',
        name: '台積電',
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
        id: '2',
        date: '2026-01-02',
        symbol: 'NVDA',
        name: 'NVIDIA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 10,
        price: 100,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const currentPrices = { '2330': 700, NVDA: 150 };
    const usdToTwd = 32.5;
    const { summary } = calculateHoldingsAndSummary(trades, currentPrices, usdToTwd);

    // TWD 部分：成本 600,000，市值 700,000，未實現 100,000
    expect(summary.twd.totalCost).toBe(600000);
    expect(summary.twd.marketValue).toBe(700000);

    // USD 部分：成本 1,000，市值 1,500，未實現 500
    expect(summary.usd.totalCost).toBe(1000);
    expect(summary.usd.marketValue).toBe(1500);

    // 匯總 TWD：600000 + 1000 * 32.5 = 632,500
    expect(summary.combinedTWD.totalCost).toBe(632500);
    // 市值：700000 + 1500 * 32.5 = 748,750
    expect(summary.combinedTWD.marketValue).toBe(748750);
    // 未實現損益：100000 + 500 * 32.5 = 116,250
    expect(summary.combinedTWD.unrealizedPnL).toBe(116250);
  });

  it('應正確處理美股高精度小數點持股 (Fractional Shares) 與微量規費', () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2026-01-01',
        symbol: 'TSLA',
        name: 'Tesla',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 0.1234,
        price: 250,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2026-01-15',
        symbol: 'TSLA',
        name: 'Tesla',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 0.5,
        price: 260,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
      {
        id: '3',
        date: '2026-02-01',
        symbol: 'TSLA',
        name: 'Tesla',
        market: 'US',
        currency: 'USD',
        type: 'SELL',
        shares: 0.2,
        price: 300,
        fee: 0.05,
        tax: 0,
        createdAt: 3,
      },
    ];

    const currentPrices = { TSLA: 320 };
    const { holdings, summary } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const tsla = holdings.find((h) => h.symbol === 'TSLA');
    expect(tsla).toBeDefined();
    // 剩餘股數 = 0.1234 + 0.5 - 0.2 = 0.4234
    expect(tsla?.shares).toBeCloseTo(0.4234, 4);

    // 總買入股數 = 0.6234，總成本 = 0.1234 * 250 + 0.5 * 260 = 30.85 + 130 = 160.85
    // 加權平均單價 = 160.85 / 0.6234 = 258.0173
    // 賣出 0.2 股成本 = 0.2 * 258.0173 = 51.60346
    // 賣出收入 = 0.2 * 300 - 0.05 = 59.95
    // 實現損益 = 59.95 - 51.60346 = 8.3465
    expect(tsla?.realizedPnL).toBeCloseTo(8.35, 1);
    expect(summary.usd.realizedPnL).toBeCloseTo(8.35, 1);
  });

  it('全數賣出 (平倉) 時持股數應為 0 且鎖定已實現損益', () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2026-01-01',
        symbol: '2454',
        name: '聯發科',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 500,
        price: 1000,
        fee: 712,
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2026-02-01',
        symbol: '2454',
        name: '聯發科',
        market: 'TW',
        currency: 'TWD',
        type: 'SELL',
        shares: 500,
        price: 1200,
        fee: 855,
        tax: 1800, // 證交稅 0.3%
        createdAt: 2,
      },
    ];

    const currentPrices = { '2454': 1300 };
    const { holdings, summary } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const mtk = holdings.find((h) => h.symbol === '2454');
    expect(mtk?.shares).toBe(0);
    expect(mtk?.marketValue).toBe(0);
    expect(mtk?.unrealizedPnL).toBe(0);
    // 買入總成本 = 500 * 1000 + 712 = 500,712
    // 賣出淨收入 = 500 * 1200 - 855 - 1800 = 597,345
    // 實現損益 = 597,345 - 500,712 = 96,633
    expect(mtk?.realizedPnL).toBe(96633);
    expect(summary.twd.realizedPnL).toBe(96633);
  });

  it('應精確計算持股成本殖利率 (Yield on Cost, YoC)', () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2025-01-01',
        symbol: '00878',
        name: '國泰永續高股息',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 10000,
        price: 20,
        fee: 285,
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2025-05-01',
        symbol: '00878',
        name: '國泰永續高股息',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        shares: 10000,
        price: 0.5, // 每股領 0.5 元 = 5000 元
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
      {
        id: '3',
        date: '2025-08-01',
        symbol: '00878',
        name: '國泰永續高股息',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        shares: 10000,
        price: 0.5, // 再領 0.5 元 = 5000 元，累計 10,000 元
        fee: 0,
        tax: 0,
        createdAt: 3,
      },
    ];

    const currentPrices = { '00878': 22 };
    const { holdings } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const etf = holdings.find((h) => h.symbol === '00878');
    expect(etf).toBeDefined();
    expect(etf?.totalDividends).toBe(10000);
    // 總買入成本 = 200,285
    // YoC = (10000 / 200285) * 100 = 4.99288%
    expect(etf?.yieldOnCostPercent).toBeCloseTo(4.99, 1);
  });

  it('應正確試算台股券商電子下單折數與最低手續費 (calculateTaiwanFee)', () => {
    // 買進 1000 股 @ 100 元 = 100,000 元
    // 原始手續費 = 100000 * 0.001425 = 142.5
    // 不打折 (1.0) = floor(142.5) = 142
    expect(calculateTaiwanFee(100, 1000, 1.0, 20)).toBe(142);

    // 6 折 = floor(142.5 * 0.6) = floor(85.5) = 85
    expect(calculateTaiwanFee(100, 1000, 0.6, 20)).toBe(85);

    // 2.8 折 = floor(142.5 * 0.28) = floor(39.9) = 39
    expect(calculateTaiwanFee(100, 1000, 0.28, 20)).toBe(39);

    // 零股買進 10 股 @ 100 元 = 1000 元
    // 原始手續費 = 1.425 -> 2.8折 = 0.399
    // 低於最低 20 元門檻時應回傳 20 元
    expect(calculateTaiwanFee(100, 10, 0.28, 20)).toBe(20);

    // 若設定無低消門檻 (minFee = 0)
    expect(calculateTaiwanFee(100, 10, 0.28, 0)).toBe(1);
  });

  it('應正確試算台股股票 (0.3%) 與 ETF (0.1%) 證交稅 (calculateTaiwanTax)', () => {
    // 股票賣出 1000 股 @ 100 元 = 100,000 元，稅率 0.3% = 300
    expect(calculateTaiwanTax(100, 1000, false)).toBe(300);

    // ETF 賣出 1000 股 @ 100 元 = 100,000 元，稅率 0.1% = 100
    expect(calculateTaiwanTax(100, 1000, true)).toBe(100);
  });

  /* -------------------------------------------------------------------------- */
  /* V1.2 公司行動 (Corporate Actions) 與歷史基準日持股回溯測試                */
  /* -------------------------------------------------------------------------- */

  it('應正確回溯任一歷史交易日期的持股部位 (getHoldingsAsOfDate)', () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2025-01-10',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 500,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2025-03-15',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 600,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
      {
        id: '3',
        date: '2025-06-20',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'SELL',
        shares: 500,
        price: 700,
        fee: 0,
        tax: 0,
        createdAt: 3,
      },
    ];

    // 買進前 (2025-01-01)：持股 0
    expect(getHoldingsAsOfDate(trades, '2025-01-01', '2330')).toBe(0);

    // 第一次買進當天 (2025-01-10)：持股 1000
    expect(getHoldingsAsOfDate(trades, '2025-01-10', '2330')).toBe(1000);

    // 第二次買進前一天 (2025-03-14)：持股 1000
    expect(getHoldingsAsOfDate(trades, '2025-03-14', '2330')).toBe(1000);

    // 第二次買進當天 (2025-03-15)：持股 2000
    expect(getHoldingsAsOfDate(trades, '2025-03-15', '2330')).toBe(2000);

    // 賣出後 (2025-06-20 及之後)：持股 1500
    expect(getHoldingsAsOfDate(trades, '2025-06-20', '2330')).toBe(1500);
    expect(getHoldingsAsOfDate(trades, '2026-01-01', '2330')).toBe(1500);
  });

  it('應正確處理股票股利 (STOCK_DIVIDEND 除權配股)：增加股數、總成本不變、稀釋每股成本', () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2025-01-10',
        symbol: '2884',
        name: '玉山金',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 25,
        fee: 35,
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2025-08-20',
        symbol: '2884',
        name: '玉山金',
        market: 'TW',
        currency: 'TWD',
        type: 'STOCK_DIVIDEND',
        shares: 50, // 每千股配 50 股
        price: 0,
        fee: 0,
        tax: 0,
        ratio: 0.05,
        note: '除權配股 50 股',
        createdAt: 2,
      },
    ];

    const currentPrices = { '2884': 28 };
    const { holdings } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const stock = holdings.find((h) => h.symbol === '2884');
    expect(stock).toBeDefined();
    // 總持股變為 1000 + 50 = 1050 股
    expect(stock?.shares).toBe(1050);
    // 總投入成本依然為 25000 + 35 = 25035
    expect(stock?.totalCostBasis).toBe(25035);
    // 每股平均成本稀釋：25035 / 1050 = 23.8428
    expect(stock?.avgCost).toBeCloseTo(23.84, 2);
    // 累計配股總數
    expect(stock?.totalStockDividendsShares).toBe(50);
    // 市值 = 1050 * 28 = 29,400
    expect(stock?.marketValue).toBe(29400);
    // 未實現損益 = 29400 - 25035 = 4365
    expect(stock?.unrealizedPnL).toBe(4365);
  });

  it('應正確處理股票分割 (STOCK_SPLIT)：乘數縮放股數、總成本不變、平均成本反向調整', () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2024-01-10',
        symbol: 'NVDA',
        name: 'NVIDIA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 10,
        price: 1200,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2024-06-10',
        symbol: 'NVDA',
        name: 'NVIDIA',
        market: 'US',
        currency: 'USD',
        type: 'STOCK_SPLIT',
        shares: 0,
        price: 0,
        fee: 0,
        tax: 0,
        ratio: 10, // 1 拆 10
        note: '1:10 股票分割',
        createdAt: 2,
      },
    ];

    const currentPrices = { NVDA: 130 };
    const { holdings } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const nvda = holdings.find((h) => h.symbol === 'NVDA');
    expect(nvda).toBeDefined();
    // 股數由 10 股變成 100 股
    expect(nvda?.shares).toBe(100);
    // 總成本維持 12,000 USD
    expect(nvda?.totalCostBasis).toBe(12000);
    // 平均每股成本由 1200 降為 120 USD
    expect(nvda?.avgCost).toBe(120);
    // 市值 = 100 * 130 = 13,000
    expect(nvda?.marketValue).toBe(13000);
    expect(nvda?.unrealizedPnL).toBe(1000);
  });

  it('應正確處理現金減資 (CAPITAL_REDUCTION)：縮減股數、扣減本金成本基準、累計資本返還', () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2024-01-10',
        symbol: '2303',
        name: '聯電',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 50,
        fee: 71,
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2024-09-15',
        symbol: '2303',
        name: '聯電',
        market: 'TW',
        currency: 'TWD',
        type: 'CAPITAL_REDUCTION',
        shares: 200, // 減資 20% (扣減 200 股)
        price: 2, // 每股退還 2 元
        cashAmount: 2000, // 總計退還 2,000 元現金
        ratio: 0.2,
        fee: 0,
        tax: 0,
        note: '現金減資 20% 退還 2 元',
        createdAt: 2,
      },
    ];

    const currentPrices = { '2303': 55 };
    const { holdings, summary } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const umc = holdings.find((h) => h.symbol === '2303');
    expect(umc).toBeDefined();
    // 剩餘股數 = 1000 - 200 = 800 股
    expect(umc?.shares).toBe(800);
    // 原始總成本 50071 - 退款 2000 = 48071
    expect(umc?.totalCostBasis).toBe(48071);
    expect(umc?.adjustedCostBasis).toBe(48071);
    // 累計退款
    expect(umc?.totalCapitalReturned).toBe(2000);
    expect(summary.twd.totalCapitalReturned).toBe(2000);
    // 平均成本 = 48071 / 800 = 60.08875
    expect(umc?.avgCost).toBeCloseTo(60.09, 2);
    // 市值 = 800 * 55 = 44000
    expect(umc?.marketValue).toBe(44000);
  });

  it('應正確處理現金增資 (CAPITAL_INCREASE)：增加股數、累加認購成本與手續費', () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2025-01-10',
        symbol: '2886',
        name: '兆豐金',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 40,
        fee: 57,
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2025-04-10',
        symbol: '2886',
        name: '兆豐金',
        market: 'TW',
        currency: 'TWD',
        type: 'CAPITAL_INCREASE',
        shares: 200, // 認購 200 股
        price: 33, // 認購價 33 元
        fee: 15, // 匯款/手續費
        tax: 0,
        note: '現金增資認股',
        createdAt: 2,
      },
    ];

    const currentPrices = { '2886': 42 };
    const { holdings } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const mega = holdings.find((h) => h.symbol === '2886');
    expect(mega).toBeDefined();
    // 總持股 = 1000 + 200 = 1200 股
    expect(mega?.shares).toBe(1200);
    // 總投入成本 = (40000 + 57) + (200 * 33 + 15) = 40057 + 6615 = 46672
    expect(mega?.totalCostBasis).toBe(46672);
    // 平均成本 = 46672 / 1200 = 38.8933
    expect(mega?.avgCost).toBeCloseTo(38.89, 2);
  });

  it('應精確計算混合交錯公司行動（買進 ➔ 配息 ➔ 減資 ➔ 配股 ➔ 賣出）之時序生命週期', () => {
    const trades: TradeRecord[] = [
      // 1. 買進 1000 股 @ 100
      {
        id: '1',
        date: '2024-01-01',
        symbol: 'TEST',
        name: '測試股',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 100,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      // 2. 配息每股 5 元 (領 5000)
      {
        id: '2',
        date: '2024-04-01',
        symbol: 'TEST',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        shares: 1000,
        price: 5,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
      // 3. 現金減資 20% 退 2 元 (減 200 股，退 2000 元，剩 800 股，本金變 98,000)
      {
        id: '3',
        date: '2024-07-01',
        symbol: 'TEST',
        market: 'TW',
        currency: 'TWD',
        type: 'CAPITAL_REDUCTION',
        shares: 200,
        price: 2,
        cashAmount: 2000,
        fee: 0,
        tax: 0,
        createdAt: 3,
      },
      // 4. 除權配股 10% (800 股配 80 股，總股數變 880 股，總本金維持 98,000)
      {
        id: '4',
        date: '2024-09-01',
        symbol: 'TEST',
        market: 'TW',
        currency: 'TWD',
        type: 'STOCK_DIVIDEND',
        shares: 80,
        price: 0,
        fee: 0,
        tax: 0,
        createdAt: 4,
      },
      // 5. 賣出 440 股 @ 150 (賣出一半，結算已實現損益)
      {
        id: '5',
        date: '2024-11-01',
        symbol: 'TEST',
        market: 'TW',
        currency: 'TWD',
        type: 'SELL',
        shares: 440,
        price: 150,
        fee: 0,
        tax: 0,
        createdAt: 5,
      },
    ];

    const currentPrices = { TEST: 160 };
    const { holdings, summary } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const testStock = holdings.find((h) => h.symbol === 'TEST');
    expect(testStock).toBeDefined();

    // 剩餘股數 = 880 - 440 = 440 股
    expect(testStock?.shares).toBe(440);
    // 賣出一半，剩餘本金 = 98000 / 2 = 49,000
    expect(testStock?.totalCostBasis).toBe(49000);
    // 平均成本 = 49000 / 440 = 111.3636
    expect(testStock?.avgCost).toBeCloseTo(111.36, 2);
    // 賣出收入 440 * 150 = 66,000，成本 49,000 -> 實現損益 = 17,000
    expect(testStock?.realizedPnL).toBe(17000);
    // 累計股息 5000
    expect(testStock?.totalDividends).toBe(5000);
    // 累計減資退還 2000
    expect(testStock?.totalCapitalReturned).toBe(2000);
    // 累計配股 80 股
    expect(testStock?.totalStockDividendsShares).toBe(80);

    // Summary 驗證
    expect(summary.twd.realizedPnL).toBe(17000);
    expect(summary.twd.totalDividends).toBe(5000);
    expect(summary.twd.totalCapitalReturned).toBe(2000);
  });
});

