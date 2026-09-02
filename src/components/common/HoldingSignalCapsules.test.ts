import { describe, it, expect } from 'vitest';
import { HoldingSignal } from '../../types/signal';
import {
  getSignalCapsuleStyle,
  formatSignalTooltip,
  sortHoldingSignals,
} from './HoldingSignalCapsules';

describe('HoldingSignalCapsules (持股警示膠囊輔助邏輯與渲染測試)', () => {
  describe('getSignalCapsuleStyle (多維膠囊色彩階梯)', () => {
    it('BULLISH 翡翠綠色彩配置正確', () => {
      const style = getSignalCapsuleStyle('BULLISH');
      expect(style.color).toBe('#34d399');
      expect(style.background).toContain('rgba(16, 185, 129');
    });

    it('BEARISH 亮紅色彩配置正確', () => {
      const style = getSignalCapsuleStyle('BEARISH');
      expect(style.color).toBe('#f87171');
      expect(style.background).toContain('rgba(239, 68, 68');
    });

    it('WARNING 琥珀金色彩配置正確', () => {
      const style = getSignalCapsuleStyle('WARNING');
      expect(style.color).toBe('#fbbf24');
      expect(style.background).toContain('rgba(245, 158, 11');
    });

    it('NEUTRAL 沉穩藍紫色彩配置正確', () => {
      const style = getSignalCapsuleStyle('NEUTRAL');
      expect(style.color).toBe('#818cf8');
      expect(style.background).toContain('rgba(99, 102, 241');
    });
  });

  describe('sortHoldingSignals (膠囊重要性排序)', () => {
    it('應將重要警示 (WARNING/BEARISH/BULLISH) 依權重優先排序', () => {
      const signals: HoldingSignal[] = [
        { id: 'MA_ABOVE_120', label: '半年線之上', category: 'MA_LEVEL', tone: 'NEUTRAL', weight: 1 },
        { id: 'VOL_YESTERDAY_SURGE', label: '昨日量能注意', category: 'VOLUME', tone: 'WARNING', weight: 0 },
        { id: 'PRICE_WEEK_LOW', label: '創單週新低', category: 'PRICE_EXTREME', tone: 'BEARISH', weight: -2 },
        { id: 'KD_K_SURGE_9', label: '9日K大幅拉升', category: 'MOMENTUM', tone: 'BULLISH', weight: 2 },
      ];

      const sorted = sortHoldingSignals(signals);
      // 權重絕對值或重要性高 (絕對值 2) 的排在前面
      const topIds = sorted.slice(0, 2).map((s) => s.id);
      expect(topIds).toContain('KD_K_SURGE_9');
      expect(topIds).toContain('PRICE_WEEK_LOW');
      expect(sorted[sorted.length - 1].weight).toBe(0); // WARNING 權重 0 排在最後
    });
  });

  describe('formatSignalTooltip (Tooltip 文本格式化)', () => {
    it('當有 description 時應優先顯示 description', () => {
      const sig: HoldingSignal = {
        id: 'MA_BELOW_5',
        label: '5日線之下',
        category: 'MA_LEVEL',
        tone: 'BEARISH',
        weight: -1,
        description: '現價 35 低於 5日均線 36.5',
      };
      const text = formatSignalTooltip(sig);
      expect(text).toBe('現價 35 低於 5日均線 36.5');
    });
  });
});
