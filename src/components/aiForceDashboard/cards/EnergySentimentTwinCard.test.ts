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

  describe('Spec 0239 T14: 雙市場隔離、色系主題、歸一化與衍生品完整呈現', () => {
    it('6. 明確指定 market="TW" 時，即使 sentimentData 誤帶 usMacroData 亦不可被劫持為美股視圖', () => {
      const sentimentData: MarketSentimentData = {
        overallSentimentIndex: 42,
        sentimentState: 'NEUTRAL',
        retailSentimentPercent: 45,
        institutionalSentimentPercent: 52,
        mainForceSentimentPercent: 48,
        usMacroData: {
          cnnScore: 78,
          cnnRatingText: 'Extreme Greed',
          vix: 12.1,
          tenYearTreasury: 4.05,
        },
        twMacroData: {
          putCallRatio: 112.4,
          foreignFuturesOi: -28500,
          trustFuturesOi: 15200,
          asOfDateText: '2026-10-20',
        },
      };

      const html = renderToStaticMarkup(
        React.createElement(EnergySentimentTwinCard, {
          sentimentData,
          market: 'TW',
        })
      );

      expect(html).toContain('台股市場情緒');
      expect(html).not.toContain('台股市場合情緒');
      expect(html).not.toContain('美股宏觀情緒');
      expect(html).toContain('P/C 比:');
      expect(html).toContain('112.4%');
      expect(html).toContain('外資期貨未平倉:');
      expect(html).toContain('-28,500 口');
      expect(html).toContain('投信期貨未平倉:');
      expect(html).toContain('+15,200 口');
      expect(html).toContain('2026-10-20');
      // 容器不得有 overflow:hidden 裁切底部衍生品區
      expect(html).not.toMatch(/data-testid="energy-sentiment-twin-card"[^>]*overflow:hidden/);
    });

    it('7. 未傳 market 但同時含 twMacroData 與 usMacroData 且 isUsMarket 為 false 時，不應誤判為美股', () => {
      const sentimentData: MarketSentimentData = {
        overallSentimentIndex: 55,
        sentimentState: 'NEUTRAL',
        retailSentimentPercent: 50,
        institutionalSentimentPercent: 55,
        mainForceSentimentPercent: 52,
        isUsMarket: false,
        usMacroData: { cnnScore: 80 },
        twMacroData: { putCallRatio: 98.5 },
      };

      const html = renderToStaticMarkup(
        React.createElement(EnergySentimentTwinCard, { sentimentData })
      );

      expect(html).toContain('台股市場情緒');
      expect(html).not.toContain('美股宏觀情緒');
    });

    it('8. colorTheme 響應：台股紅多綠空、美股(international)綠多紅空', () => {
      const bullBearData: BullBearEnergyData = {
        bullEnergyPercent: 70,
        bearEnergyPercent: 30,
        bullBearRatio: 1.5,
        bullBearConclusion: '偏多',
        noteText: '(20日紅K量/黑K量)',
      };

      const twHtml = renderToStaticMarkup(
        React.createElement(EnergySentimentTwinCard, {
          bullBearData,
          market: 'TW',
          colorTheme: 'taiwan',
        })
      );
      // 台股多頭為紅色 (#f87171)
      expect(twHtml).toMatch(/color:#f87171[^>]*>[^<]*<svg[\s\S]*?<\/svg> 多頭 70%/);

      const usHtml = renderToStaticMarkup(
        React.createElement(EnergySentimentTwinCard, {
          bullBearData,
          market: 'US',
          colorTheme: 'international',
        })
      );
      // 美股國際色系多頭為綠色 (#34d399)
      expect(usHtml).toMatch(/color:#34d399[^>]*>[^<]*<svg[\s\S]*?<\/svg> 多頭 70%/);
    });

    it('9. bullPercent/bearPercent 超出 100 應自動歸一化防溢位，且非有限 ratio 應安全回退', () => {
      const bullBearData: BullBearEnergyData = {
        bullEnergyPercent: 120,
        bearEnergyPercent: 80,
        bullBearRatio: Number.NaN,
        bullBearConclusion: '均衡',
        noteText: '',
      };

      const html = renderToStaticMarkup(
        React.createElement(EnergySentimentTwinCard, {
          bullBearData,
          market: 'TW',
        })
      );

      expect(html).toContain('多頭 60%');
      expect(html).toContain('空頭 40%');
      expect(html).toContain('width:60%');
      expect(html).toContain('width:40%');
      expect(html).toContain('多空比 1.00');
      expect(html).not.toContain('NaN');
    });

    it('10. 美股雙欄位名相容 (cnnStateText/vixValue/us10yYield)、tenYearTreasury=0 防禦、vix 統一 1 位小數、asOfDateText 與 CNN 動態變色', () => {
      const fearSentiment: MarketSentimentData = {
        overallSentimentIndex: 22,
        sentimentState: 'FEAR',
        retailSentimentPercent: 20,
        institutionalSentimentPercent: 25,
        mainForceSentimentPercent: 22,
        isUsMarket: true,
        usMacroData: {
          cnnScore: 22,
          cnnStateText: '極度恐懼',
          vixValue: 28,
          us10yYield: 0,
          asOfDateText: '2026-10-21',
        },
      };

      const fearHtml = renderToStaticMarkup(
        React.createElement(EnergySentimentTwinCard, {
          sentimentData: fearSentiment,
          market: 'US',
        })
      );

      expect(fearHtml).toContain('CNN 極度恐懼 (22)');
      expect(fearHtml).toContain('28.0');
      expect(fearHtml).toContain('0.00%');
      expect(fearHtml).toContain('2026-10-21');
      expect(fearHtml).toMatch(/color:#f87171[^>]*>CNN 極度恐懼 \(22\)/);

      const greedSentiment: MarketSentimentData = {
        ...fearSentiment,
        overallSentimentIndex: 76,
        sentimentState: 'GREED',
        usMacroData: {
          cnnScore: 76,
          cnnRatingText: 'Greed',
          vix: 14,
          tenYearTreasury: 4.2,
        },
      };

      const greedHtml = renderToStaticMarkup(
        React.createElement(EnergySentimentTwinCard, {
          sentimentData: greedSentiment,
          market: 'US',
        })
      );

      expect(greedHtml).toContain('CNN Greed (76)');
      expect(greedHtml).toContain('14.0');
      expect(greedHtml).toContain('4.20%');
      expect(greedHtml).toMatch(/color:#34d399[^>]*>CNN Greed \(76\)/);
    });
  });
});

