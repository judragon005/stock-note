import { VwapCostStructureData, CostBandTimeNode } from '../types/aiForceDashboard';

export interface CandleVwapInput {
  high: number;
  low: number;
  close: number;
  volume: number;
  date?: string;
}

const BAND_TEMPLATES = [
  { name: '倉儲區', biasLabel: '>5%', color: '#f97316' },
  { name: '套牢區', biasLabel: '-2~-5%', color: '#10b981' },
  { name: '主力成本區', biasLabel: '±2%', color: '#38bdf8' },
  { name: '大量成交區', biasLabel: '±2~5%', color: '#1e40af' },
];

export const DEFAULT_TIME_NODES: CostBandTimeNode[] = [
  { dateLabel: '06/25', inventoryVol: 15, trappedVol: 15, costVol: 15, heavyVol: 10, totalVolume: 55 },
  { dateLabel: '07/10', inventoryVol: 10, trappedVol: 12, costVol: 10, heavyVol: 8, totalVolume: 40 },
  { dateLabel: '08/10', inventoryVol: 18, trappedVol: 16, costVol: 14, heavyVol: 10, totalVolume: 58 },
  { dateLabel: '08/31', inventoryVol: 8, trappedVol: 10, costVol: 12, heavyVol: 10, totalVolume: 40 },
];

/**
 * 依據歷史 K 線計算 20 日 VWAP 與主力成本結構帶及 4 時點堆疊山峰節點 (Spec 0144)
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
        { name: '倉儲區', biasLabel: '>5%', percentage: 38, color: '#f97316' },
        { name: '套牢區', biasLabel: '-2~-5%', percentage: 32, color: '#10b981' },
        { name: '主力成本區', biasLabel: '±2%', percentage: 18, color: '#38bdf8' },
        { name: '大量成交區', biasLabel: '±2~5%', percentage: 12, color: '#1e40af' },
      ],
      timeNodes: DEFAULT_TIME_NODES,
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

  // 3. 劃分四階成本帶持倉分佈權重 (以當前 20 根為主)
  let breakoutVol = 0;
  let trappedVol = 0;
  let costVol = 0;
  let heavyVol = 0;

  recent20.forEach((c) => {
    const tp = (c.high + c.low + c.close) / 3;
    const vol = c.volume > 0 ? c.volume : 1;
    const bias = (tp - mainForceVwap) / mainForceVwap;

    if (bias > 0.05) {
      breakoutVol += vol;
    } else if (bias < -0.02) {
      trappedVol += vol;
    } else if (Math.abs(bias) <= 0.02) {
      costVol += vol;
    } else {
      heavyVol += vol;
    }
  });

  const sumVol = breakoutVol + trappedVol + costVol + heavyVol;

  let pBreakout = 38;
  let pTrapped = 32;
  let pCost = 18;
  let pHeavy = 12;

  if (sumVol > 0) {
    pBreakout = Math.round((breakoutVol / sumVol) * 100);
    pTrapped = Math.round((trappedVol / sumVol) * 100);
    pCost = Math.round((costVol / sumVol) * 100);
    pHeavy = 100 - pBreakout - pTrapped - pCost;

    if (pHeavy < 0) {
      pCost += pHeavy;
      pHeavy = 0;
    }
  }

  const percentages = [pBreakout, pTrapped, pCost, pHeavy];

  const bands = BAND_TEMPLATES.map((tpl, idx) => ({
    name: tpl.name,
    biasLabel: tpl.biasLabel,
    percentage: percentages[idx],
    color: tpl.color,
  }));

  // 4. 計算 4 個代表性時點的成本帶成交量山峰節點 (Spec 0144)
  const n = candles.length;
  let timeNodes: CostBandTimeNode[] = DEFAULT_TIME_NODES;

  if (n >= 4) {
    const anchorIndices = [
      Math.min(n - 1, Math.floor(n * 0.15)),
      Math.min(n - 1, Math.floor(n * 0.42)),
      Math.min(n - 1, Math.floor(n * 0.72)),
      n - 1,
    ];

    timeNodes = anchorIndices.map((anchorIdx, i) => {
      const windowCandles = candles.slice(Math.max(0, anchorIdx - 19), anchorIdx + 1);
      let winWeightedPrice = 0;
      let winVolume = 0;
      windowCandles.forEach((c) => {
        const tp = (c.high + c.low + c.close) / 3;
        winWeightedPrice += tp * c.volume;
        winVolume += c.volume;
      });
      const winVwap = winVolume > 0 ? winWeightedPrice / winVolume : windowCandles[windowCandles.length - 1].close;

      let bVol = 0;
      let tVol = 0;
      let cVol = 0;
      let hVol = 0;

      windowCandles.forEach((c) => {
        const tp = (c.high + c.low + c.close) / 3;
        const vol = c.volume > 0 ? c.volume : 1;
        const bias = (tp - winVwap) / (winVwap || 1);
        if (bias > 0.05) bVol += vol;
        else if (bias < -0.02) tVol += vol;
        else if (Math.abs(bias) <= 0.02) cVol += vol;
        else hVol += vol;
      });

      const totalWinVol = bVol + tVol + cVol + hVol || 1;
      // 依比例映射至 0~60k 高度波形，並維持起伏山峰感
      const peakScale = i % 2 === 0 ? 55 : 40;
      const inventory = Math.round((bVol / totalWinVol) * peakScale * 0.35) + 6;
      const trapped = Math.round((tVol / totalWinVol) * peakScale * 0.3) + 7;
      const cost = Math.round((cVol / totalWinVol) * peakScale * 0.25) + 6;
      const heavy = Math.round((hVol / totalWinVol) * peakScale * 0.2) + 5;
      const total = inventory + trapped + cost + heavy;

      const candleDate = candles[anchorIdx]?.date;
      let dateLabel = DEFAULT_TIME_NODES[i].dateLabel;
      if (candleDate && candleDate.includes('-')) {
        const parts = candleDate.split('-');
        if (parts.length >= 3) {
          dateLabel = `${parts[1]}/${parts[2]}`;
        }
      }

      return {
        dateLabel,
        inventoryVol: inventory,
        trappedVol: trapped,
        costVol: cost,
        heavyVol: heavy,
        totalVolume: total,
      };
    });
  }

  return {
    mainForceVwap,
    biasPercent,
    bands,
    timeNodes,
  };
}

