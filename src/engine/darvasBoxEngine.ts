import {
  DailyCandle,
  BoxStatus,
  TrendSlope,
} from '../types/indicators';

export const DEFAULT_LOOKBACK_BARS = 20;

/**
 * 1. 箱子戰術與三日法則 (Darvas Box Theory)
 * - 箱頂：前波高點後連續 3 個交易日未創更高價確立
 * - 箱底：前波低點後連續 3 個交易日未創更低價確立
 */
export function detectDarvasBox(candles: DailyCandle[]): {
  boxUpper?: number;
  boxLower?: number;
  boxStatus: BoxStatus;
  boxWidthPercent?: number;
} {
  if (candles.length < 4) {
    return { boxStatus: 'INSIDE_BOX' };
  }

  // 尋找最近確認的箱頂與箱底
  let confirmedUpper: number | undefined;
  let confirmedLower: number | undefined;

  // 從近到遠回溯尋找滿足三日法則的高低點
  for (let i = candles.length - 4; i >= 0; i--) {
    const candidate = candles[i];
    const after1 = candles[i + 1];
    const after2 = candles[i + 2];
    const after3 = candles[i + 3];

    // 三日不破高確認箱頂
    if (!confirmedUpper) {
      if (
        candidate.high > after1.high &&
        candidate.high > after2.high &&
        candidate.high > after3.high
      ) {
        confirmedUpper = candidate.high;
      }
    }

    // 三日不破低確認箱底
    if (!confirmedLower) {
      if (
        candidate.low < after1.low &&
        candidate.low < after2.low &&
        candidate.low < after3.low
      ) {
        confirmedLower = candidate.low;
      }
    }

    if (confirmedUpper !== undefined && confirmedLower !== undefined) {
      break;
    }
  }

  // 預設 fallback 為前波 (排除當日 K 線) 近 20 日高低
  if (confirmedUpper === undefined || confirmedLower === undefined) {
    const pastCandles = candles.slice(0, -1);
    const lookback = pastCandles.length > 0 ? pastCandles.slice(-DEFAULT_LOOKBACK_BARS) : candles;
    confirmedUpper = Math.max(...lookback.map((c) => c.high));
    confirmedLower = Math.min(...lookback.map((c) => c.low));
  }

  const currentClose = candles[candles.length - 1].close;
  let boxStatus: BoxStatus = 'INSIDE_BOX';

  if (currentClose > confirmedUpper) {
    boxStatus = 'BREAKOUT_UP';
  } else if (currentClose < confirmedLower) {
    boxStatus = 'BREAKOUT_DOWN';
  }

  const boxWidthPercent =
    confirmedLower > 0
      ? Math.round(((confirmedUpper - confirmedLower) / confirmedLower) * 1000) / 10
      : undefined;

  return {
    boxUpper: confirmedUpper,
    boxLower: confirmedLower,
    boxStatus,
    boxWidthPercent,
  };
}

/**
 * 2.1 獨立導出：破底翻反轉偵測純函式 (Spec 0216 Ticket 01 & Line 87)
 * 基準：以箱底 boxLower 為準，盤中跌破箱底但收盤強勢站回箱底之上，且下影線佔振幅 >= 50%
 * 下影線精確幾何公式：Math.min(open, close) - low (杜絕光頭長紅陽線將實體誤算為下影線)
 */
export function detectBottomPenetration(
  candles: DailyCandle[],
  boxLower?: number
): boolean {
  if (candles.length === 0 || boxLower === undefined || boxLower <= 0) {
    return false;
  }

  const current = candles[candles.length - 1];
  const totalRange = current.high - current.low;
  // 真實下影線：K棒實體下沿至最低點距離
  const lowerShadow = Math.min(current.open, current.close) - current.low;
  const lowerShadowRatio = totalRange > 0 ? lowerShadow / totalRange : 0;
  const hasStrongLowerShadow = lowerShadowRatio >= 0.5;

  return current.low < boxLower && current.close >= boxLower && hasStrongLowerShadow;
}

/**
 * 2. 均線扣抵望遠鏡與「底穿上」假跌破型態
 */
export function calculateMaDeduction(candles: DailyCandle[], boxLower?: number): {
  ma5DeductionPrice?: number;
  ma20DeductionPrice?: number;
  ma20Slope: TrendSlope;
  isBottomPenetrationRebound: boolean;
  futureDeductions?: number[];
} {
  const len = candles.length;
  if (len === 0) {
    return { ma20Slope: 'FLAT', isBottomPenetrationRebound: false };
  }

  const current = candles[len - 1];
  const ma5DeductionPrice = len >= 6 ? candles[len - 6].close : undefined;
  const ma20DeductionPrice = len >= 21 ? candles[len - 21].close : undefined;



  // 均線扣抵時空望遠鏡：提取未來 3 日即將扣抵之歷史數列
  const futureDeductions: number[] = [];
  if (len >= 21) {
    if (len >= 20) futureDeductions.push(candles[len - 20].close);
    if (len >= 19) futureDeductions.push(candles[len - 19].close);
    if (len >= 18) futureDeductions.push(candles[len - 18].close);
  }

  let ma20Slope: TrendSlope = 'FLAT';
  if (ma20DeductionPrice !== undefined) {
    if (current.close > ma20DeductionPrice * 1.002) {
      ma20Slope = 'UP';
    } else if (current.close < ma20DeductionPrice * 0.998) {
      ma20Slope = 'DOWN';
    }

    // 均線扣抵時空望遠鏡進階校準 (Spec 0214)：若未來 3 日扣抵高檔天花板，均線即將下彎壓頂
    if (futureDeductions.length > 0) {
      const futureMax = Math.max(...futureDeductions);
      const futureAvg = futureDeductions.reduce((a, b) => a + b, 0) / futureDeductions.length;
      if (futureMax > current.close * 1.01 && futureAvg > current.close) {
        ma20Slope = 'DOWN';
      }
    }
  }

  // 偵測「底穿上」假跌破型態 (Spec 0216 Ticket 01 & Issue #401 & Issue #403): 呼叫獨立導出之 boolean detectBottomPenetration
  const isBottomPenetrationRebound = detectBottomPenetration(candles, boxLower);

  return {
    ma5DeductionPrice,
    ma20DeductionPrice,
    ma20Slope,
    isBottomPenetrationRebound,
    futureDeductions: futureDeductions.length > 0 ? futureDeductions : undefined,
  };
}

