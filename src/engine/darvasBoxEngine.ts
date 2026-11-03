import {
  DailyCandle,
  BoxStatus,
  TrendSlope,
} from '../types/indicators';

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
    const lookback = pastCandles.length > 0 ? pastCandles.slice(-20) : candles;
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
 * 2. 均線扣抵望遠鏡與「底穿上」假跌破型態
 */
export function calculateMaDeduction(candles: DailyCandle[]): {
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

  // 計算當前 MA20 數值
  let ma20: number | undefined;
  if (len >= 20) {
    const slice20 = candles.slice(-20);
    ma20 = slice20.reduce((acc, c) => acc + c.close, 0) / 20;
  }

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

    // 均線扣抵時空望遠鏡進階校準：若未來 3 日扣抵高檔天花板，均線即將下彎壓頂
    if (futureDeductions.length > 0) {
      const futureMax = Math.max(...futureDeductions);
      const futureAvg = futureDeductions.reduce((a, b) => a + b, 0) / futureDeductions.length;
      if (futureMax > current.close * 1.01 && futureAvg > current.close) {
        ma20Slope = 'DOWN';
      }
    }
  }

  // 偵測「底穿上」假跌破型態：
  // 盤中跌破支撐 (MA20 或近期支撐)，但收盤站回支撐之上，且下影線佔振幅 >= 50%
  let isBottomPenetrationRebound = false;
  if (ma20 !== undefined && current.low < ma20 && current.close >= ma20) {
    const totalRange = current.high - current.low;
    const lowerShadow = current.close - current.low;
    if (totalRange > 0 && lowerShadow / totalRange >= 0.5) {
      isBottomPenetrationRebound = true;
    }
  }

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
} {
  if (candles.length < period) {
    const fallbackPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
    return {
      upper: fallbackPrice,
      mid: fallbackPrice,
      lower: fallbackPrice,
      bandwidth: 0,
      isSqueeze: false,
    };
  }

  const slice = candles.slice(-period);
  const closes = slice.map((c) => c.close);
  const mid = closes.reduce((acc, v) => acc + v, 0) / period;

  const variance = closes.reduce((acc, v) => acc + Math.pow(v - mid, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = mid + multiplier * stdDev;
  const lower = mid - multiplier * stdDev;
  const bandwidth = mid > 0 ? Math.round(((upper - lower) / mid) * 10000) / 100 : 0; // %

  // 帶寬 <= 8% 判定為極致壓縮 (Squeeze)
  const isSqueeze = bandwidth <= 8.0;

  return {
    upper: Math.round(upper * 100) / 100,
    mid: Math.round(mid * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    bandwidth,
    isSqueeze,
  };
}
