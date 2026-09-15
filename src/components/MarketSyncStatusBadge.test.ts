import { describe, it, expect } from 'vitest';
import {
  MODAL_VIEWPORT_STYLES,
  formatSyncBadgeTooltip,
} from './MarketSyncStatusBadge';

describe('MarketSyncStatusBadge - 盤後同步彈窗視窗防溢出與包含塊隔離規範測試 (Spec 0135)', () => {
  describe('1. 視窗邊界防溢出與樣式約束規範 (MODAL_VIEWPORT_STYLES)', () => {
    it('遮罩外層 Overlay 必須具備 fixed 定位、全面貼齊 inset: 0、高層級 zIndex 以及縱向捲動支援', () => {
      const { overlay } = MODAL_VIEWPORT_STYLES;
      expect(overlay.position).toBe('fixed');
      expect(overlay.inset).toBe(0);
      expect(overlay.zIndex).toBeGreaterThanOrEqual(1000);
      expect(overlay.overflowY).toBe('auto');
      expect(overlay.padding).toContain('24px');
    });

    it('彈窗卡片 Card 必須限制最大高度 (maxHeight <= 90vh) 並支援內部自適應滾動 (overflowY: auto)', () => {
      const { card } = MODAL_VIEWPORT_STYLES;
      expect(card.maxHeight).toContain('90vh');
      expect(card.overflowY).toBe('auto');
      expect(card.margin).toBe('auto');
      expect(card.maxWidth).toBe('520px');
    });
  });

  describe('2. 徽章提示文案 (formatSyncBadgeTooltip)', () => {
    it('無快取時應提示雙市場皆等待排程', () => {
      const tooltip = formatSyncBadgeTooltip(null, null);
      expect(tooltip).toContain('全市場每日盤後排程快取 (Spec 0132)');
      expect(tooltip).toContain('台股 (16:00)：等待排程');
      expect(tooltip).toContain('美股 (08:00)：等待排程');
    });

    it('有快取時應格式化展示日期、時間與總檔數', () => {
      const mockTW = {
        date: '2026-09-15',
        market: 'TW' as const,
        totalSymbols: 2359,
        updatedAt: 1789446264000,
        durationMs: 97900,
        stocks: {},
      };
      const mockUS = {
        date: '2026-09-15',
        market: 'US' as const,
        totalSymbols: 44,
        updatedAt: 1789438652000,
        durationMs: 5100,
        stocks: {},
      };
      const tooltip = formatSyncBadgeTooltip(mockTW, mockUS);
      expect(tooltip).toContain('台股 (16:00)：已同步');
      expect(tooltip).toContain('2359檔');
      expect(tooltip).toContain('美股 (08:00)：已同步');
      expect(tooltip).toContain('44檔');
    });
  });

  describe('3. 視覺對比度與高層級防禦規範', () => {
    it('彈窗卡片背景必須具備高不透明度以避免背景文字干擾閱讀', () => {
      const { card } = MODAL_VIEWPORT_STYLES;
      expect(card.background).toContain('rgba(15, 23, 42');
      expect(card.borderRadius).toBe('16px');
      expect(card.boxShadow).toContain('rgba(0, 0, 0');
    });

    it('遮罩層必須具備半透明黑底與模糊效果 (backdrop-filter: blur)', () => {
      const { overlay } = MODAL_VIEWPORT_STYLES;
      expect(overlay.backgroundColor).toContain('rgba(0, 0, 0');
      expect(overlay.backdropFilter).toBe('blur(8px)');
    });
  });
});

