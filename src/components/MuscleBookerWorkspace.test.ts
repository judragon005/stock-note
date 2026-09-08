import { describe, it, expect } from 'vitest';
import { scanMuscleBookerItem } from './MuscleBookerWorkspace';
import { DailyCandle } from '../types/indicators';

describe('MuscleBookerWorkspace (肌肉書僮動能雷達工作區測試)', () => {
  it('當最後一根日 K 突破過去箱頂時，應正確判定為 BREAKOUT_UP', () => {
    // 前 20 天在 100 左右，最後一天突破至 115
    const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => {
      const isLast = i === 24;
      const c = isLast ? 115 : 100 + (i % 2);
      return {
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        open: c,
        high: isLast ? 116 : c + 1,
        low: isLast ? 114 : c - 1,
        close: c,
        volume: isLast ? 50000 : 10000,
      };
    });

    const result = scanMuscleBookerItem('2330', '台積電', 'TW', 115, candles);
    expect(result.boxStatus).toBe('BREAKOUT_UP');
    expect(result.currentPrice).toBe(115);
    expect(result.boxUpper).toBeDefined();
    expect(result.boxUpper!).toBeLessThan(115);
  });

  it('當價格極度收縮時，應識別出布林極致壓縮 (isBollingerSqueeze === true)', () => {
    // 25 天價格極其平穩 (振幅 < 0.2%)
    const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, '0')}`,
      open: 100,
      high: 100.1,
      low: 99.9,
      close: 100,
      volume: 10000,
    }));

    const result = scanMuscleBookerItem('2454', '聯發科', 'TW', 100, candles);
    expect(result.isBollingerSqueeze).toBe(true);
    expect(result.bollingerBandwidth).toBeLessThanOrEqual(8.0);
  });

  it('在無本地日 K 時，應能平滑使用合成數據生成指標而不拋錯', () => {
    const result = scanMuscleBookerItem('NVDA', '輝達', 'US', 125);
    expect(result.symbol).toBe('NVDA');
    expect(result.currentPrice).toBeGreaterThan(0);
    expect(['BREAKOUT_UP', 'BREAKOUT_DOWN', 'INSIDE_BOX']).toContain(result.boxStatus);
  });
});
