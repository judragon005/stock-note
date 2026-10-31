import { describe, it, expect } from 'vitest';
import { calculateAssetMomentum, evaluateDualMomentum, DEFAULT_MOMENTUM_UNIVERSES } from './dualMomentumEngine';
import { isDoubleColdRegime } from './macroAdvisorEngine';
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

  it('evaluateDualMomentum 應支援傳入 dividendAdjustments3M 並正確校準資產池', () => {
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

    const signal = evaluateDualMomentum({
      universeConfig: DEFAULT_MOMENTUM_UNIVERSES[1],
      quotesMap,
      dividendAdjustments3M: {
        '0056.TW': 4.5,
      },
    });

    const asset0056 = signal.leaderboard.find((item) => item.symbol === '0056.TW');
    expect(asset0056?.returns3M).toBe(4.5);
  });

  it('日 K 不足 5 根時（1~4 根），應自動降級為水合中狀態 (momentumScore = -999)', () => {
    // 構造僅 3 根 K 棒
    const fewCandles: DailyCandle[] = [
      { date: '2026-01-01', open: 100, high: 102, low: 99, close: 101, volume: 100 },
      { date: '2026-01-02', open: 101, high: 103, low: 100, close: 102, volume: 120 },
      { date: '2026-01-03', open: 102, high: 104, low: 101, close: 103, volume: 150 },
    ];

    const result = calculateAssetMomentum('0050.TW', 'TW', fewCandles, 0.04, '元大台灣50');
    expect(result.momentumScore).toBe(-999);
  });

  it('isDoubleColdRegime 應正確判定長線總經與短線波段雙冷體制', () => {
    expect(isDoubleColdRegime(44, 29)).toBe(true);
    expect(isDoubleColdRegime(45, 29)).toBe(false);
    expect(isDoubleColdRegime(44, 30)).toBe(false);
    expect(isDoubleColdRegime(50, 50)).toBe(false);
  });
});
