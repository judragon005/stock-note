import { describe, it, expect } from 'vitest';
import { calculateHoldingsAndSummary } from './calculator';
import { processLots } from './lotEngine';
import { TradeRecord } from '../types/stock';

describe('Ticket 01: 美股加權成本匯率與累計報酬率分母重構 (Spec 0208)', () => {
  it('美股不同買進日期具不同匯率時，成本匯率呈現加權平均值而非 32.0', () => {
    const usTrades: TradeRecord[] = [
      {
        id: 't-us-1',
        date: '2026-01-10',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 10,
        price: 100,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't-us-2',
        date: '2026-02-10',
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 10,
        price: 200,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const historicalFx = {
      '2026-01-10': 30.0,
      '2026-02-10': 32.0,
    };

    const { holdings } = calculateHoldingsAndSummary(
      usTrades,
      { NVDA: 250 },
      32.0,
      'TOTAL_RETURN',
      [],
      'ALL',
      undefined,
      'MOVING_AVERAGE',
      undefined,
      historicalFx
    );

    expect(holdings).toHaveLength(1);
    const h = holdings[0];
    expect(h.avgCostFxRate).toBeDefined();
    expect(h.avgCostFxRate).toBeCloseTo(31.3333, 4);
    expect(h.historicalTotalInvestedCost).toBe(3000);
  });

  it('已平倉個股（在倉 0 股）能正確計算並顯示實現總報酬率 %，不再顯示 0.00%', () => {
    const closedTrades: TradeRecord[] = [
      {
        id: 't-closed-buy',
        date: '2026-03-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 10,
        price: 100,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't-closed-sell',
        date: '2026-03-15',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'SELL',
        shares: 10,
        price: 150,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const { holdings } = calculateHoldingsAndSummary(closedTrades, { '2330': 150 });
    expect(holdings).toHaveLength(1);
    const h = holdings[0];
    expect(h.shares).toBe(0);
    expect(h.isClosed).toBe(true);
    expect(h.totalCostBasis).toBe(0);
    expect(h.historicalTotalInvestedCost).toBe(1000);
    expect(h.realizedPnL).toBe(500);
    expect(h.totalReturnPnL).toBe(500);
    expect(h.totalReturnPercent).toBe(50);
  });

  it('賣出 99% 持股僅留 1 股零股時，累計總報酬率分母採歷史總投入成本，不產生數萬趴畸變', () => {
    const partialTrades: TradeRecord[] = [
      {
        id: 't-part-buy',
        date: '2026-04-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 100,
        price: 100,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't-part-sell',
        date: '2026-04-10',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'SELL',
        shares: 99,
        price: 150,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const { holdings } = calculateHoldingsAndSummary(partialTrades, { '2330': 150 });
    expect(holdings).toHaveLength(1);
    const h = holdings[0];
    expect(h.shares).toBe(1);
    expect(h.totalCostBasis).toBe(100);
    expect(h.historicalTotalInvestedCost).toBe(10000);
    expect(h.totalReturnPnL).toBe(5000);
    expect(h.totalReturnPercent).toBe(50);
  });
});

describe('Ticket 02: 批次撮合引擎全型別支援與除權息尾差平滑 (Spec 0208)', () => {
  it('lotEngine 應能精確處理 ADJUSTMENT 盤點單，股數與成本對齊 calculator', () => {
    const trades: TradeRecord[] = [
      {
        id: 't-buy-1',
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
        id: 't-adj-1',
        date: '2026-02-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'ADJUSTMENT',
        shares: 50, // 盤點增加 50 股
        price: 0,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const lotRes = processLots(trades, { accountingMethod: 'FIFO' });
    const { holdings } = calculateHoldingsAndSummary(trades, { '2330': 600 }, 32.0, 'TOTAL_RETURN', [], 'ALL', undefined, 'FIFO');

    expect(lotRes.openLots).toBeDefined();
    const totalLotShares = lotRes.openLots.reduce((sum, l) => sum + l.remainingShares, 0);
    expect(totalLotShares).toBe(1050);
    expect(holdings[0].shares).toBe(1050);
  });

  it('lotEngine 應支援 STOCK_MERGER 換股合併，舊股歸零並新設目標股票批次', () => {
    const trades: TradeRecord[] = [
      {
        id: 't-old-buy',
        date: '2026-01-01',
        symbol: 'OLD_CO',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 100,
        price: 50,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't-merger',
        date: '2026-03-01',
        symbol: 'OLD_CO',
        market: 'US',
        currency: 'USD',
        type: 'STOCK_MERGER',
        shares: 120, // 換得 120 股 NEW_CO
        price: 0,
        targetSymbol: 'NEW_CO',
        targetName: '新合併公司',
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const lotRes = processLots(trades, { accountingMethod: 'FIFO' });
    const oldLots = lotRes.openLots.filter((l) => l.symbol === 'OLD_CO');
    const newLots = lotRes.openLots.filter((l) => l.symbol === 'NEW_CO');

    expect(oldLots).toHaveLength(0);
    expect(newLots).toHaveLength(1);
    expect(newLots[0].remainingShares).toBe(120);
    expect(newLots[0].totalCostBasis).toBe(5000); // 承接舊股 100*50 = 5000 成本
  });

  it('多批次無償配股配發零股後全數賣出，尾差精確收斂，剩餘股數精確歸零無殘留', () => {
    const trades: TradeRecord[] = [
      {
        id: 't-batch-1',
        date: '2026-01-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 333,
        price: 600,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't-batch-2',
        date: '2026-01-02',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 333,
        price: 610,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
      {
        id: 't-batch-3',
        date: '2026-01-03',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 334,
        price: 620,
        fee: 0,
        tax: 0,
        createdAt: 3,
      },
      // 總共 1000 股，除權配息 100 股 (ratio: 0.1)
      {
        id: 't-div-stock',
        date: '2026-04-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'STOCK_DIVIDEND',
        shares: 100,
        price: 0,
        fee: 0,
        tax: 0,
        createdAt: 4,
      },
      // 全數賣出 1100 股
      {
        id: 't-sell-all',
        date: '2026-05-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'SELL',
        shares: 1100,
        price: 700,
        fee: 0,
        tax: 0,
        createdAt: 5,
      },
    ];

    const lotRes = processLots(trades, { accountingMethod: 'FIFO' });
    const remainingOpenLots = lotRes.openLots.filter((l) => l.symbol === '2330');
    expect(remainingOpenLots).toHaveLength(0);
  });
});
