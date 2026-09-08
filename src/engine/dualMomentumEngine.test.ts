import { describe, it, expect } from 'vitest';
import {
  calculateAssetMomentum,
  evaluateDualMomentum,
  DEFAULT_MOMENTUM_UNIVERSES,
} from './dualMomentumEngine';
import { DailyCandle } from '../types/indicators';

describe('Dual Momentum Engine (雙重動能與跨資產趨勢輪動核心)', () => {
  // 生成模擬日 K 線 (由遠到近排序)
  const generateCandles = (
    count: number,
    startPrice: number,
    endPrice: number
  ): DailyCandle[] => {
    const candles: DailyCandle[] = [];
    const step = (endPrice - startPrice) / Math.max(1, count - 1);
    for (let i = 0; i < count; i++) {
      const price = startPrice + step * i;
      candles.push({
        date: new Date(2025, 0, 1 + i).toISOString().split('T')[0],
        open: price,
        high: price + 1,
        low: price - 1,
        close: Math.round(price * 100) / 100,
        volume: 1000,
      });
    }
    return candles;
  };

  describe('1. calculateAssetMomentum (單一標的 12-1M 動能計量)', () => {
    it('應正確計算 3M, 6M, 12M 報酬率與 12-1M 加權動能分數', () => {
      // 構造 260 根 K 線，價格從 100 漲到 120 (12M 漲幅 20%)
      const candles = generateCandles(260, 100, 120);
      const metric = calculateAssetMomentum('SPY', 'US', candles, 0.04);

      expect(metric.symbol).toBe('SPY');
      expect(metric.currentPrice).toBe(120);
      expect(metric.returns12M).toBeGreaterThan(0);
      expect(metric.returns6M).toBeGreaterThan(0);
      expect(metric.returns3M).toBeGreaterThan(0);
      expect(metric.momentumScore).toBeGreaterThan(0);
      expect(metric.isAboveRiskFree).toBe(true);
    });
  });

  describe('2. evaluateDualMomentum (相對與絕對動能決策狀態機)', () => {
    it('情境 A：持有動能第一名標的且超越無風險利率，應輸出 HOLD_TOP 續抱', () => {
      // 資產池：A 強勢領跑 (+30%), B 溫和 (+10%), C 走弱 (-5%)
      const quotesMap: Record<string, DailyCandle[]> = {
        '0050.TW': generateCandles(260, 100, 130), // Top
        '0056.TW': generateCandles(260, 100, 110),
        'TLT': generateCandles(260, 100, 95),
      };

      const signal = evaluateDualMomentum({
        universeConfig: DEFAULT_MOMENTUM_UNIVERSES[1], // Taiwan Core
        quotesMap,
        currentHeldSymbol: '0050.TW',
      });

      expect(signal.topAsset.symbol).toBe('0050.TW');
      expect(signal.topAsset.rank).toBe(1);
      expect(signal.safeHavenTriggered).toBe(false);
      expect(signal.action).toBe('HOLD_TOP');
      expect(signal.actionHeadline).toContain('續抱');
    });

    it('情境 B：持有次優或弱勢標的，應輸出 SWITCH_ASSET 建議輪動換股至冠軍標的', () => {
      const quotesMap: Record<string, DailyCandle[]> = {
        'QQQ': generateCandles(260, 100, 140), // Top 冠軍
        'SPY': generateCandles(260, 100, 115), // 目前持有
      };

      const signal = evaluateDualMomentum({
        universeConfig: DEFAULT_MOMENTUM_UNIVERSES[2], // US Tech
        quotesMap,
        currentHeldSymbol: 'SPY',
      });

      expect(signal.topAsset.symbol).toBe('QQQ');
      expect(signal.action).toBe('SWITCH_ASSET');
      expect(signal.actionAdvice).toContain('QQQ');
    });

    it('情境 C：全面系統性熊市 (所有標的報酬率低於無風險利率)，應觸發 MOVE_TO_CASH 避風港', () => {
      // 所有標的 12 個月報酬皆為負
      const quotesMap: Record<string, DailyCandle[]> = {
        'SPY': generateCandles(260, 100, 85), // -15%
        'QQQ': generateCandles(260, 100, 80), // -20%
        'GLD': generateCandles(260, 100, 98), // -2% (仍低於 4% 無風險利率)
      };

      const signal = evaluateDualMomentum({
        universeConfig: DEFAULT_MOMENTUM_UNIVERSES[0], // Global Macro
        quotesMap,
        currentHeldSymbol: 'SPY',
        riskFreeRateAnnualized: 0.04,
      });

      expect(signal.safeHavenTriggered).toBe(true);
      expect(signal.action).toBe('MOVE_TO_CASH');
      expect(signal.actionHeadline).toContain('現金為王');
      expect(signal.actionAdvice).toContain('避風港');
    });
  });

  describe('3. 預設資產池模板健全性 (Default Universes)', () => {
    it('應包含 Global Macro、Taiwan Core 與 US Tech 三大經典輪動池', () => {
      expect(DEFAULT_MOMENTUM_UNIVERSES.length).toBeGreaterThanOrEqual(3);
      const ids = DEFAULT_MOMENTUM_UNIVERSES.map((u) => u.id);
      expect(ids).toContain('global_macro');
      expect(ids).toContain('taiwan_core');
      expect(ids).toContain('us_tech');
    });
  });
});
