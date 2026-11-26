import type { KlineCandleItem } from '../types/aiForceDashboard';
import type { MarketType } from '../types/stock';
import type { MarketRegime } from '../types/omniIndicator';
import { aggregateCandlesToTimeframe, type KlineTimeframe } from './klineAggregationEngine';
import {
  enrichCandlesWithOscillators,
  resolveVolumeAnchorCandles,
  type VolumeAnchorResolution,
} from './klineOscillatorEngine';
import {
  calculateDmiAdx,
  calculateOBV,
  evaluateMarketRegime,
  detectDivergence,
} from './omniIndicatorEngine';
import { calculateBollingerSqueeze } from './darvasBoxEngine';

export type ResonancePillarTone = 'BULL' | 'BEAR' | 'NEUTRAL' | 'WARN';

export interface VolumePillarDiagnosis {
  isAvailable: boolean;
  isVolumeAnchoredToPrevClose: boolean;
  anchorDate?: string;
  volumeDisplay: number;
  volumeUnit: '張' | '股';
  volRatio5?: number;
  volRatio20?: number;
  obvTrend: 'RISING' | 'FALLING' | 'FLAT';
  hasPriceUpVolumeDownDivergence?: boolean;
  statusLabel: string;
  tone: ResonancePillarTone;
  interpretation: string;
}

export interface KdjPillarDiagnosis {
  isAvailable: boolean;
  k?: number;
  d?: number;
  j?: number;
  weeklyResonanceLabel?: string;
  statusLabel: string;
  tone: ResonancePillarTone;
  interpretation: string;
}

export interface MacdPillarDiagnosis {
  isAvailable: boolean;
  dif?: number;
  dea?: number;
  hist?: number;
  histStreakDays: number;
  zeroAxisPosition: 'ABOVE' | 'BELOW' | 'NEAR';
  divergence: 'BULLISH' | 'BEARISH' | 'NONE';
  statusLabel: string;
  tone: ResonancePillarTone;
  interpretation: string;
}

export interface RsiPillarDiagnosis {
  isAvailable: boolean;
  rsi14?: number;
  rsi6?: number;
  crossState: 'BULL_CROSS' | 'BEAR_CROSS' | 'NEUTRAL';
  divergence: 'BULLISH' | 'BEARISH' | 'NONE';
  statusLabel: string;
  tone: ResonancePillarTone;
  interpretation: string;
}

export interface HistoricalWinRateStat {
  signalName: string;
  sampleCount: number;
  winRatePercent?: number;
  avgReturn10dPercent?: number;
  isSufficient: boolean;
}

export interface TechnicalResonanceSummary {
  bullCount: number;
  bearCount: number;
  warnCount: number;
  neutralCount: number;
  hasConflict: boolean;
  conflictAlert?: string;
  overallTone: ResonancePillarTone;
  overallBadge: string;
  actionAdvice: string;
  invalidationRule: string;
  historicalWinRate: HistoricalWinRateStat;
}

export interface TechnicalResonanceReport {
  timeframe: KlineTimeframe;
  asOfDate: string;
  candleCount: number;
  regime: {
    type: MarketRegime;
    label: string;
    weightHint: string;
    adx?: number;
  };
  volume: VolumePillarDiagnosis;
  kdj: KdjPillarDiagnosis;
  macd: MacdPillarDiagnosis;
  rsi: RsiPillarDiagnosis;
  summary: TechnicalResonanceSummary;
}

export interface BuildTechnicalResonanceInput {
  candles: KlineCandleItem[];
  dailyCandles?: KlineCandleItem[];
  timeframe?: KlineTimeframe;
  market?: MarketType;
  keyLevels?: {
    highResistance?: number;
    mainForceCost?: number;
    supportLevel?: number;
  };
}

export interface RegimePillarWeights {
  vol: number;
  kdj: number;
  macd: number;
  rsi: number;
}

/**
 * 體制支柱權重矩陣 (Spec 0249 T06: 每組總和恆為 4.0)
 */
export function resolveRegimePillarWeights(regime: MarketRegime): RegimePillarWeights {
  if (regime === 'TRENDING_BULL' || regime === 'TRENDING_BEAR') {
    return { vol: 1.0, kdj: 0.75, macd: 1.5, rsi: 0.75 };
  }
  if (regime === 'VOLATILITY_SQUEEZE') {
    return { vol: 1.4, kdj: 0.7, macd: 1.2, rsi: 0.7 };
  }
  // CHOPPY_RANGE: MACD 權重 0.65 (折減 35%)
  return { vol: 1.0, kdj: 1.35, macd: 0.65, rsi: 1.35 };
}

