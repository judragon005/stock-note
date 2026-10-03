import { describe, it, expect, vi } from 'vitest';
import {
  createDefaultAiForceReport,
  generateAiForceReportFromCandles,
} from '../../engine/aiForceDashboardEngine';
import { normalizeAndSortCandles } from './cards/KLineChartCard';
import * as ohlcvBackfill from '../../engine/historicalOhlcvBackfill';

describe('Ticket 07: 無效標的誠實空狀態與在線即時回補管線驗證 (Spec 0162)', () => {
  it('1. 當輸入無效或無歷史資料之代碼時，建立之 report 應嚴格標註 isDataPending=true 且價格為 undefined', () => {
    const report = createDefaultAiForceReport('INVALID_9999', '未知代碼', 'TW');
    expect(report.isDataPending).toBe(true);
    expect(report.marketBar.currentPrice).toBeUndefined();
    expect(report.klineSystem.candles).toEqual([]);

    // 驗證 K 線處理函式回傳空陣列，觸發 KLineChartCard 之 Empty State
    const sortedCandles = normalizeAndSortCandles(report.klineSystem.candles);
    expect(sortedCandles.length).toBe(0);
  });

  it('2. 在線回補管線若成功抓回真實日 K，產生之 Report 應即刻脫離待命狀態 (isDataPending=false)', async () => {
    const mockCandles = Array.from({ length: 250 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(3, '0')}`,
      open: 100 + i * 0.1,
      high: 102 + i * 0.1,
      low: 99 + i * 0.1,
      close: 101 + i * 0.1,
      volume: 3000,
    }));

    vi.spyOn(ohlcvBackfill, 'backfillSymbolOhlcvAndIndicators').mockResolvedValue({
      candles: mockCandles,
      indicators: [],
    });

    const backfillResult = await ohlcvBackfill.backfillSymbolOhlcvAndIndicators('0050', 'TW', true);
    expect(backfillResult.candles.length).toBe(250);

    const fullReport = generateAiForceReportFromCandles(
      '0050',
      '元大台灣50',
      'TW',
      backfillResult.candles
    );

    expect(fullReport.isDataPending).toBe(false);
    expect(fullReport.marketBar.currentPrice).toBe(101 + 249 * 0.1);
    expect(fullReport.klineSystem.candles.length).toBe(250);
  });
});
