import { describe, it, expect } from 'vitest';
import { calculatePortfolioExposure } from './riskExposureEngine';
import { HoldingPosition, LoanRecord } from '../types/stock';

describe('整戶總曝險與淨槓桿率計算引擎 (riskExposureEngine)', () => {
  const mockHoldings: HoldingPosition[] = [
    {
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      currency: 'TWD',
      shares: 1000,
      avgCost: 800,
      totalCostBasis: 800000,
      adjustedCostBasis: 800000,
      currentPrice: 1000,
      marketValue: 1000000,
      grossMarketValue: 1000000,
      estimatedSellTax: 3000,
      estimatedSellFee: 1425,
      netMarketValue: 995575,
      unrealizedPnL: 200000,
      unrealizedPnLPercent: 25,
      unrealizedPnLBroker: 195575,
      unrealizedPnLBrokerPercent: 24.45,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalStockDividendsShares: 0,
      totalReturnPnL: 200000,
      totalReturnPercent: 25,
      yieldOnCostPercent: 0,
      lots: [],
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'US',
      currency: 'USD',
      shares: 10,
      avgCost: 200,
      totalCostBasis: 2000,
      adjustedCostBasis: 2000,
      currentPrice: 220,
      marketValue: 2200,
      grossMarketValue: 2200,
      estimatedSellTax: 0,
      estimatedSellFee: 0,
      netMarketValue: 2200,
      unrealizedPnL: 200,
      unrealizedPnLPercent: 10,
      unrealizedPnLBroker: 200,
      unrealizedPnLBrokerPercent: 10,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalStockDividendsShares: 0,
      totalReturnPnL: 200,
      totalReturnPercent: 10,
      yieldOnCostPercent: 0,
      lots: [],
    },
  ];

  const mockUsdRate = 32; // 1 USD = 32 TWD
  // AAPL TWD value = 2200 * 32 = 70,400
  // Total Stock Value = 1,000,000 + 70,400 = 1,070,400 TWD

  it('場景 1: 無借款且現金充裕 (零借貸負債，槓桿率評定為 0.00x 穩健無槓桿 CONSERVATIVE)', () => {
    const res = calculatePortfolioExposure({
      holdings: mockHoldings,
      cashBalances: { TWD: 200000, USD: 1000 }, // 現金 = 200,000 + 32,000 = 232,000 TWD
      loans: [],
      usdToTwdRate: mockUsdRate,
    });

    expect(res.totalStockValueTWD).toBe(1070400);
    expect(res.totalAvailableCashTWD).toBe(232000);
    expect(res.totalDebtTWD).toBe(0);
    expect(res.navTWD).toBe(1302400);
    expect(res.grossExposureTWD).toBe(1070400);
    expect(res.grossLeverage).toBe(0);
    expect(res.netLeverage).toBe(0);
    expect(res.riskTier).toBe('CONSERVATIVE');
    expect(res.isUnderwater).toBe(false);
  });

  it('場景 2: 溫和質押槓桿 (1.0x < 淨槓桿 <= 1.3x，評定為 MODERATE)', () => {
    const mockLoans: LoanRecord[] = [
      {
        id: 'loan-1',
        name: '台股質押借款',
        loanType: 'PLEDGE',
        currency: 'TWD',
        principal: 202000,
        createdAt: 1000,
      },
    ];

    const res = calculatePortfolioExposure({
      holdings: mockHoldings,
      cashBalances: { TWD: 50000, USD: 0 },
      loans: mockLoans,
      usdToTwdRate: mockUsdRate,
    });

    expect(res.totalDebtTWD).toBe(202000);
    expect(res.navTWD).toBe(918400);
    expect(res.netLeverage).toBeCloseTo(1.1111, 3);
    expect(res.riskTier).toBe('MODERATE');
  });

  it('場景 2.1: 負債精準包含應計利息與設質規費 (本利和規費扣減 NAV)', () => {
    const mockLoans: LoanRecord[] = [
      {
        id: 'loan-1',
        name: '台股質押借款含息費',
        loanType: 'PLEDGE',
        currency: 'TWD',
        principal: 200000,
        annualInterestRate: 3.65,
        startDate: '2026-05-01',
        transferFee: 100,
        pledgeRegistryFee: 100,
        handlingFee: 0,
        createdAt: 1000,
      },
    ];

    // 計息 10 天 (2026-05-01 到 2026-05-11)：200,000 * (0.0365/365) * 10 = 200
    // 規費：100 + 100 = 200
    // 本利和規費總負債：200,000 + 200 + 200 = 200,400
    const res = calculatePortfolioExposure({
      holdings: mockHoldings,
      cashBalances: { TWD: 50000, USD: 0 },
      loans: mockLoans,
      usdToTwdRate: mockUsdRate,
      asOfDate: '2026-05-11',
    });

    expect(res.totalDebtTWD).toBe(200400);
    expect(res.navTWD).toBe(1070400 + 50000 - 200400); // 920,000
    expect(res.riskTier).toBe('MODERATE');
  });

  it('場景 3: 積極擴張槓桿 (1.3x < 淨槓桿 <= 1.6x，評定為 ELEVATED)', () => {
    const mockLoans: LoanRecord[] = [
      {
        id: 'loan-1',
        name: '台股質押借款',
        loanType: 'PLEDGE',
        currency: 'TWD',
        principal: 350000,
        createdAt: 1000,
      },
    ];

    const res = calculatePortfolioExposure({
      holdings: mockHoldings,
      cashBalances: { TWD: 20000, USD: 0 },
      loans: mockLoans,
      usdToTwdRate: mockUsdRate,
    });

    expect(res.netLeverage).toBeCloseTo(1.4187, 3);
    expect(res.riskTier).toBe('ELEVATED');
  });

  it('場景 4: 高度危險槓桿 (淨槓桿 > 1.6x，評定為 HIGH_RISK)', () => {
    const mockLoans: LoanRecord[] = [
      {
        id: 'loan-1',
        name: '台股質押借款',
        loanType: 'PLEDGE',
        currency: 'TWD',
        principal: 600000,
        createdAt: 1000,
      },
    ];

    const res = calculatePortfolioExposure({
      holdings: mockHoldings,
      cashBalances: { TWD: 10000, USD: 0 },
      loans: mockLoans,
      usdToTwdRate: mockUsdRate,
    });

    expect(res.netLeverage).toBeCloseTo(2.2073, 3);
    expect(res.riskTier).toBe('HIGH_RISK');
  });

  it('場景 5: 在途資金整合測試 (應收/應付扣抵)', () => {
    const inTransit = {
      totalReceivableTWD: 50000,
      totalPayableTWD: 20000,
      netSettlementTWD: 30000,
    };

    const res = calculatePortfolioExposure({
      holdings: mockHoldings,
      cashBalances: { TWD: 100000, USD: 0 },
      inTransitSummary: inTransit,
      loans: [],
      usdToTwdRate: mockUsdRate,
    });

    expect(res.totalAvailableCashTWD).toBe(130000);
    expect(res.navTWD).toBe(1070400 + 130000);
  });

  it('場景 6: 極端邊界防禦 (真實負債且 NAV <= 0 資不抵債時判定為 HIGH_RISK 且 99.99x)', () => {
    const mockLoans: LoanRecord[] = [
      {
        id: 'loan-1',
        name: '台股質押借款',
        loanType: 'PLEDGE',
        currency: 'TWD',
        principal: 2000000,
        createdAt: 1000,
      },
    ];

    const res = calculatePortfolioExposure({
      holdings: mockHoldings, // 1,070,400
      cashBalances: { TWD: 0, USD: 0 },
      loans: mockLoans, // 2,000,000
      usdToTwdRate: mockUsdRate,
    });

    expect(res.navTWD).toBe(1070400 - 2000000); // -929,600
    expect(res.isUnderwater).toBe(true);
    expect(res.riskTier).toBe('HIGH_RISK');
    expect(res.netLeverage).toBe(99.99);
    expect(Number.isFinite(res.grossLeverage)).toBe(true);
    expect(Number.isFinite(res.netLeverage)).toBe(true);
  });

  it('場景 7: 零借貸負債現貨保護 (無任何貸款負債，未補錄入金導致現金為負數時，槓桿率評定為 0.00x 穩健無槓桿)', () => {
    const res = calculatePortfolioExposure({
      holdings: [mockHoldings[1]], // 僅持有 AAPL 2,200 USD (70,400 TWD)
      cashBalances: { TWD: 0, USD: -5000 }, // 現金為負數 (因買入股票扣款但未補錄入金)
      loans: [], // 無任何負債
      usdToTwdRate: mockUsdRate,
    });

    // 零負債時，不應判定為資不抵債 99.99x，應判定為現貨足額持有 0.00x 槓桿
    expect(res.totalDebtTWD).toBe(0);
    expect(res.netLeverage).toBe(0);
    expect(res.grossLeverage).toBe(0);
    expect(res.riskTier).toBe('CONSERVATIVE');
    expect(res.isUnderwater).toBe(false);
  });

  it('場景 8: 美股單一市場視圖隔離測試 (美股現貨持有，全戶台股負現金不污染美股槓桿)', () => {
    const res = calculatePortfolioExposure({
      holdings: [mockHoldings[1]], // 僅美股 AAPL
      cashBalances: { TWD: 0, USD: 100 }, // 僅美股現金
      loans: [],
      usdToTwdRate: mockUsdRate,
    });

    expect(res.totalDebtTWD).toBe(0);
    expect(res.netLeverage).toBe(0);
    expect(res.riskTier).toBe('CONSERVATIVE');
  });
});