function getRegimeWeightHint(regime: MarketRegime, adx?: number): string {
  const adxText = adx !== undefined ? ` (ADX ${adx.toFixed(1)})` : '';
  switch (regime) {
    case 'TRENDING_BULL':
      return `強多主升體制${adxText}：以量能與 MACD 順勢為主，慎防因 KDJ/RSI 高檔鈍化過早賣飛`;
    case 'TRENDING_BEAR':
      return `空頭主跌體制${adxText}：以 MACD 與均線防守為主，嚴禁見 KDJ/RSI 低檔鈍化即盲目摸底`;
    case 'VOLATILITY_SQUEEZE':
      return `布林壓縮變盤體制${adxText}：波動率收斂蓄勢，聚焦量能表態與 MACD 柱體首發方向`;
    case 'CHOPPY_RANGE':
    default:
      return `震盪盤整體制${adxText}：MACD 趨勢訊號權重折減 35%，優先依 KDJ / RSI 區間極值操作`;
  }
}

function computeHistoricalWinRate(
  enriched: KlineCandleItem[],
  focus: 'KD_OVERSOLD_GOLDEN' | 'MACD_FLIP_UP' | 'MACD_FLIP_DOWN'
): HistoricalWinRateStat {
  const windowCandles = enriched.slice(-250);
  let sampleCount = 0;
  let winCount = 0;
  let totalRet = 0;

  const signalName =
    focus === 'KD_OVERSOLD_GOLDEN'
      ? '低檔 KD 金叉'
      : focus === 'MACD_FLIP_UP'
        ? 'MACD 翻紅轉多'
        : 'MACD 翻綠轉空';

  for (let i = 1; i <= windowCandles.length - 11; i++) {
    const prev = windowCandles[i - 1];
    const curr = windowCandles[i];
    const fwd = windowCandles[i + 10];
    if (
      !Number.isFinite(curr.close) ||
      curr.close <= 0 ||
      !fwd ||
      !Number.isFinite(fwd.close) ||
      fwd.close <= 0
    ) {
      continue;
    }

    let triggered = false;
    if (focus === 'KD_OVERSOLD_GOLDEN') {
      triggered =
        prev.k !== undefined &&
        prev.d !== undefined &&
        curr.k !== undefined &&
        curr.d !== undefined &&
        prev.k < prev.d &&
        curr.k >= curr.d &&
        curr.k <= 35;
    } else if (focus === 'MACD_FLIP_UP') {
      triggered =
        prev.macdHist !== undefined &&
        curr.macdHist !== undefined &&
        prev.macdHist <= 0 &&
        curr.macdHist > 0;
    } else {
      triggered =
        prev.macdHist !== undefined &&
        curr.macdHist !== undefined &&
        prev.macdHist >= 0 &&
        curr.macdHist < 0;
    }

    if (triggered) {
      sampleCount++;
      const ret = ((fwd.close - curr.close) / curr.close) * 100;
      totalRet += ret;
      if (focus === 'MACD_FLIP_DOWN' ? ret < 0 : ret > 0) {
        winCount++;
      }
    }
  }

  if (sampleCount < 3) {
    return {
      signalName,
      sampleCount,
      isSufficient: false,
    };
  }

  return {
    signalName,
    sampleCount,
    winRatePercent: Number(((winCount / sampleCount) * 100).toFixed(1)),
    avgReturn10dPercent: Number((totalRet / sampleCount).toFixed(1)),
    isSufficient: true,
  };
}

function detectIndicatorDivergence(
  enriched: KlineCandleItem[],
  getValue: (c: KlineCandleItem) => number | undefined
): 'BULLISH' | 'BEARISH' | 'NONE' {
  const validSlice = enriched.filter((c) => getValue(c) !== undefined).slice(-30);
  if (validSlice.length < 10) return 'NONE';
  const divRes = detectDivergence(
    validSlice.map((c) => c.close),
    validSlice.map((c) => getValue(c)!)
  );
  if (divRes.hasBearishDivergence) return 'BEARISH';
  if (divRes.hasBullishDivergence) return 'BULLISH';
  return 'NONE';
}

/**
 * 支柱 1：成交量診斷純函式 (Spec 0249 T05)
 */
