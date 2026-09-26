import { describe, it, expect } from 'vitest';
import {
  estimateMarketSentiment,
  calculateGaugeNeedleAngle,
  type SentimentEngineInput,
} from './marketSentimentEngine';

describe('marketSentimentEngine', () => {
  it('應該在無特殊輸入時回傳基準中性情緒 (50分, NEUTRAL)', () => {
    const result = estimateMarketSentiment({});
    expect(result.overallSentimentIndex).toBe(50);
    expect(result.sentimentState).toBe('NEUTRAL');
    expect(result.retailSentimentPercent).toBe(50);
    expect(result.institutionalSentimentPercent).toBe(50);
    expect(result.mainForceSentimentPercent).toBe(50);
  });

  it('應該在三大法人強烈大買且大漲時輸出貪婪情緒 (GREED)', () => {
    const input: SentimentEngineInput = {
      priceChangePercent: 5.0,
      institutionalNetRatio: 25.0,
      mainForceConcentration: 18.0,
      marginChangeRatio: 10.0,
    };
    const result = estimateMarketSentiment(input);
    expect(result.overallSentimentIndex).toBeGreaterThan(65);
    expect(result.sentimentState).toBe('GREED');
    expect(result.institutionalSentimentPercent).toBeGreaterThan(60);
  });

  it('應該在暴跌重挫且融資斷頭時輸出極端恐慌情緒 (FEAR)', () => {
    const input: SentimentEngineInput = {
      priceChangePercent: -7.0,
      institutionalNetRatio: -30.0,
      mainForceConcentration: -20.0,
      marginChangeRatio: -15.0,
    };
    const result = estimateMarketSentiment(input);
    expect(result.overallSentimentIndex).toBeLessThan(35);
    expect(result.sentimentState).toBe('FEAR');
    expect(result.overallSentimentIndex).toBeGreaterThanOrEqual(0);
  });

  it('應該在數值極端溢位時將各項情緒截斷於 0 至 100 區間', () => {
    const extremeBull = estimateMarketSentiment({
      priceChangePercent: 100,
      institutionalNetRatio: 200,
      mainForceConcentration: 150,
      marginChangeRatio: 100,
    });
    expect(extremeBull.overallSentimentIndex).toBe(100);
    expect(extremeBull.retailSentimentPercent).toBeLessThanOrEqual(100);
    expect(extremeBull.institutionalSentimentPercent).toBeLessThanOrEqual(100);

    const extremeBear = estimateMarketSentiment({
      priceChangePercent: -100,
      institutionalNetRatio: -200,
      mainForceConcentration: -150,
      marginChangeRatio: -100,
    });
    expect(extremeBear.overallSentimentIndex).toBe(0);
    expect(extremeBear.retailSentimentPercent).toBeGreaterThanOrEqual(0);
  });

  it('應該精確計算半圓儀表指針角度 (-90度 至 +90度)', () => {
    expect(calculateGaugeNeedleAngle(0)).toBe(-90);
    expect(calculateGaugeNeedleAngle(50)).toBe(0);
    expect(calculateGaugeNeedleAngle(100)).toBe(90);
    expect(calculateGaugeNeedleAngle(25)).toBe(-45);
    expect(calculateGaugeNeedleAngle(75)).toBe(45);
  });
});
