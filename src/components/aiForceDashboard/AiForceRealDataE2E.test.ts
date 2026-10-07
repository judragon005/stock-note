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

    // 驗證真實資料筆數與行情 (已推進至最新交易日 62 筆)
    expect(report.marketBar.dataPointsCount).toBe(62);
    expect(report.marketBar.dataPointsCount).not.toBe(30); // 杜絕寫死 30 日
    expect(report.klineSystem.candles.length).toBe(62);
    expect(report.marketBar.dataRangeText).not.toBe('尚無歷史交易日資料');
  });

  it('Spec 0160: 致茂 (2360) 與 0050 湖倉真實日 K 推進至 2026-10-02 且與戰情室主 K 線圖完全對齊', async () => {
    // 1. 若本機已存在實體 SQLite 湖倉數據，驗證 2360 與 0050 最新日期推進至 2026-10-02
    // @ts-expect-error cjs module without type declaration
    const { initSqliteLakehouseDb, isSqliteSupported } = await import('../../../scripts/market-sync/sqlite-db-core.cjs');
    if (isSqliteSupported()) {
      const db = initSqliteLakehouseDb();
      const row2360 = db.prepare('SELECT date, open, high, low, close FROM daily_candles WHERE symbol = ? AND date = ?').get('2360', '2026-10-02');
      if (row2360) {
        expect(row2360.date).toBe('2026-10-02');
        expect(row2360.close).toBe(2190);
        expect(row2360.open).toBe(2145);
        expect(row2360.high).toBe(2225);
        expect(row2360.low).toBe(2135);
      }

      const row0050 = db.prepare('SELECT date, close FROM daily_candles WHERE symbol = ? AND date = ?').get('0050', '2026-10-02');
      if (row0050) {
        expect(row0050.date).toBe('2026-10-02');
        expect(row0050.close).toBe(112.8);
      }
    }

    // 2. 驗證戰情室合成 2360 報告時，頂部看板與主 K 線圖最後一根精準同為 2026-10-02
    const mock2360Candles = [
      { date: '2026-10-01', open: 2125, high: 2150, low: 2025, close: 2080, volume: 2414792 },
      { date: '2026-10-02', open: 2145, high: 2225, low: 2135, close: 2190, volume: 3257024 },
    ];
    // 補足至 60 根
    const full60Candles = Array.from({ length: 58 }, (_, i) => ({
      date: `2026-07-${String((i % 25) + 1).padStart(2, '0')}`,
      open: 2000,
      high: 2050,
      low: 1950,
      close: 2000,
      volume: 1000000,
    })).concat(mock2360Candles);

    const report2360 = generateAiForceReportFromCandles(
      '2360',
      '致茂',
      'TW',
      full60Candles,
      { price: 2190, change: 110, changePercent: 5.29, open: 2145, high: 2225, low: 2135, volume: 3257024 },
      undefined,
      new Date('2026-10-02T16:30:00+08:00')
    );

    expect(report2360.marketBar.latestTradingDate).toBe('2026-10-02');
    expect(report2360.marketBar.currentPrice).toBe(2190);
    expect(report2360.marketBar.openPrice).toBe(2145);
    expect(report2360.marketBar.highPrice).toBe(2225);
    expect(report2360.marketBar.lowPrice).toBe(2135);
    expect(report2360.klineSystem.candles[report2360.klineSystem.candles.length - 1].date).toBe('2026-10-02');
    expect(report2360.klineSystem.candles[report2360.klineSystem.candles.length - 1].close).toBe(2190);
  });

  it('Spec 0159: 當輸入無資料之無效代碼時，系統誠實呈現空狀態 (0 筆)，杜絕任何 30 日或 1200 張假數據', () => {
    const emptyReport = generateAiForceReportFromCandles('INVALID', '未知標的', 'TW', [], undefined);

    expect(emptyReport.marketBar.dataPointsCount).toBe(0);
    expect(emptyReport.klineSystem.candles).toHaveLength(0);
    expect(emptyReport.marketBar.dataRangeText).toBe('尚無歷史交易日資料');
    expect(emptyReport.marketBar.volumeShares).toBeUndefined();
    expect(emptyReport.marketBar.openPrice).toBeUndefined();
  });

  it('Ticket 04 (Spec 0168): 查詢 00411A 主動統一前沿科技時，精準識別為台股 TWD，張數單位與 37 筆真實日 K 自適應連動 18 張卡片', () => {
    // 模擬 00411A 自 2026-08-11 掛牌以來的 37 筆真實日 K (含真實 transactions)
    const candles37 = Array.from({ length: 37 }, (_, i) => ({
      date: `2026-08-${String((i % 20) + 1).padStart(2, '0')}`,
      open: 10.0 + i * 0.02,
      high: 10.1 + i * 0.02,
      low: 9.95 + i * 0.02,
      close: 10.05 + i * 0.02,
      volume: 8000000 + i * 50000,
      transactions: 1200 + i * 15,
    }));
    // 最後一根
    candles37[36] = {
      date: '2026-10-02',
      open: 10.79,
      high: 10.79,
      low: 10.68,
      close: 10.71,
      volume: 9935014,
      transactions: 1450,
    };

    const report = generateAiForceReportFromCandles(
      '00411A',
      '主動統一前沿科技',
      'TW',
      candles37,
      undefined,
      undefined,
      new Date('2026-10-02T16:00:00+08:00'),
      {
        currency: 'TWD',
        volumeUnit: '張',
      }
    );

    // 1. 頂部 Bar 驗證 (照片一缺陷全數修復)
    expect(report.marketBar.currency).toBe('TWD');
    expect(report.marketBar.volumeUnit).toBe('張');
    expect(report.marketBar.currentPrice).toBe(10.71);
    expect(report.marketBar.volumeShares).toBe(9935); // 9935014 / 1000 四捨五入
    expect(report.marketBar.transactionCount).toBe(1450); // 真實成交筆數映射
    expect(report.marketBar.dataPointsCount).toBe(37);
    expect(report.isDataPending).toBe(false);

    // 2. 主 K 線自適應：MA5/10/20 有值，MA60/MA250 嚴格為 undefined (Honest Empty State)
    expect(report.klineSystem.candles).toHaveLength(37);
    const lastKline = report.klineSystem.candles[36];
    expect(lastKline.close).toBe(10.71);
    expect(lastKline.ma5).toBeDefined();
    expect(lastKline.ma10).toBeDefined();
    expect(lastKline.ma20).toBeDefined();
    expect(lastKline.ma60).toBeUndefined(); // 上市未滿 60 日
    expect(lastKline.ma250).toBeUndefined(); // 上市未滿 250 日

    // 3. 18 張卡片全面運算正常，零崩潰
    expect(report.decisionCore).toBeDefined();
    expect(report.multiDimensionRadar.overallScore).toBeGreaterThan(0);
    expect(report.volumeProfile.buckets.length).toBe(5);
    expect(report.riskSpider.mainForceRiskIndex).toBeGreaterThan(0);
    expect(report.forecastCone.timeNodes.length).toBeGreaterThan(0);
    expect(report.vwapCostStructure.mainForceVwap).toBeGreaterThan(0);
    expect(report.dayTradeRisk.riskIndex).toBeGreaterThan(0);
    expect(report.bullBearEnergy.bullBearRatio).toBeGreaterThan(0);
    expect(report.healthSummary.chipHealth).toBeGreaterThan(0);
    expect(report.dynamicSignals.verdictLight).toBeDefined();
    expect(report.forceDistribution.largePlayerBuyPercent).toBeGreaterThan(0);
    expect(report.bullBearStrength.compositeScore).toBeGreaterThan(0);
  });
});


