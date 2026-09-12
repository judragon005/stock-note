import { DailyCandle } from '../types/indicators';
import {
  TrendMetrics,
  MomentumMetrics,
  VolatilityMetrics,
  VolumeFlowMetrics,
  SupportResistanceLevels,
  TechnicalConfluence,
  OmniIndicatorReport,
  MarketRegime,
  KeyLevelCluster,
  KeyLevelClusters,
  DivergenceSignal,
  PriceActionTrapSignal,
  ActionableTradeMatrix,
} from '../types/omniIndicator';
import {
  calculateMovingAverages,
  calculateStochasticKD,
  calculateMACD,
  calculateVolumeMetrics,
} from './technicalIndicatorEngine';
import {
  detectDarvasBox,
  calculateBollingerSqueeze,
  calculateAtrTrailingDefense,
} from './muscleBookerEngine';

/**
 * 1. 計算 RSI 相對強弱指標 (Wilder Smoothing 平滑法)
 */
export function calculateRSI(closes: number[], period = 14): number | undefined {
  if (!closes || closes.length <= period || period <= 0) {
    return undefined;
  }

  let sumGain = 0;
  let sumLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) {
      sumGain += diff;
    } else {
      sumLoss += Math.abs(diff);
    }
  }

  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) {
    return 100;
  }
  if (avgGain === 0) {
    return 0;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return Math.round(rsi * 100) / 100;
}

/**
 * 2. 計算 DMI / ADX (趨向指標與趨勢強度)
 */
export function calculateDmiAdx(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): {
  pdi: number;
  mdi: number;
  adx: number;
  trendDirection: 'BULLISH' | 'BEARISH' | 'RANGE';
} | undefined {
  const len = closes.length;
  if (!highs || !lows || !closes || len <= period || highs.length !== len || lows.length !== len) {
    return undefined;
  }

  const trs: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < len; i++) {
    const h = highs[i];
    const l = lows[i];
    const prevC = closes[i - 1];
    const prevH = highs[i - 1];
    const prevL = lows[i - 1];

    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trs.push(tr);

    const upMove = h - prevH;
    const downMove = prevL - l;

    if (upMove > downMove && upMove > 0) {
      plusDMs.push(upMove);
    } else {
      plusDMs.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDMs.push(downMove);
    } else {
      minusDMs.push(0);
    }
  }

  if (trs.length < period) {
    return undefined;
  }

  let smoothedTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedPlusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

  const dxList: number[] = [];

  for (let i = period; i < trs.length; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + trs[i];
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDMs[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDMs[i];

    const pdi = smoothedTR === 0 ? 0 : (smoothedPlusDM / smoothedTR) * 100;
    const mdi = smoothedTR === 0 ? 0 : (smoothedMinusDM / smoothedTR) * 100;
    const diDiff = Math.abs(pdi - mdi);
    const diSum = pdi + mdi;
    const dx = diSum === 0 ? 0 : (diDiff / diSum) * 100;
    dxList.push(dx);
  }

  const finalPdi = smoothedTR === 0 ? 0 : Math.round(((smoothedPlusDM / smoothedTR) * 100) * 100) / 100;
  const finalMdi = smoothedTR === 0 ? 0 : Math.round(((smoothedMinusDM / smoothedTR) * 100) * 100) / 100;

  let adx = 20;
  if (dxList.length >= period) {
    let adxSum = dxList.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < dxList.length; i++) {
      adxSum = (adxSum * (period - 1) + dxList[i]) / period;
    }
    adx = Math.round(adxSum * 100) / 100;
  } else if (dxList.length > 0) {
    adx = Math.round((dxList.reduce((a, b) => a + b, 0) / dxList.length) * 100) / 100;
  }

  let trendDirection: 'BULLISH' | 'BEARISH' | 'RANGE' = 'RANGE';
  if (adx >= 20) {
    if (finalPdi > finalMdi) {
      trendDirection = 'BULLISH';
    } else if (finalMdi > finalPdi) {
      trendDirection = 'BEARISH';
    }
  }

  return {
    pdi: finalPdi,
    mdi: finalMdi,
    adx,
    trendDirection,
  };
}

/**
 * 3. 計算 CCI 順勢指標 (Commodity Channel Index)
 */
export function calculateCCI(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 20
): number | undefined {
  const len = closes.length;
  if (!highs || !lows || !closes || len < period || highs.length !== len || lows.length !== len) {
    return undefined;
  }

  const tps: number[] = [];
  for (let i = 0; i < len; i++) {
    tps.push((highs[i] + lows[i] + closes[i]) / 3);
  }

  const currentWindow = tps.slice(-period);
  const smaTP = currentWindow.reduce((a, b) => a + b, 0) / period;

  let meanDev = 0;
  for (let i = 0; i < period; i++) {
    meanDev += Math.abs(currentWindow[i] - smaTP);
  }
  meanDev = meanDev / period;

  if (meanDev === 0) {
    return 0;
  }

  const currentTP = tps[tps.length - 1];
  const cci = (currentTP - smaTP) / (0.015 * meanDev);
  return Math.round(cci * 100) / 100;
}

/**
 * 4. 計算 Williams %R (威廉指標)
 */
