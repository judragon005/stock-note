import { describe, it, expect } from 'vitest';
import { calculateHoldingPeriodMetrics } from './holdingPeriodEngine';
import { TaxLot } from '../types/lot';

describe('加權持股天數與資金週轉量化引擎 (holdingPeriodEngine)', () => {
  const asOfDate = '2026-08-28';

  it('場景 1: 無活躍批次或零持股時防禦回傳', () => {
    const res = calculateHoldingPeriodMetrics([], '2330', asOfDate);

    expect(res.weightedHoldingDays).toBe(0);
    expect(res.activeLotsCount).toBe(0);
    expect(res.firstBuyDate).toBe('');
    expect(res.latestBuyDate).toBe('');
    expect(res.category).toBe('ULTRA_SHORT');
    expect(res.isTaxExemptEligible).toBe(false);
  });

  it('場景 2: 單一批次買進 (10 天前，短線波段 SHORT_TERM)', () => {
    const singleLot: TaxLot = {
      id: 'lot-1',
      buyTradeId: 'trade-1',
      symbol: '2330',
      market: 'TW',
      currency: 'TWD',
      buyDate: '2026-08-18', // 10 天前
      buyPrice: 1000,
      originalShares: 1000,
      remainingShares: 1000,
      fee: 0,
      unitCost: 1000,
      totalCostBasis: 1000000,
      createdAt: 1000,
    };

    const res = calculateHoldingPeriodMetrics([singleLot], '2330', asOfDate);

    expect(res.weightedHoldingDays).toBe(10);
    expect(res.firstBuyDate).toBe('2026-08-18');
    expect(res.latestBuyDate).toBe('2026-08-18');
    expect(res.category).toBe('SHORT_TERM');
    expect(res.isTaxExemptEligible).toBe(false);
  });

  it('場景 3: 多批次不同金額加權持股天數計算 (MEDIUM_TERM)', () => {
    const lots: TaxLot[] = [
      {
        id: 'lot-1',
        buyTradeId: 'trade-1',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        buyDate: '2026-05-20',
        buyPrice: 1000,
        originalShares: 100,
        remainingShares: 100,
        fee: 0,
        unitCost: 1000,
        totalCostBasis: 100000,
        createdAt: 1000,
      },
      {
        id: 'lot-2',
        buyTradeId: 'trade-2',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        buyDate: '2026-08-18',
        buyPrice: 1000,
        originalShares: 200,
        remainingShares: 200,
        fee: 0,
        unitCost: 1000,
        totalCostBasis: 200000,
        createdAt: 2000,
      },
    ];

    const res = calculateHoldingPeriodMetrics(lots, '2330', asOfDate);

    expect(res.weightedHoldingDays).toBe(40);
    expect(res.firstBuyDate).toBe('2026-05-20');
    expect(res.latestBuyDate).toBe('2026-08-18');
    expect(res.category).toBe('MEDIUM_TERM');
    expect(res.activeLotsCount).toBe(2);
  });

  it('場景 4: 超過 365 天長期存股 (TAX_EXEMPT_LONG 稅務優惠門檻)', () => {
    const oldLot: TaxLot = {
      id: 'lot-1',
      buyTradeId: 'trade-1',
      symbol: 'AAPL',
      market: 'US',
      currency: 'USD',
      buyDate: '2024-01-01', // > 2 年
      buyPrice: 180,
      originalShares: 50,
      remainingShares: 50,
      fee: 0,
      unitCost: 180,
      totalCostBasis: 9000,
      createdAt: 1000,
    };

    const res = calculateHoldingPeriodMetrics([oldLot], 'AAPL', asOfDate);

    expect(res.weightedHoldingDays).toBeGreaterThan(365);
    expect(res.category).toBe('TAX_EXEMPT_LONG');
    expect(res.isTaxExemptEligible).toBe(true);
  });
});