function diagnoseVolumePillar(
  effVolCandles: KlineCandleItem[],
  volAnchor: VolumeAnchorResolution,
  market: MarketType
): VolumePillarDiagnosis {
  const volLast = effVolCandles[effVolCandles.length - 1];
  const volUnit: '張' | '股' = market === 'US' ? '股' : '張';
  const rawLatestVol = volLast?.volume ?? 0;
  const volumeDisplay = market === 'TW' ? Math.round(rawLatestVol / 1000) : Math.round(rawLatestVol);

  const avgVol = (period: number): number | undefined => {
    if (effVolCandles.length < period) return undefined;
    const sum = effVolCandles.slice(-period).reduce((acc, c) => acc + c.volume, 0);
    return sum / period;
  };

  const avg5 = avgVol(5);
  const avg20 = avgVol(20);
  const volRatio5 = avg5 && avg5 > 0 ? Number((rawLatestVol / avg5).toFixed(2)) : undefined;
  const volRatio20 = avg20 && avg20 > 0 ? Number((rawLatestVol / avg20).toFixed(2)) : undefined;
  const obvRes = calculateOBV(
    effVolCandles.map((c) => c.close),
    effVolCandles.map((c) => c.volume)
  );

  let statusLabel = '量能常態換手';
  let tone: ResonancePillarTone = 'NEUTRAL';
  let interpretation = '量價結構平穩，尚未出現明顯爆量攻擊或窒息急凍訊號。';

  if (effVolCandles.length < 2) {
    statusLabel = '量能樣本累積中';
    interpretation = '有效交易日數不足，待收盤量能累積後判讀。';
  } else if (volLast) {
    const isBullCandle = volLast.close >= volLast.open;
    const body = Math.abs(volLast.close - volLast.open);
    const upperShadow = volLast.high - Math.max(volLast.open, volLast.close);
    const isLongUpperShadow = upperShadow > Math.max(body * 1.5, volLast.close * 0.015);

    if (volRatio5 !== undefined && volRatio5 >= 1.8) {
      if (isLongUpperShadow) {
        statusLabel = '爆量滯漲警戒';
        tone = 'WARN';
        interpretation = `量比達 ${volRatio5}x 且留長上影線，高檔換手遇壓慎防出貨。`;
      } else if (isBullCandle) {
        statusLabel = '攻擊放量表態';
        tone = 'BULL';
        interpretation = `收紅且量能達 5 期均量 ${volRatio5}x，OBV 呈${obvRes.trend === 'RISING' ? '上升' : '震盪'}，買盤積極進駐。`;
      } else {
        statusLabel = '放量下殺賣壓';
        tone = 'BEAR';
        interpretation = `收黑且放量達 ${volRatio5}x 均量，短線停損與調節賣壓湧現。`;
      }
    } else if (volRatio20 !== undefined && volRatio20 <= 0.4) {
      statusLabel = '窒息量縮變盤';
      tone = 'WARN';
      interpretation = `量能急凍至 20 期均量 ${Math.round(volRatio20 * 100)}%，籌碼沉澱待方向表態。`;
    } else if (isBullCandle && volRatio5 !== undefined && volRatio5 < 0.75 && obvRes.trend === 'FALLING') {
      statusLabel = '價漲量縮背離';
      tone = 'WARN';
      interpretation = `反彈量比僅 ${volRatio5}x 且 OBV 走低，追價意願不足慎防折返。`;
    } else if (obvRes.trend === 'RISING' && isBullCandle) {
      statusLabel = '溫和量增偏多';
      tone = 'BULL';
      interpretation = `量比 ${volRatio5 ?? '-'}x 配合 OBV 能量潮推升，量價配合健康。`;
    } else if (obvRes.trend === 'FALLING' && !isBullCandle) {
      statusLabel = '資金流出偏空';
      tone = 'BEAR';
      interpretation = `OBV 能量潮持續走低，空方主導籌碼派發結構。`;
    }
  }

  return {
    isAvailable: effVolCandles.length >= 2,
    isVolumeAnchoredToPrevClose: volAnchor.isVolumeAnchoredToPrevClose,
    anchorDate: volAnchor.volumeAnchorDate,
    volumeDisplay,
    volumeUnit: volUnit,
    volRatio5,
    volRatio20,
    obvTrend: obvRes.trend,
    hasPriceUpVolumeDownDivergence: statusLabel === '價漲量縮背離',
    statusLabel,
    tone,
    interpretation,
  };
}

