import {
  MonteCarloSimulationConfig,
  MonteCarloSimulationResult,
  MonteCarloPercentileTrack,
} from '../types/firePlanning';

/**
 * 採用 Box-Muller 變換生成標準常態分佈亂數 Z ~ N(0, 1)
 */
export function generateStandardNormal(): number {
  let u1 = 0;
  let u2 = 0;
  // 避免 Math.random() 回傳 0 導致 Math.log(0) = -Infinity
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();

  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0;
}

/**
 * 計算指定數值在已排序數列中的百分位數值 (線性插值)
 */
function getPercentileValue(sortedArr: number[], percentile: number): number {
  if (sortedArr.length === 0) return 0;
  if (sortedArr.length === 1) return sortedArr[0];

  const index = (percentile / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

/**
 * 模擬單一路徑在指定提領率下的存續情況 (供 SWR 二分法逆運算使用)
 */
function evaluateSurvivalRate(
  config: MonteCarloSimulationConfig,
  initialWithdrawalRate: number,
  runs: number = 300
): number {
  const {
    initialPortfolioValue,
    yearsToSimulate,
    expectedAnnualReturn,
    annualVolatility,
    annualInflationRate,
  } = config;

  if (initialPortfolioValue <= 0) return 0;

  const mu = expectedAnnualReturn;
  const sigma = annualVolatility;
  const drift = mu - 0.5 * Math.pow(sigma, 2);
  const initialExpenditure = initialPortfolioValue * initialWithdrawalRate;

  let survivedRuns = 0;

  for (let r = 0; r < runs; r++) {
    let currentNav = initialPortfolioValue;
    let currentWithdrawal = initialExpenditure;
    let isBankrupt = false;

    for (let t = 1; t <= yearsToSimulate; t++) {
      const z = generateStandardNormal();
      const returnFactor = Math.exp(drift + sigma * z);
      const grossNav = currentNav * returnFactor;

      if (grossNav <= currentWithdrawal) {
        isBankrupt = true;
        break;
      }

      currentNav = grossNav - currentWithdrawal;
      currentWithdrawal *= 1 + annualInflationRate;
    }

    if (!isBankrupt && currentNav > 0) {
      survivedRuns++;
    }
  }

  return (survivedRuns / runs) * 100;
}

/**
 * 執行蒙地卡羅 1,000 次退休資產路徑隨機抽樣模擬
 */
export function runMonteCarloFIRESimulation(
  config: MonteCarloSimulationConfig
): MonteCarloSimulationResult {
  const {
    initialPortfolioValue,
    annualExpenditureTargetTwd,
    yearsToSimulate,
    expectedAnnualReturn,
    annualVolatility,
    annualInflationRate,
    dividendYield,
    strategy,
    simulationRuns = 1_000,
  } = config;

  const runsCount = Math.max(100, simulationRuns);
  const years = Math.max(1, yearsToSimulate);
  const initNav = Math.max(0, initialPortfolioValue);

  // 極端邊界防禦：初始資金為 0 或支出極大
  if (initNav <= 0 || (initNav > 0 && annualExpenditureTargetTwd >= initNav * 2)) {
    const emptyTracks: MonteCarloPercentileTrack[] = [];
    for (let y = 0; y <= years; y++) {
      emptyTracks.push({ year: y, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 });
    }
    return {
      simulationRuns: runsCount,
      successRate: 0,
      ruinProbability: 100,
      medianFinalNetWorthTwd: 0,
      safeWithdrawalRateMax: 1.0,
      percentileTracks: emptyTracks,
      runsExhaustedBeforeYear10: runsCount,
    };
  }

  // 儲存每一年各路徑的 NAV：matrix[year][runIndex]
  const navMatrix: number[][] = Array.from({ length: years + 1 }, () => new Array(runsCount).fill(0));
  for (let r = 0; r < runsCount; r++) {
    navMatrix[0][r] = initNav;
  }

  const initialRate = initNav > 0 ? annualExpenditureTargetTwd / initNav : 0;
  const mu = expectedAnnualReturn;
  const sigma = Math.max(0.001, annualVolatility);
  const drift = mu - 0.5 * Math.pow(sigma, 2);

  let successCount = 0;
  let exhaustedBeforeYear10Count = 0;

  // 執行 1,000 次獨立路徑模擬
  for (let r = 0; r < runsCount; r++) {
    let nav = initNav;
    let nominalWithdrawal = annualExpenditureTargetTwd;
    let isBankrupt = false;
    let bankruptYear = -1;

    for (let t = 1; t <= years; t++) {
      if (isBankrupt) {
        navMatrix[t][r] = 0;
        continue;
      }

      const z = generateStandardNormal();
      const growthMultiplier = Math.exp(drift + sigma * z);
      const grossNav = nav * growthMultiplier;

      // 依提領策略決定當期提領金額
      let actualWithdrawal = 0;

      if (strategy === 'DIVIDEND_ONLY_PRESERVATION') {
        // 純股息模式：僅領取股息，股票本金永不提領
        const availableDividend = grossNav * Math.max(0, dividendYield);
        actualWithdrawal = Math.min(nominalWithdrawal, availableDividend);
        nav = grossNav; // 股息提領後本金不變 (因股息已發放)
      } else if (strategy === 'GUYTON_KLINGER_GUARDRAILS') {
        // Guyton-Klinger 動態護欄法
        nominalWithdrawal *= 1 + annualInflationRate;
        const currentRate = grossNav > 0 ? nominalWithdrawal / grossNav : 1;

        if (initialRate > 0 && currentRate > 1.2 * initialRate) {
          // 資本保全護欄：提領率偏高，縮減 10%
          nominalWithdrawal *= 0.9;
        } else if (initialRate > 0 && currentRate < 0.8 * initialRate) {
          // 繁榮護欄：提領率偏低，調升 10%
          nominalWithdrawal *= 1.1;
        }

        actualWithdrawal = nominalWithdrawal;
        nav = grossNav - actualWithdrawal;
      } else {
        // 經典 Trinity 4% 通膨調整法
        if (t > 1) {
          nominalWithdrawal *= 1 + annualInflationRate;
        }
        actualWithdrawal = nominalWithdrawal;
        nav = grossNav - actualWithdrawal;
      }

      if (nav <= 0) {
        nav = 0;
        isBankrupt = true;
        bankruptYear = t;
      }

      navMatrix[t][r] = Math.round(nav);
    }

    if (!isBankrupt && nav > 0) {
      successCount++;
    }
    if (bankruptYear > 0 && bankruptYear <= 10) {
      exhaustedBeforeYear10Count++;
    }
  }

  // 計算歷年百分位數錐形軌跡
  const percentileTracks: MonteCarloPercentileTrack[] = [];
  for (let t = 0; t <= years; t++) {
    const sortedNavs = [...navMatrix[t]].sort((a, b) => a - b);
    percentileTracks.push({
      year: t,
      p10: Math.round(getPercentileValue(sortedNavs, 10)),
      p25: Math.round(getPercentileValue(sortedNavs, 25)),
      p50: Math.round(getPercentileValue(sortedNavs, 50)),
      p75: Math.round(getPercentileValue(sortedNavs, 75)),
      p90: Math.round(getPercentileValue(sortedNavs, 90)),
    });
  }

  const successRate = Number(((successCount / runsCount) * 100).toFixed(1));
  const ruinProbability = Number((100 - successRate).toFixed(1));
  const medianFinalNetWorth = percentileTracks[years].p50;

  // 二分法逼近 95% 存活率下的最大安全提領率 (SWR)
  let low = 0.01;
  let high = 0.10;
  let optimalSWR = 0.04;

  for (let iter = 0; iter < 8; iter++) {
    const mid = (low + high) / 2;
    const rate = evaluateSurvivalRate(config, mid, 250);
    if (rate >= 95.0) {
      optimalSWR = mid;
      low = mid; // 嘗試更高提領率
    } else {
      high = mid; // 存活率不足，調低提領率
    }
  }

  return {
    simulationRuns: runsCount,
    successRate,
    ruinProbability,
    medianFinalNetWorthTwd: medianFinalNetWorth,
    safeWithdrawalRateMax: Number((optimalSWR * 100).toFixed(1)),
    percentileTracks,
    runsExhaustedBeforeYear10: exhaustedBeforeYear10Count,
  };
}
