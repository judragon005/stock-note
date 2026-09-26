import { describe, it, expect } from 'vitest';
import { getSentimentBadgeMeta } from './MarketSentimentCard';
import type { MarketSentimentData } from '../../../types/aiForceDashboard';

describe('MarketSentimentCard & visual helpers', () => {
  it('應該正確解析三種情緒狀態之色彩與中文標籤', () => {
    const fear = getSentimentBadgeMeta('FEAR', 25);
    expect(fear.label).toContain('恐慌');
    expect(fear.color).toBe('#38bdf8');

    const neutral = getSentimentBadgeMeta('NEUTRAL', 50);
    expect(neutral.label).toContain('中性');
    expect(neutral.color).toBe('#fbbf24');

    const greed = getSentimentBadgeMeta('GREED', 75);
    expect(greed.label).toContain('貪婪');
    expect(greed.color).toBe('#ef4444');
  });

  it('應該完整相容 MarketSentimentData 資料契約', () => {
    const mockData: MarketSentimentData = {
      overallSentimentIndex: 50,
      sentimentState: 'NEUTRAL',
      retailSentimentPercent: 59,
      institutionalSentimentPercent: 55,
      mainForceSentimentPercent: 58,
    };
    expect(mockData.overallSentimentIndex).toBe(50);
    expect(mockData.retailSentimentPercent).toBe(59);
    expect(mockData.institutionalSentimentPercent).toBe(55);
    expect(mockData.mainForceSentimentPercent).toBe(58);
  });
});
