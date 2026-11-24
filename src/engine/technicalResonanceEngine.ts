import type { KlineCandleItem } from '../types/aiForceDashboard';
import type { MarketType } from '../types/stock';
import type { MarketRegime } from '../types/omniIndicator';
import { aggregateCandlesToTimeframe, type KlineTimeframe } from './klineAggregationEngine';
import { enrichCandlesWithOscillators, resolveVolumeAnchorCandles } from './klineOscillatorEngine';
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
  summary: {
    bullCount: number;
    bearCount: number;
    neutralCount: number;
    hasConflict: boolean;
    conflictAlert?: string;
    overallTone: ResonancePillarTone;
    overallBadge: string;
    actionAdvice: string;
    invalidationRule: string;
    historicalWinRate: HistoricalWinRateStat;
  };
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
      return `震盪盤整體制${adxText}：MACD 趨勢訊號權重折減 60%，優先依 KDJ / RSI 區間極值操作`;
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

  for (let i = 1; i < windowCandles.length - 5; i++) {
    const prev = windowCandles[i - 1];
    const curr = windowCandles[i];
    if (curr.close <= 0) continue;

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
      const fwd = windowCandles[Math.min(i + 10, windowCandles.length - 1)];
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

/**
 * 體制閘控四維量價動能共鳴解碼引擎 (Spec 0245 T04)
 * 單一純函式整合：盤中零量隔離 × ADX體制門控 × 成交量 / KDJ(含J) / MACD / RSI(6·14) × 250D 條件勝率
 */
export function buildTechnicalResonance(
  input: BuildTechnicalResonanceInput
): TechnicalResonanceReport {
  const timeframe: KlineTimeframe = input.timeframe ?? 'DAY';
  const market: MarketType = input.market ?? 'TW';
  const sorted = [...(input.candles || [])].sort((a, b) => a.date.localeCompare(b.date));
  const enriched = enrichCandlesWithOscillators(sorted, { requireMinPeriod: true });
  const last = enriched[enriched.length - 1];
  const prev = enriched.length >= 2 ? enriched[enriched.length - 2] : undefined;
  const asOfDate = last?.date || '';

  // 1. 市場體制判定 (ADX + 布林帶寬 + 均線排列)
  const highs = enriched.map((c) => c.high);
  const lows = enriched.map((c) => c.low);
  const closes = enriched.map((c) => c.close);
  const dmi = enriched.length >= 16 ? calculateDmiAdx(highs, lows, closes, 14) : undefined;
  const bb = enriched.length >= 20 ? calculateBollingerSqueeze(enriched as any) : undefined;

  let maAlignment: 'BULLISH' | 'BEARISH' | 'ENTANGLED' = 'ENTANGLED';
  if (last && last.ma5 !== undefined && last.ma20 !== undefined && last.ma60 !== undefined) {
    if (last.close > last.ma5 && last.ma5 > last.ma20 && last.ma20 > last.ma60) {
      maAlignment = 'BULLISH';
    } else if (last.close < last.ma5 && last.ma5 < last.ma20 && last.ma20 < last.ma60) {
      maAlignment = 'BEARISH';
    }
  }

  const regimeEval = evaluateMarketRegime({
    adx: dmi?.adx,
    pdi: dmi?.pdi,
    mdi: dmi?.mdi,
    bandwidthPercent: bb?.bandwidth,
    maAlignment,
  });

  // 2. 成交量診斷 (含盤中零量隔離與台美單位換算)
  const volAnchor = resolveVolumeAnchorCandles(enriched);
  const effVolCandles = volAnchor.effectiveVolumeCandles;
  const volLast = effVolCandles[effVolCandles.length - 1];
  const volUnit: '張' | '股' = market === 'US' ? '股' : '張';
  const rawLatestVol = volLast?.volume ?? 0;
  const volumeDisplay = market === 'TW' ? Math.round(rawLatestVol / 1000) : Math.round(rawLatestVol);

  const avgVol = (period: number): number | undefined => {
    if (effVolCandles.length < period) return undefined;
    const slice = effVolCandles.slice(-period);
    const sum = slice.reduce((acc, c) => acc + c.volume, 0);
    return sum / period;
  };

  const avg5 = avgVol(5);
  const avg20 = avgVol(Math.min(20, effVolCandles.length));
  const volRatio5 = avg5 && avg5 > 0 ? Number((rawLatestVol / avg5).toFixed(2)) : undefined;
  const volRatio20 = avg20 && avg20 > 0 ? Number((rawLatestVol / avg20).toFixed(2)) : undefined;
  const obvRes = calculateOBV(
    effVolCandles.map((c) => c.close),
    effVolCandles.map((c) => c.volume)
  );

  let volStatus = '量能常態換手';
  let volTone: ResonancePillarTone = 'NEUTRAL';
  let volInterp = '量價結構平穩，尚未出現明顯爆量攻擊或窒息急凍訊號。';

  if (effVolCandles.length < 2) {
    volStatus = '量能樣本累積中';
    volInterp = '有效交易日數不足，待收盤量能累積後判讀。';
  } else if (volLast) {
    const isBullCandle = volLast.close >= volLast.open;
    const body = Math.abs(volLast.close - volLast.open);
    const upperShadow = volLast.high - Math.max(volLast.open, volLast.close);
    const isLongUpperShadow = upperShadow > Math.max(body * 1.5, volLast.close * 0.015);

    if (volRatio5 !== undefined && volRatio5 >= 1.8) {
      if (isLongUpperShadow) {
        volStatus = '爆量滯漲警戒';
        volTone = 'WARN';
        volInterp = `量比達 ${volRatio5}x 且留長上影線，高檔換手遇壓慎防出貨。`;
      } else if (isBullCandle) {
        volStatus = '攻擊放量表態';
        volTone = 'BULL';
        volInterp = `收紅且量能達 5 日均量 ${volRatio5}x，OBV 呈${obvRes.trend === 'RISING' ? '上升' : '震盪'}，買盤積極進駐。`;
      } else {
        volStatus = '放量下殺賣壓';
        volTone = 'BEAR';
        volInterp = `收黑且放量達 ${volRatio5}x 均量，短線停損與調節賣壓湧現。`;
      }
    } else if (volRatio20 !== undefined && volRatio20 <= 0.4) {
      volStatus = '窒息量縮變盤';
      volTone = 'WARN';
      volInterp = `量能急凍至 20 日均量 ${Math.round(volRatio20 * 100)}%，籌碼沉澱待方向表態。`;
    } else if (isBullCandle && volRatio5 !== undefined && volRatio5 < 0.75 && obvRes.trend === 'FALLING') {
      volStatus = '價漲量縮背離';
      volTone = 'WARN';
      volInterp = `反彈量比僅 ${volRatio5}x 且 OBV 走低，追價意願不足慎防折返。`;
    } else if (obvRes.trend === 'RISING' && isBullCandle) {
      volStatus = '溫和量增偏多';
      volTone = 'BULL';
      volInterp = `量比 ${volRatio5 ?? '-'}x 配合 OBV 能量潮推升，量價配合健康。`;
    } else if (obvRes.trend === 'FALLING' && !isBullCandle) {
      volStatus = '資金流出偏空';
      volTone = 'BEAR';
      volInterp = `OBV 能量潮持續走低，空方主導籌碼派發結構。`;
    }
  }

  const volumePillar: VolumePillarDiagnosis = {
    isAvailable: effVolCandles.length >= 2,
    isVolumeAnchoredToPrevClose: volAnchor.isVolumeAnchoredToPrevClose,
    anchorDate: volAnchor.volumeAnchorDate,
    volumeDisplay,
    volumeUnit: volUnit,
    volRatio5,
    volRatio20,
    obvTrend: obvRes.trend,
    statusLabel: volStatus,
    tone: volTone,
    interpretation: volInterp,
  };

  // 3. KDJ (9,3,3 含 J 值與日/週共振)
  const kdjAvailable = last?.k !== undefined && last?.d !== undefined && last?.j !== undefined;
  let kdjStatus = '樣本累積中';
  let kdjTone: ResonancePillarTone = 'NEUTRAL';
  let kdjInterp = '尚需至少 9 期 K 棒以建立有效 KDJ 擺盪指標。';
  let weeklyResonanceLabel: string | undefined = undefined;

  if (kdjAvailable && last) {
    const k = last.k!;
    const d = last.d!;
    const j = last.j!;
    const pk = prev?.k;
    const pd = prev?.d;

    if (timeframe === 'DAY' && (input.dailyCandles?.length ?? 0) >= 45) {
      const weeklyAgg = enrichCandlesWithOscillators(
        aggregateCandlesToTimeframe(input.dailyCandles, 'WEEK'),
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

    if (k >= 80 && d >= 80) {
      kdjStatus = j > 100 ? '高檔鈍化·J超買' : '高檔強勢鈍化';
      kdjTone = regimeEval.regime === 'TRENDING_BULL' ? 'BULL' : 'WARN';
      kdjInterp =
        regimeEval.regime === 'TRENDING_BULL'
          ? `K=${k}、D=${d}、J=${j} 強勢鈍化軋空，主升段勿憑超買逆勢放空。`
          : `K=${k}、J=${j} 進入高檔過熱區，盤整格局慎防短線回檔。`;
    } else if (k <= 20 && d <= 20) {
      kdjStatus = j < 0 ? '極端超賣·J負值' : '低檔超賣鈍化';
      kdjTone = regimeEval.regime === 'TRENDING_BEAR' ? 'BEAR' : 'WARN';
      kdjInterp =
        regimeEval.regime === 'TRENDING_BEAR'
          ? `K=${k}、J=${j} 處低檔鈍化，空頭主跌段須待 K 線上穿 D 線再觀察止跌。`
          : `J 值下探 ${j} 進入極端超賣區，醞釀短線技術反抽契機。`;
    } else if (pk !== undefined && pd !== undefined && pk < pd && k >= d) {
      kdjStatus = k <= 40 ? '低檔黃金交叉' : '中檔黃金交叉';
      kdjTone = 'BULL';
      kdjInterp = `K(${k}) 上穿 D(${d})、J=${j} 轉強，短線多方動能啟動。`;
    } else if (pk !== undefined && pd !== undefined && pk >= pd && k < d) {
      kdjStatus = '死亡交叉轉弱';
      kdjTone = 'BEAR';
      kdjInterp = `K(${k}) 跌破 D(${d})、J=${j} 下彎，短線動能轉弱宜嚴守紀律。`;
    } else if (k >= d) {
      kdjStatus = '多方發散續強';
      kdjTone = 'BULL';
      kdjInterp = `K(${k}) 維持於 D(${d}) 之上，短線擺盪動能偏多。`;
    } else {
      kdjStatus = '空方收斂修正';
      kdjTone = 'BEAR';
      kdjInterp = `K(${k}) 低於 D(${d})，短線動能偏弱整理中。`;
    }
  }

  const kdjPillar: KdjPillarDiagnosis = {
    isAvailable: kdjAvailable,
    k: last?.k,
    d: last?.d,
    j: last?.j,
    weeklyResonanceLabel,
    statusLabel: kdjStatus,
    tone: kdjTone,
    interpretation: kdjInterp,
  };

  // 4. MACD (12,26,9 含零軸位階、連擴/連縮與頂底背離)
  const macdAvailable = last?.dif !== undefined && last?.macd !== undefined && last?.macdHist !== undefined;
  let macdStatus = '樣本累積中';
  let macdTone: ResonancePillarTone = 'NEUTRAL';
  let macdInterp = '尚需至少 26 期 K 棒以建立有效 MACD 趨勢指標。';
  let zeroAxisPosition: 'ABOVE' | 'BELOW' | 'NEAR' = 'NEAR';
  let histStreakDays = 0;
  let macdDiv: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';

  if (macdAvailable && last) {
    const dif = last.dif!;
    const hist = last.macdHist!;
    const prevHist = prev?.macdHist;
    const zeroThreshold = Math.max(0.05, last.close * 0.002);
    zeroAxisPosition = dif > zeroThreshold ? 'ABOVE' : dif < -zeroThreshold ? 'BELOW' : 'NEAR';

    // 計算同號柱體連續天數
    const sign = hist >= 0 ? 1 : -1;
    for (let i = enriched.length - 1; i >= 0; i--) {
      const h = enriched[i].macdHist;
      if (h === undefined) break;
      if ((sign > 0 && h >= 0) || (sign < 0 && h < 0)) histStreakDays++;
      else break;
    }

    // 頂底背離偵測
    const macdValidSlice = enriched.filter((c) => c.dif !== undefined).slice(-30);
    if (macdValidSlice.length >= 10) {
      const divRes = detectDivergence(
        macdValidSlice.map((c) => c.close),
        macdValidSlice.map((c) => c.dif!)
      );
      if (divRes.hasBearishDivergence) macdDiv = 'BEARISH';
      else if (divRes.hasBullishDivergence) macdDiv = 'BULLISH';
    }

    const isExpanding = prevHist !== undefined ? Math.abs(hist) >= Math.abs(prevHist) : true;
    if (macdDiv === 'BEARISH') {
      macdStatus = '頂背離警戒';
      macdTone = 'WARN';
      macdInterp = `股價創高但 DIF(${dif}) 未同步創高，波段多頭動能衰竭警訊。`;
    } else if (macdDiv === 'BULLISH') {
      macdStatus = '底背離築底';
      macdTone = 'BULL';
      macdInterp = `股價破底但 DIF(${dif}) 率先抬頭，空方力竭醞釀轉折。`;
    } else if (hist >= 0) {
      macdStatus =
        zeroAxisPosition === 'ABOVE'
          ? isExpanding
            ? '零軸上紅柱擴張'
            : '零軸上紅柱收斂'
          : '零軸下翻紅反彈';
      macdTone = zeroAxisPosition === 'ABOVE' ? 'BULL' : 'NEUTRAL';
      macdInterp =
        zeroAxisPosition === 'ABOVE'
          ? `DIF(${dif}) 站穩零軸上方，紅柱連續第 ${histStreakDays} 期，波段多頭主導。`
          : `柱體翻紅但 DIF(${dif}) 仍處零軸之下，暫定調為空頭格局反彈。`;
    } else {
      macdStatus = isExpanding ? '綠柱擴張偏空' : '綠柱收斂減壓';
      macdTone = isExpanding ? 'BEAR' : 'WARN';
      macdInterp = isExpanding
        ? `綠柱擴大（連續第 ${histStreakDays} 期），空方趨勢加速度仍在延續。`
        : `綠柱連縮、空方動能趨緩，留意柱體翻紅轉折點。`;
    }
  }

  const macdPillar: MacdPillarDiagnosis = {
    isAvailable: macdAvailable,
    dif: last?.dif,
    dea: last?.macd,
    hist: last?.macdHist,
    histStreakDays,
    zeroAxisPosition,
    divergence: macdDiv,
    statusLabel: macdStatus,
    tone: macdTone,
    interpretation: macdInterp,
  };

  // 5. RSI (14 & 6 快慢線交叉與頂底背離)
  const rsiAvailable = last?.rsi !== undefined;
  let rsiStatus = '樣本累積中';
  let rsiTone: ResonancePillarTone = 'NEUTRAL';
  let rsiInterp = '尚需至少 15 期 K 棒以建立有效 Wilder RSI(14)。';
  let crossState: 'BULL_CROSS' | 'BEAR_CROSS' | 'NEUTRAL' = 'NEUTRAL';
  let rsiDiv: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';

  if (rsiAvailable && last) {
    const r14 = last.rsi!;
    const r6 = last.rsi6;
    const pr14 = prev?.rsi;
    const pr6 = prev?.rsi6;

    if (r6 !== undefined && pr6 !== undefined && pr14 !== undefined) {
      if (pr6 < pr14 && r6 >= r14) crossState = 'BULL_CROSS';
      else if (pr6 >= pr14 && r6 < r14) crossState = 'BEAR_CROSS';
    }

    const rsiValidSlice = enriched.filter((c) => c.rsi !== undefined).slice(-30);
    if (rsiValidSlice.length >= 10) {
      const divRes = detectDivergence(
        rsiValidSlice.map((c) => c.close),
        rsiValidSlice.map((c) => c.rsi!)
      );
      if (divRes.hasBearishDivergence) rsiDiv = 'BEARISH';
      else if (divRes.hasBullishDivergence) rsiDiv = 'BULLISH';
    }

    if (rsiDiv === 'BEARISH') {
      rsiStatus = 'RSI 頂背離';
      rsiTone = 'WARN';
      rsiInterp = `RSI14(${r14}) 動能未隨股價創高，高檔追價勝率遞減。`;
    } else if (rsiDiv === 'BULLISH') {
      rsiStatus = 'RSI 底背離';
      rsiTone = 'BULL';
      rsiInterp = `股價探底但 RSI14(${r14}) 墊高，賣壓遞減浮現止跌訊號。`;
    } else if (r14 > 75) {
      rsiStatus = '極端超買過熱';
      rsiTone = 'WARN';
      rsiInterp = `RSI14 達 ${r14} (>75)，短線正乖離偏大，宜移動停利防震盪。`;
    } else if (r14 >= 55) {
      rsiStatus = crossState === 'BULL_CROSS' ? '強勢攻擊·快線上穿' : '多方強勢攻擊區';
      rsiTone = 'BULL';
      rsiInterp = `RSI14(${r14}) 位於 55~75 健康攻擊帶，買盤動能佔優。`;
    } else if (r14 < 30) {
      rsiStatus = '極度超跌反彈區';
      rsiTone = 'WARN';
      rsiInterp = `RSI14 跌破 30 (${r14}) 進入極度超跌帶，靜待快線 RSI6(${r6 ?? '-'}) 翻揚。`;
    } else if (r14 <= 45) {
      rsiStatus = crossState === 'BEAR_CROSS' ? '偏弱修正·快線下穿' : '空方偏弱整理';
      rsiTone = 'BEAR';
      rsiInterp = `RSI14(${r14}) 落於 50 軸下方弱勢區，上檔反壓仍待化解。`;
    } else {
      rsiStatus = '多空平衡拉鋸';
      rsiTone = 'NEUTRAL';
      rsiInterp = `RSI14(${r14}) 處 45~55 中性軸線附近，動能方向待確認。`;
    }
  }

  const rsiPillar: RsiPillarDiagnosis = {
    isAvailable: rsiAvailable,
    rsi14: last?.rsi,
    rsi6: last?.rsi6,
    crossState,
    divergence: rsiDiv,
    statusLabel: rsiStatus,
    tone: rsiTone,
    interpretation: rsiInterp,
  };

  // 6. 四維共鳴與衝突裁決
  const tones = [volumePillar.tone, kdjPillar.tone, macdPillar.tone, rsiPillar.tone];
  const bullCount = tones.filter((t) => t === 'BULL').length;
  const bearCount = tones.filter((t) => t === 'BEAR').length;
  const neutralCount = tones.length - bullCount - bearCount;

  const hasConflict =
    (bullCount >= 1 && bearCount >= 1) ||
    macdDiv === 'BEARISH' ||
    rsiDiv === 'BEARISH' ||
    (volStatus === '價漲量縮背離' && (macdPillar.tone === 'BULL' || kdjPillar.tone === 'BULL'));

  let conflictAlert: string | undefined = undefined;
  if (macdDiv === 'BEARISH' || rsiDiv === 'BEARISH') {
    conflictAlert = '指標衝突警戒：偵測到動能頂背離，股價表象強勢與內在動能出現分裂。';
  } else if (volStatus === '價漲量縮背離') {
    conflictAlert = '量價矛盾警戒：技術指標偏多但量能未跟上，慎防假突破拉回。';
  } else if (bullCount >= 1 && bearCount >= 1) {
    conflictAlert = `多空指標分歧（${bullCount} 多 / ${bearCount} 空）：依「${regimeEval.label}」權重優先順從主導維度，嚴控倉位。`;
  }

  let overallTone: ResonancePillarTone = 'NEUTRAL';
  let overallBadge = `多空拉鋸 (${bullCount}多·${bearCount}空)`;
  let actionAdvice = '四維動能尚未形成單向共振，維持觀察並等待放量突破或均線表態。';

  if (bullCount >= 3 && !hasConflict) {
    overallTone = 'BULL';
    overallBadge = `四維多頭共振 (${bullCount}/4 偏多)`;
    actionAdvice = '量價與擺盪趨勢同步偏多，可順勢持有並沿 5 日線或支撐防線移動停利。';
  } else if (bearCount >= 3) {
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
    overallTone = 'BEAR';
    overallBadge = `偏空整理 (${bearCount}/4 偏空)`;
    actionAdvice = '動能持續修正中，靜待量縮止穩與 K 線黃金交叉確認再評估反彈。';
  }

  const supportPrice = input.keyLevels?.supportLevel;
  const resistancePrice = input.keyLevels?.highResistance;
  const invalidationRule =
    overallTone === 'BULL'
      ? `失效防線：帶量跌破支撐區${supportPrice ? ` (${supportPrice.toFixed(2)})` : ''}或 MACD 翻綠即撤銷偏多假設`
      : `轉強確認：帶量突破壓力區${resistancePrice ? ` (${resistancePrice.toFixed(2)})` : ''}且 MACD 綠柱轉紅始解除空方警戒`;

  const winFocus: 'KD_OVERSOLD_GOLDEN' | 'MACD_FLIP_UP' | 'MACD_FLIP_DOWN' =
    overallTone === 'BEAR'
      ? 'MACD_FLIP_DOWN'
      : regimeEval.regime === 'CHOPPY_RANGE'
        ? 'KD_OVERSOLD_GOLDEN'
        : 'MACD_FLIP_UP';
  const historicalWinRate = computeHistoricalWinRate(enriched, winFocus);

  return {
    timeframe,
    asOfDate,
    candleCount: enriched.length,
    regime: {
      type: regimeEval.regime,
      label: regimeEval.label,
      weightHint: getRegimeWeightHint(regimeEval.regime, dmi?.adx),
      adx: dmi?.adx,
    },
    volume: volumePillar,
    kdj: kdjPillar,
    macd: macdPillar,
    rsi: rsiPillar,
    summary: {
      bullCount,
      bearCount,
      neutralCount,
      hasConflict,
      conflictAlert,
      overallTone,
      overallBadge,
      actionAdvice,
      invalidationRule,
      historicalWinRate,
    },
  };
}
