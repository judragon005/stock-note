import { describe, it, expect } from 'vitest';
import { TradeRecord } from '../types/stock';
import { processLots, calculateTaxComparison } from './lotEngine';

describe('Lot-based Accounting Engine (多批次沖銷會計引擎)', () => {
  it('應正確處理 FIFO (先進先出法) 賣出沖銷', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2024-01-10',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100,
        price: 100,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2024-02-10',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100,
        price: 200,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
      {
        id: 't3',
        date: '2024-03-10',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'SELL',
        shares: 100,
        price: 150,
        fee: 0,
        tax: 0,
        createdAt: 3,
      },
    ];

    const result = processLots(trades, { accountingMethod: 'FIFO' });

    // FIFO 沖銷 2024-01-10 買入之 Lot 1 (成本 100)
    expect(result.disposals.length).toBe(1);
    expect(result.disposals[0].lotId).toBe('lot-t1');
    expect(result.disposals[0].realizedPnL).toBe(5000); // (150 - 100) * 100
    expect(result.totalRealizedPnL).toBe(5000);

    // 剩餘未沖銷 Lot 應為 Lot 2 (2024-02-10 @200)
    expect(result.openLots.length).toBe(1);
    expect(result.openLots[0].id).toBe('lot-t2');
    expect(result.openLots[0].remainingShares).toBe(100);
    expect(result.openLots[0].unitCost).toBe(200);
  });

  it('應正確處理 LIFO (後進先出法) 賣出沖銷', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2024-01-10',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100,
        price: 100,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2024-02-10',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100,
        price: 200,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
      {
        id: 't3',
        date: '2024-03-10',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'SELL',
        shares: 100,
        price: 150,
        fee: 0,
        tax: 0,
        createdAt: 3,
      },
    ];

    const result = processLots(trades, { accountingMethod: 'LIFO' });

    // LIFO 沖銷 2024-02-10 最新買入之 Lot 2 (成本 200)
    expect(result.disposals.length).toBe(1);
    expect(result.disposals[0].lotId).toBe('lot-t2');
    expect(result.disposals[0].realizedPnL).toBe(-5000); // (150 - 200) * 100
    expect(result.totalRealizedPnL).toBe(-5000);

    // 剩餘未沖銷 Lot 應為 Lot 1 (2024-01-10 @100)
    expect(result.openLots.length).toBe(1);
    expect(result.openLots[0].id).toBe('lot-t1');
    expect(result.openLots[0].remainingShares).toBe(100);
    expect(result.openLots[0].unitCost).toBe(100);
  });

  it('應正確處理 HIFO (最高成本先出法 - 節稅優先) 沖銷', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2024-01-10',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 50,
        price: 120,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2024-02-10',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 50,
        price: 180, // 最高成本
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
      {
        id: 't3',
        date: '2024-03-10',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 50,
        price: 140,
        fee: 0,
        tax: 0,
        createdAt: 3,
      },
      {
        id: 't4',
        date: '2024-04-10',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'SELL',
        shares: 50,
        price: 150,
        fee: 0,
        tax: 0,
        createdAt: 4,
      },
    ];

    const result = processLots(trades, { accountingMethod: 'HIFO' });

    // HIFO 應優先沖銷單價最高的 Lot 2 ($180)
    expect(result.disposals.length).toBe(1);
    expect(result.disposals[0].lotId).toBe('lot-t2');
    expect(result.disposals[0].realizedPnL).toBe(-1500); // (150 - 180) * 50 = -1500
    expect(result.totalRealizedPnL).toBe(-1500);

    // 剩餘未沖銷 Lot 應包含 Lot 1 (@120) 與 Lot 3 (@140)
    expect(result.openLots.length).toBe(2);
    expect(result.openLots.map((l) => l.id)).toEqual(['lot-t1', 'lot-t3']);
  });

  it('股票分割 (Stock Split) 應等比放大在庫所有 Lot 股數並調降單股成本', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2024-01-10',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 10,
        price: 1000,
        fee: 10,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2024-06-07',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'STOCK_SPLIT',
        shares: 0,
        price: 0,
        fee: 0,
        tax: 0,
        ratio: 10, // 1拆10
        createdAt: 2,
      },
    ];

    const result = processLots(trades, { accountingMethod: 'FIFO' });

    expect(result.openLots.length).toBe(1);
    const lot = result.openLots[0];
    expect(lot.remainingShares).toBe(100); // 10 * 10
    expect(lot.totalCostBasis).toBe(10010); // 總成本保持不變
    expect(lot.unitCost).toBe(100.1); // 10010 / 100
  });

  it('除權配股 (Stock Dividend) 應依各 Lot 比例配發並稀釋成本', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2024-01-10',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 500,
        fee: 500,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2024-07-10',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'STOCK_DIVIDEND',
        shares: 100, // 配股 100 股
        price: 0,
        fee: 0,
        tax: 0,
        ratio: 0.1,
        createdAt: 2,
      },
    ];

    const result = processLots(trades, { accountingMethod: 'FIFO' });

    expect(result.openLots.length).toBe(1);
    const lot = result.openLots[0];
    expect(lot.remainingShares).toBe(1100);
    expect(lot.totalCostBasis).toBe(500500);
    expect(lot.unitCost).toBeCloseTo(500500 / 1100, 4);
  });

  it('現金減資 (Capital Reduction) 應等比縮股並按比例扣減 Lot 成本基準', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2024-01-10',
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
        id: 't2',
        date: '2024-08-10',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'CAPITAL_REDUCTION',
        shares: 200, // 減資 200 股
        price: 10,
        cashAmount: 2000, // 退款 2000 元
        fee: 0,
        tax: 0,
        ratio: 0.2,
        createdAt: 2,
      },
    ];

    const result = processLots(trades, { accountingMethod: 'FIFO' });

    expect(result.openLots.length).toBe(1);
    const lot = result.openLots[0];
    expect(lot.remainingShares).toBe(800);
    expect(lot.totalCostBasis).toBe(500000 - 2000); // 498,000
    expect(lot.unitCost).toBe(498000 / 800);
  });

  it('應精準判定持有天數與長短期資本利得 (>= 365天為長期)', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2023-01-01',
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100,
        price: 150,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2023-07-01',
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100,
        price: 180,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
      {
        id: 't3',
        date: '2024-01-01', // 持有正好 365 天 (2023-01-01 到 2024-01-01)
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        type: 'SELL',
        shares: 100,
        price: 190,
        fee: 0,
        tax: 0,
        createdAt: 3,
      },
      {
        id: 't4',
        date: '2024-01-02', // 2023-07-01 到 2024-01-02 為 185 天 (< 365)
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        type: 'SELL',
        shares: 100,
        price: 190,
        fee: 0,
        tax: 0,
        createdAt: 4,
      },
    ];

    const result = processLots(trades, { accountingMethod: 'FIFO' });

    expect(result.disposals.length).toBe(2);
    // 第一筆沖銷 (Lot 1): 365 天，長期
    expect(result.disposals[0].holdingDays).toBe(365);
    expect(result.disposals[0].isLongTerm).toBe(true);

    // 第二筆沖銷 (Lot 2): 185 天，短期
    expect(result.disposals[1].holdingDays).toBe(185);
    expect(result.disposals[1].isLongTerm).toBe(false);
  });

  it('出清所有持股時，所有會計模式之累計已實現損益總和必定相等', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2024-01-10',
        symbol: 'TSLA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 50,
        price: 200,
        fee: 5,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2024-02-10',
        symbol: 'TSLA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 50,
        price: 300,
        fee: 5,
        tax: 0,
        createdAt: 2,
      },
      {
        id: 't3',
        date: '2024-03-10',
        symbol: 'TSLA',
        market: 'US',
        currency: 'USD',
        type: 'SELL',
        shares: 60,
        price: 250,
        fee: 6,
        tax: 0,
        createdAt: 3,
      },
      {
        id: 't4',
        date: '2024-04-10',
        symbol: 'TSLA',
        market: 'US',
        currency: 'USD',
        type: 'SELL',
        shares: 40,
        price: 280,
        fee: 4,
        tax: 0,
        createdAt: 4,
      },
    ];

    const fifoResult = processLots(trades, { accountingMethod: 'FIFO' });
    const lifoResult = processLots(trades, { accountingMethod: 'LIFO' });
    const hifoResult = processLots(trades, { accountingMethod: 'HIFO' });
    const movResult = processLots(trades, { accountingMethod: 'MOVING_AVERAGE' });

    expect(fifoResult.totalRealizedPnL).toBeCloseTo(lifoResult.totalRealizedPnL, 4);
    expect(fifoResult.totalRealizedPnL).toBeCloseTo(hifoResult.totalRealizedPnL, 4);
    expect(fifoResult.totalRealizedPnL).toBeCloseTo(movResult.totalRealizedPnL, 4);

    expect(fifoResult.openLots.length).toBe(0);
    expect(lifoResult.openLots.length).toBe(0);
    expect(hifoResult.openLots.length).toBe(0);
    expect(movResult.openLots.length).toBe(0);
  });

  it('應正確產生多沖銷模式節稅對照 (Tax Comparison)', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2024-01-10',
        symbol: 'GOOGL',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100,
        price: 100,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2024-02-10',
        symbol: 'GOOGL',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100,
        price: 200,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
      {
        id: 't3',
        date: '2024-03-10',
        symbol: 'GOOGL',
        market: 'US',
        currency: 'USD',
        type: 'SELL',
        shares: 100,
        price: 150,
        fee: 0,
        tax: 0,
        createdAt: 3,
      },
    ];

    const comparison = calculateTaxComparison(trades);

    expect(comparison.FIFO.totalRealizedPnL).toBe(5000); // FIFO: (150 - 100) * 100 = 5000
    expect(comparison.HIFO.totalRealizedPnL).toBe(-5000); // HIFO: (150 - 200) * 100 = -5000
    expect(comparison.HIFO.potentialTaxSavingsVsFIFO).toBe(10000); // 節省/遞延 10,000 利得
  });

  it('MOVING_AVERAGE 應正確計算加權平均持有天數與長短期判定', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2023-01-01',
        symbol: 'MSFT',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100, // 佔 50%
        price: 200,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2023-07-01',
        symbol: 'MSFT',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100, // 佔 50%
        price: 300,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
      {
        id: 't3',
        date: '2024-01-01', // t1 到 t3 為 365 天，t2 到 t3 為 184 天，加權平均 = (365*0.5 + 184*0.5) = 275 天 (<365 短期)
        symbol: 'MSFT',
        market: 'US',
        currency: 'USD',
        type: 'SELL',
        shares: 100,
        price: 280,
        fee: 0,
        tax: 0,
        createdAt: 3,
      },
    ];

    const result = processLots(trades, { accountingMethod: 'MOVING_AVERAGE' });
    expect(result.disposals.length).toBe(1);
    const disp = result.disposals[0];
    expect(disp.holdingDays).toBe(275);
    expect(disp.isLongTerm).toBe(false);
    expect(disp.buyDate).toContain('加權平均');
  });

  it('MOVING_AVERAGE 比例扣減應使用差額法，確保扣除股數精確守恆且無碎股殘留', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2024-01-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 333,
        price: 500,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2024-01-02',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 333,
        price: 550,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
      {
        id: 't3',
        date: '2024-01-03',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 334,
        price: 600,
        fee: 0,
        tax: 0,
        createdAt: 3,
      },
      {
        id: 't4',
        date: '2024-02-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'SELL',
        shares: 500, // 賣出一半 500 股
        price: 650,
        fee: 0,
        tax: 0,
        createdAt: 4,
      },
    ];

    const result = processLots(trades, { accountingMethod: 'MOVING_AVERAGE' });
    const remainingTotalShares = result.openLots.reduce((sum, l) => sum + l.remainingShares, 0);
    expect(remainingTotalShares).toBe(500); // 1000 - 500 = 500
  });

  it('跨多 Lot 賣出時應依序扣除並按比例分攤賣出手續費與證交稅', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        date: '2024-01-01',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100,
        price: 100,
        fee: 10,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't2',
        date: '2024-02-01',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100,
        price: 200,
        fee: 10,
        tax: 0,
        createdAt: 2,
      },
      {
        id: 't3',
        date: '2024-03-01',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'SELL',
        shares: 150, // 跨 2 個 Lot (Lot 1: 100 股, Lot 2: 50 股)
        price: 180,
        fee: 30, // 總手續費 30 (分攤: Lot1 佔 20, Lot2 佔 10)
        tax: 15, // 總稅 15 (分攤: Lot1 佔 10, Lot2 佔 5)
        createdAt: 3,
      },
    ];

    const result = processLots(trades, { accountingMethod: 'FIFO' });
    expect(result.disposals.length).toBe(2);

    // 第一筆沖銷 (Lot 1: 100 股)
    const d1 = result.disposals[0];
    expect(d1.shares).toBe(100);
    expect(d1.allocatedFee).toBe(20);
    expect(d1.allocatedTax).toBe(10);
    expect(d1.costBasis).toBe(10010); // 100 * 100 + 10

    // 第二筆沖銷 (Lot 2: 50 股)
    const d2 = result.disposals[1];
    expect(d2.shares).toBe(50);
    expect(d2.allocatedFee).toBe(10);
    expect(d2.allocatedTax).toBe(5);
    expect(d2.costBasis).toBe(10005); // 50 * 200 + 5 (50/100 * 10)

    // 剩餘 Lot 2 還剩 50 股
    expect(result.openLots.length).toBe(1);
    expect(result.openLots[0].remainingShares).toBe(50);
    expect(result.openLots[0].totalCostBasis).toBe(10005);
  });
});
