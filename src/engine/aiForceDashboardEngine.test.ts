import { describe, it, expect } from 'vitest';
import {
  createDefaultAiForceReport,
  generateAiForceReportFromCandles,
} from './aiForceDashboardEngine';
import type { AiForceDashboardReport } from '../types/aiForceDashboard';

describe('aiForceDashboardEngine - Foundation & Contract', () => {
  it('should initialize a valid default AiForceDashboardReport for a given symbol', () => {
    const report: AiForceDashboardReport = createDefaultAiForceReport('2360', '致茂', 'TW');

    expect(report.symbol).toBe('2360');
    expect(report.name).toBe('致茂');
    expect(report.market).toBe('TW');

    // 檢查頂部行情 Bar
    expect(report.marketBar).toBeDefined();
    expect(report.marketBar.currentPrice).toBeGreaterThanOrEqual(0);
    expect(report.marketBar.statusBadges.aiScanActive).toBe(true);
    expect(report.marketBar.statusBadges.mainForceTracking).toBe(true);

    // 檢查 18 個模組 payload 均完整存在
    expect(report.klineSystem).toBeDefined();
    expect(report.decisionCore).toBeDefined();
    expect(report.multiDimensionRadar).toBeDefined();
    expect(report.volumeProfile).toBeDefined();
    expect(report.riskSpider).toBeDefined();
    expect(report.forecastCone).toBeDefined();
    expect(report.vwapCostStructure).toBeDefined();
    expect(report.institutionalFlow).toBeDefined();
    expect(report.dayTradeRisk).toBeDefined();
    expect(report.bullBearEnergy).toBeDefined();
    expect(report.healthSummary).toBeDefined();
    expect(report.dynamicSignals).toBeDefined();
    expect(report.marketSentiment).toBeDefined();
    expect(report.aiConfidence).toBeDefined();
    expect(report.chipsSummary).toBeDefined();
    expect(report.forceDistribution).toBeDefined();
    expect(report.bullBearStrength).toBeDefined();
    expect(report.mainForceVerdict).toBeDefined();

    // 檢查底部任務標籤
    expect(report.activeTaskTab).toBe('TASK_1_COMPREHENSIVE');
  });

  describe('generateAiForceReportFromCandles - 真實日 K 資料管線驅動 (Ticket 34 / Stage 1)', () => {
    it('應能將真實日 K 數列正確轉化為具備 MA、KD、MACD、RSI 與動態水線之完整 Report', () => {
      // 構造 30 根真實/模擬 OHLCV 日 K
      const mockCandles = [];
      let base = 2000;
      for (let i = 0; i < 30; i++) {
        const close = base + (i % 3 === 0 ? 15 : -5);
        mockCandles.push({
          date: `2026-08-${String(i + 1).padStart(2, '0')}`,
          open: base,
          high: Math.max(base, close) + 10,
          low: Math.min(base, close) - 10,
          close,
          volume: 1000 + i * 50,
        });
        base = close;
      }

      const report = generateAiForceReportFromCandles('2330', '台積電', 'TW', mockCandles);

      expect(report.symbol).toBe('2330');
      expect(report.name).toBe('台積電');
      expect(report.market).toBe('TW');

      // 1. 頂部行情應反映最新一根日 K
      const last = mockCandles[mockCandles.length - 1];
      const prev = mockCandles[mockCandles.length - 2];
      expect(report.marketBar.currentPrice).toBe(last.close);
      expect(report.marketBar.openPrice).toBe(last.open);
      expect(report.marketBar.highPrice).toBe(last.high);
      expect(report.marketBar.lowPrice).toBe(last.low);
      expect(report.marketBar.volumeShares).toBe(last.volume);
      expect(report.marketBar.change).toBe(Number((last.close - prev.close).toFixed(2)));
      expect(report.marketBar.dataPointsCount).toBe(30);

      // 2. 01 主 K 線系統
      expect(report.klineSystem.candles.length).toBe(30);
      const lastKline = report.klineSystem.candles[report.klineSystem.candles.length - 1];
      expect(lastKline.close).toBe(last.close);
      expect(lastKline.ma5).toBeDefined();
      expect(lastKline.ma10).toBeDefined();
      expect(lastKline.ma20).toBeDefined();
      // 指標應存在
      expect(lastKline.k).toBeDefined();
      expect(lastKline.d).toBeDefined();

      // 關鍵水線動態計算
      expect(report.klineSystem.keyLevels.highResistance).toBeGreaterThan(report.klineSystem.keyLevels.supportLevel);
      expect(report.klineSystem.keyLevels.mainForceCost).toBeGreaterThan(0);

      // 3. 核心卡片動態驅動
      expect(report.volumeProfile.buckets.length).toBeGreaterThan(0);
      expect(report.forecastCone.timeNodes.length).toBeGreaterThan(0);
      expect(report.vwapCostStructure.mainForceVwap).toBeGreaterThan(0);
    });

    it('少於 5 根日 K 或空陣列時，應安全回退至預設 report，絕不崩潰', () => {
      const fallbackReport = generateAiForceReportFromCandles('2330', '台積電', 'TW', []);
      expect(fallbackReport.symbol).toBe('2330');
      expect(fallbackReport.marketBar).toBeDefined();
    });

    describe('三大法人籌碼歷史管線動態驅動 (Spec 0143 Ticket 1)', () => {
      it('傳入真實法人記錄時，應動態計算雙軸長條圖數列、累積淨買賣折線與近3日明細表格', () => {
        const mockCandles = Array.from({ length: 25 }, (_, i) => ({
          date: `2026-09-${String(i + 1).padStart(2, '0')}`,
          open: 1000 + i,
          high: 1010 + i,
          low: 990 + i,
          close: 1005 + i,
          volume: 2000 + i * 100,
        }));

        const mockInstitutions = Array.from({ length: 25 }, (_, i) => ({
          date: `2026-09-${String(i + 1).padStart(2, '0')}`,
          foreignShares: 100 * (i % 2 === 0 ? 1 : -1),
          trustShares: 50 * (i % 3 === 0 ? 1 : -1),
          dealerShares: 20,
        }));

        const report = generateAiForceReportFromCandles(
          '2330',
          '台積電',
          'TW',
          mockCandles,
          undefined,
          mockInstitutions
        );

        // 1. 歷史雙軸長條圖數列
        expect(report.institutionalFlow.history.length).toBe(25);
        expect(report.institutionalFlow.history[0].date).toBe('2026-09-01');
        expect(report.institutionalFlow.history[0].cumulativeTotalShares).toBe(100 + 50 + 20); // 170

        // 2. 近 3 日明細表格
        expect(report.institutionalFlow.recentDaysTable.length).toBe(3);
        // 第一筆應為最新日 2026-09-25
        expect(report.institutionalFlow.recentDaysTable[0].date).toContain('09/25');
        expect(report.institutionalFlow.recentDaysTable[0].totalShares).toBeDefined();

        // 3. 摘要統計字串
        expect(report.institutionalFlow.cumulative20DaysSummary).toMatch(/20日/);
        expect(report.institutionalFlow.recent5DaysSummary).toMatch(/張/);

        // 4. Card 15 (chipsSummary) 連動校驗
        expect(report.chipsSummary).toBeDefined();
        expect(report.chipsSummary.foreignNetShares).toBe(mockInstitutions[24].foreignShares);
        expect(report.chipsSummary.trustNetShares).toBe(mockInstitutions[24].trustShares);
        expect(report.chipsSummary.dealerNetShares).toBe(mockInstitutions[24].dealerShares);
        expect(report.chipsSummary.threeInstitutionsTotal).toBe(
          mockInstitutions[24].foreignShares + mockInstitutions[24].trustShares + mockInstitutions[24].dealerShares
        );
        expect(report.chipsSummary.sparklineHistory.length).toBe(10);
        expect(report.chipsSummary.conclusionBadge).toBeDefined();
      });

      it('當查詢美股或未傳入法人資料時，應以成交量多空代理模型安全降級，歷史數列非空且不拋錯', () => {
        const mockCandles = Array.from({ length: 20 }, (_, i) => ({
          date: `2026-09-${String(i + 1).padStart(2, '0')}`,
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 5000,
        }));

        const report = generateAiForceReportFromCandles('NVDA', '輝達', 'US', mockCandles);

        expect(report.institutionalFlow.history.length).toBeGreaterThan(0);
        expect(report.institutionalFlow.recentDaysTable.length).toBe(3);
        expect(report.institutionalFlow.cumulative20DaysSummary).toBeDefined();
        expect(report.institutionalFlow.recent5DaysSummary).toBeDefined();
      });
    });
  });
});

