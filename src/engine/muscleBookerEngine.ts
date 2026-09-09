import {
  DailyCandle,
  BoxStatus,
  TrendSlope,
  RelativeStrengthRank,
  MuscleBookerIndicatorPoint,
} from '../types/indicators';
import { MarketType } from '../types/stock';


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

export type AssetPoolType = 'HOLDINGS' | 'HOLDINGS_ACTIVE' | 'HOLDINGS_CLOSED' | 'TOP30_FOCUS' | 'TW50_CORE';

/**
 * 股市小白專屬動能名詞百科字典
 */
export const BEGINNER_TOOLTIPS = {
  riskReward: '💡【股市小白指南】風益比 (Risk-Reward Ratio, R:R)：賺賠比。代表每承受 1 塊錢的停損風險，預期能賺取幾塊錢的潛在獲利。數值越大代表勝算越高，通常大於 1:2 R 才是值得進場的好機會！',
  boxUpperDefense: '💡【股市小白指南】箱頂防守價：股價帶量突破過去一段時間的最高整理壓力線後，箱頂轉為最強支撐防守線。只要沒跌破箱頂，就代表多頭主升段續抱；若跌破則需警戒避險。',
  bottomPenetration: '💡【股市小白指南】破底翻反轉：主力故意跌破前低支撐引誘散戶殺出，隨後當天強勢拉抬收復超過一半留下長下影線。這是典型的「假跌破、真吃貨」右側止跌進場訊號。',
  bollingerSqueeze: '💡【股市小白指南】布林極致壓縮：帶寬小於 8%，代表多空力量高度收斂、股價像彈簧被壓到最緊。暗示隨時會爆發大方向變盤，此時切勿預設立場猜底，等待出方向再跟隨！',
  boxLowerBreakdown: '💡【股市小白指南】跌破箱底防守線：跌破過去三日箱底的最後防線，多方棄守、趨勢轉弱。嚴禁凹單攤平，應果斷停損保全資金，保命第一！',
  maDeductionTelescope: '💡【股市小白指南】MA20 扣抵望遠鏡：用來提前 3~5 天預測月均線的走勢。若目前現價高於 20 天前的扣抵價，月均線就會向上翻揚助漲；反之均線會下彎反壓。',
  stopLossPrinciple: '💡【股市小白指南】嚴格停損紀律：只要跌破設定的防守價位，代表進場理由消失。小賠離場是為了保護本金，避免一次大跌讓資產腰斬！',
};

export interface ScannedStockItem {
  symbol: string;
  name: string;
  market: 'TW' | 'US';
  currentPrice: number;
  boxStatus: BoxStatus;
  boxUpper?: number;
  boxLower?: number;
  boxWidthPercent?: number;
  isBottomPenetration: boolean;
  ma20Slope: TrendSlope;
  ma20DeductionPrice?: number;
  isBollingerSqueeze: boolean;
  bollingerBandwidth?: number;
  actionDecision: MuscleBookerActionDecision;
}

// 台股法人焦點 Top 30
export const TW_TOP_30_FOCUS_SYMBOLS = [
  { symbol: '2330', name: '台積電', market: 'TW' as const, basePrice: 1010 },
  { symbol: '2454', name: '聯發科', market: 'TW' as const, basePrice: 1280 },
  { symbol: '2317', name: '鴻海', market: 'TW' as const, basePrice: 185 },
  { symbol: '2382', name: '廣達', market: 'TW' as const, basePrice: 280 },
  { symbol: '2603', name: '長榮', market: 'TW' as const, basePrice: 195 },
  { symbol: '3231', name: '緯創', market: 'TW' as const, basePrice: 110 },
  { symbol: '2356', name: '英業達', market: 'TW' as const, basePrice: 52 },
  { symbol: '2379', name: '瑞昱', market: 'TW' as const, basePrice: 510 },
  { symbol: '3008', name: '大立光', market: 'TW' as const, basePrice: 2600 },
  { symbol: '2881', name: '富邦金', market: 'TW' as const, basePrice: 88 },
  { symbol: '2882', name: '國泰金', market: 'TW' as const, basePrice: 65 },
  { symbol: '2891', name: '中信金', market: 'TW' as const, basePrice: 36.5 },
  { symbol: '0050', name: '元大台灣50', market: 'TW' as const, basePrice: 192 },
  { symbol: '0056', name: '元大高股息', market: 'TW' as const, basePrice: 39.5 },
  { symbol: '00878', name: '國泰永續高股息', market: 'TW' as const, basePrice: 23.8 },
  { symbol: '00919', name: '群益台灣精選高息', market: 'TW' as const, basePrice: 25.8 },
];

