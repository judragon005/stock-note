import { HoldingPosition } from '../types/stock';
import {
  DEFAULT_STRESS_SCENARIOS,
  EmergencyEscapePlan,
  EvaluateMarginStressMatrixParams,
  LiquidationThresholdItem,
  MarginStressMatrixResult,
  StressScenarioResult,
} from '../types/marginStress';
import { getMarginMaintenanceInfo } from './marginStressEngine';

/**
 * 逆推單一標的之斷頭臨界價格與安全耐受度 (Liquidation Price Solver)
 */
export function solveLiquidationThresholds(
  holdings: HoldingPosition[],
  pledgedSharesMap: Map<string, number>,
  totalLoanDebtTWD: number,
  usdToTwdRate: number
): LiquidationThresholdItem[] {
  if (totalLoanDebtTWD <= 0 || pledgedSharesMap.size === 0) {
    return [];
  }

  // 1. 計算所有擔保品當前基礎市值
  const items: {
    symbol: string;
    name: string;
    price: number;
    shares: number;
    fxRate: number;
    valueTWD: number;
  }[] = [];

  let totalCollateralValueTWD = 0;

  for (const [symbol, shares] of pledgedSharesMap.entries()) {
    const holding = holdings.find((h) => h.symbol === symbol);
    const name = holding ? holding.name || symbol : symbol;
    const price =
      holding?.currentPrice ||
      (holding && holding.shares > 0 ? holding.totalCostBasis / holding.shares : 0);
    const fxRate = holding?.currency === 'USD' ? usdToTwdRate : 1;
    const actualShares = holding ? holding.shares : shares;
    const effectiveShares = Math.min(shares, actualShares);
    const valueTWD = effectiveShares * price * fxRate;

    totalCollateralValueTWD += valueTWD;
    items.push({
      symbol,
      name,
      price,
      shares: effectiveShares,
      fxRate,
      valueTWD,
    });
  }

  // 2. 對各標的依序逆推維持率閾值
  const results: LiquidationThresholdItem[] = [];

  for (const item of items) {
    const weightPercent =
      totalCollateralValueTWD > 0 ? (item.valueTWD / totalCollateralValueTWD) * 100 : 0;
    const otherCollateralValueTWD = totalCollateralValueTWD - item.valueTWD;
    const shareFxProduct = item.shares * item.fxRate;

    if (shareFxProduct <= 0 || item.price <= 0) {
      continue;
    }

    // 求解公式: (otherCollateralValueTWD + shares * fx * P*) / totalLoanDebtTWD = M
    // => P* = (M * totalLoanDebtTWD - otherCollateralValueTWD) / (shares * fx)

    const calcThresholdPrice = (targetRatioPercent: number): number => {
      const M = targetRatioPercent / 100;
      const numerator = M * totalLoanDebtTWD - otherCollateralValueTWD;
      if (numerator <= 0) {
        return 0; // 其餘擔保品已足夠支撐該水位，即使本檔歸零亦能維持
      }
      return Math.round((numerator / shareFxProduct) * 100) / 100;
    };

    const priceAt130 = calcThresholdPrice(130);
    const priceAt140 = calcThresholdPrice(140);
    const priceAt166 = calcThresholdPrice(166);

    const isImmuneToLiquidation = priceAt130 === 0;
    let maxDropPercentTo130 = 1.0;

    if (!isImmuneToLiquidation) {
      if (item.price > priceAt130) {
        maxDropPercentTo130 = Math.max(0, Math.min(1, (item.price - priceAt130) / item.price));
      } else {
        maxDropPercentTo130 = 0;
      }
    }

    results.push({
      symbol: item.symbol,
      name: item.name,
      currentPrice: item.price,
      pledgedShares: item.shares,
      collateralWeightPercent: Math.round(weightPercent * 10) / 10,
      priceAt166Healthy: priceAt166,
      priceAt140Warning: priceAt140,
      priceAt130MarginCall: priceAt130,
      maxDropPercentTo130,
      isImmuneToLiquidation,
    });
  }

  // 依權重降序排序
  return results.sort((a, b) => b.collateralWeightPercent - a.collateralWeightPercent);
}

/**
 * 計算一鍵逃生指引計畫 (Emergency Escape Plan Solver)
 */
