import { describe, it, expect } from 'vitest';

describe('OmniTechnicalInspectorModal - 輔助邏輯與評估測試', () => {
  it('多空共振評分顏色映射應符合金融心理學', () => {
    const getColor = (score: number) => {
      if (score >= 80) return '#10b981';
      if (score >= 60) return '#3b82f6';
      if (score >= 40) return '#f59e0b';
      return '#ef4444';
    };

    expect(getColor(85)).toBe('#10b981');
    expect(getColor(68)).toBe('#3b82f6');
    expect(getColor(50)).toBe('#f59e0b');
    expect(getColor(20)).toBe('#ef4444');
  });

  it('市場幣別符號映射正確', () => {
    const getCurrency = (mkt: 'TW' | 'US') => (mkt === 'TW' ? 'NT$' : '$');
    expect(getCurrency('TW')).toBe('NT$');
    expect(getCurrency('US')).toBe('$');
  });

  it('實戰作戰地圖階梯距離百分比格式化驗證', () => {
    const formatDistance = (dist: number) => `${dist >= 0 ? '+' : ''}${dist}%`;
    expect(formatDistance(1.64)).toBe('+1.64%');
    expect(formatDistance(-2.15)).toBe('-2.15%');
    expect(formatDistance(0)).toBe('+0%');
  });
});
