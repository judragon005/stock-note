import { describe, it, expect } from 'vitest';
import {
  calculateRSI,
  calculateDmiAdx,
  calculateCCI,
  calculateWilliamsR,
  calculateOBV,
  calculateFibonacciLevels,
  calculatePivotPoints,
  calculateTechnicalConfluence,
  computeOmniIndicators,
} from './omniIndicatorEngine';
import { DailyCandle } from '../types/indicators';

describe('OmniIndicatorEngine - 純數學量化指標測試縫隙 (Test Seams)', () => {
  describe('1. calculateRSI (Wilder Smoothing)', () => {
    it('資料筆數不足週期時應安全回傳 undefined', () => {
      expect(calculateRSI([10, 11, 12], 14)).toBeUndefined();
    });

    it('連續 14 天單邊飆漲無下跌時，RSI 應收斂至 100', () => {
      const risingCloses = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
      const rsi = calculateRSI(risingCloses, 14);
      expect(rsi).toBe(100);
    });

    it('連續 14 天單邊重挫無上漲時，RSI 應收斂至 0', () => {
      const fallingCloses = [30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15];
      const rsi = calculateRSI(fallingCloses, 14);
      expect(rsi).toBe(0);
    });

    it('漲跌交錯標準數列計算驗證', () => {
      // 模擬交錯走勢
      const closes = [44, 44.3, 44.1, 44.5, 43.8, 44.2, 44.6, 44.4, 44.8, 45.1, 45.0, 45.3, 45.5, 45.2, 45.7, 46.0];
      const rsi = calculateRSI(closes, 14);
      expect(rsi).toBeDefined();
      expect(rsi).toBeGreaterThan(50);
      expect(rsi).toBeLessThan(90);
    });
  });

  describe('2. calculateDmiAdx (趨向指標與 ADX 強度)', () => {
    it('資料不足時應安全回傳 undefined', () => {
      const highs = [10, 11];
      const lows = [9, 10];
      const closes = [9.5, 10.5];
      expect(calculateDmiAdx(highs, lows, closes, 14)).toBeUndefined();
    });

    it('連續強多創新高走勢時，+DI 應顯著大於 -DI 且 ADX 爬升', () => {
      const highs: number[] = [];
      const lows: number[] = [];
      const closes: number[] = [];
      for (let i = 0; i < 30; i++) {
        highs.push(100 + i * 2);
        lows.push(98 + i * 2);
        closes.push(99 + i * 2);
      }
      const res = calculateDmiAdx(highs, lows, closes, 14);
      expect(res).toBeDefined();
      expect(res!.pdi).toBeGreaterThan(res!.mdi);
      expect(res!.trendDirection).toBe('BULLISH');
      expect(res!.adx).toBeGreaterThanOrEqual(25);
    });
  });

  describe('3. calculateCCI (Commodity Channel Index 順勢指標)', () => {
    it('資料不足時應安全回傳 undefined', () => {
      expect(calculateCCI([10], [9], [9.5], 20)).toBeUndefined();
    });

    it('突破創高爆發時，CCI 應大於 100 進入強勢攻擊超買區', () => {
      const highs: number[] = [];
      const lows: number[] = [];
      const closes: number[] = [];
      for (let i = 0; i < 25; i++) {
        const base = 100 + i;
        highs.push(base + 2);
        lows.push(base - 1);
        closes.push(base + 1);
      }
      // 最後一根跳空大暴漲
      highs[highs.length - 1] = 160;
      lows[lows.length - 1] = 140;
      closes[closes.length - 1] = 158;

      const cci = calculateCCI(highs, lows, closes, 20);
      expect(cci).toBeDefined();
      expect(cci!).toBeGreaterThan(100);
    });
  });

  describe('4. calculateWilliamsR (威廉指標 %R)', () => {
    it('收盤價接近區間最高時，%R 應落於 0 到 -20 之間 (超買強軋區)', () => {
      const highs = Array.from({ length: 15 }, (_, i) => 100 + i);
      const lows = Array.from({ length: 15 }, (_, i) => 90 + i);
      const closes = Array.from({ length: 15 }, (_, i) => 99 + i); // 貼近 high
      const wr = calculateWilliamsR(highs, lows, closes, 14);
      expect(wr).toBeDefined();
      expect(wr!).toBeGreaterThanOrEqual(-20);
      expect(wr!).toBeLessThanOrEqual(0);
    });
  });

  describe('5. calculateOBV (On-Balance Volume 能量潮)', () => {
    it('價漲量增時 OBV 累加，價跌時扣減', () => {
      const closes = [10, 12, 11, 13];
      const volumes = [1000, 2000, 1500, 3000];
      // Day 0: OBV = 1000
      // Day 1: Close 12 > 10 => 1000 + 2000 = 3000
      // Day 2: Close 11 < 12 => 3000 - 1500 = 1500
      // Day 3: Close 13 > 11 => 1500 + 3000 = 4500
      const obv = calculateOBV(closes, volumes);
      expect(obv.current).toBe(4500);
      expect(obv.trend).toBe('RISING');
    });
  });

  describe('6. calculateFibonacciLevels & calculatePivotPoints', () => {
    it('精確計算斐波那契回撤各黃金比例', () => {
      const highs = [100, 150, 130];
      const lows = [90, 100, 110];
      const fib = calculateFibonacciLevels(highs, lows);
      expect(fib.high).toBe(150);
      expect(fib.low).toBe(90);
      // Diff = 60
      // Fib 0.618 = 150 - 60 * 0.618 = 112.92
      expect(fib.fib618).toBeCloseTo(112.92, 1);
      // Fib 0.5 = 150 - 30 = 120
      expect(fib.fib500).toBe(120);
    });

    it('精確計算經典樞紐點 (Pivot Points)', () => {
      // H: 105, L: 95, C: 100
      // P = (105 + 95 + 100) / 3 = 100
      // R1 = 2*100 - 95 = 105
      // S1 = 2*100 - 105 = 95
      const p = calculatePivotPoints(105, 95, 100);
      expect(p.pivot).toBe(100);
      expect(p.r1).toBe(105);
      expect(p.s1).toBe(95);
      expect(p.r2).toBe(110);
      expect(p.s2).toBe(90);
    });
  });

  describe('7. calculateTechnicalConfluence (多空共振評分儀)', () => {
    it('多頭共振強勢樣本評分應 >= 80 且評定為 STRONG_BULL', () => {
      const confluence = calculateTechnicalConfluence({
        maAlignment: 'BULLISH',
        isAboveMa20: true,
        isMacdHistPositive: true,
        rsi14: 68,
        kdStatus: 'GOLDEN_CROSS',
        cci20: 120,
        boxStatus: 'BREAKOUT_UP',
        isVolumeSurgeBullish: true,
        obvTrend: 'RISING',
      });
      expect(confluence.score).toBeGreaterThanOrEqual(80);
      expect(confluence.rating).toBe('STRONG_BULL');
      expect(confluence.primarySignals.length).toBeGreaterThan(0);
      expect(confluence.actionAdvice).toContain('多頭');
    });

    it('空頭破線樣本評分應 <= 25 且評定為 STRONG_BEAR', () => {
      const confluence = calculateTechnicalConfluence({
        maAlignment: 'BEARISH',
        isAboveMa20: false,
        isMacdHistPositive: false,
        rsi14: 25,
        kdStatus: 'DEATH_CROSS',
        cci20: -140,
        boxStatus: 'BREAKOUT_DOWN',
        isVolumeSurgeBullish: false,
        obvTrend: 'FALLING',
      });
      expect(confluence.score).toBeLessThanOrEqual(25);
      expect(confluence.rating).toBe('STRONG_BEAR');
      expect(confluence.riskAlert).toBeDefined();
    });
  });

  describe('8. computeOmniIndicators (全指標綜合計算)', () => {
    it('傳入日 K 線數列能完整產生 5 大模組與共振結果', () => {
      const sampleCandles: DailyCandle[] = [];
      const baseDate = new Date('2026-08-01');
      for (let i = 0; i < 70; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);
        const p = 100 + i * 1.5;
        sampleCandles.push({
          date: d.toISOString().split('T')[0],
          open: p - 1,
          high: p + 2,
          low: p - 2,
          close: p,
          volume: 2000 + i * 20,
        });
      }

      const report = computeOmniIndicators({
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        candles: sampleCandles,
        currentPrice: 205,
      });

      expect(report.symbol).toBe('2330');
      expect(report.candleCount).toBe(70);
      expect(report.trend.ma5).toBeDefined();
      expect(report.momentum.rsi14).toBeDefined();
      expect(report.volatility.bollinger.upper).toBeGreaterThan(0);
      expect(report.volumeFlow.yesterdayVolume).toBeGreaterThan(0);
      expect(report.levels.fibonacci.fib618).toBeGreaterThan(0);
      expect(report.confluence.score).toBeGreaterThan(0);
    });
  });
});
