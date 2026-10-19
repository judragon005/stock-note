import { describe, it, expect } from 'vitest';
import { createWarRoomPromptDigest } from './aiForcePromptAdapter';
import { AiForceDashboardReport } from '../types/aiForceDashboard';
import { HoldingPosition } from '../types/stock';

describe('Spec 0181 Ticket 06: aiForcePromptAdapter - 主力戰情室特徵轉接器測試', () => {
  const mockReportTw: AiForceDashboardReport = {
    symbol: '2330',
    name: '台積電',
    market: 'TW',
    updatedAt: '2026-10-15 10:30:00',
    activeTaskTab: 'TASK_1_COMPREHENSIVE',
    marketBar: {
      currentPrice: 1045,
      change: 15,
      changePercent: 1.46,
      volumeShares: 28500,
      latestTradingDate: '2026-10-15',
      dataPointsCount: 250,
      dataSourceText: 'TWSE Official',
      dataRangeText: '250 Trading Days',
      statusBadges: {
        aiScanActive: true,
        mainForceTracking: true,
        marketStatus: 'NORMAL',
        volatilityAlert: false,
      },
      marketStatusTag: 'NORMAL',
    },
    chipsSummary: {
      foreignInvestorsNetBuyShares: 12500,
      investmentTrustNetBuyShares: 3200,
      dealerNetBuyShares: -500,
      marginTradingBalanceShares: 18500,
      shortSellingBalanceShares: 1200,
      marginShortRatio: 6.48,
      foreignConsecutiveDays: 3,
      foreignAction: 'BUY',
      investmentTrustConsecutiveDays: 5,
      investmentTrustAction: 'BUY',
      asOfDateText: '2026-10-14 (盤後結算)',
    } as any,
    tdccDistribution: {
      concentrationBadge: '籌碼高度集中',
      largeShareholdersRatio: 87.42,
      asOfDateText: '2026-10-10',
      isEmpty: false,
    } as any,
    dayTradeRisk: {
      dayTradeRiskBadge: 'LOW',
      dayTradeRatioPercent: 18.5,
    } as any,
  } as unknown as AiForceDashboardReport;

  it('1. 台股報表特徵映射：應正確轉化即時量價、籌碼與 warRoomFeatures', () => {
    const mockReport: AiForceDashboardReport = {
      ...mockReportTw,
      chipsSummary: {
        foreignNetShares: 12500,
        trustNetShares: 3200,
        dealerNetShares: -500,
        threeInstitutionsTotal: 15200,
        conclusionBadge: '籌碼偏多',
        verdictNote: '正常',
        sparklineHistory: [],
      },
      tdccDistribution: {
        latestOver1000Ratio: 87.42,
        concentrationBadge: '籌碼高度集中',
        asOfDateText: '2026-10-10',
        isEmpty: false,
        history: [],
      },
      dayTradeRisk: {
        dayTradeRatio: 18.5,
        abnormalSelling: 10,
        turnoverRate: 2,
        pullbackRisk: 5,
        intradayVolatility: 8,
        riskLevel: 'LOW',
        riskIndex: 25,
      },
    };

    const digest = createWarRoomPromptDigest(mockReport);

    expect(digest.quote.symbol).toBe('2330');
    expect(digest.quote.name).toBe('台積電');
    expect(digest.audit.market).toBe('TW');
    expect(digest.quote.currentPrice).toBe(1045);
    expect(digest.quote.changePercent).toBe(1.46);

    // 驗證 warRoomFeatures
    expect(digest.warRoomFeatures).toBeDefined();
    expect(digest.warRoomFeatures?.foreignNetShares).toBe(12500);
    expect(digest.warRoomFeatures?.investmentTrustNetShares).toBe(3200);
    expect(digest.warRoomFeatures?.tdccLargeShareholdersPct).toBe(87.42);
    expect(digest.warRoomFeatures?.dayTradeRiskLevel).toBe('18.5%');
    expect(digest.warRoomFeatures?.statusTag).toBe('NORMAL');
  });

  it('2. 美股標的特徵映射：應標記為 US 且安全處理缺少欄位', () => {
    const mockReportUs: AiForceDashboardReport = {
      symbol: 'NVDA',
      name: 'NVIDIA Corp',
      market: 'US',
      updatedAt: '2026-10-15 04:00:00',
      activeTaskTab: 'TASK_1_COMPREHENSIVE',
      marketBar: {
        currentPrice: 135.5,
        change: 3.2,
        changePercent: 2.42,
        latestTradingDate: '2026-10-14',
        dataPointsCount: 250,
        dataSourceText: 'NASDAQ Live',
        dataRangeText: '250 Days',
        statusBadges: {
          aiScanActive: true,
          mainForceTracking: true,
          marketStatus: 'NORMAL',
          volatilityAlert: false,
        },
      },
    } as unknown as AiForceDashboardReport;

    const digest = createWarRoomPromptDigest(mockReportUs);

    expect(digest.quote.symbol).toBe('NVDA');
    expect(digest.audit.market).toBe('US');
    expect(digest.quote.currentPrice).toBe(135.5);
    expect(digest.warRoomFeatures?.foreignNetShares).toBeUndefined();
  });

  it('3. 持倉脫敏注入：若標的在持股清單中，應計算獲利狀態與資產比，絕不洩漏具體金額', () => {
    const holdings: HoldingPosition[] = [
      {
        symbol: '2330',
        name: '台積電',
        shares: 2000,
        avgCost: 950,
        currentPrice: 1045,
        market: 'TW',
        totalCostBasis: 1900000,
        marketValue: 2090000,
        unrealizedPnL: 190000,
        unrealizedPnLPercent: 10.0,
      } as unknown as HoldingPosition,
    ];

    const digest = createWarRoomPromptDigest(mockReportTw, holdings);

    expect(digest.desensitizedPortfolioContext).toBeDefined();
    expect(digest.desensitizedPortfolioContext?.status).toBe('IN_POSITION');
    expect(digest.desensitizedPortfolioContext?.avgCost).toBe(950);
    expect(digest.desensitizedPortfolioContext?.breakevenPrice).toBe(955.56);
    expect(digest.desensitizedPortfolioContext?.unrealizedGainLossSign).toBe('PROFIT');
    expect(digest.desensitizedPortfolioContext?.portfolioWeightPct).toBeGreaterThan(0);
  });

  describe('Spec 0182 專屬強化驗證 (Tickets 04 ~ 16)', () => {
    it('Ticket 04 & 06: 空手未建倉標的應標記為 ZERO_POSITION，持倉欄位均為 undefined', () => {
      const holdings: HoldingPosition[] = [
        {
          symbol: '2330',
          name: '台積電',
          shares: 1000,
          avgCost: 1000,
          currentPrice: 1045,
          market: 'TW',
        } as unknown as HoldingPosition,
      ];

      // 查詢 2344 華邦電，不在持股中
      const winbondReport: AiForceDashboardReport = {
        ...mockReportTw,
        symbol: '2344',
        name: '華邦電',
      };

      const digest = createWarRoomPromptDigest(winbondReport, holdings);

      expect(digest.desensitizedPortfolioContext).toBeDefined();
      expect(digest.desensitizedPortfolioContext?.status).toBe('ZERO_POSITION');
      expect(digest.desensitizedPortfolioContext?.avgCost).toBeUndefined();
      expect(digest.desensitizedPortfolioContext?.breakevenPrice).toBeUndefined();
      expect(digest.desensitizedPortfolioContext?.portfolioWeightPct).toBe(0);
    });

    it('Ticket 11 & 12: 景氣循環股 (如 2344 華邦電) 應正確標記 isCyclical=true 與單位 unitText="張"', () => {
      const winbondReport: AiForceDashboardReport = {
        ...mockReportTw,
        symbol: '2344',
        name: '華邦電',
      };

      const digest = createWarRoomPromptDigest(winbondReport);

      expect(digest.chips?.isCyclical).toBe(true);
      expect(digest.chips?.unitText).toContain('張');
      expect(digest.audit.isEtf).toBe(false);
    });

    it('Ticket 13: 拆分三大法人 1D 與 20D 籌碼累計，避免大模型誤解時態', () => {
      const winbondReport: AiForceDashboardReport = {
        ...mockReportTw,
        symbol: '2344',
        name: '華邦電',
        chipsSummary: {
          foreignInvestorsNetBuyShares: 1500,
          investmentTrustNetBuyShares: 300,
          dealerNetBuyShares: 200,
        } as any,
      };

      const digest = createWarRoomPromptDigest(winbondReport);

      expect(digest.chips?.totalNetShares1D).toBe(2000);
      expect(digest.chips?.foreignNetShares1D).toBe(1500);
      expect(digest.chips?.trustNetShares1D).toBe(300);
      expect(digest.chips?.unitText).toContain('張');
    });

    it('Spec 0194 Ticket 02: 盤中未結算成交量回退防禦，若 volumeShares 為 0 應由 realtimeQuote 回退補正', () => {
      const intradayReport: AiForceDashboardReport = {
        ...mockReportTw,
        symbol: '3260',
        name: '威剛',
        marketBar: {
          ...mockReportTw.marketBar,
          currentPrice: 360,
          change: 10,
          changePercent: 2.86,
          volumeShares: 0, // 盤中未結算或暫時為 0
        },
        realtimeQuote: {
          price: 360,
          change: 10,
          changePercent: 2.86,
          volume: 25410000, // 即時累計 25,410,000 股 = 25,410 張
        },
      } as any;

      const digest = createWarRoomPromptDigest(intradayReport);

      expect(digest.quote.volumeShares).toBe(25410);
      expect(digest.quote.volumeShares).toBeGreaterThan(0);
      expect(digest.chips.turnoverAmountTwdHundredMillion).toBeDefined();
    });

    it('Spec 0195 Ticket 06A: 戰情室外聯提示詞應注入 Card 21 估值狀態與 Card 13 美股宏觀情緒', () => {
      const reportWithValuation: AiForceDashboardReport = {
        ...mockReportTw,
        symbol: '2330',
        name: '台積電',
        valuationMetrics: {
          isEtf: false,
          isUsMarket: false,
          pe: 22.4,
          pb: 4.8,
          dividendYield: 2.1,
          valuationTier: 'FAIR',
          valuationTierText: '合理偏多估值',
          asOfDateText: '2026-10-16',
        },
        marketSentiment: {
          overallSentimentIndex: 72,
          sentimentState: 'GREED',
          retailSentimentPercent: 65,
          institutionalSentimentPercent: 70,
          mainForceSentimentPercent: 75,
        },
      } as any;

      const digest = createWarRoomPromptDigest(reportWithValuation);

      expect(digest.valuationStatus).toBeDefined();
      expect(digest.valuationStatus?.pe).toBe(22.4);
      expect(digest.valuationStatus?.pb).toBe(4.8);
      expect(digest.valuationStatus?.tier).toBe('合理偏多估值');
      expect(digest.fundamental?.pe).toBe(22.4);
      expect(digest.fundamental?.pb).toBe(4.8);
      expect(digest.fundamental?.dividendYield).toBe(2.1);
      expect(digest.macro.macroRegimeText).toContain('台股市場合情緒指數: 72 (GREED)');
    });

    it('Spec 0195 Ticket 06A: 美股模式下外聯提示詞應包含 CNN Fear & Greed 與 VIX', () => {
      const usReport: AiForceDashboardReport = {
        symbol: 'NVDA',
        name: 'NVIDIA Corp',
        market: 'US',
        marketBar: {
          currentPrice: 138,
          change: 2,
          changePercent: 1.47,
          latestTradingDate: '2026-10-16',
        },
        marketSentiment: {
          overallSentimentIndex: 68,
          sentimentState: 'GREED',
          isUsMarket: true,
          usMacroData: {
            cnnScore: 68,
            cnnRatingText: 'Greed',
            vix: 15.2,
            tenYearTreasury: 4.12,
            asOfDateText: '2026-10-16',
          },
        },
      } as any;

      const digest = createWarRoomPromptDigest(usReport);

      expect(digest.macro.cnnFearGreedScore).toBe(68);
      expect(digest.macro.vixClose).toBe(15.2);
      expect(digest.macro.treasuryYield10Y).toBe(4.12);
      expect(digest.macro.macroRegimeText).toContain('CNN Greed (68)');
      expect(digest.macro.macroRegimeText).toContain('VIX: 15.2');
    });
  });
});

