import { MarketType } from '../types/stock';
import type {
  MultiDimensionRadarData,
  InstitutionalFlowData,
  KlineCandleItem,
} from '../types/aiForceDashboard';

/**
 * 輔助：將數值嚴格截斷於 [min, max] 範圍內
 */
function clamp(val: number, min: number = 0, max: number = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

export interface MicrostructureCandleItem {
  open?: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Ticket 12: 美股微觀量價主力替代演算法 (US Volume Microstructure Quant Engine)
 * 透過 20D/60D VWAP 成本階梯偏離率、14D MFI 資金流量、OBV 能量潮與異常爆量偵測，量化美股主力機構籌碼評分 (0~100)
 */
export function calculateUsMicrostructureInstitutionalScore(
  candles: MicrostructureCandleItem[] = []
): number {
  if (!candles || candles.length < 5) {
    return 50;
  }

  const n = candles.length;
  const lastCandle = candles[n - 1];
  const lastClose = lastCandle.close;

  // 1. 計算 20D 與 60D VWAP
  const recent20 = candles.slice(-20);
  const recent60 = candles.slice(-60);

  const calcVwap = (items: MicrostructureCandleItem[]) => {
    let sumVp = 0;
    let sumVol = 0;
    for (const c of items) {
      const tp = (c.high + c.low + c.close) / 3;
      sumVp += tp * c.volume;
      sumVol += c.volume;
    }
    if (sumVol <= 0) {
      // 零成交量回退至 SMA(close)
      return items.reduce((acc, c) => acc + c.close, 0) / items.length;
    }
    return sumVp / sumVol;
  };

  const vwap20 = calcVwap(recent20);
  const vwap60 = calcVwap(recent60);

  const bias20 = vwap20 > 0 ? ((lastClose - vwap20) / vwap20) * 100 : 0;
  const bias60 = vwap60 > 0 ? ((lastClose - vwap60) / vwap60) * 100 : 0;

  // 2. 計算 14D MFI (Money Flow Index)
  let posMF = 0;
  let negMF = 0;
  const mfiWindow = candles.slice(-15);
  for (let i = 1; i < mfiWindow.length; i++) {
    const cur = mfiWindow[i];
    const prev = mfiWindow[i - 1];
    const curTp = (cur.high + cur.low + cur.close) / 3;
    const prevTp = (prev.high + prev.low + prev.close) / 3;
    const rawMF = curTp * cur.volume;

    if (curTp > prevTp) {
      posMF += rawMF;
    } else if (curTp < prevTp) {
      negMF += rawMF;
    }
  }

  let mfi = 50;
  if (posMF + negMF > 0) {
    if (negMF === 0) {
      mfi = 100;
    } else if (posMF === 0) {
      mfi = 0;
    } else {
      const mr = posMF / negMF;
      mfi = 100 - (100 / (1 + mr));
    }
  }

  // 3. 計算近 10 日 OBV 趨勢
  const obvWindow = candles.slice(-11);
  let obvChange = 0;
  for (let i = 1; i < obvWindow.length; i++) {
    const cur = obvWindow[i];
    const prev = obvWindow[i - 1];
    if (cur.close > prev.close) {
      obvChange += cur.volume;
    } else if (cur.close < prev.close) {
      obvChange -= cur.volume;
    }
  }

  // 4. 偵測大單異常量 (Volume Spikes)
  const avgVol20 = recent20.reduce((acc, c) => acc + c.volume, 0) / recent20.length;
  let hasBullishVolumeSpike = false;
  let hasBearishVolumeSpike = false;
  const recent3 = candles.slice(-3);
  for (const c of recent3) {
    const open = c.open ?? c.close;
    if (avgVol20 > 0 && c.volume >= avgVol20 * 2.0) {
      if (c.close > open) {
        hasBullishVolumeSpike = true;
      } else if (c.close < open) {
        hasBearishVolumeSpike = true;
      }
    }
  }

  // 5. 綜合量化計分
  let score = 50;

  // VWAP 偏離評分
  if (bias20 > 0 && bias60 > 0) {
    score += bias20 > 5 ? 18 : 12;
  } else if (bias20 < 0 && bias60 < 0) {
    score -= bias20 < -5 ? 18 : 12;
  } else if (bias20 > 0) {
    score += 5;
  } else {
    score -= 5;
  }

  // MFI 資金流評分
  if (mfi >= 60) {
    score += mfi >= 75 ? 14 : 10;
  } else if (mfi <= 40) {
    score -= mfi <= 25 ? 14 : 10;
  }

  // OBV 能量潮評分
  if (obvChange > 0) {
    score += 8;
  } else if (obvChange < 0) {
    score -= 8;
  }

  // 爆量大單吸籌/出貨修正
  if (hasBullishVolumeSpike) {
    score += 8;
  }
  if (hasBearishVolumeSpike) {
    score -= 8;
  }

  return clamp(score, 0, 100);
}

/**
 * Ticket 01: 法人軸量化子函式 (0~100)
 */
export function calculateInstitutionalScore(
  flow: InstitutionalFlowData,
  market: MarketType = 'TW',
  candles?: MicrostructureCandleItem[]
): number {
  if (market === 'US') {
    // 美股無集中三大法人，改採微觀量價主力替代演算法
    if (candles && candles.length >= 5) {
      return calculateUsMicrostructureInstitutionalScore(candles);
    }
    return 50; // 無日 K 資料時提供中性基準 50
  }

  if (market !== 'TW' || !flow || !flow.history || flow.history.length === 0) {
    return 50;
  }

  const lastInst = flow.history[flow.history.length - 1];
  const cumulative = lastInst.cumulativeTotalShares ?? 0;

  let base = 50;
  if (cumulative > 2000) base = 85;
  else if (cumulative > 500) base = 70;
  else if (cumulative > 0) base = 58;
  else if (cumulative < -2000) base = 20;
  else if (cumulative < -500) base = 35;
  else base = 45;

  // 結合土洋方向細修
  const foreign = lastInst.foreignShares ?? 0;
  const trust = lastInst.trustShares ?? 0;
  if (foreign > 0 && trust > 0) {
    base += 8; // 土洋合買加分
  } else if (foreign < 0 && trust < 0) {
    base -= 8; // 土洋齊賣扣分
  }

  return clamp(base, 0, 100);
}

/**
 * Ticket 01: 籌碼軸量化子函式 (0~100)
 */
export function calculateChipsScore(flow: InstitutionalFlowData): number {
  if (!flow || !flow.history || flow.history.length === 0) {
    return 50;
  }

  const recent5 = flow.history.slice(-5);
  const sum5 = recent5.reduce(
    (acc, cur) => acc + (cur.foreignShares || 0) + (cur.trustShares || 0) + (cur.dealerShares || 0),
    0
  );

  let score = 50;
  if (sum5 > 1000) score = 85;
  else if (sum5 > 200) score = 72;
  else if (sum5 > 0) score = 60;
  else if (sum5 < -1000) score = 25;
  else if (sum5 < -200) score = 35;
  else score = 45;

  return clamp(score, 0, 100);
}

/**
 * Ticket 02: 趨勢軸量化子函式 (0~100)
 */
export function calculateTrendScore(lastCandle: KlineCandleItem, mainForceCost: number = 0): number {
  if (!lastCandle) return 50;

  const close = lastCandle.close;
  const ma5 = lastCandle.ma5 ?? close;
  const ma10 = lastCandle.ma10 ?? close;
  const ma20 = lastCandle.ma20 ?? close;
  const ma60 = lastCandle.ma60 ?? close;

  let base = 50;
  // 均線多頭排列
  if (close > ma5 && ma5 > ma10 && ma10 > ma20 && ma20 > ma60) {
    base = 88;
  } else if (close > ma20 && ma5 > ma20) {
    base = 75;
  } else if (close < ma20 && close > ma60) {
    base = 45;
  } else if (close < ma60) {
    base = 25;
  }

  // VWAP 主力成本乖離修正
  if (mainForceCost > 0) {
    const vwapBias = ((close - mainForceCost) / mainForceCost) * 100;
    if (vwapBias > 5) base += 7;
    else if (vwapBias > 0) base += 3;
    else if (vwapBias < -5) base -= 7;
  }

  return clamp(base, 0, 100);
}

/**
 * Ticket 02: 動能軸量化子函式 (0~100)
 */
export function calculateMomentumScore(
  lastCandle: KlineCandleItem,
  candles: Array<{ close: number; open: number; volume: number }> = []
): number {
  if (!lastCandle) return 50;

  let score = 50;
  const k = lastCandle.k ?? 50;
  const d = lastCandle.d ?? 50;
  const rsi = lastCandle.rsi ?? 50;

  // 1. RSI 區間
  if (rsi >= 55 && rsi <= 70) score = 75;
  else if (rsi > 80) score = 62; // 過熱稍折減
  else if (rsi < 30) score = 38; // 破位超跌
  else score = 52;

  // 2. KD 黃金交叉或死亡交叉
  if (k > d && k < 80) score += 8;
  else if (k < d && k > 20) score -= 8;

  // 3. 量能倍數修正
  if (candles.length >= 5) {
    const recent20 = candles.slice(-20);
    const avgVol = recent20.reduce((acc, c) => acc + c.volume, 0) / recent20.length;
    const volRatio = avgVol > 0 ? lastCandle.volume / avgVol : 1;
    const isRed = lastCandle.close >= lastCandle.open;

    if (isRed && volRatio > 1.5) score += 12;
    else if (!isRed && volRatio > 1.5) score -= 12;
  }

  return clamp(score, 0, 100);
}

/**
 * Ticket 03: 流動性軸量化子函式 (0~100)
 */
export function calculateLiquidityScore(
  candles: Array<{ volume: number }> = [],
  market: MarketType = 'TW'
): number {
  if (!candles || candles.length === 0) return 50;

  const recent5 = candles.slice(-5);
  const avgVol5 = recent5.reduce((acc, c) => acc + c.volume, 0) / recent5.length;

  if (market === 'TW') {
    // 台股：張數基準
    if (avgVol5 > 5000) return 95;
    if (avgVol5 > 3000) return 88;
    if (avgVol5 > 1000) return 75;
    if (avgVol5 > 300) return 55;
    return 25;
  } else {
    // 美股：股數基準
    if (avgVol5 > 1_000_000) return 92;
    if (avgVol5 > 200_000) return 78;
    if (avgVol5 > 50_000) return 60;
    return 35;
  }
}

/**
 * Ticket 03: 波動軸量化子函式 (0~100)
 */
export function calculateVolatilityScore(candles: Array<{ close: number }> = []): number {
  if (!candles || candles.length < 5) return 50;

  const closes = candles.slice(-20).map((c) => c.close);
  // 計算相鄰日報酬率之百分比變化
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) {
      returns.push(Math.abs((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
    }
  }

  if (returns.length === 0) return 50;
  const avgDailyAbsReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

  // 健康波幅 (1.0% ~ 4.0%)：最佳操作動能且不易洗盤斷頭
  if (avgDailyAbsReturn >= 1.0 && avgDailyAbsReturn <= 4.0) {
    return 85;
  } else if (avgDailyAbsReturn > 4.0 && avgDailyAbsReturn <= 6.0) {
    return 65; // 偏劇烈
  } else if (avgDailyAbsReturn < 1.0 && avgDailyAbsReturn >= 0.5) {
    return 60; // 偏平穩
  } else if (avgDailyAbsReturn < 0.5) {
    return 45; // 死水盤
  } else {
    return 35; // > 6.0% 極度失控暴走
  }
}

export interface MultiDimensionRadarInput {
  candles: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>;
  klineCandles: KlineCandleItem[];
  mainForceCost?: number;
  institutionalFlow?: InstitutionalFlowData;
  market?: MarketType;
}

/**
 * Ticket 04: Card 03 多維度判讀總合成器
 */
export function calculateMultiDimensionRadar(
  input: MultiDimensionRadarInput
): MultiDimensionRadarData {
  const {
    candles = [],
    klineCandles = [],
    mainForceCost = 0,
    institutionalFlow = { history: [], recentDaysTable: [], cumulative20DaysSummary: '', recent5DaysSummary: '' },
    market = 'TW',
  } = input;

  // 安全邊界：不足 5 根日 K 時提供防護回退
  if (!candles || candles.length < 5 || !klineCandles || klineCandles.length < 5) {
    return {
      overallScore: 50,
      overallGrade: 'C',
      dimensions: {
        institutional: 50,
        trend: 50,
        chips: 50,
        liquidity: 50,
        volatility: 50,
        momentum: 50,
      },
    };
  }

  const lastKline = klineCandles[klineCandles.length - 1];

  const institutional = calculateInstitutionalScore(institutionalFlow, market, candles);
  const trend = calculateTrendScore(lastKline, mainForceCost);
  let chips = calculateChipsScore(institutionalFlow);
  if (market === 'US') {
    // 美股無官方集中三大法人，籌碼軸由量價微觀機構力道與趨勢結構共同映射
    chips = clamp(Math.round(institutional * 0.85 + trend * 0.15), 0, 100);
  }
  const liquidity = calculateLiquidityScore(candles, market);
  const volatility = calculateVolatilityScore(candles);
  const momentum = calculateMomentumScore(lastKline, candles);

  const sum = institutional + trend + chips + liquidity + volatility + momentum;
  const overallScore = clamp(Math.round(sum / 6), 0, 100);

  let overallGrade: 'A' | 'B' | 'C' | 'D' = 'C';
  if (overallScore >= 80) overallGrade = 'A';
  else if (overallScore >= 65) overallGrade = 'B';
  else if (overallScore >= 50) overallGrade = 'C';
  else overallGrade = 'D';

  return {
    overallScore,
    overallGrade,
    dimensions: {
      institutional,
      trend,
      chips,
      liquidity,
      volatility,
      momentum,
    },
  };
}