/**
 * 支柱 2：KDJ 擺盪診斷純函式 (Spec 0249 T05: 顯式交叉優先於高/低檔鈍化)
 */
function diagnoseKdjPillar(
  last: KlineCandleItem | undefined,
  prev: KlineCandleItem | undefined,
  regime: MarketRegime,
  timeframe: KlineTimeframe,
  dailyCandles?: KlineCandleItem[]
): KdjPillarDiagnosis {
  const isAvailable = last?.k !== undefined && last?.d !== undefined && last?.j !== undefined;
  let statusLabel = '樣本累積中';
  let tone: ResonancePillarTone = 'NEUTRAL';
  let interpretation = '尚需至少 9 期 K 棒以建立有效 KDJ 擺盪指標。';
  let weeklyResonanceLabel: string | undefined;

  if (isAvailable && last) {
    const k = last.k!;
    const d = last.d!;
    const j = last.j!;
    const pk = prev?.k;
    const pd = prev?.d;

    if (timeframe === 'DAY' && (dailyCandles?.length ?? 0) >= 45) {
      const settledDaily = resolveVolumeAnchorCandles(dailyCandles).effectiveVolumeCandles;
      const weeklyAgg = enrichCandlesWithOscillators(
        aggregateCandlesToTimeframe(settledDaily, 'WEEK'),
        { requireMinPeriod: true }
      );
      const wLast = weeklyAgg[weeklyAgg.length - 1];
      if (wLast?.k !== undefined && wLast?.d !== undefined) {
        if (k >= d && wLast.k >= wLast.d) weeklyResonanceLabel = '日週雙金共振';
        else if (k >= d && wLast.k < wLast.d) weeklyResonanceLabel = '日金週死 (短反彈)';
        else if (k < d && wLast.k >= wLast.d) weeklyResonanceLabel = '日死週金 (拉回找買點)';
        else weeklyResonanceLabel = '日週同死警戒';
      }
    }

    const isGoldenCross = pk !== undefined && pd !== undefined && pk < pd && k >= d;
    const isDeathCross = pk !== undefined && pd !== undefined && pk >= pd && k < d;

    if (isDeathCross) {
      statusLabel = k >= 70 ? '高檔死亡交叉' : '死亡交叉轉弱';
      tone = 'BEAR';
      interpretation =
        k >= 70
          ? `高檔區 K(${k}) 跌破 D(${d})、J=${j} 反轉下彎，短線過熱轉弱宜嚴守停利紀律。`
          : `K(${k}) 跌破 D(${d})、J=${j} 下彎，短線動能轉弱宜嚴守紀律。`;
    } else if (isGoldenCross) {
      statusLabel = k <= 35 ? '低檔黃金交叉' : '中檔黃金交叉';
      tone = 'BULL';
      interpretation = `K(${k}) 上穿 D(${d})、J=${j} 轉強，短線多方動能啟動。`;
    } else if (k >= 80 && d >= 80) {
      statusLabel = j > 100 ? '高檔鈍化·J超買' : '高檔強勢鈍化';
      tone = regime === 'TRENDING_BULL' ? 'BULL' : 'WARN';
      interpretation =
        regime === 'TRENDING_BULL'
          ? `K=${k}、D=${d}、J=${j} 強勢鈍化軋空，主升段勿憑超買逆勢放空。`
          : `K=${k}、J=${j} 進入高檔過熱區，盤整格局慎防短線回檔。`;
    } else if (k <= 20 && d <= 20) {
      statusLabel = j < 0 ? '極端超賣·J負值' : '低檔超賣鈍化';
      tone = regime === 'TRENDING_BEAR' ? 'BEAR' : 'WARN';
      interpretation =
        regime === 'TRENDING_BEAR'
          ? `K=${k}、J=${j} 處低檔鈍化，空頭主跌段須待 K 線上穿 D 線再觀察止跌。`
          : `J 值下探 ${j} 進入極端超賣區，醞釀短線技術反抽契機。`;
    } else if (k >= d) {
      statusLabel = '多方發散續強';
      tone = 'BULL';
      interpretation = `K(${k}) 維持於 D(${d}) 之上，短線擺盪動能偏多。`;
    } else {
      statusLabel = '空方收斂修正';
      tone = 'BEAR';
      interpretation = `K(${k}) 低於 D(${d})，短線動能偏弱整理中。`;
    }
  }

  return {
    isAvailable,
    k: last?.k,
    d: last?.d,
    j: last?.j,
    weeklyResonanceLabel,
    statusLabel,
    tone,
    interpretation,
  };
}

