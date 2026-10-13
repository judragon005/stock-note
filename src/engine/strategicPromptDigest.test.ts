import { describe, it, expect } from 'vitest';
import {
  synthesizeStockDigest,
  estimateTokenCount,
  determineEtfCategory,
} from './strategicPromptDigest';
import type { DailyCandle } from '../types/indicators';

describe('Ticket 02: strategicPromptDigest 特徵語意壓縮層與 Token 守門引擎', () => {
  const mockCandles: DailyCandle[] = [
    { date: '2026-10-09', open: 1000, high: 1010, low: 995, close: 1005, volume: 20000, transactions: 15000 },
    { date: '2026-10-12', open: 1005, high: 1025, low: 1000, close: 1020, volume: 25000, transactions: 18000 },
    { date: '2026-10-13', open: 1020, high: 1050, low: 1015, close: 1045, volume: 40000, transactions: 28000 },
  ];

  it('1. 個股特徵提取：應精準壓縮行情均線、籌碼、營收與海關定錨', () => {
    const digest = synthesizeStockDigest({
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      candles: mockCandles,
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
        yieldSpread10Y2Y: 0.18,
        cnnFearGreedScore: 68,
        vixClose: 14.2,
      },
      vwapCost: {
        mainForceVwap: 1010,
        biasPercent: 3.46,
      },
      directorPledgeRatioPct: 1.2,
    });

    // 斷言資產類別為個股
    expect(digest.audit.isEtf).toBe(false);
    expect(digest.audit.market).toBe('TW');
    expect(digest.audit.anchorTradingDate).toBe('2026-10-13');

    // 斷言行情特徵
    expect(digest.quote.currentPrice).toBe(1045);
    expect(digest.quote.transactionsCount).toBe(28000);
    expect(digest.quote.volumeRatio20D).toBeGreaterThan(0);

    // 斷言籌碼與大戶特徵
    expect(digest.chips.totalNetShares20D).toBe(5600);
    expect(digest.chips.bigHolderRatioChange400).toBe(78.5);
    expect(digest.chips.mainForceVwap20D).toBe(1010);
    expect(digest.chips.currentVwapBiasPct).toBe(3.46);

    // 斷言基本面與營收
    expect(digest.fundamental).toBeDefined();
    expect(digest.fundamental?.isMonthlyRevenueAllTimeHigh).toBe(true);
    expect(digest.fundamental?.monthlyRevenueYoY).toBe(34.2);
    expect(digest.fundamental?.directorPledgeRatioPct).toBe(1.2);
    expect(digest.etf).toBeUndefined();
  });

  it('2. ETF 標的感知：輸入 0050 應自動切換為 ETF 穿透與動態權重結構', () => {
    const digest = synthesizeStockDigest({
      symbol: '0050',
      name: '元大台灣50',
      market: 'TW',
      candles: mockCandles,
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

    // 斷言為 ETF
    expect(digest.audit.isEtf).toBe(true);
    expect(digest.fundamental).toBeUndefined();
    expect(digest.etf).toBeDefined();
    expect(digest.etf?.category).toBe('CORE_MARKET');
    expect(digest.etf?.weightMatrix.indexQuality).toBe(35);
    expect(digest.etf?.totalExpenseRatioPct).toBe(0.43);
    expect(digest.etf?.topHoldings.length).toBe(2);
  });

  it('3. 美股跨市場平滑降級：無法人數據時應平滑轉換且零崩潰', () => {
    const digest = synthesizeStockDigest({
      symbol: 'NVDA',
      name: '輝達',
      market: 'US',
      candles: [
        { date: '2026-10-12', open: 130, high: 136, low: 129, close: 135, volume: 45000000 },
      ],
      quote: { price: 135, pe: 42.1 },
    });

    expect(digest.audit.market).toBe('US');
    expect(digest.audit.isEtf).toBe(false);
    expect(digest.chips.microstructureSummary).toContain('美股');
    expect(digest.chips.foreignNetShares20D).toBeUndefined();
    expect(digest.fundamental?.monthlyRevenueYearMonth).toBeUndefined();
  });

  it('4. Zero-Mock Policy 驗證：缺位數據嚴禁捏造，標註 N/A 或 undefined', () => {
    const digest = synthesizeStockDigest({
      symbol: '3008',
      name: '大立光',
      market: 'TW',
    });

    expect(digest.quote.currentPrice).toBe(0);
    expect(digest.quote.transactionsCount).toBeUndefined();
    expect(digest.chips.totalNetShares20D).toBeUndefined();
    expect(digest.fundamental?.isMonthlyRevenueAllTimeHigh).toBe(false);
  });

  it('5. Token 估算器：估算中文與英文文本之 Token 數合理性', () => {
    const sampleText = '台積電 (2330) 今日收盤價 1045 元，成交量放大。The current price is 1045 USD.';
    const tokenCount = estimateTokenCount(sampleText);
    expect(tokenCount).toBeGreaterThan(15);
    expect(tokenCount).toBeLessThan(70);
  });

  it('6. ETF 動態權重配置判定：高股息與主題型權重矩陣驗證', () => {
    const highDivWeights = determineEtfCategory('0056', '元大高股息');
    expect(highDivWeights.category).toBe('HIGH_DIVIDEND');
    expect(highDivWeights.weights.costEfficiency).toBe(40);
    expect(highDivWeights.weights.practicalDecision).toBe(30);

    const thematicWeights = determineEtfCategory('00830', '國泰費城半導體');
    expect(thematicWeights.category).toBe('THEMATIC');
    expect(thematicWeights.weights.indexQuality).toBe(45);
  });
});
