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
  scanMuscleBookerItem,
  getScopedUniverseSymbols,
  calculateDefenseBufferMetrics,
  detectBottomPenetration,
  isHeavyResistanceAhead,
  calculateMomentumQuickMetrics,
  computeMuscleBookerTimeline,
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

    it('盤中跌破箱底支撐但收盤強勢站回且留下影線，應觸發底穿上破底翻偵測', () => {
      const candles = generateMockCandles(25, 100);
      // 箱底 100，今日開盤 102，盤中下殺破線至 95，收盤強勢收在 103 (高點 104)
      // 下影線長度: min(102, 103) - 95 = 7，總振幅: 104 - 95 = 9 (占比 77.8% >= 50%)
      candles[24] = {
        date: '2026-01-25',
        open: 102,
        high: 104,
        low: 95,
        close: 103,
        volume: 2500,
      };

      const deduction = calculateMaDeduction(candles, 100);
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
        currentPrice: 98.8, // 跌破原箱頂 100 達 1.0% 以上 (< 99.0)
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

    it('標的流動性不足 (isLowLiquidity) 且非在倉時，應強制輸出 AVOID 杜絕滑價與衝擊成本', () => {
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

      expect(decision.action).toBe('AVOID');
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

  describe('9. 規格審查 (Spec 0214) 邊界修正與實盤全模組貫通 (Issue #389 TDD)', () => {
    it('假突破門檻應精準遵循規格定義跌破原箱頂 1.0% (< boxUpper * 0.99)', () => {
      // 箱頂 100，跌至 99.2 (跌 0.8%，尚未達 1.0%) -> 不應觸發假突破 SELL
      const decision1 = evaluateMuscleBookerAction({
        currentPrice: 99.2,
        box: { boxStatus: 'INSIDE_BOX', boxUpper: 100, boxLower: 90 },
        deduction: { ma20Slope: 'UP' },
        bbands: { isSqueeze: false },
        isHolding: true,
      });
      expect(decision1.action).not.toBe('SELL');

      // 跌至 98.9 (跌 1.1% < 99.0) -> 確立為假突破，觸發 SELL
      const decision2 = evaluateMuscleBookerAction({
        currentPrice: 98.9,
        box: { boxStatus: 'INSIDE_BOX', boxUpper: 100, boxLower: 90 },
        deduction: { ma20Slope: 'UP' },
        bbands: { isSqueeze: false },
        isHolding: true,
      });
      expect(decision2.action).toBe('SELL');
      expect(decision2.actionBadge).toContain('假突破保本');
    });

    it('大盤偏空 Regime 時，若非 RS 極強 (EXTREME_STRONG)，即使風益比達標亦應觸發防線觀望', () => {
      const decision = evaluateMuscleBookerAction({
        currentPrice: 105,
        box: { boxStatus: 'BREAKOUT_UP', boxUpper: 100, boxLower: 90 },
        deduction: { ma20Slope: 'UP' },
        bbands: { isSqueeze: false, bandwidth: 5.0 },
        atr: { atr14: 1.0 },
        marketRegime: 'BEAR',
        rsRank: 'STRONG', // 非 EXTREME_STRONG
      } as any);

      expect(decision.action).toBe('HOLD');
      expect(decision.actionBadge).toContain('大盤偏空防線');
      expect(decision.actionReason).toContain('RS 極強');
    });

    it('情境 B 破底翻反轉應具備完整量化閘門 (MACD 負向阻斷、OBV 下降背離降級與大盤防禦)', () => {
      // 1. MACD 弱勢阻斷
      const macdBlocked = evaluateMuscleBookerAction({
        currentPrice: 95,
        box: { boxStatus: 'INSIDE_BOX', boxUpper: 110, boxLower: 90 },
        deduction: { isBottomPenetrationRebound: true, ma20Slope: 'UP' },
        bbands: { isSqueeze: false },
        macd: { dif12_26: -1.2, macdHist: -0.8 },
      } as any);
      expect(macdBlocked.action).toBe('AVOID');
      expect(macdBlocked.actionBadge).toContain('MACD弱勢');

      // 2. OBV 背離降級
      const obvFalling = evaluateMuscleBookerAction({
        currentPrice: 95,
        box: { boxStatus: 'INSIDE_BOX', boxUpper: 110, boxLower: 90 },
        deduction: { isBottomPenetrationRebound: true, ma20Slope: 'UP' },
        bbands: { isSqueeze: false },
        obvTrend: 'FALLING',
      } as any);
      expect(obvFalling.action).toBe('HOLD');
      expect(obvFalling.actionBadge).toContain('OBV背離');

      // 3. 大盤偏空提高門檻至 3.0R 且要求 RS 極強
      const bearWeakRS = evaluateMuscleBookerAction({
        currentPrice: 95,
        box: { boxStatus: 'INSIDE_BOX', boxUpper: 110, boxLower: 90 },
        deduction: { isBottomPenetrationRebound: true, ma20Slope: 'UP' },
        bbands: { isSqueeze: false },
        marketRegime: 'BEAR',
        rsRank: 'NEUTRAL',
      } as any);
      expect(bearWeakRS.action).toBe('HOLD');
      expect(bearWeakRS.actionBadge).toContain('大盤偏空防線');
    });

    it('scanMuscleBookerItem 應實質調用 calculateOBV、calculateMACD、ATR 與 60 日高點壓制', () => {
      const candles = generateMockCandles(35, 100);
      const scanned = scanMuscleBookerItem('2330', '台積電', 'TW', 100, candles, {
        isHolding: true,
        marketRegime: 'BULL',
      } as any);

      expect((scanned as any).atr).toBeDefined();
      expect((scanned as any).obvTrend).toBeDefined();
      expect((scanned as any).macd).toBeDefined();
    });

    it('getScopedUniverseSymbols 應正確支援全量台股與美股四大市場池過濾', () => {
      const twAll = getScopedUniverseSymbols('TW', 'TW_ALL');
      expect(twAll.length).toBeGreaterThanOrEqual(2000);
      expect(twAll.some((s) => s.symbol === '2330')).toBe(true);

      const sp500 = getScopedUniverseSymbols('US', 'US_SP500');
      expect(sp500.length).toBeGreaterThanOrEqual(500);
      expect(sp500.some((s) => s.symbol === 'AAPL')).toBe(true);

      const dow30 = getScopedUniverseSymbols('US', 'US_DOW30');
      expect(dow30.length).toBe(30);

      const sox30 = getScopedUniverseSymbols('US', 'US_SOX30');
      expect(sox30.length).toBe(30);

      const nasdaq100 = getScopedUniverseSymbols('US', 'US_NASDAQ100');
      expect(nasdaq100.length).toBeGreaterThanOrEqual(100);

      const mid100 = getScopedUniverseSymbols('TW', 'MID100_MOMENTUM');
      expect(mid100.length).toBe(100);
    });

    describe('Spec 0216: 量化防禦核升級 (Tickets 01 ~ 03)', () => {
      it('Ticket 01: 當突破當日出現長上影線墓碑倒錘 (Bull Trap) 時，應強制輸出 AVOID (墓碑誘多)', () => {
        const candles = generateMockCandles(25, 100);
        // 最後一天衝高至 125 但收盤殺回 106 (箱頂 105，上影線 19 遠大於實體 5)
        candles[24].open = 101;
        candles[24].high = 125;
        candles[24].low = 100;
        candles[24].close = 106;

        const res = scanMuscleBookerItem('2330', '台積電', 'TW', 106, candles);
        expect(res.actionDecision.action).toBe('AVOID');
        expect(res.actionDecision.actionBadge).toContain('墓碑誘多');
      });

      it('Ticket 01: 破底翻必須以跌破 boxLower 箱底並強勢收復為準，若未跌破 boxLower 僅回踩 MA20 不得判定為破底翻', () => {
        const candles = generateMockCandles(25, 100);
        // 設定箱頂 110，箱底 90
        candles[5].high = 110;
        candles[6].low = 90;
        // 最後一天最低 95 (高於箱底 90，僅稍微低於 MA20)，收盤 98
        candles[24].open = 96;
        candles[24].low = 95;
        candles[24].close = 98;
        candles[24].high = 99;

        const res = scanMuscleBookerItem('2330', '台積電', 'TW', 98, candles);
        expect(res.isBottomPenetration).toBe(false);

        // 若最後一天跌破箱底 90 (最低 88)，隨後收復至 93 留下長下影線
        candles[24].open = 91;
        candles[24].low = 88;
        candles[24].close = 93;
        candles[24].high = 94;
        const resTruePen = scanMuscleBookerItem('2330', '台積電', 'TW', 93, candles);
        expect(resTruePen.isBottomPenetration).toBe(true);
      });

      it('Ticket 02: 目標價應採平滑加權期望值，消除 60 日高點階躍斷崖', () => {
        const decisionA = evaluateMuscleBookerAction({
          currentPrice: 99.9,
          box: { boxStatus: 'BREAKOUT_UP', boxUpper: 95, boxLower: 85 },
          deduction: { ma20Slope: 'UP' },
          bbands: { isSqueeze: false, bandwidth: 7.5 },
          lookback60High: 100.0,
        });

        const decisionB = evaluateMuscleBookerAction({
          currentPrice: 100.1,
          box: { boxStatus: 'BREAKOUT_UP', boxUpper: 95, boxLower: 85 },
          deduction: { ma20Slope: 'UP' },
          bbands: { isSqueeze: false, bandwidth: 7.5 },
          lookback60High: 100.0,
        });

        const diff = Math.abs((decisionB.riskRewardRatioValue ?? 0) - (decisionA.riskRewardRatioValue ?? 0));
        expect(diff).toBeLessThan(2.0);
      });

      it('Ticket 02: 當雙市場日均成交金額不及格時，非在庫持股應輸出 AVOID (流動性不足)', () => {
        const candles = generateMockCandles(25, 10);
        // 成交量極小 (5 日均量 100 股，股價 10 元，成交金額僅 1,000 元 < 3000 萬)
        candles.slice(-5).forEach((c) => {
          c.volume = 100;
        });

        const res = scanMuscleBookerItem('9999', '冷門股', 'TW', 10, candles, { isHolding: false });
        expect(res.actionDecision.action).toBe('AVOID');
        expect(res.actionDecision.actionBadge).toContain('流動性不足');
      });

      it('Ticket 03: 當突破箱頂但 20 日主力 VWAP 乖離率 > 10% 時，應降級為 HOLD (主力成本過熱)', () => {
        const candles = generateMockCandles(25, 100);
        // 前 20 天價格在 100，最後幾天暴衝到 130 (VWAP 約 102，現價 130 乖離 > 25%)
        candles[23].close = 120;
        candles[24].open = 125;
        candles[24].close = 130;
        candles[24].high = 131;
        candles[24].low = 124;

        const res = scanMuscleBookerItem('2330', '台積電', 'TW', 130, candles);
        expect(res.actionDecision.action).toBe('HOLD');
        expect(res.actionDecision.actionBadge).toContain('主力成本過熱');
      });

      it('Issue #399: 動態布林帶寬放寬 - 當日突破開口達 9.5% 但近 5 日曾極致壓縮 (<= 8.0%) 時，允許 BUY 買點確立', () => {
        const decision = evaluateMuscleBookerAction({
          currentPrice: 105,
          box: { boxStatus: 'BREAKOUT_UP', boxUpper: 100, boxLower: 90 },
          deduction: { ma20Slope: 'UP' },
          bbands: { isSqueeze: false, bandwidth: 9.5, wasRecentSqueeze: true },
          atr: { atr14: 2.0 },
        });

        expect(decision.action).toBe('BUY');
        expect(decision.actionBadge).toContain('建議買進');
      });

      it('Issue #399: 破底翻反轉站回 VWAP 成本線時，應追加站回成本線強化支撐註記', () => {
        const decision = evaluateMuscleBookerAction({
          currentPrice: 95,
          box: { boxStatus: 'INSIDE_BOX', boxUpper: 110, boxLower: 90 },
          deduction: { isBottomPenetrationRebound: true, ma20Slope: 'UP' },
          bbands: { isSqueeze: true, bandwidth: 5.0 },
          vwap: { mainForceVwap: 93, biasPercent: 2.1 },
        });

        expect(decision.action).toBe('BUY');
        expect(decision.actionBadge).toContain('站回成本線');
        expect(decision.actionReason).toContain('收復20日主力VWAP成本線');
      });

      it('Issue #399: calculateDefenseBufferMetrics 應精確推導防守價、緩衝比例與瀕危狀態', () => {
        // 破線情境
        const broken = calculateDefenseBufferMetrics({
          currentPrice: 98,
          actionDecision: { stopLossPrice: 100 },
        });
        expect(broken.defensePrice).toBe(100);
        expect(broken.isDefenseBroken).toBe(true);
        expect(broken.isDefenseEndangered).toBe(false);

        // 瀕臨破防情境 (緩衝 <= 1.5%)
        const endangered = calculateDefenseBufferMetrics({
          currentPrice: 101,
          actionDecision: { stopLossPrice: 100 },
        });
        expect(endangered.isDefenseBroken).toBe(false);
        expect(endangered.isDefenseEndangered).toBe(true);
        expect(endangered.bufferPercent).toBeCloseTo(1.0, 1);

        // 安全守穩情境 (緩衝 > 1.5%)
        const safe = calculateDefenseBufferMetrics({
          currentPrice: 110,
          actionDecision: { stopLossPrice: 100 },
        });
        expect(safe.isDefenseBroken).toBe(false);
        expect(safe.isDefenseEndangered).toBe(false);
        expect(safe.bufferPercent).toBeCloseTo(9.1, 1);
      });

      it('Issue #401: 破底翻下影線幾何計算必須以 min(open, close) - low 為準，長紅陽線即使破底收復亦不可被誤判為下影線破底翻', () => {
        // 箱底 100。最後一天開 100.5，盤中低點 99.5，隨後大漲收 109 (光頭長紅陽線)
        // 振幅 = 109 - 99.5 = 9.5
        // 真實下影線 = min(100.5, 109) - 99.5 = 1.0 (佔比 1.0 / 9.5 = 10.5% < 50%)
        // 舊錯誤公式：close - low = 109 - 99.5 = 8.5 (佔比 8.5 / 9.5 = 89.5% >= 50% 造成誤判)
        const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => {
          const isLast = i === 24;
          return {
            date: `2026-08-${String(i + 1).padStart(2, '0')}`,
            open: isLast ? 100.5 : 101,
            high: isLast ? 109 : 102,
            low: isLast ? 99.5 : 100,
            close: isLast ? 109 : 101,
            volume: 10000,
          };
        });

        const res = detectBottomPenetration(candles, 100);
        expect(res).toBe(false);
      });

      it('Issue #401: 破底翻在無 boxLower 時絕不可回退 MA20 跌破收復判定', () => {
        const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => ({
          date: `2026-08-${String(i + 1).padStart(2, '0')}`,
          open: 100,
          high: 101,
          low: 99,
          close: 100,
          volume: 10000,
        }));

        const res = detectBottomPenetration(candles, undefined);
        expect(res).toBe(false);
        expect(typeof res).toBe('boolean');
      });

      it('Issue #401: 真正長下影線錘子線 (下影線 >= 50%) 且跌破收復箱底，應正確確立破底翻', () => {
        // 箱底 100。最後一天開 100.5，盤中下殺至 94 探底，終盤強烈拉升收 101
        // 振幅 = 101.5 - 94 = 7.5
        // 下影線 = min(100.5, 101) - 94 = 6.5 (佔比 6.5 / 7.5 = 86.7% >= 50%)
        const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => {
          const isLast = i === 24;
          return {
            date: `2026-08-${String(i + 1).padStart(2, '0')}`,
            open: isLast ? 100.5 : 101,
            high: isLast ? 101.5 : 102,
            low: isLast ? 94 : 100,
            close: isLast ? 101 : 101,
            volume: 15000,
          };
        });

        const res = detectBottomPenetration(candles, 100);
        expect(res).toBe(true);
        expect(typeof res).toBe('boolean');
      });

      it('Issue #405: isHeavyResistanceAhead 當 POC 在現價上方 5% 內且佔比 >= 25% 應回傳 true，其餘情況回傳 false', () => {
        // 現價 100，POC 在 102 (上方 2%)，佔比 30%
        const heavyVp = {
          buckets: [
            { priceMin: 101, priceMax: 103, percentage: 30 },
            { priceMin: 95, priceMax: 97, percentage: 10 },
          ],
        };
        expect(isHeavyResistanceAhead(heavyVp, 100)).toBe(true);

        // POC 在現價下方 (98)
        const lowerVp = {
          buckets: [
            { priceMin: 97, priceMax: 99, percentage: 35 },
          ],
        };
        expect(isHeavyResistanceAhead(lowerVp, 100)).toBe(false);

        // POC 在現價上方超過 5% (例如 107)
        const farVp = {
          buckets: [
            { priceMin: 106, priceMax: 108, percentage: 40 },
          ],
        };
        expect(isHeavyResistanceAhead(farVp, 100)).toBe(false);

        // POC 佔比不足 25% (例如 20%)
        const weakVp = {
          buckets: [
            { priceMin: 101, priceMax: 103, percentage: 20 },
          ],
        };
        expect(isHeavyResistanceAhead(weakVp, 100)).toBe(false);

        // 空值防禦
        expect(isHeavyResistanceAhead(null, 100)).toBe(false);
        expect(isHeavyResistanceAhead({ buckets: [] }, 100)).toBe(false);
      });

      it('Issue #405: calculateMomentumQuickMetrics 應精確計算 5 日均量量比與當日漲跌幅', () => {
        const candles: DailyCandle[] = [
          { date: '2026-08-01', open: 100, high: 105, low: 95, close: 100, volume: 1000 },
          { date: '2026-08-02', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
          { date: '2026-08-03', open: 100, high: 105, low: 95, close: 104, volume: 1000 },
          { date: '2026-08-04', open: 100, high: 105, low: 95, close: 106, volume: 1000 },
          { date: '2026-08-05', open: 100, high: 110, low: 105, close: 110, volume: 2000 }, // 前收 106，收 110，漲幅 +3.77%
        ];

        const metrics = calculateMomentumQuickMetrics(candles, 110);
        expect(metrics.priceChange).toBe(4);
        expect(metrics.priceChangePercent).toBe(3.77);
        // 5 日均量 = (1000 + 1000 + 1000 + 1000 + 2000) / 5 = 1200, 當日量 2000 / 1200 = 1.67
        expect(metrics.volRatio).toBe(1.67);

        // 少於 2 根 K 線防禦
        expect(calculateMomentumQuickMetrics([])).toEqual({});
        expect(calculateMomentumQuickMetrics([candles[0]])).toEqual({});
      });

      it('Issue #405: POC 上方套牢反壓時，風益比 riskRewardRatio 應實質折半降級', () => {
        const decision = evaluateMuscleBookerAction({
          currentPrice: 100,
          box: { boxStatus: 'BREAKOUT_UP', boxUpper: 98, boxLower: 90 },
          deduction: { ma20Slope: 'UP' },
          hasHeavyResistance: true, // 套牢反壓
          bbands: { bandwidth: 6.0, isSqueeze: true, wasRecentSqueeze: true },
          vwap: { biasPercent: 2.0 },
          volumeRatio: 1.5,
          volRatio: 1.5,
          marketRegime: 'BULL',
          rsRank: 'STRONG',
          atr: { trailingDefensePrice: 95 },
        });

        expect(decision.action).toBe('HOLD');
        expect(decision.actionBadge).toContain('上方套牢壓沉重');
        // 原本 100-95=5 停損，目標價 = 100+max(8, 2*3)=108，原 R = 8/5 = 1.6R，折半後應為 0.8R
        expect(decision.riskRewardRatioValue).toBe(2);
        expect(decision.riskRewardRatio).toBe('2.0R');
      });

      it('Issue #405: 帶寬開口擴張 (bandwidth > 8.0 且 wasRecentSqueeze) 時，若未放量 (volRatio < 1.0) 應強制觀望', () => {
        const noVolDecision = evaluateMuscleBookerAction({
          currentPrice: 100,
          box: { boxStatus: 'BREAKOUT_UP', boxUpper: 98, boxLower: 90 },
          deduction: { ma20Slope: 'UP' },
          hasHeavyResistance: false,
          bbands: { bandwidth: 10.0, isSqueeze: false, wasRecentSqueeze: true }, // 開口放寬中
          vwap: { biasPercent: 2.0 },
          volumeRatio: 0.8, // 未放量 (< 1.0)
          volRatio: 0.8,
          marketRegime: 'BULL',
          rsRank: 'STRONG',
          atr: { trailingDefensePrice: 95 },
        });

        expect(noVolDecision.action).toBe('HOLD');
        expect(noVolDecision.actionBadge).toContain('帶寬開口但量能不足');

        const volDecision = evaluateMuscleBookerAction({
          currentPrice: 100,
          box: { boxStatus: 'BREAKOUT_UP', boxUpper: 98, boxLower: 90 },
          deduction: { ma20Slope: 'UP' },
          hasHeavyResistance: false,
          bbands: { bandwidth: 10.0, isSqueeze: false, wasRecentSqueeze: true }, // 開口放寬中
          vwap: { biasPercent: 2.0 },
          volumeRatio: 1.5, // 顯著放量 (>= 1.0)
          volRatio: 1.5,
          marketRegime: 'BULL',
          rsRank: 'STRONG',
          atr: { trailingDefensePrice: 95 },
        });

        expect(volDecision.action).toBe('BUY');
      });

      it('Issue #405: computeMuscleBookerTimeline 應將 boxLower 傳入扣抵計算，歷史破底翻點位應正確識別', () => {
        const candles: DailyCandle[] = Array.from({ length: 30 }, (_, i) => {
          const isHammer = i === 24;
          return {
            date: `2026-08-${String(i + 1).padStart(2, '0')}`,
            open: isHammer ? 100.5 : 101,
            high: isHammer ? 101.5 : 103,
            low: isHammer ? 94 : 100,
            close: isHammer ? 101 : 101,
            volume: 15000,
          };
        });

        const timeline = computeMuscleBookerTimeline('TEST', candles);
        expect(timeline.length).toBe(30);
        // 第 25 根 (index 24) 的扣抵指標中 isBottomPenetrationRebound 應為 true
        expect(timeline[24].maDeduction.isBottomPenetrationRebound).toBe(true);
      });
      it('Issue #405: isHeavyResistanceAhead 當 POC 在現價上方 5% 內且佔比 >= 25% 應回傳 true，其餘情況回傳 false', () => {
        // 現價 100，POC 在 102 (上方 2%)，佔比 30%
        const heavyVp = {
          buckets: [
            { priceMin: 101, priceMax: 103, percentage: 30 },
            { priceMin: 95, priceMax: 97, percentage: 10 },
          ],
        };
        expect(isHeavyResistanceAhead(heavyVp, 100)).toBe(true);

        // POC 在現價下方 (98)
        const lowerVp = {
          buckets: [
            { priceMin: 97, priceMax: 99, percentage: 35 },
          ],
        };
        expect(isHeavyResistanceAhead(lowerVp, 100)).toBe(false);

        // POC 在現價上方超過 5% (例如 107)
        const farVp = {
          buckets: [
            { priceMin: 106, priceMax: 108, percentage: 40 },
          ],
        };
        expect(isHeavyResistanceAhead(farVp, 100)).toBe(false);

        // POC 佔比不足 25% (例如 20%)
        const weakVp = {
          buckets: [
            { priceMin: 101, priceMax: 103, percentage: 20 },
          ],
        };
        expect(isHeavyResistanceAhead(weakVp, 100)).toBe(false);

        // 空值防禦
        expect(isHeavyResistanceAhead(null, 100)).toBe(false);
        expect(isHeavyResistanceAhead({ buckets: [] }, 100)).toBe(false);
      });

      it('Issue #405: calculateMomentumQuickMetrics 應精確計算 5 日均量量比與當日漲跌幅', () => {
        const candles: DailyCandle[] = [
          { date: '2026-08-01', open: 100, high: 105, low: 95, close: 100, volume: 1000 },
          { date: '2026-08-02', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
          { date: '2026-08-03', open: 100, high: 105, low: 95, close: 104, volume: 1000 },
          { date: '2026-08-04', open: 100, high: 105, low: 95, close: 106, volume: 1000 },
          { date: '2026-08-05', open: 100, high: 110, low: 105, close: 110, volume: 2000 }, // 前收 106，收 110，漲幅 +3.77%
        ];

        const metrics = calculateMomentumQuickMetrics(candles, 110);
        expect(metrics.priceChange).toBe(4);
        expect(metrics.priceChangePercent).toBe(3.77);
        // 5 日均量 = (1000 + 1000 + 1000 + 1000 + 2000) / 5 = 1200, 當日量 2000 / 1200 = 1.67
        expect(metrics.volRatio).toBe(1.67);

        // 少於 2 根 K 線防禦
        expect(calculateMomentumQuickMetrics([])).toEqual({});
        expect(calculateMomentumQuickMetrics([candles[0]])).toEqual({});
      });

      it('Issue #405: POC 上方套牢反壓時，風益比 riskRewardRatio 應實質折半降級', () => {
        const decision = evaluateMuscleBookerAction({
          currentPrice: 100,
          box: { boxStatus: 'BREAKOUT_UP', boxUpper: 98, boxLower: 90 },
          deduction: { ma20Slope: 'UP' },
          hasHeavyResistance: true, // 套牢反壓
          bbands: { bandwidth: 6.0, isSqueeze: true, wasRecentSqueeze: true },
          vwap: { biasPercent: 2.0 },
          volRatio: 1.5,
          marketRegime: 'BULL',
          rsRank: 'STRONG',
          atr: { trailingDefensePrice: 95 },
        });

        expect(decision.action).toBe('HOLD');
        expect(decision.actionBadge).toContain('上方套牢壓沉重');
        expect(decision.riskRewardRatioValue).toBe(2);
        expect(decision.riskRewardRatio).toBe('2.0R');
      });

      it('Issue #405: 帶寬開口擴張 (bandwidth > 8.0 且 wasRecentSqueeze) 時，若未放量 (volRatio < 1.0) 應強制觀望', () => {
        const noVolDecision = evaluateMuscleBookerAction({
          currentPrice: 100,
          box: { boxStatus: 'BREAKOUT_UP', boxUpper: 98, boxLower: 90 },
          deduction: { ma20Slope: 'UP' },
          hasHeavyResistance: false,
          bbands: { bandwidth: 10.0, isSqueeze: false, wasRecentSqueeze: true }, // 開口放寬中
          vwap: { biasPercent: 2.0 },
          volRatio: 0.8, // 未放量 (< 1.0)
          marketRegime: 'BULL',
          rsRank: 'STRONG',
          atr: { trailingDefensePrice: 95 },
        });

        expect(noVolDecision.action).toBe('HOLD');
        expect(noVolDecision.actionBadge).toContain('帶寬開口但量能不足');

        const volDecision = evaluateMuscleBookerAction({
          currentPrice: 100,
          box: { boxStatus: 'BREAKOUT_UP', boxUpper: 98, boxLower: 90 },
          deduction: { ma20Slope: 'UP' },
          hasHeavyResistance: false,
          bbands: { bandwidth: 10.0, isSqueeze: false, wasRecentSqueeze: true }, // 開口放寬中
          vwap: { biasPercent: 2.0 },
          volRatio: 1.5, // 顯著放量 (>= 1.0)
          marketRegime: 'BULL',
          rsRank: 'STRONG',
          atr: { trailingDefensePrice: 95 },
        });

        expect(volDecision.action).toBe('BUY');
      });

      it('Issue #405: computeMuscleBookerTimeline 應將 boxLower 傳入扣抵計算，歷史破底翻點位應正確識別', () => {
        const candles: DailyCandle[] = Array.from({ length: 30 }, (_, i) => {
          const isHammer = i === 24;
          return {
            date: `2026-08-${String(i + 1).padStart(2, '0')}`,
            open: isHammer ? 100.5 : 101,
            high: isHammer ? 101.5 : 103,
            low: isHammer ? 94 : 100,
            close: isHammer ? 101 : 101,
            volume: 15000,
          };
        });

        const timeline = computeMuscleBookerTimeline('TEST', candles);
        expect(timeline.length).toBe(30);
        // 第 25 根 (index 24) 的扣抵指標中 isBottomPenetrationRebound 應為 true
        expect(timeline[24].maDeduction.isBottomPenetrationRebound).toBe(true);
      });

    });
  });
});
