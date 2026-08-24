import { describe, it, expect } from 'vitest';
import {
  calculateHoldingsAndSummary,
  calculateTaiwanFee,
  calculateTaiwanTax,
  calculateEstimatedSellTax,
  getHoldingsAsOfDate,
  applyTradeToShares,
  calculateFrictionCostSummary,
  calculateAccountSellFee,
  repairLedgerTaxAndFee,
} from './calculator';
import { TradeRecord, BrokerAccount } from '../types/stock';

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

  it('應正確試算台股股票 (0.3%)、當沖 (0.15%)、股票 ETF (0.1%) 與債券 ETF (0%) 證交稅 (calculateTaiwanTax)', () => {
    // 股票賣出 1000 股 @ 100 元 = 100,000 元，現股稅率 0.3% = 300
    expect(calculateTaiwanTax(100, 1000, false, false, false)).toBe(300);

    // 現股當沖賣出 1000 股 @ 100 元 = 100,000 元，當沖稅率 0.15% = 150
    expect(calculateTaiwanTax(100, 1000, false, true, false)).toBe(150);

    // 股票 ETF 賣出 1000 股 @ 100 元 = 100,000 元，ETF 稅率 0.1% = 100
    expect(calculateTaiwanTax(100, 1000, true, false, false)).toBe(100);

    // 債券 ETF 賣出 1000 股 @ 100 元 = 100,000 元，債券 ETF 稅率 0% 免稅 = 0
    expect(calculateTaiwanTax(100, 1000, false, false, true)).toBe(0);
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

  it('真實場景：9927 泰銘 2025 現金減資應精準縮減股數與扣減本金', () => {
    const trades: TradeRecord[] = [
      // 1. 2025-09-12 買進 10,000 股 @ 55.8，手續費 795
      {
        id: '9927-buy',
        date: '2025-09-12',
        symbol: '9927',
        name: '泰銘',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 10000,
        price: 55.8,
        fee: 795,
        tax: 0,
        createdAt: 1,
      },
      // 2. 2025-09-15 現金減資 28.28%，每股退款 2.828 元 (退款 28,280 元，縮減 2,828 股)
      {
        id: '9927-reduction',
        date: '2025-09-15',
        symbol: '9927',
        name: '泰銘',
        market: 'TW',
        currency: 'TWD',
        type: 'CAPITAL_REDUCTION',
        shares: 2828,
        price: 2.828,
        ratio: 0.2828,
        cashAmount: 28280,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const currentPrices = { '9927': 69.4 };
    const { holdings, summary } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const tm = holdings.find((h) => h.symbol === '9927');
    expect(tm).toBeDefined();
    // 剩餘持有股數 = 10,000 - 2,828 = 7,172 股
    expect(tm?.shares).toBe(7172);
    expect(tm?.originalBuyShares).toBe(10000);
    // 總投入本金 = 558,795 - 28,280 = 530,515
    expect(tm?.totalCostBasis).toBe(530515);
    // 平均成本 = 530515 / 7172 = 73.969
    expect(tm?.avgCost).toBeCloseTo(73.97, 2);
    // 累計減資退款
    expect(tm?.totalCapitalReturned).toBe(28280);
    expect(summary.twd.totalCapitalReturned).toBe(28280);
  });

  it('特殊公司行動 1：換股合併 (STOCK_MERGER) 原標的歸零且成本平移至目標標的', () => {
    const trades: TradeRecord[] = [
      // 1. 買進 A 公司 1,000 股 @ 50 (成本 50,000)
      {
        id: 'merger-buy-a',
        date: '2024-01-10',
        symbol: 'COMP_A',
        name: 'A公司',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 50,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      // 2. 換股合併：A 公司 1:1.5 換為 B 公司股票
      {
        id: 'merger-event',
        date: '2024-06-30',
        symbol: 'COMP_A',
        name: 'A公司',
        targetSymbol: 'COMP_B',
        targetName: 'B公司',
        market: 'TW',
        currency: 'TWD',
        type: 'STOCK_MERGER',
        shares: 1500, // 換得 1500 股 B
        ratio: 1.5,
        price: 0,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const currentPrices = { COMP_A: 0, COMP_B: 45 };
    const { holdings } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const stockA = holdings.find((h) => h.symbol === 'COMP_A');
    expect(stockA?.shares).toBe(0);
    expect(stockA?.totalCostBasis).toBe(0);

    const stockB = holdings.find((h) => h.symbol === 'COMP_B');
    expect(stockB).toBeDefined();
    expect(stockB?.shares).toBe(1500);
    expect(stockB?.totalCostBasis).toBe(50000); // 原始本金平移至 B
    expect(stockB?.avgCost).toBeCloseTo(33.33, 2); // 50000 / 1500
  });

  it('特殊公司行動 2：特別股贖回 (PREFERRED_REDEMPTION) 應結清持股並結算損益', () => {
    const trades: TradeRecord[] = [
      // 1. 買進特別股 1,000 股 @ 48 (成本 48,000)
      {
        id: 'pref-buy',
        date: '2023-01-10',
        symbol: 'PREF_A',
        name: '甲種特別股',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 48,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      // 2. 公司以每股 50 元收回贖回 (退款 50,000)
      {
        id: 'pref-redeem',
        date: '2025-01-10',
        symbol: 'PREF_A',
        name: '甲種特別股',
        market: 'TW',
        currency: 'TWD',
        type: 'PREFERRED_REDEMPTION',
        shares: 1000,
        price: 50,
        cashAmount: 50000,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const { holdings } = calculateHoldingsAndSummary(trades, {}, 32.0);
    const pref = holdings.find((h) => h.symbol === 'PREF_A');
    expect(pref?.shares).toBe(0);
    expect(pref?.totalCostBasis).toBe(0);
    // 已實現獲利 = 50,000 - 48,000 = 2,000
    expect(pref?.realizedPnL).toBe(2000);
  });

  it('特殊公司行動 3：企業分拆 (SPIN_OFF) 應按比例拆分母公司成本並建立子公司持股', () => {
    const trades: TradeRecord[] = [
      // 1. 買進母公司 1,000 股 @ 100 (成本 100,000)
      {
        id: 'parent-buy',
        date: '2023-01-10',
        symbol: 'PARENT',
        name: '母公司',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 100,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      // 2. 分拆子公司 SUB：每 1 股母公司配 0.2 股子公司，分拆成本比率 20%
      {
        id: 'spinoff-event',
        date: '2024-05-15',
        symbol: 'PARENT',
        name: '母公司',
        targetSymbol: 'CHILD',
        targetName: '新分拆子公司',
        market: 'TW',
        currency: 'TWD',
        type: 'SPIN_OFF',
        shares: 200, // 獲配 200 股
        ratio: 0.2,
        allocationRatio: 0.2, // 20% 成本拆給新公司
        price: 0,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const currentPrices = { PARENT: 110, CHILD: 60 };
    const { holdings } = calculateHoldingsAndSummary(trades, currentPrices, 32.0);

    const parent = holdings.find((h) => h.symbol === 'PARENT');
    expect(parent?.shares).toBe(1000);
    expect(parent?.totalCostBasis).toBe(80000); // 100,000 * 0.8
    expect(parent?.avgCost).toBe(80);

    const child = holdings.find((h) => h.symbol === 'CHILD');
    expect(child).toBeDefined();
    expect(child?.shares).toBe(200);
    expect(child?.totalCostBasis).toBe(20000); // 100,000 * 0.2
    expect(child?.avgCost).toBe(100); // 20000 / 200
  });

  it('特殊公司行動 4：可轉債換股 (CB_CONVERSION) 與公開收購 (TENDER_OFFER)', () => {
    const cbTrades: TradeRecord[] = [
      // 1. 可轉債換股 10 張 (成本 1,000,000)，轉換價 50 -> 獲得 20,000 股
      {
        id: 'cb-convert',
        date: '2024-03-01',
        symbol: 'CONV_STOCK',
        name: '轉換普通股',
        market: 'TW',
        currency: 'TWD',
        type: 'CB_CONVERSION',
        shares: 20000,
        price: 50,
        conversionPrice: 50,
        cashAmount: 1000000,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      // 2. 公開收購以每股 60 元收購全數 20,000 股
      {
        id: 'tender-event',
        date: '2024-09-01',
        symbol: 'CONV_STOCK',
        name: '轉換普通股',
        market: 'TW',
        currency: 'TWD',
        type: 'TENDER_OFFER',
        shares: 20000,
        price: 60,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const { holdings } = calculateHoldingsAndSummary(cbTrades, {}, 32.0);
    const result = holdings.find((h) => h.symbol === 'CONV_STOCK');
    expect(result?.shares).toBe(0);
    // 獲利 = 20000 * 60 - 1,000,000 = 200,000
    expect(result?.realizedPnL).toBe(200000);
  });

  it('台股市場（TW）股數精確度規則：絕無小數點股數，分割與減資一律四捨五入取整數', () => {
    // 模擬 9927 泰銘外部 API 傳入浮點分割/減資比率 (如 0.7171949 或 0.2828051)
    const twTrades: TradeRecord[] = [
      {
        id: '1',
        date: '2025-09-12',
        symbol: '9927',
        name: '泰銘',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 10000,
        price: 55.8,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2025-09-15',
        symbol: '9927',
        name: '泰銘',
        market: 'TW',
        currency: 'TWD',
        type: 'CAPITAL_REDUCTION',
        shares: 2828.051, // 浮點數精度漂移
        price: 2.828,
        cashAmount: 28280,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const { holdings } = calculateHoldingsAndSummary(twTrades, {}, 32.0);
    const tm = holdings.find((h) => h.symbol === '9927');
    expect(tm).toBeDefined();
    // 嚴格確保為正整數 7,172 股，不帶任何小數點
    expect(tm?.shares).toBe(7172);
    expect(Number.isInteger(tm?.shares)).toBe(true);
  });

  it('應該將持倉標的依照台股優先、代碼自然升冪（Natural Sort）、美股置底的規則正確排序', () => {
    const mixedTrades: TradeRecord[] = [
      { id: '1', date: '2024-01-01', symbol: 'VT', name: 'VT', market: 'US', currency: 'USD', type: 'BUY', shares: 10, price: 100, fee: 0, tax: 0, createdAt: 1 },
      { id: '2', date: '2024-01-02', symbol: '2886', name: '兆豐金', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 35, fee: 0, tax: 0, createdAt: 2 },
      { id: '3', date: '2024-01-03', symbol: '0050', name: '元大台灣50', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 150, fee: 0, tax: 0, createdAt: 3 },
      { id: '4', date: '2024-01-04', symbol: '00403A', name: '主動統一升級50', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 15, fee: 0, tax: 0, createdAt: 4 },
      { id: '5', date: '2024-01-05', symbol: '00981A', name: '富邦特選高股息30', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 15, fee: 0, tax: 0, createdAt: 5 },
      { id: '6', date: '2024-01-06', symbol: '9927', name: '泰銘', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 50, fee: 0, tax: 0, createdAt: 6 },
      { id: '7', date: '2024-01-07', symbol: '2330', name: '台積電', market: 'TW', currency: 'TWD', type: 'BUY', shares: 100, price: 900, fee: 0, tax: 0, createdAt: 7 },
      { id: '8', date: '2024-01-08', symbol: 'AAPL', name: 'Apple', market: 'US', currency: 'USD', type: 'BUY', shares: 5, price: 200, fee: 0, tax: 0, createdAt: 8 },
      { id: '9', date: '2024-01-09', symbol: '00878', name: '國泰永續高股息', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 22, fee: 0, tax: 0, createdAt: 9 },
    ];

    const { holdings } = calculateHoldingsAndSummary(mixedTrades, {}, 32.0);
    const symbols = holdings.map((h) => h.symbol);

    expect(symbols).toEqual([
      '00403A',
      '0050',
      '00878',
      '00981A',
      '2330',
      '2886',
      '9927',
      'AAPL',
      'VT',
    ]);
  });

  it('應自動校準 2026 新標的之官方正式名稱 (00403A, 009816, 00981A, 009826)', () => {
    const rawTrades: TradeRecord[] = [
      { id: '1', date: '2026-01-01', symbol: '00403A', name: '國泰台灣5G+', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 10, fee: 0, tax: 0, createdAt: 1 },
      { id: '2', date: '2026-01-02', symbol: '009816', name: '富邦科技', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 15, fee: 0, tax: 0, createdAt: 2 },
      { id: '3', date: '2026-01-03', symbol: '00981A', name: '富邦特選高股息30', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 15, fee: 0, tax: 0, createdAt: 3 },
      { id: '4', date: '2026-01-04', symbol: '009826', name: '統一台灣高息動能', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 10, fee: 0, tax: 0, createdAt: 4 },
    ];

    const { holdings } = calculateHoldingsAndSummary(rawTrades);
    expect(holdings.find((h) => h.symbol === '00403A')?.name).toBe('主動統一升級50');
    expect(holdings.find((h) => h.symbol === '009816')?.name).toBe('凱基台灣TOP50');
    expect(holdings.find((h) => h.symbol === '00981A')?.name).toBe('主動統一台股增長');
    expect(holdings.find((h) => h.symbol === '009826')?.name).toBe('貝萊德世界股票');
  });

  it('應精準計算雙軌會計口徑：券商核帳模式（不含息/含稅淨現值）與總回報模式（含息/毛市值）', () => {
    // 台積電現股 1000 股買進價 600，現價 700
    // ETF 0050 1000 股買進價 150，現價 180，已領股利 5000
    const trades: TradeRecord[] = [
      { id: '1', date: '2026-01-01', symbol: '2330', name: '台積電', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 600, fee: 513, tax: 0, createdAt: 1 },
      { id: '2', date: '2026-01-02', symbol: '0050', name: '元大台灣50', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 150, fee: 128, tax: 0, createdAt: 2 },
      { id: '3', date: '2026-03-01', symbol: '0050', name: '元大台灣50', market: 'TW', currency: 'TWD', type: 'DIVIDEND', shares: 0, price: 0, fee: 0, tax: 0, cashAmount: 5000, createdAt: 3 },
    ];

    const currentPrices = {
      '2330': 700, // grossMV: 700,000, tax 0.3% = 2,100, fee 0.1425%*0.6 = 598 -> netMV: 697,302
      '0050': 180, // grossMV: 180,000, tax 0.1% = 180, fee 0.1425%*0.6 = 153 -> netMV: 179,667
    };

    const customAccounts: BrokerAccount[] = [
      {
        id: 'acc-60',
        name: '6折券商',
        market: 'TW',
        feeRate: 0.001425,
        discountRate: 0.6,
        minFee: 20,
        taxRate: 0.003,
      },
    ];

    // 1. 券商核帳模式 (BROKER，搭配 0.6 折帳戶)
    const brokerRes = calculateHoldingsAndSummary(trades, currentPrices, 32.0, 'BROKER', customAccounts, 'ALL');
    const tsMCBroker = brokerRes.holdings.find((h) => h.symbol === '2330');
    const etfBroker = brokerRes.holdings.find((h) => h.symbol === '0050');

    expect(tsMCBroker?.grossMarketValue).toBe(700000);
    expect(tsMCBroker?.estimatedSellTax).toBe(2100);
    expect(tsMCBroker?.estimatedSellFee).toBe(598);
    expect(tsMCBroker?.netMarketValue).toBe(697302);
    expect(tsMCBroker?.marketValue).toBe(697302); // BROKER 模式下 marketValue 為淨市值
    expect(tsMCBroker?.totalCostBasis).toBe(600513);
    expect(tsMCBroker?.unrealizedPnL).toBe(697302 - 600513); // 96789

    expect(etfBroker?.grossMarketValue).toBe(180000);
    expect(etfBroker?.estimatedSellTax).toBe(180);
    expect(etfBroker?.estimatedSellFee).toBe(153);
    expect(etfBroker?.netMarketValue).toBe(179667);
    expect(etfBroker?.marketValue).toBe(179667);

    // 2. 總回報模式 (TOTAL_RETURN)
    const trRes = calculateHoldingsAndSummary(trades, currentPrices, 32.0, 'TOTAL_RETURN', customAccounts, 'ALL');
    const etfTR = trRes.holdings.find((h) => h.symbol === '0050');
    expect(etfTR?.marketValue).toBe(180000); // TOTAL_RETURN 模式下 marketValue 為毛市值
    expect(etfTR?.grossMarketValue).toBe(180000);
    expect(etfTR?.totalDividends).toBe(5000);
    expect(etfTR?.adjustedCostBasis).toBe(150128 - 5000); // 145128
    expect(etfTR?.totalReturnPnL).toBe((180000 - 150128) + 5000); // 34872
  });

  it('應精準支援依券商帳戶賣出手續費折讓率 (1.0 全額牌告、0.6 6折、0.28 2.8折) 試算', () => {
    const trades: TradeRecord[] = [
      { id: '1', date: '2026-01-01', symbol: '2330', name: '台積電', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 600, fee: 0, tax: 0, createdAt: 1 },
    ];
    const currentPrices = { '2330': 700 }; // grossMV = 700,000, tax 0.3% = 2,100

    const accFull: BrokerAccount[] = [{ id: 'acc-full', name: '牌告', market: 'TW', feeRate: 0.001425, discountRate: 1.0, minFee: 20, taxRate: 0.003 }];
    const resFull = calculateHoldingsAndSummary(trades, currentPrices, 32.0, 'BROKER', accFull, 'ALL');
    const tsMCFull = resFull.holdings.find((h) => h.symbol === '2330');
    expect(tsMCFull?.estimatedSellFee).toBe(997);
    expect(tsMCFull?.netMarketValue).toBe(696903);

    const acc60: BrokerAccount[] = [{ id: 'acc-60', name: '6折', market: 'TW', feeRate: 0.001425, discountRate: 0.6, minFee: 20, taxRate: 0.003 }];
    const res60 = calculateHoldingsAndSummary(trades, currentPrices, 32.0, 'BROKER', acc60, 'ALL');
    const tsMC60 = res60.holdings.find((h) => h.symbol === '2330');
    expect(tsMC60?.estimatedSellFee).toBe(598);
    expect(tsMC60?.netMarketValue).toBe(697302);

    const acc28: BrokerAccount[] = [{ id: 'acc-28', name: '2.8折', market: 'TW', feeRate: 0.001425, discountRate: 0.28, minFee: 1, taxRate: 0.003 }];
    const res28 = calculateHoldingsAndSummary(trades, currentPrices, 32.0, 'BROKER', acc28, 'ALL');
    const tsMC28 = res28.holdings.find((h) => h.symbol === '2330');
    expect(tsMC28?.estimatedSellFee).toBe(279);
    expect(tsMC28?.netMarketValue).toBe(697621);
  });

  describe('Seam 8: Multi-Account Filtering & Friction Cost Summary (多帳戶篩選與摩擦成本分析)', () => {
    const mockAccounts: BrokerAccount[] = [
      {
        id: 'broker-cathay',
        name: '國泰證券 (2.8折)',
        market: 'TW',
        feeRate: 0.001425,
        discountRate: 0.28,
        minFee: 1,
        taxRate: 0.003,
      },
      {
        id: 'broker-sinopac',
        name: '永豐大戶投 (2折)',
        market: 'TW',
        feeRate: 0.001425,
        discountRate: 0.2,
        minFee: 1,
        taxRate: 0.003,
      },
      {
        id: 'broker-schwab',
        name: '嘉信海外美股',
        market: 'US',
        feeRate: 0,
        discountRate: 0,
        minFee: 0,
        taxRate: 0,
        usFeeType: 'ZERO_COMMISSION',
      },
    ];

    const multiTrades: TradeRecord[] = [
      {
        id: 't1',
        date: '2026-01-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        accountId: 'broker-cathay',
        shares: 1000,
        price: 600,
        fee: 239, // 實扣 2.8折手續費 (標準 855)
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2026-01-02',
        symbol: '0050',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        accountId: 'broker-sinopac',
        shares: 2000,
        price: 150,
        fee: 85, // 實扣 2折手續費 (標準 427)
        tax: 0,
        createdAt: 2,
      },
      {
        id: 't3',
        date: '2026-01-03',
        symbol: 'VT',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        accountId: 'broker-schwab',
        shares: 50,
        price: 100,
        fee: 0,
        tax: 0,
        createdAt: 3,
      },
    ];

    it('selectedAccountId 為 ALL 時應合併統計全帳戶持倉', () => {
      const currentPrices = { '2330': 700, '0050': 160, 'VT': 110 };
      const res = calculateHoldingsAndSummary(multiTrades, currentPrices, 32.0, 'BROKER', mockAccounts, 'ALL');
      expect(res.holdings.length).toBe(3);
      expect(res.summary.twd.totalCost).toBe(600000 + 239 + 300000 + 85);
    });

    it('selectedAccountId 為特定帳戶時應精確過濾持倉與成本', () => {
      const currentPrices = { '2330': 700, '0050': 160, 'VT': 110 };
      const cathayRes = calculateHoldingsAndSummary(multiTrades, currentPrices, 32.0, 'BROKER', mockAccounts, 'broker-cathay');
      expect(cathayRes.holdings.length).toBe(1);
      expect(cathayRes.holdings[0].symbol).toBe('2330');
      expect(cathayRes.summary.twd.totalCost).toBe(600239);

      const sinopacRes = calculateHoldingsAndSummary(multiTrades, currentPrices, 32.0, 'BROKER', mockAccounts, 'broker-sinopac');
      expect(sinopacRes.holdings.length).toBe(1);
      expect(sinopacRes.holdings[0].symbol).toBe('0050');
      expect(sinopacRes.summary.twd.totalCost).toBe(300085);
    });

    it('calculateFrictionCostSummary 應精準計算已付摩擦、折讓省下金額與未來出清成本', () => {
      const currentPrices = { '2330': 700, '0050': 160, 'VT': 110 };
      const res = calculateHoldingsAndSummary(multiTrades, currentPrices, 32.0, 'BROKER', mockAccounts, 'ALL');
      const friction = calculateFrictionCostSummary(multiTrades, res.holdings, mockAccounts);
      expect(friction).toBeDefined();

      // 已付買進手續費 = 239 + 85 = 324
      expect(friction.totalBuyFee).toBe(324);
      expect(friction.totalRealizedFriction).toBe(324);

      // 折讓省下金額: (855 - 239) + (427 - 85) = 616 + 342 = 958
      expect(friction.totalFeeSavedByDiscount).toBe(958);

      // 未來出清預估稅費 > 0
      expect(friction.totalEstimatedFutureTax).toBeGreaterThan(0);
      expect(friction.totalEstimatedFutureFee).toBeGreaterThan(0);
      expect(friction.frictionImpactPercent).toBeGreaterThan(0);
    });

    it('calculateAccountSellFee 應正確根據券商帳戶設定計算賣出手續費', () => {
      const cathayAcc = mockAccounts.find((a) => a.id === 'broker-cathay');
      // 100,000 * 0.001425 * 0.28 = 39.9 -> 39, 低消 1 -> 39
      expect(calculateAccountSellFee(100000, cathayAcc)).toBe(39);

      const schwabAcc = mockAccounts.find((a) => a.id === 'broker-schwab');
      expect(calculateAccountSellFee(100000, schwabAcc)).toBe(0);
    });

    it('calculateEstimatedSellTax 應精確判斷普通股 0.3%、股票 ETF 0.1%、債券 ETF 0% 免稅與美股 0%', () => {
      // 台股普通股 (2330): 0.3% -> 100,000 * 0.003 = 300
      expect(calculateEstimatedSellTax('2330', 'TW', 100000)).toBe(300);
      // 台股股票 ETF (0050, 00878): 0.1% -> 100,000 * 0.001 = 100
      expect(calculateEstimatedSellTax('0050', 'TW', 100000)).toBe(100);
      expect(calculateEstimatedSellTax('00878', 'TW', 100000)).toBe(100);
      // 台股債券 ETF (00679B, 00687B): 0% 免稅 -> 0
      expect(calculateEstimatedSellTax('00679B', 'TW', 100000)).toBe(0);
      expect(calculateEstimatedSellTax('00687B', 'TW', 100000)).toBe(0);
      // 美股 (AAPL): 0
      expect(calculateEstimatedSellTax('AAPL', 'US', 100000)).toBe(0);
    });

    it('calculateFrictionCostSummary 應以牌告低消 20 元為基準計算小額零股折讓省下金額並納入美股股息 30% 預扣稅', () => {
      const oddLotTrades: TradeRecord[] = [
        {
          id: 't-odd-1',
          date: '2026-08-01',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 2,
          price: 1000, // 成交額 2,000，標準手續費 floor(2000*0.001425)=2，但牌告低消為 20 元
          fee: 1, // 國泰 2.8 折低消 1 元
          tax: 0,
          createdAt: 100,
        },
        {
          id: 't-div-us',
          date: '2026-08-15',
          symbol: 'AAPL',
          market: 'US',
          currency: 'USD',
          type: 'DIVIDEND',
          shares: 10,
          price: 10, // 股利 100 USD
          fee: 0,
          tax: 30, // 30% 預扣稅 30 USD
          createdAt: 101,
        },
      ];

      const friction = calculateFrictionCostSummary(oddLotTrades, []);
      // 零股標準手續費 max(20, 2) = 20，實付 1，省下 20 - 1 = 19
      expect(friction.totalFeeSavedByDiscount).toBe(19);
      // 買進手續費 1
      expect(friction.totalBuyFee).toBe(1);
      // 美股股息 30% 預扣稅 30
      expect(friction.totalUSDividendTax).toBe(30);
      // 總已實現摩擦 = 買進手續費 1 + 股息預扣稅 30*32 = 961 (當匯率 32)
      expect(friction.totalRealizedFriction).toBeGreaterThan(0);
    });

    it('repairLedgerTaxAndFee 應精準將歷史賣出紀錄中被合併進 fee 的證交稅拆分出來且保持損益與淨額不變', () => {
      const dirtyTrades: TradeRecord[] = [
        {
          id: 't-buy-1',
          date: '2025-01-01',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 1000,
          price: 500,
          fee: 142,
          tax: 0,
          createdAt: 1,
        },
        {
          id: 't-sell-dirty',
          date: '2025-06-01',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'SELL',
          shares: 1000,
          price: 600, // 成交金額 600,000，證交稅應為 1,800，手續費若為 2.8折 239 -> 原本被合併為 fee = 2039, tax = 0
          fee: 2039,
          tax: 0,
          createdAt: 2,
        },
      ];

      // 修復前計算損益
      const beforeRes = calculateHoldingsAndSummary(dirtyTrades, { '2330': 600 }, 32.0);
      const beforePnL = beforeRes.summary.twd.realizedPnL;

      // 執行修復
      const { repairedTrades, fixedCount } = repairLedgerTaxAndFee(dirtyTrades);
      expect(fixedCount).toBe(1);

      const fixedSell = repairedTrades.find((t) => t.id === 't-sell-dirty')!;
      expect(fixedSell.tax).toBe(1800); // 精準拆出 0.3% 證交稅
      expect(fixedSell.fee).toBe(239);  // 實付手續費還原為 239

      // 修復後計算損益，必須 100% 恆等
      const afterRes = calculateHoldingsAndSummary(repairedTrades, { '2330': 600 }, 32.0);
      expect(afterRes.summary.twd.realizedPnL).toBe(beforePnL);

      // 修復後計算摩擦中心，折讓金額與證交稅正確還原
      const repairedFriction = calculateFrictionCostSummary(repairedTrades, afterRes.holdings, mockAccounts, 32.0);
      expect(repairedFriction.totalSellTax).toBe(1800); // 不再是 0！
      expect(repairedFriction.totalSellFee).toBe(239);  // 不再是 2039！
      // 賣出 60 萬標準手續費 855，實付 239，省下 855 - 239 = 616
      expect(repairedFriction.totalFeeSavedByDiscount).toBeGreaterThan(600);

      // 再次修復應具備冪等性 (fixedCount = 0)
      const secondRun = repairLedgerTaxAndFee(repairedTrades);
      expect(secondRun.fixedCount).toBe(0);
    });

    it('repairLedgerTaxAndFee 應正確處理單純缺漏 tax (fee < estimatedTax) 以及忽略債券 ETF 免稅', () => {
      const trades: TradeRecord[] = [
        {
          id: 't-sell-omitted-tax',
          date: '2025-06-01',
          symbol: '3715',
          market: 'TW',
          currency: 'TWD',
          type: 'SELL',
          shares: 100,
          price: 100, // 成交金額 10,000，證交稅應為 30，手續費若為 15 -> 原本 tax = 0
          fee: 15,
          tax: 0,
          createdAt: 1,
        },
        {
          id: 't-sell-bond-etf',
          date: '2025-06-02',
          symbol: '00679B',
          market: 'TW',
          currency: 'TWD',
          type: 'SELL',
          shares: 1000,
          price: 30, // 債券 ETF 免稅
          fee: 10,
          tax: 0,
          createdAt: 2,
        },
      ];

      const { repairedTrades, fixedCount } = repairLedgerTaxAndFee(trades);
      expect(fixedCount).toBe(1); // 僅修復 3715，00679B 債券 ETF 保持免稅

      const fixed3715 = repairedTrades.find((t) => t.id === 't-sell-omitted-tax')!;
      expect(fixed3715.tax).toBe(30);
      expect(fixed3715.fee).toBe(15);

      const fixedBond = repairedTrades.find((t) => t.id === 't-sell-bond-etf')!;
      expect(fixedBond.tax).toBe(0);
      expect(fixedBond.fee).toBe(10);
    });

    it('calculateFrictionCostSummary 應支援雙幣別匯率折算與台股股利二代健保補充保費', () => {
      const mixedTrades: TradeRecord[] = [
        {
          id: 't-us-buy',
          date: '2026-01-01',
          symbol: 'VT',
          market: 'US',
          currency: 'USD',
          type: 'BUY',
          shares: 10,
          price: 100, // 1,000 USD
          fee: 5,     // 5 USD
          tax: 0,
          createdAt: 1,
        },
        {
          id: 't-tw-div',
          date: '2026-07-01',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'DIVIDEND',
          shares: 1000,
          price: 30, // 30,000 TWD (>= 20,000 元，應課 2.11% 二代健保 = 633 元)
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
      ];

      const friction = calculateFrictionCostSummary(mixedTrades, [], [], 32.0);
      // 美股買進手續費 5 USD * 32 = 160 TWD
      expect(friction.totalBuyFee).toBe(160);
      // 台股二代健保 30,000 * 2.11% = 633 TWD
      expect(friction.totalTWDividendTax).toBe(633);
      // 總已實現摩擦 = 160 + 633 = 793 TWD
      expect(friction.totalRealizedFriction).toBe(793);
    });
  });
});


