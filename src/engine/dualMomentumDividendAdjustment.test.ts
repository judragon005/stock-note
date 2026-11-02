import { describe, it, expect } from 'vitest';
import {
  calculateAssetMomentum,
  evaluateDualMomentum,
  DEFAULT_MOMENTUM_UNIVERSES,
  BENCHMARK_DIVIDEND_ADJUSTMENTS_3M,
  aggregateRecentDividends,
  isMomentumHydrating,
} from './dualMomentumEngine';
import { isDoubleColdRegime, calculate20MABias } from './macroAdvisorEngine';
import type { DailyCandle } from '../types/indicators';

describe('Dual Momentum Total Return & Full-Spectrum Alignment (Ticket 04 / Followup)', () => {
  it('除息總報酬校準：當提供近 3 個月除息金額時，應正確還原 returns3M 與動能分數', () => {
    // 構造 300 根 K 棒
    const baseCandles: DailyCandle[] = [];
    for (let i = 0; i < 300; i++) {
      baseCandles.push({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        open: 100,
        high: 100,
        low: 100,
        close: 100,
        volume: 1000,
      });
    }
    // 假設 63 天前（idx3M）價格是 100 元，現價也是 100 元，但除息了 5 元
    // 未加回股息時 returns3M 為 0%
    const unadjusted = calculateAssetMomentum('0056.TW', 'TW', baseCandles, 0.02, '元大高股息', 0);
    expect(unadjusted.returns3M).toBe(0);

    // 加回股息 5 元時，returns3M 應還原為 5%
    const adjusted = calculateAssetMomentum('0056.TW', 'TW', baseCandles, 0.02, '元大高股息', 5);
    expect(adjusted.returns3M).toBe(5);
    // 加權動能分 (20% * 5% = 1.0)
    expect(adjusted.momentumScore).toBeGreaterThan(unadjusted.momentumScore);
  });

  it('evaluateDualMomentum 應內建 BENCHMARK_DIVIDEND_ADJUSTMENTS_3M 公用底表，未持有者亦能獲得總報酬校準', () => {
    const quotesMap: Record<string, DailyCandle[]> = {};
    const dummyCandles: DailyCandle[] = Array.from({ length: 300 }, () => ({
      date: `2026-01-01`,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 1000,
    }));
    DEFAULT_MOMENTUM_UNIVERSES[1].symbols.forEach((s) => {
      quotesMap[s.symbol] = dummyCandles;
    });

    // 完全不傳入 dividendAdjustments3M，檢驗是否自動套用公用底表
    const signal = evaluateDualMomentum({
      universeConfig: DEFAULT_MOMENTUM_UNIVERSES[1],
      quotesMap,
    });

    const asset0056 = signal.leaderboard.find((item) => item.symbol === '0056.TW');
    expect(asset0056?.returns3M).toBe(BENCHMARK_DIVIDEND_ADJUSTMENTS_3M['0056.TW']);
    expect(asset0056?.isHydrated).toBe(true);
  });

  it('日 K 不足 5 根時（1~4 根），應自動標記 isHydrated = false 且 momentumScore = -999', () => {
    // 構造僅 3 根 K 棒
    const fewCandles: DailyCandle[] = [
      { date: '2026-01-01', open: 100, high: 102, low: 99, close: 101, volume: 100 },
      { date: '2026-01-02', open: 101, high: 103, low: 100, close: 102, volume: 120 },
      { date: '2026-01-03', open: 102, high: 104, low: 101, close: 103, volume: 150 },
    ];

    const result = calculateAssetMomentum('0050.TW', 'TW', fewCandles, 0.04, '元大台灣50');
    expect(result.momentumScore).toBe(-999);
    expect(result.isHydrated).toBe(false);
  });

  it('calculate20MABias 應精準計算 20MA 月線乖離率並對極端資料優雅回退', () => {
    // 構造 20 根均為 100 元的 K 線
    const candles20: DailyCandle[] = Array.from({ length: 20 }, (_, idx) => ({
      date: `2026-01-${idx + 1}`,
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: 1000,
    }));

    // 現價 108 元，MA20 為 100 元，乖離率應為 +8.0%
    expect(calculate20MABias(candles20, 108)).toBe(8.0);
    // 現價 94 元，乖離率應為 -6.0%
    expect(calculate20MABias(candles20, 94)).toBe(-6.0);
    // K 棒不足 20 根時回傳 undefined
    expect(calculate20MABias(candles20.slice(0, 19), 108)).toBeUndefined();
    // 現價無效時回傳 undefined
    expect(calculate20MABias(candles20, 0)).toBeUndefined();
    expect(calculate20MABias(undefined, 100)).toBeUndefined();
  });

  it('isDoubleColdRegime 應正確判定長線總經與短線波段雙冷體制', () => {
    expect(isDoubleColdRegime(44, 29)).toBe(true);
    expect(isDoubleColdRegime(45, 29)).toBe(false);
    expect(isDoubleColdRegime(44, 30)).toBe(false);
    expect(isDoubleColdRegime(50, 50)).toBe(false);
  });

  it('aggregateRecentDividends 應具備日期容錯解析能力，支援 ISO 與純日期格式並過濾無效日期', () => {
    const receivableDividends = [
      { symbol: '0056.TW', exDate: '2026-10-15', cashDividendPerShare: 1.07 },
      { symbol: '00878.TW', exDate: '2026-09-01T08:30:00.000Z', cashDividendPerShare: 0.55 },
      { symbol: '00713.TW', exDate: '2026-05-01', cashDividendPerShare: 1.5 }, // 超過 90 天
      { symbol: '2330', exDate: 'invalid-date', cashDividendPerShare: 3.5 }, // 無效日期
      { symbol: '2454', exDate: undefined, cashDividendPerShare: 5.0 }, // 無日期
    ];

    // 基準日為 ISO 字串格式
    const resIso = aggregateRecentDividends(receivableDividends, '2026-10-31T23:59:59.999Z', 90);
    expect(resIso['0056.TW']).toBe(1.07);
    expect(resIso['00878.TW']).toBe(0.55);
    expect(resIso['00713.TW']).toBeUndefined();
    expect(resIso['2330']).toBeUndefined();
    expect(resIso['2454']).toBeUndefined();

    // 基準日為純 YYYY-MM-DD
    const resDateOnly = aggregateRecentDividends(receivableDividends, '2026-10-31', 90);
    expect(resDateOnly['0056.TW']).toBe(1.07);
    expect(resDateOnly['00878.TW']).toBe(0.55);

    // 空陣列防禦
    expect(aggregateRecentDividends(undefined)).toEqual({});
  });

  it('isMomentumHydrating 應準確判定空值、未水合與哨兵值資產狀態', () => {
    expect(isMomentumHydrating(null)).toBe(true);
    expect(isMomentumHydrating(undefined)).toBe(true);
    expect(isMomentumHydrating({ isHydrated: false, momentumScore: 10 })).toBe(true);
    expect(isMomentumHydrating({ isHydrated: true, momentumScore: -999 })).toBe(true);
    expect(isMomentumHydrating({ isHydrated: true, momentumScore: -990 })).toBe(true);
    expect(isMomentumHydrating({ isHydrated: true, momentumScore: -989 })).toBe(false);
    expect(isMomentumHydrating({ isHydrated: true, momentumScore: 15.2 })).toBe(false);
  });
});
