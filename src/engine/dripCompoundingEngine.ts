import {
  DRIPSimulationConfig,
  DRIPProjectionYearPoint,
  PassiveIncomeMilestone,
  MilestoneTierId,
} from '../types/firePlanning';

/**
 * 執行 DRIP 股息再投資 vs 單利提領雙軌推演模擬
 */
export function simulateDRIPCompounding(
  config: DRIPSimulationConfig
): DRIPProjectionYearPoint[] {
  const {
    initialPortfolioValue,
    weightedDividendYield,
    expectedCapitalGrowthRate,
    dividendGrowthRate,
    monthlyContributionTwd,
    reinvestTaxRate,
    yearsToProject,
  } = config;

  const annualContribution = Math.max(0, monthlyContributionTwd) * 12;
  const safeTaxRate = Math.min(Math.max(0, reinvestTaxRate), 0.5); // 0 ~ 50%
  const effectiveYield = Math.max(0, weightedDividendYield);
  const capitalGrowth = expectedCapitalGrowthRate;
  const divGrowth = dividendGrowthRate;

  const results: DRIPProjectionYearPoint[] = [];

  // 第 0 年初始狀態
  let cashOutNav = Math.max(0, initialPortfolioValue);
  let dripNav = Math.max(0, initialPortfolioValue);
  let dripSharesMultiplier = 1.0;
  let cashOutCumulativeDiv = 0;

  // 初始第 0 年基準點
  const initGrossDiv = cashOutNav * effectiveYield;
  const initNetDiv = initGrossDiv * (1 - safeTaxRate);

  results.push({
    year: 0,
    cashOutPortfolioValue: Math.round(cashOutNav),
    cashOutAnnualDividendGross: Math.round(initGrossDiv),
    cashOutAnnualDividendNet: Math.round(initNetDiv),
    cashOutMonthlyIncomeNet: Math.round(initNetDiv / 12),
    cashOutCumulativeDividend: 0,
    dripPortfolioValue: Math.round(dripNav),
    dripAnnualDividendGross: Math.round(initGrossDiv),
    dripAnnualDividendNet: Math.round(initNetDiv),
    dripMonthlyIncomeNet: Math.round(initNetDiv / 12),
    dripSharesMultiplier: 1.0,
    compoundingMultiplier: 1.0,
    wealthDeltaTwd: 0,
  });

  // 逐年滾動演化 (1..yearsToProject)
  for (let t = 1; t <= yearsToProject; t++) {
    const currentYieldFactor = effectiveYield * Math.pow(1 + divGrowth, t);

    // ==========================================
    // 1. 情境 A: 股息提領 (Cash Out)
    // ==========================================
    // 每年股利基於前一年底市值乘以當期殖利率
    const cashOutGrossDiv = cashOutNav * currentYieldFactor;
    const cashOutNetDiv = cashOutGrossDiv * (1 - safeTaxRate);
    cashOutCumulativeDiv += cashOutNetDiv;

    // 年底市值 = 前一年市值 * (1 + 資本增值率) + 當年定投
    cashOutNav = cashOutNav * (1 + capitalGrowth) + annualContribution;
    cashOutNav = Math.max(0, cashOutNav);

    // ==========================================
    // 2. 情境 B: DRIP 股息再投資 (Compounding)
    // ==========================================
    // DRIP 年股利基於 DRIP 前一年市值
    const dripGrossDiv = dripNav * currentYieldFactor;
    const dripNetDiv = dripGrossDiv * (1 - safeTaxRate);

    // 碎股股份擴增倍數
    if (capitalGrowth > -1) {
      const shareGrowthIncrement = (currentYieldFactor * (1 - safeTaxRate)) / (1 + capitalGrowth);
      dripSharesMultiplier *= 1 + shareGrowthIncrement;
    }

    // DRIP 年底市值 = 前一年市值 * (1 + 資本增值率) + 稅後股息再買回 + 當年定投
    dripNav = dripNav * (1 + capitalGrowth) + dripNetDiv + annualContribution;
    dripNav = Math.max(0, dripNav);

    const roundedCashOutNav = Math.round(cashOutNav);
    const roundedDripNav = Math.round(dripNav);
    const multiplier =
      roundedCashOutNav > 0
        ? Number((roundedDripNav / roundedCashOutNav).toFixed(4))
        : roundedDripNav > 0
        ? 999.0
        : 1.0;
    const wealthDelta = roundedDripNav - roundedCashOutNav;

    results.push({
      year: t,
      cashOutPortfolioValue: roundedCashOutNav,
      cashOutAnnualDividendGross: Math.round(cashOutGrossDiv),
      cashOutAnnualDividendNet: Math.round(cashOutNetDiv),
      cashOutMonthlyIncomeNet: Math.round(cashOutNetDiv / 12),
      cashOutCumulativeDividend: Math.round(cashOutCumulativeDiv),
      dripPortfolioValue: roundedDripNav,
      dripAnnualDividendGross: Math.round(dripGrossDiv),
      dripAnnualDividendNet: Math.round(dripNetDiv),
      dripMonthlyIncomeNet: Math.round(dripNetDiv / 12),
      dripSharesMultiplier: Number(dripSharesMultiplier.toFixed(3)),
      compoundingMultiplier: multiplier,
      wealthDeltaTwd: wealthDelta,
    });
  }

  return results;
}