export function calculateWilliamsR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number | undefined {
  const len = closes.length;
  if (!highs || !lows || !closes || len < period || highs.length !== len || lows.length !== len) {
    return undefined;
  }

  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const currentClose = closes[closes.length - 1];

  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);

  if (highestHigh === lowestLow) {
    return -50;
  }

  const wr = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  return Math.round(wr * 100) / 100;
}

/**
 * 5. 計算 OBV 能量潮指標
 */
export function calculateOBV(
  closes: number[],
  volumes: number[]
): {
  current: number;
  trend: 'RISING' | 'FALLING' | 'FLAT';
} {
  if (!closes || !volumes || closes.length === 0 || closes.length !== volumes.length) {
    return { current: 0, trend: 'FLAT' };
  }

  const obvValues: number[] = [volumes[0]];

  for (let i = 1; i < closes.length; i++) {
    const prevObv = obvValues[i - 1];
    const c = closes[i];
    const prevC = closes[i - 1];
    const v = volumes[i];

    if (c > prevC) {
      obvValues.push(prevObv + v);
    } else if (c < prevC) {
      obvValues.push(prevObv - v);
    } else {
      obvValues.push(prevObv);
    }
  }

  const current = obvValues[obvValues.length - 1];
  let trend: 'RISING' | 'FALLING' | 'FLAT' = 'FLAT';
  if (obvValues.length >= 2) {
    const recent = obvValues.length >= 10 ? obvValues.slice(-10) : obvValues;
    const obvDiff = recent[recent.length - 1] - recent[0];
    if (obvDiff > 0) trend = 'RISING';
    else if (obvDiff < 0) trend = 'FALLING';
  }

  return {
    current,
    trend,
  };
}

/**
 * 6. 計算費波那契回撤 (Fibonacci Retracement)
 */
export function calculateFibonacciLevels(highs: number[], lows: number[]) {
  if (!highs || !lows || highs.length === 0 || lows.length === 0) {
    return { high: 0, low: 0, fib236: 0, fib382: 0, fib500: 0, fib618: 0, fib786: 0 };
  }

  const high = Math.max(...highs);
  const low = Math.min(...lows);
  const range = high - low;

  return {
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
    fib236: Math.round((high - range * 0.236) * 100) / 100,
    fib382: Math.round((high - range * 0.382) * 100) / 100,
    fib500: Math.round((high - range * 0.5) * 100) / 100,
    fib618: Math.round((high - range * 0.618) * 100) / 100,
    fib786: Math.round((high - range * 0.786) * 100) / 100,
  };
}

/**
 * 7. 計算經典樞紐點 (Pivot Points Classic)
 */
export function calculatePivotPoints(high: number, low: number, close: number) {
  const pivot = Math.round(((high + low + close) / 3) * 100) / 100;
  const r1 = Math.round((2 * pivot - low) * 100) / 100;
  const r2 = Math.round((pivot + (high - low)) * 100) / 100;
  const s1 = Math.round((2 * pivot - high) * 100) / 100;
  const s2 = Math.round((pivot - (high - low)) * 100) / 100;

  return {
    pivot,
    r1,
    r2,
    s1,
    s2,
  };
}

/**
 * 8. 市場狀態機 (Market Regime Evaluator)
 */
export function evaluateMarketRegime(params: {
  adx?: number;
  pdi?: number;
  mdi?: number;
  bandwidthPercent?: number;
  maAlignment?: 'BULLISH' | 'BEARISH' | 'ENTANGLED';
}): { regime: MarketRegime; label: string; description: string } {
  const { adx = 0, pdi = 0, mdi = 0, bandwidthPercent = 10, maAlignment = 'ENTANGLED' } = params;

  // 1. 布林通道極致收斂：變盤在即 (Squeeze)
  if (bandwidthPercent <= 8.0) {
    return {
      regime: 'VOLATILITY_SQUEEZE',
      label: '⚡ 變盤在即 (Squeeze)',
      description: `布林帶寬僅 ${bandwidthPercent.toFixed(2)}%，波動率極致壓縮，預示即將迎來單向噴出或突破大變盤。`,
    };
  }

  // 2. 強趨勢行情 (Trending)
  if (adx >= 25) {
    if (pdi > mdi && maAlignment === 'BULLISH') {
      return {
        regime: 'TRENDING_BULL',
        label: '🚀 強多主升 (Trending Bull)',
        description: `ADX 達 ${adx.toFixed(1)}，多方動能 (+DI ${pdi.toFixed(1)}) 明確主導，均線多頭排列。`,
      };
    }
    if (mdi > pdi && maAlignment === 'BEARISH') {
      return {
        regime: 'TRENDING_BEAR',
        label: '🔻 空頭主跌 (Trending Bear)',
        description: `ADX 達 ${adx.toFixed(1)}，空方動能 (-DI ${mdi.toFixed(1)}) 強烈壓制，處於主跌波段。`,
      };
    }
  }

  // 3. 無趨勢橫盤整理 (Choppy Range)
  if (adx < 20) {
    return {
      regime: 'CHOPPY_RANGE',
      label: '〰️ 無趨勢盤整 (Choppy Range)',
      description: `ADX 僅 ${adx.toFixed(1)} (< 20)，缺乏方向動能，短線均線交纏，此時趨勢指標容易頻繁鈍化失真。`,
    };
  }

  return {
    regime: 'CHOPPY_RANGE',
    label: '⚖️ 震盪拉鋸 (Consolidation)',
    description: '多空力道互有勝負，建議以區間箱體或支撐壓力操作為宜。',
  };
}

