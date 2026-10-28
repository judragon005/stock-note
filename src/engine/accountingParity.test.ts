import { describe, it, expect } from 'vitest';
import { calculateHoldingsAndSummary } from './calculator';
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
        price: 100, // 1000 USD, 匯率 30.0 -> 30,000 TWD
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
        price: 200, // 2000 USD, 匯率 32.0 -> 64,000 TWD
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
    // 總 USD 成本 = 3000, 總 TWD = 30000 + 64000 = 94000
    // 加權匯率 = 94000 / 3000 = 31.333333333333332
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
        price: 100, // 成本 1000
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
        price: 150, // 賣出 1500，獲利 500
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
    // 過去因為 finalCostBasis === 0 導致 totalReturnPercent 顯示 0，現在應為 50%
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
        price: 100, // 總投入 10,000
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
        price: 150, // 賣出 99 股獲利 4,950
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

