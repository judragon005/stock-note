import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createWarRoomPromptDigest } from './aiForcePromptAdapter';
import { WarRoomPromptCard } from '../components/aiForceDashboard/WarRoomPromptCard';
import { synthesizeStockDigest } from './strategicPromptDigest';
import * as strategyPinEngine from './strategyPinEngine';
import { AiForceDashboardReport } from '../types/aiForceDashboard';
import { PinnedStrategy } from '../types/strategyPin';

/**
 * 建立最小可執行台股/美股戰情室報表夾具
 */
function buildBaseReport(overrides: Partial<AiForceDashboardReport> = {}): AiForceDashboardReport {
  return {
    symbol: '2330',
    name: '台積電',
    market: 'TW',
    updatedAt: '2026-10-20 13:30:00',
    activeTaskTab: 'TASK_1_COMPREHENSIVE',
    marketBar: {
      currentPrice: 1000,
      change: 10,
      changePercent: 1.01,
      volumeShares: 2000,
      latestTradingDate: '2026-10-20',
      dataPointsCount: 60,
      dataSourceText: 'TWSE',
      dataRangeText: '60D',
      isSettled: true,
      statusBadges: {
        aiScanActive: true,
        mainForceTracking: true,
        marketStatus: 'NORMAL',
        volatilityAlert: false,
      },
    },
    ...overrides,
  } as unknown as AiForceDashboardReport;
}

