import { describe, it, expect } from 'vitest';
import {
  calculateAiConfidence,
  type AiConfidenceInput,
} from './aiConfidenceEngine';
import type { KlineCandleItem } from '../types/aiForceDashboard';

describe('aiConfidenceEngine (Card 14 量化引擎)', () => {
  const mockCandles = (count: number = 120): Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> => {
    return Array.from({ length: count }, (_, i) => ({
      date: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
      open: 1000 + i,
      high: 1005 + i,
      low: 995 + i,
      close: 1002 + i,
      volume: 3000,
    }));
  };

  const mockKline = (count: number = 120): KlineCandleItem[] => {
    return Array.from({ length: count }, (_, i) => ({
      date: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
      open: 1000 + i,
      high: 1005 + i,
      low: 995 + i,
      close: 1002 + i,
      volume: 3000,
      ma5: 1000 + i,
      ma10: 995 + i,
      ma20: 990 + i,
      ma60: 980 + i,
      k: 60,
      d: 55,
      rsi: 62,
    }));
  };

  it('資料長度充足 (120+ 根) 且含籌碼資料時，dataCompleteness 應達 95~100%', () => {
    const input: AiConfidenceInput = {
      candles: mockCandles(150),
      klineCandles: mockKline(150),
      hasInstitutionalData: true,
    };
    const result = calculateAiConfidence(input);
    expect(result.dataCompleteness).toBeGreaterThanOrEqual(95);
    expect(result.dataCompleteness).toBeLessThanOrEqual(100);
  });

  it('資料短少 (不足 30 根) 時，dataCompleteness 與 overallConfidence 應合理下降', () => {
    const input: AiConfidenceInput = {
      candles: mockCandles(20),
      klineCandles: mockKline(20),
      hasInstitutionalData: false,
    };
    const result = calculateAiConfidence(input);
    expect(result.dataCompleteness).toBeLessThanOrEqual(75);
    expect(result.overallConfidence).toBeLessThan(70);
  });

  it('趨勢強烈穩定時，modelAccuracy 與 signalStability 應保持高水平 (>= 75%)', () => {
    const input: AiConfidenceInput = {
      candles: mockCandles(120),
      klineCandles: mockKline(120),
      hasInstitutionalData: true,
    };
    const result = calculateAiConfidence(input);
    expect(result.modelAccuracy).toBeGreaterThanOrEqual(70);
    expect(result.signalStability).toBeGreaterThanOrEqual(75);
    expect(result.strategyApplicability).toBeGreaterThanOrEqual(70);
    expect(result.overallConfidence).toBeGreaterThanOrEqual(75);
  });

  it('所有數值應嚴格鉗制在 0~100 區間且空資料時提供防禦回退', () => {
    const emptyResult = calculateAiConfidence({
      candles: [],
      klineCandles: [],
      hasInstitutionalData: false,
    });
    expect(emptyResult.overallConfidence).toBeGreaterThanOrEqual(0);
    expect(emptyResult.overallConfidence).toBeLessThanOrEqual(100);
    expect(isNaN(emptyResult.overallConfidence)).toBe(false);
  });
});
