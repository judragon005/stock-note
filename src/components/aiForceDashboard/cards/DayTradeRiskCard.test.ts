import { describe, it, expect } from 'vitest';
import {
  getProgressBarStyle,
  getDayTradeRiskBadge,
} from './DayTradeRiskCard';

describe('DayTradeRiskCard - 隔日沖風險進度條元件規範 (Ticket 19)', () => {
  describe('getProgressBarStyle - 風險進度條色彩與長度', () => {
    it('百分比大於等於 60% 應判定為高警戒色 (紅色)', () => {
      const style = getProgressBarStyle(62);
      expect(style.color).toBe('#ef4444');
      expect(style.width).toBe('62%');
    });

    it('百分比介於 40% ~ 59% 應為警示色 (黃橙色)', () => {
      const style = getProgressBarStyle(53);
      expect(style.color).toBe('#f59e0b');
      expect(style.width).toBe('53%');
    });

    it('百分比小於 40% 應為安全色 (翠綠色)', () => {
      const style = getProgressBarStyle(30);
      expect(style.color).toBe('#10b981');
      expect(style.width).toBe('30%');
    });

    it('極端值應安全 clamp 於 0% 到 100% 之間', () => {
      expect(getProgressBarStyle(-15).width).toBe('0%');
      expect(getProgressBarStyle(125).width).toBe('100%');
    });
  });

  describe('getDayTradeRiskBadge - 隔日沖綜合等級徽章', () => {
    it('HIGH 為高、MEDIUM 為中、LOW 為低', () => {
      expect(getDayTradeRiskBadge('HIGH').label).toBe('高');
      expect(getDayTradeRiskBadge('HIGH').color).toBe('#ef4444');

      expect(getDayTradeRiskBadge('MEDIUM').label).toBe('中');
      expect(getDayTradeRiskBadge('MEDIUM').color).toBe('#f59e0b');

      expect(getDayTradeRiskBadge('LOW').label).toBe('低');
      expect(getDayTradeRiskBadge('LOW').color).toBe('#10b981');
    });
  });
});