describe('Spec 0239 T09: 提示詞轉接器契約修復與停損警報防線', () => {
  describe('1. aiForcePromptAdapter.ts 統一權威分類與數據口徑修復', () => {
    it('應採用統一權威資產分類器 isCanonicalEtfSymbol：2881 富邦金/2882 國泰金必為個股，VT/00403A 必為 ETF', () => {
      const fubonDigest = createWarRoomPromptDigest(
        buildBaseReport({ symbol: '2881', name: '富邦金', market: 'TW' })
      );
      expect(fubonDigest.audit.isEtf).toBe(false);
      expect(fubonDigest.fundamental).toBeDefined();
      expect(fubonDigest.etf).toBeUndefined();

      const cathayDigest = createWarRoomPromptDigest(
        buildBaseReport({ symbol: '2882', name: '國泰金', market: 'TW' })
      );
      expect(cathayDigest.audit.isEtf).toBe(false);

      const vtDigest = createWarRoomPromptDigest(
        buildBaseReport({ symbol: 'VT', name: 'Vanguard Total World Stock ETF', market: 'US' })
      );
      expect(vtDigest.audit.isEtf).toBe(true);
      expect(vtDigest.etf).toBeDefined();
      expect(vtDigest.fundamental).toBeUndefined();

      const activeEtfDigest = createWarRoomPromptDigest(
        buildBaseReport({ symbol: '00403A', name: '主動統一台股增長', market: 'TW' })
      );
      expect(activeEtfDigest.audit.isEtf).toBe(true);
      expect(activeEtfDigest.etf).toBeDefined();
      expect(activeEtfDigest.fundamental).toBeUndefined();

      // 驗證有正確傳入 name 與 market 至 isCanonicalEtfSymbol（名稱含 ETF 字樣亦能正確辨識）
      const namedEtfDigest = createWarRoomPromptDigest(
        buildBaseReport({ symbol: 'CUSTOM1', name: '全球科技創新 ETF', market: 'US' })
      );
      expect(namedEtfDigest.audit.isEtf).toBe(true);
    });

    it('應對 institutionalFlow.history 明確執行 .slice(-20) 後再計算 20D 法人合計（不得加總全歷史 60 天）', () => {
      // 前 40 天放巨大干擾數值，近 20 天放精確可驗證數值
      const older40Days = Array.from({ length: 40 }, (_, i) => ({
        date: `2026-07-${String((i % 28) + 1).padStart(2, '0')}`,
        foreignShares: 10000,
        trustShares: 5000,
        dealerShares: 2000,
        cumulativeTotalShares: 17000,
      }));
      const recent20Days = Array.from({ length: 20 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        foreignShares: 100,
        trustShares: 50,
        dealerShares: -20,
        cumulativeTotalShares: 130,
      }));

      const report = buildBaseReport({
        institutionalFlow: {
          history: [...older40Days, ...recent20Days],
          recentDaysTable: [],
          cumulative20DaysSummary: '多頭',
          recent5DaysSummary: '偏多',
        },
      });

      const digest = createWarRoomPromptDigest(report);

      expect(digest.chips.foreignNetShares20D).toBe(2000);
      expect(digest.chips.trustNetShares20D).toBe(1000);
      expect(digest.chips.dealerNetShares20D).toBe(-400);
      expect(digest.chips.totalNetShares20D).toBe(2600);
    });

    it('應依 report.market === TW 或 marketBar.volumeUnit 明確換算成交量單位，移除 >=10000 啟發式避免低量台股誤差 1000 倍', () => {
      // 低量台股：每日成交 5,000 股 (= 5 張)，今日成交 10 張，外資買 2 張、投信賣 1 張
      const lowVolTwCandles = Array.from({ length: 20 }, (_, i) => ({
        date: `2026-09-${String(i + 1).padStart(2, '0')}`,
        open: 50,
        high: 52,
        low: 49,
        close: 50,
        volume: 5000, // 原始股數 5,000 股 = 5 張 (< 10000 舊門檻)
      }));

      const lowVolTwReport = buildBaseReport({
        symbol: '9999',
        name: '低量台股',
        market: 'TW',
        marketBar: {
          currentPrice: 50,
          change: 0.5,
          changePercent: 1.0,
          volumeShares: 10, // 10 張
          volumeUnit: '張',
          latestTradingDate: '2026-10-20',
          dataPointsCount: 20,
          dataSourceText: 'TWSE',
          dataRangeText: '20D',
          isSettled: true,
          statusBadges: {
            aiScanActive: true,
            mainForceTracking: true,
            marketStatus: 'NORMAL',
            volatilityAlert: false,
          },
        },
        klineSystem: {
          candles: lowVolTwCandles,
          keyLevels: { highResistance: 55, mainForceCost: 50, supportLevel: 45 },
        },
        chipsSummary: {
          foreignNetShares: 2, // 2 / 5 = 40.0%
          trustNetShares: -1,  // -1 / 5 = -20.0%
          dealerNetShares: 0,
          threeInstitutionsTotal: 1,
          verdictNote: '中性',
          conclusionBadge: '中性',
          sparklineHistory: [],
        },
      });

      const twDigest = createWarRoomPromptDigest(lowVolTwReport);
      expect(twDigest.quote.volumeRatio20D).toBe(2);
      expect(twDigest.chips.foreignRatio20D).toBe(40);
      expect(twDigest.chips.trustRatio20D).toBe(-20);

      // 低量台股盤中未結算回退標籤亦應明確除以 1000 轉張 (5000 股 -> 5 張)
      const intradayLowVolReport = buildBaseReport({
        symbol: '9999',
        name: '低量台股',
        market: 'TW',
        marketBar: {
          currentPrice: 50,
          volumeShares: 0,
          isSettled: false,
          latestTradingDate: '2026-10-20',
          dataPointsCount: 1,
          dataSourceText: 'TWSE',
          dataRangeText: '1D',
          statusBadges: {
            aiScanActive: true,
            mainForceTracking: true,
            marketStatus: 'NORMAL',
            volatilityAlert: false,
          },
        },
        klineSystem: {
          candles: [{ date: '2026-10-19', open: 50, high: 51, low: 49, close: 50, volume: 5000 }],
          keyLevels: { highResistance: 55, mainForceCost: 50, supportLevel: 45 },
        },
      });
      const intradayDigest = createWarRoomPromptDigest(intradayLowVolReport);
      expect(intradayDigest.quote.intradayVolumeNote).toBe('盤中撮合中 (前一交易日收盤量: 5 張)');

      // 美股 (market: 'US' / volumeUnit: '股') 不除以 1000
      const usCandles = Array.from({ length: 20 }, (_, i) => ({
        date: `2026-09-${String(i + 1).padStart(2, '0')}`,
        open: 100,
        high: 102,
        low: 98,
        close: 100,
        volume: 50000, // 50,000 股
      }));
      const usReport = buildBaseReport({
        symbol: 'NVDA',
        name: 'NVIDIA',
        market: 'US',
        marketBar: {
          currentPrice: 100,
          volumeShares: 75000, // 75,000 股
          volumeUnit: '股',
          latestTradingDate: '2026-10-20',
          dataPointsCount: 20,
          dataSourceText: 'Yahoo',
          dataRangeText: '20D',
          isSettled: true,
          statusBadges: {
            aiScanActive: true,
            mainForceTracking: true,
            marketStatus: 'NORMAL',
            volatilityAlert: false,
          },
        },
        klineSystem: {
          candles: usCandles,
          keyLevels: { highResistance: 110, mainForceCost: 100, supportLevel: 90 },
        },
      });
      const usDigest = createWarRoomPromptDigest(usReport);
      expect(usDigest.quote.volumeRatio20D).toBe(1.5);
    });

    it('bigHolderRatioChange400 與 retailHolderCountChange 應採用真實 4 週變化值，無資料時誠實為 null（嚴禁拿絕對比率冒充）', () => {
      // 有真實 4 週變化值的情境
      const reportWithChanges = buildBaseReport({
        tdccDistribution: {
          concentrationBadge: '籌碼集中',
          asOfDateText: '2026-10-16',
          isEmpty: false,
          latestOver1000Ratio: 88.5,
          change4WeeksRatio: 1.75,
          change4WeeksShareholders: -2150,
          history: [
            { date: '2026-09-18', totalShareholders: 120000, over1000Ratio: 86.75, over400Ratio: 90.1, under10Ratio: 5.2 },
            { date: '2026-10-16', totalShareholders: 117850, over1000Ratio: 88.5, over400Ratio: 91.4, under10Ratio: 4.8 },
          ],
        },
      });
      const digestWithChanges = createWarRoomPromptDigest(reportWithChanges);
      expect(digestWithChanges.chips.bigHolderRatioChange1000).toBe(1.75);
      expect(digestWithChanges.chips.bigHolderRatioChange400).toBe(1.3);
      expect(digestWithChanges.chips.retailHolderCountChange).toBe(-2150);

      // 只有單週絕對比率、無 4 週變化欄位的情境 -> 誠實為 null
      const reportWithoutChanges = buildBaseReport({
        tdccDistribution: {
          concentrationBadge: '籌碼中性',
          asOfDateText: '2026-10-16',
          isEmpty: false,
          latestOver1000Ratio: 88.5,
          history: [
            { date: '2026-10-16', totalShareholders: 117850, over1000Ratio: 88.5, over400Ratio: 91.4, under10Ratio: 4.8 },
          ],
        },
      });
      const digestWithoutChanges = createWarRoomPromptDigest(reportWithoutChanges);
      expect(digestWithoutChanges.chips.bigHolderRatioChange1000).toBeNull();
      expect(digestWithoutChanges.chips.bigHolderRatioChange400).toBeNull();
      expect(digestWithoutChanges.chips.retailHolderCountChange).toBeNull();
    });

    it('cnnFearGreedScore 僅能取自 marketSentiment.usMacroData?.cnnScore，缺失時為 null（嚴禁拿台股 overallSentimentIndex 冒充）', () => {
      // 台股僅有 overallSentimentIndex，無 usMacroData
      const twReport = buildBaseReport({
        market: 'TW',
        marketSentiment: {
          overallSentimentIndex: 72,
          sentimentState: 'GREED',
          retailSentimentPercent: 60,
          institutionalSentimentPercent: 75,
          mainForceSentimentPercent: 80,
        },
      });
      const twDigest = createWarRoomPromptDigest(twReport);
      expect(twDigest.macro.cnnFearGreedScore).toBeNull();

      // 美股有 usMacroData.cnnScore
      const usReport = buildBaseReport({
        symbol: 'NVDA',
        name: 'NVIDIA',
        market: 'US',
        marketSentiment: {
          overallSentimentIndex: 80,
          sentimentState: 'GREED',
          retailSentimentPercent: 65,
          institutionalSentimentPercent: 70,
          mainForceSentimentPercent: 75,
          isUsMarket: true,
          usMacroData: {
            cnnScore: 34,
            cnnRatingText: 'Fear',
            vix: 22.1,
          },
        },
      });
      const usDigest = createWarRoomPromptDigest(usReport);
      expect(usDigest.macro.cnnFearGreedScore).toBe(34);
    });

    it('董監質押應僅由 valuationMetrics.directorPledgeRatio 讀取，不再讀取不存在的 healthSummary.directorPledgeRatio', () => {
      const reportWithValuationPledge = buildBaseReport({
        valuationMetrics: {
          isEtf: false,
          directorPledgeRatio: 14.567,
        },
      });
      const digestValid = createWarRoomPromptDigest(reportWithValuationPledge);
      expect(digestValid.fundamental?.directorPledgeRatioPct).toBe(14.57);

      // 僅在不存在的舊欄位 healthSummary.directorPledgeRatio 塞值時，必須維持 undefined
      const reportWithStaleHealthPledge = buildBaseReport({
        valuationMetrics: {
          isEtf: false,
        },
        healthSummary: {
          chipHealth: 60,
          technicalStructure: 70,
          capitalMomentum: 65,
          liquidityRisk: 10,
          institutionalSupport: 55,
          overallRatingLabel: '良',
          directorPledgeRatio: 66.6,
        } as any,
      });
      const digestStale = createWarRoomPromptDigest(reportWithStaleHealthPledge);
      expect(digestStale.fundamental?.directorPledgeRatioPct).toBeUndefined();
    });
  });

  describe('2. WarRoomPromptCard.tsx 停損警報防線與勝率榜文案一致性', () => {
    const samplePin: PinnedStrategy = {
      id: 'pin-2344',
      symbol: '2344',
      aiModel: 'Claude 3.5 Sonnet',
      verdict: '防守型持倉',
      stopLoss: 153.46,
      takeProfit: 170,
      validityDays: 5,
      createdAt: '2026-10-20T00:00:00.000Z',
      expiresAt: '2026-10-25T00:00:00.000Z',
      isExpired: false,
      acknowledgedAlert: false,
    };

    const validDigest = synthesizeStockDigest({
      symbol: '2344',
      name: '華邦電',
      market: 'TW',
      candles: [{ date: '2026-10-20', open: 155, high: 156, low: 149, close: 150, volume: 50000 }],
      quote: { price: 150 },
    });

    const zeroPriceDigest = {
      ...validDigest,
      quote: {
        ...validDigest.quote,
        currentPrice: 0,
      },
    };

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('isLoading=true 時禁止呼叫 evaluateMultiStrategyTriggers 且不得顯示停損警報', () => {
      vi.spyOn(strategyPinEngine, 'getPinnedStrategies').mockReturnValue([samplePin]);
      vi.spyOn(strategyPinEngine, 'getStrategyOutcomeRecords').mockReturnValue([]);
      const evalSpy = vi.spyOn(strategyPinEngine, 'evaluateMultiStrategyTriggers');

      const html = renderToStaticMarkup(
        React.createElement(WarRoomPromptCard, {
          digest: validDigest,
          isLoading: true,
        })
      );

      expect(evalSpy).not.toHaveBeenCalled();
      expect(html).not.toContain('intraday-trigger-alert');
      expect(html).not.toContain('跌破停損線');
    });

    it('isDataPending=true 時禁止呼叫 evaluateMultiStrategyTriggers 且不得顯示停損警報', () => {
      vi.spyOn(strategyPinEngine, 'getPinnedStrategies').mockReturnValue([samplePin]);
      vi.spyOn(strategyPinEngine, 'getStrategyOutcomeRecords').mockReturnValue([]);
      const evalSpy = vi.spyOn(strategyPinEngine, 'evaluateMultiStrategyTriggers');

      const html = renderToStaticMarkup(
        React.createElement(WarRoomPromptCard, {
          digest: validDigest,
          isDataPending: true,
        })
      );

      expect(evalSpy).not.toHaveBeenCalled();
      expect(html).not.toContain('intraday-trigger-alert');
      expect(html).not.toContain('跌破停損線');
    });

    it('currentPrice <= 0 或 NaN 時禁止呼叫 evaluateMultiStrategyTriggers（杜絕 0 <= stopLoss 假警報）', () => {
      vi.spyOn(strategyPinEngine, 'getPinnedStrategies').mockReturnValue([samplePin]);
      vi.spyOn(strategyPinEngine, 'getStrategyOutcomeRecords').mockReturnValue([]);
      const evalSpy = vi.spyOn(strategyPinEngine, 'evaluateMultiStrategyTriggers');

      const htmlZero = renderToStaticMarkup(
        React.createElement(WarRoomPromptCard, {
          digest: zeroPriceDigest,
        })
      );
      expect(evalSpy).not.toHaveBeenCalled();
      expect(htmlZero).not.toContain('intraday-trigger-alert');
      expect(htmlZero).not.toContain('跌破停損線');

      const nanDigest = {
        ...validDigest,
        quote: { ...validDigest.quote, currentPrice: Number.NaN },
      };
      const htmlNan = renderToStaticMarkup(
        React.createElement(WarRoomPromptCard, {
          digest: nanDigest,
        })
      );
      expect(evalSpy).not.toHaveBeenCalled();
      expect(htmlNan).not.toContain('intraday-trigger-alert');
    });

    it('有效現價且非載入/待命態時，應正常呼叫 evaluateMultiStrategyTriggers 並觸發停損警報', () => {
      vi.spyOn(strategyPinEngine, 'getPinnedStrategies').mockReturnValue([samplePin]);
      vi.spyOn(strategyPinEngine, 'getStrategyOutcomeRecords').mockReturnValue([]);
      const evalSpy = vi.spyOn(strategyPinEngine, 'evaluateMultiStrategyTriggers');

      const html = renderToStaticMarkup(
        React.createElement(WarRoomPromptCard, {
          digest: validDigest,
          isLoading: false,
          isDataPending: false,
        })
      );

      expect(evalSpy).toHaveBeenCalledTimes(1);
      expect(evalSpy).toHaveBeenCalledWith([samplePin], 150);
      expect(html).toContain('intraday-trigger-alert');
      expect(html).toContain('跌破停損線');
    });

    it('勝率榜空狀態文案應與實際按鈕文字 WIN / LOSS 一致，不再出現脫節的「獲利達標」「停損出場」', () => {
      vi.spyOn(strategyPinEngine, 'getPinnedStrategies').mockReturnValue([samplePin]);
      vi.spyOn(strategyPinEngine, 'getStrategyOutcomeRecords').mockReturnValue([]);

      const html = renderToStaticMarkup(
        React.createElement(WarRoomPromptCard, {
          digest: validDigest,
          defaultShowLeaderboard: true,
        })
      );

      expect(html).toContain('leaderboard-drawer');
      expect(html).toContain('WIN');
      expect(html).toContain('LOSS');
      expect(html).not.toContain('點擊「獲利達標」或「停損出場」');
    });
  });
});