export function calculateEmergencyEscapePlan(params: {
  currentCollateralValueTWD: number;
  totalLoanDebtTWD: number;
  targetRatio: number; // 例如 166 或 200
  holdings: HoldingPosition[];
  usdToTwdRate: number;
}): EmergencyEscapePlan {
  const { currentCollateralValueTWD, totalLoanDebtTWD, targetRatio, holdings, usdToTwdRate } =
    params;

  if (totalLoanDebtTWD <= 0) {
    return {
      targetRatio,
      currentRatio: 0,
      isAlreadySafe: true,
      repayPrincipalCashTWD: 0,
      depositCashCollateralTWD: 0,
      additionalSharesRequired: [],
    };
  }

  const currentRatio = (currentCollateralValueTWD / totalLoanDebtTWD) * 100;
  const isAlreadySafe = currentRatio >= targetRatio;

  if (isAlreadySafe) {
    return {
      targetRatio,
      currentRatio: Math.round(currentRatio * 10) / 10,
      isAlreadySafe: true,
      repayPrincipalCashTWD: 0,
      depositCashCollateralTWD: 0,
      additionalSharesRequired: [],
    };
  }

  const M = targetRatio / 100;

  // 方案 A: 償還借款本金 (減少分母)
  // V / (L - ΔC) = M => L - ΔC = V / M => ΔC = L - V / M
  const repayPrincipalCashTWD = Math.max(
    0,
    Math.round(totalLoanDebtTWD - currentCollateralValueTWD / M)
  );

  // 方案 B: 補充現金擔保品 (增加分子)
  // (V + ΔC) / L = M => ΔC = M * L - V
  const depositCashCollateralTWD = Math.max(
    0,
    Math.round(M * totalLoanDebtTWD - currentCollateralValueTWD)
  );

  // 方案 C: 加質現有持股
  const additionalSharesRequired: EmergencyEscapePlan['additionalSharesRequired'] = [];
  if (depositCashCollateralTWD > 0) {
    for (const h of holdings) {
      if (h.shares > 0 && h.currentPrice && h.currentPrice > 0) {
        const fx = h.currency === 'USD' ? usdToTwdRate : 1;
        const priceTWD = h.currentPrice * fx;
        const sharesNeeded = Math.ceil(depositCashCollateralTWD / priceTWD);
        additionalSharesRequired.push({
          symbol: h.symbol,
          name: h.name || h.symbol,
          shares: sharesNeeded,
          sharePrice: h.currentPrice,
          addedValueTWD: sharesNeeded * priceTWD,
        });
      }
    }
  }

  return {
    targetRatio,
    currentRatio: Math.round(currentRatio * 10) / 10,
    isAlreadySafe: false,
    repayPrincipalCashTWD,
    depositCashCollateralTWD,
    additionalSharesRequired,
  };
}

/**
 * 多維度情境壓力測試矩陣評估引擎 (Evaluate Margin Stress Matrix Engine)
 */
