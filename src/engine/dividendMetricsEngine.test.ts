import { describe, it, expect } from 'vitest';
import {
  calculateYieldOnCost,
  calculatePositionYieldOnCost,
  determineDividendFillStatus,
  formatDividendFillStatusLabel,
  resolveDividendFrequencyMultiplier,
  type DividendFillStatus,
} from './dividendMetricsEngine';

describe('dividendMetricsEngine - YOC (成本殖利率) 與實質填息標籤計算模組', () => {
  describe('calculateYieldOnCost - 單股 YOC (成本殖利率) 計算', () => {
    it('應正確計算正常獲利情境之 YOC 百分比並四捨五入至小數第 2 位', () => {
      // 5 / 100 * 100 = 5%
      expect(calculateYieldOnCost(5, 100)).toBe(5);

      // 3.5 / 42.5 * 100 = 8.235294... -> 8.24%
      expect(calculateYieldOnCost(3.5, 42.5)).toBe(8.24);

      // 10 / 50 * 100 = 20%
      expect(calculateYieldOnCost(10, 50)).toBe(20);
    });

    it('應在平均成本小於等於 0 時安全回傳 0 (防禦零成本或異常數據)', () => {
      expect(calculateYieldOnCost(5, 0)).toBe(0);
      expect(calculateYieldOnCost(5, -50)).toBe(0);
    });

    it('應在每股配息小於等於 0 時回傳 0', () => {
      expect(calculateYieldOnCost(0, 100)).toBe(0);
      expect(calculateYieldOnCost(-2, 100)).toBe(0);
    });

    it('應正確處理極端小數精確度四捨五入', () => {
      // 1.005 / 100 * 100 = 1.005 -> 1.01%
      expect(calculateYieldOnCost(1.005, 100)).toBe(1.01);
      // 1.004 / 100 * 100 = 1.004 -> 1%
      expect(calculateYieldOnCost(1.004, 100)).toBe(1);
    });
  });

  describe('resolveDividendFrequencyMultiplier - 標的配息年化頻率解析 (下沉純函式)', () => {
    it('美股月配息標的 (O, JEPI) 應解析為 12 次年化', () => {
      expect(resolveDividendFrequencyMultiplier('O', 'US')).toBe(12);
      expect(resolveDividendFrequencyMultiplier('JEPI', 'US')).toBe(12);
    });

    it('美股普通股與主流 ETF (AAPL, SPY) 應解析為 4 次年化', () => {
      expect(resolveDividendFrequencyMultiplier('AAPL', 'US')).toBe(4);
      expect(resolveDividendFrequencyMultiplier('SPY', 'US')).toBe(4);
    });

    it('台股月配 (00929) 應解析為 12 次，季配 (2330, 00878) 為 4 次，半年配 (0050) 為 2 次，普通股 (2344) 為 1 次', () => {
      expect(resolveDividendFrequencyMultiplier('00929', 'TW')).toBe(12);
      expect(resolveDividendFrequencyMultiplier('2330', 'TW')).toBe(4);
      expect(resolveDividendFrequencyMultiplier('00878', 'TW')).toBe(4);
      expect(resolveDividendFrequencyMultiplier('0050', 'TW')).toBe(2);
      expect(resolveDividendFrequencyMultiplier('2344', 'TW')).toBe(1);
    });
  });

  describe('calculatePositionYieldOnCost - 部位總成本 YOC 計算', () => {
    it('應依據部位總配息 (毛額 TWD) 與總成本基準 (TWD) 正確計算 YOC %', () => {
      // 25,000 / 500,000 * 100 = 5%
      expect(calculatePositionYieldOnCost(25000, 500000)).toBe(5);

      // 15,300 / 210,000 * 100 = 7.285714... -> 7.29%
      expect(calculatePositionYieldOnCost(15300, 210000)).toBe(7.29);
    });

    it('應在總成本基準小於等於 0 時安全回傳 0', () => {
      expect(calculatePositionYieldOnCost(10000, 0)).toBe(0);
      expect(calculatePositionYieldOnCost(10000, -200000)).toBe(0);
    });

    it('應在總配息小於等於 0 時回傳 0', () => {
      expect(calculatePositionYieldOnCost(0, 500000)).toBe(0);
      expect(calculatePositionYieldOnCost(-5000, 500000)).toBe(0);
    });
  });

  describe('determineDividendFillStatus - 實質填息 / 貼息狀態判斷', () => {
    it('當現價高於除息前收盤基準價時，應判定為 FILLED (實質填息)', () => {
      // 除息前收盤價 = 95 + 5 = 100，現價 105
      const status: DividendFillStatus = determineDividendFillStatus({
        currentPrice: 105,
        exPrice: 95,
        dividendPerShare: 5,
      });
      expect(status).toBe('FILLED');
    });

    it('當現價剛好等於除息前收盤基準價時，應判定為 FILLED (實質填息邊界)', () => {
      // 除息前收盤價 = 95 + 5 = 100，現價 100
      const status = determineDividendFillStatus({
        currentPrice: 100,
        exPrice: 95,
        dividendPerShare: 5,
      });
      expect(status).toBe('FILLED');
    });

    it('當現價低於除息前收盤基準價時，應判定為 UNFILLED (貼息中 / 本金返還)', () => {
      // 除息前基準 100，現價 99.9
      const status = determineDividendFillStatus({
        currentPrice: 99.9,
        exPrice: 95,
        dividendPerShare: 5,
      });
      expect(status).toBe('UNFILLED');

      // 跌破除息後參考價
      const statusDrop = determineDividendFillStatus({
        currentPrice: 90,
        exPrice: 95,
        dividendPerShare: 5,
      });
      expect(statusDrop).toBe('UNFILLED');
    });

    it('應正確抵抗浮點數加法誤差之邊界情況', () => {
      // 99.9 + 0.1 容易產生 99.99999999999999 浮點誤差
      const status = determineDividendFillStatus({
        currentPrice: 100,
        exPrice: 99.9,
        dividendPerShare: 0.1,
      });
      expect(status).toBe('FILLED');
    });
  });

  describe('formatDividendFillStatusLabel - 填息狀態繁體中文標籤格式化', () => {
    it('應將 FILLED 正確格式化為 "實質填息"', () => {
      expect(formatDividendFillStatusLabel('FILLED')).toBe('實質填息');
    });

    it('應將 UNFILLED 正確格式化為 "貼息中"', () => {
      expect(formatDividendFillStatusLabel('UNFILLED')).toBe('貼息中');
    });

    it('應將 CLOSED_POSITION 正確格式化為 "已結清部位"', () => {
      expect(formatDividendFillStatusLabel('CLOSED_POSITION')).toBe('已結清部位');
    });

    it('應將 PENDING_DATA 正確格式化為 "待補除息價"', () => {
      expect(formatDividendFillStatusLabel('PENDING_DATA')).toBe('待補除息價');
    });
  });

  describe('determineDividendFillStatus - 四態自癒擴充模式 (Ticket 01)', () => {
    it('當持倉已被平倉清空時 (isClosedPosition: true)，應判定為 CLOSED_POSITION', () => {
      const status = determineDividendFillStatus({
        currentPrice: 0,
        exPrice: 95,
        dividendPerShare: 5,
        isClosedPosition: true,
      });
      expect(status).toBe('CLOSED_POSITION');
    });

    it('當缺乏除息價格或價格小於等於 0 時，應判定為 PENDING_DATA', () => {
      const statusNoExPrice = determineDividendFillStatus({
        currentPrice: 100,
        exPrice: 0,
        dividendPerShare: 5,
      });
      expect(statusNoExPrice).toBe('PENDING_DATA');

      const statusNaN = determineDividendFillStatus({
        currentPrice: 100,
        exPrice: undefined as unknown as number,
        dividendPerShare: 5,
      });
      expect(statusNaN).toBe('PENDING_DATA');
    });
  });
});