/**
 * 9. 關鍵價位密集聚集演算法 (Key Level Proximity Clustering)
 */
export function calculateKeyLevelClusters(params: {
  currentPrice: number;
  darvasBox?: { upper: number; lower: number };
  bollinger?: { upper: number; mid: number; lower: number };
  pivotPoints?: { pivot: number; r1: number; r2: number; s1: number; s2: number };
  fibonacci?: { fib236: number; fib382: number; fib500: number; fib618: number };
  trailingDefensePrice?: number;
}): KeyLevelClusters {
  const { currentPrice, darvasBox, bollinger, pivotPoints, fibonacci, trailingDefensePrice } = params;

  interface RawLevel {
    price: number;
    source: string;
  }

  const rawLevels: RawLevel[] = [];

  if (darvasBox) {
    if (darvasBox.upper > 0) rawLevels.push({ price: darvasBox.upper, source: `箱頂 ${darvasBox.upper}` });
    if (darvasBox.lower > 0) rawLevels.push({ price: darvasBox.lower, source: `箱底 ${darvasBox.lower}` });
  }

  if (bollinger) {
    if (bollinger.upper > 0) rawLevels.push({ price: bollinger.upper, source: `布林上軌 ${bollinger.upper}` });
    if (bollinger.mid > 0) rawLevels.push({ price: bollinger.mid, source: `布林中軌 ${bollinger.mid}` });
    if (bollinger.lower > 0) rawLevels.push({ price: bollinger.lower, source: `布林下軌 ${bollinger.lower}` });
  }

  if (pivotPoints) {
    if (pivotPoints.r1 > 0) rawLevels.push({ price: pivotPoints.r1, source: `Pivot R1 ${pivotPoints.r1}` });
    if (pivotPoints.r2 > 0) rawLevels.push({ price: pivotPoints.r2, source: `Pivot R2 ${pivotPoints.r2}` });
    if (pivotPoints.pivot > 0) rawLevels.push({ price: pivotPoints.pivot, source: `樞紐中軸 ${pivotPoints.pivot}` });
    if (pivotPoints.s1 > 0) rawLevels.push({ price: pivotPoints.s1, source: `Pivot S1 ${pivotPoints.s1}` });
    if (pivotPoints.s2 > 0) rawLevels.push({ price: pivotPoints.s2, source: `Pivot S2 ${pivotPoints.s2}` });
  }

  if (fibonacci) {
    if (fibonacci.fib236 > 0) rawLevels.push({ price: fibonacci.fib236, source: `Fib 0.236 (${fibonacci.fib236})` });
    if (fibonacci.fib382 > 0) rawLevels.push({ price: fibonacci.fib382, source: `Fib 0.382 (${fibonacci.fib382})` });
    if (fibonacci.fib500 > 0) rawLevels.push({ price: fibonacci.fib500, source: `Fib 0.500 (${fibonacci.fib500})` });
    if (fibonacci.fib618 > 0) rawLevels.push({ price: fibonacci.fib618, source: `Fib 0.618 (${fibonacci.fib618})` });
  }

  if (trailingDefensePrice && trailingDefensePrice > 0) {
    rawLevels.push({ price: trailingDefensePrice, source: `ATR吊燈防守 ${trailingDefensePrice}` });
  }

  // 區分上方阻力與下方支撐
  const resistances = rawLevels
    .filter((l) => l.price >= currentPrice)
    .sort((a, b) => a.price - b.price);

  const supports = rawLevels
    .filter((l) => l.price < currentPrice)
    .sort((a, b) => b.price - a.price);

  // 聚類相距在 1.5% 內的相鄰價位
  function clusterPoints(levels: RawLevel[]): KeyLevelCluster[] {
    if (levels.length === 0) return [];
    const clusters: KeyLevelCluster[] = [];
    let currentGroup: RawLevel[] = [levels[0]];

    for (let i = 1; i < levels.length; i++) {
      const prev = currentGroup[currentGroup.length - 1];
      const curr = levels[i];
      const distanceRatio = Math.abs(curr.price - prev.price) / prev.price;
      if (distanceRatio <= 0.015) {
        currentGroup.push(curr);
      } else {
        const prices = currentGroup.map((g) => g.price);
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);
        const avgP = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
        const distPct = currentPrice > 0 ? Math.round(((avgP - currentPrice) / currentPrice) * 10000) / 100 : 0;
        const sources = currentGroup.map((g) => g.source);
        clusters.push({
          price: avgP,
          spanStart: minP,
          spanEnd: maxP,
          label: sources.join(' + '),
          distancePercent: distPct,
          sources,
        });
        currentGroup = [curr];
      }
    }

    if (currentGroup.length > 0) {
      const prices = currentGroup.map((g) => g.price);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const avgP = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
      const distPct = currentPrice > 0 ? Math.round(((avgP - currentPrice) / currentPrice) * 10000) / 100 : 0;
      const sources = currentGroup.map((g) => g.source);
      clusters.push({
        price: avgP,
        spanStart: minP,
        spanEnd: maxP,
        label: sources.join(' + '),
        distancePercent: distPct,
        sources,
      });
    }

    return clusters;
  }

  const resClusters = clusterPoints(resistances);
  const supClusters = clusterPoints(supports);

  return {
    primaryResistance: resClusters[0],
    secondaryResistance: resClusters[1] || resClusters[0],
    shortTermDefense: supClusters[0],
    structuralDefense: supClusters[supClusters.length - 1] || supClusters[0],
  };
}

