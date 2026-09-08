import {
  DailyCandle,
  BoxStatus,
  TrendSlope,
  RelativeStrengthRank,
  MuscleBookerIndicatorPoint,
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

  let ma20Slope: TrendSlope = 'FLAT';
  if (ma20DeductionPrice !== undefined) {
    if (current.close > ma20DeductionPrice * 1.002) {
      ma20Slope = 'UP';
    } else if (current.close < ma20DeductionPrice * 0.998) {
      ma20Slope = 'DOWN';
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

/**
 * 4. ATR 動態移動防守價 (Trailing Defense)
 */
export function calculateAtrTrailingDefense(
  candles: DailyCandle[],
  period: number = 14,
  multiplier: number = 2.5
): {
  atr14: number;
  trailingDefensePrice: number;
} {
  if (candles.length < 2) {
    const p = candles.length > 0 ? candles[0].close : 0;
    return { atr14: 0, trailingDefensePrice: p };
  }

  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    trs.push(tr);
  }

  const sliceTr = trs.slice(-period);
  const atr14 = sliceTr.reduce((acc, v) => acc + v, 0) / sliceTr.length;

  // 近期最高價 (近 period 根之最高價)
  const lookbackHigh = Math.max(...candles.slice(-period).map((c) => c.high));
  const trailingDefensePrice = Math.max(0, lookbackHigh - multiplier * atr14);

  return {
    atr14: Math.round(atr14 * 100) / 100,
    trailingDefensePrice: Math.round(trailingDefensePrice * 100) / 100,
  };
}

/**
 * 5. RS 相對強度 (Relative Strength vs Benchmark)
 */
export function calculateRelativeStrength(
  stockCandles: DailyCandle[],
  benchmarkCandles: DailyCandle[],
  period: number = 10
): {
  rs10Score: number;
  rsRank: RelativeStrengthRank;
} {
  if (stockCandles.length <= period || benchmarkCandles.length <= period) {
    return { rs10Score: 0, rsRank: 'NEUTRAL' };
  }

  const stockCurrent = stockCandles[stockCandles.length - 1].close;
  const stockPast = stockCandles[stockCandles.length - 1 - period].close;
  const stockReturn = stockPast > 0 ? ((stockCurrent - stockPast) / stockPast) * 100 : 0;

  const benchCurrent = benchmarkCandles[benchmarkCandles.length - 1].close;
  const benchPast = benchmarkCandles[benchmarkCandles.length - 1 - period].close;
  const benchReturn = benchPast > 0 ? ((benchCurrent - benchPast) / benchPast) * 100 : 0;

  const rs10Score = Math.round((stockReturn - benchReturn) * 10) / 10;

  let rsRank: RelativeStrengthRank = 'NEUTRAL';
  if (rs10Score >= 5.0) {
    rsRank = 'EXTREME_STRONG';
  } else if (rs10Score >= 2.0) {
    rsRank = 'STRONG';
  } else if (rs10Score <= -2.0) {
    rsRank = 'WEAK';
  }

  return { rs10Score, rsRank };
}

/**
 * 6. 投量比計算 (Trust-to-Net-Volume Ratio)
 */
export function calculateTrustToNetVolumeRatio(candle: DailyCandle): number | undefined {
  if (candle.trustNetBuy === undefined) {
    return undefined;
  }

  const totalVolume = candle.volume;
  const dayTradingVolume = candle.dayTradingVolume ?? 0;
  const netVolume = Math.max(1, totalVolume - dayTradingVolume);

  return Math.round((candle.trustNetBuy / netVolume) * 1000) / 10;
}

/**
 * 7. 綜合計算日 K 數列之完整肌肉書僮指標時序
 */
export function calculateMuscleBookerIndicators(
  candles: DailyCandle[],
  benchmarkCandles?: DailyCandle[]
): MuscleBookerIndicatorPoint[] {
  const points: MuscleBookerIndicatorPoint[] = [];

  for (let i = 0; i < candles.length; i++) {
    const subCandles = candles.slice(0, i + 1);
    const curr = candles[i];

    // 均線
    const ma5 =
      subCandles.length >= 5
        ? subCandles.slice(-5).reduce((acc, c) => acc + c.close, 0) / 5
        : undefined;
    const ma10 =
      subCandles.length >= 10
        ? subCandles.slice(-10).reduce((acc, c) => acc + c.close, 0) / 10
        : undefined;
    const ma20 =
      subCandles.length >= 20
        ? subCandles.slice(-20).reduce((acc, c) => acc + c.close, 0) / 20
        : undefined;
    const ma60 =
      subCandles.length >= 60
        ? subCandles.slice(-60).reduce((acc, c) => acc + c.close, 0) / 60
        : undefined;

    // 核心肌肉書僮各維度
    const box = detectDarvasBox(subCandles);
    const deduction = calculateMaDeduction(subCandles);
    const bbands = calculateBollingerSqueeze(subCandles);
    const atr = calculateAtrTrailingDefense(subCandles);

    // RS 強度
    let momentum = { rs10Score: 0, rsRank: 'NEUTRAL' as RelativeStrengthRank };
    if (benchmarkCandles && benchmarkCandles.length > i) {
      const subBench = benchmarkCandles.slice(0, i + 1);
      momentum = calculateRelativeStrength(subCandles, subBench);
    }

    const trustRatio = calculateTrustToNetVolumeRatio(curr);

    points.push({
      date: curr.date,
      close: curr.close,
      ma: {
        ma5: ma5 ? Math.round(ma5 * 100) / 100 : undefined,
        ma10: ma10 ? Math.round(ma10 * 100) / 100 : undefined,
        ma20: ma20 ? Math.round(ma20 * 100) / 100 : undefined,
        ma60: ma60 ? Math.round(ma60 * 100) / 100 : undefined,
      },
      maDeduction: deduction,
      box,
      bbands,
      atr,
      momentum,
      chips: trustRatio !== undefined ? { trustToNetVolumeRatio: trustRatio } : undefined,
    });
  }

  return points;
}

export type MuscleBookerActionType = 'BUY' | 'AVOID' | 'SELL' | 'HOLD';

export interface MuscleBookerActionDecision {
  action: MuscleBookerActionType;
  actionBadge: string;
  actionReason: string;
  stopLossPrice?: number;
  targetPrice?: number;
  riskRewardRatio?: string;
}

/**
 * 8. 肌肉書僮實戰操盤三色決策引擎 (Traffic-Light Action Matrix)
 * 輸出投資人最直觀的操作動詞：哪一支買、哪一支不能碰、哪一支賣
 */
export function evaluateMuscleBookerAction(params: {
  currentPrice: number;
  box: {
    boxStatus: BoxStatus;
    boxUpper?: number;
    boxLower?: number;
    boxWidthPercent?: number;
  };
  deduction: {
    ma20Slope: TrendSlope;
    isBottomPenetrationRebound?: boolean;
    ma20DeductionPrice?: number;
  };
  bbands: {
    isSqueeze: boolean;
    bandwidth?: number;
  };
}): MuscleBookerActionDecision {
  const { currentPrice, box, deduction, bbands } = params;

  // 1. 優先判斷賣出/停損訊號 (SELL)
  if (box.boxStatus === 'BREAKOUT_DOWN') {
    return {
      action: 'SELL',
      actionBadge: '🔴 建議賣出 (破底停損)',
      actionReason: '跌破箱底防守線，趨勢轉弱，應無條件停損保全本金',
      stopLossPrice: box.boxLower,
    };
  }

  // 2. 判斷買進訊號 (BUY)
  // 情境 A: 突破箱頂 + 均線向上
  if (box.boxStatus === 'BREAKOUT_UP' && deduction.ma20Slope === 'UP') {
    const stopLoss = box.boxUpper ?? currentPrice * 0.95;
    const boxWidth = box.boxUpper && box.boxLower ? box.boxUpper - box.boxLower : currentPrice - stopLoss;
    const target = currentPrice + Math.max(boxWidth, currentPrice * 0.08);
    const risk = Math.max(0.1, currentPrice - stopLoss);
    const reward = Math.max(0.1, target - currentPrice);
    const rrRatio = (reward / risk).toFixed(1);

    return {
      action: 'BUY',
      actionBadge: '🟢 建議買進 (突破買點)',
      actionReason: '帶量站上箱頂且20MA翻揚，第一買點確立，以箱頂作為防守線',
      stopLossPrice: Math.round(stopLoss * 100) / 100,
      targetPrice: Math.round(target * 100) / 100,
      riskRewardRatio: `1 : ${rrRatio}`,
    };
  }

  // 情境 B: 破底翻反轉
  if (deduction.isBottomPenetrationRebound) {
    const stopLoss = box.boxLower ? box.boxLower * 0.98 : currentPrice * 0.95;
    const target = box.boxUpper ?? currentPrice * 1.1;
    const risk = Math.max(0.1, currentPrice - stopLoss);
    const reward = Math.max(0.1, target - currentPrice);
    const rrRatio = (reward / risk).toFixed(1);

    return {
      action: 'BUY',
      actionBadge: '🟢 建議買進 (破底翻)',
      actionReason: '盤中跌破箱底但強勢收回50%以上，洗盤結束，右側進場',
      stopLossPrice: Math.round(stopLoss * 100) / 100,
      targetPrice: Math.round(target * 100) / 100,
      riskRewardRatio: `1 : ${rrRatio}`,
    };
  }

  // 3. 判斷觀望不碰 (AVOID)
  if (bbands.isSqueeze) {
    return {
      action: 'AVOID',
      actionBadge: '⛔ 嚴禁碰觸 (壓縮待變)',
      actionReason: `布林極致壓縮 (帶寬 ${bbands.bandwidth?.toFixed(1) || '<8'}%)，變盤前夕等待表態，禁止預測押注`,
    };
  }

  if (deduction.ma20Slope === 'DOWN') {
    return {
      action: 'AVOID',
      actionBadge: '⛔ 嚴禁碰觸 (均線壓頂)',
      actionReason: '20MA 扣抵高檔且均線下彎，上方蓋頭反壓沈重，切忌接刀',
    };
  }

  // 4. 箱內常態震盪 (HOLD)
  return {
    action: 'HOLD',
    actionBadge: '🔵 區間觀望',
    actionReason: '價格在達瓦斯箱體內常態震盪，維持既有部位，靜待突破或觸底',
    stopLossPrice: box.boxLower,
    targetPrice: box.boxUpper,
  };
}

