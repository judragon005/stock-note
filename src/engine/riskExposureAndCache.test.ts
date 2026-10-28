import { describe, it, expect } from 'vitest';
import { calculatePortfolioExposure, calculateActiveMarginDebt } from './riskExposureEngine';
import { calculatePortfolioXirr } from './xirrCalculator';
import { HoldingPosition, TradeRecord } from '../types/stock';

describe('Ticket 05: 融資買進負債對齊與淨曝險比率重構 (Spec 0208)', () => {
  it('calculateActiveMarginDebt 應精確計算在席融資買進之未償還券商負債', () => {
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
        totalCostBasis: 4000000,
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

    expect(result.totalDebtTWD).toBe(6000000);
    expect(result.effectiveNavTWD).toBe(4000000);
    expect(result.grossLeverage).toBeCloseTo(2.5, 2);
  });
});

describe('Ticket 06: 首屏快取日 K 水合與 XIRR 匯率期末資產修復 (Spec 0208)', () => {
  it('calculatePortfolioXirr 應正確採用 fxMap 歷史匯率折算美元入金，而非退回 32.0', () => {
    // 2026-01-01 存入 1,000 USD，當日匯率 30.0 (30,000 TWD)
    // 2026-06-01 期末 NAV 45,000 TWD
    const cashTransactions = [
      {
        id: 'c-dep-usd',
        accountId: 'broker-us-1',
        date: '2026-01-01',
        amount: 1000,
        currency: 'USD' as const,
        type: 'DEPOSIT' as const,
        category: 'DEPOSIT' as const,
        createdAt: 1,
      },
    ];

    const fxMap = {
      '2026-01-01': 30.0,
      '2026-06-01': 30.0,
    };

    const res = calculatePortfolioXirr({
      cashTransactions,
      trades: [],
      terminalNAV: 45000,
      baseCurrency: 'TWD',
      today: '2026-06-01',
      fxMap,
    });

    // 投資 30,000 半年後成長至 45,000，回報率應為顯著正數 (非零)
    expect(res.ratePercent).toBeGreaterThan(0);
    const flow = res.cashFlows?.find((f) => f.category === 'DEPOSIT');
    expect(flow).toBeDefined();
    // 1,000 USD * 30.0 = -30,000 TWD (入金為負流出)
    expect(flow?.amount).toBe(-30000);
  });
});
