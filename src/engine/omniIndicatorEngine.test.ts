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
  evaluateMarketRegime,
  calculateKeyLevelClusters,
  detectDivergence,
  detectPriceActionTraps,
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
      const closes = Array.from({ length: 15 }, (_, i) => 99 + i);
      const wr = calculateWilliamsR(highs, lows, closes, 14);
      expect(wr).toBeDefined();
      expect(wr!).toBeGreaterThanOrEqual(-20);
      expect(wr!).toBeLessThanOrEqual(0);
    });
  });

  describe('5. calculateOBV (能量潮指標)', () => {
    it('價格上漲加成交量，價格下跌扣成交量', () => {
      const closes = [10, 12, 11, 13];
      const volumes = [100, 200, 150, 300];
      const obv = calculateOBV(closes, volumes);
      // Day 0: 100
      // Day 1: 100 + 200 = 300
      // Day 2: 300 - 150 = 150
      // Day 3: 150 + 300 = 450
      expect(obv.current).toBe(450);
      expect(obv.trend).toBe('RISING');
    });
  });

  describe('6. calculateFibonacci & calculatePivotPoints', () => {
    it('費波那契回撤各比例正確產出', () => {
      const fib = calculateFibonacciLevels([100], [0]);
      expect(fib.fib236).toBe(76.4);
      expect(fib.fib382).toBe(61.8);
      expect(fib.fib500).toBe(50.0);
      expect(fib.fib618).toBe(38.2);
    });

    it('經典樞紐點 R1/S1 對稱計算', () => {
      const pivot = calculatePivotPoints(110, 90, 100);
      // P = 300 / 3 = 100
      // R1 = 200 - 90 = 110
      // S1 = 200 - 110 = 90
      expect(pivot.pivot).toBe(100);
      expect(pivot.r1).toBe(110);
      expect(pivot.s1).toBe(90);
    });
  });

  describe('7. 市場狀態機 (evaluateMarketRegime)', () => {
    it('布林帶寬 < 8% 時優先判斷為 VOLATILITY_SQUEEZE (變盤在即)', () => {
      const regime = evaluateMarketRegime({
        adx: 18,
        pdi: 20,
        mdi: 15,
        bandwidthPercent: 6.75,
        maAlignment: 'BULLISH',
      });
      expect(regime.regime).toBe('VOLATILITY_SQUEEZE');
      expect(regime.label).toContain('變盤在即');
    });

    it('ADX < 20 且帶寬正常時，判斷為 CHOPPY_RANGE (無趨勢盤整)', () => {
      const regime = evaluateMarketRegime({
        adx: 5.94,
        pdi: 26.77,
        mdi: 30.38,
        bandwidthPercent: 12.5,
        maAlignment: 'BULLISH',
      });
      expect(regime.regime).toBe('CHOPPY_RANGE');
      expect(regime.label).toContain('無趨勢盤整');
    });

    it('ADX >= 25 且 +DI > -DI 時，判斷為 TRENDING_BULL', () => {
      const regime = evaluateMarketRegime({
        adx: 32,
        pdi: 35,
        mdi: 12,
        bandwidthPercent: 15,
        maAlignment: 'BULLISH',
      });
      expect(regime.regime).toBe('TRENDING_BULL');
    });
  });

  describe('8. 矛盾懲罰與評分校準 (Contradiction Penalty - 解決 95 分盲點)', () => {
    it('實戰案例：均線多頭排列但 ADX=5.94 且 -DI(30.38) > +DI(26.77)，總分絕不超過 58 分且標註矛盾懲罰', () => {
      const confluence = calculateTechnicalConfluence({
        currentPrice: 10.34,
        maAlignment: 'BULLISH',
        isAboveMa20: true,
        isMacdHistPositive: true,
        rsi14: 58,
        kdStatus: 'GOLDEN_CROSS',
        cci20: 30,
        boxStatus: 'INSIDE_BOX',
        isVolumeSurgeBullish: false,
        obvTrend: 'FLAT',
        adx: 5.94,
        pdi: 26.77,
        mdi: 30.38,
        bandwidthPercent: 6.75,
      });

      // 關鍵斷言：絕不盲目給予 95 分高分！
      expect(confluence.score).toBeLessThanOrEqual(58);
      expect(confluence.rating).toBe('NEUTRAL');
      expect(confluence.contradictionPenaltyApplied).toBe(true);
      expect(confluence.marketRegime).toBe('VOLATILITY_SQUEEZE');
      expect(confluence.primarySignals.some((s) => s.includes('矛盾') || s.includes('無趨勢'))).toBe(true);
      expect(confluence.oneSentenceBottomLine).toContain('變盤');
    });

    it('標準強多且有量能、ADX 35 強趨勢時，得分可 >= 80 分 (STRONG_BULL)', () => {
      const confluence = calculateTechnicalConfluence({
        currentPrice: 100,
        maAlignment: 'BULLISH',
        isAboveMa20: true,
        isMacdHistPositive: true,
        rsi14: 68,
        kdStatus: 'GOLDEN_CROSS',
        cci20: 120,
        boxStatus: 'BREAKOUT_UP',
        isVolumeSurgeBullish: true,
        obvTrend: 'RISING',
        adx: 35,
        pdi: 38,
        mdi: 14,
        bandwidthPercent: 16,
      });
      expect(confluence.score).toBeGreaterThanOrEqual(80);
      expect(confluence.rating).toBe('STRONG_BULL');
      expect(confluence.contradictionPenaltyApplied).toBe(false);
    });
  });

  describe('9. 關鍵價位密集聚集演算法 (calculateKeyLevelClusters)', () => {
    it('相距 < 1.5% 之箱頂 (10.51) 與布林上軌 (10.54) 應成功聚合成第一壓力帶', () => {
      const clusters = calculateKeyLevelClusters({
        currentPrice: 10.34,
        darvasBox: { upper: 10.51, lower: 10.06 },
        bollinger: { upper: 10.54, mid: 10.20, lower: 9.86 },
        pivotPoints: { pivot: 10.30, r1: 10.38, r2: 10.80, s1: 10.15, s2: 9.90 },
        fibonacci: { fib236: 10.90, fib382: 10.25, fib500: 9.88, fib618: 9.50 },
        trailingDefensePrice: 9.92,
      });

      expect(clusters.primaryResistance).toBeDefined();
      expect(clusters.primaryResistance!.spanStart).toBeLessThanOrEqual(10.38);
      expect(clusters.primaryResistance!.spanEnd).toBeGreaterThanOrEqual(10.51);
      expect(clusters.primaryResistance!.price).toBeGreaterThanOrEqual(10.40);
      expect(clusters.primaryResistance!.price).toBeLessThanOrEqual(10.55);
      expect(clusters.primaryResistance!.sources.length).toBeGreaterThanOrEqual(2);
      expect(clusters.primaryResistance!.label).toContain('10.5');

      expect(clusters.shortTermDefense).toBeDefined();
      expect(clusters.shortTermDefense!.price).toBeLessThan(10.34);
    });
  });

  describe('10. 背離偵測與價格行為陷阱 (Divergence & Bull Trap)', () => {
    it('價格創新高但 RSI 走低時，偵測到頂背離 (ALERT_BEARISH_DIVERGENCE)', () => {
      // 兩波明確的局部波峰：第一個在 15，第二個在 17 (後有壓回 14)
      const closes = [10, 12, 15, 13, 11, 12, 14, 17, 14];
      const rsis = [40, 55, 80, 60, 50, 55, 65, 70, 55]; // 第二個波峰 70 < 第一個波峰 80
      const div = detectDivergence(closes, rsis);
      expect(div.hasBearishDivergence).toBe(true);
    });

    it('箱頂壓力區出現長上影線墓碑線時，判定為誘多假突破 (Bull Trap)', () => {
      const trap = detectPriceActionTraps({
        open: 10.30,
        high: 10.58, // 衝過箱頂 10.51
        low: 10.28,
        close: 10.34, // 收盤壓回
        resistanceLevel: 10.51,
      });
      expect(trap.hasBullTrap).toBe(true);
      expect(trap.description).toContain('假突破');
    });
  });

  describe('11. 籌碼質變交叉校驗 (Smart Money Confluence)', () => {
    it('技術面偏多但主力連5日大賣超時，應標記籌碼背離警戒', () => {
      const confluence = calculateTechnicalConfluence({
        currentPrice: 50,
        maAlignment: 'BULLISH',
        isAboveMa20: true,
        isMacdHistPositive: true,
        rsi14: 65,
        kdStatus: 'GOLDEN_CROSS',
        cci20: 60,
        boxStatus: 'BREAKOUT_UP',
        isVolumeSurgeBullish: true,
        obvTrend: 'RISING',
        adx: 30,
        pdi: 32,
        mdi: 15,
        chipsContext: {
          institutional5DayNetBuy: -5000, // 主力連日大賣
          majorHoldersDiffPercent: -2.5,
        },
      });

      expect(confluence.chipsContradiction).toBe(true);
      expect(confluence.riskAlert).toContain('籌碼');
    });
  });

  describe('12. computeOmniIndicators 完整綜合產出', () => {
    it('傳入日 K 線數列能完整產生 5 大模組、市場狀態機與實戰階梯矩陣', () => {
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
      expect(report.confluence.marketRegime).toBeDefined();
      expect(report.confluence.actionMatrix.primaryResistanceZone).toBeDefined();
      expect(report.confluence.actionMatrix.shortTermDefenseLine).toBeDefined();
      expect(report.confluence.oneSentenceBottomLine).toBeDefined();
    });
  });
});
