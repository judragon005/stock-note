import {
  DailyCandle,
  BoxStatus,
  TrendSlope,
  RelativeStrengthRank,
  MuscleBookerIndicatorPoint,
} from '../types/indicators';
import { MarketType } from '../types/stock';
import { getDynamicUniverseStorage } from '../utils/storage';
import {
  US_DOW_30_SYMBOLS,
  US_SOX_30_SYMBOLS,
  US_NASDAQ_100_SYMBOLS,
  US_SP_500_SYMBOLS,
  TW_ALL_SYMBOLS,
  TW_MID_100_SYMBOLS,
} from '../data/usIndicesComponents';

export {
  US_DOW_30_SYMBOLS,
  US_SOX_30_SYMBOLS,
  US_NASDAQ_100_SYMBOLS,
  US_SP_500_SYMBOLS,
  TW_ALL_SYMBOLS,
  TW_MID_100_SYMBOLS,
};


export {
  detectDarvasBox,
  calculateMaDeduction,
  calculateBollingerSqueeze,
} from './darvasBoxEngine';
import {
  detectDarvasBox,
  calculateMaDeduction,
  calculateBollingerSqueeze,
  detectBottomPenetration,
} from './darvasBoxEngine';
export { detectBottomPenetration };
import { calculateSMA, calculateMACD } from './technicalIndicatorEngine';
import { calculateOBV, detectPriceActionTraps } from './omniIndicatorEngine';
import { calculateVwapCostStructure } from './vwapCostEngine';
import { calculateVolumeProfile } from './volumeProfileEngine';
import { computeChaikinMoneyFlow } from './smartMoneyEngine';

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
    const closePrices = subCandles.map((c) => c.close);
    const ma5 = calculateSMA(closePrices, 5);
    const ma10 = calculateSMA(closePrices, 10);
    const ma20 = calculateSMA(closePrices, 20);
    const ma60 = calculateSMA(closePrices, 60);

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

export interface DefenseBufferMetrics {
  defensePrice: number;
  bufferPercent: number;
  isDefenseBroken: boolean;
  isDefenseEndangered: boolean;
  isBroken: boolean;
  isCritical: boolean;
}

/**
 * 統一計算達瓦斯與移動防守價之緩衝距離與瀕危警報狀態 (DRY 消除重複代碼)
 */
export function calculateDefenseBufferMetrics(item: {
  currentPrice: number;
  atr?: { trailingDefensePrice?: number };
  actionDecision: { action?: string; stopLossPrice?: number };
  boxUpper?: number;
  boxLower?: number;
}): DefenseBufferMetrics {
  const defPrice =
    item.actionDecision.stopLossPrice ??
    item.atr?.trailingDefensePrice ??
    (item.actionDecision.action === 'BUY' ? item.boxUpper : item.boxLower) ??
    item.currentPrice * 0.95;

  const isSell = item.actionDecision.action === 'SELL';
  if (defPrice === undefined || item.currentPrice <= 0) {
    return {
      defensePrice: 0,
      bufferPercent: 999,
      isDefenseBroken: isSell,
      isDefenseEndangered: isSell,
      isBroken: isSell,
      isCritical: isSell,
    };
  }

  const bufferPercent = ((item.currentPrice - defPrice) / item.currentPrice) * 100;
  const isDefenseBroken = item.currentPrice < defPrice;
  const isDefenseEndangered = !isDefenseBroken && bufferPercent <= 1.5;
  const isBroken = isDefenseBroken || isSell;
  const isCritical = isBroken || bufferPercent <= 1.5 || isSell;

  return {
    defensePrice: Math.round(defPrice * 100) / 100,
    bufferPercent: Math.round(bufferPercent * 10) / 10,
    isDefenseBroken,
    isDefenseEndangered,
    isBroken,
    isCritical,
  };
}