// 美股焦點與成長 Top 30
export const US_TOP_30_FOCUS_SYMBOLS = [
  { symbol: 'NVDA', name: '輝達 NVIDIA', market: 'US' as const, basePrice: 125 },
  { symbol: 'AAPL', name: '蘋果 Apple', market: 'US' as const, basePrice: 220 },
  { symbol: 'MSFT', name: '微軟 Microsoft', market: 'US' as const, basePrice: 425 },
  { symbol: 'TSLA', name: '特斯拉 Tesla', market: 'US' as const, basePrice: 215 },
  { symbol: 'AMZN', name: '亞馬遜 Amazon', market: 'US' as const, basePrice: 180 },
  { symbol: 'GOOGL', name: '谷歌 Alphabet', market: 'US' as const, basePrice: 165 },
  { symbol: 'META', name: 'Meta', market: 'US' as const, basePrice: 515 },
  { symbol: 'AMD', name: '超微 AMD', market: 'US' as const, basePrice: 155 },
  { symbol: 'AVGO', name: '博通 Broadcom', market: 'US' as const, basePrice: 160 },
  { symbol: 'PLTR', name: 'Palantir', market: 'US' as const, basePrice: 32 },
  { symbol: 'NFLX', name: 'Netflix', market: 'US' as const, basePrice: 680 },
  { symbol: 'COST', name: '好市多 Costco', market: 'US' as const, basePrice: 880 },
  { symbol: 'ARM', name: '安謀 ARM', market: 'US' as const, basePrice: 135 },
  { symbol: 'MU', name: '美光 Micron', market: 'US' as const, basePrice: 95 },
  { symbol: 'SMCI', name: '美超微 Supermicro', market: 'US' as const, basePrice: 450 },
  { symbol: 'COIN', name: 'Coinbase', market: 'US' as const, basePrice: 210 },
];

// 台股權值核心 Top 50 代表性標的
export const TW50_BLUE_CHIP_SYMBOLS = [
  { symbol: '2330', name: '台積電', market: 'TW' as const, basePrice: 1010 },
  { symbol: '2317', name: '鴻海', market: 'TW' as const, basePrice: 185 },
  { symbol: '2454', name: '聯發科', market: 'TW' as const, basePrice: 1280 },
  { symbol: '2881', name: '富邦金', market: 'TW' as const, basePrice: 88 },
  { symbol: '2382', name: '廣達', market: 'TW' as const, basePrice: 280 },
  { symbol: '2882', name: '國泰金', market: 'TW' as const, basePrice: 65 },
  { symbol: '2412', name: '中華電', market: 'TW' as const, basePrice: 125 },
  { symbol: '2886', name: '兆豐金', market: 'TW' as const, basePrice: 39.5 },
  { symbol: '2891', name: '中信金', market: 'TW' as const, basePrice: 36.5 },
  { symbol: '2308', name: '台達電', market: 'TW' as const, basePrice: 395 },
  { symbol: '1301', name: '台塑', market: 'TW' as const, basePrice: 50 },
  { symbol: '2002', name: '中鋼', market: 'TW' as const, basePrice: 22.5 },
  { symbol: '1216', name: '統一', market: 'TW' as const, basePrice: 85 },
  { symbol: '2603', name: '長榮', market: 'TW' as const, basePrice: 195 },
  { symbol: '2884', name: '玉山金', market: 'TW' as const, basePrice: 28.5 },
  { symbol: '2892', name: '第一金', market: 'TW' as const, basePrice: 28.2 },
  { symbol: '2890', name: '永豐金', market: 'TW' as const, basePrice: 24.5 },
  { symbol: '2880', name: '華南金', market: 'TW' as const, basePrice: 26 },
  { symbol: '3711', name: '日月光投控', market: 'TW' as const, basePrice: 155 },
  { symbol: '3045', name: '台灣大', market: 'TW' as const, basePrice: 112 },
];

