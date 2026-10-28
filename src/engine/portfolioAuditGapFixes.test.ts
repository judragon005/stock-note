import { describe, it, expect } from 'vitest';
import { calculateLookThroughExposure, resolveSecuritySector } from './lookThroughEngine';
import { detectBagHoldingPositions, calculateBehavioralAudit } from './behavioralAuditEngine';
import { HoldingPosition, TradeRecord } from '../types/stock';

function createMockHolding(overrides: Partial<HoldingPosition>): HoldingPosition {
  return {
    symbol: 'MOCK',
    name: 'Mock Stock',
    market: 'TW',
    currency: 'TWD',
    shares: 1000,
    avgCost: 100,
    totalCostBasis: 100000,
    adjustedCostBasis: 100000,
    currentPrice: 100,
    marketValue: 100000,
    grossMarketValue: 100000,
    estimatedSellTax: 300,
    estimatedSellFee: 142,
    netMarketValue: 99558,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    unrealizedPnLBroker: 0,
    unrealizedPnLBrokerPercent: 0,
    realizedPnL: 0,
    totalDividends: 0,
    totalCapitalReturned: 0,
    totalStockDividendsShares: 0,
    totalReturnPnL: 0,
    totalReturnPercent: 0,
    yieldOnCostPercent: 0,
    lots: [],
    ...overrides,
  };
}

describe('Spec 0208 Gap Fixes: 產業穿透、行為審計真實天數與勝率', () => {
  it('1. lookThroughEngine: 2330 應解析為真實產業「半導體業」，非「台股投資標的」', () => {
    const sector = resolveSecuritySector('2330', false);
    expect(sector).toBe('半導體業');

    const holding = createMockHolding({
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      currency: 'TWD',
      shares: 1000,
      marketValue: 1000000,
    });

    const report = calculateLookThroughExposure([holding], 32.0);
    const exp2330 = report.exposures.find((e) => e.symbol === '2330');
    expect(exp2330).toBeDefined();
    expect(exp2330?.sector).toBe('半導體業');
  });

  it('2. behavioralAuditEngine: 凹單天數依批次最早建倉日計算，領股息後不被重置為 1 天', () => {
    const holding = createMockHolding({
      symbol: '2330',
      name: '台積電',
      shares: 1000,
      unrealizedPnLPercent: -20, // 虧損 20%
      intent: 'SWING', // 波段策略
      lastTradeDate: '2026-06-01', // 領息日
      lots: [
        {
          id: 'lot-1',
          buyTradeId: 't-1',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          buyDate: '2026-01-01', // 5 個月前建倉
          buyPrice: 1000,
          originalShares: 1000,
          remainingShares: 1000,
          fee: 142,
          totalCostBasis: 1000142,
          unitCost: 1000.142,
          createdAt: 1000,
        },
      ],
    });

    // 基準日為 2026-06-02
    const alerts = detectBagHoldingPositions([holding], [], '2026-06-02');
    expect(alerts.length).toBe(1);
    // 建倉日 2026-01-01 到 2026-06-02 為 152 天，而非 lastTradeDate 的 1 天
    expect(alerts[0].holdingDays).toBeGreaterThan(60);
    expect(alerts[0].holdingDays).toBe(152);
  });

  it('3. behavioralAuditEngine: 追高與冷靜勝率動態計算，非空樣本時不退回寫死之 35%/65%', () => {
    // 構造交易歷史：追高買進後賣出獲利 1 次 (勝率 100%)
    const trades: TradeRecord[] = [
      {
        id: 't-1',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 900,
        fee: 100,
        tax: 0,
        date: '2026-01-01',
        createdAt: 1000,
        intent: 'SWING',
        riskMetrics: {
          currentPrice: 900,
          riskStatus: 'NORMAL',
          isChasingHigh: true, // 標記為追高
        },
      },
      {
        id: 't-2',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        type: 'SELL',
        shares: 1000,
        price: 1000,
        fee: 100,
        tax: 300,
        date: '2026-02-01',
        createdAt: 2000,
      },
    ];

    const audit = calculateBehavioralAudit([], trades, '2026-06-01');
    expect(audit.fomoEntryAudit.chasingHighTradesCount).toBe(1);
    // 追高買進後以 1000 賣出（獲利），勝率應動態計算為 100%，而非寫死 35.0%
    expect(audit.fomoEntryAudit.chasingHighWinRate).toBe(100);
  });
});

