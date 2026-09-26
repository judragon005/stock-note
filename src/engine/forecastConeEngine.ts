import { ForecastConeData } from '../types/aiForceDashboard';

export interface CandleReturnInput {
  close: number;
  high?: number;
  low?: number;
  volume?: number;
}

const FORECAST_HORIZONS = [
  { dayOffset: 0, label: '今日' },
  { dayOffset: 3, label: '3日後' },
  { dayOffset: 5, label: '5日後' },
  { dayOffset: 10, label: '10日後' },
];

/**
 * 簡易常態分佈累積分佈 CDF 近似計算
 */
function normalCdf(x: number): number {
  // Abramowitz and Stegun 數值近似
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

/**
 * 依據歷史 K 線對數報酬率與幾何布朗運動模型計算統計預測錐
 */
export function calculateForecastCone(
  candles: CandleReturnInput[],
  defaultPrice: number = 2290
): ForecastConeData {
  if (!candles || candles.length < 2) {
    const s0 = defaultPrice > 0 ? defaultPrice : 2290;
    const defaultNodes = FORECAST_HORIZONS.map((h) => {
      const spread = h.dayOffset === 0 ? 0 : s0 * (0.015 * Math.sqrt(h.dayOffset));
      return {
        dayOffset: h.dayOffset,
        label: h.label,
        upperPrice: Number((s0 + spread).toFixed(1)),
        medianPrice: s0,
        lowerPrice: Number((s0 - spread).toFixed(1)),
      };
    });

    return {
      bullishProb: 47,
      rangeProb: 11,
      bearishProb: 42,
      mainForceDirectionProb: 52,
      annualizedDriftPercent: 19.7,
      timeNodes: defaultNodes,
    };
  }

  // 1. 計算近 60 根（若不足則取全部）對數日收益率
  const sampleCandles = candles.slice(-60);
  const logReturns: number[] = [];
  for (let i = 1; i < sampleCandles.length; i++) {
    const prev = sampleCandles[i - 1].close;
    const curr = sampleCandles[i].close;
    if (prev > 0 && curr > 0) {
      logReturns.push(Math.log(curr / prev));
    }
  }

  const s0 = sampleCandles[sampleCandles.length - 1].close;

  // 2. 均值 (Drift) 與標準差 (Daily Volatility)
  let meanReturn = 0;
  let dailyVol = 0.015; // 預設 1.5%

  if (logReturns.length > 0) {
    const sum = logReturns.reduce((acc, r) => acc + r, 0);
    meanReturn = sum / logReturns.length;

    const varianceSum = logReturns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0);
    const calculatedDailyVol = Math.sqrt(varianceSum / Math.max(1, logReturns.length - 1));

    // 防禦零波動：若價格完全不變，提供極小基礎波動度 0.005，確保標準差能微幅擴散而不爆錯
    dailyVol = Math.max(0.005, calculatedDailyVol);
  }

  const annualizedDriftPercent = Number((meanReturn * 252 * 100).toFixed(1));

  // 3. 預測節點 (3, 5, 10 日標準差上下限)
  const timeNodes = FORECAST_HORIZONS.map((h) => {
    if (h.dayOffset === 0) {
      return {
        dayOffset: 0,
        label: h.label,
        upperPrice: s0,
        medianPrice: s0,
        lowerPrice: s0,
      };
    }

    const t = h.dayOffset;
    const median = s0 * Math.exp(meanReturn * t);
    const sigmaRootT = dailyVol * Math.sqrt(t);

    const upper = s0 * Math.exp((meanReturn - 0.5 * dailyVol * dailyVol) * t + sigmaRootT);
    const lower = s0 * Math.exp((meanReturn - 0.5 * dailyVol * dailyVol) * t - sigmaRootT);

    return {
      dayOffset: h.dayOffset,
      label: h.label,
      upperPrice: Number(upper.toFixed(1)),
      medianPrice: Number(median.toFixed(1)),
      lowerPrice: Number(lower.toFixed(1)),
    };
  });

  // 4. 機率計算 (上漲、震盪、下跌)
  // 以 10 日標準化 Z 分數為衡量依據
  const zScore = (meanReturn * 10) / (dailyVol * Math.sqrt(10));
  // 假定超過 +0.1 個標準差為上漲，低於 -0.1 為下跌，中間為區間震盪
  const rawBullish = 1 - normalCdf(0.1 - zScore);
  const rawBearish = normalCdf(-0.1 - zScore);

  let bullishProb = Math.round(rawBullish * 100);
  let bearishProb = Math.round(rawBearish * 100);

  // 限制極端值並留出震盪機率
  bullishProb = Math.max(10, Math.min(80, bullishProb));
  bearishProb = Math.max(10, Math.min(80, bearishProb));
  if (bullishProb + bearishProb >= 95) {
    bullishProb = Math.round(bullishProb * 0.9);
    bearishProb = Math.round(bearishProb * 0.9);
  }
  const rangeProb = 100 - bullishProb - bearishProb;

  const mainForceDirectionProb =
    bullishProb >= bearishProb ? bullishProb : bearishProb;

  return {
    bullishProb,
    rangeProb,
    bearishProb,
    mainForceDirectionProb,
    annualizedDriftPercent,
    timeNodes,
  };
}