/**
 * 10. 背離偵測純函式 (Divergence Detector)
 */
export function detectDivergence(
  closes: number[],
  indicatorSeries: number[]
): DivergenceSignal {
  if (!closes || !indicatorSeries || closes.length < 8 || closes.length !== indicatorSeries.length) {
    return { hasBearishDivergence: false, hasBullishDivergence: false };
  }

  // 尋找局部波峰 (Swing Highs)
  const peakIndices: number[] = [];
  for (let i = 1; i < closes.length - 1; i++) {
    if (closes[i] >= closes[i - 1] && closes[i] >= closes[i + 1]) {
      peakIndices.push(i);
    }
  }

  let hasBearishDivergence = false;
  let hasBullishDivergence = false;
  let description: string | undefined = undefined;

  if (peakIndices.length >= 2) {
    const p1 = peakIndices[peakIndices.length - 2];
    const p2 = peakIndices[peakIndices.length - 1];

    if (closes[p2] > closes[p1] && indicatorSeries[p2] < indicatorSeries[p1]) {
      hasBearishDivergence = true;
      description = `偵測到頂背離：股價二度創高 (${closes[p1]} ➔ ${closes[p2]})，但動能指標高點走低，顯示主力買盤力竭或倒貨跡象。`;
    }
  }

  // 尋找局部波谷 (Swing Lows)
  const troughIndices: number[] = [];
  for (let i = 1; i < closes.length - 1; i++) {
    if (closes[i] <= closes[i - 1] && closes[i] <= closes[i + 1]) {
      troughIndices.push(i);
    }
  }

  if (troughIndices.length >= 2) {
    const t1 = troughIndices[troughIndices.length - 2];
    const t2 = troughIndices[troughIndices.length - 1];

    if (closes[t2] < closes[t1] && indicatorSeries[t2] > indicatorSeries[t1]) {
      hasBullishDivergence = true;
      description = `偵測到底背離：股價破底但動能指標率先抬頭，潛在反轉築底訊號。`;
    }
  }

  return {
    hasBearishDivergence,
    hasBullishDivergence,
    description,
  };
}

/**
 * 11. 價格行為假突破誘多偵測 (Price Action Trap Detector)
 */
export function detectPriceActionTraps(params: {
  open: number;
  high: number;
  low: number;
  close: number;
  resistanceLevel?: number;
  supportLevel?: number;
}): PriceActionTrapSignal {
  const { open, high, low, close, resistanceLevel, supportLevel } = params;

  const body = Math.abs(close - open);
  const upperShadow = high - Math.max(open, close);
  const lowerShadow = Math.min(open, close) - low;

  let hasBullTrap = false;
  let hasBearTrap = false;
  let description: string | undefined = undefined;

  // 假突破：衝過阻力但收盤壓回，且上影線顯著長於實體 (墓碑線/射擊之星)
  if (resistanceLevel && high >= resistanceLevel && close <= resistanceLevel * 1.005) {
    if (upperShadow >= body * 1.5 || close < open) {
      hasBullTrap = true;
      description = `壓力位 (${resistanceLevel}) 出現長上影線墓碑倒錘，盤中突破無效收盤壓回，為典型誘多假突破 (Bull Trap)。`;
    }
  }

  // 假跌破：摜破支撐但收盤拉回長下影線 (破底翻錘子線)
  if (supportLevel && low <= supportLevel && close >= supportLevel * 0.995) {
    if (lowerShadow >= body * 1.5 && close > open) {
      hasBearTrap = true;
      description = `支撐位 (${supportLevel}) 留下長下影線破底翻，空方摜壓失敗，買盤積極承接。`;
    }
  }

  return {
    hasBullTrap,
    hasBearTrap,
    description,
  };
}

/**
 * 12. 多空共振量化評估 (Technical Confluence Scoring Engine) - 升級版大腦
 */
export interface ConfluenceInputParams {
  currentPrice?: number;
  maAlignment?: 'BULLISH' | 'BEARISH' | 'ENTANGLED';
  isAboveMa20?: boolean;
  isMacdHistPositive?: boolean;
  rsi14?: number;
  kdStatus?: 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'HIGH_DULL' | 'LOW_DULL' | 'NEUTRAL';
  cci20?: number;
  boxStatus?: 'BREAKOUT_UP' | 'BREAKOUT_DOWN' | 'INSIDE_BOX';
  isVolumeSurgeBullish?: boolean;
  obvTrend?: 'RISING' | 'FALLING' | 'FLAT';
  adx?: number;
  pdi?: number;
  mdi?: number;
  bandwidthPercent?: number;
  darvasBox?: { upper: number; lower: number };
  bollinger?: { upper: number; mid: number; lower: number };
  pivotPoints?: { pivot: number; r1: number; r2: number; s1: number; s2: number };
  fibonacci?: { fib236: number; fib382: number; fib500: number; fib618: number };
  trailingDefensePrice?: number;
  closes?: number[];
  chipsContext?: {
    institutional5DayNetBuy?: number;
    majorHoldersDiffPercent?: number;
  };
}

