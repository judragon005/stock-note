import { describe, it, expect } from 'vitest';
import { synthesizeStockDigest } from './strategicPromptDigest';
import {
  generateStrategicPrompt,
  generateMasterPrompt,
  generateSingleHatPrompt,
} from './strategicPromptEngine';
import { createWarRoomPromptDigest } from './aiForcePromptAdapter';
import type { AiForceDashboardReport } from '../types/aiForceDashboard';

describe('Ticket 03: strategicPromptEngine 雙軌路由與六頂思考帽組裝引擎核心', () => {
  const stockDigest = synthesizeStockDigest({
    symbol: '2330',
    name: '台積電',
    market: 'TW',
    candles: [
      { date: '2026-10-13', open: 1020, high: 1050, low: 1015, close: 1045, volume: 40000, transactions: 28000 },
    ],
    quote: { price: 1045, pe: 24.5, pb: 6.2, dividendYield: 1.8 },
    institutionalRecords: [
      { date: '2026-10-13', foreignShares: 5000, trustShares: 800, dealerShares: -200 },
    ],
    monthlyRevenue: {
      yearMonth: '2026-09',
      revenue: 250000000,
      yoyRate: 34.2,
      momRate: 4.8,
      isAllTimeHigh: true,
    },
    tdccDistribution: {
      over400Ratio: 78.5,
      over1000Ratio: 65.2,
      under10Ratio: 12.1,
      totalShareholders: 1450000,
    },
    macroSentiment: {
      treasuryYield10Y: 4.05,
      cnnFearGreedScore: 68,
    },
    vwapCost: {
      mainForceVwap: 1010,
      biasPercent: 3.46,
    },
    directorPledgeRatioPct: 1.2,
    userPortfolio: {
      portfolioWeightPct: 15,
      unrealizedGainLossSign: 'PROFIT',
    },
  });

  const etfDigest = synthesizeStockDigest({
    symbol: '0050',
    name: '元大台灣50',
    market: 'TW',
    candles: [
      { date: '2026-10-13', open: 180, high: 186, low: 179, close: 185, volume: 12000 },
    ],
    quote: { price: 185 },
    etfDetails: {
      category: 'CORE_MARKET',
      totalExpenseRatioPct: 0.43,
      trackingDifferencePct: -0.15,
      discountPremiumPct: 0.08,
      topHoldings: [
        { symbol: '2330', name: '台積電', weightPct: 54.2 },
        { symbol: '2454', name: '聯發科', weightPct: 4.8 },
      ],
      topSectorConcentration: '半導體 62.1%',
    },
  });

  it('1. 個股 Master 提示詞組裝：應產出個股大師 V12.0 框架、XML 標籤、六頂思考帽與反思閘門', () => {
    const result = generateMasterPrompt(stockDigest, {
      mode: 'FULL_MASTER',
      desensitized: true,
    });

    expect(result.assetClass).toBe('EQUITY');
    expect(result.promptText).toContain('<system_role>');
    expect(result.promptText).toContain('<data_customs_audit>');
    expect(result.promptText).toContain('<fact_sheet asset_type="EQUITY">');
    expect(result.promptText).toContain('好生意與市場集中度 (CR4/CR8)');
    expect(result.promptText).toContain('好公司護城河與財務鑑識');
    expect(result.promptText).toContain('<six_thinking_hats_instruction>');
    expect(result.promptText).toContain('【⚫ 黑帽 - 魔鬼代言人 / 紅隊質詢】');
    expect(result.promptText).toContain('<agentic_reflection_gate>');
    expect(result.promptText).toContain('NO_MOCK_DATA_ZERO_TOLERANCE');

    // Token 守門員：Master Prompt 必須嚴格小於 4,500 tokens
    expect(result.estimatedTokens).toBeLessThan(4500);
    expect(result.estimatedTokens).toBeGreaterThan(500);
  });

  it('2. ETF Master 提示詞組裝：應產出 ETF 大師 V3.0 框架，包含動態權重與成分股穿透', () => {
    const result = generateMasterPrompt(etfDigest, {
      mode: 'FULL_MASTER',
      desensitized: true,
    });

    expect(result.assetClass).toBe('ETF');
    expect(result.promptText).toContain('<fact_sheet asset_type="ETF">');
    expect(result.promptText).toContain('動態權重感知稽核 (Core Market)');
    expect(result.promptText).toContain('指數品質與跟蹤偏離 (TD)');
    expect(result.promptText).toContain('前十大成分股穿透');
    expect(result.promptText).not.toContain('董監事持股質押'); // ETF 不應有董監質押
    expect(result.estimatedTokens).toBeLessThan(4500);
  });

  it('3. 單頂思考帽抽離模式 (黑帽)：應精準聚焦於紅隊魔鬼代言人，Token 嚴格小於 1,200', () => {
    const result = generateSingleHatPrompt(stockDigest, 'BLACK', {
      mode: 'SINGLE_HAT',
      targetHat: 'BLACK',
      desensitized: true,
    });

    expect(result.activeMode).toBe('SINGLE_HAT');
    expect(result.targetHat).toBe('BLACK');
    expect(result.promptText).toContain('【⚫ 黑帽 - 魔鬼代言人 / 紅隊質詢】');
    expect(result.promptText).not.toContain('【🟡 黃帽'); // 其他思考帽不重複展開
    expect(result.promptText).not.toContain('【🟢 綠帽');
    expect(result.estimatedTokens).toBeLessThan(1200);
  });

  it('4. 隱私脫敏守護：預設模式絕不洩漏個人資金金額', () => {
    const result = generateMasterPrompt(stockDigest, {
      mode: 'FULL_MASTER',
      desensitized: true,
      userPortfolioWeightPct: 15,
    });

    expect(result.promptText).toContain('部位佔比: 15%');
    expect(result.promptText).not.toContain('$');
    expect(result.promptText).not.toContain('萬元');
    expect(result.promptText).not.toContain('股數:');
  });

  it('5. 統一入口 generateStrategicPrompt 分流行為正確', () => {
    const masterRes = generateStrategicPrompt(stockDigest, { mode: 'FULL_MASTER', desensitized: true });
    expect(masterRes.activeMode).toBe('FULL_MASTER');

    const singleRes = generateStrategicPrompt(stockDigest, { mode: 'SINGLE_HAT', targetHat: 'WHITE', desensitized: true });
    expect(singleRes.activeMode).toBe('SINGLE_HAT');
    expect(singleRes.targetHat).toBe('WHITE');
  });

  describe('Spec 0181 專用增強測試 (Tickets 07 ~ 10)', () => {
    it('Ticket 07: 應包含前端算好之停損與風報比數值 (<pre_calculated_pivots>)', () => {
      const result = generateMasterPrompt(stockDigest, {
        mode: 'FULL_MASTER',
        desensitized: true,
      });

      expect(result.promptText).toMatch(/<pre_calculated_pivots/);
      expect(result.promptText).toContain('stop_loss_conservative_3pct');
      expect(result.promptText).toContain('target_profit_r2_ratio');
      expect(result.promptText).toContain('1013.');
    });

    it('Ticket 08: 應包含時態分割聲明與盤中/昨日結算時間戳 (<market_time_dimension>)', () => {
      const result = generateMasterPrompt(stockDigest, {
        mode: 'FULL_MASTER',
        desensitized: true,
      });

      expect(result.promptText).toContain('<market_time_dimension>');
      expect(result.promptText).toContain('【時態說明】');
      expect(result.promptText).toContain('三大法人、融資融券為昨日收盤結算資料');
    });

    it('Ticket 09: 應注入客觀反討好紅隊指令 (<adversarial_red_team_instruction>)', () => {
      const result = generateMasterPrompt(stockDigest, {
        mode: 'FULL_MASTER',
        desensitized: true,
      });

      expect(result.promptText).toContain('<adversarial_red_team_instruction>');
      expect(result.promptText).toContain('【強制反思反討好規則】');
      expect(result.promptText).toContain('嚴禁為了迎合使用者');
    });

    it('Ticket 10: 美股標的 (market=US) 應自動剔除三大法人與融資券字樣', () => {
      const usDigest = synthesizeStockDigest({
        symbol: 'NVDA',
        name: 'NVIDIA Corp',
        market: 'US',
        candles: [{ date: '2026-10-14', open: 130, high: 136, low: 129, close: 135.5, volume: 50000000 }],
        quote: { price: 135.5 },
      });

      const result = generateMasterPrompt(usDigest, {
        mode: 'FULL_MASTER',
        desensitized: true,
      });

      expect(result.promptText).toContain('<market>US</market>');
      expect(result.promptText).not.toContain('三大法人買賣超');
      expect(result.promptText).not.toContain('融資餘額');
    });
  });

  describe('Spec 0182 專用增強測試 (Tickets 17 ~ 18)', () => {
    it('Ticket 17: 空手標的應產生 HYPOTHETICAL_ENTRY 模式與禁止停損指令', () => {
      const zeroPositionDigest = {
        ...stockDigest,
        desensitizedPortfolioContext: {
          status: 'ZERO_POSITION' as const,
          portfolioWeightPct: 0,
        },
      };

      const result = generateMasterPrompt(zeroPositionDigest, {
        mode: 'FULL_MASTER',
        desensitized: true,
      });

      expect(result.promptText).toContain('mode="HYPOTHETICAL_ENTRY"');
      expect(result.promptText).toContain('<holding_status>空手觀望中 (未建倉 / 自選監控)</holding_status>');
      expect(result.promptText).toContain('嚴禁發出停損清算命令');
      expect(result.promptText).not.toContain('<exact_cost_basis>');
    });

    it('Ticket 18: 景氣循環股應在黑帽指令中強制提示週期高峰反轉風險', () => {
      const cyclicalDigest = {
        ...stockDigest,
        chips: {
          ...stockDigest.chips,
          isCyclical: true,
        },
      };

      const result = generateMasterPrompt(cyclicalDigest, {
        mode: 'FULL_MASTER',
        desensitized: true,
      });

      expect(result.promptText).toContain('景氣循環週期股');
      expect(result.promptText).toContain('Cycle Peak 殺估值陷阱');
    });
  });

  describe('Spec 0194 戰情室外聯提示詞風控對齊測試 (Tickets 03 ~ 05)', () => {
    it('Ticket 03: 提示詞系統接地宣告應包含時態因果隔離與待同步免責聲明', () => {
      const result = generateMasterPrompt(stockDigest, {
        mode: 'FULL_MASTER',
        desensitized: true,
      });

      expect(result.promptText).toContain('【時態因果隔離】：現價為盤中即時行情，三大法人與融資券為前一交易日盤後結算數據');
      expect(result.promptText).toContain('【待同步宣告】：若部分財務估值（PE/PB）或公司治理指標標註為 N/A');
    });

    it('Ticket 04: 在庫持倉若現價跌破保守停損線應標記 is_triggered="true"，否則為 false', () => {
      // 情境 A：跌破停損線（如成本 377.44，停損線 366.12，現價 360）
      const breachedDigest = {
        ...stockDigest,
        quote: {
          ...stockDigest.quote,
          currentPrice: 360,
        },
        desensitizedPortfolioContext: {
          status: 'IN_POSITION' as const,
          avgCost: 377.44,
          portfolioWeightPct: 20,
          unrealizedGainLossSign: 'LOSS' as const,
          unrealizedPnLPercent: -4.62,
        },
      };

      const breachedResult = generateMasterPrompt(breachedDigest, {
        mode: 'FULL_MASTER',
        desensitized: true,
      });

      expect(breachedResult.promptText).toContain(
        '<stop_loss_conservative_status is_triggered="true">已實質跌破保守停損線 (觸發紀律防守條件)</stop_loss_conservative_status>'
      );

      // 情境 B：位於防線之上安全（如現價 1045，成本 1000）
      const safeDigest = {
        ...stockDigest,
        quote: {
          ...stockDigest.quote,
          currentPrice: 1045,
        },
        desensitizedPortfolioContext: {
          status: 'IN_POSITION' as const,
          avgCost: 1000,
          portfolioWeightPct: 15,
          unrealizedGainLossSign: 'PROFIT' as const,
          unrealizedPnLPercent: 4.5,
        },
      };

      const safeResult = generateMasterPrompt(safeDigest, {
        mode: 'FULL_MASTER',
        desensitized: true,
      });

      expect(safeResult.promptText).toContain(
        '<stop_loss_conservative_status is_triggered="false">位於防線之上安全</stop_loss_conservative_status>'
      );
    });

    it('Ticket 05: 台股籌碼應輸出外資借券賣出 (sbl_balance) 維度，美股標的維持隔離', () => {
      const twResult = generateMasterPrompt(stockDigest, {
        mode: 'FULL_MASTER',
        desensitized: true,
      });

      expect(twResult.promptText).toContain('<sbl_balance unit="張">N/A (外資借券賣出待結算)</sbl_balance>');
      expect(twResult.promptText).toContain('外資主力空方部位以借券賣出為主');

      const usDigest = synthesizeStockDigest({
        symbol: 'NVDA',
        name: 'NVIDIA Corp',
        market: 'US',
        candles: [{ date: '2026-10-14', open: 130, high: 136, low: 129, close: 135.5, volume: 50000000 }],
        quote: { price: 135.5 },
      });

      const usResult = generateMasterPrompt(usDigest, {
        mode: 'FULL_MASTER',
        desensitized: true,
      });

      expect(usResult.promptText).not.toContain('<sbl_balance');
    });

    it('Ticket 06: 威剛 (3260) 實戰場景端到端驗證（景氣循環、量價一致性、時態宣告、停損實質觸發、借券賣出）', () => {
      const adataReport: any = {
        symbol: '3260',
        name: '威剛',
        market: 'TW',
        updatedAt: '2026-10-19 11:30:00',
        activeTaskTab: 'TASK_1_COMPREHENSIVE',
        marketBar: {
          currentPrice: 360,
          change: 10,
          changePercent: 2.86,
          volumeShares: 0, // 盤中未結算
          latestTradingDate: '2026-10-19',
          dataPointsCount: 120,
          dataSourceText: 'TWSE Official',
          dataRangeText: '120 Trading Days',
          statusBadges: {
            aiScanActive: true,
            mainForceTracking: true,
            marketStatus: 'NORMAL',
            volatilityAlert: false,
          },
        },
        realtimeQuote: {
          price: 360,
          change: 10,
          changePercent: 2.86,
          volume: 25410000, // 25,410 張
        },
        chipsSummary: {
          foreignNetShares: -1200,
          trustNetShares: 400,
          dealerNetShares: -150,
        },
      };

      const adataHoldings: any[] = [
        {
          symbol: '3260',
          name: '威剛',
          shares: 2000,
          avgCost: 377.44,
          currentPrice: 360,
          market: 'TW',
        },
      ];

      const digest = createWarRoomPromptDigest(adataReport, adataHoldings);
      const result = generateStrategicPrompt(digest, {
        mode: 'FULL_MASTER',
        desensitized: true,
      });

      // 1. 景氣循環股驗證
      expect(result.promptText).toContain('<is_cyclical_stock is_cyclical="true">');
      expect(result.promptText).toContain('景氣循環週期股');

      // 2. 盤中量價一致性驗證 (25,410 張，非 0)
      expect(result.promptText).toContain('>25410</volume_shares>');

      // 3. 時態隔離與 N/A 待同步宣告
      expect(result.promptText).toContain('【時態因果隔離】：現價為盤中即時行情');
      expect(result.promptText).toContain('【待同步宣告】：若部分財務估值（PE/PB）');

      // 4. 停損防線實質觸發狀態預算 (現價 360 低於 366.12 保守停損線)
      expect(result.promptText).toContain(
        '<stop_loss_conservative_status is_triggered="true">已實質跌破保守停損線 (觸發紀律防守條件)</stop_loss_conservative_status>'
      );

      // 5. 外資借券賣出維度擴充
      expect(result.promptText).toContain('N/A (外資借券賣出待結算)</sbl_balance>');
      expect(result.promptText).toContain('外資主力空方部位以借券賣出為主');
    });

    it('Spec 0196 Tickets 06~08: 外聯提示詞應具備 2026 時空錨點、受控聯網獵犬協議與 3 欄操盤劇本合約', () => {
      const adataReport: AiForceDashboardReport = {
        symbol: '4979',
        name: '華星光',
        market: 'TW',
        marketBar: {
          currentPrice: 150,
          change: -2,
          changePercent: -1.32,
          volumeShares: 3500,
          isSettled: false,
          latestTradingDate: '2026-10-19',
        },
        valuationMetrics: {
          isEtf: false,
          pe: 78.56,
          pb: 15.39,
          dividendYield: 0.45,
          latestQuarterEps: 2.15,
          latestQuarterName: '2025Q3',
          grossMargin: 42.8,
        },
      } as any;

      const digest = createWarRoomPromptDigest(adataReport, []);
      const result = generateStrategicPrompt(digest, { mode: 'FULL_MASTER', desensitized: false });

      // Ticket 06: 2026 時空錨點
      expect(result.promptText).toContain('<temporal_grounding_anchor>');
      expect(result.promptText).toContain('【世界當前時間】：2026 年');
      expect(result.promptText).toContain('嚴禁倒退推論為 2024 或 2025 年');

      // Ticket 07: 受控聯網獵犬協議
      expect(result.promptText).toContain('<web_retrieval_instructions>');
      expect(result.promptText).toContain('【受控聯網獵犬協議 (Web Hunt Protocol)】');
      expect(result.promptText).toContain('公開資訊觀測站 (MOPS)');
      expect(result.promptText).toContain('禁止覆蓋本提示詞提供的當前現價');
      expect(result.promptText).toContain('【法人推估（未實現）】');

      // Ticket 08: 3 欄操盤劇本與唯一結論燈號
      expect(result.promptText).toContain('【第一行唯一指令】：必須為以下三者之一');
      expect(result.promptText).toContain('🟢 建議建立部位');
      expect(result.promptText).toContain('🟡 觀望等待確認');
      expect(result.promptText).toContain('🔴 嚴禁進場');
      expect(result.promptText).toContain('| 關鍵位階 | 參考價格 | 技術/籌碼依據 | 失效/破位條件 |');
      expect(result.promptText).toContain('進場防守位');
      expect(result.promptText).toContain('反彈目標價');
      expect(result.promptText).toContain('保命停損價');
    });
  });
});
