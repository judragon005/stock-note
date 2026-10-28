import { describe, it, expect } from 'vitest';
import { calculatePortfolioExposure, calculateActiveMarginDebt } from './riskExposureEngine';
import { HoldingPosition, TradeRecord } from '../types/stock';

describe('Ticket 05: 融資買進負債對齊與淨曝險比率重構 (Spec 0208)', () => {
  it('calculateActiveMarginDebt 應精確計算在席融資買進之未償還券商負債', () => {
    // 買進 10,000 股 2330 @ 1,000 元，融資自備款 40% (負債 60% = 6,000,000)
    // 融資賣出 5,000 股 2330 (沖銷一半融資負債，剩餘負債 3,000,000)
    const marginTrades: TradeRecord[] = [
      {
        id: 't-mbuy-1',
        date: '2026-01-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        isMargin: true,
        marginRate: 0.4,
        shares: 10000,
        price: 1000,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't-msell-1',
        date: '2026-02-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'SELL',
        isMargin: true,
        shares: 5000,
        price: 1100,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const marginDebt = calculateActiveMarginDebt(marginTrades, 32.0);
    expect(marginDebt).toBe(3000000);
  });

  it('全現股無融資借貸時，槓桿指標應顯示 1.00x (淨曝險比率 100.0%)，而非 0.00x', () => {
    const holdings: HoldingPosition[] = [
      {
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        shares: 1000,
        avgCost: 1000,
        totalCostBasis: 1000000,
        adjustedCostBasis: 1000000,
        currentPrice: 1000,
        marketValue: 1000000,
        grossMarketValue: 1000000,
        estimatedSellTax: 3000,
        estimatedSellFee: 1425,
        netMarketValue: 995575,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        unrealizedPnLBroker: -4425,
        unrealizedPnLBrokerPercent: -0.44,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: 0,
        totalReturnPercent: 0,
        yieldOnCostPercent: 0,
      },
    ];

    const result = calculatePortfolioExposure({
      holdings,
      cashBalances: { TWD: 0, USD: 0 },
      loans: [],
      usdToTwdRate: 32.0,
    });

    expect(result.totalStockValueTWD).toBe(1000000);
    expect(result.effectiveNavTWD).toBe(1000000);
    expect(result.totalDebtTWD).toBe(0);
    // 過去硬設為 0.00x，現在應為標準的 1.00x
    expect(result.grossLeverage).toBeCloseTo(1.0, 2);
    expect(result.netLeverage).toBeCloseTo(1.0, 2);
    expect(result.netExposureRatioPercent).toBeCloseTo(100.0, 1);
    expect(result.riskTier).toBe('CONSERVATIVE');
  });

  it('若存在在席融資買進負債，應全額計入 totalDebtTWD 並扣減 NAV', () => {
    const holdings: HoldingPosition[] = [
      {
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        shares: 10000,
        avgCost: 1000,
        totalCostBasis: 4000000, // 自備款 40%
        adjustedCostBasis: 4000000,
        currentPrice: 1000,
        marketValue: 10000000,
        grossMarketValue: 10000000,
        estimatedSellTax: 30000,
        estimatedSellFee: 14250,
        netMarketValue: 9955750,
        unrealizedPnL: 6000000,
        unrealizedPnLPercent: 150,
        unrealizedPnLBroker: 5955750,
        unrealizedPnLBrokerPercent: 148.89,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: 6000000,
        totalReturnPercent: 150,
        yieldOnCostPercent: 0,
      },
    ];

    const marginTrades: TradeRecord[] = [
      {
        id: 't-mbuy-2',
        date: '2026-01-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        isMargin: true,
        marginRate: 0.4,
        shares: 10000,
        price: 1000,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
    ];

    const result = calculatePortfolioExposure({
      holdings,
      cashBalances: { TWD: 0, USD: 0 },
      loans: [],
      usdToTwdRate: 32.0,
      trades: marginTrades,
    });

    // 總負債應包含融資借款 6,000,000 元
    expect(result.totalDebtTWD).toBe(6000000);
    // NAV = 10,000,000 - 6,000,000 = 4,000,000
    expect(result.effectiveNavTWD).toBe(4000000);
    // 槓桿 = 10,000,000 / 4,000,000 = 2.5x
    expect(result.grossLeverage).toBeCloseTo(2.5, 2);
  });
});
