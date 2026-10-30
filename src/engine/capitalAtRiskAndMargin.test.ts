import { describe, it, expect } from 'vitest';
import { calculateHoldingsAttribution } from './attributionEngine';
import { calculateHoldingsAndSummary } from './calculator';
import { HoldingPosition, TradeRecord } from '../types/stock';

const createMockHolding = (partial: Partial<HoldingPosition>): HoldingPosition => ({
  symbol: '2330',
  name: '台積電',
  market: 'TW',
  currency: 'TWD',
  shares: 1000,
  originalBuyShares: 1000,
  avgCost: 800,
  totalCostBasis: 800000,
  adjustedCostBasis: 800000,
  currentPrice: 900,
  marketValue: 900000,
  grossMarketValue: 900000,
  estimatedSellTax: 2700,
  estimatedSellFee: 1282,
  netMarketValue: 896018,
  unrealizedPnL: 100000,
  unrealizedPnLPercent: 12.5,
  unrealizedPnLBroker: 96018,
  unrealizedPnLBrokerPercent: 12.0,
  realizedPnL: 0,
  totalDividends: 0,
  totalCapitalReturned: 0,
  totalStockDividendsShares: 0,
  totalReturnPnL: 100000,
  totalReturnPercent: 12.5,
  historicalTotalInvestedCost: 800000,
  yieldOnCostPercent: 0,
  isClosed: false,
  accountingMethod: 'MOVING_AVERAGE',
  openLotsCount: 1,
  lots: [],
  intent: 'SWING',
  ...partial,
});

describe('Spec 0208 Third Review Fixes: Capital at Risk & Margin Accounting', () => {
  it('1. attributionEngine: totalCapitalAtRiskTWD 應依據停損價差真實計算，而非直接等於總市值', () => {
    // 標的 A: 台積電 1000 股，現價 900，設定停損價 800 -> 風險為 (900 - 800) * 1000 = 100,000 TWD
    const holdingWithStopLoss = createMockHolding({
      symbol: '2330',
      shares: 1000,
      currentPrice: 900,
      marketValue: 900000,
      riskMetrics: {
        riskStatus: 'NORMAL',
        stopLossPrice: 800,
      },
    });

    // 標的 B: 聯發科 1000 股，現價 1000，未設停損 -> 不強加假定 10% 市價，納入未設停損統計
    const holdingDefaultRisk = createMockHolding({
      symbol: '2454',
      name: '聯發科',
      shares: 1000,
      currentPrice: 1000,
      marketValue: 1000000,
      riskMetrics: undefined,
    });

    const report = calculateHoldingsAttribution([holdingWithStopLoss, holdingDefaultRisk], 32.0);

    // 總市值為 1,900,000 TWD
    expect(report.totalMarketValueTWD).toBe(1900000);

    // 真實在險資本為 100,000 TWD (僅計設有停損價者)，未設停損者統計為 1 檔
    expect(report.totalCapitalAtRiskTWD).toBe(100000);
    expect(report.unhedgedPositionsCount).toBe(1);
    expect(report.totalCapitalAtRiskTWD).toBeLessThan(report.totalMarketValueTWD);
  });

  it('2. calculator.ts: calculateHoldingsSummary 應正確將 MARGIN_BUY 之本金自備款計入歷史總投入成本', () => {
    const marginTrade: TradeRecord = {
      id: 'm-1',
      date: '2026-01-10',
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      currency: 'TWD',
      type: 'MARGIN_BUY',
      shares: 1000,
      price: 1000, // 總額 1,000,000
      fee: 1425,
      tax: 0,
      marginRate: 0.4, // 自備款 40% = 400,000
      createdAt: 1000,
    };

    const summary = calculateHoldingsAndSummary([marginTrade], {}, 32.0);
    const h = summary.holdings.find((x) => x.symbol === '2330');

    expect(h).toBeDefined();
    expect(h?.shares).toBe(1000);
    // 歷史總投入自備成本應為 1,000,000 * 0.4 + 1425 = 401,425 TWD
    expect(h?.historicalTotalInvestedCost).toBe(401425);
  });
});
