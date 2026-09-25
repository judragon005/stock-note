import { VwapCostStructureData } from '../types/aiForceDashboard';

export interface CandleVwapInput {
  high: number;
  low: number;
  close: number;
  volume: number;
}

const BAND_TEMPLATES = [
  { name: '突破區', biasLabel: '>+5%', color: '#ef4444' },
  { name: '大量成交區', biasLabel: '+2% ~ +5%', color: '#f59e0b' },
  { name: '主力成本區', biasLabel: '-2% ~ +2%', color: '#38bdf8' },
  { name: '套牢區', biasLabel: '<-2%', color: '#10b981' },
];

/**
 * 依據歷史 K 線計算 20 日 VWAP 與主力成本結構帶
 */
export function calculateVwapCostStructure(
  candles: CandleVwapInput[],
  currentPrice?: number
): VwapCostStructureData {
  if (!candles || candles.length === 0) {
    return {
      mainForceVwap: 2131,
      biasPercent: 7.5,
      bands: [
        { name: '突破區', biasLabel: '>+5%', percentage: 38, color: '#ef4444' },
        { name: '大量成交區', biasLabel: '+2% ~ +5%', percentage: 32, color: '#f59e0b' },
        { name: '主力成本區', biasLabel: '-2% ~ +2%', percentage: 18, color: '#38bdf8' },
        { name: '套牢區', biasLabel: '<-2%', percentage: 12, color: '#10b981' },
      ],
    };
  }

  // 1. 取最近 20 根 K 線
  const recent20 = candles.slice(-20);
  let totalWeightedPrice = 0;
  let totalVolume = 0;
  let closeSum = 0;

  recent20.forEach((c) => {
    const tp = (c.high + c.low + c.close) / 3;
    totalWeightedPrice += tp * c.volume;
    totalVolume += c.volume;
    closeSum += c.close;
  });

  // 若總量 > 0 採用 VWAP，否則退回簡單收盤價平均
  let mainForceVwap =
    totalVolume > 0
      ? totalWeightedPrice / totalVolume
      : closeSum / recent20.length;
  mainForceVwap = Number(mainForceVwap.toFixed(2));

  // 2. 計算強弱偏離百分比
  const lastPrice =
    currentPrice !== undefined && currentPrice > 0
      ? currentPrice
      : recent20[recent20.length - 1]?.close ?? mainForceVwap;

  const biasPercent =
    mainForceVwap > 0
      ? Number((((lastPrice - mainForceVwap) / mainForceVwap) * 100).toFixed(1))
      : 0;

  // 3. 劃分四階成本帶持倉分佈權重
  let breakoutVol = 0;
  let heavyVol = 0;
  let costVol = 0;
  let trappedVol = 0;

  recent20.forEach((c) => {
    const tp = (c.high + c.low + c.close) / 3;
    const vol = c.volume > 0 ? c.volume : 1;
    const bias = (tp - mainForceVwap) / mainForceVwap;

    if (bias > 0.05) {
      breakoutVol += vol;
    } else if (bias > 0.02) {
      heavyVol += vol;
    } else if (bias >= -0.02) {
      costVol += vol;
    } else {
      trappedVol += vol;
    }
  });

  const sumVol = breakoutVol + heavyVol + costVol + trappedVol;

  let pBreakout = 38;
  let pHeavy = 32;
  let pCost = 18;
  let pTrapped = 12;

  if (sumVol > 0) {
    pBreakout = Math.round((breakoutVol / sumVol) * 100);
    pHeavy = Math.round((heavyVol / sumVol) * 100);
    pCost = Math.round((costVol / sumVol) * 100);
    pTrapped = 100 - pBreakout - pHeavy - pCost;

    // 防止四捨五入負數
    if (pTrapped < 0) {
      pCost += pTrapped;
      pTrapped = 0;
    }
  }

  const percentages = [pBreakout, pHeavy, pCost, pTrapped];

  const bands = BAND_TEMPLATES.map((tpl, idx) => ({
    name: tpl.name,
    biasLabel: tpl.biasLabel,
    percentage: percentages[idx],
    color: tpl.color,
  }));

  return {
    mainForceVwap,
    biasPercent,
    bands,
  };
}
