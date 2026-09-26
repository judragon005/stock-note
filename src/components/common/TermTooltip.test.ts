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
});
