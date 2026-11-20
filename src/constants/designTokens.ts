/**
 * designTokens.ts
 * 全域漲跌色彩極性解析與曜石深色卡片設計 Token 單一事實來源 (SSOT)
 * Spec 0240 T08 / Debt 0060 #2 & Debt 0062 #2
 */

import type { CSSProperties } from 'react';
import type { ColorThemeMode, MarketType } from '../types/stock';

export interface DirectionalPalette {
  isInternational: boolean;
  upColor: string;
  downColor: string;
  neutralColor: string;
}

/**
 * 依據色彩主題與市場類型解析漲跌極性色票：
 * - taiwan: 紅漲 (#ef4444) / 綠跌 (#10b981)
 * - international: 綠漲 (#10b981) / 紅跌 (#ef4444)
 */
export function resolveDirectionalPalette(
  colorTheme?: ColorThemeMode,
  market?: MarketType
): DirectionalPalette {
  const isInternational =
    colorTheme === 'international' || (!colorTheme && market === 'US');

  return {
    isInternational,
    upColor: isInternational ? '#10b981' : '#ef4444',
    downColor: isInternational ? '#ef4444' : '#10b981',
    neutralColor: '#94a3b8',
  };
}

export const OBSIDIAN_CARD_BORDER = '1px solid rgba(255, 255, 255, 0.07)';

export const OBSIDIAN_CARD_CONTAINER: Readonly<CSSProperties> = Object.freeze({
  background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 15, 28, 0.92) 100%)',
  borderRadius: '14px',
  border: OBSIDIAN_CARD_BORDER,
  backdropFilter: 'blur(10px)',
  boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(0, 0, 0, 0.35)',
});
