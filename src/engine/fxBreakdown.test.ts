import { describe, it, expect } from 'vitest';
import { calculateHoldingFxBreakdown } from './fxBreakdown';
import { HoldingPosition } from '../types/stock';

describe('FX Gain/Loss & Asset Gain Breakdown Engine (外匯損益與資產價差拆解引擎)', () => {
  const mockHoldingUS: HoldingPosition = {
    symbol: 'AAPL',
    name: '蘋果',
    market: 'US',
    currency: 'USD',
    shares: 10,
    avgCost: 150, // 均價 150 USD (買進加權匯率例如 30.0)
    totalCostBasis: 1500, // 總美元成本 1500 USD (原台幣成本 45,000 TWD)
    adjustedCostBasis: 1500,
    currentPrice: 200, // 現價 200 USD
    marketValue: 2000,
    grossMarketValue: 2000,
    estimatedSellTax: 0,
    estimatedSellFee: 0,
    netMarketValue: 2000,
    unrealizedPnL: 500, // 美元未實現損益 = +500 USD
    unrealizedPnLPercent: 33.33,
    unrealizedPnLBroker: 500,
    unrealizedPnLBrokerPercent: 33.33,
    realizedPnL: 0,
    totalDividends: 0,
    totalCapitalReturned: 0,
    totalStockDividendsShares: 0,
    totalReturnPnL: 500,
    totalReturnPercent: 33.33,
    yieldOnCostPercent: 0,
  };

  it('能精確將美股總損益 (TWD) 拆解為股票本體價差損益與外匯匯差損益', () => {
    // 假設：買進時匯率 30.0，目前即時匯率 32.0
    // 美元成本 = 1500 USD ➔ 原始台幣成本 = 1500 * 30.0 = 45,000 TWD
    // 目前美元市值 = 2000 USD ➔ 目前台幣市值 = 2000 * 32.0 = 64,000 TWD
    // 總台幣未實現損益 = 64,000 - 45,000 = +19,000 TWD
    // 股票本體價差 (TWD) = (200 - 150) * 10 * 32.0 = 500 * 32.0 = +16,000 TWD (本體報酬率 33.33%)
    // 外匯匯差損益 (TWD) = 1500 * (32.0 - 30.0) = +3,000 TWD (匯率變動 6.67%)
    // 驗證：16,000 + 3,000 = 19,000 TWD

    const result = calculateHoldingFxBreakdown(mockHoldingUS, 30.0, 32.0);

    expect(result.symbol).toBe('AAPL');
    expect(result.totalCostUSD).toBe(1500);
    expect(result.currentMarketValueUSD).toBe(2000);
    expect(result.costFxRate).toBe(30.0);
    expect(result.currentFxRate).toBe(32.0);

    expect(result.assetGainTWD).toBe(16000);
    expect(result.assetGainPercent).toBeCloseTo(33.33, 2);
    expect(result.fxGainTWD).toBe(3000);
    expect(result.fxGainPercent).toBeCloseTo(6.67, 2);
    expect(result.totalGainTWD).toBe(19000);
    expect(result.assetGainTWD + result.fxGainTWD).toBe(result.totalGainTWD);
  });

  it('當美元貶值 (FX Loss) 但股價大漲時，應呈現正本體損益與負匯差損益', () => {
    // 買進匯率 32.0，目前匯率 30.0
    // 美元成本 1500 USD (48,000 TWD)，目前市值 2000 USD (60,000 TWD)
    // 總台幣損益 = +12,000 TWD
    // 本體價差 = 500 * 30.0 = +15,000 TWD
    // 外匯匯差 = 1500 * (30.0 - 32.0) = -3,000 TWD
    // 15,000 + (-3,000) = 12,000 TWD

    const result = calculateHoldingFxBreakdown(mockHoldingUS, 32.0, 30.0);

    expect(result.assetGainTWD).toBe(15000);
    expect(result.fxGainTWD).toBe(-3000);
    expect(result.totalGainTWD).toBe(12000);
  });
});
