import { describe, it, expect } from 'vitest';
import { calculateHoldingsAndSummary } from './calculator';
import { TradeRecord } from '../types/stock';

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
});
