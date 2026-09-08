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

  it('應能依據市場狀態提供正確的標的池清單 (美股模式絕不包含台股)', async () => {
    const { getScopedUniverseSymbols } = await import('./MuscleBookerWorkspace');
    const usSymbols = getScopedUniverseSymbols('US', 'TW50_CORE');
    expect(usSymbols.length).toBeGreaterThan(0);
    expect(usSymbols.every((s) => s.market === 'US')).toBe(true);

    const twSymbols = getScopedUniverseSymbols('TW', 'TW50_CORE');
    expect(twSymbols.length).toBeGreaterThan(0);
    expect(twSymbols.every((s) => s.market === 'TW')).toBe(true);
  });

  it('突破箱頂且 20MA 向上時，應輸出 actionDecision.action 為 BUY 並計算防守價與風益比', () => {
    const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => {
      const isLast = i === 24;
      const c = isLast ? 115 : 100 + i * 0.2;
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
    expect(result.actionDecision).toBeDefined();
    expect(result.actionDecision.action).toBe('BUY');
    expect(result.actionDecision.stopLossPrice).toBeDefined();
    expect(result.actionDecision.stopLossPrice!).toBeLessThan(115);
    expect(result.actionDecision.riskRewardRatio).toContain('1 :');
  });

  it('跌破三日箱底時，應輸出 actionDecision.action 為 SELL 並提示破線停損', () => {
    const candles: DailyCandle[] = Array.from({ length: 25 }, (_, i) => {
      const isLast = i === 24;
      const c = isLast ? 85 : 100 + (i % 2);
      return {
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        open: c,
        high: c + 1,
        low: c - 1,
        close: c,
        volume: 10000,
      };
    });

    const result = scanMuscleBookerItem('2881', '富邦金', 'TW', 85, candles);
    expect(result.actionDecision.action).toBe('SELL');
    expect(result.actionDecision.actionReason).toContain('跌破箱底');
  });
});

