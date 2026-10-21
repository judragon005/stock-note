import { describe, it, expect } from 'vitest';
import { generateStrategicPrompt } from './strategicPromptEngine';
import { createWarRoomPromptDigest } from './aiForcePromptAdapter';
import { AiForceDashboardReport } from '../types/aiForceDashboard';

describe('Spec 0196 Ticket 09: 戰情室外聯提示詞受控聯網獵犬協議與上櫃官方估值端到端整合驗收', () => {
  it('E2E-1: 上櫃 4979 華星光（含單季財報、外資均量比率、受控聯網獵犬協議與 3 欄操盤劇本）', () => {
    const mockCandles = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      open: 150,
      high: 155,
      low: 148,
      close: 152,
      volume: 5000, // 20D 均量 5000 張
    }));

    const mockReport4979: AiForceDashboardReport = {
      symbol: '4979',
      name: '華星光',
      market: 'TW',
      updatedAt: '2026-10-20 13:30:00',
      activeTaskTab: 'TASK_1_COMPREHENSIVE',
      marketBar: {
        currentPrice: 158.5,
        change: 6.5,
        changePercent: 4.28,
        volumeShares: 12500,
        latestTradingDate: '2026-10-20',
        dataPointsCount: 250,
        dataSourceText: 'TPEx Official',
        dataRangeText: '250 Trading Days',
        statusBadges: {
          aiScanActive: true,
          mainForceTracking: true,
          marketStatus: 'NORMAL',
          volatilityAlert: false,
        },
        marketStatusTag: 'NORMAL',
        isSettled: true,
      },
      klineSystem: {
        candles: mockCandles,
      },
      chipsSummary: {
        foreignNetShares: 1500, // 1500 / 5000 = 30.0%
        trustNetShares: 600,   // 600 / 5000 = 12.0%
        marginTradingBalanceShares: 12500,
        shortSellingBalanceShares: 850,
        marginShortRatio: 6.8,
        foreignConsecutiveDays: 4,
        foreignAction: 'BUY',
        investmentTrustConsecutiveDays: 3,
        investmentTrustAction: 'BUY',
        asOfDateText: '2026-10-20',
      } as any,
      tdccDistribution: {
        concentrationBadge: '主力持續吸籌',
        largeShareholdersRatio: 68.5,
        asOfDateText: '2026-10-17',
        isEmpty: false,
      } as any,
      dayTradeRisk: {
        dayTradeRiskBadge: 'MEDIUM',
        dayTradeRatioPercent: 38.2,
      } as any,
      valuationMetrics: {
        pe: 28.5,
        pb: 3.2,
        dividendYield: 1.8,
        latestQuarterEps: 1.25,
        latestQuarterName: '2026Q2',
        grossMargin: 36.8,
        operatingMargin: 18.5,
      },
    } as unknown as AiForceDashboardReport;

    const digest = createWarRoomPromptDigest(mockReport4979);

    // 驗證特徵轉接器欄位映射
    expect(digest.fundamental?.pe).toBe(28.5);
    expect(digest.fundamental?.pb).toBe(3.2);
    expect(digest.fundamental?.latestQuarterEps).toBe(1.25);
    expect(digest.fundamental?.latestQuarterName).toBe('2026Q2');
    expect(digest.fundamental?.grossMarginPct).toBe(36.8);
    expect(digest.fundamental?.operatingMarginPct).toBe(18.5);
    expect(digest.chips.foreignRatio20D).toBe(30.0);
    expect(digest.chips.trustRatio20D).toBe(12.0);

    // 生成 Master Prompt
    const result = generateStrategicPrompt(digest, { mode: 'FULL_MASTER', desensitized: false });
    const prompt = result.promptText;

    // 驗證時空錨點
    expect(prompt).toContain('<temporal_grounding_anchor>');
    expect(prompt).toContain('【世界當前時間】：2026 年');
    expect(prompt).toContain('嚴禁倒退推論為 2024 或 2025 年');

    // 驗證受控聯網獵犬協議
    expect(prompt).toContain('<web_retrieval_instructions>');
    expect(prompt).toContain('【受控聯網獵犬協議 (Web Hunt Protocol)】');
    expect(prompt).toContain('公開資訊觀測站 (MOPS)');
    expect(prompt).toContain('證券櫃檯買賣中心 (TPEx)');
    expect(prompt).toContain('預估與實績強制隔離');
    expect(prompt).toContain('禁止覆蓋本提示詞提供的當前現價');

    // 驗證輸出格式契約
    expect(prompt).toContain('<output_format>');
    expect(prompt).toContain('【第一行唯一指令】：必須為以下三者之一');
    expect(prompt).toContain('【實戰作戰點位表】');
    expect(prompt).toContain('【下檔暴雷風險質詢】');

    // 驗證單季財報特徵注入
    expect(prompt).toContain('<latest_quarter_financials quarter="2026Q2"><eps unit="元">1.25</eps><gross_margin unit="%">36.8%</gross_margin><operating_margin unit="%">18.5%</operating_margin></latest_quarter_financials>');

    // 驗證籌碼均量比率注入
    expect(prompt).toContain('佔 20 日均量 30%');
    expect(prompt).toContain('佔 20 日均量 12%');

    // 驗證 Token 門禁 (< 4800，因 4979 納入景氣循環標的增列循環股估值指引)
    expect(result.estimatedTokens).toBeLessThan(4800);
  });

  it('E2E-2: 上櫃 3260 威剛（盤中量為 0 回退標記前日收盤量與官方估值）', () => {
    const mockReport3260: AiForceDashboardReport = {
      symbol: '3260',
      name: '威剛',
      market: 'TW',
      updatedAt: '2026-10-20 09:05:00',
      activeTaskTab: 'TASK_1_COMPREHENSIVE',
      marketBar: {
        currentPrice: 98.2,
        change: -0.8,
        changePercent: -0.81,
        volumeShares: 0,
        latestTradingDate: '2026-10-20',
        dataPointsCount: 250,
        dataSourceText: 'TPEx Official',
        dataRangeText: '250 Trading Days',
        statusBadges: {
          aiScanActive: true,
          mainForceTracking: true,
          marketStatus: 'NORMAL',
          volatilityAlert: false,
        },
        marketStatusTag: 'NORMAL',
        isSettled: false,
      },
      klineSystem: {
        candles: [
          { date: '2026-10-19', open: 99.0, high: 100.0, low: 98.0, close: 99.0, volume: 9230 },
        ],
      },
      chipsSummary: {
        foreignNetShares: -800,
        trustNetShares: 120,
        marginTradingBalanceShares: 22100,
        shortSellingBalanceShares: 430,
        asOfDateText: '2026-10-19',
      } as any,
      valuationMetrics: {
        pe: 11.2,
        pb: 1.45,
        dividendYield: 4.8,
        latestQuarterEps: 2.15,
        latestQuarterName: '2026Q2',
      },
    } as unknown as AiForceDashboardReport;

    const digest = createWarRoomPromptDigest(mockReport3260);

    expect(digest.quote.intradayVolumeNote).toBe('盤中撮合中 (前一交易日收盤量: 9230 張)');

    const result = generateStrategicPrompt(digest, { mode: 'FULL_MASTER', desensitized: false });
    const prompt = result.promptText;

    expect(prompt).toContain('盤中撮合中 (前一交易日收盤量: 9230 張)');
    expect(prompt).toContain('<pe_ratio>11.2</pe_ratio>');
    expect(prompt).toContain('<pb_ratio>1.45</pb_ratio>');
    expect(prompt).toContain('<dividend_yield>4.8%</dividend_yield>');
  });

  it('E2E-3: ETF 0050 元大台灣50（無單季毛利率但具備時空錨點與契約）', () => {
    const mockReport0050: AiForceDashboardReport = {
      symbol: '0050',
      name: '元大台灣50',
      market: 'TW',
      updatedAt: '2026-10-20 13:30:00',
      activeTaskTab: 'TASK_1_COMPREHENSIVE',
      marketBar: {
        currentPrice: 195.0,
        change: 1.5,
        changePercent: 0.78,
        volumeShares: 18500,
        latestTradingDate: '2026-10-20',
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
        isSettled: true,
      },
      chipsSummary: {
        foreignNetShares: 4500,
        trustNetShares: -300,
        marginTradingBalanceShares: 3200,
        shortSellingBalanceShares: 110,
        asOfDateText: '2026-10-20',
      } as any,
    } as unknown as AiForceDashboardReport;

    const digest = createWarRoomPromptDigest(mockReport0050);
    const result = generateStrategicPrompt(digest, { mode: 'FULL_MASTER', desensitized: false });
    const prompt = result.promptText;

    expect(prompt).toContain('<temporal_grounding_anchor>');
    expect(prompt).toContain('<web_retrieval_instructions>');
    expect(prompt).toContain('<output_format>');
    expect(prompt).toContain('【第一行唯一指令】');
  });

  it('E2E-4: Spec 0197 華星光 4979 官方估值注入、月營收最新月份、自適應度量衡與光通訊景氣循環全量整合驗收', () => {
    // 模擬 20 根日 K，每根 volume 為「股數」1,500,000 股（即 1,500 張）
    const mockCandlesInShares = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      open: 150,
      high: 155,
      low: 148,
      close: 152,
      volume: 1500000, // 股數
    }));

    const mockReport4979: AiForceDashboardReport = {
      symbol: '4979',
      name: '華星光',
      market: 'TW',
      updatedAt: '2026-10-20 13:30:00',
      activeTaskTab: 'TASK_1_COMPREHENSIVE',
      marketBar: {
        currentPrice: 158.5,
        change: 6.5,
        changePercent: 4.28,
        volumeShares: 1376, // 1376 張
        latestTradingDate: '2026-10-20',
        dataPointsCount: 250,
        dataSourceText: 'TPEx Official',
        dataRangeText: '250 Trading Days',
        statusBadges: {
          aiScanActive: true,
          mainForceTracking: true,
          marketStatus: 'NORMAL',
          volatilityAlert: false,
        },
        marketStatusTag: 'NORMAL',
        isSettled: true,
      },
      klineSystem: {
        candles: mockCandlesInShares,
      },
      chipsSummary: {
        foreignNetShares: 355, // 355 張
        trustNetShares: 45,    // 45 張
        marginTradingBalanceShares: 12500,
        shortSellingBalanceShares: 850,
        marginShortRatio: 6.8,
        foreignConsecutiveDays: 4,
        foreignAction: 'BUY',
        investmentTrustConsecutiveDays: 3,
        investmentTrustAction: 'BUY',
        asOfDateText: '2026-10-20',
      } as any,
      valuationMetrics: {
        pe: 78.56,
        pb: 15.39,
        dividendYield: 0.0,
      },
      monthlyRevenue: {
        history: [
          { yearMonth: '2025-10', revenue: 210000000, mom: -5.2, yoy: 15.3 },
          { yearMonth: '2026-08', revenue: 310000000, mom: 8.5, yoy: 45.2 },
          { yearMonth: '2026-09', revenue: 350000000, mom: 12.9, yoy: 66.7 },
        ],
      } as any,
    } as unknown as AiForceDashboardReport;

    const digest = createWarRoomPromptDigest(mockReport4979);

    // 1. 驗證特徵轉接器之循環股判定
    expect(digest.chips.isCyclical).toBe(true);

    // 2. 驗證度量衡自動校準：日 K 均量 1,500,000 股自動轉 1,500 張，外資 355 張 / 1500 張 = 23.7%
    expect(digest.chips.foreignRatio20D).toBe(23.7);
    expect(digest.quote.volumeRatio20D).toBe(0.92);

    // 3. 驗證月營收最新月份取 2026-09，絕不取 2025-10
    expect(digest.fundamental?.monthlyRevenueYearMonth).toBe('2026-09');

    // 4. 驗證官方估值 PE/PB
    expect(digest.fundamental?.pe).toBe(78.56);
    expect(digest.fundamental?.pb).toBe(15.39);

    // 生成 Master Prompt
    const result = generateStrategicPrompt(digest, { mode: 'FULL_MASTER', desensitized: false });
    const prompt = result.promptText;

    // 5. 驗證 Master Prompt 輸出
    expect(prompt).toContain('<pe_ratio>78.56</pe_ratio>');
    expect(prompt).toContain('<pb_ratio>15.39</pb_ratio>');
    expect(prompt).toContain('<monthly_revenue_period>2026-09</monthly_revenue_period>');
    expect(prompt).not.toContain('2025-10');
    expect(prompt).toContain('23.7%');
    expect(prompt).toContain('景氣循環週期股');
    expect(prompt).not.toContain('待評估 / 待評估');
  });
});

