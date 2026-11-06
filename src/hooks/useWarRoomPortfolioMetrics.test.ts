import { describe, it, expect } from 'vitest';
import {
  calculateWarRoomPortfolioMetrics,
  useWarRoomPortfolioMetrics,
} from './useWarRoomPortfolioMetrics';
import { HoldingPosition, LoanRecord } from '../types/stock';

describe('useWarRoomPortfolioMetrics - 戰情室投組風控指標與防禦護盾 (Ticket 02 / TD 0055)', () => {
  const baseHoldings: HoldingPosition[] = [
    {
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      shares: 1000,
      avgCost: 900,
      currentPrice: 1000,
      currency: 'TWD',
      totalCostBasis: 900000,
      adjustedCostBasis: 900000,
      marketValue: 1000000,
      grossMarketValue: 1000000,
      estimatedSellTax: 3000,
    } as unknown as HoldingPosition,
    {
      symbol: 'AAPL',
      name: 'Apple',
      market: 'US',
      shares: 10,
      avgCost: 200,
      currentPrice: 220,
      currency: 'USD',
      totalCostBasis: 2000,
      adjustedCostBasis: 2000,
      marketValue: 2200,
      grossMarketValue: 2200,
      estimatedSellTax: 0,
    } as unknown as HoldingPosition,
  ];

  it('1. 在無質押借貸的情境下，應正確計算資產淨值、自由發射彈藥並標記維持率為 NO_LOAN', () => {
    const result = calculateWarRoomPortfolioMetrics({
      holdings: baseHoldings,
      loans: [],
      cashBalanceTwd: 500000,
      totalNavTwd: 1570400,
      usdToTwdRate: 32.0,
      pendingSettlementOutflowTwd: 50000,
      dcaCommitment7dTwd: 20000,
      vix: 16.5,
    });

    expect(result.shield).toBeDefined();
    // 自由可動用發射彈藥 = 現金 500000 - 未交割 50000 - 7日DCA 20000 = 430000
    expect(result.shield.freeDeployableCashTWD).toBe(430000);
    expect(result.shield.hasLoans).toBe(false);
    expect(result.shield.marginMaintenanceRatio).toBeNull(); // 無質押無維持率
    expect(result.shield.marginStatus).toBe('NO_LOAN');
    expect(result.lookThroughReport).toBeDefined();
    expect(result.lookThroughReport.exposures.length).toBeGreaterThan(0);
  });

  it('2. 在存在質押借貸時，應精確彙總質押債務與擔保品現值，並計算維持率與跌幅耐受度', () => {
    const pledgedLoans: LoanRecord[] = [
      {
        id: 'l1',
        loanType: 'PLEDGE',
        name: '元大證券',
        principal: 400000,
        currency: 'TWD',
        interestRate: 2.2,
        startDate: '2026-01-01',
        pledgedCollateral: [
          { symbol: '2330', shares: 800 }, // 800 * 1000 = 800000 擔保品市值
        ],
      } as unknown as LoanRecord,
    ];

    const result = calculateWarRoomPortfolioMetrics({
      holdings: baseHoldings,
      loans: pledgedLoans,
      cashBalanceTwd: 100000,
      totalNavTwd: 1500000,
      usdToTwdRate: 32.0,
      pendingSettlementOutflowTwd: 0,
      dcaCommitment7dTwd: 0,
      vix: 18.0,
    });

    // 總質押債務 = 400000, 擔保品現值 = 800 * 1000 = 800000
    // 維持率 = 800000 / 400000 * 100 = 200%
    expect(result.shield.hasLoans).toBe(true);
    expect(result.shield.marginMaintenanceRatio).toBe(200);
    expect(result.shield.marginStatus).toBe('SAFE');
    // 距 130% 斷頭耐受度應有數值
    expect(result.shield.maxDropToleranceTo130Percent).toBeDefined();
    expect(result.shield.maxDropToleranceTo130Percent).toBeGreaterThan(0);
  });

  it('3. 美股部位加權成本匯率與匯差緩衝墊應正確納入計算', () => {
    const result = calculateWarRoomPortfolioMetrics({
      holdings: baseHoldings,
      loans: [],
      cashBalanceTwd: 200000,
      totalNavTwd: 1300000,
      usdToTwdRate: 32.5,
    });

    expect(result.shield.usWeightedCostFxRate).toBeDefined();
    expect(typeof result.shield.usFxCushionTWD).toBe('number');
  });

  it('4. 自由彈藥扣除交割款與 DCA 承諾金若超過現金餘額，應安全下限為 0', () => {
    const result = calculateWarRoomPortfolioMetrics({
      holdings: baseHoldings,
      loans: [],
      cashBalanceTwd: 10000,
      totalNavTwd: 1000000,
      usdToTwdRate: 32.0,
      pendingSettlementOutflowTwd: 20000, // 超過現金
      dcaCommitment7dTwd: 5000,
    });

    expect(result.shield.freeDeployableCashTWD).toBe(0);
  });

  it('5. Hook 函式簽名應可被正常引用', () => {
    expect(typeof useWarRoomPortfolioMetrics).toBe('function');
  });
});