/**
 * 支柱 3：MACD 趨勢診斷純函式 (Spec 0249 T05)
 */
function diagnoseMacdPillar(enriched: KlineCandleItem[]): MacdPillarDiagnosis {
  const last = enriched[enriched.length - 1];
  const prev = enriched.length >= 2 ? enriched[enriched.length - 2] : undefined;
  const isAvailable = last?.dif !== undefined && last?.macd !== undefined && last?.macdHist !== undefined;
  let statusLabel = '樣本累積中';
  let tone: ResonancePillarTone = 'NEUTRAL';
  let interpretation = '尚需至少 26 期 K 棒以建立有效 MACD 趨勢指標。';
  let zeroAxisPosition: 'ABOVE' | 'BELOW' | 'NEAR' = 'NEAR';
  let histStreakDays = 0;
  let divergence: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';

  if (isAvailable && last) {
    const dif = last.dif!;
    const hist = last.macdHist!;
    const prevHist = prev?.macdHist;
    const zeroThreshold = Math.max(0.05, last.close * 0.002);
    zeroAxisPosition = dif > zeroThreshold ? 'ABOVE' : dif < -zeroThreshold ? 'BELOW' : 'NEAR';

    const sign = hist >= 0 ? 1 : -1;
    for (let i = enriched.length - 1; i >= 0; i--) {
      const h = enriched[i].macdHist;
      if (h === undefined) break;
      if ((sign > 0 && h >= 0) || (sign < 0 && h < 0)) histStreakDays++;
      else break;
    }

    divergence = detectIndicatorDivergence(enriched, (c) => c.dif);

    const isExpanding = prevHist !== undefined ? Math.abs(hist) >= Math.abs(prevHist) : true;
    if (divergence === 'BEARISH') {
      statusLabel = '頂背離警戒';
      tone = 'WARN';
      interpretation = `股價創高但 DIF(${dif}) 未同步創高，波段多頭動能衰竭警訊。`;
    } else if (divergence === 'BULLISH') {
      statusLabel = '底背離築底';
      tone = 'BULL';
      interpretation = `股價破底但 DIF(${dif}) 率先抬頭，空方力竭醞釀轉折。`;
    } else if (hist >= 0) {
      statusLabel =
        zeroAxisPosition === 'ABOVE'
          ? isExpanding
            ? '零軸上紅柱擴張'
            : '零軸上紅柱收斂'
          : '零軸下翻紅反彈';
      tone = zeroAxisPosition === 'ABOVE' ? 'BULL' : 'NEUTRAL';
      interpretation =
        zeroAxisPosition === 'ABOVE'
          ? `DIF(${dif}) 站穩零軸上方，紅柱連續第 ${histStreakDays} 期，波段多頭主導。`
          : `柱體翻紅但 DIF(${dif}) 仍處零軸之下，暫定調為空頭格局反彈。`;
    } else {
      statusLabel = isExpanding ? '綠柱擴張偏空' : '綠柱收斂減壓';
      tone = isExpanding ? 'BEAR' : 'WARN';
      interpretation = isExpanding
        ? `綠柱擴大（連續第 ${histStreakDays} 期），空方趨勢加速度仍在延續。`
        : `綠柱連縮、空方動能趨緩，留意柱體翻紅轉折點。`;
    }
  }

  return {
    isAvailable,
    dif: last?.dif,
    dea: last?.macd,
    hist: last?.macdHist,
    histStreakDays,
    zeroAxisPosition,
    divergence,
    statusLabel,
    tone,
    interpretation,
  };
}

/**
 * 支柱 4：Wilder RSI(14 & 6) 診斷純函式 (Spec 0249 T05)
 */
