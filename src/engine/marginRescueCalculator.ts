/**
 * marginRescueCalculator.ts
 * Spec 0183 (Ticket 03): 質押維持率急救補水與解質最小還款計算器
 * 純前端算力，零外部 API 依賴
 */

export interface MarginRescueInput {
  totalLoanPrincipalTwd: number; // 借款本金 (TWD)
  totalCollateralValueTwd: number; // 擔保品總市值 (TWD)
  targetMarginRatio?: number; // 目標安全維持率 (預設 1.6 即 160%)
}

export interface MarginRescuePlan {
  currentMarginRatio: number;
  targetMarginRatio: number;
  isCurrentlySafe: boolean;
  requiredCashAsCollateralTwd: number; // 需補入現金作為擔保物
  requiredPayoffPrincipalTwd: number; // 或是直接償還借款本金
  requiredAdditionalCollateralValueTwd: number; // 或是需增加之抵押股票市值
}

export interface UnpledgeRequirementInput {
  totalLoanPrincipalTwd: number;
  totalCollateralValueTwd: number;
  unpledgeStockMarketValueTwd: number; // 擬領回解質之股票市值
  minimumSafeMarginRatio?: number; // 解質後最低安全維持率 (預設 1.3 即 130%)
}

export interface UnpledgeRequirementResult {
  remainingCollateralValueTwd: number;
  canUnpledgeDirectlyWithoutPayoff: boolean;
  requiredPrincipalRepayTwd: number; // 需先還款之本金額度
  postUnpledgeMarginRatio: number; // 還款後的預期維持率
}

/**
 * 計算維持率急救補水計畫
 */
export function calculateMarginRescuePlan(input: MarginRescueInput): MarginRescuePlan {
  const targetRatio = input.targetMarginRatio ?? 1.6;
  const principal = Math.max(0, input.totalLoanPrincipalTwd);
  const collateral = Math.max(0, input.totalCollateralValueTwd);

  if (principal <= 0) {
    return {
      currentMarginRatio: 999,
      targetMarginRatio: targetRatio,
      isCurrentlySafe: true,
      requiredCashAsCollateralTwd: 0,
      requiredPayoffPrincipalTwd: 0,
      requiredAdditionalCollateralValueTwd: 0,
    };
  }

  const currentRatio = collateral / principal;
  const isCurrentlySafe = currentRatio >= targetRatio;

  if (isCurrentlySafe) {
    return {
      currentMarginRatio: currentRatio,
      targetMarginRatio: targetRatio,
      isCurrentlySafe: true,
      requiredCashAsCollateralTwd: 0,
      requiredPayoffPrincipalTwd: 0,
      requiredAdditionalCollateralValueTwd: 0,
    };
  }

  // 1. 補入現金作為抵押物，或增加股票擔保品市值：
  // (collateral + add) / principal >= targetRatio => add = targetRatio * principal - collateral
  const requiredAdditionalCollateralValueTwd = Math.max(0, Math.ceil(targetRatio * principal - collateral));
  const requiredCashAsCollateralTwd = requiredAdditionalCollateralValueTwd;

  // 2. 直接償還本金：
  // collateral / (principal - repay) >= targetRatio => principal - repay <= collateral / targetRatio
  // repay >= principal - collateral / targetRatio
  const maxAllowedPrincipal = collateral / targetRatio;
  const requiredPayoffPrincipalTwd = Math.max(0, Math.ceil(principal - maxAllowedPrincipal));

  return {
    currentMarginRatio: currentRatio,
    targetMarginRatio: targetRatio,
    isCurrentlySafe: false,
    requiredCashAsCollateralTwd,
    requiredPayoffPrincipalTwd,
    requiredAdditionalCollateralValueTwd,
  };
}

/**
 * 計算解質領回部分股票時，需先償還的最小借款本金
 */
export function calculateUnpledgeRequirement(input: UnpledgeRequirementInput): UnpledgeRequirementResult {
  const minSafeRatio = input.minimumSafeMarginRatio ?? 1.3;
  const principal = Math.max(0, input.totalLoanPrincipalTwd);
  const collateral = Math.max(0, input.totalCollateralValueTwd);
  const unpledgeValue = Math.max(0, input.unpledgeStockMarketValueTwd);

  const remainingCollateral = Math.max(0, collateral - unpledgeValue);

  if (principal <= 0) {
    return {
      remainingCollateralValueTwd: remainingCollateral,
      canUnpledgeDirectlyWithoutPayoff: true,
      requiredPrincipalRepayTwd: 0,
      postUnpledgeMarginRatio: 999,
    };
  }

  const ratioWithoutRepay = remainingCollateral / principal;

  // 如果不還款維持率仍大於等於警戒線，則可直接無痛解質
  if (ratioWithoutRepay >= minSafeRatio) {
    return {
      remainingCollateralValueTwd: remainingCollateral,
      canUnpledgeDirectlyWithoutPayoff: true,
      requiredPrincipalRepayTwd: 0,
      postUnpledgeMarginRatio: ratioWithoutRepay,
    };
  }

  // 需先償還部分本金：
  // remainingCollateral / (principal - repay) >= minSafeRatio
  // principal - repay <= remainingCollateral / minSafeRatio
  // repay = principal - (remainingCollateral / minSafeRatio)
  const maxAllowedPrincipal = remainingCollateral / minSafeRatio;
  const requiredRepay = Math.max(0, Math.ceil(principal - maxAllowedPrincipal));

  const postPrincipal = principal - requiredRepay;
  const postRatio = postPrincipal > 0 ? remainingCollateral / postPrincipal : 999;

  return {
    remainingCollateralValueTwd: remainingCollateral,
    canUnpledgeDirectlyWithoutPayoff: false,
    requiredPrincipalRepayTwd: requiredRepay,
    postUnpledgeMarginRatio: postRatio,
  };
}
