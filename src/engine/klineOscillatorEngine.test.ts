import { describe, it, expect } from 'vitest';
import type { KlineCandleItem } from '../types/aiForceDashboard';
import {
  enrichCandlesWithOscillators,
  resolveVolumeAnchorCandles,
} from './klineOscillatorEngine';
import { calculateRSI } from './omniIndicatorEngine';

function buildCandles(closes: number[], options?: { volume?: number; lastIntradayZero?: boolean }): KlineCandleItem[] {
  const volume = options?.volume ?? 1000000;
  return closes.map((close, idx) => {
    const day = String(idx + 1).padStart(2, '0');
    const isLast = idx === closes.length - 1;
    const isIntradayZero = Boolean(options?.lastIntradayZero && isLast);
    return {
      date: `2026-01-${day}`,
      open: close,
      high: close + 1,
      low: Math.max(1, close - 1),
      close,
      volume: isIntradayZero ? 0 : volume,
      isIntraday: isIntradayZero,
    };
  });
}

describe('klineOscillatorEngine (擺盪指標 SSOT 測試縫隙)', () => {
  describe('resolveVolumeAnchorCandles', () => {
    it('空陣列應安全回傳空序列且不標記前收定錨', () => {
      const res = resolveVolumeAnchorCandles([]);
      expect(res.effectiveVolumeCandles).toEqual([]);
      expect(res.isVolumeAnchoredToPrevClose).toBe(false);
    });

    it('末筆為未結算盤中零量 K 棒時，應自動退回前一已結算交易日定錨', () => {
      const candles = buildCandles([100, 102, 105], { lastIntradayZero: true });
      const res = resolveVolumeAnchorCandles(candles);

      expect(res.isVolumeAnchoredToPrevClose).toBe(true);
      expect(res.effectiveVolumeCandles).toHaveLength(2);
      expect(res.volumeAnchorDate).toBe('2026-01-02');
      expect(res.droppedIntradayDate).toBe('2026-01-03');
    });

    it('正常收盤或盤中有量 K 棒不應回退', () => {
      const candles = buildCandles([100, 102, 105]);
      const res = resolveVolumeAnchorCandles(candles);

      expect(res.isVolumeAnchoredToPrevClose).toBe(false);
      expect(res.effectiveVolumeCandles).toHaveLength(3);
      expect(res.volumeAnchorDate).toBe('2026-01-03');
    });
  });

  describe('enrichCandlesWithOscillators', () => {
    it('空陣列應回傳空陣列', () => {
      expect(enrichCandlesWithOscillators([])).toEqual([]);
    });

    it('requireMinPeriod: true 應嚴格遵守最低期數 (KDJ>=9, MACD>=26, RSI14>=15, RSI6>=7)', () => {
      const closes = Array.from({ length: 30 }, (_, i) => 100 + (i % 3 === 0 ? 2 : -1) * (i * 0.2 + 1));
      const enriched = enrichCandlesWithOscillators(buildCandles(closes), { requireMinPeriod: true });

      // KDJ: index 7 undefined, index 8 defined
      expect(enriched[7].k).toBeUndefined();
      expect(enriched[8].k).toBeDefined();
      expect(enriched[8].d).toBeDefined();
      expect(enriched[8].j).toBeDefined();

      // RSI6: index 5 undefined, index 6 defined
      expect(enriched[5].rsi6).toBeUndefined();
      expect(enriched[6].rsi6).toBeDefined();

      // RSI14: index 13 undefined, index 14 defined
      expect(enriched[13].rsi).toBeUndefined();
      expect(enriched[14].rsi).toBeDefined();

      // MACD: index 24 undefined, index 25 defined
      expect(enriched[24].dif).toBeUndefined();
      expect(enriched[25].dif).toBeDefined();
      expect(enriched[25].macd).toBeDefined();
      expect(enriched[25].macdHist).toBeDefined();
    });

    it('全平盤無漲跌序列時 Wilder RSI(14) 與 RSI(6) 必回傳 50', () => {
      const flat = Array.from({ length: 20 }, () => 100);
      const enriched = enrichCandlesWithOscillators(buildCandles(flat));
      const last = enriched[enriched.length - 1];

      expect(last.rsi).toBe(50);
      expect(last.rsi6).toBe(50);
    });

    it('連續單邊上漲時 RSI 收斂至 100，連續單邊下跌時 RSI 收斂至 0', () => {
      const rising = Array.from({ length: 20 }, (_, i) => 100 + i * 2);
      const falling = Array.from({ length: 20 }, (_, i) => 200 - i * 2);

      const risingEnriched = enrichCandlesWithOscillators(buildCandles(rising));
      const fallingEnriched = enrichCandlesWithOscillators(buildCandles(falling));
      const risingLast = risingEnriched[risingEnriched.length - 1];
      const fallingLast = fallingEnriched[fallingEnriched.length - 1];

      expect(risingLast.rsi).toBe(100);
      expect(risingLast.rsi6).toBe(100);
      expect(fallingLast.rsi).toBe(0);
      expect(fallingLast.rsi6).toBe(0);
    });

    it('跨引擎口徑等價契約：enrichCandlesWithOscillators 與 omniIndicatorEngine.calculateRSI 偏差為 0.0 (Spec 0249 T02)', () => {
      const closes = [
        44, 44.3, 44.1, 44.5, 43.8, 44.2, 44.6, 44.4, 44.8, 45.1,
        45.0, 45.3, 45.5, 45.2, 45.7, 46.0, 45.6, 46.2, 46.5, 46.1,
      ];
      const enriched = enrichCandlesWithOscillators(buildCandles(closes));
      const oscRsi = enriched[enriched.length - 1].rsi;
      const omniRsi = calculateRSI(closes, 14);

      expect(oscRsi).toBeDefined();
      expect(omniRsi).toBeDefined();
      expect(Number(omniRsi!.toFixed(1))).toBe(oscRsi);
    });
  });
});