export function evaluateMarginStressMatrix(
  params: EvaluateMarginStressMatrixParams
): MarginStressMatrixResult {
  const {
    holdings,
    loans,
    usdToTwdRate,
    scenarios = DEFAULT_STRESS_SCENARIOS,
    dividendPerShareMap = {},
  } = params;

  // 1. 篩選出有效質押借款
  const pledgedLoans = loans.filter((l) => (l.principal || 0) > 0);
  const hasLoans = pledgedLoans.length > 0;

  let totalLoanDebtTWD = 0;
  for (const loan of pledgedLoans) {
    const debtNative = loan.principal || 0;
    const debtTWD = loan.currency === 'USD' ? debtNative * usdToTwdRate : debtNative;
    totalLoanDebtTWD += debtTWD;
  }

  // 2. 彙整質押股票明細
  const pledgedSharesMap = new Map<string, number>();
  for (const loan of pledgedLoans) {
    if (loan.pledgedCollateral && loan.pledgedCollateral.length > 0) {
      for (const col of loan.pledgedCollateral) {
        const cur = pledgedSharesMap.get(col.symbol) || 0;
        pledgedSharesMap.set(col.symbol, cur + col.shares);
      }
    }
  }

  // 若無指定個別質押股票但有借款，則預設所有台股持股為整戶擔保品
  if (hasLoans && pledgedSharesMap.size === 0) {
    for (const h of holdings) {
      if (h.shares > 0) {
        pledgedSharesMap.set(h.symbol, h.shares);
      }
    }
  }

  // 3. 計算當前未受壓之基礎擔保品市值
  let currentCollateralValueTWD = 0;
  for (const [symbol, shares] of pledgedSharesMap.entries()) {
    const holding = holdings.find((h) => h.symbol === symbol);
    const price =
      holding?.currentPrice ||
      (holding && holding.shares > 0 ? holding.totalCostBasis / holding.shares : 0);
    const fxRate = holding?.currency === 'USD' ? usdToTwdRate : 1;
    const actualShares = holding ? holding.shares : shares;
    const effectiveShares = Math.min(shares, actualShares);
    currentCollateralValueTWD += effectiveShares * price * fxRate;
  }

  const currentMaintenanceRatio =
    totalLoanDebtTWD > 0 ? (currentCollateralValueTWD / totalLoanDebtTWD) * 100 : 0;
  const currentStatusInfo = getMarginMaintenanceInfo(currentMaintenanceRatio);

  // 4. 針對各壓力情境進行矩陣試算
  const rows: StressScenarioResult[] = scenarios.map((scenario) => {
    let stressedCollateralValueTWD = 0;

    for (const [symbol, shares] of pledgedSharesMap.entries()) {
      const holding = holdings.find((h) => h.symbol === symbol);
      const basePrice =
        holding?.currentPrice ||
        (holding && holding.shares > 0 ? holding.totalCostBasis / holding.shares : 0);
      const fxRate = holding?.currency === 'USD' ? usdToTwdRate : 1;
      const actualShares = holding ? holding.shares : shares;
      const effectiveShares = Math.min(shares, actualShares);

      // A. 除權息跳水扣減
      const divPerShare = scenario.applyExDividendDrop ? dividendPerShareMap[symbol] || 0 : 0;
      const priceAfterExDiv = Math.max(0, basePrice - divPerShare);

      // B. 跌幅扣減
      const drop =
        scenario.customSymbolDrops && scenario.customSymbolDrops[symbol] !== undefined
          ? scenario.customSymbolDrops[symbol]
          : scenario.marketDropPercent;
      const boundedDrop = Math.max(0, Math.min(1, drop));
      const stressedPrice = priceAfterExDiv * (1 - boundedDrop);

      stressedCollateralValueTWD += effectiveShares * stressedPrice * fxRate;
    }

    const stressedMaintenanceRatio =
      totalLoanDebtTWD > 0 ? (stressedCollateralValueTWD / totalLoanDebtTWD) * 100 : 0;
    const statusInfo = getMarginMaintenanceInfo(stressedMaintenanceRatio);
    const dropInRatioPoints = stressedMaintenanceRatio - currentMaintenanceRatio;

    // 試算目標水位補款
    const M166 = 1.66;
    const M130 = 1.3;

    const repayCashNeededFor166 =
      totalLoanDebtTWD > 0 && stressedMaintenanceRatio < 166
        ? Math.max(0, Math.round(totalLoanDebtTWD - stressedCollateralValueTWD / M166))
        : 0;

    const depositCashNeededFor166 =
      totalLoanDebtTWD > 0 && stressedMaintenanceRatio < 166
        ? Math.max(0, Math.round(M166 * totalLoanDebtTWD - stressedCollateralValueTWD))
        : 0;

    const repayCashNeededFor130 =
      totalLoanDebtTWD > 0 && stressedMaintenanceRatio < 130
        ? Math.max(0, Math.round(totalLoanDebtTWD - stressedCollateralValueTWD / M130))
        : 0;

    const depositCashNeededFor130 =
      totalLoanDebtTWD > 0 && stressedMaintenanceRatio < 130
        ? Math.max(0, Math.round(M130 * totalLoanDebtTWD - stressedCollateralValueTWD))
        : 0;

    return {
      scenario,
      stressedCollateralValueTWD: Math.round(stressedCollateralValueTWD),
      stressedMaintenanceRatio: Math.round(stressedMaintenanceRatio * 10) / 10,
      statusInfo,
      dropInRatioPoints: Math.round(dropInRatioPoints * 10) / 10,
      repayCashNeededFor166,
      depositCashNeededFor166,
      repayCashNeededFor130,
      depositCashNeededFor130,
    };
  });

  // 5. 斷頭臨界價格逆推
  const liquidationThresholds = solveLiquidationThresholds(
    holdings,
    pledgedSharesMap,
    totalLoanDebtTWD,
    usdToTwdRate
  );

  // 6. 逃生指南方案 (針對當前基礎狀況試算 166% 與 200%)
  const escapePlanFor166 = calculateEmergencyEscapePlan({
    currentCollateralValueTWD,
    totalLoanDebtTWD,
    targetRatio: 166,
    holdings,
    usdToTwdRate,
  });

  const escapePlanFor200 = calculateEmergencyEscapePlan({
    currentCollateralValueTWD,
    totalLoanDebtTWD,
    targetRatio: 200,
    holdings,
    usdToTwdRate,
  });

  return {
    hasLoans,
    totalLoanDebtTWD,
    currentCollateralValueTWD: Math.round(currentCollateralValueTWD),
    currentMaintenanceRatio: Math.round(currentMaintenanceRatio * 10) / 10,
    currentStatusInfo,
    rows,
    liquidationThresholds,
    escapePlanFor166,
    escapePlanFor200,
  };
}