export function calculateTechnicalConfluence(params: ConfluenceInputParams): TechnicalConfluence {
  const currentPrice = params.currentPrice ?? 10;
  let score = 50; // 基底中性分數
  const primarySignals: string[] = [];
  let riskAlert: string | undefined = undefined;

  // 1. 市場狀態機評估
  const regimeInfo = evaluateMarketRegime({
    adx: params.adx,
    pdi: params.pdi,
    mdi: params.mdi,
    bandwidthPercent: params.bandwidthPercent,
    maAlignment: params.maAlignment,
  });

  // 2. 趨勢維度 (權重 35%) - 帶有無趨勢盤整鈍化折扣
  const isChoppy = typeof params.adx === 'number' && params.adx < 20;
  const trendMultiplier = isChoppy ? 0.4 : 1.0;

  if (params.maAlignment === 'BULLISH') {
    score += Math.round(15 * trendMultiplier);
    primarySignals.push('多天期均線呈多頭排列');
  } else if (params.maAlignment === 'BEARISH') {
    score -= Math.round(15 * trendMultiplier);
    primarySignals.push('多天期均線呈空頭排列');
  }

  if (params.isAboveMa20) {
    score += Math.round(10 * trendMultiplier);
    primarySignals.push('股價穩站 20 日月線之上');
  } else if (params.isAboveMa20 === false) {
    score -= Math.round(10 * trendMultiplier);
    primarySignals.push('跌破 20 日月線支撐防線');
  }

  if (params.isMacdHistPositive) {
    score += Math.round(10 * trendMultiplier);
    primarySignals.push('MACD 柱狀體維持紅柱擴張');
  } else if (params.isMacdHistPositive === false) {
    score -= Math.round(10 * trendMultiplier);
    primarySignals.push('MACD 柱狀體翻綠偏空');
  }

  // 3. 動能維度 (權重 25%)
  if (typeof params.rsi14 === 'number') {
    if (params.rsi14 >= 55 && params.rsi14 <= 75) {
      score += 10;
      primarySignals.push(`RSI(14) 位於強勢攻擊區 (${params.rsi14})`);
    } else if (params.rsi14 > 75) {
      score += 5;
      riskAlert = 'RSI(14) 進入極端超買區 (>75)，慎防短線正乖離過大拉回';
    } else if (params.rsi14 <= 45 && params.rsi14 >= 25) {
      score -= 5;
      primarySignals.push(`RSI(14) 處於偏弱弱勢區 (${params.rsi14})`);
    } else if (params.rsi14 < 25) {
      score -= 10;
      primarySignals.push(`RSI(14) 弱勢探底 (${params.rsi14})`);
    }
  }

  if (params.kdStatus === 'GOLDEN_CROSS' || params.kdStatus === 'HIGH_DULL') {
    score += 10;
    primarySignals.push(params.kdStatus === 'HIGH_DULL' ? 'KD 高檔強勢鈍化軋空' : 'KD 低檔黃金交叉向上');
  } else if (params.kdStatus === 'DEATH_CROSS' || params.kdStatus === 'LOW_DULL') {
    score -= 10;
    primarySignals.push('KD 死亡交叉向下');
  }

  if (typeof params.cci20 === 'number') {
    if (params.cci20 > 50) {
      score += 5;
    } else if (params.cci20 < -50) {
      score -= 5;
    }
  }

  // 4. 型態與支撐 (權重 20%)
  if (params.boxStatus === 'BREAKOUT_UP') {
    score += 10;
    primarySignals.push('強勢突破近 60 日 Darvas 箱頂防線');
  } else if (params.boxStatus === 'BREAKOUT_DOWN') {
    score -= 10;
    primarySignals.push('跌破 Darvas 箱底關鍵防守');
    riskAlert = '關鍵防守破位，首要執行停損保全資金紀律';
  }

  // 5. 量能資金 (權重 20%)
  if (params.isVolumeSurgeBullish) {
    score += 10;
    primarySignals.push('出量突破，大戶買盤進駐');
  }

  if (params.obvTrend === 'RISING') {
    score += 10;
    primarySignals.push('OBV 能量潮持續創新高');
  } else if (params.obvTrend === 'FALLING') {
    score -= 10;
    primarySignals.push('OBV 資金持續淨流出');
  }

  // 6. 多空矛盾懲罰機制 (Contradiction Penalty)
  let contradictionPenaltyApplied = false;
  if (
    params.maAlignment === 'BULLISH' &&
    typeof params.pdi === 'number' &&
    typeof params.mdi === 'number' &&
    params.mdi > params.pdi
  ) {
    // 均線多排但空方動能 > 多方動能，且無趨勢盤整
    contradictionPenaltyApplied = true;
    score -= 20;
    primarySignals.push(`多空矛盾警戒：均線排列偏多但空方動能 (-DI ${params.mdi.toFixed(1)}) 壓制多方 (+DI ${params.pdi.toFixed(1)})`);
    riskAlert = '均線多頭與實質動能存在背離矛盾，極易遭遇箱頂假突破或震盪折返';
    // 強制封頂於 58 分 (NEUTRAL)
    score = Math.min(score, 58);
  }

  // 7. 籌碼背離交叉校驗 (Smart Money Confluence)
  let chipsContradiction = false;
  if (params.chipsContext) {
    const net5d = params.chipsContext.institutional5DayNetBuy ?? 0;
    if (score >= 60 && net5d < -1000) {
      chipsContradiction = true;
      score -= 10;
      primarySignals.push(`籌碼背離：技術面偏多但主力近5日淨賣出 ${Math.abs(net5d)} 張`);
      riskAlert = (riskAlert ? riskAlert + '；' : '') + '籌碼面警訊：外資主力近期呈現逢高出貨，慎防主力拉高倒貨';
    }
  }

  // 邊界約束 0 ~ 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  let rating: TechnicalConfluence['rating'] = 'NEUTRAL';
  let actionAdvice = '多空力道膠著，建議靜待均線與量能方向確立，不宜躁進。';

  if (score >= 80) {
    rating = 'STRONG_BULL';
    actionAdvice = '多頭共振動能強勁！建議順勢持有，以 ATR 動態防守線或箱頂為移動停利點。';
  } else if (score >= 60) {
    rating = 'MODERATE_BULL';
    actionAdvice = '盤勢偏多整理，可待拉回均線或支撐位時分批佈局。';
  } else if (score <= 20) {
    rating = 'STRONG_BEAR';
    actionAdvice = '空方勢力全面主導，破線危機未除，嚴格落實停損，切忌盲目摸底。';
  } else if (score <= 40) {
    rating = 'MODERATE_BEAR';
    actionAdvice = '技術面偏弱修正，上方套牢壓力沉重，宜降低持股水位保守應對。';
  }

  // 8. 關鍵位密集聚集 (Clusters)
  const clusters = calculateKeyLevelClusters({
    currentPrice,
    darvasBox: params.darvasBox,
    bollinger: params.bollinger,
    pivotPoints: params.pivotPoints,
    fibonacci: params.fibonacci,
    trailingDefensePrice: params.trailingDefensePrice,
  });

  // 9. 實戰交易階梯矩陣 (Actionable Trade Matrix)
  const primaryResPrice = clusters.primaryResistance?.price ?? (currentPrice * 1.03);
  const secondaryResPrice = clusters.secondaryResistance?.price ?? (currentPrice * 1.06);
  const shortDefensePrice = clusters.shortTermDefense?.price ?? (params.trailingDefensePrice ?? currentPrice * 0.97);
  const structDefensePrice = clusters.structuralDefense?.price ?? (params.darvasBox?.lower ?? currentPrice * 0.95);

  const actionMatrix: ActionableTradeMatrix = {
    primaryResistanceZone: {
      price: Math.round(primaryResPrice * 100) / 100,
      label: clusters.primaryResistance?.label ?? '近期關鍵壓力帶',
      distancePercent: Math.round(((primaryResPrice - currentPrice) / currentPrice) * 10000) / 100,
    },
    expansionTargetZone: {
      price: Math.round(secondaryResPrice * 100) / 100,
      label: clusters.secondaryResistance?.label ?? '波段突破加碼目標',
      distancePercent: Math.round(((secondaryResPrice - currentPrice) / currentPrice) * 10000) / 100,
    },
    shortTermDefenseLine: {
      price: Math.round(shortDefensePrice * 100) / 100,
      label: clusters.shortTermDefense?.label ?? 'ATR吊燈 / 20MA 動態防守',
      distancePercent: Math.round(((shortDefensePrice - currentPrice) / currentPrice) * 10000) / 100,
    },
    structuralInvalidationLine: {
      price: Math.round(structDefensePrice * 100) / 100,
      label: clusters.structuralDefense?.label ?? '結構底線 (箱底防守)',
      distancePercent: Math.round(((structDefensePrice - currentPrice) / currentPrice) * 10000) / 100,
    },
  };

  // 10. 背離與價格行為偵測
  const divergence: DivergenceSignal = {
    hasBearishDivergence: false,
    hasBullishDivergence: false,
  };
  const priceActionTrap: PriceActionTrapSignal = {
    hasBullTrap: false,
    hasBearTrap: false,
  };

  // 11. 大白話 0 秒操盤語錄 (oneSentenceBottomLine)
  let oneSentenceBottomLine = `多空共振評定為 ${rating} (${score}分)。`;
  if (regimeInfo.regime === 'VOLATILITY_SQUEEZE') {
    oneSentenceBottomLine = `帶寬極度收斂進入變盤期，上方臨近 ${actionMatrix.primaryResistanceZone.price} 重壓，未帶量突破前切勿追價，短線防守設於 ${actionMatrix.shortTermDefenseLine.price}。`;
  } else if (contradictionPenaltyApplied) {
    oneSentenceBottomLine = `均線與動能存在背離矛盾，目前處於箱體震盪內部，上方第一壓力為 ${actionMatrix.primaryResistanceZone.price}，建議逢高分批減碼。`;
  } else if (score >= 80) {
    oneSentenceBottomLine = `強勢多頭主升段！以 ${actionMatrix.shortTermDefenseLine.price} 為動態移動停利防守線，突破 ${actionMatrix.primaryResistanceZone.price} 可順勢續抱。`;
  } else if (score <= 30) {
    oneSentenceBottomLine = `空方主導格局，已跌破重要支撐，建議嚴格以 ${actionMatrix.structuralInvalidationLine.price} 為最後底線落實停損保全資金。`;
  }

  return {
    score,
    rating,
    marketRegime: regimeInfo.regime,
    regimeLabel: regimeInfo.label,
    oneSentenceBottomLine,
    contradictionPenaltyApplied,
    primarySignals,
    actionAdvice,
    riskAlert,
    clusters,
    actionMatrix,
    divergence,
    priceActionTrap,
    chipsContradiction,
  };
}

