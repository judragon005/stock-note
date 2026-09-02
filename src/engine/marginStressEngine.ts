import {
  CalculateMarginStressParams,
  MarginStressResult,
  MarginMaintenanceInfo,
  PledgedHoldingStressItem,
} from '../types/marginStress';

/**
 * 取得質押維持率水位的中文標籤與警示顏色
 */
export function getMarginMaintenanceInfo(ratio: number): MarginMaintenanceInfo {
  if (ratio <= 0) {
    return {
      status: 'SAFE',
      label: '無質押借款',
      badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      textColor: 'text-slate-600 dark:text-slate-400',
      description: '帳戶無任何質押借款合約。',
    };
  }

  if (ratio < 130) {
    return {
      status: 'MARGIN_CALL',
      label: '斷頭追繳 (<130%)',
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-700 animate-pulse',
      textColor: 'text-rose-600 dark:text-rose-400',
      description: '已跌破法定 130% 追繳門檻！券商將發出追繳通知，若未限期補足差額將強制處分擔保品。',
    };
  }

  if (ratio < 160) {
    return {
      status: 'WARNING',
      label: '警戒水位 (130%~160%)',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      textColor: 'text-amber-600 dark:text-amber-400',
      description: '維持率偏低，若標的再出現一波下跌極易觸發追繳，建議預先備妥應變資金或加補擔保品。',
    };
  }

  if (ratio <= 200) {
    return {
      status: 'HEALTHY',
      label: '健康水位 (160%~200%)',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      textColor: 'text-blue-600 dark:text-blue-400',
      description: '維持率處於合理健康水位，能承受一般市場常態波動。',
    };
  }

  return {
    status: 'SAFE',
    label: '極度安全 (>200%)',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    description: '維持率超過 200%，擔保品充足，抗大盤劇烈黑天鵝衝擊防禦力極強。',
  };
}

/**
 * 質押維持率極端壓力測試與追繳逆運算引擎
 */
