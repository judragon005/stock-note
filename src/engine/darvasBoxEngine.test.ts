import { describe, it, expect } from 'vitest';
import type { DailyCandle } from '../types/indicators';
import {
  detectDarvasBox,
  detectBottomPenetration,
  calculateMaDeduction,
  calculateBollingerSqueeze,
  isHeavyResistanceAhead,
} from './darvasBoxEngine';

function buildDailyCandles(
  count: number,
  fn: (i: number) => { open: number; high: number; low: number; close: number; volume?: number }
): DailyCandle[] {
  const start = Date.UTC(2026, 0, 1);
  return Array.from({ length: count }, (_, i) => {
    const p = fn(i);
    return {
      date: new Date(start + i * 86400000).toISOString().slice(0, 10),
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
      volume: p.volume ?? 1000,
    };
  });
}

describe('darvasBoxEngine (箱子戰術、破底翻、均線扣抵與布林壓縮 — Spec 0249 T09)', () => {
  it('detectDarvasBox：不足 4 根安全回傳 INSIDE_BOX，突破箱頂回傳 BREAKOUT_UP，跌破箱底回傳 BREAKOUT_DOWN', () => {
    expect(detectDarvasBox([]).boxStatus).toBe('INSIDE_BOX');
    expect(
      detectDarvasBox(buildDailyCandles(3, () => ({ open: 100, high: 102, low: 98, close: 100 }))).boxStatus
    ).toBe('INSIDE_BOX');

    const breakoutUp = buildDailyCandles(10, (i) => {
      if (i === 2) return { open: 105, high: 110, low: 104, close: 108 }; // 三日不破高 -> 箱頂 110
      if (i === 4) return { open: 95, high: 98, low: 90, close: 94 }; // 三日不破低 -> 箱底 90
      if (i === 9) return { open: 108, high: 115, low: 107, close: 114 }; // 突破 110
      return { open: 100, high: 103, low: 96, close: 100 };
    });
    const upRes = detectDarvasBox(breakoutUp);
    expect(upRes.boxUpper).toBe(110);
    expect(upRes.boxLower).toBe(90);
    expect(upRes.boxStatus).toBe('BREAKOUT_UP');

    const breakoutDown = [...breakoutUp.slice(0, 9), { ...breakoutUp[9], close: 85, low: 84 }];
    expect(detectDarvasBox(breakoutDown).boxStatus).toBe('BREAKOUT_DOWN');
  });

  it('detectBottomPenetration：盤中跌破箱底但收盤站回且下影線 >= 50% 應判定為破底翻，光頭長紅不誤判', () => {
    expect(detectBottomPenetration([], 100)).toBe(false);
    expect(
      detectBottomPenetration(
        [{ date: '2026-01-10', open: 101, high: 102, low: 94, close: 101, volume: 1000 }],
        100
      )
    ).toBe(true);

    // 光頭長紅實體佔滿振幅，下影線為 0 -> 不可誤判為破底翻
    expect(
      detectBottomPenetration(
        [{ date: '2026-01-10', open: 95, high: 105, low: 95, close: 105, volume: 1000 }],
        100
      )
    ).toBe(false);
  });

  it('calculateMaDeduction：資料不足安全回傳預設物件，充足資料正確輸出扣抵價與方向', () => {
    const empty = calculateMaDeduction([]);
    expect(empty.ma5DeductionPrice).toBeUndefined();

    const rising = buildDailyCandles(25, (i) => {
      const c = 100 + i * 2;
      return { open: c - 1, high: c + 1, low: c - 1, close: c };
    });
    const ded = calculateMaDeduction(rising, 95);
    expect(ded.ma5DeductionPrice).toBeDefined();
    expect(ded.ma20DeductionPrice).toBeDefined();
  });

  it('calculateBollingerSqueeze：不足 20 根安全回傳非壓縮預設值，窄幅平盤序列呈現低帶寬壓縮', () => {
    const shortRes = calculateBollingerSqueeze(
      buildDailyCandles(10, () => ({ open: 100, high: 101, low: 99, close: 100 }))
    );
    expect(shortRes.isSqueeze).toBe(false);
    expect(shortRes.bandwidth).toBe(0);

    const tight = buildDailyCandles(25, (i) => {
      const c = 100 + (i % 2 === 0 ? 0.2 : -0.2);
      return { open: c, high: c + 0.3, low: c - 0.3, close: c };
    });
    const sq = calculateBollingerSqueeze(tight);
    expect(sq.isSqueeze).toBe(true);
    expect(sq.bandwidth).toBeLessThan(8);
  });

  it('isHeavyResistanceAhead：上方分價量表存在大量套牢壓力帶時回傳 true，無套牢區回傳 false', () => {
    const heavyProfile = {
      buckets: [
        { priceMin: 118, priceMax: 122, percentage: 28 },
        { priceMin: 95, priceMax: 100, percentage: 15 },
      ],
    };

    expect(isHeavyResistanceAhead(heavyProfile, 115)).toBe(true);
    expect(isHeavyResistanceAhead({ buckets: [] }, 115)).toBe(false);
    expect(isHeavyResistanceAhead(undefined, 115)).toBe(false);
  });
});