function diagnoseRsiPillar(enriched: KlineCandleItem[]): RsiPillarDiagnosis {
  const last = enriched[enriched.length - 1];
  const prev = enriched.length >= 2 ? enriched[enriched.length - 2] : undefined;
  const isAvailable = last?.rsi !== undefined;
  let statusLabel = '樣本累積中';
  let tone: ResonancePillarTone = 'NEUTRAL';
  let interpretation = '尚需至少 15 期 K 棒以建立有效 Wilder RSI(14)。';
  let crossState: 'BULL_CROSS' | 'BEAR_CROSS' | 'NEUTRAL' = 'NEUTRAL';
  let divergence: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';

  if (isAvailable && last) {
    const r14 = last.rsi!;
    const r6 = last.rsi6;
    const pr14 = prev?.rsi;
    const pr6 = prev?.rsi6;

    if (r6 !== undefined && pr6 !== undefined && pr14 !== undefined) {
      if (pr6 < pr14 && r6 >= r14) crossState = 'BULL_CROSS';
      else if (pr6 >= pr14 && r6 < r14) crossState = 'BEAR_CROSS';
    }

    divergence = detectIndicatorDivergence(enriched, (c) => c.rsi);

    if (divergence === 'BEARISH') {
      statusLabel = 'RSI 頂背離';
      tone = 'WARN';
      interpretation = `RSI14(${r14}) 動能未隨股價創高，高檔追價勝率遞減。`;
    } else if (divergence === 'BULLISH') {
      statusLabel = 'RSI 底背離';
      tone = 'BULL';
      interpretation = `股價探底但 RSI14(${r14}) 墊高，賣壓遞減浮現止跌訊號。`;
    } else if (r14 > 75) {
      statusLabel = '極端超買過熱';
      tone = 'WARN';
      interpretation = `RSI14 達 ${r14} (>75)，短線正乖離偏大，宜移動停利防震盪。`;
    } else if (r14 >= 55) {
      statusLabel = crossState === 'BULL_CROSS' ? '強勢攻擊·快線上穿' : '多方強勢攻擊區';
      tone = 'BULL';
      interpretation = `RSI14(${r14}) 位於 55~75 健康攻擊帶，買盤動能佔優。`;
    } else if (r14 < 30) {
      statusLabel = '極度超跌反彈區';
      tone = 'WARN';
      interpretation = `RSI14 跌破 30 (${r14}) 進入極度超跌帶，靜待快線 RSI6(${r6 ?? '-'}) 翻揚。`;
    } else if (r14 <= 45) {
      statusLabel = crossState === 'BEAR_CROSS' ? '偏弱修正·快線下穿' : '空方偏弱整理';
      tone = 'BEAR';
      interpretation = `RSI14(${r14}) 落於 50 軸下方弱勢區，上檔反壓仍待化解。`;
    } else {
      statusLabel = '多空平衡拉鋸';
      tone = 'NEUTRAL';
      interpretation = `RSI14(${r14}) 處 45~55 中性軸線附近，動能方向待確認。`;
    }
  }

  return {
    isAvailable,
    rsi14: last?.rsi,
    rsi6: last?.rsi6,
    crossState,
    divergence,
    statusLabel,
    tone,
    interpretation,
  };
}

/**
 * 四態檢傷衝突裁決器 (Spec 0249 T06: 獨立 warnCount、空頭對稱 !hasConflict、WARN 失效防線校準)
 */
