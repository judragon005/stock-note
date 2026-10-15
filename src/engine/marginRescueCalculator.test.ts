import { describe, it, expect } from 'vitest';
import {
  calculateMarginRescuePlan,
  calculateUnpledgeRequirement,
  MarginRescueInput,
} from './marginRescueCalculator';

describe('Spec 0183 Ticket 03: marginRescueCalculator (質押維持率急救補水與解質試算)', () => {
  it('1. 當維持率偏低時，應正確計算補足至目標維持率 (如 160%) 所需的現金或擔保品市值', () => {
    // 借款本金 100 萬，目前擔保股市值 135 萬 (維持率 135%)
    // 目標維持率 160% (1.6)
    // 算式：
    // 維持率公式：(擔保市值 + 補繳現金) / (借款本金 - 補繳現金*0? 通常補繳現金直接算作擔保品增加，或者作為償還本金)
    // 台灣券商標準維持率公式：擔保品市值 / 融資借款金額
    // 若以「增加擔保品市值」：需達 100萬 * 1.6 = 160萬，即需增加 25 萬擔保品
    // 若以「償還借款本金」：135萬 / (100萬 - 還款) >= 1.6 => 100萬 - 還款 <= 135萬 / 1.6 = 843,750 => 需還款 156,250
    // 若以「補入現金當擔保品」：(135萬 + 現金) / 100萬 >= 1.6 => 需補現金 25 萬
    const input: MarginRescueInput = {
      totalLoanPrincipalTwd: 1000000,
      totalCollateralValueTwd: 1350000,
      targetMarginRatio: 1.6, // 160%
    };

    const plan = calculateMarginRescuePlan(input);

    expect(plan.currentMarginRatio).toBeCloseTo(1.35, 2);
    expect(plan.targetMarginRatio).toBe(1.6);
    expect(plan.isCurrentlySafe).toBe(false);

    // 補繳現金作為抵押物，需補 25 萬
    expect(plan.requiredCashAsCollateralTwd).toBe(250000);
    // 或是直接還款本金，需還 156,250 元
    expect(plan.requiredPayoffPrincipalTwd).toBe(156250);
    // 需補擔保股市值 25 萬
    expect(plan.requiredAdditionalCollateralValueTwd).toBe(250000);
  });

  it('2. 邊界測試：當目前維持率已高於目標維持率時，補繳金額應為 0，嚴禁負數', () => {
    const input: MarginRescueInput = {
      totalLoanPrincipalTwd: 1000000,
      totalCollateralValueTwd: 2000000, // 200%
      targetMarginRatio: 1.6, // 160%
    };

    const plan = calculateMarginRescuePlan(input);

    expect(plan.currentMarginRatio).toBe(2.0);
    expect(plan.isCurrentlySafe).toBe(true);
    expect(plan.requiredCashAsCollateralTwd).toBe(0);
    expect(plan.requiredPayoffPrincipalTwd).toBe(0);
    expect(plan.requiredAdditionalCollateralValueTwd).toBe(0);
  });

  it('3. 股票解質試算：計算領回部分質押股票時，最少需先償還多少現金本金', () => {
    // 借款本金 100 萬，目前擔保市值 180 萬 (維持率 180%)
    // 欲解質領回 1 張台積電 (市值 100 萬)
    // 領回後剩餘擔保品市值 = 180萬 - 100萬 = 80 萬
    // 若要求解質後維持率仍至少為 130% (警戒線)：
    // 80 萬 / (100萬 - 還本) >= 1.3 => 100萬 - 還本 <= 80萬 / 1.3 = 615,385 => 需先還本金 384,615 元
    const result = calculateUnpledgeRequirement({
      totalLoanPrincipalTwd: 1000000,
      totalCollateralValueTwd: 1800000,
      unpledgeStockMarketValueTwd: 1000000,
      minimumSafeMarginRatio: 1.3, // 130%
    });

    expect(result.remainingCollateralValueTwd).toBe(800000);
    expect(result.canUnpledgeDirectlyWithoutPayoff).toBe(false);
    expect(Math.round(result.requiredPrincipalRepayTwd)).toBe(384616);
  });

  it('4. 股票解質試算：當剩餘擔保品仍非常充足時，可直接無痛解質，無需先還款', () => {
    // 借款本金 10 萬，擔保市值 200 萬 (維持率 2000%)
    // 解質 50 萬，剩餘 150 萬
    // 150 萬 / 10 萬 = 1500% > 130% => 無需還本
    const result = calculateUnpledgeRequirement({
      totalLoanPrincipalTwd: 100000,
      totalCollateralValueTwd: 2000000,
      unpledgeStockMarketValueTwd: 500000,
      minimumSafeMarginRatio: 1.3,
    });

    expect(result.canUnpledgeDirectlyWithoutPayoff).toBe(true);
    expect(result.requiredPrincipalRepayTwd).toBe(0);
  });
});
