import { describe, it, expect } from 'vitest';
import {
  resolveDirectionalPalette,
  OBSIDIAN_CARD_BORDER,
  OBSIDIAN_CARD_CONTAINER,
} from './designTokens';

describe('T08: designTokens — resolveDirectionalPalette & OBSIDIAN_CARD_CONTAINER', () => {
  it('taiwan 模式應回傳紅漲 (#ef4444) 綠跌 (#10b981)', () => {
    const p = resolveDirectionalPalette('taiwan');
    expect(p.isInternational).toBe(false);
    expect(p.upColor).toBe('#ef4444');
    expect(p.downColor).toBe('#10b981');
    expect(p.neutralColor).toBe('#94a3b8');
  });

  it('international 模式應回傳綠漲 (#10b981) 紅跌 (#ef4444)', () => {
    const p = resolveDirectionalPalette('international');
    expect(p.isInternational).toBe(true);
    expect(p.upColor).toBe('#10b981');
    expect(p.downColor).toBe('#ef4444');
  });

  it('未傳入 colorTheme 時應依 market (US -> 國際, TW -> 台股) 自動推導極性', () => {
    expect(resolveDirectionalPalette(undefined, 'US').upColor).toBe('#10b981');
    expect(resolveDirectionalPalette(undefined, 'TW').upColor).toBe('#ef4444');
  });

  it('應集中匯出曜石卡片容器設計 Token', () => {
    expect(OBSIDIAN_CARD_BORDER).toBe('1px solid rgba(255, 255, 255, 0.07)');
    expect(Object.isFrozen(OBSIDIAN_CARD_CONTAINER)).toBe(true);
    expect(OBSIDIAN_CARD_CONTAINER.border).toBe(OBSIDIAN_CARD_BORDER);
  });
});
