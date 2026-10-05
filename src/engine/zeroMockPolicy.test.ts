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

  it('4. 台股市場 (TW) 之成交量應由原始股數正確換算為張數 (除以 1000)，美股市場 (US) 維持原始股數 (Spec 0166 / Ticket 02)', () => {
    // 模擬 0050 於 2026-10-02 之真實日 K (成交 68,606,769 股)
    const candles0050 = Array.from({ length: 5 }, (_, i) => ({
      date: `2026-09-2${i}`,
      open: 112,
      high: 113,
      low: 111,
      close: 112.8,
      volume: 68606769,
    }));

    const report0050 = generateAiForceReportFromCandles('0050', '元大台灣50', 'TW', candles0050);
    // 台股單位為張：68,606,769 股應精確換算為 68,607 張，嚴禁顯示為 6800 萬張
    expect(report0050.marketBar.volumeShares).toBe(68607);

    // 美股單位為股：應保留原始成交股數
    const candlesNVDA = Array.from({ length: 5 }, (_, i) => ({
      date: `2026-09-2${i}`,
      open: 120,
      high: 125,
      low: 119,
      close: 122,
      volume: 45000000,
    }));

    const reportNVDA = generateAiForceReportFromCandles('NVDA', '輝達', 'US', candlesNVDA);
    expect(reportNVDA.marketBar.volumeShares).toBe(45000000);
  });

  it('5. 徹底拔除 volume * 2.3 偽造代碼：無真實筆數資料時 transactionCount 嚴格為 undefined，落實 Honest Empty State (Spec 0166 / Ticket 03)', () => {
    const candles = Array.from({ length: 5 }, (_, i) => ({
      date: `2026-09-2${i}`,
      open: 100,
      high: 105,
      low: 99,
      close: 103,
      volume: 1000000,
    }));

    const reportWithoutTransactions = generateAiForceReportFromCandles('2330', '台積電', 'TW', candles);
    // 嚴禁以 volume * 2.3 粗暴捏造 2,300,000 筆，必須誠實回傳 undefined
    expect(reportWithoutTransactions.marketBar.transactionCount).toBeUndefined();

    // 若有真實報價來源提供成交筆數，方可填入實際數值
    const reportWithRealTransactions = generateAiForceReportFromCandles(
      '2330',
      '台積電',
      'TW',
      candles,
      { price: 103, volume: 1000000, transactions: 15420 }
    );
    expect(reportWithRealTransactions.marketBar.transactionCount).toBe(15420);
  });
});
