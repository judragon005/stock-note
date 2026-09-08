import { DailyCandle, HoldingSignal, TechnicalIndicators } from '../types/signal';

/**
 * 計算指定週期的簡單移動平均線 (SMA)
 */
export function calculateSMA(values: number[], period: number): number | undefined {
  if (!values || values.length < period || period <= 0) {
    return undefined;
  }
  const slice = values.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / period) * 1000) / 1000;
}

/**
 * 計算多週期移動平均線 (MA5, MA20, MA60, MA120, MA240)
 */
export function calculateMovingAverages(closes: number[]): {
  ma5?: number;
  ma20?: number;
  ma60?: number;
  ma120?: number;
  ma240?: number;
} {
  return {
    ma5: calculateSMA(closes, 5),
    ma20: calculateSMA(closes, 20),
    ma60: calculateSMA(closes, 60),
    ma120: calculateSMA(closes, 120),
    ma240: calculateSMA(closes, 240),
  };
}

/**
 * 計算 KD (9, 3, 3) 隨機指標
 * RSV = (Close - LowestLow) / (HighestHigh - LowestLow) * 100
 * 今日 K = 前日 K * 2/3 + 今日 RSV * 1/3
 * 今日 D = 前日 D * 2/3 + 今日 K * 1/3
 */
export function calculateStochasticKD(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 9
): {
  k9?: number;
  d9?: number;
  prevK9?: number;
  prevD9?: number;
} {
  const len = closes.length;
  if (len < period || highs.length < period || lows.length < period) {
    return {};
  }

  let k = 50;
  let d = 50;
  let prevK = 50;
  let prevD = 50;

  for (let i = period - 1; i < len; i++) {
    const windowHighs = highs.slice(i - period + 1, i + 1);
    const windowLows = lows.slice(i - period + 1, i + 1);
    const highestHigh = Math.max(...windowHighs);
    const lowestLow = Math.min(...windowLows);
    const currentClose = closes[i];

    let rsv = 50;
    if (highestHigh !== lowestLow) {
      rsv = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    }

    prevK = k;
    prevD = d;
    k = (prevK * 2) / 3 + rsv / 3;
    d = (prevD * 2) / 3 + k / 3;
  }

  return {
    k9: Math.round(k * 100) / 100,
    d9: Math.round(d * 100) / 100,
    prevK9: Math.round(prevK * 100) / 100,
    prevD9: Math.round(prevD * 100) / 100,
  };
}

/**
 * 計算 MACD (12, 26, 9)
 * EMA12 = 前日 EMA12 * 11/13 + 今日 Close * 2/13
 * EMA26 = 前日 EMA26 * 25/27 + 今日 Close * 2/27
 * DIF = EMA12 - EMA26
 * MACD9 = 前日 MACD9 * 8/10 + 今日 DIF * 2/10
 * MACD Hist = (DIF - MACD9) * 2
 */
export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): {
  dif12_26?: number;
  macd9?: number;
  macdHist?: number;
  prevMacdHist?: number;
} {
  const len = closes.length;
  if (len < slowPeriod) {
    return {};
  }

  let emaFast = closes[0];
  let emaSlow = closes[0];
  const fastMultiplier = 2 / (fastPeriod + 1);
  const slowMultiplier = 2 / (slowPeriod + 1);
  const signalMultiplier = 2 / (signalPeriod + 1);

  const difHistory: number[] = [];

  for (let i = 0; i < len; i++) {
    const price = closes[i];
    emaFast = price * fastMultiplier + emaFast * (1 - fastMultiplier);
    emaSlow = price * slowMultiplier + emaSlow * (1 - slowMultiplier);
    const dif = emaFast - emaSlow;
    difHistory.push(dif);
  }

  // 計算 MACD 訊號線 (DIF 的 EMA)
  let macdSignal = difHistory[0];
  let prevHist = 0;
  let currentHist = 0;

  for (let i = 0; i < difHistory.length; i++) {
    const dif = difHistory[i];
    macdSignal = dif * signalMultiplier + macdSignal * (1 - signalMultiplier);
    prevHist = currentHist;
    currentHist = (dif - macdSignal) * 2;
  }

  const latestDif = difHistory[difHistory.length - 1];

  return {
    dif12_26: Math.round(latestDif * 1000) / 1000,
    macd9: Math.round(macdSignal * 1000) / 1000,
    macdHist: Math.round(currentHist * 1000) / 1000,
    prevMacdHist: Math.round(prevHist * 1000) / 1000,
  };
}