/**
 * 13. 個股全指標綜合運算純函式 (Compute Omni Indicators) - 整合版
 */
export function computeOmniIndicators(params: {
  symbol: string;
  name: string;
  market: 'TW' | 'US';
  candles: DailyCandle[];
  currentPrice: number;
  previousClose?: number;
  chipsContext?: {
    institutional5DayNetBuy?: number;
    majorHoldersDiffPercent?: number;
  };
}): OmniIndicatorReport {
  const { symbol, name, market, candles, currentPrice, previousClose, chipsContext } = params;

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);
  const asOfDate = candles.length > 0 ? candles[candles.length - 1].date : new Date().toISOString().split('T')[0];

  // 1. 趨勢計算
  const ma = calculateMovingAverages(closes);
  const macdRaw = calculateMACD(closes);
  const dmiAdx = calculateDmiAdx(highs, lows, closes, 14);

  let maAlignment: TrendMetrics['maAlignment'] = 'ENTANGLED';
  if (ma.ma5 && ma.ma20 && ma.ma60) {
    if (ma.ma5 > ma.ma20 && ma.ma20 > ma.ma60) {
      maAlignment = 'BULLISH';
    } else if (ma.ma5 < ma.ma20 && ma.ma20 < ma.ma60) {
      maAlignment = 'BEARISH';
    }
  }

  const isMacdGolden =
    typeof macdRaw.macdHist === 'number' &&
    typeof macdRaw.prevMacdHist === 'number' &&
    macdRaw.prevMacdHist <= 0 &&
    macdRaw.macdHist > 0;
  const isMacdDeath =
    typeof macdRaw.macdHist === 'number' &&
    typeof macdRaw.prevMacdHist === 'number' &&
    macdRaw.prevMacdHist >= 0 &&
    macdRaw.macdHist < 0;

  const trend: TrendMetrics = {
    ma5: ma.ma5,
    ma20: ma.ma20,
    ma60: ma.ma60,
    ma120: ma.ma120,
    ma240: ma.ma240,
    maAlignment,
    macd: {
      dif: macdRaw.dif12_26 ?? 0,
      signal: macdRaw.macd9 ?? 0,
      hist: macdRaw.macdHist ?? 0,
      isGoldenCross: isMacdGolden,
      isDeathCross: isMacdDeath,
    },
    dmiAdx,
  };

  // 2. 動能擺盪
  const rsi6 = calculateRSI(closes, 6);
  const rsi14 = calculateRSI(closes, 14);
  const rsi24 = calculateRSI(closes, 24);
  const kd = calculateStochasticKD(highs, lows, closes, 9);
  const cci20 = calculateCCI(highs, lows, closes, 20);
  const williamsR14 = calculateWilliamsR(highs, lows, closes, 14);

  let rsiStatus: MomentumMetrics['rsiStatus'] = 'NEUTRAL';
  if (rsi14 !== undefined) {
    if (rsi14 >= 75) rsiStatus = 'OVERBOUGHT';
    else if (rsi14 >= 55) rsiStatus = 'BULLISH';
    else if (rsi14 <= 25) rsiStatus = 'OVERSOLD';
    else if (rsi14 <= 45) rsiStatus = 'BEARISH';
  }

  let kdStatus: MomentumMetrics['kd9']['status'] = 'NEUTRAL';
  if (kd.k9 !== undefined && kd.d9 !== undefined) {
    if (kd.k9 >= 80 && kd.d9 >= 80) kdStatus = 'HIGH_DULL';
    else if (kd.k9 <= 20 && kd.d9 <= 20) kdStatus = 'LOW_DULL';
    else if (kd.prevK9 && kd.prevD9 && kd.prevK9 <= kd.prevD9 && kd.k9 > kd.d9) kdStatus = 'GOLDEN_CROSS';
    else if (kd.prevK9 && kd.prevD9 && kd.prevK9 >= kd.prevD9 && kd.k9 < kd.d9) kdStatus = 'DEATH_CROSS';
  }

  const momentum: MomentumMetrics = {
    rsi6,
    rsi14,
    rsi24,
    rsiStatus,
    kd9: {
      k: kd.k9 ?? 50,
      d: kd.d9 ?? 50,
      status: kdStatus,
    },
    cci20,
    williamsR14,
  };

  // 3. 波動通道與真實波幅
  const bb = calculateBollingerSqueeze(candles);
  const atrDefense = calculateAtrTrailingDefense(candles);
  const bias20Percent = ma.ma20 ? Math.round(((currentPrice - ma.ma20) / ma.ma20) * 10000) / 100 : 0;
  const bias60Percent = ma.ma60 ? Math.round(((currentPrice - ma.ma60) / ma.ma60) * 10000) / 100 : 0;

  const percentB =
    bb.upper !== bb.lower
      ? Math.round(((currentPrice - bb.lower) / (bb.upper - bb.lower)) * 1000) / 1000
      : 0.5;

  const volatility: VolatilityMetrics = {
    bollinger: {
      upper: bb.upper,
      mid: bb.mid,
      lower: bb.lower,
      bandwidthPercent: bb.bandwidth,
      percentB,
      isSqueeze: bb.isSqueeze,
    },
    atr14: atrDefense.atr14,
    trailingDefensePrice: atrDefense.trailingDefensePrice,
    bias20Percent,
    bias60Percent,
  };

  // 4. 量能與資金流
  const volMetrics = calculateVolumeMetrics(volumes);
  const obv = calculateOBV(closes, volumes);
  const yesterdayVolume = volMetrics.yesterdayVolume ?? (volumes.length > 0 ? volumes[volumes.length - 1] : 0);
  const avgVolume5 = volMetrics.avgVolume5 ?? 1;
  const avgVolume20 = volMetrics.avgVolume20 ?? 1;
  const volumeRatio5 = avgVolume5 > 0 ? Math.round((yesterdayVolume / avgVolume5) * 100) / 100 : 1;

  const volumeFlow: VolumeFlowMetrics = {
    yesterdayVolume,
    avgVolume5,
    avgVolume20,
    volumeRatio5,
    isSurge: !!volMetrics.isYesterdaySurge,
    isDryUp: yesterdayVolume <= avgVolume20 * 0.35,
    obv,
  };

  // 5. 關鍵支撐壓力
  const box = detectDarvasBox(candles);
  const fib = calculateFibonacciLevels(highs.slice(-60), lows.slice(-60));
  const lastCandle = candles[candles.length - 1] || {
    open: currentPrice,
    high: currentPrice,
    low: currentPrice,
    close: currentPrice,
  };
  const pivot = calculatePivotPoints(lastCandle.high, lastCandle.low, lastCandle.close);

  const levels: SupportResistanceLevels = {
    darvasBox: {
      upper: box.boxUpper ?? currentPrice,
      lower: box.boxLower ?? currentPrice,
      status: box.boxStatus,
    },
    fibonacci: fib,
    pivotPoints: pivot,
  };

  // 6. 多空共振評分 (升級版)
  const isAboveMa20 = ma.ma20 ? currentPrice >= ma.ma20 : undefined;
  const isMacdHistPositive = typeof macdRaw.macdHist === 'number' ? macdRaw.macdHist >= 0 : undefined;
  const isVolumeSurgeBullish = volumeFlow.isSurge && (previousClose ? currentPrice > previousClose : true);

  const confluence = calculateTechnicalConfluence({
    currentPrice,
    maAlignment,
    isAboveMa20,
    isMacdHistPositive,
    rsi14,
    kdStatus,
    cci20,
    boxStatus: box.boxStatus,
    isVolumeSurgeBullish,
    obvTrend: obv.trend,
    adx: dmiAdx?.adx,
    pdi: dmiAdx?.pdi,
    mdi: dmiAdx?.mdi,
    bandwidthPercent: bb.bandwidth,
    darvasBox: { upper: box.boxUpper ?? currentPrice, lower: box.boxLower ?? currentPrice },
    bollinger: { upper: bb.upper, mid: bb.mid, lower: bb.lower },
    pivotPoints: pivot,
    fibonacci: fib,
    trailingDefensePrice: atrDefense.trailingDefensePrice,
    closes,
    chipsContext,
  });

  // 補足背離與價格行為
  if (closes.length >= 10 && rsi14 !== undefined) {
    const rsiValues = closes.map((_, i) => calculateRSI(closes.slice(0, i + 1), 14) ?? 50);
    confluence.divergence = detectDivergence(closes, rsiValues);
  }

  if (lastCandle) {
    confluence.priceActionTrap = detectPriceActionTraps({
      open: lastCandle.open ?? currentPrice,
      high: lastCandle.high,
      low: lastCandle.low,
      close: lastCandle.close,
      resistanceLevel: confluence.actionMatrix.primaryResistanceZone.price,
      supportLevel: confluence.actionMatrix.shortTermDefenseLine.price,
    });
  }

  const dailyChange = previousClose ? Math.round((currentPrice - previousClose) * 100) / 100 : undefined;
  const dailyChangePercent =
    previousClose && previousClose > 0
      ? Math.round(((currentPrice - previousClose) / previousClose) * 10000) / 100
      : undefined;

  return {
    symbol,
    name,
    market,
    asOfDate,
    currentPrice,
    previousClose,
    dailyChange,
    dailyChangePercent,
    candleCount: candles.length,
    trend,
    momentum,
    volatility,
    volumeFlow,
    levels,
    confluence,
  };
}
