import { describe, it, expect, vi } from 'vitest';
import {
  fetchAndBuildOmniReport,
  generateOmniReportMarkdown,
} from './omniReportPipeline';
import { DailyCandle } from '../types/indicators';

describe('OmniReportPipeline - 隨選回補與報告管線測試', () => {
  const mockCandles: DailyCandle[] = Array.from({ length: 60 }, (_, i) => ({
    date: `2026-08-${String(i + 1).padStart(2, '0')}`,
    open: 100 + i,
    high: 102 + i,
    low: 99 + i,
    close: 101 + i,
    volume: 5000 + i * 10,
  }));

  it('能正確整合 K 線並組裝出 OmniIndicatorReport', async () => {
    const mockBackfill = vi.fn().mockResolvedValue({
      candles: mockCandles,
      indicators: [],
    });

    const report = await fetchAndBuildOmniReport('2330', 'TW', {
      backfillFn: mockBackfill,
      currentPrice: 160,
      previousClose: 159,
      name: '台積電',
    });

    expect(report.symbol).toBe('2330');
    expect(report.name).toBe('台積電');
    expect(report.market).toBe('TW');
    expect(report.candleCount).toBe(60);
    expect(report.confluence).toBeDefined();
    expect(report.confluence.marketRegime).toBeDefined();
    expect(report.confluence.actionMatrix).toBeDefined();
    expect(report.trend).toBeDefined();
    expect(report.momentum).toBeDefined();
    expect(report.levels).toBeDefined();
  });

  it('能產出結構完整、包含三層架構與實戰階梯矩陣的 Markdown 研報字串', () => {
    const mockReport = {
      symbol: '2330',
      name: '台積電',
      market: 'TW' as const,
      asOfDate: '2026-09-11',
      currentPrice: 950,
      previousClose: 940,
      dailyChange: 10,
      dailyChangePercent: 1.06,
      candleCount: 60,
      trend: {
        ma5: 945,
        ma20: 930,
        ma60: 900,
        maAlignment: 'BULLISH' as const,
        macd: { dif: 12.5, signal: 10.2, hist: 2.3, isGoldenCross: true, isDeathCross: false },
      },
      momentum: {
        rsi14: 68.5,
        rsiStatus: 'BULLISH' as const,
        kd9: { k: 82, d: 75, status: 'HIGH_DULL' as const },
        cci20: 110,
        williamsR14: -15,
      },
      volatility: {
        bollinger: { upper: 960, mid: 930, lower: 900, bandwidthPercent: 6.45, percentB: 0.83, isSqueeze: true },
        atr14: 18.5,
        trailingDefensePrice: 910,
        bias20Percent: 2.15,
        bias60Percent: 5.56,
      },
      volumeFlow: {
        yesterdayVolume: 35000,
        avgVolume5: 28000,
        avgVolume20: 25000,
        volumeRatio5: 1.25,
        isSurge: false,
        isDryUp: false,
        obv: { current: 150000, trend: 'RISING' as const },
      },
      levels: {
        darvasBox: { upper: 955, lower: 915, status: 'INSIDE_BOX' as const },
        fibonacci: { high: 955, low: 880, fib236: 937.3, fib382: 926.35, fib500: 917.5, fib618: 908.65, fib786: 896.05 },
        pivotPoints: { pivot: 945, r1: 960, r2: 975, s1: 930, s2: 915 },
      },
      confluence: {
        score: 82,
        rating: 'STRONG_BULL' as const,
        marketRegime: 'TRENDING_BULL' as const,
        regimeLabel: '🚀 強多主升 (Trending Bull)',
        oneSentenceBottomLine: '強勢多頭主升段！以 910 為動態移動停利防守線，突破 960 可順勢續抱。',
        contradictionPenaltyApplied: false,
        primarySignals: ['多天期均線呈多頭排列', '股價穩站 20 日月線之上', 'KD 高檔強勢鈍化軋空'],
        actionAdvice: '多頭共振動能強勁！建議順勢持有，以 ATR 動態防守線或箱頂為移動停利點。',
        riskAlert: undefined,
        clusters: {},
        actionMatrix: {
          primaryResistanceZone: { price: 960, label: '箱頂 + 布林上軌', distancePercent: 1.05 },
          expansionTargetZone: { price: 975, label: 'Pivot R2 加碼位', distancePercent: 2.63 },
          shortTermDefenseLine: { price: 930, label: '20MA / 樞紐線', distancePercent: -2.11 },
          structuralInvalidationLine: { price: 915, label: '箱底破位停損', distancePercent: -3.68 },
        },
        divergence: { hasBearishDivergence: false, hasBullishDivergence: false },
        priceActionTrap: { hasBullTrap: false, hasBearTrap: false },
      },
    };

    const md = generateOmniReportMarkdown(mockReport);
    expect(md).toContain('全能技術指標透視診斷報告');
    expect(md).toContain('【第 1 層】0秒決策核心');
    expect(md).toContain('【第 2 層】3秒實戰作戰地圖');
    expect(md).toContain('第一減碼 / 阻力區');
    expect(md).toContain('短線動態防守線');
    expect(md).toContain('**82 分**');
    expect(md).toContain('強多主升');
    expect(md).toContain('RSI(14)');
  });
});