export function calculateMarginStress(params: CalculateMarginStressParams): MarginStressResult {
  const { holdings, loans, usdToTwdRate, generalMarketDropPercent = 0, customDropPercents = {} } = params;

  // 1. 篩選出有效質押借款
  const pledgedLoans = loans.filter((l) => (l.principal || 0) > 0);
  const hasLoans = pledgedLoans.length > 0;

  let totalLoanDebtTWD = 0;
  for (const loan of pledgedLoans) {
    const debtNative = loan.principal || 0;
    const debtTWD = loan.currency === 'USD' ? debtNative * usdToTwdRate : debtNative;
    totalLoanDebtTWD += debtTWD;
  }

  // 2. 彙整所有質押擔保品股票明細
  const pledgedSharesMap = new Map<string, number>();
  for (const loan of pledgedLoans) {
    if (loan.pledgedCollateral && loan.pledgedCollateral.length > 0) {
      for (const col of loan.pledgedCollateral) {
        const cur = pledgedSharesMap.get(col.symbol) || 0;
        pledgedSharesMap.set(col.symbol, cur + col.shares);
      }
    }
  }

  // 若無指定個別質押股票，但有質押借款，則預設所有台股持股為整戶擔保品
  if (hasLoans && pledgedSharesMap.size === 0) {
    for (const h of holdings) {
      if (h.shares > 0) {
        pledgedSharesMap.set(h.symbol, h.shares);
      }
    }
  }

  // 3. 計算當前與壓力情境下的擔保品市值
  const pledgedHoldings: PledgedHoldingStressItem[] = [];
  let currentCollateralValueTWD = 0;
  let stressedCollateralValueTWD = 0;

  for (const [symbol, shares] of pledgedSharesMap.entries()) {
    const holding = holdings.find((h) => h.symbol === symbol);
    const name = holding ? holding.name || symbol : symbol;
    const price = holding?.currentPrice || (holding && holding.shares > 0 ? holding.totalCostBasis / holding.shares : 0);
    const fxRate = holding?.currency === 'USD' ? usdToTwdRate : 1;

    // 防禦性在庫核銷：擔保品股數不得超過庫存實際持有股數
    const actualHoldingShares = holding ? holding.shares : 0;
    const effectiveShares = Math.min(shares, actualHoldingShares);

    const baseValTWD = effectiveShares * price * fxRate;
    currentCollateralValueTWD += baseValTWD;

    // 跌幅判定：個股自訂優先於大盤通用跌幅
    const drop = customDropPercents[symbol] !== undefined ? customDropPercents[symbol] : generalMarketDropPercent;
    const dropBounded = Math.max(0, Math.min(1, drop));
    const stressedPrice = price * (1 - dropBounded);
    const stressedValTWD = effectiveShares * stressedPrice * fxRate;
    stressedCollateralValueTWD += stressedValTWD;

    pledgedHoldings.push({
      symbol,
      name,
      shares: effectiveShares,
      currentPrice: price,
      baselineValueTWD: baseValTWD,
      dropPercent: dropBounded,
      stressedPrice,
      stressedValueTWD: stressedValTWD,
    });
  }

  // 4. 計算維持率
  let currentMaintenanceRatio = 0;
  let stressedMaintenanceRatio = 0;

  if (totalLoanDebtTWD > 0) {
    currentMaintenanceRatio = (currentCollateralValueTWD / totalLoanDebtTWD) * 100;
    stressedMaintenanceRatio = (stressedCollateralValueTWD / totalLoanDebtTWD) * 100;
  }

  const currentStatusInfo = getMarginMaintenanceInfo(currentMaintenanceRatio);
  const stressedStatusInfo = getMarginMaintenanceInfo(stressedMaintenanceRatio);

  // 5. 斷頭安全邊際逆運算 (最大耐受跌幅到 130%)
  let maxDropTolerancePercent = 1; // 預設 100%
  let pointsToMarginCall = 0;

  if (totalLoanDebtTWD > 0 && currentCollateralValueTWD > 0) {
    pointsToMarginCall = Math.max(0, currentMaintenanceRatio - 130);
    const requiredCollateralFor130 = totalLoanDebtTWD * 1.30;
    if (currentCollateralValueTWD > requiredCollateralFor130) {
      maxDropTolerancePercent = Math.max(0, 1 - (requiredCollateralFor130 / currentCollateralValueTWD));
    } else {
      maxDropTolerancePercent = 0;
    }
  }

  // 6. 追繳補足金額逆運算 (Required Margin Call Cash)
  let requiredCashFor130TWD = 0;
  let requiredCashFor160TWD = 0;

  if (totalLoanDebtTWD > 0) {
    const targetCollateral130 = totalLoanDebtTWD * 1.30;
    const targetCollateral160 = totalLoanDebtTWD * 1.60;

    if (stressedCollateralValueTWD < targetCollateral130) {
      requiredCashFor130TWD = Math.round(targetCollateral130 - stressedCollateralValueTWD);
    }
    if (stressedCollateralValueTWD < targetCollateral160) {
      requiredCashFor160TWD = Math.round(targetCollateral160 - stressedCollateralValueTWD);
    }
  }

  return {
    hasLoans,
    totalLoanDebtTWD,
    currentCollateralValueTWD,
    currentMaintenanceRatio,
    currentStatusInfo,
    scenarioDropPercent: generalMarketDropPercent,
    stressedCollateralValueTWD,
    stressedMaintenanceRatio,
    stressedStatusInfo,
    maxDropTolerancePercent,
    pointsToMarginCall,
    requiredCashFor130TWD,
    requiredCashFor160TWD,
    requiredStockValueFor130TWD: requiredCashFor130TWD,
    requiredStockValueFor160TWD: requiredCashFor160TWD,
    pledgedHoldings,
  };
}
