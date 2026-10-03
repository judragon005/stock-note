import { describe, it, expect } from 'vitest';
import {
  createDefaultAiForceReport,
  generateAiForceReportFromCandles,
} from './aiForceDashboardEngine';

describe('Ticket 06: 報表引擎徹底拔除 Mock 日 K 與硬編碼假數值 (Zero-Mock Policy)', () => {
  it('1. createDefaultAiForceReport 當無傳入 basePrice 時，0050/2330/2360 均嚴格進入待命狀態且價格為 undefined', () => {
    const report0050 = createDefaultAiForceReport('0050', '元大台灣50', 'TW');
    expect(report0050.isDataPending).toBe(true);
    expect(report0050.marketBar.currentPrice).toBeUndefined();
    expect(report0050.marketBar.openPrice).toBeUndefined();
    expect(report0050.marketBar.highPrice).toBeUndefined();
    expect(report0050.marketBar.lowPrice).toBeUndefined();
    expect(report0050.marketBar.volumeShares).toBeUndefined();
    expect(report0050.klineSystem.candles).toEqual([]);

    const report2330 = createDefaultAiForceReport('2330', '台積電', 'TW');
    expect(report2330.isDataPending).toBe(true);
    expect(report2330.marketBar.currentPrice).toBeUndefined();
  });

  it('2. generateAiForceReportFromCandles 傳入空日 K 陣列時，嚴格回傳待命狀態且 klineSystem.candles 為空陣列', () => {
    const report = generateAiForceReportFromCandles('UNKNOWN_SYM', '測試標的', 'TW', []);
    expect(report.isDataPending).toBe(true);
    expect(report.klineSystem.candles.length).toBe(0);
    expect(report.marketBar.currentPrice).toBeUndefined();
    expect(report.marketBar.dataPointsCount).toBe(0);
  });

  it('3. generateAiForceReportFromCandles 傳入真實 250 根日 K 時，isDataPending 為 false 且完整產出 250 根日 K', () => {
    const candles250 = Array.from({ length: 250 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(3, '0')}`,
      open: 100 + i * 0.1,
      high: 102 + i * 0.1,
      low: 99 + i * 0.1,
      close: 101 + i * 0.1,
      volume: 5000,
    }));

    const report = generateAiForceReportFromCandles('2330', '台積電', 'TW', candles250);
    expect(report.isDataPending).toBe(false);
    expect(report.klineSystem.candles.length).toBe(250);
    expect(report.marketBar.currentPrice).toBe(101 + 249 * 0.1);
    expect(report.marketBar.dataPointsCount).toBe(250);
  });
});