/**
 * 3. 布林通道極致壓縮 (Bollinger Bands & Squeeze)
 */
/**
 * 計算指定切片日 K 之布林帶寬純函式 (DRY 重構抽取)
 */
function computeBandwidthSlice(
  candles: DailyCandle[],
  period: number = 20,
  multiplier: number = 2
): { upper: number; mid: number; lower: number; bandwidth: number } {
  if (candles.length < period) {
    const p = candles.length > 0 ? candles[candles.length - 1].close : 0;
    return { upper: p, mid: p, lower: p, bandwidth: 0 };
  }
  const slice = candles.slice(-period);
  const closes = slice.map((c) => c.close);
  const mid = closes.reduce((acc, v) => acc + v, 0) / period;
  if (mid <= 0) return { upper: 0, mid: 0, lower: 0, bandwidth: 0 };

  const variance = closes.reduce((acc, v) => acc + Math.pow(v - mid, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  const upper = mid + multiplier * stdDev;
  const lower = mid - multiplier * stdDev;
  const bandwidth = Math.round(((upper - lower) / mid) * 10000) / 100;

  return {
    upper: Math.round(upper * 100) / 100,
    mid: Math.round(mid * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    bandwidth,
  };
}

export function calculateBollingerSqueeze(
  candles: DailyCandle[],
  period: number = 20,
  multiplier: number = 2
): {
  upper: number;
  mid: number;
  lower: number;
  bandwidth: number;
  isSqueeze: boolean;
  wasRecentSqueeze?: boolean;
} {
  if (candles.length < period) {
    const fallbackPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
    return {
      upper: fallbackPrice,
      mid: fallbackPrice,
      lower: fallbackPrice,
      bandwidth: 0,
      isSqueeze: false,
      wasRecentSqueeze: false,
    };
  }

  const currentMetrics = computeBandwidthSlice(candles, period, multiplier);
  const bandwidth = currentMetrics.bandwidth;
  const isSqueeze = bandwidth <= 8.0;

  // 均線與帶寬動態開口放寬 (Spec 0216 / Issue #399 & Issue #403): 近 5 交易日曾極致收斂 (<= 8.0%)
  let wasRecentSqueeze = isSqueeze;
  if (!wasRecentSqueeze && candles.length >= period + 1) {
    const lookbackLimit = Math.min(5, candles.length - period);
    for (let offset = 1; offset <= lookbackLimit; offset++) {
      const pastSlice = candles.slice(0, candles.length - offset);
      const pastMetrics = computeBandwidthSlice(pastSlice, period, multiplier);
      if (pastMetrics.bandwidth <= 8.0) {
        wasRecentSqueeze = true;
        break;
      }
    }
  }

  return {
    ...currentMetrics,
    isSqueeze,
    wasRecentSqueeze,
  };
}

/**
 * 檢驗現價上方特定範圍內是否存在密集成交套牢峰 (POC) (Spec 0216 Line 109 & Issue #405)
 * @param vpData 分價量表結果
 * @param currentPrice 當前現價
 * @param resistanceRangePercent 反壓偵測區間百分比 (預設 5.0%)
 * @param minPercentage POC 最小成交量佔比門檻 (預設 25.0%)
 */
export function isHeavyResistanceAhead(
  vpData?: { buckets?: Array<{ priceMin: number; priceMax: number; percentage: number }> } | null,
  currentPrice?: number,
  resistanceRangePercent = 5.0,
  minPercentage = 25.0
): boolean {
  if (!vpData?.buckets || vpData.buckets.length === 0 || !currentPrice || currentPrice <= 0) {
    return false;
  }
  const pocBucket = [...vpData.buckets].sort((a, b) => b.percentage - a.percentage)[0];
  if (!pocBucket) return false;
  const pocCenter = (pocBucket.priceMin + pocBucket.priceMax) / 2;
  const upperBound = currentPrice * (1 + resistanceRangePercent / 100);

  // 1. POC 重心在現價上方 5% 內
  const isPocCenterAbove = pocCenter > currentPrice && pocCenter <= upperBound;
  // 2. 或現價已穿入 POC 密集區，但尚未脫離 POC 上限且上方剩餘套牢厚度顯著 (Issue #413: 消除穿入死角)
  const isPocSpanResistance =
    currentPrice >= pocBucket.priceMin &&
    currentPrice < pocBucket.priceMax &&
    pocBucket.priceMax <= upperBound &&
    pocBucket.priceMax - currentPrice >= (pocBucket.priceMax - pocBucket.priceMin) * 0.35;

  return (isPocCenterAbove || isPocSpanResistance) && pocBucket.percentage >= minPercentage;
}
