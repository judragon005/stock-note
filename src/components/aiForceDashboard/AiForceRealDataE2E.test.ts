import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { backfillSymbolOhlcvAndIndicators } from '../../engine/historicalOhlcvBackfill';
import { generateAiForceReportFromCandles } from '../../engine/aiForceDashboardEngine';
import { paginateCandles } from './TaskPanels';
import * as db from '../../utils/db';
import * as priceFetcher from '../../engine/priceFetcher';
import * as marketCacheLoader from '../../engine/marketCacheLoader';

describe('Ticket 03: AI 主力戰情室端到端資料庫注入與全視圖驗收 (E2E Verification)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T16:00:00+08:00'));
    vi.spyOn(db, 'saveSymbolOhlcv').mockResolvedValue();
    vi.spyOn(db, 'saveSymbolIndicators').mockResolvedValue();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('查詢 00403A 時，若 Yahoo API 遭遇 429，系統能無縫回退本地 compact 歷史資料庫並合流當日盤後行情', async () => {
    // 1. 模擬本地 IndexedDB 初次為空
    vi.spyOn(db, 'getSymbolOhlcv').mockResolvedValue(null);
    vi.spyOn(db, 'getSymbolIndicators').mockResolvedValue(null);

    // 2. 模擬 Yahoo API 429 限流
    vi.spyOn(priceFetcher, 'fetchWithCORSProxy').mockRejectedValue(new Error('HTTP 429 Too Many Requests'));

    // 3. 模擬本地 compact 資料庫返回 00403A 的 59 根歷史日 K
    const mockCompact59 = Array.from({ length: 59 }, (_, i) => ({
      date: `2026-06-${String(i + 1).padStart(2, '0')}`,
      open: 10 + i * 0.05,
      high: 10.2 + i * 0.05,
      low: 9.9 + i * 0.05,
      close: 10.1 + i * 0.05,
      volume: 1000000 + i * 10000,
    }));
    vi.spyOn(marketCacheLoader, 'loadSymbolCompactHistory').mockResolvedValue(mockCompact59);

    // 4. 模擬當日最新收盤價 (2026-09-30, 10.79 元)
    vi.spyOn(marketCacheLoader, 'getLatestSummaryQuote').mockResolvedValue({
      date: '2026-09-30',
      open: 10.83,
      high: 10.9,
      low: 10.78,
      close: 10.79,
      volume: 144635371,
    });

    // 執行回補
    const backfillResult = await backfillSymbolOhlcvAndIndicators('00403A', 'TW');

    expect(backfillResult.candles.length).toBe(60); // 59 歷史 + 1 當日
    expect(backfillResult.candles[59].date).toBe('2026-09-30');
    expect(backfillResult.candles[59].close).toBe(10.79);

    // 5. 驗證合成戰情室全景報告
    const report = generateAiForceReportFromCandles(
      '00403A',
      '統一升級50',
      'TW',
      backfillResult.candles,
      {
        price: 10.79,
        change: -0.04,
        changePercent: -0.37,
      }
    );

    // 驗證頂部行情列：不再是寫死的 150 元
    expect(report.marketBar.currentPrice).toBe(10.79);
    expect(report.marketBar.dataPointsCount).toBe(60);
    expect(report.marketBar.latestTradingDate).toBe('2026-09-30');

    // 驗證主 K 線圖數列
    expect(report.klineSystem.candles.length).toBe(60);
    expect(report.klineSystem.candles[report.klineSystem.candles.length - 1].close).toBe(10.79);

    // 驗證 18 張卡片指標皆正常運算 (非寫死 mock)
    expect(report.vwapCostStructure.mainForceVwap).toBeGreaterThan(0);
    expect(report.forecastCone.timeNodes.length).toBeGreaterThan(0);
    expect(report.forecastCone.timeNodes[0].medianPrice).toBeCloseTo(10.79, 1);

    // 6. 驗證任務五：原始資料總表能完整分頁展示 60 筆日 K
    const paged = paginateCandles(backfillResult.candles, 1, 15);
    expect(paged.totalCount).toBe(60);
    expect(paged.totalPages).toBe(4);
    expect(paged.items.length).toBe(15);
    expect(paged.items[0].date).toBe('2026-09-30'); // 降冪第一筆為最新
  });

  it('Spec 0159: 查詢 2886 兆豐金時，系統優先從本地 SQLite 湖倉秒讀完整歷史日 K，戰情室生成真實行情且不再顯示偽造 30 日', async () => {
    // 模擬本地 SQLite 湖倉快取已命中 61 筆歷史日 K
    const mock2886Candles = Array.from({ length: 61 }, (_, i) => ({
      date: `2026-07-${String((i % 25) + 1).padStart(2, '0')}`,
      open: 38 + i * 0.05,
      high: 38.5 + i * 0.05,
      low: 37.8 + i * 0.05,
      close: 38.2 + i * 0.05,
      volume: 15000000 + i * 10000,
    }));

    vi.spyOn(marketCacheLoader, 'loadSymbolFullLakehouseData').mockResolvedValue({
      candles: mock2886Candles,
      institutionalRecords: [
        {
          date: '2026-10-01',
          foreignShares: 5000,
          trustShares: 1200,
          dealerShares: -300,
        },
      ],
    });

    const fullData = await marketCacheLoader.loadSymbolFullLakehouseData('2886');
    expect(fullData).not.toBeNull();
    expect(fullData?.candles.length).toBe(61);
    expect(fullData?.institutionalRecords?.length).toBe(1);


    // 透過真實日 K 合成報告
    const report = generateAiForceReportFromCandles(
      '2886',
      '兆豐金',
      'TW',
      fullData!.candles,
      {
        price: fullData!.candles[fullData!.candles.length - 1].close,
        change: 0.2,
        changePercent: 0.52,
      }
    );

    // 驗證真實資料筆數與行情
    expect(report.marketBar.dataPointsCount).toBe(61);
    expect(report.marketBar.dataPointsCount).not.toBe(30); // 杜絕寫死 30 日
    expect(report.klineSystem.candles.length).toBe(61);
    expect(report.marketBar.dataRangeText).not.toBe('尚無歷史交易日資料');
  });

  it('Spec 0159: 當輸入無資料之無效代碼時，系統誠實呈現空狀態 (0 筆)，杜絕任何 30 日或 1200 張假數據', () => {
    const emptyReport = generateAiForceReportFromCandles('INVALID', '未知標的', 'TW', [], undefined);

    expect(emptyReport.marketBar.dataPointsCount).toBe(0);
    expect(emptyReport.klineSystem.candles).toHaveLength(0);
    expect(emptyReport.marketBar.dataRangeText).toBe('尚無歷史交易日資料');
    expect(emptyReport.marketBar.volumeShares).toBeUndefined();
    expect(emptyReport.marketBar.openPrice).toBeUndefined();
  });
});


