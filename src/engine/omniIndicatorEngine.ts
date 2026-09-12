import { DailyCandle } from '../types/indicators';
import {
  TrendMetrics,
  MomentumMetrics,
  VolatilityMetrics,
  VolumeFlowMetrics,
  SupportResistanceLevels,
  TechnicalConfluence,
  OmniIndicatorReport,
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

  // 1. 初次平均上漲與下跌幅度
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

  // 2. Wilder Smoothing 平滑迭代後續數據
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

    // True Range
    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trs.push(tr);

    // Directional Movement
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

  // 初次平滑
  let smoothTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothPlusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

  const dxHistory: number[] = [];

  for (let i = period; i < trs.length; i++) {
    smoothTR = smoothTR - smoothTR / period + trs[i];
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDMs[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDMs[i];

    const pdi = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const mdi = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    const sum = pdi + mdi;
    const dx = sum > 0 ? (Math.abs(pdi - mdi) / sum) * 100 : 0;
    dxHistory.push(dx);
  }

  const pdi = smoothTR > 0 ? Math.round((smoothPlusDM / smoothTR) * 10000) / 100 : 0;
  const mdi = smoothTR > 0 ? Math.round((smoothMinusDM / smoothTR) * 10000) / 100 : 0;

  // ADX 是 DX 的平滑
  let adx = 20;
  if (dxHistory.length > 0) {
    const adxSlice = dxHistory.slice(-period);
    adx = Math.round((adxSlice.reduce((a, b) => a + b, 0) / adxSlice.length) * 100) / 100;
  }

  let trendDirection: 'BULLISH' | 'BEARISH' | 'RANGE' = 'RANGE';
  if (adx >= 20) {
    if (pdi > mdi) {
      trendDirection = 'BULLISH';
    } else if (mdi > pdi) {
      trendDirection = 'BEARISH';
    }
  }

  return {
    pdi,
    mdi,
    adx,
    trendDirection,
  };
}

/**
 * 3. 計算 CCI 順勢指標 (Commodity Channel Index, 週期 N=20)
 */
export function calculateCCI(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 20
): number | undefined {
  const len = closes.length;
  if (!highs || !lows || !closes || len < period) {
    return undefined;
  }

  const tps: number[] = [];
  for (let i = 0; i < len; i++) {
    tps.push((highs[i] + lows[i] + closes[i]) / 3);
  }

  const recentTps = tps.slice(-period);
  const currentTp = recentTps[recentTps.length - 1];
  const smaTp = recentTps.reduce((a, b) => a + b, 0) / period;

  const meanDeviation =
    recentTps.reduce((acc, val) => acc + Math.abs(val - smaTp), 0) / period;

  if (meanDeviation === 0) {
    return 0;
  }

  const cci = (currentTp - smaTp) / (0.015 * meanDeviation);
  return Math.round(cci * 100) / 100;
}

/**
 * 4. 計算 Williams %R 威廉指標 (週期 N=14)
 */
export function calculateWilliamsR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number | undefined {
  const len = closes.length;
  if (!highs || !lows || !closes || len < period) {
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
 * 5. 計算 OBV 能量潮累積與近期趨勢
 */
export function calculateOBV(
  closes: number[],
  volumes: number[]
): {
  current: number;
  trend: 'RISING' | 'FALLING' | 'FLAT';
} {
  if (!closes || !volumes || closes.length === 0 || volumes.length === 0) {
    return { current: 0, trend: 'FLAT' };
  }

  let obv = volumes[0] || 0;
  const history: number[] = [obv];

  for (let i = 1; i < closes.length; i++) {
    const currentPrice = closes[i];
    const prevPrice = closes[i - 1];
    const vol = volumes[i] || 0;

    if (currentPrice > prevPrice) {
      obv += vol;
    } else if (currentPrice < prevPrice) {
      obv -= vol;
    }
    history.push(obv);
  }

  let trend: 'RISING' | 'FALLING' | 'FLAT' = 'FLAT';
  if (history.length >= 2) {
    const lookback = history.slice(-Math.min(5, history.length));
    const start = lookback[0];
    const end = lookback[lookback.length - 1];
    if (end > start) {
      trend = 'RISING';
    } else if (end < start) {
      trend = 'FALLING';
    }
  }

  return {
    current: obv,
    trend,
  };
}

/**
 * 6. 計算斐波那契回撤黃金比例位階 (Fibonacci Retracement)
 */
export function calculateFibonacciLevels(
  highs: number[],
  lows: number[]
): SupportResistanceLevels['fibonacci'] {
  const high = highs && highs.length > 0 ? Math.max(...highs) : 0;
  const low = lows && lows.length > 0 ? Math.min(...lows) : 0;
  const diff = high - low;

  return {
    high,
    low,
    fib236: Math.round((high - diff * 0.236) * 100) / 100,
    fib382: Math.round((high - diff * 0.382) * 100) / 100,
    fib500: Math.round((high - diff * 0.5) * 100) / 100,
    fib618: Math.round((high - diff * 0.618) * 100) / 100,
    fib786: Math.round((high - diff * 0.786) * 100) / 100,
  };
}

/**
 * 7. 計算經典樞紐點 (Standard Pivot Points)
 */
export function calculatePivotPoints(
  high: number,
  low: number,
  close: number
): SupportResistanceLevels['pivotPoints'] {
  const pivot = Math.round(((high + low + close) / 3) * 100) / 100;
  const r1 = Math.round((2 * pivot - low) * 100) / 100;
  const s1 = Math.round((2 * pivot - high) * 100) / 100;
  const r2 = Math.round((pivot + (high - low)) * 100) / 100;
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
 * 8. 多空共振量化評估 (Technical Confluence Scoring Engine)
 */
export interface ConfluenceInputParams {
  maAlignment?: 'BULLISH' | 'BEARISH' | 'ENTANGLED';
  isAboveMa20?: boolean;
  isMacdHistPositive?: boolean;
  rsi14?: number;
  kdStatus?: 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'HIGH_DULL' | 'LOW_DULL' | 'NEUTRAL';
  cci20?: number;
  boxStatus?: 'BREAKOUT_UP' | 'BREAKOUT_DOWN' | 'INSIDE_BOX';
  isVolumeSurgeBullish?: boolean;
  obvTrend?: 'RISING' | 'FALLING' | 'FLAT';
}

export function calculateTechnicalConfluence(params: ConfluenceInputParams): TechnicalConfluence {
  let score = 50; // 基底中性分數
  const primarySignals: string[] = [];
  let riskAlert: string | undefined = undefined;

  // 1. 趨勢維度 (權重 35%)
  if (params.maAlignment === 'BULLISH') {
    score += 15;
    primarySignals.push('多天期均線呈多頭排列');
  } else if (params.maAlignment === 'BEARISH') {
    score -= 15;
    primarySignals.push('多天期均線呈空頭排列');
  }

  if (params.isAboveMa20) {
    score += 10;
    primarySignals.push('股價穩站 20 日月線之上');
  } else if (params.isAboveMa20 === false) {
    score -= 10;
    primarySignals.push('跌破 20 日月線支撐防線');
  }

  if (params.isMacdHistPositive) {
    score += 10;
    primarySignals.push('MACD 柱狀體維持紅柱擴張');
  } else if (params.isMacdHistPositive === false) {
    score -= 10;
    primarySignals.push('MACD 柱狀體翻綠偏空');
  }

  // 2. 動能維度 (權重 25%)
  if (typeof params.rsi14 === 'number') {
    if (params.rsi14 >= 55 && params.rsi14 <= 75) {
      score += 10;
      primarySignals.push(`RSI(14) 位於強勢攻擊區 (${params.rsi14})`);
    } else if (params.rsi14 > 80) {
      score += 5;
      riskAlert = 'RSI 極度超買，正乖離過大，慎防短線獲利回吐拉回';
    } else if (params.rsi14 <= 35) {
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

  // 3. 型態與支撐 (權重 20%)
  if (params.boxStatus === 'BREAKOUT_UP') {
    score += 10;
    primarySignals.push('強勢突破近 60 日 Darvas 箱頂防線');
  } else if (params.boxStatus === 'BREAKOUT_DOWN') {
    score -= 10;
    primarySignals.push('跌破 Darvas 箱底關鍵防守');
    riskAlert = '關鍵防守破位，首要執行停損保全資金紀律';
  }

  // 4. 量能資金 (權重 20%)
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

  // 嚴密邊界約束 0 ~ 100
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

  return {
    score,
    rating,
    primarySignals,
    actionAdvice,
    riskAlert,
  };
}

/**
 * 9. 個股全指標綜合運算純函式 (Compute Omni Indicators)
 */
export function computeOmniIndicators(params: {
  symbol: string;
  name: string;
  market: 'TW' | 'US';
  candles: DailyCandle[];
  currentPrice: number;
  previousClose?: number;
}): OmniIndicatorReport {
  const { symbol, name, market, candles, currentPrice, previousClose } = params;

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

  // 3. 波動通道
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
  const lastCandle = candles[candles.length - 1] || { high: currentPrice, low: currentPrice, close: currentPrice };
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

  // 6. 多空共振評分
  const isAboveMa20 = ma.ma20 ? currentPrice >= ma.ma20 : undefined;
  const isMacdHistPositive = typeof macdRaw.macdHist === 'number' ? macdRaw.macdHist >= 0 : undefined;
  const isVolumeSurgeBullish = volumeFlow.isSurge && (previousClose ? currentPrice > previousClose : true);

  const confluence = calculateTechnicalConfluence({
    maAlignment,
    isAboveMa20,
    isMacdHistPositive,
    rsi14,
    kdStatus,
    cci20,
    boxStatus: box.boxStatus,
    isVolumeSurgeBullish,
    obvTrend: obv.trend,
  });

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
