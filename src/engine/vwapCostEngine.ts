import { VwapCostStructureData, CostBandTimeNode } from '../types/aiForceDashboard';

export interface CandleVwapInput {
  high: number;
  low: number;
  close: number;
  volume: number;
  date?: string;
}

const BAND_TEMPLATES = [
  { name: '突破區', biasLabel: '>+5%', color: '#2563eb' },
  { name: '大量成交區', biasLabel: '+2~+5%', color: '#f97316' },
  { name: '主力成本區', biasLabel: '±2%', color: '#10b981' },
  { name: '套牢區', biasLabel: '<-2%', color: '#38bdf8' },
];

// 保留匯出符號以維持相容，但遵循 Spec 0239 Zero-Mock 規範不再提供假日期與假成交量
export const DEFAULT_TIME_NODES: CostBandTimeNode[] = [];

/**
 * 依據歷史 K 線計算 20 日 VWAP 與主力成本結構帶及 4 時點堆疊山峰節點 (Spec 0144 / Spec 0239)
 */
export function calculateVwapCostStructure(
  candles: CandleVwapInput[],
  currentPrice?: number
): VwapCostStructureData {
  if (!candles || candles.length === 0) {
    return {
      mainForceVwap: 0,
      biasPercent: 0,
      bands: [],
      timeNodes: [],
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

  // 3. 劃分四階成本帶持倉分佈權重 (明確區分 >+5% 突破、+2~+5% 大量、±2% 成本、<-2% 套牢)
  let breakoutVol = 0;
  let heavyVol = 0;
  let costVol = 0;
  let trappedVol = 0;

  recent20.forEach((c) => {
    const tp = (c.high + c.low + c.close) / 3;
    const vol = c.volume > 0 ? c.volume : 1;
    const bias = mainForceVwap > 0 ? (tp - mainForceVwap) / mainForceVwap : 0;

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
  const percentages = [0, 0, 0, 0];

  if (sumVol > 0) {
    const vols = [breakoutVol, heavyVol, costVol, trappedVol];
    for (let i = 0; i < vols.length; i++) {
      percentages[i] = Math.round((vols[i] / sumVol) * 100);
    }
    // 以最大佔比桶吸收四捨五入差值，杜絕負溢位並保證總和恆為 100%
    const diff = 100 - percentages.reduce((acc, p) => acc + p, 0);
    if (diff !== 0) {
      let maxIdx = 0;
      for (let i = 1; i < percentages.length; i++) {
        if (percentages[i] > percentages[maxIdx]) maxIdx = i;
      }
      percentages[maxIdx] = Math.max(0, percentages[maxIdx] + diff);
    }
  }

  const bands = BAND_TEMPLATES.map((tpl, idx) => ({
    name: tpl.name,
    biasLabel: tpl.biasLabel,
    percentage: percentages[idx],
    color: tpl.color,
  }));

  // 4. 計算 4 個代表性時點的成本帶成交量山峰節點 (Spec 0144 / Spec 0239 Zero-Mock)
  const n = candles.length;
  let timeNodes: CostBandTimeNode[] = [];

  if (n >= 4) {
    const anchorIndices = [
      Math.min(n - 1, Math.floor(n * 0.15)),
      Math.min(n - 1, Math.floor(n * 0.42)),
      Math.min(n - 1, Math.floor(n * 0.72)),
      n - 1,
    ];

    const rawNodes = anchorIndices.map((anchorIdx) => {
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
        else if (bias > 0.02) hVol += vol;
        else if (bias >= -0.02) cVol += vol;
        else tVol += vol;
      });

      const totalWinVol = bVol + tVol + cVol + hVol;
      const candleDate = candles[anchorIdx]?.date;
      let dateLabel = `D-${n - 1 - anchorIdx}`;
      if (candleDate && candleDate.includes('-')) {
        const parts = candleDate.split('-');
        if (parts.length >= 3) {
          dateLabel = `${parts[1]}/${parts[2]}`;
        }
      }

      return { dateLabel, bVol, tVol, cVol, hVol, totalWinVol };
    });

    const maxTotalWinVol = Math.max(...rawNodes.map((node) => node.totalWinVol), 1);
    const scaleFactor = 1000 / maxTotalWinVol;

    timeNodes = rawNodes.map((node) => {
      const inventory = Math.round(node.bVol * scaleFactor);
      const trapped = Math.round(node.tVol * scaleFactor);
      const cost = Math.round(node.cVol * scaleFactor);
      const heavy = Math.round(node.hVol * scaleFactor);
      const total = Math.max(node.totalWinVol > 0 ? 1 : 0, inventory + trapped + cost + heavy);

      return {
        dateLabel: node.dateLabel,
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
    currentPrice: lastPrice,
    bands,
    timeNodes,
  };
}

