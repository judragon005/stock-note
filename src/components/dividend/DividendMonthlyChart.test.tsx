import { describe, it, expect } from 'vitest';
import { calculateMonthTooltipAlign } from './DividendMonthlyChart';

describe('DividendMonthlyChart (月度配息長條圖)', () => {
  describe('calculateMonthTooltipAlign (智慧避讓演算法)', () => {
    it('1~2 月 (索引 0~1) 應靠左展開，避免被卡片左邊界截斷', () => {
      expect(calculateMonthTooltipAlign(0)).toBe('left');
      expect(calculateMonthTooltipAlign(1)).toBe('left');
    });

    it('3~9 月 (索引 2~8) 應居中展開', () => {
      expect(calculateMonthTooltipAlign(2)).toBe('center');
      expect(calculateMonthTooltipAlign(5)).toBe('center');
      expect(calculateMonthTooltipAlign(8)).toBe('center');
    });

    it('10~12 月 (索引 9~11) 應靠右展開向左延伸，避免超出卡片右邊界', () => {
      expect(calculateMonthTooltipAlign(9)).toBe('right');
      expect(calculateMonthTooltipAlign(10)).toBe('right');
      expect(calculateMonthTooltipAlign(11)).toBe('right');
    });
  });
});