export interface MuscleBookerActionDecision {
  action: MuscleBookerActionType;
  actionBadge: string;
  actionReason: string;
  stopLossPrice?: number;
  targetPrice?: number;
  riskRewardRatio?: string;
  riskRewardRatioValue?: number;
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
    futureDeductions?: number[];
  };
  bbands: {
    isSqueeze: boolean;
    bandwidth?: number;
    wasRecentSqueeze?: boolean;
  };
  atr?: {
    atr14?: number;
    trailingDefensePrice?: number;
  };
  lookback60High?: number;
  isHolding?: boolean;
  marketRegime?: 'BULL' | 'BEAR' | 'NEUTRAL';
  rsRank?: RelativeStrengthRank;
  obvTrend?: 'RISING' | 'FALLING' | 'FLAT';
  macd?: {
    dif12_26?: number;
    macdHist?: number;
  };
  isForensicDangerous?: boolean;
  isLowLiquidity?: boolean;
  hasBullTrap?: boolean;
  vwap?: {
    mainForceVwap?: number;
    biasPercent?: number;
  };
  hasHeavyResistance?: boolean;
  isUsMoneyFlowDivergent?: boolean;
}): MuscleBookerActionDecision {
  const {
    currentPrice,
    box,
    deduction,
    bbands,
    atr,
    lookback60High,
    isHolding,
    marketRegime,
    rsRank,
    obvTrend,
    macd,
    isForensicDangerous,
    isLowLiquidity,
    hasBullTrap,
    vwap,
    hasHeavyResistance,
    isUsMoneyFlowDivergent,
  } = params;

  // 0. 財報鑑識負向排除 (Hard Ban)
  if (isForensicDangerous) {
    return {
      action: 'AVOID',
      actionBadge: '⛔ 鑑識雷達示警 (財報造假風險)',
      actionReason: '財報鑑識雷達偵測到嚴重造假/掏空異常，屬於絕對禁買標的，保全本金第一',
    };
  }

  // 1. 優先判斷賣出/停損訊號 (SELL) - 三級防守矩陣
  if (box.boxStatus === 'BREAKOUT_DOWN') {
    return {
      action: 'SELL',
      actionBadge: '🔴 建議賣出 (破底停損)',
      actionReason: '跌破箱底防守線，趨勢轉弱，應無條件停損保全本金',
      stopLossPrice: box.boxLower,
    };
  }

  // 在倉持股二級防守：突破後跌回箱頂以下 (假突破保本離場)
  if (isHolding && box.boxUpper !== undefined && currentPrice < box.boxUpper * 0.99 && currentPrice >= (box.boxLower ?? 0)) {
    return {
      action: 'SELL',
      actionBadge: '🔴 建議賣出 (假突破保本)',
      actionReason: '突破箱頂後無力續攻跌回箱內，假突破確立，應保本離場',
      stopLossPrice: box.boxUpper,
    };
  }

  // 在倉持股三級防守：跌破 ATR 移動防守線 (波段移動停利)
  if (isHolding && atr?.trailingDefensePrice !== undefined && atr.trailingDefensePrice > 0 && currentPrice < atr.trailingDefensePrice) {
    return {
      action: 'SELL',
      actionBadge: '🔴 建議賣出 (ATR移動停利)',
      actionReason: '股價自波段高點拉回跌破 2.5 倍 ATR 移動防守線，獲利了結保全戰果',
      stopLossPrice: atr.trailingDefensePrice,
    };
  }

  // 1.5. 流動性容量安全門檻一票否決 (Spec 0216 Ticket 02)
  if (!isHolding && isLowLiquidity) {
    return {
      action: 'AVOID',
      actionBadge: '⛔ 嚴禁碰觸 (流動性不足)',
      actionReason: '日均成交金額低於安全容量門檻 (台股3,000萬/美股500萬)，避免滑價與衝擊成本，嚴禁建倉',
    };
  }

  // 2. 判斷買進訊號 (BUY)
  // 情境 A: 突破箱頂 + 均線向上
  if (box.boxStatus === 'BREAKOUT_UP' && deduction.ma20Slope === 'UP') {
    // 假突破墓碑倒錘線 (Bull Trap) 一票否決 (Spec 0216 Ticket 01)
    if (hasBullTrap) {
      return {
        action: 'AVOID',
        actionBadge: '⛔ 嚴禁碰觸 (墓碑誘多)',
        actionReason: '突破箱頂但出現長上影線墓碑倒錘 (Bull Trap)，主力拉高出貨誘多，切忌追高',
      };
    }

    // 流動性容量安全檢驗 (Spec 0216 Ticket 02 - 消除死代碼)
    if (isHolding && isLowLiquidity) {
      return {
        action: 'HOLD',
        actionBadge: '🟡 流動性不足 (容量受限)',
        actionReason: '帶量站上箱頂但成交金額低於安全容量門檻，避免衝擊成本與滑價風險，不予主動推薦',
      };
    }

    // MACD 0 軸多頭主控檢驗
    if (macd && macd.dif12_26 !== undefined && macd.macdHist !== undefined) {
      if (macd.dif12_26 < 0 && macd.macdHist < 0) {
        return {
          action: 'AVOID',
          actionBadge: '⛔ 嚴禁碰觸 (MACD弱勢)',
          actionReason: 'MACD 處於 0 軸以下且柱狀體為負，空方控盤結構，嚴禁追高',
        };
      }
    }

    // 平滑化 R-Multiple 目標價 (Spec 0216 Ticket 02: 消除 60 日高點階躍斷崖)
    const stopLoss = box.boxUpper ?? currentPrice * 0.95;
    const boxWidth = box.boxUpper && box.boxLower ? box.boxUpper - box.boxLower : currentPrice - stopLoss;
    const measuredTarget = currentPrice + Math.max(boxWidth, 2.0 * (atr?.atr14 ?? currentPrice * 0.03));
    const target = (lookback60High !== undefined && lookback60High > currentPrice)
      ? 0.5 * lookback60High + 0.5 * measuredTarget
      : measuredTarget;
    const structuralRisk = Math.max(0.1, currentPrice - stopLoss);
    const minRiskBuffer = Math.max(currentPrice * 0.02, (atr?.atr14 ?? 0) * 1.0);
    const effectiveRisk = Math.max(structuralRisk, minRiskBuffer);
    const reward = Math.max(0.1, target - currentPrice);
    const rrValue = Math.round((reward / effectiveRisk) * 10) / 10;
    const rrRatio = rrValue.toFixed(1);

    // OBV 能量潮資金流檢驗
    if (obvTrend === 'FALLING') {
      return {
        action: 'HOLD',
        actionBadge: '🟡 觀望 (OBV背離)',
        actionReason: '帶量站上箱頂但 OBV 能量潮呈現背離流出，真金白銀動能不足，切忌追高',
        stopLossPrice: Math.round(stopLoss * 100) / 100,
        targetPrice: Math.round(target * 100) / 100,
        riskRewardRatio: `${rrRatio}R`,
        riskRewardRatioValue: rrValue,
      };
    }

    // 美股 CMF 資金流背離檢驗 (Spec 0216 Ticket 03)
    if (isUsMoneyFlowDivergent) {
      return {
        action: 'HOLD',
        actionBadge: '🟡 觀望 (美股CMF背離)',
        actionReason: '帶量站上箱頂但美股機構資金流 CMF < -0.15 呈現高檔派發，切忌追高',
        stopLossPrice: Math.round(stopLoss * 100) / 100,
        targetPrice: Math.round(target * 100) / 100,
        riskRewardRatio: `${rrRatio}R`,
        riskRewardRatioValue: rrValue,
      };
    }

    // 20 日主力 VWAP 成本過熱檢驗 (Spec 0216 Ticket 03)
    if (vwap?.biasPercent !== undefined && vwap.biasPercent > 10.0) {
      return {
        action: 'HOLD',
        actionBadge: '🟡 觀望 (主力成本過熱)',
        actionReason: `帶量站上箱頂但距 20 日主力成本線乖離過大 (${vwap.biasPercent.toFixed(1)}% > 10.0%)，非主力建倉成本區，防主力派發，切忌追高`,
        stopLossPrice: Math.round(stopLoss * 100) / 100,
        targetPrice: Math.round(target * 100) / 100,
        riskRewardRatio: `${rrRatio}R`,
        riskRewardRatioValue: rrValue,
      };
    }

    // Volume Profile 上方 5% 套牢反壓檢驗 (Spec 0216 Ticket 03)
    if (hasHeavyResistance) {
      return {
        action: 'HOLD',
        actionBadge: '🟡 觀望 (上方套牢壓沉重)',
        actionReason: '帶量站上箱頂但上方 5% 內密集成交套牢峰 (POC) 賣壓沉重，阻力重重，切忌追高',
        stopLossPrice: Math.round(stopLoss * 100) / 100,
        targetPrice: Math.round(target * 100) / 100,
        riskRewardRatio: `${rrRatio}R`,
        riskRewardRatioValue: rrValue,
      };
    }

    // 帶寬審查門檻：帶寬必須極致收斂 (<= 8.0%)，或近 5 日曾極致收斂且當日開口 <= 12.0% (Spec 0216 / Issue #399)
    const isBandwidthValid =
      bbands.bandwidth !== undefined &&
      (bbands.bandwidth <= 8.0 || (bbands.wasRecentSqueeze && bbands.bandwidth <= 12.0));

    if (bbands.bandwidth !== undefined && !isBandwidthValid) {
      return {
        action: 'HOLD',
        actionBadge: '🟡 觀望 (帶寬未收斂)',
        actionReason: `帶量站上箱頂但布林帶寬未極致收斂 (${bbands.bandwidth.toFixed(1)}% > 8.0%)，非壓縮爆發起點，切忌追高`,
        stopLossPrice: Math.round(stopLoss * 100) / 100,
        targetPrice: Math.round(target * 100) / 100,
        riskRewardRatio: `${rrRatio}R`,
        riskRewardRatioValue: rrValue,
      };
    }

    if (marketRegime === 'BEAR' && rsRank !== 'EXTREME_STRONG') {
      return {
        action: 'HOLD',
        actionBadge: '🟡 觀望 (大盤偏空防線)',
        actionReason: '大盤偏空處於空頭或轉折弱勢，非 RS 極強 (EXTREME_STRONG) 領先股，切忌逆勢進場',
        stopLossPrice: Math.round(stopLoss * 100) / 100,
        targetPrice: Math.round(target * 100) / 100,
        riskRewardRatio: `${rrRatio}R`,
        riskRewardRatioValue: rrValue,
      };
    }

    const minRequiredRR = marketRegime === 'BEAR' ? 3.0 : 2.0;

    // 風益比硬門檻：不足門檻絕不追高進場 (大盤偏空時提高至 3.0R)
    if (rrValue < minRequiredRR) {
      const reason = marketRegime === 'BEAR'
        ? `帶量站上箱頂但大盤偏空，動能門檻提高至 3.0R (目前僅 ${rrRatio}R < 3.0R)，防禦優先，切忌追高`
        : `帶量站上箱頂但向上空間狹窄 (風益比僅 ${rrRatio}R < 2.0R)，期望值過低，切忌追高`;
      return {
        action: 'HOLD',
        actionBadge: marketRegime === 'BEAR' ? '🟡 觀望 (大盤偏空防線)' : '🟡 觀望 (風益比不足)',
        actionReason: reason,
        stopLossPrice: Math.round(stopLoss * 100) / 100,
        targetPrice: Math.round(target * 100) / 100,
        riskRewardRatio: `${rrRatio}R`,
        riskRewardRatioValue: rrValue,
      };
    }

    return {
      action: 'BUY',
      actionBadge: '🟢 建議買進 (突破買點)',
      actionReason: '帶量站上箱頂且20MA翻揚，帶寬極致壓縮方向確立，第一買點確立',
      stopLossPrice: Math.round(stopLoss * 100) / 100,
      targetPrice: Math.round(target * 100) / 100,
      riskRewardRatio: `${rrRatio}R`,
      riskRewardRatioValue: rrValue,
    };
  }

  // 情境 B: 破底翻反轉 (收復下影線且均線不下彎)
  if (deduction.isBottomPenetrationRebound && deduction.ma20Slope !== 'DOWN') {
    if (isHolding && isLowLiquidity) {
      return {
        action: 'HOLD',
        actionBadge: '🟡 流動性不足 (容量受限)',
        actionReason: '破底翻但成交金額低於安全容量門檻，避免衝擊成本與滑價風險，不予主動推薦',
      };
    }

    // MACD 0 軸多頭主控檢驗
    if (macd && macd.dif12_26 !== undefined && macd.macdHist !== undefined) {
      if (macd.dif12_26 < 0 && macd.macdHist < 0) {
        return {
          action: 'AVOID',
          actionBadge: '⛔ 嚴禁碰觸 (MACD弱勢)',
          actionReason: 'MACD 處於 0 軸以下且柱狀體為負，空方控盤結構，嚴禁左側猜底',
        };
      }
    }

    // OBV 能量潮資金流檢驗
    if (obvTrend === 'FALLING') {
      return {
        action: 'HOLD',
        actionBadge: '🟡 觀望 (OBV背離)',
        actionReason: '破底翻但 OBV 能量潮呈現背離流出，真金白銀動能不足，切忌急躁進場',
      };
    }

    const stopLoss = box.boxLower ? box.boxLower * 0.98 : currentPrice * 0.95;
    const rawTarget = box.boxUpper ?? currentPrice * 1.1;
    const target = (lookback60High !== undefined && lookback60High > currentPrice)
      ? 0.5 * lookback60High + 0.5 * rawTarget
      : rawTarget;
    const structuralRisk = Math.max(0.1, currentPrice - stopLoss);
    const minRiskBuffer = Math.max(currentPrice * 0.02, (atr?.atr14 ?? 0) * 1.0);
    const effectiveRisk = Math.max(structuralRisk, minRiskBuffer);
    const reward = Math.max(0.1, target - currentPrice);
    const rrValue = Math.round((reward / effectiveRisk) * 10) / 10;
    const rrRatio = rrValue.toFixed(1);

    if (marketRegime === 'BEAR' && rsRank !== 'EXTREME_STRONG') {
      return {
        action: 'HOLD',
        actionBadge: '🟡 觀望 (大盤偏空防線)',
        actionReason: '大盤偏空處於空頭或轉折弱勢，非 RS 極強 (EXTREME_STRONG) 領先股，切忌逆勢進場',
        stopLossPrice: Math.round(stopLoss * 100) / 100,
        targetPrice: Math.round(target * 100) / 100,
        riskRewardRatio: `${rrRatio}R`,
        riskRewardRatioValue: rrValue,
      };
    }

    const minRequiredRR = marketRegime === 'BEAR' ? 3.0 : 2.0;

    // 風益比硬門檻：不足門檻絕不急躁進場 (大盤偏空時提高至 3.0R)
    if (rrValue < minRequiredRR) {
      const reason = marketRegime === 'BEAR'
        ? `破底翻但大盤偏空，動能門檻提高至 3.0R (目前僅 ${rrRatio}R < 3.0R)，防禦優先，切忌急躁進場`
        : `破底翻但距上方壓力過近 (風益比僅 ${rrRatio}R < 2.0R)，空間狹小，切忌急躁進場`;
      return {
        action: 'HOLD',
        actionBadge: marketRegime === 'BEAR' ? '🟡 觀望 (大盤偏空防線)' : '🟡 觀望 (空間不足)',
        actionReason: reason,
        stopLossPrice: Math.round(stopLoss * 100) / 100,
        targetPrice: Math.round(target * 100) / 100,
        riskRewardRatio: `${rrRatio}R`,
        riskRewardRatioValue: rrValue,
      };
    }

    const isVwapReclaimed = vwap?.mainForceVwap !== undefined && currentPrice >= vwap.mainForceVwap;
    const actionBadge = isVwapReclaimed ? '🟢 建議買進 (破底翻站回成本線)' : '🟢 建議買進 (破底翻)';
    const vwapBonusReason = isVwapReclaimed ? '，且強勢收復20日主力VWAP成本線' : '';

    return {
      action: 'BUY',
      actionBadge,
      actionReason: `盤中跌破箱底但強勢收回50%以上${vwapBonusReason}，洗盤結束，右側進場`,
      stopLossPrice: Math.round(stopLoss * 100) / 100,
      targetPrice: Math.round(target * 100) / 100,
      riskRewardRatio: `${rrRatio}R`,
      riskRewardRatioValue: rrValue,
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

export type AssetPoolType =
  | 'HOLDINGS'
  | 'HOLDINGS_ACTIVE'
  | 'HOLDINGS_CLOSED'
  | 'TOP30_FOCUS'
  | 'TW_ALL'
  | 'TW50_CORE'
  | 'MID100_MOMENTUM'
  | 'TW_TOP_30_FOCUS'
  | 'US_SP500'
  | 'US_NASDAQ100'
  | 'US_DOW30'
  | 'US_SOX30'
  | 'US_MEGA_50_CORE'
  | 'CUSTOM_WATCHLIST';

/**
 * 股市小白專屬動能名詞百科字典
 */
export const BEGINNER_TOOLTIPS = {
  riskReward: '💡【股市小白指南】風益比 (Risk-Reward Ratio, 以 R 倍數表示)：賺賠比。代表每承受 1 單位停損風險 (1R)，預期能賺取的獲利倍數。例如 7.9R 代表獲利是潛在停損的 7.9 倍！數值越大代表勝算越高，通常大於 2.0R 才是值得進場的好機會！',
  boxUpperDefense: '💡【股市小白指南】箱頂防守價：股價帶量突破過去一段時間的最高整理壓力線後，箱頂轉為最強支撐防守線。只要沒跌破箱頂，就代表多頭主升段續抱；若跌破則需警戒避險。',
  bottomPenetration: '💡【股市小白指南】破底翻反轉：主力故意跌破前低支撐引誘散戶殺出，隨後當天強勢拉抬收復超過一半留下長下影線。這是典型的「假跌破、真吃貨」右側止跌進場訊號。',
  bollingerSqueeze: '💡【股市小白指南】布林極致壓縮：帶寬小於 8%，代表多空力量高度收斂、股價像彈簧被壓到最緊。暗示隨時會爆發大方向變盤，此時切勿預設立場猜底，等待出方向再跟隨！',
  boxLowerBreakdown: '💡【股市小白指南】跌破箱底防守線：跌破過去三日箱底的最後防線，多方棄守、趨勢轉弱。嚴禁凹單攤平，應果斷停損保全資金，保命第一！',
  maDeductionTelescope: '💡【股市小白指南】MA20 扣抵望遠鏡：用來提前 3~5 天預測月均線的走勢。若目前現價高於 20 天前的扣抵價，月均線就會向上翻揚助漲；反之均線會下彎反壓。',
  stopLossPrinciple: '💡【股市小白指南】嚴格停損紀律：只要跌破設定的防守價位，代表進場理由消失。小賠離場是為了保護本金，避免一次大跌讓資產腰斬！',
};

export interface ScanMuscleBookerOptions {
  isHolding?: boolean;
  marketRegime?: 'BULL' | 'BEAR' | 'NEUTRAL';
  rsRank?: RelativeStrengthRank;
  isForensicDangerous?: boolean;
}

export interface ScannedStockItem {
  symbol: string;
  name: string;
  market: MarketType;
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
  isDataPending?: boolean;
  candles?: DailyCandle[];
  atr?: { atr14: number; trailingDefensePrice: number };
  obvTrend?: 'RISING' | 'FALLING' | 'FLAT';
  macd?: { dif12_26?: number; macdHist?: number };
}

// 台股法人焦點 Top 30 (30 檔熱門短線動能與核心飆股)
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
  { symbol: '3017', name: '奇鋐', market: 'TW' as const, basePrice: 620 },
  { symbol: '3324', name: '雙鴻', market: 'TW' as const, basePrice: 690 },
  { symbol: '3661', name: '世芯-KY', market: 'TW' as const, basePrice: 2100 },
  { symbol: '6669', name: '緯穎', market: 'TW' as const, basePrice: 2150 },
  { symbol: '2376', name: '技嘉', market: 'TW' as const, basePrice: 270 },
  { symbol: '2357', name: '華碩', market: 'TW' as const, basePrice: 580 },
  { symbol: '3037', name: '欣興', market: 'TW' as const, basePrice: 155 },
  { symbol: '3653', name: '健策', market: 'TW' as const, basePrice: 1350 },
  { symbol: '2609', name: '陽明', market: 'TW' as const, basePrice: 65 },
  { symbol: '2618', name: '長榮航', market: 'TW' as const, basePrice: 37 },
  { symbol: '3443', name: '創意', market: 'TW' as const, basePrice: 1180 },
  { symbol: '6274', name: '台燿', market: 'TW' as const, basePrice: 165 },
  { symbol: '8996', name: '高力', market: 'TW' as const, basePrice: 340 },
  { symbol: '2368', name: '金像電', market: 'TW' as const, basePrice: 220 },
  { symbol: '6415', name: '矽力*-KY', market: 'TW' as const, basePrice: 430 },
  { symbol: '1519', name: '華城', market: 'TW' as const, basePrice: 620 },
  { symbol: '1513', name: '中興電', market: 'TW' as const, basePrice: 165 },
  { symbol: '1504', name: '東元', market: 'TW' as const, basePrice: 51 },
];

// 美股焦點與成長 Top 30 (30 檔熱門動能與科技巨頭)
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
  { symbol: 'QCOM', name: '高通 Qualcomm', market: 'US' as const, basePrice: 170 },
  { symbol: 'INTC', name: '英特爾 Intel', market: 'US' as const, basePrice: 21 },
  { symbol: 'ASML', name: '艾司摩爾 ASML', market: 'US' as const, basePrice: 810 },
  { symbol: 'TSM', name: '台積電 ADR', market: 'US' as const, basePrice: 170 },
  { symbol: 'SNOW', name: 'Snowflake', market: 'US' as const, basePrice: 120 },
  { symbol: 'PANW', name: 'Palo Alto', market: 'US' as const, basePrice: 350 },
  { symbol: 'CRWD', name: 'CrowdStrike', market: 'US' as const, basePrice: 275 },
  { symbol: 'UBER', name: 'Uber', market: 'US' as const, basePrice: 72 },
  { symbol: 'ABNB', name: 'Airbnb', market: 'US' as const, basePrice: 118 },
  { symbol: 'HOOD', name: 'Robinhood', market: 'US' as const, basePrice: 22 },
  { symbol: 'MARA', name: 'MARA Holdings', market: 'US' as const, basePrice: 16 },
  { symbol: 'RIVN', name: 'Rivian', market: 'US' as const, basePrice: 14 },
  { symbol: 'MSTR', name: 'MicroStrategy', market: 'US' as const, basePrice: 135 },
  { symbol: 'PYPL', name: 'PayPal', market: 'US' as const, basePrice: 65 },
];

// 臺灣 50 權值核心 Top 50 官方成分股全名單 (50 檔)
export const TW50_BLUE_CHIP_SYMBOLS = [
  { symbol: '2330', name: '台積電', market: 'TW' as const, basePrice: 1010 },
  { symbol: '2317', name: '鴻海', market: 'TW' as const, basePrice: 185 },
  { symbol: '2454', name: '聯發科', market: 'TW' as const, basePrice: 1280 },
  { symbol: '2308', name: '台達電', market: 'TW' as const, basePrice: 395 },
  { symbol: '2382', name: '廣達', market: 'TW' as const, basePrice: 280 },
  { symbol: '2881', name: '富邦金', market: 'TW' as const, basePrice: 88 },
  { symbol: '2882', name: '國泰金', market: 'TW' as const, basePrice: 65 },
  { symbol: '2886', name: '兆豐金', market: 'TW' as const, basePrice: 39.5 },
  { symbol: '2891', name: '中信金', market: 'TW' as const, basePrice: 36.5 },
  { symbol: '2412', name: '中華電', market: 'TW' as const, basePrice: 125 },
  { symbol: '2884', name: '玉山金', market: 'TW' as const, basePrice: 28.5 },
  { symbol: '2892', name: '第一金', market: 'TW' as const, basePrice: 28.2 },
  { symbol: '2890', name: '永豐金', market: 'TW' as const, basePrice: 24.5 },
  { symbol: '2880', name: '華南金', market: 'TW' as const, basePrice: 26 },
  { symbol: '2885', name: '元大金', market: 'TW' as const, basePrice: 32 },
  { symbol: '5880', name: '合庫金', market: 'TW' as const, basePrice: 26.5 },
  { symbol: '2887', name: '台新金', market: 'TW' as const, basePrice: 18.5 },
  { symbol: '2883', name: '凱基金', market: 'TW' as const, basePrice: 16.5 },
  { symbol: '2303', name: '聯電', market: 'TW' as const, basePrice: 52 },
  { symbol: '3711', name: '日月光投控', market: 'TW' as const, basePrice: 155 },
  { symbol: '2603', name: '長榮', market: 'TW' as const, basePrice: 195 },
  { symbol: '3231', name: '緯創', market: 'TW' as const, basePrice: 110 },
  { symbol: '2357', name: '華碩', market: 'TW' as const, basePrice: 580 },
  { symbol: '2379', name: '瑞昱', market: 'TW' as const, basePrice: 510 },
  { symbol: '3008', name: '大立光', market: 'TW' as const, basePrice: 2600 },
  { symbol: '3045', name: '台灣大', market: 'TW' as const, basePrice: 112 },
  { symbol: '4904', name: '遠傳', market: 'TW' as const, basePrice: 88 },
  { symbol: '1301', name: '台塑', market: 'TW' as const, basePrice: 50 },
  { symbol: '1303', name: '南亞', market: 'TW' as const, basePrice: 42 },
  { symbol: '1326', name: '台化', market: 'TW' as const, basePrice: 40 },
  { symbol: '6505', name: '台塑化', market: 'TW' as const, basePrice: 53 },
  { symbol: '2002', name: '中鋼', market: 'TW' as const, basePrice: 22.5 },
  { symbol: '1216', name: '統一', market: 'TW' as const, basePrice: 85 },
  { symbol: '2912', name: '統一超', market: 'TW' as const, basePrice: 275 },
  { symbol: '1101', name: '台泥', market: 'TW' as const, basePrice: 32 },
  { symbol: '1102', name: '亞泥', market: 'TW' as const, basePrice: 42 },
  { symbol: '2609', name: '陽明', market: 'TW' as const, basePrice: 65 },
  { symbol: '2615', name: '萬海', market: 'TW' as const, basePrice: 85 },
  { symbol: '2618', name: '長榮航', market: 'TW' as const, basePrice: 37 },
  { symbol: '2610', name: '華航', market: 'TW' as const, basePrice: 22 },
  { symbol: '5871', name: '中租-KY', market: 'TW' as const, basePrice: 125 },
  { symbol: '5876', name: '上海商銀', market: 'TW' as const, basePrice: 40 },
  { symbol: '3661', name: '世芯-KY', market: 'TW' as const, basePrice: 2100 },
  { symbol: '3017', name: '奇鋐', market: 'TW' as const, basePrice: 620 },
  { symbol: '3034', name: '聯詠', market: 'TW' as const, basePrice: 510 },
  { symbol: '3037', name: '欣興', market: 'TW' as const, basePrice: 155 },
  { symbol: '2395', name: '研華', market: 'TW' as const, basePrice: 350 },
  { symbol: '2327', name: '國巨', market: 'TW' as const, basePrice: 610 },
  { symbol: '6669', name: '緯穎', market: 'TW' as const, basePrice: 2150 },
  { symbol: '2801', name: '彰銀', market: 'TW' as const, basePrice: 18.5 },
];

// 美股巨頭 Top 50 權值巨頭全名單 (50 檔)
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
  { symbol: 'BAC', name: '美國銀行 Bank of America', market: 'US' as const, basePrice: 40 },
  { symbol: 'NFLX', name: 'Netflix', market: 'US' as const, basePrice: 680 },
  { symbol: 'CRM', name: 'Salesforce', market: 'US' as const, basePrice: 250 },
  { symbol: 'AMD', name: '超微 AMD', market: 'US' as const, basePrice: 155 },
  { symbol: 'QCOM', name: '高通 Qualcomm', market: 'US' as const, basePrice: 170 },
  { symbol: 'ORCL', name: '甲骨文 Oracle', market: 'US' as const, basePrice: 140 },
  { symbol: 'INTC', name: '英特爾 Intel', market: 'US' as const, basePrice: 21 },
  { symbol: 'CSCO', name: '思科 Cisco', market: 'US' as const, basePrice: 50 },
  { symbol: 'TXN', name: '德州儀器 Texas Instruments', market: 'US' as const, basePrice: 205 },
  { symbol: 'ACN', name: '埃森哲 Accenture', market: 'US' as const, basePrice: 340 },
  { symbol: 'ADBE', name: 'Adobe', market: 'US' as const, basePrice: 560 },
  { symbol: 'CVX', name: '雪佛龍 Chevron', market: 'US' as const, basePrice: 145 },
  { symbol: 'MRK', name: '默克 Merck', market: 'US' as const, basePrice: 118 },
  { symbol: 'KO', name: '可口可樂 Coca-Cola', market: 'US' as const, basePrice: 70 },
  { symbol: 'PEP', name: '百事可樂 PepsiCo', market: 'US' as const, basePrice: 175 },
  { symbol: 'LIN', name: '林德 Linde', market: 'US' as const, basePrice: 460 },
  { symbol: 'DIS', name: '迪士尼 Disney', market: 'US' as const, basePrice: 95 },
  { symbol: 'PM', name: '菲利普莫里斯 Philip Morris', market: 'US' as const, basePrice: 120 },
  { symbol: 'WFC', name: '富國銀行 Wells Fargo', market: 'US' as const, basePrice: 56 },
  { symbol: 'MCD', name: '麥當勞 McDonald\'s', market: 'US' as const, basePrice: 290 },
  { symbol: 'ABT', name: '亞培 Abbott', market: 'US' as const, basePrice: 115 },
  { symbol: 'IBM', name: 'IBM', market: 'US' as const, basePrice: 210 },
  { symbol: 'GE', name: '奇異 GE Aerospace', market: 'US' as const, basePrice: 185 },
  { symbol: 'NOW', name: 'ServiceNow', market: 'US' as const, basePrice: 860 },
  { symbol: 'AMAT', name: '應用材料 Applied Materials', market: 'US' as const, basePrice: 200 },
  { symbol: 'CAT', name: '卡特彼勒 Caterpillar', market: 'US' as const, basePrice: 360 },
  { symbol: 'ISRG', name: '直覺外科 Intuitive Surgical', market: 'US' as const, basePrice: 480 },
  { symbol: 'MS', name: '摩根士丹利 Morgan Stanley', market: 'US' as const, basePrice: 102 },
  { symbol: 'AXP', name: '美國運通 American Express', market: 'US' as const, basePrice: 255 },
  { symbol: 'PLTR', name: 'Palantir', market: 'US' as const, basePrice: 32 },
];