// 美股巨頭 Top 50 代表性標的
export const US_MEGA_50_CORE_SYMBOLS = [
  { symbol: 'NVDA', name: '輝達 NVIDIA', market: 'US' as const, basePrice: 125 },
  { symbol: 'AAPL', name: '蘋果 Apple', market: 'US' as const, basePrice: 220 },
  { symbol: 'MSFT', name: '微軟 Microsoft', market: 'US' as const, basePrice: 425 },
  { symbol: 'AMZN', name: '亞馬遜 Amazon', market: 'US' as const, basePrice: 180 },
  { symbol: 'GOOGL', name: '谷歌 Alphabet', market: 'US' as const, basePrice: 165 },
  { symbol: 'META', name: 'Meta', market: 'US' as const, basePrice: 515 },
  { symbol: 'TSLA', name: '特斯拉 Tesla', market: 'US' as const, basePrice: 215 },
  { symbol: 'BRK.B', name: '波克夏 Berkshire', market: 'US' as const, basePrice: 450 },
  { symbol: 'LLY', name: '禮來 Eli Lilly', market: 'US' as const, basePrice: 940 },
  { symbol: 'JPM', name: '摩根大通 JPMorgan', market: 'US' as const, basePrice: 215 },
  { symbol: 'V', name: 'Visa', market: 'US' as const, basePrice: 280 },
  { symbol: 'UNH', name: '聯合健康 UnitedHealth', market: 'US' as const, basePrice: 580 },
  { symbol: 'XOM', name: '埃克森美孚 ExxonMobil', market: 'US' as const, basePrice: 115 },
  { symbol: 'MA', name: '萬事達 Mastercard', market: 'US' as const, basePrice: 470 },
  { symbol: 'COST', name: '好市多 Costco', market: 'US' as const, basePrice: 880 },
  { symbol: 'PG', name: '寶僑 P&G', market: 'US' as const, basePrice: 170 },
  { symbol: 'HD', name: '家得寶 Home Depot', market: 'US' as const, basePrice: 370 },
  { symbol: 'JNJ', name: '嬌生 Johnson & Johnson', market: 'US' as const, basePrice: 160 },
  { symbol: 'ABBV', name: '艾伯維 AbbVie', market: 'US' as const, basePrice: 190 },
  { symbol: 'WMT', name: '沃爾瑪 Walmart', market: 'US' as const, basePrice: 75 },
];

/**
 * 依據當前市場與選定資產池獲取過濾後的標的
 */
export function getScopedUniverseSymbols(
  market: 'ALL' | MarketType = 'ALL',
  pool: AssetPoolType = 'TOP30_FOCUS'
) {
  if (pool === 'TW50_CORE') {
    if (market === 'US') return US_MEGA_50_CORE_SYMBOLS;
    return TW50_BLUE_CHIP_SYMBOLS;
  }
  if (market === 'US') return US_TOP_30_FOCUS_SYMBOLS;
  if (market === 'TW') return TW_TOP_30_FOCUS_SYMBOLS;
  return [...TW_TOP_30_FOCUS_SYMBOLS, ...US_TOP_30_FOCUS_SYMBOLS];
}

/**
 * 依據基礎價格生成具備真實特徵的 30 天模擬日 K 線 (用於無實時日 K 之公開標的)
 */
export function generateSyntheticCandles(symbol: string, basePrice: number): DailyCandle[] {
  const candles: DailyCandle[] = [];
  const hash = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const patternType = hash % 4; // 0: 突破, 1: 底穿, 2: 壓縮, 3: 整理

  let price = basePrice * 0.95;
  for (let i = 0; i < 25; i++) {
    let changePct = ((Math.sin(i + hash) * 1.5) / 100);
    if (i === 24) {
      if (patternType === 0) changePct = 0.045; // 突破箱頂
      else if (patternType === 1) changePct = 0.015; // 底穿反轉
      else if (patternType === 2) changePct = 0.002; // 壓縮
      else changePct = -0.01;
    }
    price = price * (1 + changePct);
    const high = i === 24 && patternType === 0 ? price * 1.01 : price * 1.008;
    const low = i === 24 && patternType === 1 ? price * 0.97 : price * 0.992;
    const open = (high + low) / 2;

    candles.push({
      date: `2026-08-${String(i + 1).padStart(2, '0')}`,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(price * 100) / 100,
      volume: i === 24 && patternType === 0 ? 80000 : 25000,
    });
  }

  return candles;
}

/**
 * 針對單一標的執行肌肉書僮綜合指標運算
 */
export function scanMuscleBookerItem(
  symbol: string,
  name: string,
  market: 'TW' | 'US',
  basePrice: number,
  localCandles?: DailyCandle[]
): ScannedStockItem {
  const candles =
    localCandles && localCandles.length >= 5
      ? localCandles
      : generateSyntheticCandles(symbol, basePrice);

  const box = detectDarvasBox(candles);
  const deduction = calculateMaDeduction(candles);
  const bbands = calculateBollingerSqueeze(candles);
  const lastCandle = candles[candles.length - 1];

  const actionDecision = evaluateMuscleBookerAction({
    currentPrice: lastCandle.close,
    box,
    deduction,
    bbands,
  });

  return {
    symbol,
    name,
    market,
    currentPrice: lastCandle.close,
    boxStatus: box.boxStatus,
    boxUpper: box.boxUpper,
    boxLower: box.boxLower,
    boxWidthPercent: box.boxWidthPercent,
    isBottomPenetration: deduction.isBottomPenetrationRebound ?? false,
    ma20Slope: deduction.ma20Slope,
    ma20DeductionPrice: deduction.ma20DeductionPrice,
    isBollingerSqueeze: bbands.isSqueeze,
    bollingerBandwidth: bbands.bandwidth,
    actionDecision,
  };

}


