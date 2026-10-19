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

  it('3. Ticket 03: 美股標的 (isUsMarket=true) 應切換標題為美股宏觀情緒 (CNN Fear & Greed / VIX)', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { MarketSentimentCard } = await import('./MarketSentimentCard');

    const usData: MarketSentimentData = {
      overallSentimentIndex: 65,
      sentimentState: 'GREED',
      retailSentimentPercent: 60,
      institutionalSentimentPercent: 65,
      mainForceSentimentPercent: 68,
      isUsMarket: true,
      usMacroData: {
        cnnScore: 65,
        cnnStateText: '貪婪',
        vixValue: 16.8,
        us10yYield: 4.15,
        asOfDateText: '2026-10-16',
      },
    };

    const html = renderToStaticMarkup(React.createElement(MarketSentimentCard, { data: usData }));

    expect(html).toContain('美股宏觀情緒');
    expect(html).not.toContain('台股市場合情緒儀表板');
  });

  it('4. Ticket 03: 美股模式下右側指標應切換為 CNN 恐懼貪婪、VIX 與 10Y 美債殖利率', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { MarketSentimentCard } = await import('./MarketSentimentCard');

    const usData: MarketSentimentData = {
      overallSentimentIndex: 28,
      sentimentState: 'FEAR',
      retailSentimentPercent: 30,
      institutionalSentimentPercent: 35,
      mainForceSentimentPercent: 32,
      isUsMarket: true,
      usMacroData: {
        cnnScore: 28,
        cnnStateText: '恐慌',
        vixValue: 24.5,
        us10yYield: 4.02,
        asOfDateText: '2026-10-16',
      },
    };

    const html = renderToStaticMarkup(React.createElement(MarketSentimentCard, { data: usData }));

    expect(html).toContain('CNN 恐懼貪婪');
    expect(html).toContain('28 分');
    expect(html).toContain('VIX 恐慌指數');
    expect(html).toContain('24.5');
    expect(html).toContain('10Y 美債殖利率');
    expect(html).toContain('4.02%');
  });
});

