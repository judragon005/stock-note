import { describe, it, expect } from 'vitest';
import { getColorThemeLabel, getColorThemeTooltip, formatQuoteUpdateTime } from './Header';

describe('Header 頂部工具列漲跌配色按鈕與 Tooltip 規範測試 (PRD #0071)', () => {
  describe('getColorThemeLabel 標籤文案規範', () => {
    it('台股色彩模式 (taiwan) 應回傳完整對稱標籤 "🔴 紅漲 🟢 綠跌"', () => {
      const label = getColorThemeLabel('taiwan');
      expect(label).toBe('🔴 紅漲 🟢 綠跌');
    });

    it('國際/美股色彩模式 (international) 應回傳完整對稱標籤 "🟢 綠漲 🔴 紅跌"', () => {
      const label = getColorThemeLabel('international');
      expect(label).toBe('🟢 綠漲 🔴 紅跌');
    });
  });

  describe('getColorThemeTooltip 懸浮提示文字規範', () => {
    it('台股色彩模式應提示當前為台股習慣並提示點擊可切換至國際習慣', () => {
      const tooltip = getColorThemeTooltip('taiwan');
      expect(tooltip).toContain('目前模式：台股習慣 (紅漲綠跌)');
      expect(tooltip).toContain('點擊切換為：國際/美股習慣 (綠漲紅跌)');
    });

    it('國際色彩模式應提示當前為國際習慣並提示點擊可切換至台股習慣', () => {
      const tooltip = getColorThemeTooltip('international');
      expect(tooltip).toContain('目前模式：國際/美股習慣 (綠漲紅跌)');
      expect(tooltip).toContain('點擊切換為：台股習慣 (紅漲綠跌)');
    });
  });

  describe('formatQuoteUpdateTime 市價更新時間解耦格式化規範 (PRD #0138)', () => {
    it('應正確將時戳格式化為 HH:mm:ss', () => {
      const timestamp = new Date('2026-09-24T12:50:21+08:00').getTime();
      const formatted = formatQuoteUpdateTime(timestamp);
      expect(formatted).toBe('12:50:21');
    });

    it('時戳為 null 或 undefined 時應回傳空字串', () => {
      expect(formatQuoteUpdateTime(null)).toBe('');
      expect(formatQuoteUpdateTime(undefined)).toBe('');
    });
  });
});

