import { describe, it, expect } from 'vitest';
import { getTooltipPositionStyles, getTooltipArrowStyles } from './Tooltip';

describe('Tooltip 定位與箭頭對齊演算法單元測試 (TDD)', () => {
  describe('1. 氣泡本體座標計算 (getTooltipPositionStyles)', () => {
    it('預設 position="top" 且 align="center" 時，應置中於上方', () => {
      const styles = getTooltipPositionStyles('top', 'center');
      expect(styles.bottom).toBe('calc(100% + 8px)');
      expect(styles.left).toBe('50%');
      expect(styles.transform).toBe('translateX(-50%)');
    });

    it('position="bottom" 且 align="right" 時，應靠右並向下展開以防止右側超出', () => {
      const styles = getTooltipPositionStyles('bottom', 'right');
      expect(styles.top).toBe('calc(100% + 8px)');
      expect(styles.right).toBe(0);
      expect(styles.left).toBeUndefined();
      expect(styles.transform).toBeUndefined();
    });

    it('position="bottom" 且 align="left" 時，應靠左並向下展開', () => {
      const styles = getTooltipPositionStyles('bottom', 'left');
      expect(styles.top).toBe('calc(100% + 8px)');
      expect(styles.left).toBe(0);
      expect(styles.right).toBeUndefined();
    });

    it('position="top" 且 align="right" 時，應靠右並向上展開', () => {
      const styles = getTooltipPositionStyles('top', 'right');
      expect(styles.bottom).toBe('calc(100% + 8px)');
      expect(styles.right).toBe(0);
      expect(styles.left).toBeUndefined();
    });

    it('position="left" 與 position="right" 時，應垂直置中', () => {
      const leftStyles = getTooltipPositionStyles('left');
      expect(leftStyles.right).toBe('calc(100% + 8px)');
      expect(leftStyles.top).toBe('50%');
      expect(leftStyles.transform).toBe('translateY(-50%)');

      const rightStyles = getTooltipPositionStyles('right');
      expect(rightStyles.left).toBe('calc(100% + 8px)');
      expect(rightStyles.top).toBe('50%');
      expect(rightStyles.transform).toBe('translateY(-50%)');
    });
  });

  describe('2. 箭頭指示器對齊計算 (getTooltipArrowStyles)', () => {
    it('position="bottom" 且 align="right" 時，箭頭應定位於右上角 right: 8px 且不位移', () => {
      const styles = getTooltipArrowStyles('bottom', 'right');
      expect(styles.top).toBe('-3px');
      expect(styles.right).toBe('8px');
      expect(styles.left).toBe('auto');
      expect(styles.transform).toBe('rotate(45deg)');
    });

    it('position="bottom" 且 align="left" 時，箭頭應定位於左上角 left: 8px', () => {
      const styles = getTooltipArrowStyles('bottom', 'left');
      expect(styles.top).toBe('-3px');
      expect(styles.left).toBe('8px');
      expect(styles.right).toBe('auto');
      expect(styles.transform).toBe('rotate(45deg)');
    });

    it('position="top" 且 align="center" 時，箭頭應水平置中並偏移 translateX(-50%)', () => {
      const styles = getTooltipArrowStyles('top', 'center');
      expect(styles.bottom).toBe('-3px');
      expect(styles.left).toBe('50%');
      expect(styles.right).toBe('auto');
      expect(styles.transform).toBe('translateX(-50%) rotate(45deg)');
    });
  });
});
