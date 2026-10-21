import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  EnergySentimentTwinCard,
  calculateAlphaResonance,
} from './EnergySentimentTwinCard';
import type { BullBearEnergyData, MarketSentimentData } from '../../../types/aiForceDashboard';

describe('EnergySentimentTwinCard & Alpha Resonance - TDD Unit Tests', () => {
  it('1. Alpha 共振計算：個股偏多 + 大盤恐慌 應輸出「逆勢抗跌 (Alpha 領頭羊)」', () => {
    const res = calculateAlphaResonance(1.35, 28);
    expect(res.label).toContain('逆勢抗跌 (Alpha 領頭羊)');
    expect(res.type).toBe('ALPHA_LEADER');
  });

  it('2. Alpha 共振計算：個股偏空 + 大盤貪婪 應輸出「拉指數出個股 (主力背離)」', () => {
    const res = calculateAlphaResonance(0.72, 78);
    expect(res.label).toContain('拉指數出個股 (主力背離)');
    expect(res.type).toBe('DIVERGENCE_RISK');
  });

  it('3. Alpha 共振計算：個股偏多 + 大盤貪婪 應輸出「順風主升 (共振多頭)」', () => {
    const res = calculateAlphaResonance(1.4, 75);
    expect(res.label).toContain('順風主升 (共振多頭)');
    expect(res.type).toBe('BULL_RESONANCE');
  });

  it('4. 雙子容器應正確封裝 Card 10 與 Card 13，並渲染 Alpha 共振標籤與 250px 高度鎖定', () => {
    const bullBearData: BullBearEnergyData = {
      bullEnergyPercent: 60,
      bearEnergyPercent: 40,
      bullBearRatio: 1.52,
      bullBearConclusion: '偏多',
      noteText: '(20日紅K量/黑K量)',
      bullVolume: 12500,
      bearVolume: 8200,
    };

    const sentimentData: MarketSentimentData = {
      overallSentimentIndex: 25,
      sentimentState: 'FEAR',
      retailSentimentPercent: 30,
      institutionalSentimentPercent: 40,
      mainForceSentimentPercent: 35,
    };

    const html = renderToStaticMarkup(
      React.createElement(EnergySentimentTwinCard, {
        bullBearData,
        sentimentData,
        market: 'TW',
      })
    );

    expect(html).toContain('>10 · 13<');
    expect(html).not.toContain('CARD 10 · 13');
    expect(html).toContain('AI多空 × 市場情緒');
    expect(html).toContain('data-testid="energy-sentiment-twin-card"');
    expect(html).toContain('data-testid="alpha-resonance-badge"');
    expect(html).toContain('逆勢抗跌 (Alpha 領頭羊)');
  });

  it('5. 美股模式下應連動 CNN Fear & Greed 情緒數值', () => {
    const bullBearData: BullBearEnergyData = {
      bullEnergyPercent: 50,
      bearEnergyPercent: 50,
      bullBearRatio: 1.0,
      bullBearConclusion: '均衡',
      noteText: '(20日紅K量/黑K量)',
    };

    const sentimentData: MarketSentimentData = {
      overallSentimentIndex: 50,
      sentimentState: 'NEUTRAL',
      retailSentimentPercent: 50,
      institutionalSentimentPercent: 50,
      mainForceSentimentPercent: 50,
      isUsMarket: true,
      usMacroData: {
        cnnScore: 72,
        cnnRatingText: 'Greed',
        vix: 14.8,
        tenYearTreasury: 4.15,
        asOfDateText: '2026-10-16',
      },
    };

    const html = renderToStaticMarkup(
      React.createElement(EnergySentimentTwinCard, {
        bullBearData,
        sentimentData,
        market: 'US',
      })
    );

    expect(html).toContain('CNN Greed (72)');
    expect(html).toContain('VIX:');
    expect(html).toContain('14.8');
    expect(html).toContain('4.15%');
  });
});

