import { describe, it, expect } from 'vitest';
import {
  calculateInstitutionalScore,
  calculateChipsScore,
  calculateTrendScore,
  calculateMomentumScore,
  calculateLiquidityScore,
  calculateVolatilityScore,
  calculateMultiDimensionRadar,
  calculateUsMicrostructureInstitutionalScore,
} from './multiDimensionRadarEngine';
import type { InstitutionalFlowData, KlineCandleItem } from '../types/aiForceDashboard';

describe('multiDimensionRadarEngine (Card 03 量化引擎)', () => {
  const mockCandles = (count: number = 60, basePrice: number = 1000): Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> => {
    return Array.from({ length: count }, (_, i) => {
      const price = basePrice + i * 2;
      return {
        date: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
        open: price - 1,
        high: price + 4,
        low: price - 3,
        close: price,
        volume: 2500 + (i % 5) * 200,
      };
    });
  };

  const mockKlineCandles = (count: number = 60, basePrice: number = 1000): KlineCandleItem[] => {
    return Array.from({ length: count }, (_, i) => {
      const price = basePrice + i * 2;
      return {
        date: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
        open: price - 1,
        high: price + 4,
        low: price - 3,
        close: price,
        volume: 2500 + (i % 5) * 200,
        ma5: price - 1,
        ma10: price - 3,
        ma20: price - 6,
        ma60: price - 15,
        k: 65,
        d: 58,
        rsi: 62,
        dif: 5,
        macd: 3,
        macdHist: 4,
      };
    });
  };

  describe('Ticket 01: 法人與籌碼雙軸量化子函式', () => {
    it('法人軸：當台股近 20 日法人大幅買超且土洋合買時，應獲得 85~95 分高分', () => {
      const flow: InstitutionalFlowData = {
        history: [
          {
            date: '2026-09-25',
            foreignShares: 800,
            trustShares: 300,
            dealerShares: 100,
            cumulativeTotalShares: 2500,
          },
        ],
        recentDaysTable: [],
        cumulative20DaysSummary: '多頭 (+2,500張)',
        recent5DaysSummary: '多頭 (+1,200張)',
      };

      const score = calculateInstitutionalScore(flow, 'TW');
      expect(score).toBeGreaterThanOrEqual(85);
      expect(score).toBeLessThanOrEqual(95);
    });

    it('法人軸：當台股法人持續重度賣超且土洋齊賣時，應獲得 15~35 分低分', () => {
      const flow: InstitutionalFlowData = {
        history: [
          {
            date: '2026-09-25',
            foreignShares: -1200,
            trustShares: -500,
            dealerShares: -200,
            cumulativeTotalShares: -3500,
          },
        ],
        recentDaysTable: [],
        cumulative20DaysSummary: '空頭 (-3,500張)',
        recent5DaysSummary: '空頭 (-1,900張)',
      };

      const score = calculateInstitutionalScore(flow, 'TW');
      expect(score).toBeGreaterThanOrEqual(10);
      expect(score).toBeLessThanOrEqual(35);
    });

    it('法人軸：美股或無三大法人資料時，應優雅降級回傳中性基準 (45~55分)', () => {
      const flow: InstitutionalFlowData = {
        history: [],
        recentDaysTable: [],
        cumulative20DaysSummary: '無法人資料',
        recent5DaysSummary: '無資料',
      };

      const score = calculateInstitutionalScore(flow, 'US');
      expect(score).toBeGreaterThanOrEqual(45);
      expect(score).toBeLessThanOrEqual(55);
    });

    it('籌碼軸：近 5 日合計大買應給予 70~90 分，大賣給予 25~45 分', () => {
      const bullFlow: InstitutionalFlowData = {
        history: [
          { date: '1', foreignShares: 300, trustShares: 100, dealerShares: 50, cumulativeTotalShares: 450 },
          { date: '2', foreignShares: 200, trustShares: 150, dealerShares: 50, cumulativeTotalShares: 850 },
          { date: '3', foreignShares: 400, trustShares: 200, dealerShares: 50, cumulativeTotalShares: 1500 },
        ],
        recentDaysTable: [],
        cumulative20DaysSummary: '',
        recent5DaysSummary: '',
      };
      expect(calculateChipsScore(bullFlow)).toBeGreaterThanOrEqual(70);

      const bearFlow: InstitutionalFlowData = {
        history: [
          { date: '1', foreignShares: -400, trustShares: -200, dealerShares: -50, cumulativeTotalShares: -650 },
          { date: '2', foreignShares: -300, trustShares: -150, dealerShares: -50, cumulativeTotalShares: -1150 },
        ],
        recentDaysTable: [],
        cumulative20DaysSummary: '',
        recent5DaysSummary: '',
      };
      expect(calculateChipsScore(bearFlow)).toBeLessThanOrEqual(40);
    });
  });

  describe('Ticket 02: 趨勢與動能雙軸量化子函式', () => {
    it('趨勢軸：均線四線多頭排列且收盤價站上主力成本時，應獲得 85~95 分高分', () => {
      const kline = mockKlineCandles(60, 1000);
      const last = kline[kline.length - 1];
      const mainForceCost = 980; // 站上主力成本

      const score = calculateTrendScore(last, mainForceCost);
      expect(score).toBeGreaterThanOrEqual(85);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('趨勢軸：均線空頭跌破 MA60 且低於主力成本時，應獲得 20~35 分低分', () => {
      const bearCandle: KlineCandleItem = {
        date: '2026-09-25',
        open: 880,
        high: 885,
        low: 870,
        close: 875,
        volume: 2000,
        ma5: 890,
        ma10: 910,
        ma20: 940,
        ma60: 980, // 遠低於 MA60
      };
      const mainForceCost = 950;

      const score = calculateTrendScore(bearCandle, mainForceCost);
      expect(score).toBeLessThanOrEqual(35);
    });

    it('動能軸：KD 黃金交叉、RSI 位於強勢區且帶量上攻時，動能應顯著大於無量盤整', () => {
      const candles = mockCandles(60, 1000);
      const bullKline = mockKlineCandles(60, 1000);
      const last = bullKline[bullKline.length - 1];
      last.k = 72;
      last.d = 60; // K > D
      last.rsi = 65; // 55~70 強勢區
      candles[candles.length - 1].volume = 5000; // 量放大

      const score = calculateMomentumScore(last, candles);
      expect(score).toBeGreaterThanOrEqual(75);
    });
  });

  describe('Ticket 03: 流動性與波動度雙軸量化子函式', () => {
    it('流動性軸：日均量大於 3,000 張時獲得 85 分以上，小於 300 張則低於 40 分', () => {
      const highVolCandles = mockCandles(20, 1000).map((c) => ({ ...c, volume: 4500 }));
      expect(calculateLiquidityScore(highVolCandles, 'TW')).toBeGreaterThanOrEqual(85);

      const lowVolCandles = mockCandles(20, 1000).map((c) => ({ ...c, volume: 150 }));
      expect(calculateLiquidityScore(lowVolCandles, 'TW')).toBeLessThanOrEqual(40);
    });

    it('波動軸：健康波幅 (1.5%~3.5%) 得分應高於極端暴漲暴跌 (>6%) 與死水盤 (<0.5%)', () => {
      // 1. 健康波幅
      const healthyCandles = mockCandles(20, 1000).map((c, i) => ({
        ...c,
        close: 1000 + (i % 2 === 0 ? 20 : -20), // ~2% 波動
      }));
      const healthyScore = calculateVolatilityScore(healthyCandles);

      // 2. 極端暴走
      const wildCandles = mockCandles(20, 1000).map((c, i) => ({
        ...c,
        close: 1000 + (i % 2 === 0 ? 80 : -80), // ~8% 極端震盪
      }));
      const wildScore = calculateVolatilityScore(wildCandles);

      expect(healthyScore).toBeGreaterThan(wildScore);
      expect(healthyScore).toBeGreaterThanOrEqual(70);
    });
  });

  describe('Ticket 04: 雷達總合成器與等級判定', () => {
    it('多頭強勢股（台積電型態）綜合評分應達 A 級 (>=80) 或 B 級 (>=65)，不再固定為 56 分 C 級', () => {
      const candles = mockCandles(60, 1000);
      const klineCandles = mockKlineCandles(60, 1000);
      const flow: InstitutionalFlowData = {
        history: [
          { date: '1', foreignShares: 1500, trustShares: 500, dealerShares: 200, cumulativeTotalShares: 3200 },
        ],
        recentDaysTable: [],
        cumulative20DaysSummary: '多頭 (+3,200張)',
        recent5DaysSummary: '多頭 (+1,500張)',
      };

      const result = calculateMultiDimensionRadar({
        candles,
        klineCandles,
        mainForceCost: 980,
        institutionalFlow: flow,
        market: 'TW',
      });

      expect(result.overallScore).toBeGreaterThanOrEqual(70);
      expect(['A', 'B']).toContain(result.overallGrade);
      expect(result.dimensions.institutional).toBeGreaterThanOrEqual(80);
      expect(result.dimensions.trend).toBeGreaterThanOrEqual(80);
    });

    it('弱勢破位股綜合評分應顯著低於 50 分且對應 D 級', () => {
      const bearCandles = mockCandles(60, 1000).map((c, i) => ({
        ...c,
        close: 1000 - i * 5,
        volume: 200, // 無量又破底
      }));
      const bearKline = mockKlineCandles(60, 1000).map((c, i) => ({
        ...c,
        close: 1000 - i * 5,
        ma5: 800,
        ma10: 850,
        ma20: 900,
        ma60: 950,
        k: 15,
        d: 25,
        rsi: 22,
      }));
      const bearFlow: InstitutionalFlowData = {
        history: [
          { date: '1', foreignShares: -1500, trustShares: -400, dealerShares: -100, cumulativeTotalShares: -4200 },
        ],
        recentDaysTable: [],
        cumulative20DaysSummary: '空頭 (-4,200張)',
        recent5DaysSummary: '空頭 (-2,000張)',
      };

      const result = calculateMultiDimensionRadar({
        candles: bearCandles,
        klineCandles: bearKline,
        mainForceCost: 920,
        institutionalFlow: bearFlow,
        market: 'TW',
      });

      expect(result.overallScore).toBeLessThan(50);
      expect(result.overallGrade).toBe('D');
    });

    it('資料不足 5 根時應優雅回退，絕不產生 NaN', () => {
      const fallback = calculateMultiDimensionRadar({
        candles: [],
        klineCandles: [],
        mainForceCost: 0,
        institutionalFlow: { history: [], recentDaysTable: [], cumulative20DaysSummary: '', recent5DaysSummary: '' },
        market: 'TW',
      });

      expect(fallback.overallScore).toBe(50);
      expect(fallback.overallGrade).toBe('C');
      expect(isNaN(fallback.dimensions.institutional)).toBe(false);
      expect(isNaN(fallback.dimensions.trend)).toBe(false);
    });
  });

  describe('Ticket 12: 美股微觀量價主力替代演算法 (US Volume Microstructure Quant Engine)', () => {
    it('資料為空或少於 5 根日 K 時，應回傳中性基準 50 分，不產生 NaN', () => {
      expect(calculateUsMicrostructureInstitutionalScore([])).toBe(50);
      expect(calculateUsMicrostructureInstitutionalScore([{ high: 100, low: 90, close: 95, volume: 1000 }])).toBe(50);
    });

    it('多頭格局：股價站上 20D/60D VWAP、MFI > 60、量增價漲且出現爆量紅棒時，分數應達 75 分以上', () => {
      // 模擬 60 根多頭日 K，價格從 100 漲到 160，伴隨放量紅棒
      const bullUsCandles = Array.from({ length: 60 }, (_, i) => {
        const close = 100 + i * 1.0;
        const open = close - 0.5;
        const high = close + 1.0;
        const low = open - 0.5;
        // 近 5 日有爆量長紅棒
        const volume = i >= 55 ? 500_000 : 100_000 + i * 2000;
        return {
          date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
          open,
          high,
          low,
          close,
          volume,
        };
      });

      const score = calculateUsMicrostructureInstitutionalScore(bullUsCandles);
      expect(score).toBeGreaterThanOrEqual(75);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('空頭格局：股價跌破 20D/60D VWAP、MFI < 40、破位放量下跌時，分數應低於 40 分', () => {
      // 模擬 60 根空頭日 K，價格從 150 跌到 90，陰線居多
      const bearUsCandles = Array.from({ length: 60 }, (_, i) => {
        const close = 150 - i * 1.0;
        const open = close + 0.8;
        const high = open + 0.5;
        const low = close - 1.0;
        const volume = 200_000 + (i % 5) * 50_000;
        return {
          date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
          open,
          high,
          low,
          close,
          volume,
        };
      });

      const score = calculateUsMicrostructureInstitutionalScore(bearUsCandles);
      expect(score).toBeLessThanOrEqual(40);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('零量或平盤極端數值防禦：不出現 NaN 且數值嚴格在 0~100 區間', () => {
      const flatCandles = Array.from({ length: 30 }, () => ({
        open: 100,
        high: 100,
        low: 100,
        close: 100,
        volume: 0,
      }));

      const score = calculateUsMicrostructureInstitutionalScore(flatCandles);
      expect(isNaN(score)).toBe(false);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('calculateMultiDimensionRadar 在美股 market=US 時應自動整合微觀量價分數至法人與籌碼軸', () => {
      const bullUsCandles = Array.from({ length: 60 }, (_, i) => {
        const close = 100 + i * 1.0;
        const open = close - 0.5;
        const high = close + 1.0;
        const low = open - 0.5;
        const volume = i >= 55 ? 500_000 : 100_000 + i * 2000;
        return {
          date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
          open,
          high,
          low,
          close,
          volume,
        };
      });

      const klineCandles: KlineCandleItem[] = bullUsCandles.map((c) => ({
        ...c,
        open: c.open ?? c.close,
        ma5: c.close,
        ma10: c.close - 2,
        ma20: c.close - 5,
        ma60: c.close - 15,
        k: 70,
        d: 65,
        rsi: 65,
        dif: 2,
        macd: 1,
        macdHist: 1,
      }));

      const result = calculateMultiDimensionRadar({
        candles: bullUsCandles,
        klineCandles,
        market: 'US',
      });

      // 美股多頭標的的法人軸與籌碼軸應高於預設基準 50 分
      expect(result.dimensions.institutional).toBeGreaterThan(65);
      expect(result.dimensions.chips).toBeGreaterThan(60);
      expect(result.overallScore).toBeGreaterThanOrEqual(65);
    });
  });
});