/**
 * 依據當前市場與選定資產池獲取過濾後的標的
 */
export function getScopedUniverseSymbols(
  market: 'ALL' | MarketType = 'ALL',
  pool: AssetPoolType = 'TOP30_FOCUS'
) {
  const getWithCache = (poolKey: string, fallback: { symbol: string; name: string; market: MarketType; basePrice?: number }[]) => {
    try {
      const cached = getDynamicUniverseStorage(poolKey);
      if (cached && cached.symbols && cached.symbols.length > 0) {
        return cached.symbols;
      }
    } catch {
      // ignore
    }
    return fallback;
  };

  // 1. 靜態映射字典 (消除 Fowler Repeated Switches smell)
  const poolMapping: Partial<Record<AssetPoolType, { key: string; fallback: any[] }>> = {
    TW_ALL: { key: 'TW_ALL', fallback: TW_ALL_SYMBOLS },
    MID100_MOMENTUM: { key: 'TW_MID_100', fallback: TW_MID_100_SYMBOLS },
    TW_TOP_30_FOCUS: { key: 'TW_TOP_30_FOCUS', fallback: TW_TOP_30_FOCUS_SYMBOLS },
    US_SP500: { key: 'US_SP500', fallback: US_SP_500_SYMBOLS },
    US_NASDAQ100: { key: 'US_NASDAQ100', fallback: US_NASDAQ_100_SYMBOLS },
    US_DOW30: { key: 'US_DOW30', fallback: US_DOW_30_SYMBOLS },
    US_SOX30: { key: 'US_SOX30', fallback: US_SOX_30_SYMBOLS },
    US_MEGA_50_CORE: { key: 'US_MEGA_50_CORE', fallback: US_MEGA_50_CORE_SYMBOLS },
  };

  const matched = poolMapping[pool];
  if (matched) {
    return getWithCache(matched.key, matched.fallback);
  }

  // 2. 雙市場自適應核心藍籌池 (TW50 / US Mega 50)
  if (pool === 'TW50_CORE') {
    if (market === 'US') return getWithCache('US_MEGA_50_CORE', US_MEGA_50_CORE_SYMBOLS);
    return getWithCache('TW50_CORE', TW50_BLUE_CHIP_SYMBOLS);
  }

  // 10. 核心焦點池 TOP30_FOCUS (預設回退)
  if (market === 'US') return getWithCache('US_TOP_30_FOCUS', US_TOP_30_FOCUS_SYMBOLS);
  if (market === 'TW') return getWithCache('TW_TOP_30_FOCUS', TW_TOP_30_FOCUS_SYMBOLS);
  return [
    ...getWithCache('TW_TOP_30_FOCUS', TW_TOP_30_FOCUS_SYMBOLS),
    ...getWithCache('US_TOP_30_FOCUS', US_TOP_30_FOCUS_SYMBOLS),
  ];
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
  localCandles?: DailyCandle[],
  options?: ScanMuscleBookerOptions
): ScannedStockItem {
  // 防禦性零幻覺原則：無足夠真實歷史日 K 線（< 5 根）時，絕不可偽造假 K 線誤導交易！
  if (!localCandles || localCandles.length < 5) {
    return {
      symbol,
      name,
      market,
      currentPrice: basePrice,
      boxStatus: 'INSIDE_BOX',
      isBottomPenetration: false,
      ma20Slope: 'FLAT',
      isBollingerSqueeze: false,
      isDataPending: true,
      actionDecision: {
        action: 'AVOID',
        actionBadge: '🟡 數據回補中',
        actionReason: '歷史日K數據回補中或不足，暫無量化訊號',
        stopLossPrice: basePrice,
      },
    };
  }

  const candles = localCandles;

  const box = detectDarvasBox(candles);
  const deduction = calculateMaDeduction(candles, box.boxLower);
  const bbands = calculateBollingerSqueeze(candles);
  const lastCandle = candles[candles.length - 1];
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  // 1. ATR 動態防守與真實波幅
  const atr = calculateAtrTrailingDefense(candles);

  // 2. 近 60 日結構高點壓制 (排除當日 K 線，取前波高點)
  const pastCandles = candles.slice(0, -1);
  const lookback60High = pastCandles.length > 0
    ? Math.max(...pastCandles.slice(-60).map((c) => c.high))
    : undefined;

  // 3. OBV 能量潮資金流計算
  const obvResult = calculateOBV(closes, volumes);
  const obvTrend = obvResult.trend;

  // 4. MACD 零軸多空主控計算
  const macdResult = calculateMACD(closes);
  const macd = macdResult && (macdResult.dif12_26 !== undefined || macdResult.macdHist !== undefined)
    ? { dif12_26: macdResult.dif12_26, macdHist: macdResult.macdHist }
    : undefined;

  // 5. 誘多墓碑倒錘 (Bull Trap) 檢測 (Spec 0216 Ticket 01 & Standards SSOT 收斂)
  const traps = detectPriceActionTraps({
    open: lastCandle.open,
    high: lastCandle.high,
    low: lastCandle.low,
    close: lastCandle.close,
    resistanceLevel: box.boxUpper,
    supportLevel: box.boxLower,
  });
  const hasBullTrap = traps.hasBullTrap;

  // 6. 20 日主力 VWAP 成本結構與乖離率 (Spec 0216 Ticket 03)
  let vwap: { mainForceVwap?: number; biasPercent?: number } | undefined;
  try {
    const vwapStruct = calculateVwapCostStructure(candles, lastCandle.close);
    if (vwapStruct) {
      vwap = {
        mainForceVwap: vwapStruct.mainForceVwap,
        biasPercent: vwapStruct.biasPercent,
      };
    }
  } catch {
    // 防禦性容錯
  }

  // 7. Volume Profile 上方 5% 密集成交峰 (POC) 反壓檢測 (Spec 0216 Ticket 03)
  let hasHeavyResistance = false;
  try {
    const vp = calculateVolumeProfile(candles);
    if (vp && vp.buckets && vp.buckets.length > 0) {
      const pocBucket = [...vp.buckets].sort((a, b) => b.percentage - a.percentage)[0];
      const pocCenter = (pocBucket.priceMin + pocBucket.priceMax) / 2;
      // POC 必須實質處於現價上方且在 5% 反壓警戒區內，且成交量密集 (>= 25%)
      if (pocCenter > lastCandle.close && pocCenter <= lastCandle.close * 1.05 && pocBucket.percentage >= 25) {
        hasHeavyResistance = true;
      }
    }
  } catch {
    // 防禦性容錯
  }

  // 8. 美股機構資金流 CMF 背離檢測 (Spec 0216 Ticket 03)
  let isUsMoneyFlowDivergent = false;
  if (market === 'US') {
    try {
      const cmf = computeChaikinMoneyFlow(candles, 20);
      if (cmf < -0.15) {
        isUsMoneyFlowDivergent = true;
      }
    } catch {
      // 防禦性容錯
    }
  }

  // 9. 流動性初篩與安全金額容量檢驗 (Spec 0216 Ticket 02)
  let isLowLiquidity = false;
  if (candles.length >= 5) {
    const last5 = candles.slice(-5);
    const avgVol5 = last5.reduce((acc, c) => acc + c.volume, 0) / 5;
    // 台股行情量若 <= 100,000 通常為張數 (券商/一般日K慣例)，自動換算為股數 (1張 = 1,000股)
    const twShares = avgVol5 <= 100000 ? avgVol5 * 1000 : avgVol5;
    const avgDollarVolume5 = market === 'TW' ? twShares * lastCandle.close : avgVol5 * lastCandle.close;
    const dollarThreshold = market === 'TW' ? 30_000_000 : 5_000_000;
    if (avgDollarVolume5 < dollarThreshold) {
      isLowLiquidity = true;
    }
  }

  const actionDecision = evaluateMuscleBookerAction({
    currentPrice: lastCandle.close,
    box,
    deduction,
    bbands,
    atr,
    lookback60High,
    isHolding: options?.isHolding,
    marketRegime: options?.marketRegime,
    rsRank: options?.rsRank,
    obvTrend,
    macd,
    isForensicDangerous: options?.isForensicDangerous,
    isLowLiquidity,
    hasBullTrap,
    vwap,
    hasHeavyResistance,
    isUsMoneyFlowDivergent,
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
    candles,
    atr,
    obvTrend,
    macd,
  };

}