export function arbitrateResonanceSummary(params: {
  enriched: KlineCandleItem[];
  regime: MarketRegime;
  regimeLabel: string;
  volume: VolumePillarDiagnosis;
  kdj: KdjPillarDiagnosis;
  macd: MacdPillarDiagnosis;
  rsi: RsiPillarDiagnosis;
  keyLevels?: BuildTechnicalResonanceInput['keyLevels'];
}): TechnicalResonanceSummary {
  const { enriched, regime, regimeLabel, volume, kdj, macd, rsi, keyLevels } = params;
  const weights = resolveRegimePillarWeights(regime);
  const pillarEntries: Array<{ tone: ResonancePillarTone; weight: number }> = [
    { tone: volume.tone, weight: weights.vol },
    { tone: kdj.tone, weight: weights.kdj },
    { tone: macd.tone, weight: weights.macd },
    { tone: rsi.tone, weight: weights.rsi },
  ];

  const bullCount = pillarEntries.filter((p) => p.tone === 'BULL').length;
  const bearCount = pillarEntries.filter((p) => p.tone === 'BEAR').length;
  const warnCount = pillarEntries.filter((p) => p.tone === 'WARN').length;
  const neutralCount = pillarEntries.filter((p) => p.tone === 'NEUTRAL').length;

  const weightedBull = pillarEntries
    .filter((p) => p.tone === 'BULL')
    .reduce((acc, p) => acc + p.weight, 0);
  const weightedBear = pillarEntries
    .filter((p) => p.tone === 'BEAR')
    .reduce((acc, p) => acc + p.weight, 0);
  const netWeightedScore = Number((weightedBull - weightedBear).toFixed(2));

  const hasBearishDivergence = macd.divergence === 'BEARISH' || rsi.divergence === 'BEARISH';
  const hasBullishDivergence = macd.divergence === 'BULLISH' || rsi.divergence === 'BULLISH';
  const hasVolumeDivergence =
    Boolean(volume.hasPriceUpVolumeDownDivergence) && (macd.tone === 'BULL' || kdj.tone === 'BULL');
  // 底背離僅在空方格局 (bearCount >= 1) 構成衝突，純多頭疊加底背離屬同向強化不誤降為 WARN
  const hasConflict =
    (bullCount >= 1 && bearCount >= 1) ||
    hasBearishDivergence ||
    (hasBullishDivergence && bearCount >= 1) ||
    hasVolumeDivergence;

  let conflictAlert: string | undefined;
  if (hasBearishDivergence) {
    conflictAlert = '指標衝突警戒：偵測到動能頂背離，股價表象強勢與內在動能出現分裂。';
  } else if (hasBullishDivergence && bearCount >= 1) {
    conflictAlert = '指標衝突警戒：空頭格局浮現動能底背離，殺低風險升溫慎防軋空反彈。';
  } else if (hasVolumeDivergence) {
    conflictAlert = '量價矛盾警戒：技術指標偏多但量能未跟上，慎防假突破拉回。';
  } else if (bullCount >= 1 && bearCount >= 1) {
    conflictAlert = `多空指標分歧（${bullCount} 多 / ${bearCount} 空）：依「${regimeLabel}」權重優先順從主導維度，嚴控倉位。`;
  }

  let overallTone: ResonancePillarTone = warnCount >= 2 && bullCount === 0 && bearCount === 0 ? 'WARN' : 'NEUTRAL';
  let overallBadge =
    warnCount > 0
      ? `多空拉鋸 (${bullCount}多·${bearCount}空·${warnCount}警)`
      : `多空拉鋸 (${bullCount}多·${bearCount}空)`;
  let actionAdvice = '四維動能尚未形成單向共振，維持觀察並等待放量突破或均線表態。';

  if (bullCount >= 3 && !hasConflict) {
    overallTone = 'BULL';
    overallBadge = `四維多頭共振 (${bullCount}/4 偏多)`;
    actionAdvice = '量價與擺盪趨勢同步偏多，可順勢持有並沿 5 日線或支撐防線移動停利。';
  } else if (bearCount >= 3 && !hasConflict) {
    overallTone = 'BEAR';
    overallBadge = `四維空頭警戒 (${bearCount}/4 偏空)`;
    actionAdvice = '多數技術維度共振偏空，嚴守停損紀律，切忌於 MACD 綠柱擴張期左側盲目摸底。';
  } else if (bullCount >= 2 && bearCount === 0) {
    overallTone = hasConflict ? 'WARN' : 'BULL';
    overallBadge = hasConflict ? '偏多帶警戒 (防背離)' : `偏多結構 (${bullCount}/4 偏多)`;
    actionAdvice = hasConflict
      ? '技術面偏多但存在量價或背離警戒，不建議追高，改以拉回支撐區分批評估。'
      : '動能結構溫和偏多，可留意回測月線或主力成本帶之低風險切入點。';
  } else if (bearCount >= 2 && bullCount === 0) {
    overallTone = hasConflict ? 'WARN' : 'BEAR';
    overallBadge = hasConflict ? '偏空帶警戒 (防底背離)' : `偏空整理 (${bearCount}/4 偏空)`;
    actionAdvice = hasConflict
      ? '趨勢仍偏空但浮現底背離衝突訊號，嚴禁追空並靜待量價確認轉折。'
      : '動能持續修正中，靜待量縮止穩與 K 線黃金交叉確認再評估反彈。';
  } else if (netWeightedScore >= 0.6) {
    overallTone = hasConflict ? 'WARN' : 'BULL';
    overallBadge = `體制加權偏多 (${bullCount}多·${bearCount}空)`;
    actionAdvice = `依「${regimeLabel}」主導維度偏多，但仍有反向雜訊，宜採分批控倉切入。`;
  } else if (netWeightedScore <= -0.6) {
    overallTone = hasConflict ? 'WARN' : 'BEAR';
    overallBadge = `體制加權偏空 (${bullCount}多·${bearCount}空)`;
    actionAdvice = hasConflict
      ? `依「${regimeLabel}」主導維度偏空但存在衝突雜訊，減碼防禦並嚴防急彈軋空。`
      : `依「${regimeLabel}」主導維度偏空，防禦優先並待主導動能翻正再行介入。`;
  }

  const supportPrice = keyLevels?.supportLevel;
  const resistancePrice = keyLevels?.highResistance;
  const isBullishBias =
    overallTone === 'BULL' || (overallTone === 'WARN' && bullCount >= bearCount && netWeightedScore >= 0);
  const invalidationRule = isBullishBias
    ? `失效防線：帶量跌破支撐區${supportPrice ? ` (${supportPrice.toFixed(2)})` : ''}或 MACD 翻綠即撤銷偏多假設`
    : `轉強確認：帶量突破壓力區${resistancePrice ? ` (${resistancePrice.toFixed(2)})` : ''}且 MACD 綠柱轉紅始解除空方警戒`;

  const winFocus: 'KD_OVERSOLD_GOLDEN' | 'MACD_FLIP_UP' | 'MACD_FLIP_DOWN' =
    overallTone === 'BEAR'
      ? 'MACD_FLIP_DOWN'
      : regime === 'CHOPPY_RANGE'
        ? 'KD_OVERSOLD_GOLDEN'
        : 'MACD_FLIP_UP';
  const historicalWinRate = computeHistoricalWinRate(enriched, winFocus);

  return {
    bullCount,
    bearCount,
    warnCount,
    neutralCount,
    hasConflict,
    conflictAlert,
    overallTone,
    overallBadge,
    actionAdvice,
    invalidationRule,
    historicalWinRate,
  };
}

