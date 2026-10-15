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
  });
});
