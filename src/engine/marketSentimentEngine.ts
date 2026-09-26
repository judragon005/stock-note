import type { MarketSentimentData } from '../types/aiForceDashboard';

export interface SentimentEngineInput {
  priceChangePercent?: number;
  institutionalNetRatio?: number;
  mainForceConcentration?: number;
  marginChangeRatio?: number;
}

/**
 * 推估台股市場整體情緒與散戶、法人、主力三類參與者情緒指標 (0~100)
 */
export function estimateMarketSentiment(input: SentimentEngineInput = {}): MarketSentimentData {
  const {
    priceChangePercent = 0,
    institutionalNetRatio = 0,
    mainForceConcentration = 0,
    marginChangeRatio = 0,
  } = input;

  const priceImpact = priceChangePercent * 3;
  const instImpact = institutionalNetRatio * 0.8;
  const mainForceImpact = mainForceConcentration * 0.8;
  const marginImpact = marginChangeRatio * 0.6;

  const rawOverall = 50 + priceImpact + instImpact + mainForceImpact + marginImpact;
  const overallSentimentIndex = Math.round(Math.max(0, Math.min(100, rawOverall)));

  let sentimentState: 'FEAR' | 'NEUTRAL' | 'GREED' = 'NEUTRAL';
  if (overallSentimentIndex >= 65) {
    sentimentState = 'GREED';
  } else if (overallSentimentIndex <= 35) {
    sentimentState = 'FEAR';
  }

  const retailSentimentPercent = Math.round(
    Math.max(0, Math.min(100, 50 + marginImpact * 1.5 + priceImpact * 0.8))
  );

  const institutionalSentimentPercent = Math.round(
    Math.max(0, Math.min(100, 50 + instImpact * 1.5))
  );

  const mainForceSentimentPercent = Math.round(
    Math.max(0, Math.min(100, 50 + mainForceImpact * 1.5 + instImpact * 0.5))
  );

  return {
    overallSentimentIndex,
    sentimentState,
    retailSentimentPercent,
    institutionalSentimentPercent,
    mainForceSentimentPercent,
  };
}

/**
 * 計算半圓儀表指針角度 (-90度 至 +90度)
 */
export function calculateGaugeNeedleAngle(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return -90 + (clamped / 100) * 180;
}