/**
 * 體制閘控四維量價動能共鳴解碼引擎 (Spec 0245 T04 / Spec 0249 T05-T06)
 * 統一收盤定錨 × ADX體制門控 × 四獨立支柱純函式 × 四態檢傷衝突裁決
 */
export function buildTechnicalResonance(
  input: BuildTechnicalResonanceInput
): TechnicalResonanceReport {
  const timeframe: KlineTimeframe = input.timeframe ?? 'DAY';
  const market: MarketType = input.market ?? 'TW';
  const sorted = [...(input.candles || [])].sort((a, b) => a.date.localeCompare(b.date));
  const volAnchor = resolveVolumeAnchorCandles(sorted);
  const enriched = enrichCandlesWithOscillators(volAnchor.effectiveVolumeCandles, { requireMinPeriod: true });
  const last = enriched[enriched.length - 1];
  const prev = enriched.length >= 2 ? enriched[enriched.length - 2] : undefined;

  const dmi = enriched.length >= 16
    ? calculateDmiAdx(enriched.map((c) => c.high), enriched.map((c) => c.low), enriched.map((c) => c.close), 14)
    : undefined;
  const bb = enriched.length >= 20
    ? calculateBollingerSqueeze(
        enriched.map(({ date, open, high, low, close, volume }) => ({ date, open, high, low, close, volume }))
      )
    : undefined;

  const maAlignment: 'BULLISH' | 'BEARISH' | 'ENTANGLED' =
    last && last.ma5 !== undefined && last.ma20 !== undefined && last.ma60 !== undefined
      ? last.close > last.ma5 && last.ma5 > last.ma20 && last.ma20 > last.ma60
        ? 'BULLISH'
        : last.close < last.ma5 && last.ma5 < last.ma20 && last.ma20 < last.ma60
          ? 'BEARISH'
          : 'ENTANGLED'
      : 'ENTANGLED';

  const regimeEval = evaluateMarketRegime({
    adx: dmi?.adx, pdi: dmi?.pdi, mdi: dmi?.mdi, bandwidthPercent: bb?.bandwidth, maAlignment,
  });

  const volume = diagnoseVolumePillar(enriched, volAnchor, market);
  const kdj = diagnoseKdjPillar(last, prev, regimeEval.regime, timeframe, input.dailyCandles);
  const macd = diagnoseMacdPillar(enriched);
  const rsi = diagnoseRsiPillar(enriched);
  const summary = arbitrateResonanceSummary({
    enriched, regime: regimeEval.regime, regimeLabel: regimeEval.label,
    volume, kdj, macd, rsi, keyLevels: input.keyLevels,
  });

  return {
    timeframe,
    asOfDate: last?.date || '',
    candleCount: enriched.length,
    regime: {
      type: regimeEval.regime,
      label: regimeEval.label,
      weightHint: getRegimeWeightHint(regimeEval.regime, dmi?.adx),
      adx: dmi?.adx,
    },
    volume,
    kdj,
    macd,
    rsi,
    summary,
  };
}