/**
 * 計算成交量相關指標
 */
export function calculateVolumeMetrics(volumes: number[]): {
  yesterdayVolume?: number;
  avgVolume5?: number;
  avgVolume20?: number;
  isYesterdaySurge?: boolean;
} {
  if (!volumes || volumes.length < 2) {
    return {};
  }

  const yesterdayVolume = volumes[volumes.length - 2];
  const avgVolume5 = calculateSMA(volumes, 5);
  const avgVolume20 = calculateSMA(volumes, 20);

  let isYesterdaySurge = false;
  if (yesterdayVolume !== undefined && avgVolume5 && avgVolume5 > 0) {
    isYesterdaySurge = yesterdayVolume >= avgVolume5 * 1.8;
  }

  return {
    yesterdayVolume,
    avgVolume5,
    avgVolume20,
    isYesterdaySurge,
  };
}

/**
 * 計算價格區間極值（5日與20日高低點）
 */
export function calculatePriceExtremes(
  highs: number[],
  lows: number[]
): {
  weekHigh5?: number;
  weekLow5?: number;
  monthHigh20?: number;
  monthLow20?: number;
} {
  const weekHighs = highs.slice(-5);
  const weekLows = lows.slice(-5);
  const monthHighs = highs.slice(-20);
  const monthLows = lows.slice(-20);

  return {
    weekHigh5: weekHighs.length > 0 ? Math.max(...weekHighs) : undefined,
    weekLow5: weekLows.length > 0 ? Math.min(...weekLows) : undefined,
    monthHigh20: monthHighs.length >= 20 ? Math.max(...monthHighs) : undefined,
    monthLow20: monthLows.length >= 20 ? Math.min(...monthLows) : undefined,
  };
}

/**
 * 整合計算所有技術指標
 */
export function computeTechnicalIndicators(
  candles: DailyCandle[],
  currentPrice: number
): TechnicalIndicators {
  if (!candles || candles.length === 0) {
    return { currentPrice };
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);

  const ma = calculateMovingAverages(closes);
  const kd = calculateStochasticKD(highs, lows, closes);
  const macd = calculateMACD(closes);
  const vol = calculateVolumeMetrics(volumes);
  const extremes = calculatePriceExtremes(highs, lows);

  let bias20: number | undefined = undefined;
  if (ma.ma20 && ma.ma20 > 0) {
    bias20 = Math.round(((currentPrice - ma.ma20) / ma.ma20) * 10000) / 100;
  }

  let bias60: number | undefined = undefined;
  if (ma.ma60 && ma.ma60 > 0) {
    bias60 = Math.round(((currentPrice - ma.ma60) / ma.ma60) * 10000) / 100;
  }

  return {
    currentPrice,
    ma5: ma.ma5,
    ma20: ma.ma20,
    ma60: ma.ma60,
    ma120: ma.ma120,
    ma240: ma.ma240,
    k9: kd.k9,
    d9: kd.d9,
    prevK9: kd.prevK9,
    prevD9: kd.prevD9,
    dif12_26: macd.dif12_26,
    macd9: macd.macd9,
    macdHist: macd.macdHist,
    prevMacdHist: macd.prevMacdHist,
    yesterdayVolume: vol.yesterdayVolume,
    avgVolume5: vol.avgVolume5,
    avgVolume20: vol.avgVolume20,
    weekHigh5: extremes.weekHigh5,
    weekLow5: extremes.weekLow5,
    monthHigh20: extremes.monthHigh20,
    monthLow20: extremes.monthLow20,
    bias20,
    bias60,
  };
}

/**
 * 依據指標數值萃取持股技術警示膠囊清單
 */
