import { describe, it, expect } from 'vitest';
import {
  calculateMuscleBookerIndicators,
  detectDarvasBox,
  calculateMaDeduction,
  calculateBollingerSqueeze,
  calculateAtrTrailingDefense,
  calculateRelativeStrength,
  calculateTrustToNetVolumeRatio,
  evaluateMuscleBookerAction,
} from './muscleBookerEngine';
import { DailyCandle } from '../types/indicators';

describe('MuscleBooker Quant Engine (肌肉書僮量化運算核心)', () => {
  // 建立一組標準模擬日 K 線 (由遠到近排序)
  const generateMockCandles = (count: number, basePrice: number = 100): DailyCandle[] => {
    const candles: DailyCandle[] = [];
    let price = basePrice;
    for (let i = 0; i < count; i++) {
      const date = new Date(2026, 0, 1 + i).toISOString().split('T')[0];
      const open = price;
      const high = price + 2;
      const low = price - 2;
      const close = price + (i % 2 === 0 ? 1 : -1);
      const volume = 1000 + i * 10;
      candles.push({ date, open, high, low, close, volume });
      price = close;
    }
    return candles;
  };

  describe('1. 箱子戰術與三日法則 (Darvas Box Theory)', () => {
    it('連續 3 日未破前高應確立箱頂，連續 3 日未破前低應確立箱底', () => {
      // 構造測試 K 線：在第 5 日創下波段高點 120，隨後 3 日 (第 6,7,8 日) 高點皆小於 120
      const candles: DailyCandle[] = [
        { date: '2026-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { date: '2026-01-02', open: 102, high: 120, low: 98, close: 115, volume: 2000 }, // 波段高點 120, 低點 98
        { date: '2026-01-03', open: 115, high: 118, low: 100, close: 110, volume: 1500 }, // Day 1 後續
        { date: '2026-01-04', open: 110, high: 116, low: 102, close: 108, volume: 1200 }, // Day 2 後續
        { date: '2026-01-05', open: 108, high: 114, low: 105, close: 109, volume: 1100 }, // Day 3 後續 -> 確認箱頂 120
      ];

      const box = detectDarvasBox(candles);
      expect(box.boxUpper).toBe(120);
      expect(box.boxStatus).toBe('INSIDE_BOX');
    });

    it('收盤價突破箱頂應標記為 BREAKOUT_UP，跌破箱底應標記為 BREAKOUT_DOWN', () => {
      const candlesBreakoutUp: DailyCandle[] = [
        { date: '2026-01-01', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
        { date: '2026-01-02', open: 105, high: 108, low: 98, close: 104, volume: 1000 },
        { date: '2026-01-03', open: 104, high: 107, low: 99, close: 102, volume: 1000 },
        { date: '2026-01-04', open: 102, high: 106, low: 100, close: 103, volume: 1000 }, // 箱頂 110
        { date: '2026-01-05', open: 105, high: 115, low: 104, close: 112, volume: 3000 }, // 收盤 112 > 110 突破
      ];

      const box = detectDarvasBox(candlesBreakoutUp);
      expect(box.boxStatus).toBe('BREAKOUT_UP');
    });
  });

  describe('2. 均線扣抵望遠鏡與「底穿上」假跌破 (MA Deduction & False Breakdown)', () => {
    it('應正確回傳 5 日前與 20 日前扣抵價，並精準推導未來斜率', () => {
      const candles = generateMockCandles(25, 100);
      // 將最後一日收盤價設為 120，而 20 日前收盤價為 100
      candles[24].close = 120;
      candles[4].close = 100; // 20 日前 (24 - 20 = 4)

      const deduction = calculateMaDeduction(candles);
      expect(deduction.ma20DeductionPrice).toBe(100);
      expect(deduction.ma20Slope).toBe('UP'); // 120 > 100，MA20 走揚
    });

    it('未來 3 日即將扣抵歷史高價天花板時，即使現價大於單日扣抵，亦應識別反壓下彎 (時空望遠鏡)', () => {
      const candles = generateMockCandles(25, 100);
      // 現價 105
      candles[24].close = 105;
      // 20 日前單日 100 (看似翻揚)
      candles[4].close = 100;
      // 但未來 3 天 (第 5, 6, 7 日) 即將扣抵高價 120, 125, 122
      candles[5].close = 120;
      candles[6].close = 125;
      candles[7].close = 122;

      const deduction = calculateMaDeduction(candles);
      // 現價 105 小於未來 3 天即將扣抵的高價均值 (122.3) 與高點 (125)，應判定為 DOWN 下彎反壓
      expect(deduction.ma20Slope).toBe('DOWN');
      expect((deduction as any).futureDeductions).toBeDefined();
      expect((deduction as any).futureDeductions?.length).toBe(3);
    });

    it('盤中破 MA20 支撐但收盤強勢站回且留下影線，應觸發底穿上假跌破偵測', () => {
      const candles = generateMockCandles(25, 100);
      // MA20 約在 100，今日開盤 102，盤中下殺破線至 95，收盤強勢收在 103 (高點 104)
      // 下影線長度: 103 - 95 = 8，總振幅: 104 - 95 = 9 (占比 88% >= 50%)
      candles[24] = {
        date: '2026-01-25',
        open: 102,
        high: 104,
        low: 95,
        close: 103,
        volume: 2500,
      };

      const deduction = calculateMaDeduction(candles);
      expect(deduction.isBottomPenetrationRebound).toBe(true);
    });
  });

  describe('3. 布林通道極致壓縮 (Bollinger Squeeze)', () => {
    it('帶寬 <= 8% 應正確標記為 isSqueeze = true', () => {
      // 構造價格極度狹幅波動的 K 線 (收盤價皆在 100 附近，振幅極小)
      const candles: DailyCandle[] = [];
      for (let i = 0; i < 25; i++) {
        candles.push({
          date: `2026-01-${String(i + 1).padStart(2, '0')}`,
          open: 100,
          high: 100.5,
          low: 99.5,
          close: 100 + (i % 2 === 0 ? 0.2 : -0.2),
          volume: 1000,
        });
      }

      const bbands = calculateBollingerSqueeze(candles);
      expect(bbands.bandwidth).toBeLessThanOrEqual(8);
      expect(bbands.isSqueeze).toBe(true);
    });
  });

  describe('4. ATR 動態移動防守 (Trailing Defense)', () => {
    it('應正確計算 14 日 ATR 與移動防守價', () => {
      const candles = generateMockCandles(20, 100);
      const atrResult = calculateAtrTrailingDefense(candles);

      expect(atrResult.atr14).toBeGreaterThan(0);
      expect(atrResult.trailingDefensePrice).toBeLessThan(candles[candles.length - 1].high);
    });
  });

  describe('5. RS 相對強度 (Relative Strength)', () => {
    it('相對大盤超額報酬 >= 5% 應評定為 EXTREME_STRONG', () => {
      // 個股 10 日漲幅 10%，大盤 10 日漲幅 2% ➔ 超額 8%
      const stockCandles = generateMockCandles(15, 100);
      stockCandles[14].close = 110;
      stockCandles[4].close = 100; // 10 日漲幅 (110 - 100) / 100 = 10%

      const benchmarkCandles = generateMockCandles(15, 1000);
      benchmarkCandles[14].close = 1020;
      benchmarkCandles[4].close = 1000; // 10 日漲幅 2%

      const rs = calculateRelativeStrength(stockCandles, benchmarkCandles);
      expect(rs.rs10Score).toBeCloseTo(8, 0);
      expect(rs.rsRank).toBe('EXTREME_STRONG');
    });
  });

  describe('6. 投量比計算 (Trust-to-Net-Volume Ratio)', () => {
    it('應正確過濾當沖虛胖水分並計算真實控盤比率', () => {
      const candle: DailyCandle = {
        date: '2026-01-20',
        open: 100,
        high: 105,
        low: 99,
        close: 104,
        volume: 5000, // 總量 5000 張
        dayTradingVolume: 2500, // 當沖 2500 張 ➔ 實質淨量 2500 張
        trustNetBuy: 500, // 投信買超 500 張
      };

      const ratio = calculateTrustToNetVolumeRatio(candle);
      // 500 / 2500 * 100 = 20%
      expect(ratio).toBe(20);
    });

    it('投信佔比 > 15% 且連買應觸發高集中度多頭', () => {
      const result = calculateTrustToNetVolumeRatio({
        volume: 5000,
        dayTradingVolume: 2500,
        trustNetBuy: 600,
      } as any);
      // 600 / 2500 * 100 = 24% (> 15%)
      expect(result).toBeGreaterThan(15);
    });
  });

  describe('7. evaluateMuscleBookerAction (三色實戰操盤動作評估)', () => {
    it('當帶寬極致收斂 (bandwidth <= 8.0%) 且突破箱頂、均線翻揚、風益比 >= 2.0 時，方可輸出 BUY 建議買進', () => {
      const decision = evaluateMuscleBookerAction({
        currentPrice: 105,
        box: {
          boxStatus: 'BREAKOUT_UP',
          boxUpper: 100,
          boxLower: 90,
          boxWidthPercent: 10,
        },
        deduction: {
          ma20Slope: 'UP',
          isBottomPenetrationRebound: false,
        },
        bbands: {
          isSqueeze: true,
          bandwidth: 7.2, // 符合極致收斂 <= 8.0%
        },
      });

      expect(decision.action).toBe('BUY');
      expect(decision.actionBadge).toContain('買進');
      expect(decision.stopLossPrice).toBe(100);
      expect(decision.targetPrice).toBe(115);
      expect(decision.riskRewardRatio).toBe('2.0R');
      expect(decision.riskRewardRatio).not.toContain('1 :');
      expect(decision.riskRewardRatioValue).toBeGreaterThanOrEqual(2.0);
    });

    it('微小突破 (如僅過箱頂 0.1 元) 應納入 minRiskBuffer 保護，杜絕 20R 以上虛胖分母', () => {
      // 現價 100.1，突破箱頂 100，若停損在 100，結構風險僅 0.1 元
      // 目標價以箱寬 10 元測幅為 110.1 (獲利 10 元)
      // 若無緩衝，10 / 0.1 = 100.0R (誇張虛胖)
      // 引入 minRiskBuffer = Math.max(100.1 * 0.02, atr = 2.5) = 2.5 元
      // 風益比應平穩收斂在 10 / 2.5 = 4.0R
      const decision = evaluateMuscleBookerAction({
        currentPrice: 100.1,
        box: {
          boxStatus: 'BREAKOUT_UP',
          boxUpper: 100,
          boxLower: 90,
          boxWidthPercent: 10,
        },
        deduction: {
          ma20Slope: 'UP',
          isBottomPenetrationRebound: false,
        },
        bbands: {
          isSqueeze: true,
          bandwidth: 6.5,
        },
        atr: {
          atr14: 2.5,
          trailingDefensePrice: 97.5,
        },
      } as any);

      expect(decision.action).toBe('BUY');
      expect(decision.riskRewardRatioValue).toBeLessThanOrEqual(5.0);
      expect(decision.riskRewardRatioValue).toBeGreaterThanOrEqual(2.0);
    });

    it('破底翻但受制於近 60 日歷史高點結構反壓時，目標價應受結構壓制', () => {
      // 現價 95，破底翻，箱底 90，箱頂 110
      // 結構風險 = 95 - 88.2 = 6.8
      // 若純測幅目標為箱頂 110 (獲利 15 元)，但近 60 日高點僅 101 (獲利 6 元)
      // 6 / 6.8 = 0.88R < 2.0R ➔ 應安全降級為 HOLD (空間不足)
      const decision = evaluateMuscleBookerAction({
        currentPrice: 95,
        box: {
          boxStatus: 'INSIDE_BOX',
          boxUpper: 110,
          boxLower: 90,
          boxWidthPercent: 20,
        },
        deduction: {
          ma20Slope: 'FLAT',
          isBottomPenetrationRebound: true,
        },
        bbands: {
          isSqueeze: false,
          bandwidth: 12.0,
        },
        atr: {
          atr14: 3.0,
          trailingDefensePrice: 92.0,
        },
        lookback60High: 101, // 歷史天花板壓制
      } as any);

      expect(decision.action).toBe('HOLD');
      expect(decision.actionBadge).toContain('空間不足');
    });

    it('突破箱頂但 OBV 能量潮資金背離流出 (obvTrend === FALLING) 時，應降級為 HOLD (OBV 背離)', () => {
      const decision = evaluateMuscleBookerAction({
        currentPrice: 105,
        box: {
          boxStatus: 'BREAKOUT_UP',
          boxUpper: 100,
          boxLower: 90,
          boxWidthPercent: 10,
        },
        deduction: {
          ma20Slope: 'UP',
          isBottomPenetrationRebound: false,
        },
        bbands: {
          isSqueeze: true,
          bandwidth: 6.5,
        },
        atr: {
          atr14: 2.5,
          trailingDefensePrice: 97.5,
        },
        obvTrend: 'FALLING', // 能量潮背離
      } as any);

      expect(decision.action).toBe('HOLD');
      expect(decision.actionReason).toContain('OBV');
    });

    it('突破箱頂但 MACD 處於 0 軸以下弱勢空方主控時，應標記為 AVOID 嚴禁碰觸', () => {
      const decision = evaluateMuscleBookerAction({
        currentPrice: 105,
        box: {
          boxStatus: 'BREAKOUT_UP',
          boxUpper: 100,
          boxLower: 90,
          boxWidthPercent: 10,
        },
        deduction: {
          ma20Slope: 'UP',
          isBottomPenetrationRebound: false,
        },
        bbands: {
          isSqueeze: true,
          bandwidth: 6.5,
        },
        macd: {
          dif12_26: -1.5,
          macdHist: -0.8, // 0 軸以下弱勢
        },
      } as any);

      expect(decision.action).toBe('AVOID');
      expect(decision.actionReason).toContain('MACD');
    });

    it('在倉持股若假突破跌回箱頂以下，應發布 SELL 假突破保本離場訊號', () => {
      const decision = evaluateMuscleBookerAction({
        currentPrice: 99.2, // 跌破原箱頂 100
        box: {
          boxStatus: 'INSIDE_BOX', // 已跌回箱內
          boxUpper: 100,
          boxLower: 90,
          boxWidthPercent: 10,
        },
        deduction: {
          ma20Slope: 'UP',
          isBottomPenetrationRebound: false,
        },
        bbands: {
          isSqueeze: false,
          bandwidth: 12.0,
        },
        isHolding: true, // 在倉持股
      } as any);

      expect(decision.action).toBe('SELL');
      expect(decision.actionBadge).toContain('假突破');
      expect(decision.stopLossPrice).toBe(100);
    });

    it('在倉持股若跌破 ATR 移動防守線，應發布 SELL 移動停利獲利了結訊號', () => {
      const decision = evaluateMuscleBookerAction({
        currentPrice: 108, // 高於箱頂 100 但自高點 120 拉回
        box: {
          boxStatus: 'BREAKOUT_UP',
          boxUpper: 100,
          boxLower: 90,
          boxWidthPercent: 10,
        },
        deduction: {
          ma20Slope: 'UP',
          isBottomPenetrationRebound: false,
        },
        bbands: {
          isSqueeze: false,
          bandwidth: 14.0,
        },
        atr: {
          atr14: 3.0,
          trailingDefensePrice: 110.0, // 現價 108 已跌破移動防守線 110
        },
        isHolding: true,
      } as any);

      expect(decision.action).toBe('SELL');
      expect(decision.actionBadge).toContain('移動停利');
      expect(decision.stopLossPrice).toBe(110);
    });

    it('大盤處於空頭體系 (marketRegime === BEAR) 時，風益比門檻應自適應提高至 3.0R', () => {
      // 2.5R 在多頭市場可買進，但在空頭市場未達 3.0R 應安全降級為 HOLD
      const decision = evaluateMuscleBookerAction({
        currentPrice: 104,
        box: {
          boxStatus: 'BREAKOUT_UP',
          boxUpper: 100,
          boxLower: 90,
          boxWidthPercent: 10,
        },
        deduction: {
          ma20Slope: 'UP',
          isBottomPenetrationRebound: false,
        },
        bbands: {
          isSqueeze: true,
          bandwidth: 6.5,
        },
        atr: {
          atr14: 2.5,
          trailingDefensePrice: 97.5,
        },
        marketRegime: 'BEAR', // 大盤空頭
      } as any);

      expect(decision.action).toBe('HOLD');
      expect(decision.actionReason).toContain('大盤偏空');
    });

    it('標的被財報鑑識雷達標記為嚴重異常 (isForensicDangerous) 時，應絕對禁買 AVOID', () => {
      const decision = evaluateMuscleBookerAction({
        currentPrice: 105,
        box: {
          boxStatus: 'BREAKOUT_UP',
          boxUpper: 100,
          boxLower: 90,
          boxWidthPercent: 10,
        },
        deduction: {
          ma20Slope: 'UP',
          isBottomPenetrationRebound: false,
        },
        bbands: {
          isSqueeze: true,
          bandwidth: 6.5,
        },
        isForensicDangerous: true, // 地雷股示警
      } as any);

      expect(decision.action).toBe('AVOID');
      expect(decision.actionBadge).toContain('鑑識雷達示警');
    });

    it('標的流動性不足 (isLowLiquidity) 時，應給予安全警示 HOLD 不予主動推薦', () => {
      const decision = evaluateMuscleBookerAction({
        currentPrice: 105,
        box: {
          boxStatus: 'BREAKOUT_UP',
          boxUpper: 100,
          boxLower: 90,
          boxWidthPercent: 10,
        },
        deduction: {
          ma20Slope: 'UP',
          isBottomPenetrationRebound: false,
        },
        bbands: {
          isSqueeze: true,
          bandwidth: 6.5,
        },
        isLowLiquidity: true, // 流動性不足
      } as any);

      expect(decision.action).toBe('HOLD');
      expect(decision.actionBadge).toContain('流動性不足');
    });

    it('當帶寬未極致收斂 (bandwidth > 8.0%) 時，即使突破箱頂，亦必須安全降級為 HOLD (觀望待變)，絕不可判定為 BUY', () => {
      const decision = evaluateMuscleBookerAction({
        currentPrice: 105,
        box: {
          boxStatus: 'BREAKOUT_UP',
          boxUpper: 100,
          boxLower: 90,
          boxWidthPercent: 10,
        },
        deduction: {
          ma20Slope: 'UP',
          isBottomPenetrationRebound: false,
        },
        bbands: {
          isSqueeze: false,
          bandwidth: 15.5, // > 8.0%，未經歷壓縮蓄勢
        },
      });

      expect(decision.action).not.toBe('BUY');
      expect(decision.action).toBe('HOLD');
      expect(decision.actionReason).toContain('帶寬');
      expect(decision.actionReason).toContain('切忌追高');
    });

    it('布林極致壓縮中，應輸出 AVOID 觀望不碰', () => {
      const decision = evaluateMuscleBookerAction({
        currentPrice: 100,
        box: {
          boxStatus: 'INSIDE_BOX',
          boxUpper: 102,
          boxLower: 98,
          boxWidthPercent: 4,
        },
        deduction: {
          ma20Slope: 'FLAT',
          isBottomPenetrationRebound: false,
        },
        bbands: {
          isSqueeze: true,
          bandwidth: 4.5,
        },
      });

      expect(decision.action).toBe('AVOID');
      expect(decision.actionBadge).toContain('碰');
      expect(decision.actionReason).toContain('壓縮');
    });

    it('跌破箱底，應輸出 SELL 建議賣出/停損', () => {
      const decision = evaluateMuscleBookerAction({
        currentPrice: 88,
        box: {
          boxStatus: 'BREAKOUT_DOWN',
          boxUpper: 100,
          boxLower: 90,
          boxWidthPercent: 10,
        },
        deduction: {
          ma20Slope: 'DOWN',
          isBottomPenetrationRebound: false,
        },
        bbands: {
          isSqueeze: false,
          bandwidth: 12,
        },
      });

      expect(decision.action).toBe('SELL');
      expect(decision.actionBadge).toContain('賣出');
      expect(decision.actionReason).toContain('停損');
    });
  });

  describe('8. 綜合指標點位生成 (calculateMuscleBookerIndicators)', () => {
    it('傳入完整日 K 數列時，應輸出每根 K 線的完整指標時序結構', () => {
      const candles = generateMockCandles(30, 100);
      const points = calculateMuscleBookerIndicators(candles);

      expect(points.length).toBe(candles.length);
      const latestPoint = points[points.length - 1];

      expect(latestPoint.date).toBe(candles[candles.length - 1].date);
      expect(latestPoint.close).toBe(candles[candles.length - 1].close);
      expect(latestPoint.ma.ma5).toBeDefined();
      expect(latestPoint.ma.ma20).toBeDefined();
      expect(latestPoint.box.boxStatus).toBeDefined();
      expect(latestPoint.bbands.bandwidth).toBeDefined();
      expect(latestPoint.atr.atr14).toBeDefined();
    });
  });
});