/**
 * 連續線性插值求達標年份
 */
function interpolateAchievedYear(
  projection: DRIPProjectionYearPoint[],
  monthlyTarget: number,
  mode: 'DRIP' | 'CASH_OUT'
): number | null {
  if (projection.length === 0) return null;

  // 檢查第 0 年是否已達標
  const initIncome =
    mode === 'DRIP'
      ? projection[0].dripMonthlyIncomeNet
      : projection[0].cashOutMonthlyIncomeNet;
  if (initIncome >= monthlyTarget) {
    return 0;
  }

  for (let i = 1; i < projection.length; i++) {
    const prevPoint = projection[i - 1];
    const currPoint = projection[i];

    const prevIncome =
      mode === 'DRIP'
        ? prevPoint.dripMonthlyIncomeNet
        : prevPoint.cashOutMonthlyIncomeNet;
    const currIncome =
      mode === 'DRIP'
        ? currPoint.dripMonthlyIncomeNet
        : currPoint.cashOutMonthlyIncomeNet;

    if (currIncome >= monthlyTarget) {
      if (currIncome === prevIncome) {
        return currPoint.year;
      }
      const fraction = (monthlyTarget - prevIncome) / (currIncome - prevIncome);
      const exactYear = Number(((currPoint.year - 1) + fraction).toFixed(1));
      return exactYear;
    }
  }

  return null;
}

/**
 * 計算 4 階被動收入自由度里程碑與 DRIP 提早年數
 */
export function calculatePassiveIncomeMilestones(
  projection: DRIPProjectionYearPoint[],
  customMonthlyExpenseTarget?: number
): PassiveIncomeMilestone[] {
  const milestoneDefs: {
    tierId: MilestoneTierId;
    tierName: string;
    monthlyTargetTwd: number;
  }[] = [
    {
      tierId: 'TIER_1_UTILITY',
      tierName: '基礎水電雜支 (月領 1萬)',
      monthlyTargetTwd: 10_000,
    },
    {
      tierId: 'TIER_2_BASIC',
      tierName: '基礎日常開銷 (月領 3萬)',
      monthlyTargetTwd: 30_000,
    },
    {
      tierId: 'TIER_3_COMFORT',
      tierName: '寬裕品質生活 (月領 6萬)',
      monthlyTargetTwd: 60_000,
    },
    {
      tierId: 'TIER_4_FIRE',
      tierName: '財務自由 FIRE (月領 10萬)',
      monthlyTargetTwd: 100_000,
    },
  ];

  const allDefs = [...milestoneDefs];
  if (
    customMonthlyExpenseTarget &&
    customMonthlyExpenseTarget > 0 &&
    !milestoneDefs.some((m) => m.monthlyTargetTwd === customMonthlyExpenseTarget)
  ) {
    allDefs.push({
      tierId: 'TIER_CUSTOM',
      tierName: `自訂生活目標 (月領 ${Math.round(customMonthlyExpenseTarget / 1000)}k)`,
      monthlyTargetTwd: customMonthlyExpenseTarget,
    });
  }

  return allDefs.map((def) => {
    const achievedDRIP = interpolateAchievedYear(projection, def.monthlyTargetTwd, 'DRIP');
    const achievedCashOut = interpolateAchievedYear(projection, def.monthlyTargetTwd, 'CASH_OUT');

    let yearsSaved: number | null = null;
    if (achievedDRIP !== null && achievedCashOut !== null) {
      yearsSaved = Number(Math.max(0, achievedCashOut - achievedDRIP).toFixed(1));
    }

    const isCurrentlyAchieved =
      projection.length > 0 &&
      projection[0].dripMonthlyIncomeNet >= def.monthlyTargetTwd;

    return {
      tierId: def.tierId,
      tierName: def.tierName,
      monthlyTargetTwd: def.monthlyTargetTwd,
      annualTargetTwd: def.monthlyTargetTwd * 12,
      achievedYearCashOut: achievedCashOut,
      achievedYearDRIP: achievedDRIP,
      yearsSaved,
      isCurrentlyAchieved,
    };
  });
}
