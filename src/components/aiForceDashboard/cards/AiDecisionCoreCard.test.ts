import { describe, it, expect } from 'vitest';
import {
  getTrendBadgeStyle,
  getRiskBadgeStyle,
  getHealthScoreStyle,
  formatPriceRange,
} from './AiDecisionCoreCard';

describe('AiDecisionCoreCard - 決策核心邏輯與樣式判定規範 (Ticket 06)', () => {
  describe('getTrendBadgeStyle - 趨勢配色判定', () => {
    it('多頭/偏多應呈現偏多綠色或紅色(依台股/美股體系)，預設多頭帶青綠/翡翠色', () => {
      const bull = getTrendBadgeStyle('強烈多頭');
      expect(bull.color).toBe('#10b981');
      expect(bull.bg).toContain('rgba(16, 185, 129');

      const weakBull = getTrendBadgeStyle('中性偏多');
      expect(weakBull.color).toBe('#34d399');
    });

    it('空頭/偏空應呈現警戒紅/橘色', () => {
      const bear = getTrendBadgeStyle('空頭走勢');
      expect(bear.color).toBe('#ef4444');
      expect(bear.bg).toContain('rgba(239, 68, 68');
    });

    it('中性/區間震盪應呈現溫和琥珀黃或藍色', () => {
      const neutral = getTrendBadgeStyle('區間震盪');
      expect(neutral.color).toBe('#fbbf24');
    });
  });

  describe('getRiskBadgeStyle - 隔日沖風險等級與進度判定', () => {
    it('風險大於等於 60% 應判定為高風險 (紅色)', () => {
      const risk = getRiskBadgeStyle(75);
      expect(risk.level).toBe('高');
      expect(risk.color).toBe('#ef4444');
    });

    it('風險介於 40% ~ 59% 應判定為中風險 (黃橘色)', () => {
      const risk = getRiskBadgeStyle(53);
      expect(risk.level).toBe('中');
      expect(risk.color).toBe('#f59e0b');
    });

    it('風險小於 40% 應判定為低風險 (翠綠色)', () => {
      const risk = getRiskBadgeStyle(25);
      expect(risk.level).toBe('低');
      expect(risk.color).toBe('#10b981');
    });
  });

  describe('getHealthScoreStyle - 籌碼健康度量化分級', () => {
    it('分數大於等於 70 為健康優良 (綠色)', () => {
      const health = getHealthScoreStyle(78);
      expect(health.color).toBe('#10b981');
      expect(health.status).toBe('良好');
    });

    it('分數介於 50 ~ 69 為普通 (黃色)', () => {
      const health = getHealthScoreStyle(55);
      expect(health.color).toBe('#fbbf24');
      expect(health.status).toBe('普通');
    });

    it('分數低於 50 為警戒脆弱 (紅色)', () => {
      const health = getHealthScoreStyle(42);
      expect(health.color).toBe('#ef4444');
      expect(health.status).toBe('偏弱');
    });
  });

  describe('formatPriceRange - 支撐與壓力區間格式化', () => {
    it('應正確將兩端價位格式化為含千分位與兩位小數的區間字串', () => {
      const formatted = formatPriceRange([1875.0, 1730.0]);
      expect(formatted).toBe('1,875.00 ~ 1,730.00');
    });

    it('單一價位或兩端相等時，應正確顯示同一價位區間', () => {
      const formatted = formatPriceRange([2490.0, 2490.0]);
      expect(formatted).toBe('2,490.00 ~ 2,490.00');
    });

    it('缺少價位或空值時應安全返回待確認標示', () => {
      const formatted = formatPriceRange(undefined as unknown as [number, number]);
      expect(formatted).toBe('資料計算中');
    });
  });
});