export function extractHoldingSignals(
  currentPrice: number,
  indicators: TechnicalIndicators
): HoldingSignal[] {
  const signals: HoldingSignal[] = [];

  // 1. 量能異動類
  if (
    typeof indicators.yesterdayVolume === 'number' &&
    typeof indicators.avgVolume5 === 'number' &&
    indicators.avgVolume5 > 0 &&
    indicators.yesterdayVolume >= indicators.avgVolume5 * 1.8
  ) {
    signals.push({
      id: 'VOL_YESTERDAY_SURGE',
      label: '昨日量能注意',
      category: 'VOLUME',
      tone: 'WARNING',
      weight: 0,
      description: `昨日成交量 (${indicators.yesterdayVolume.toLocaleString()}) 達 5 日均量 (${Math.round(
        indicators.avgVolume5
      ).toLocaleString()}) 之 ${(indicators.yesterdayVolume / indicators.avgVolume5).toFixed(1)} 倍`,
      metricsValue: indicators.yesterdayVolume,
    });
  } else if (
    typeof indicators.avgVolume20 === 'number' &&
    indicators.avgVolume20 > 0 &&
    typeof indicators.yesterdayVolume === 'number' &&
    indicators.yesterdayVolume <= indicators.avgVolume20 * 0.35
  ) {
    signals.push({
      id: 'VOL_DRY_UP',
      label: '量縮窒息注意',
      category: 'VOLUME',
      tone: 'WARNING',
      weight: 0,
      description: `成交量急凍至 20 日均量之 35% 以下，可能醞釀變盤`,
      metricsValue: indicators.yesterdayVolume,
    });
  }

  // 2. 動能擺盪類 (KD)
  if (typeof indicators.k9 === 'number') {
    if (typeof indicators.prevK9 === 'number' && indicators.k9 - indicators.prevK9 >= 15) {
      signals.push({
        id: 'KD_K_SURGE_9',
        label: '9日K大幅拉升',
        category: 'MOMENTUM',
        tone: 'BULLISH',
        weight: 2,
        description: `9日 K 值由 ${indicators.prevK9} 急拉至 ${indicators.k9} (+${(
          indicators.k9 - indicators.prevK9
        ).toFixed(1)})`,
        metricsValue: indicators.k9,
      });
    } else if (indicators.k9 >= 80) {
      signals.push({
        id: 'KD_OVERBOUGHT',
        label: 'KD高檔強勢',
        category: 'MOMENTUM',
        tone: 'BULLISH',
        weight: 1,
        description: `9日 K 值高達 ${indicators.k9}，處於強勢多頭強軋區`,
        metricsValue: indicators.k9,
      });
    } else if (indicators.k9 <= 20) {
      signals.push({
        id: 'KD_OVERSOLD',
        label: 'KD超賣區',
        category: 'MOMENTUM',
        tone: 'WARNING',
        weight: -1,
        description: `9日 K 值已跌入超賣區 (${indicators.k9})，短線浮現反彈契機`,
        metricsValue: indicators.k9,
      });
    }
  }

  // 3. MACD 異動
  if (typeof indicators.macdHist === 'number') {
    if (
      typeof indicators.prevMacdHist === 'number' &&
      ((indicators.prevMacdHist < 0 && indicators.macdHist >= 0) ||
        (indicators.prevMacdHist > 0 && indicators.macdHist <= 0))
    ) {
      signals.push({
        id: 'MACD_ATTENTION',
        label: 'MACD注意',
        category: 'MOMENTUM',
        tone: 'WARNING',
        weight: indicators.macdHist >= 0 ? 1 : -1,
        description: `MACD 柱狀體發生多空翻轉 (${indicators.prevMacdHist} ➔ ${indicators.macdHist})`,
        metricsValue: indicators.macdHist,
      });
    } else if (
      typeof indicators.dif12_26 === 'number' &&
      typeof indicators.macd9 === 'number' &&
      indicators.dif12_26 > indicators.macd9
    ) {
      signals.push({
        id: 'MACD_BULLISH',
        label: 'MACD偏多',
        category: 'MOMENTUM',
        tone: 'BULLISH',
        weight: 1,
        description: `DIF (${indicators.dif12_26}) 位於 MACD 信號線 (${indicators.macd9}) 之上`,
        metricsValue: indicators.dif12_26,
      });
    }
  }

  // 4. 均線位階類 (MA5, MA20, MA60, MA120)
  if (typeof indicators.ma5 === 'number') {
    if (currentPrice < indicators.ma5) {
      signals.push({
        id: 'MA_BELOW_5',
        label: '5日線之下',
        category: 'MA_LEVEL',
        tone: 'BEARISH',
        weight: -1,
        description: `現價 ${currentPrice} 低於 5 日均線 (${indicators.ma5})`,
        metricsValue: indicators.ma5,
      });
    } else {
      signals.push({
        id: 'MA_ABOVE_5',
        label: '5日線之上',
        category: 'MA_LEVEL',
        tone: 'BULLISH',
        weight: 1,
        description: `現價 ${currentPrice} 站穩 5 日均線 (${indicators.ma5})`,
        metricsValue: indicators.ma5,
      });
    }
  }

  if (typeof indicators.ma20 === 'number') {
    if (currentPrice < indicators.ma20) {
      signals.push({
        id: 'MA_BELOW_20',
        label: '月線之下',
        category: 'MA_LEVEL',
        tone: 'BEARISH',
        weight: -2,
        description: `現價 ${currentPrice} 低於月均線 (${indicators.ma20})`,
        metricsValue: indicators.ma20,
      });
    } else {
      signals.push({
        id: 'MA_ABOVE_20',
        label: '月線之上',
        category: 'MA_LEVEL',
        tone: 'BULLISH',
        weight: 2,
        description: `現價 ${currentPrice} 站穩月均線 (${indicators.ma20})`,
        metricsValue: indicators.ma20,
      });
    }
  }

  if (typeof indicators.ma60 === 'number') {
    if (currentPrice < indicators.ma60) {
      signals.push({
        id: 'MA_BELOW_60',
        label: '季線之下',
        category: 'MA_LEVEL',
        tone: 'BEARISH',
        weight: -2,
        description: `現價 ${currentPrice} 跌破生命季線 (${indicators.ma60})`,
        metricsValue: indicators.ma60,
      });
    } else {
      signals.push({
        id: 'MA_ABOVE_60',
        label: '季線之上',
        category: 'MA_LEVEL',
        tone: 'BULLISH',
        weight: 2,
        description: `現價 ${currentPrice} 守穩生命季線 (${indicators.ma60})`,
        metricsValue: indicators.ma60,
      });
    }
  }

  if (typeof indicators.ma120 === 'number') {
    if (currentPrice >= indicators.ma120) {
      signals.push({
        id: 'MA_ABOVE_120',
        label: '半年線之上',
        category: 'MA_LEVEL',
        tone: 'NEUTRAL',
        weight: 1,
        description: `現價 ${currentPrice} 處於半年線 (${indicators.ma120}) 長期多空分水嶺之上`,
        metricsValue: indicators.ma120,
      });
    } else {
      signals.push({
        id: 'MA_BELOW_120',
        label: '半年線之下',
        category: 'MA_LEVEL',
        tone: 'BEARISH',
        weight: -2,
        description: `現價 ${currentPrice} 跌破半年線 (${indicators.ma120})`,
        metricsValue: indicators.ma120,
      });
    }
  }

  // 5. 價格突破與極值類
  if (typeof indicators.weekLow5 === 'number' && currentPrice <= indicators.weekLow5) {
    signals.push({
      id: 'PRICE_WEEK_LOW',
      label: '創單週新低',
      category: 'PRICE_EXTREME',
      tone: 'BEARISH',
      weight: -2,
      description: `現價 ${currentPrice} 創近 5 日最低價`,
      metricsValue: indicators.weekLow5,
    });
  } else if (typeof indicators.weekHigh5 === 'number' && currentPrice >= indicators.weekHigh5) {
    signals.push({
      id: 'PRICE_WEEK_HIGH',
      label: '創單週新高',
      category: 'PRICE_EXTREME',
      tone: 'BULLISH',
      weight: 2,
      description: `現價 ${currentPrice} 創近 5 日最高價`,
      metricsValue: indicators.weekHigh5,
    });
  }

  // 6. 均線乖離率 (Bias %) 標籤
  if (typeof indicators.bias20 === 'number') {
    if (indicators.bias20 >= 8) {
      signals.push({
        id: 'BIAS_20_OVERBOUGHT',
        label: `月線正乖離 (+${indicators.bias20.toFixed(1)}%)`,
        category: 'PRICE_EXTREME',
        tone: 'WARNING',
        weight: -1,
        description: `現價相對 20MA 正乖離達 +${indicators.bias20.toFixed(2)}%，短線漲幅偏高慎防回檔`,
        metricsValue: indicators.bias20,
      });
    } else if (indicators.bias20 <= -6) {
      signals.push({
        id: 'BIAS_20_OVERSOLD',
        label: `月線負乖離 (${indicators.bias20.toFixed(1)}%)`,
        category: 'PRICE_EXTREME',
        tone: 'WARNING',
        weight: 1,
        description: `現價相對 20MA 負乖離達 ${indicators.bias20.toFixed(2)}%，短線超跌醞釀技術反彈`,
        metricsValue: indicators.bias20,
      });
    }
  }

  // 7. 長短多週期共振結構 (Multi-Timeframe Confluence)
  if (typeof indicators.ma5 === 'number' && typeof indicators.ma20 === 'number' && typeof indicators.ma60 === 'number') {
    if (indicators.ma5 > indicators.ma20 && currentPrice < indicators.ma60) {
      signals.push({
        id: 'CONFLUENCE_REBOUND_IN_DOWNTREND',
        label: '長空短多 (反彈)',
        category: 'MA_LEVEL',
        tone: 'WARNING',
        weight: 0,
        description: '短期均線黃金交叉，但中長線仍在季線之下，定義為空頭反彈格局，宜逢高減碼',
      });
    } else if (indicators.ma5 < indicators.ma20 && currentPrice >= indicators.ma60) {
      signals.push({
        id: 'CONFLUENCE_PULLBACK_IN_UPTREND',
        label: '長多短空 (拉回)',
        category: 'MA_LEVEL',
        tone: 'NEUTRAL',
        weight: 1,
        description: '中長線守穩季線多頭，短期 5MA 跌破 20MA 拉回整理，可觀察止跌支撐',
      });
    }
  }

  // 8. 肌肉書僮短線量化體系 (Phase 2, #0019)
  if (indicators.boxStatus === 'BREAKOUT_UP') {
    signals.push({
      id: 'MUSCLE_BOX_BREAKOUT_UP',
      label: '箱頂突破',
      category: 'PRICE_EXTREME',
      tone: 'BULLISH',
      weight: 3,
      description: '三日箱頂有效突破，肌肉記憶短線強勢表態',
    });
  } else if (indicators.boxStatus === 'BREAKOUT_DOWN') {
    signals.push({
      id: 'MUSCLE_BOX_BREAKOUT_DOWN',
      label: '跌破箱底',
      category: 'PRICE_EXTREME',
      tone: 'BEARISH',
      weight: -3,
      description: '跌破三日箱底防守線，短線偏空注意防守停損',
    });
  }

  if (indicators.isBottomPenetration) {
    signals.push({
      id: 'MUSCLE_BOTTOM_PENETRATION',
      label: '底穿上反轉',
      category: 'MOMENTUM',
      tone: 'BULLISH',
      weight: 3,
      description: '盤中跌破支撐後強勢收復且下影線過半，主力誘空假跌破反轉型態',
    });
  }

  if (indicators.ma20DeductionSlope === 'UP') {
    signals.push({
      id: 'MUSCLE_MA20_DED_UP',
      label: '月線扣低翻揚',
      category: 'MA_LEVEL',
      tone: 'BULLISH',
      weight: 1,
      description: '均線扣抵望遠鏡預測：月線即將扣抵低價區翻揚助漲',
    });
  } else if (indicators.ma20DeductionSlope === 'DOWN') {
    signals.push({
      id: 'MUSCLE_MA20_DED_DOWN',
      label: '月線扣高下彎',
      category: 'MA_LEVEL',
      tone: 'WARNING',
      weight: -1,
      description: '均線扣抵望遠鏡預測：月線即將扣抵高價區下彎助跌',
    });
  }

  if (indicators.isBollingerSqueeze) {
    signals.push({
      id: 'MUSCLE_BB_SQUEEZE',
      label: '布林極致壓縮',
      category: 'VOLUME',
      tone: 'WARNING',
      weight: 0,
      description: '帶寬小於 8%，波動率極致收縮，預警主力蓄勢即將變盤表態',
    });
  }

  return signals;
}
