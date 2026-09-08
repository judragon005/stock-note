import { describe, it, expect } from 'vitest';
import {
  evaluateMarginStressMatrix,
  solveLiquidationThresholds,
  calculateEmergencyEscapePlan,
} from './marginStressMatrixEngine';
import { HoldingPosition, LoanRecord } from '../types/stock';
import { DEFAULT_STRESS_SCENARIOS } from '../types/marginStress';

describe('MarginStressMatrixEngine (TDD Seam)', () => {
  const mockUsdToTwdRate = 32.0;

  const createHolding = (
    symbol: string,
    name: string,
    shares: number,
    currentPrice: number,
    currency: 'TWD' | 'USD' = 'TWD'
  ): HoldingPosition => ({
    symbol,
    name,
    market: currency === 'USD' ? 'US' : 'TW',
    currency,
    shares,
    avgCost: currentPrice,
    totalCostBasis: currentPrice * shares,
    adjustedCostBasis: currentPrice * shares,
    currentPrice,
    marketValue: currentPrice * shares,
    grossMarketValue: currentPrice * shares,
    estimatedSellTax: 0,
    estimatedSellFee: 0,
    netMarketValue: currentPrice * shares,
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
  });

  const createLoan = (
    id: string,
    principal: number,
    collateral: { symbol: string; shares: number }[],
    currency: 'TWD' | 'USD' = 'TWD'
  ): LoanRecord => ({
    id,
    name: '元大台積電股票質押',
    loanType: 'PLEDGE',
    principal,
    annualInterestRate: 2.5,
    startDate: '2026-01-01',
    currency,
    pledgedCollateral: collateral,
    createdAt: 1700000000000,
  });

  describe('1. 無借款邊界防禦測試', () => {
    it('當無任何有效借款時，應安全回傳 0 維持率與空矩陣，不拋出錯誤', () => {
      const holdings = [createHolding('2330', '台積電', 1000, 1000)];
      const result = evaluateMarginStressMatrix({
        holdings,
        loans: [],
        usdToTwdRate: mockUsdToTwdRate,
      });

      expect(result.hasLoans).toBe(false);
      expect(result.totalLoanDebtTWD).toBe(0);
      expect(result.currentMaintenanceRatio).toBe(0);
      expect(result.currentStatusInfo.status).toBe('SAFE');
      expect(result.rows).toHaveLength(DEFAULT_STRESS_SCENARIOS.length);
      expect(result.liquidationThresholds).toHaveLength(0);
      expect(result.escapePlanFor166.isAlreadySafe).toBe(true);
    });
  });

  describe('2. 單一擔保品與標準壓力矩陣運算', () => {
    it('應精確計算各壓力情境維持率與除權息跳水扣減', () => {
      // 借款 1,000,000 元，質押台積電 2,000 股 @ 1,000 元 => 初始市值 2,000,000 元，維持率 200%
      const holdings = [createHolding('2330', '台積電', 2000, 1000)];
      const loans = [createLoan('loan-1', 1000000, [{ symbol: '2330', shares: 2000 }])];

      const result = evaluateMarginStressMatrix({
        holdings,
        loans,
        usdToTwdRate: mockUsdToTwdRate,
        dividendPerShareMap: { '2330': 10 }, // 每股預計除息 10 元
      });

      expect(result.hasLoans).toBe(true);
      expect(result.totalLoanDebtTWD).toBe(1000000);
      expect(result.currentCollateralValueTWD).toBe(2000000);
      expect(result.currentMaintenanceRatio).toBe(200);
      expect(result.currentStatusInfo.status).toBe('HEALTHY'); // 200% 落在 160%~200% HEALTHY

      // 驗證 6 種標準情境
      const rowCorrection5 = result.rows.find((r) => r.scenario.id === 'CORRECTION_5')!;
      expect(rowCorrection5.stressedCollateralValueTWD).toBe(1900000);
      expect(rowCorrection5.stressedMaintenanceRatio).toBe(190);
      expect(rowCorrection5.dropInRatioPoints).toBe(-10);

      const rowCorrection10 = result.rows.find((r) => r.scenario.id === 'CORRECTION_10')!;
      expect(rowCorrection10.stressedCollateralValueTWD).toBe(1800000);
      expect(rowCorrection10.stressedMaintenanceRatio).toBe(180);

      const rowBear20 = result.rows.find((r) => r.scenario.id === 'BEAR_20')!;
      expect(rowBear20.stressedCollateralValueTWD).toBe(1600000);
      expect(rowBear20.stressedMaintenanceRatio).toBe(160);
      expect(rowBear20.statusInfo.status).toBe('HEALTHY'); // 160% 剛好位在健康水位下限

      // 純除息跳水：每股 1000 - 10 = 990 元 => 市值 1,980,000 元 => 維持率 198%
      const rowExDiv = result.rows.find((r) => r.scenario.id === 'EX_DIVIDEND_ONLY')!;
      expect(rowExDiv.stressedCollateralValueTWD).toBe(1980000);
      expect(rowExDiv.stressedMaintenanceRatio).toBe(198);

      // 複合情境 (-20% + 除息 10 元)：(1000 - 10) * 0.8 = 792 元 => 市值 1,584,000 元 => 維持率 158.4%
      const rowCompound = result.rows.find((r) => r.scenario.id === 'COMPOUND_BLACK_SWAN')!;
      expect(rowCompound.stressedCollateralValueTWD).toBe(1584000);
      expect(rowCompound.stressedMaintenanceRatio).toBeCloseTo(158.4, 1);
      expect(rowCompound.statusInfo.status).toBe('WARNING'); // 158.4% < 160% 進入警戒水位
    });
  });

  describe('3. 斷頭臨界價格逆推求解器 (solveLiquidationThresholds)', () => {
    it('單一標的質押時，應精確逆推 130%、140% 與 166% 臨界股價與最大耐受跌幅', () => {
      // 借款 1,000,000 元，質押台積電 2,000 股 @ 1,000 元
      const holdings = [createHolding('2330', '台積電', 2000, 1000)];
      const pledgedMap = new Map<string, number>([['2330', 2000]]);

      const thresholds = solveLiquidationThresholds(holdings, pledgedMap, 1000000, mockUsdToTwdRate);

      expect(thresholds).toHaveLength(1);
      const t = thresholds[0];
      expect(t.symbol).toBe('2330');
      expect(t.currentPrice).toBe(1000);
      expect(t.collateralWeightPercent).toBe(100);

      // 130% 斷頭價: 1.30 * 1,000,000 / 2,000 = 650 元
      expect(t.priceAt130MarginCall).toBe(650);
      // 140% 預警價: 1.40 * 1,000,000 / 2,000 = 700 元
      expect(t.priceAt140Warning).toBe(700);
      // 166% 安全價: 1.66 * 1,000,000 / 2,000 = 830 元
      expect(t.priceAt166Healthy).toBe(830);

      // 耐受跌幅: (1000 - 650) / 1000 = 0.35 (35%)
      expect(t.maxDropPercentTo130).toBeCloseTo(0.35, 3);
      expect(t.isImmuneToLiquidation).toBe(false);
    });

    it('多標的質押且其餘擔保品已超過 130% 時，次要標的應判定為免疫 (Immune)', () => {
      // 總借款 1,000,000 元，130% 門檻為 1,300,000 元
      // 標的 A (鴻海): 10,000 股 @ 150 元 = 1,500,000 元
      // 標的 B (0050): 5,000 股 @ 100 元 = 500,000 元
      // 當分析 0050 時，其餘擔保品 (鴻海 1,500,000 元) 已大於 1,300,000 元！
      // 故 0050 即使暴跌歸零，整戶亦不會觸及 130% 斷頭追繳！
      const holdings = [
        createHolding('2317', '鴻海', 10000, 150),
        createHolding('0050', '元大台灣50', 5000, 100),
      ];
      const pledgedMap = new Map<string, number>([
        ['2317', 10000],
        ['0050', 5000],
      ]);

      const thresholds = solveLiquidationThresholds(holdings, pledgedMap, 1000000, mockUsdToTwdRate);
      const item0050 = thresholds.find((t) => t.symbol === '0050')!;

      expect(item0050.isImmuneToLiquidation).toBe(true);
      expect(item0050.priceAt130MarginCall).toBe(0);
      expect(item0050.maxDropPercentTo130).toBe(1.0); // 可承受 100% 跌幅
    });
  });

  describe('4. 斷頭逃生雙軌方案求解器 (calculateEmergencyEscapePlan)', () => {
    it('當維持率低於目標水位時，應精確計算償還本金、補充擔保品與加質股數', () => {
      // 借款 1,000,000 元，當前擔保品市值 1,500,000 元 (維持率 150%)
      // 目標安全水位 166% (M = 1.66)
      const holdings = [createHolding('2330', '台積電', 1000, 1000)];
      const plan = calculateEmergencyEscapePlan({
        currentCollateralValueTWD: 1500000,
        totalLoanDebtTWD: 1000000,
        targetRatio: 166,
        holdings,
        usdToTwdRate: mockUsdToTwdRate,
      });

      expect(plan.isAlreadySafe).toBe(false);
      expect(plan.currentRatio).toBe(150);

      // 方案 A: 償還借款本金 = 1,000,000 - 1,500,000 / 1.66 = 1,000,000 - 903,614.46 = 96,386 元
      expect(plan.repayPrincipalCashTWD).toBe(96386);

      // 方案 B: 補充現金擔保品 = 1.66 * 1,000,000 - 1,500,000 = 1,660,000 - 1,500,000 = 160,000 元
      expect(plan.depositCashCollateralTWD).toBe(160000);

      // 方案 C: 加質台積電 @ 1,000 元 => 需要 ceil(160,000 / 1000) = 160 股
      const tsmcSharePlan = plan.additionalSharesRequired.find((s) => s.symbol === '2330')!;
      expect(tsmcSharePlan.shares).toBe(160);
      expect(tsmcSharePlan.addedValueTWD).toBe(160000);
    });

    it('當維持率已高於目標水位時，各項補款金額應皆為 0 且標記為已安全', () => {
      const holdings = [createHolding('2330', '台積電', 2000, 1000)];
      const plan = calculateEmergencyEscapePlan({
        currentCollateralValueTWD: 2000000,
        totalLoanDebtTWD: 1000000,
        targetRatio: 166,
        holdings,
        usdToTwdRate: mockUsdToTwdRate,
      });

      expect(plan.isAlreadySafe).toBe(true);
      expect(plan.repayPrincipalCashTWD).toBe(0);
      expect(plan.depositCashCollateralTWD).toBe(0);
      expect(plan.additionalSharesRequired).toHaveLength(0);
    });
  });
});
