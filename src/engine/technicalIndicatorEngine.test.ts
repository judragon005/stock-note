import { describe, it, expect } from 'vitest';
import {
  calculateMovingAverages,
  calculateStochasticKD,
  calculateMACD,
  calculateVolumeMetrics,
  calculatePriceExtremes,
  computeTechnicalIndicators,
  extractHoldingSignals,
} from './technicalIndicatorEngine';
import { DailyCandle } from '../types/signal';

describe('technicalIndicatorEngine (技術指標與訊號運算引擎)', () => {
  describe('calculateMovingAverages (移動平均線計算)', () => {
    it('應能精確計算 MA5, MA20, MA60, MA120, MA240', () => {
      // 構造 65 筆收盤價，1 到 65
      const closes = Array.from({ length: 65 }, (_, i) => i + 1);
      const ma = calculateMovingAverages(closes);

      // MA5: (61+62+63+64+65) / 5 = 63
      expect(ma.ma5).toBe(63);
      // MA20: (46+...+65) / 20 = 55.5
      expect(ma.ma20).toBe(55.5);
      // MA60: (6+...+65) / 60 = 35.5
      expect(ma.ma60).toBe(35.5);
      // 長度不足 120 筆時，ma120 與 ma240 為 undefined
      expect(ma.ma120).toBeUndefined();
      expect(ma.ma240).toBeUndefined();
    });

    it('在資料長度少於 5 筆時應安全回傳 undefined，不拋出錯誤', () => {
      const closes = [10, 11, 12];
      const ma = calculateMovingAverages(closes);
      expect(ma.ma5).toBeUndefined();
      expect(ma.ma20).toBeUndefined();
      expect(ma.ma60).toBeUndefined();
    });
  });

  describe('calculateStochasticKD (KD 隨機指標計算)', () => {
    it('應能正確計算 9 日 KD 值與前一日 KD 值', () => {
      // 15 根 K 線，收盤價穩步向上
      const highs = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
      const lows = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
      const closes = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24];

      const kd = calculateStochasticKD(highs, lows, closes);
      expect(kd.k9).toBeDefined();
      expect(kd.d9).toBeDefined();
      expect(kd.prevK9).toBeDefined();
      expect(kd.prevD9).toBeDefined();
      // 在持續創高的走勢中，K 值應處於高檔 (>= 80)
      expect(kd.k9!).toBeGreaterThanOrEqual(80);
    });

    it('在最高價等於最低價時（如漲跌停無振幅），應防範除以 0', () => {
      const highs = Array(12).fill(100);
      const lows = Array(12).fill(100);
      const closes = Array(12).fill(100);

      const kd = calculateStochasticKD(highs, lows, closes);
      expect(kd.k9).toBe(50);
      expect(kd.d9).toBe(50);
    });
  });

  describe('calculateMACD (平滑異同移動平均線計算)', () => {
    it('應能計算 EMA12, EMA26, DIF, MACD9 與柱狀體 Histogram', () => {
      // 40 根漸增收盤價
      const closes = Array.from({ length: 40 }, (_, i) => 100 + i * 2);
      const macd = calculateMACD(closes);

      expect(macd.dif12_26).toBeDefined();
      expect(macd.macd9).toBeDefined();
      expect(macd.macdHist).toBeDefined();
      // 上漲趨勢中 DIF > MACD，柱狀體為正數
      expect(macd.dif12_26!).toBeGreaterThan(0);
      expect(macd.macdHist!).toBeGreaterThan(0);
    });

    it('資料少於 26 筆時應能給出安全估算或優雅降級', () => {
      const closes = [10, 11, 12];
      const macd = calculateMACD(closes);
      expect(macd.macdHist).toBeUndefined();
    });
  });

  describe('calculateVolumeMetrics (成交量異動計算)', () => {
    it('應能精確計算昨日量、5日均量、20日均量與量能倍率', () => {
      const volumes = Array(25).fill(1000);
      // 昨日 (倒數第 2 根) 爆量 3000
      volumes[23] = 3000;
      // 今日 (倒數第 1 根) 2000
      volumes[24] = 2000;

      const vol = calculateVolumeMetrics(volumes);
      expect(vol.yesterdayVolume).toBe(3000);
      expect(vol.avgVolume5).toBeDefined();
      expect(vol.avgVolume20).toBeDefined();
      expect(vol.isYesterdaySurge).toBe(true); // 3000 >= 5日均量之 2 倍或明顯放大
    });
  });

  describe('calculatePriceExtremes (價格極值與突破)', () => {
    it('應能判斷近 5 日與近 20 日最高與最低價', () => {
      const highs = [10, 12, 14, 16, 18, 20, 22, 24];
      const lows = [8, 9, 10, 11, 12, 13, 14, 15];

      const extremes = calculatePriceExtremes(highs, lows);
      expect(extremes.weekHigh5).toBe(24);
      expect(extremes.weekLow5).toBe(11); // 倒數 5 根 lows: [11, 12, 13, 14, 15] 的最小值
    });
  });

  describe('extractHoldingSignals (持股訊號標籤萃取)', () => {
    it('應能準確萃取「均線之上/下」、「9日K大幅拉升」、「創單週新低」等膠囊標籤', () => {
      const indicators = {
        currentPrice: 35.0,
        ma5: 36.5,      // 現價在 5 日線之下
        ma20: 37.0,     // 現價在月線之下
        ma60: 38.0,     // 現價在季線之下
        ma120: 34.0,    // 現價在半年線之上
        k9: 82,
        prevK9: 60,     // 9日K大幅拉升 (差值 22)
        dif12_26: 1.2,
        macd9: 1.0,
        macdHist: 0.2,
        prevMacdHist: -0.1, // MACD 柱狀體翻紅注意
        yesterdayVolume: 5000,
        avgVolume5: 2000,  // 昨日量能注意 (5000 >= 2000 * 2)
        weekLow5: 35.0,    // 現價創單週新低
      };

      const signals = extractHoldingSignals(35.0, indicators);
      const signalIds = signals.map((s) => s.id);

      expect(signalIds).toContain('MA_BELOW_5');
      expect(signalIds).toContain('MA_BELOW_20');
      expect(signalIds).toContain('MA_BELOW_60');
      expect(signalIds).toContain('MA_ABOVE_120');
      expect(signalIds).toContain('KD_K_SURGE_9');
      expect(signalIds).toContain('MACD_ATTENTION');
      expect(signalIds).toContain('VOL_YESTERDAY_SURGE');
      expect(signalIds).toContain('PRICE_WEEK_LOW');

      // 檢查顏色調性
      const maBelow5 = signals.find((s) => s.id === 'MA_BELOW_5')!;
      expect(maBelow5.tone).toBe('BEARISH');

      const kSurge = signals.find((s) => s.id === 'KD_K_SURGE_9')!;
      expect(kSurge.tone).toBe('BULLISH');

      const volSurge = signals.find((s) => s.id === 'VOL_YESTERDAY_SURGE')!;
      expect(volSurge.tone).toBe('WARNING');
    });
  });

  describe('computeTechnicalIndicators (全量日 K 線計算管線)', () => {
    it('輸入標準 DailyCandle 陣列時能完整產出 TechnicalIndicators', () => {
      const candles: DailyCandle[] = Array.from({ length: 65 }, (_, i) => ({
        date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 102 + i,
        low: 99 + i,
        close: 101 + i,
        volume: 1000 + i * 10,
      }));

      const result = computeTechnicalIndicators(candles, 165.0);
      expect(result.currentPrice).toBe(165.0);
      expect(result.ma5).toBeDefined();
      expect(result.ma20).toBeDefined();
      expect(result.ma60).toBeDefined();
      expect(result.bias20).toBeDefined();
      expect(result.bias60).toBeDefined();
      expect(result.k9).toBeDefined();
      expect(result.d9).toBeDefined();
      expect(result.dif12_26).toBeDefined();
      expect(result.macdHist).toBeDefined();
    });

    it('應能精確計算均線乖離率 Bias% 並萃取正乖離過大或超跌反彈膠囊', () => {
      // 假設現價 108，月線 100 -> bias20 = +8%
      const indicators = {
        currentPrice: 108,
        ma20: 100,
        bias20: 8.0,
      };

      const signals = extractHoldingSignals(108, indicators);
      const overbought = signals.find((s) => s.id === 'BIAS_20_OVERBOUGHT');
      expect(overbought).toBeDefined();
      expect(overbought?.tone).toBe('WARNING');
      expect(overbought?.label).toContain('月線正乖離 (+8.0%)');

      // 假設現價 93，月線 100 -> bias20 = -7%
      const oversoldIndicators = {
        currentPrice: 93,
        ma20: 100,
        bias20: -7.0,
      };
      const oversoldSignals = extractHoldingSignals(93, oversoldIndicators);
      const oversold = oversoldSignals.find((s) => s.id === 'BIAS_20_OVERSOLD');
      expect(oversold).toBeDefined();
      expect(oversold?.tone).toBe('WARNING');
      expect(oversold?.label).toContain('月線負乖離 (-7.0%)');
    });

    it('應能識別多週期長短線共振結構 (長空短多反彈 vs 長多短空拉回)', () => {
      // 短線反彈但在季線之下：5MA(105) > 20MA(100)，現價 105 < 60MA(110)
      const reboundIndicators = {
        currentPrice: 105,
        ma5: 105,
        ma20: 100,
        ma60: 110,
      };
      const reboundSignals = extractHoldingSignals(105, reboundIndicators);
      expect(reboundSignals.some((s) => s.id === 'CONFLUENCE_REBOUND_IN_DOWNTREND')).toBe(true);

      // 長多短線拉回：5MA(98) < 20MA(100)，現價 102 >= 60MA(95)
      const pullbackIndicators = {
        currentPrice: 102,
        ma5: 98,
        ma20: 100,
        ma60: 95,
      };
      const pullbackSignals = extractHoldingSignals(102, pullbackIndicators);
      expect(pullbackSignals.some((s) => s.id === 'CONFLUENCE_PULLBACK_IN_UPTREND')).toBe(true);
    });

    it('computeTechnicalIndicators 應自動串聯肌肉書僮引擎並產出箱子突破膠囊', () => {
      // 構建 25 天 K 線：前 24 天收在 100 左右（三日箱頂 102），第 25 天突破至 110
      const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => {
        const isLast = i === 24;
        const close = isLast ? 110 : 100 + (i % 3);
        const high = isLast ? 112 : close + 1;
        const low = isLast ? 109 : close - 1;
        return {
          date: `2026-08-${String(i + 1).padStart(2, '0')}`,
          open: close,
          high,
          low,
          close,
          volume: isLast ? 50000 : 10000,
        };
      });

      const indicators = computeTechnicalIndicators(candles, 110);
      expect(indicators.boxStatus).toBe('BREAKOUT_UP');
      expect(indicators.ma20DeductionSlope).toBeDefined();

      const signals = extractHoldingSignals(110, indicators);
      const boxBreakout = signals.find((s) => s.id === 'MUSCLE_BOX_BREAKOUT_UP');
      expect(boxBreakout).toBeDefined();
      expect(boxBreakout?.label).toBe('箱頂突破');
      expect(boxBreakout?.tone).toBe('BULLISH');
    });
  });
});
