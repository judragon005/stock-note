import { describe, it, expect } from 'vitest';
import {
  createDefaultAiForceReport,
  generateAiForceReportFromCandles,
  calculateValuationPercentile,
  isEtfSymbol,
} from './aiForceDashboardEngine';

function buildBullishUsCandles(days = 60, startPrice = 100) {
  const out = [];
  let p = startPrice;
  const base = new Date('2026-08-01T00:00:00Z');
  for (let i = 0; i < days; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const open = Number(p.toFixed(2));
    const close = Number((p * 1.008).toFixed(2));
    const high = Number((close * 1.004).toFixed(2));
    const low = Number((open * 0.996).toFixed(2));
    out.push({
      date: d.toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume: 3_500_000 + i * 40_000,
    });
    p = close;
  }
  return out;
}

describe('Spec 0239 T08 & T09 — 雙市場總經隔離、美股評分解鎖、算術一致性與 Zero-Mock 閘門', () => {
  it('1. 台股存在全域 macroData 時，嚴格隔離 usMacroData（不被劫持為美股視圖）且正確填入 twMacroData', () => {
    const candles = buildBullishUsCandles(30, 950).map((c) => ({ ...c, volume: 25_000_000 }));
    const report = generateAiForceReportFromCandles(
      '2330',
      '台積電',
      'TW',
      candles,
      undefined,
      undefined,
      new Date('2026-10-05T16:00:00+08:00'),
      {
        macroData: {
          date: '2026-10-05',
          cnn_fear_greed_score: 24.6,
          vix_close: 24.5,
          treasury_yield_10y: 5.1,
          tw_put_call_ratio: 118.4,
          tw_foreign_futures_oi: -32000,
          tw_trust_futures_oi: 28000,
          tw_derivatives_as_of_date: '2026-10-04',
        },
      }
    );

    expect(report.marketSentiment.isUsMarket).toBe(false);
    expect(report.marketSentiment.usMacroData).toBeUndefined();
    expect(report.marketSentiment.twMacroData?.putCallRatio).toBe(118.4);
    expect(report.marketSentiment.twMacroData?.foreignFuturesOi).toBe(-32000);
    expect(report.marketSentiment.twMacroData?.trustFuturesOi).toBe(28000);
    expect(report.marketSentiment.twMacroData?.asOfDateText).toBe('2026-10-04');
  });

  it('2. 美股多頭微結構應解鎖 Card 02/11/12/14/18（可亮綠燈、脫離 50% 鎖死、零 +0 張 / 元）並掛載 usMacroData', () => {
    const candles = buildBullishUsCandles(60, 110);
    const report = generateAiForceReportFromCandles(
      'NVDA',
      'NVIDIA Corp.',
      'US',
      candles,
      undefined,
      undefined,
      new Date('2026-10-05T10:00:00+08:00'),
      {
        macroData: {
          date: '2026-10-05',
          cnn_fear_greed_score: 68,
          vix_close: 15.2,
          treasury_yield_10y: 4.15,
          tw_put_call_ratio: 110,
        },
        us13fData: {
          institutionalRatio: 66.8,
          insiderRatio: 4.2,
          shortFloatRatio: 1.3,
          publicFloatRatio: 29.0,
        },
        valuationData: {
          pe: 48.2,
          forwardPe: 31.5,
          pb: 42.1,
          psRatio: 28.4,
          dividendYield: 0.1,
          eps: 0.78,
          quarterName: '2026Q3',
          grossMargin: 74.9,
          operatingMargin: 62.1,
        },
        quarterlyFinancials: [
          { year: 2025, quarter: 3, revenue: 26_000_000_000 },
          { year: 2026, quarter: 2, revenue: 30_000_000_000 },
          { year: 2026, quarter: 3, revenue: 35_100_000_000 },
        ],
      }
    );

    // 總經隔離
    expect(report.marketSentiment.isUsMarket).toBe(true);
    expect(report.marketSentiment.twMacroData).toBeUndefined();
    expect(report.marketSentiment.usMacroData?.cnnScore).toBe(68);
    expect(report.marketSentiment.usMacroData?.vixValue).toBe(15.2);
    expect(report.marketSentiment.usMacroData?.us10yYield).toBe(4.15);

    // 美股評分解鎖
    expect(report.healthSummary.chipHealth).toBeGreaterThan(50);
    expect(report.healthSummary.institutionalSupport).toBeGreaterThan(50);
    expect(report.dynamicSignals.verdictLight).toBe('GREEN');
    expect(report.dynamicSignals.compositeScore).toBeGreaterThanOrEqual(60);
    expect(report.dynamicSignals.chipSignal).not.toBe('籌碼中性');

    // Card 18 美股語意不洩漏台股「+0 張」或「元」
    expect(report.mainForceVerdict.isUsMarket).toBe(true);
    expect(report.mainForceVerdict.semanticTag).toBe('機構量價');
    expect(report.mainForceVerdict.fullVerdictText).not.toMatch(/法人近 5 日合計|\+0 張|元/);

    // Card 20 美股季營收
    expect(report.monthlyRevenue.isEmpty).toBe(false);
    expect(report.monthlyRevenue.isQuarterly).toBe(true);
    expect(report.monthlyRevenue.currency).toBe('USD');
    expect(report.monthlyRevenue.latestRevenueText).toBe('$35.10B');
    expect(report.monthlyRevenue.latestYoyRate).toBe(35);

    // Card 21 美股估值與 30% 稅後殖利率
    expect(report.valuationMetrics?.forwardPe).toBe(31.5);
    expect(report.valuationMetrics?.psRatio).toBe(28.4);
    expect(report.valuationMetrics?.netDividendYieldUs).toBe(0.07);
    expect(report.valuationMetrics?.isLossMaking).toBe(false);
  });

  it('3. ARINC 661 Zero-Mock 閘門：預設報表與 <5D 皆維持 isDataPending=true 且零假數值外洩', () => {
    const def = createDefaultAiForceReport('NVDA', 'NVIDIA', 'US', 140);
    expect(def.isDataPending).toBe(true);
    expect(def.aiConfidence.dataCompleteness).toBe(0);
    expect(def.mainForceVerdict.fullVerdictText).not.toContain('-64 張');
    expect(def.marketBar.currency).toBe('USD');
    expect(def.marketBar.volumeUnit).toBe('股');
    expect(def.valuationMetrics?.isEmpty).toBe(true);

    const shortCandles = buildBullishUsCandles(3, 50);
    const shortReport = generateAiForceReportFromCandles('TEST', 'TEST', 'US', shortCandles);
    expect(shortReport.isDataPending).toBe(true);
  });

  it('4. 權威分類與算術防呆：2881 富邦金非 ETF、14 日平盤 RSI=50、PE/PB 分位數可並存且樣本 <5 不標估值區間', () => {
    expect(isEtfSymbol('2881', '富邦金', 'TW')).toBe(false);
    expect(isEtfSymbol('2882', '國泰金', 'TW')).toBe(false);
    expect(isEtfSymbol('00403A', '主動統一升級50', 'TW')).toBe(true);
    expect(isEtfSymbol('VT', 'Vanguard Total World', 'US')).toBe(true);

    // 20 日平盤 RSI 應為 50 而非 100
    const flatCandles = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 500_000,
    }));
    const flatReport = generateAiForceReportFromCandles('2330', '台積電', 'TW', flatCandles);
    const lastK = flatReport.klineSystem.candles[flatReport.klineSystem.candles.length - 1];
    expect(lastK.rsi).toBe(50);

    // PE / PB 分位數並存
    const history6 = [10, 12, 14, 16, 18, 20].map((v, i) => ({ pe: v, pb: 1 + i * 0.5 }));
    const both = calculateValuationPercentile(15, 2.5, history6);
    expect(both.pePercentile).toBeDefined();
    expect(both.pbPercentile).toBeDefined();
    expect(both.valuationTier).toBe('FAIR');

    // 樣本 < 5 不強貼 FAIR
    const tiny = calculateValuationPercentile(15, 2.5, [{ pe: 10, pb: 1 }, { pe: 20, pb: 2 }]);
    expect(tiny.valuationTier).toBeUndefined();
  });
});
