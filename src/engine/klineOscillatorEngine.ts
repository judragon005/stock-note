import type { KlineCandleItem } from '../types/aiForceDashboard';

export interface VolumeAnchorResolution {
  effectiveVolumeCandles: KlineCandleItem[];
  isVolumeAnchoredToPrevClose: boolean;
  volumeAnchorDate?: string;
  droppedIntradayDate?: string;
}

/**
 * 盤中零量定錨守衛 (Spec 0245 T03)
 * 當末筆 K 棒屬於未結算盤中參考價且成交量 <= 0 時，量能分析自動退回前一已結算交易日，
 * 徹底杜絕盤中 0 量污染 5D/20D 均量與誤觸「窒息量縮」假警報。
 */
export function resolveVolumeAnchorCandles(candles: KlineCandleItem[] = []): VolumeAnchorResolution {
  if (!candles || candles.length === 0) {
    return {
      effectiveVolumeCandles: [],
      isVolumeAnchoredToPrevClose: false,
    };
  }

  const last = candles[candles.length - 1];
  const isZeroVolumeIntraday =
    Boolean(last.isIntraday) && (!Number.isFinite(last.volume) || last.volume <= 0);

  if (isZeroVolumeIntraday && candles.length >= 2) {
    let endIdx = candles.length - 2;
    while (endIdx > 0 && Boolean(candles[endIdx].isIntraday) && candles[endIdx].volume <= 0) {
      endIdx--;
    }
    const effective = candles.slice(0, endIdx + 1);
    return {
      effectiveVolumeCandles: effective,
      isVolumeAnchoredToPrevClose: true,
      volumeAnchorDate: effective[effective.length - 1]?.date,
      droppedIntradayDate: last.date,
    };
  }

  return {
    effectiveVolumeCandles: candles,
    isVolumeAnchoredToPrevClose: false,
    volumeAnchorDate: last.date,
  };
}

export interface OscillatorEnrichOptions {
  /** 是否嚴格要求達最低指標期數 (KDJ >= 9、MACD >= 26、RSI14 >= 15、RSI6 >= 7) 才輸出數值 */
  requireMinPeriod?: boolean;
}

/**
 * 單趟 O(N) 技術指標序列計算引擎 (Spec 0245 T03)
 * 一次計算整段數列之 KDJ(9,3,3 含 J=3K-2D)、MACD(12,26,9)、Wilder RSI(14) 與 RSI(6)，
 * 取代週/月 K 切換時逐根 slice 的 O(N^2) 開銷。
 */
export function enrichCandlesWithOscillators(
  candles: KlineCandleItem[] = [],
  options: OscillatorEnrichOptions = {}
): KlineCandleItem[] {
  const { requireMinPeriod = true } = options;
  const len = candles.length;
  if (len === 0) return [];

  const kdPeriod = 9;
  const fastMult = 2 / (12 + 1);
  const slowMult = 2 / (26 + 1);
  const sigMult = 2 / (9 + 1);

  let currentK = 50;
  let currentD = 50;

  let emaFast = candles[0].close;
  let emaSlow = candles[0].close;
  let dea = 0;

  // Wilder RSI(14) 狀態
  let sumGain14 = 0;
  let sumLoss14 = 0;
  let avgGain14 = 0;
  let avgLoss14 = 0;

  // Wilder RSI(6) 狀態
  let sumGain6 = 0;
  let sumLoss6 = 0;
  let avgGain6 = 0;
  let avgLoss6 = 0;

  const result: KlineCandleItem[] = new Array(len);

  for (let i = 0; i < len; i++) {
    const c = candles[i];

    // 1. KDJ (9, 3, 3) — 固定 9 根滑動視窗 O(1)
    if (i >= kdPeriod - 1) {
      let highest = -Infinity;
      let lowest = Infinity;
      for (let j = i - kdPeriod + 1; j <= i; j++) {
        if (candles[j].high > highest) highest = candles[j].high;
        if (candles[j].low < lowest) lowest = candles[j].low;
      }
      const rsv = highest === lowest ? 50 : ((c.close - lowest) / (highest - lowest)) * 100;
      currentK = (currentK * 2) / 3 + rsv / 3;
      currentD = (currentD * 2) / 3 + currentK / 3;
    }

    const emitKd = !requireMinPeriod || i >= kdPeriod - 1;
    const kVal = emitKd ? Number(currentK.toFixed(1)) : undefined;
    const dVal = emitKd ? Number(currentD.toFixed(1)) : undefined;
    const jVal = emitKd ? Number((3 * currentK - 2 * currentD).toFixed(1)) : undefined;

    // 2. MACD (12, 26, 9) — 單趟遞迴 O(1)
    if (i > 0) {
      emaFast = c.close * fastMult + emaFast * (1 - fastMult);
      emaSlow = c.close * slowMult + emaSlow * (1 - slowMult);
    }
    const rawDif = emaFast - emaSlow;
    if (i === 0) {
      dea = rawDif;
    } else {
      dea = rawDif * sigMult + dea * (1 - sigMult);
    }
    const rawHist = (rawDif - dea) * 2;
    const emitMacd = !requireMinPeriod || i >= 25;

    // 3. Wilder RSI(14) 與 RSI(6) — 單趟遞迴 O(1)
    let rsi14Val: number | undefined = undefined;
    let rsi6Val: number | undefined = undefined;

    if (i > 0) {
      const diff = c.close - candles[i - 1].close;
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      // RSI 14
      if (i <= 14) {
        sumGain14 += gain;
        sumLoss14 += loss;
        if (i === 14) {
          avgGain14 = sumGain14 / 14;
          avgLoss14 = sumLoss14 / 14;
          rsi14Val =
            avgLoss14 === 0
              ? avgGain14 === 0
                ? 50
                : 100
              : Number((100 - 100 / (1 + avgGain14 / avgLoss14)).toFixed(1));
        }
      } else {
        avgGain14 = (avgGain14 * 13 + gain) / 14;
        avgLoss14 = (avgLoss14 * 13 + loss) / 14;
        rsi14Val =
          avgLoss14 === 0
            ? avgGain14 === 0
              ? 50
              : 100
            : Number((100 - 100 / (1 + avgGain14 / avgLoss14)).toFixed(1));
      }

      // RSI 6
      if (i <= 6) {
        sumGain6 += gain;
        sumLoss6 += loss;
        if (i === 6) {
          avgGain6 = sumGain6 / 6;
          avgLoss6 = sumLoss6 / 6;
          rsi6Val =
            avgLoss6 === 0
              ? avgGain6 === 0
                ? 50
                : 100
              : Number((100 - 100 / (1 + avgGain6 / avgLoss6)).toFixed(1));
        }
      } else {
        avgGain6 = (avgGain6 * 5 + gain) / 6;
        avgLoss6 = (avgLoss6 * 5 + loss) / 6;
        rsi6Val =
          avgLoss6 === 0
            ? avgGain6 === 0
              ? 50
              : 100
            : Number((100 - 100 / (1 + avgGain6 / avgLoss6)).toFixed(1));
      }
    }

    result[i] = {
      ...c,
      k: kVal,
      d: dVal,
      j: jVal,
      dif: emitMacd ? Number(rawDif.toFixed(2)) : undefined,
      macd: emitMacd ? Number(dea.toFixed(2)) : undefined,
      macdHist: emitMacd ? Number(rawHist.toFixed(2)) : undefined,
      rsi: rsi14Val,
      rsi6: rsi6Val,
    };
  }

  return result;
}
