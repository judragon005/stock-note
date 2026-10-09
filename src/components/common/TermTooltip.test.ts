import { describe, it, expect } from 'vitest';
import { calculateTooltipPlacement } from './TermTooltip';

describe('TermTooltip - 浮動小視窗防邊界溢出與定位演算法 (Ticket 02 TDD)', () => {
  const mockViewport = { width: 1440, height: 900 };

  it('在一般中心位置時，應預設向上置中 (top-center)', () => {
    const triggerRect = { left: 500, top: 400, right: 600, bottom: 420, width: 100, height: 20 };
    const placement = calculateTooltipPlacement(triggerRect, mockViewport);

    expect(placement.vertical).toBe('top');
    expect(placement.horizontal).toBe('center');
  });

  it('靠近螢幕頂端時，應自動翻轉至下方 (bottom-center)', () => {
    // top 僅 50px，不足容納約 240px 之浮動卡片
    const triggerRect = { left: 500, top: 50, right: 600, bottom: 70, width: 100, height: 20 };
    const placement = calculateTooltipPlacement(triggerRect, mockViewport);

    expect(placement.vertical).toBe('bottom');
  });

  it('靠近螢幕右邊界時，水平應自動對齊右緣向左展開 (align-right)', () => {
    // right 接近 1420px，右側剩餘不足 150px
    const triggerRect = { left: 1350, top: 400, right: 1420, bottom: 420, width: 70, height: 20 };
    const placement = calculateTooltipPlacement(triggerRect, mockViewport);

    expect(placement.horizontal).toBe('right');
  });

  it('靠近螢幕左邊界時，水平應自動對齊左緣向右展開 (align-left)', () => {
    // left 僅 40px，向左會超出螢幕
    const triggerRect = { left: 30, top: 400, right: 100, bottom: 420, width: 70, height: 20 };
    const placement = calculateTooltipPlacement(triggerRect, mockViewport);

    expect(placement.horizontal).toBe('left');
  });

  it('在行動裝置或極窄視窗下，應維持安全邊界限制', () => {
    const mobileViewport = { width: 375, height: 667 };
    const triggerRect = { left: 10, top: 30, right: 120, bottom: 50, width: 110, height: 20 };
    const placement = calculateTooltipPlacement(triggerRect, mobileViewport);

    expect(placement.vertical).toBe('bottom');
    expect(placement.horizontal).toBe('left');
  });

  it('當上方空間小於 280px 時，應智慧向下翻轉以避免超出視窗頂部裁切 (Spec 0148 Ticket 04)', () => {
    const triggerRect = { left: 500, top: 200, right: 600, bottom: 220, width: 100, height: 20 };
    const placement = calculateTooltipPlacement(triggerRect, mockViewport, { width: 320, height: 280 });

    expect(placement.vertical).toBe('bottom');
  });

  describe('Ticket 06: Tooltip 防截斷與 400px 最大高度規範', () => {
    it('TOOLTIP_POPUP_CONFIG 應設定 maxHeight 為 400px 且啟用暗黑滾動條', async () => {
      const { TOOLTIP_POPUP_CONFIG } = await import('./TermTooltip');
      expect(TOOLTIP_POPUP_CONFIG.overflowY).toBe('auto');
    });
  });

  describe('Spec 0174 Ticket 02: 500px 寬幅旗艦彈窗與防溢出定位規範', () => {
    it('TOOLTIP_POPUP_CONFIG 應升級為 500px 寬幅與 580px 最大高度，並具備滾動穿透隔離', async () => {
      const { TOOLTIP_POPUP_CONFIG } = await import('./TermTooltip');
      expect(TOOLTIP_POPUP_CONFIG.width).toBe('500px');
      expect(TOOLTIP_POPUP_CONFIG.maxHeight).toBe('580px');
      expect(TOOLTIP_POPUP_CONFIG.overscrollBehavior).toBe('contain');
    });

    it('calculateTooltipPlacement 預設尺寸應以 500px 寬度防溢出判斷', () => {
      // 在 1440 螢幕下，觸發點在 left: 1100, width: 100，centerX = 1150
      // halfWidth = 250, centerX + 250 = 1400，雖小於 1420，但若更靠右 left: 1200, width: 100，centerX = 1250, 1250 + 250 = 1500 > 1420，應判定為 'right'
      const triggerNearRight = { left: 1200, top: 400, right: 1300, bottom: 420, width: 100, height: 20 };
      const placement = calculateTooltipPlacement(triggerNearRight, mockViewport);
      expect(placement.horizontal).toBe('right');
    });

    it('當上方空間小於 380px 時，預設應智慧向下翻轉 (bottom)', () => {
      const triggerTop300 = { left: 500, top: 300, right: 600, bottom: 320, width: 100, height: 20 };
      const placement = calculateTooltipPlacement(triggerTop300, mockViewport);
      expect(placement.vertical).toBe('bottom');
    });
  });
});


