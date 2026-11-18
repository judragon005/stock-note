import { describe, it, expect } from 'vitest';
import { assembleWarRoomHoldingSignals } from './warRoomBriefBuilder';
import type { HoldingPosition } from '../types/stock';

describe('warRoomBriefBuilder - assembleWarRoomHoldingSignals 正統欄位契約測試 (Spec 0236)', () => {
  it('應直接消費 HoldingPosition 正統 plan 與 dispositionEvents 並輸出精確停損與處置狀態', () => {
    const holdings: HoldingPosition[] = [
      {
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        shares: 1000,
        avgCost: 900,
        totalCostBasis: 900000,
        adjustedCostBasis: 900000,
        currentPrice: 960,
        marketValue: 960000,
        grossMarketValue: 960000,
        estimatedSellTax: 2880,
        estimatedSellFee: 1368,
        netMarketValue: 955752,
        unrealizedPnL: 60000,
        unrealizedPnLPercent: 6.67,
        unrealizedPnLBroker: 55752,
        unrealizedPnLBrokerPercent: 6.19,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: 60000,
        totalReturnPercent: 6.67,
        yieldOnCostPercent: 0,
        plan: {
          stopLossPrice: 950,
          takeProfitPrice: 1200,
        },
        dispositionEvents: [
          {
            type: 'DISPOSITION',
            startDate: '2026-11-15',
            endDate: '2026-11-25',
          },
        ],
      },
    ];

    const signals = assembleWarRoomHoldingSignals({
      holdings,
      historicalDailyPrices: {},
      lakehouseCandlesMap: {},
      totalNavTwd: 960000,
      usdToTwdRate: 32.0,
      asOfDate: '2026-11-18',
    });

    expect(signals).toHaveLength(1);
    expect(signals[0].stopLossPrice).toBe(950);
    expect(signals[0].targetPrice).toBe(1200);
    // 960 距離 950 為 +1.05% (<= 3%) -> NEAR_STOP_LOSS
    expect(signals[0].planRiskStatus).toBe('NEAR_STOP_LOSS');
    expect(signals[0].dispositionStatus).toBe('DISPOSITION');
  });
});
