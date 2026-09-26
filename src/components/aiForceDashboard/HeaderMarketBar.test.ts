import { describe, it, expect } from 'vitest';
import {
  formatMarketChange,
  getSystemBadgeConfig,
  formatMarketMetric,
} from './HeaderMarketBar';

describe('HeaderMarketBar - 行情 Bar 格式化與狀態燈規範 (Ticket 02)', () => {
  describe('formatMarketChange - 漲跌額與漲幅色彩格式化', () => {
    it('台股模式下，正報酬應顯示帶 "+" 號且標註為上漲色 (#ef4444)', () => {
      const res = formatMarketChange(205.0, 9.83, 'taiwan');
      expect(res.changeText).toBe('+205.00');
      expect(res.percentText).toBe('+9.83%');
      expect(res.color).toBe('#ef4444');
    });

    it('台股模式下，負報酬應顯示 "-" 號且標註為下跌色 (#10b981)', () => {
      const res = formatMarketChange(-15.5, -2.15, 'taiwan');
      expect(res.changeText).toBe('-15.50');
      expect(res.percentText).toBe('-2.15%');
      expect(res.color).toBe('#10b981');
    });

    it('國際/美股模式下，正報酬應標註為綠色 (#10b981)，負報酬為紅色 (#ef4444)', () => {
      const resUp = formatMarketChange(10.0, 1.5, 'international');
      expect(resUp.color).toBe('#10b981');

      const resDown = formatMarketChange(-10.0, -1.5, 'international');
      expect(resDown.color).toBe('#ef4444');
    });

    it('持平時應顯示 "+0.00" 與中性灰白色', () => {
      const res = formatMarketChange(0, 0, 'taiwan');
      expect(res.changeText).toBe('0.00');
      expect(res.percentText).toBe('0.00%');
      expect(res.color).toBe('#94a3b8');
    });
  });

  describe('getSystemBadgeConfig - 4 大狀態指示燈配置', () => {
    it('AI SCAN ACTIVE 啟用時應回傳綠色呼吸燈與 ACTIVE 標記', () => {
      const badge = getSystemBadgeConfig('AI_SCAN', true);
      expect(badge.label).toBe('AI SCAN ACTIVE');
      expect(badge.color).toBe('#10b981');
      expect(badge.dotAnimate).toBe(true);
    });

    it('VOLATILITY ALERT 警戒時應回傳紅色警告色彩', () => {
      const badge = getSystemBadgeConfig('VOLATILITY', true);
      expect(badge.label).toBe('VOLATILITY ALERT');
      expect(badge.color).toBe('#ef4444');
    });

    it('MAIN FORCE TRACKING 啟用時應回傳藍色追蹤徽章', () => {
      const badge = getSystemBadgeConfig('MAIN_FORCE', true);
      expect(badge.label).toBe('MAIN FORCE TRACKING');
      expect(badge.color).toBe('#38bdf8');
    });
  });

  describe('formatMarketMetric - 數值千分位與整數/浮點安全轉換', () => {
    it('應正確將整數與小數加上千分位', () => {
      expect(formatMarketMetric(2290, 2)).toBe('2,290.00');
      expect(formatMarketMetric(2681, 0)).toBe('2,681');
      expect(formatMarketMetric(6260, 0)).toBe('6,260');
    });

    it('無效或 NaN 數值時應回傳 "-" 安全佔位符', () => {
      expect(formatMarketMetric(NaN)).toBe('-');
      expect(formatMarketMetric(undefined)).toBe('-');
    });
  });
});
