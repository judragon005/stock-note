import { describe, it, expect } from 'vitest';
import type { KlineCandleItem } from '../types/aiForceDashboard';
import {
  buildTechnicalResonance,
  arbitrateResonanceSummary,
  resolveRegimePillarWeights,
} from './technicalResonanceEngine';

function makeCandles(
  count: number,
  priceFn: (i: number) => { open: number; high: number; low: number; close: number; volume?: number; isIntraday?: boolean }
): KlineCandleItem[] {
  const start = Date.UTC(2026, 0, 1);
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(start + i * 86400 * 1000).toISOString().slice(0, 10);
    const p = priceFn(i);
    return {
      date: dt,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
      volume: p.volume ?? 1_000_000,
      isIntraday: p.isIntraday ?? false,
    };
  });
}

describe('technicalResonanceEngine (四維共鳴引擎與 8 項邊界契約 — Spec 0249 T05/T06)', () => {
  it('缺陷 1：盤中零量末筆 K 棒時，全四維支柱與 asOfDate 應統一退回前一已結算交易日定錨', () => {
    const candles = makeCandles(35, (i) => {
      const base = 100 + i * 0.8;
      if (i === 34) {
        // 模擬盤中未結算零量劇烈跳動，若未統一隔離將污染 asOfDate 與 RSI/KDJ
        return { open: base, high: base + 50, low: base, close: base + 50, volume: 0, isIntraday: true };
      }
      return { open: base - 0.3, high: base + 0.8, low: base - 0.8, close: base, volume: 1_500_000 };
    });

    const report = buildTechnicalResonance({ candles, timeframe: 'DAY', market: 'TW' });
    const settledOnlyReport = buildTechnicalResonance({
      candles: candles.slice(0, 34),
      timeframe: 'DAY',
      market: 'TW',
    });

    expect(report.volume.isVolumeAnchoredToPrevClose).toBe(true);
    expect(report.asOfDate).toBe(candles[33].date);
    expect(report.kdj.k).toBe(settledOnlyReport.kdj.k);
    expect(report.macd.dif).toBe(settledOnlyReport.macd.dif);
    expect(report.rsi.rsi14).toBe(settledOnlyReport.rsi.rsi14);
  });

  it('缺陷 2：高檔鈍化區發生死亡交叉時，應優先識別高檔死叉而非被鈍化標籤遮蔽', () => {
    // 連續強漲將 K、D 推升至 >80，最後一根急挫使 K 跌破 D（但 K、D 仍大於 75）
    const candles = makeCandles(35, (i) => {
      if (i < 34) {
        const c = 100 + i * 3;
        return { open: c - 1, high: c + 2, low: c - 2, close: c, volume: 2_000_000 };
      }
      const prevClose = 100 + 33 * 3;
      return { open: prevClose, high: prevClose + 1, low: prevClose - 22, close: prevClose - 20, volume: 3_000_000 };
    });

    const report = buildTechnicalResonance({ candles, timeframe: 'DAY', market: 'TW' });
    expect(report.kdj.isAvailable).toBe(true);
    expect(report.kdj.k!).toBeLessThan(report.kdj.d!);
    expect(report.kdj.tone).toBe('BEAR');
    expect(report.kdj.statusLabel).toContain('死亡交叉');
  });

  it('缺陷 3：四態計數不變量 bullCount + bearCount + warnCount + neutralCount 恆等於 4，且 WARN 不蒸發', () => {
    // 爆量長上影線 -> VOL = WARN
    const candles = makeCandles(35, (i) => {
      const base = 100 + Math.sin(i * 0.4) * 3;
      if (i === 34) {
        return { open: base, high: base + 12, low: base - 0.5, close: base + 0.5, volume: 5_000_000 };
      }
      return { open: base - 0.5, high: base + 1, low: base - 1, close: base, volume: 1_000_000 };
    });

    const report = buildTechnicalResonance({ candles, timeframe: 'DAY', market: 'TW' });
    const { bullCount, bearCount, warnCount, neutralCount } = report.summary;

    expect(report.volume.tone).toBe('WARN');
    expect(warnCount).toBeGreaterThanOrEqual(1);
    expect(bullCount + bearCount + warnCount + neutralCount).toBe(4);
  });

  it('缺陷 4：震盪盤文案「折減 35%」應與實際權重參數 0.65 一致，且 VOLATILITY_SQUEEZE 應啟用獨立權重', () => {
    // 平緩窄幅震盪形成低 ADX 盤整或布林壓縮
    const choppyCandles = makeCandles(40, (i) => {
      const base = 100 + (i % 2 === 0 ? 1.5 : -1.5);
      return { open: base, high: base + 2, low: base - 2, close: base, volume: 1_000_000 };
    });

    const report = buildTechnicalResonance({ candles: choppyCandles, timeframe: 'DAY', market: 'TW' });
    if (report.regime.type === 'CHOPPY_RANGE') {
      expect(report.regime.weightHint).toContain('35%');
      expect(report.regime.weightHint).not.toContain('60%');
    } else {
      expect(report.regime.type).toBe('VOLATILITY_SQUEEZE');
      expect(report.regime.weightHint).toContain('量能');
    }
  });

  it('缺陷 6：偏多帶警戒 (overallTone=WARN 且 bullCount > bearCount) 時，失效防線應為多方防守而非空頭轉強', () => {
    const summary = arbitrateResonanceSummary({
      enriched: [],
      regime: 'TRENDING_BULL',
      regimeLabel: '強多主升體制',
      volume: {
        isAvailable: true,
        isVolumeAnchoredToPrevClose: false,
        volumeDisplay: 5000,
        volumeUnit: '張',
        obvTrend: 'RISING',
        statusLabel: '爆量滯漲警戒',
        tone: 'WARN',
        interpretation: '',
      },
      kdj: { isAvailable: true, statusLabel: '多方發散續強', tone: 'BULL', interpretation: '' },
      macd: {
        isAvailable: true,
        histStreakDays: 5,
        zeroAxisPosition: 'ABOVE',
        divergence: 'NONE',
        statusLabel: '零軸上紅柱擴張',
        tone: 'BULL',
        interpretation: '',
      },
      rsi: {
        isAvailable: true,
        crossState: 'NEUTRAL',
        divergence: 'BEARISH',
        statusLabel: 'RSI 頂背離',
        tone: 'WARN',
        interpretation: '',
      },
      keyLevels: { supportLevel: 135, highResistance: 160 },
    });

    expect(summary.overallTone).toBe('WARN');
    expect(summary.bullCount).toBe(2);
    expect(summary.warnCount).toBe(2);
    expect(summary.invalidationRule).toContain('失效防線');
    expect(summary.invalidationRule).toContain('135.00');
  });

  it('缺陷 7：歷史 250 日條件勝率遇未來第 10 日異常零價 (fwd.close <= 0) 應安全略過，絕不回傳 NaN/Infinity', () => {
    const candles = makeCandles(60, (i) => {
      const wave = 100 + Math.sin(i * 0.5) * 15;
      // 在序列中段安插異常 0 價收盤
      const close = i === 35 || i === 42 ? 0 : wave;
      return {
        open: close,
        high: close + 2,
        low: Math.max(0, close - 2),
        close,
        volume: 1_000_000,
      };
    });

    const report = buildTechnicalResonance({ candles, timeframe: 'DAY', market: 'TW' });
    const stat = report.summary.historicalWinRate;
    if (stat.isSufficient) {
      expect(Number.isFinite(stat.winRatePercent)).toBe(true);
      expect(Number.isFinite(stat.avgReturn10dPercent)).toBe(true);
    } else {
      expect(stat.sampleCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('缺陷 4 & 5：VOLATILITY_SQUEEZE 權重矩陣總和為 4.0（VOL+MACD 主導），且空頭遇底背離衝突降級為 WARN', () => {
    const sqWeights = resolveRegimePillarWeights('VOLATILITY_SQUEEZE');
    expect(sqWeights).toEqual({ vol: 1.4, kdj: 0.7, macd: 1.2, rsi: 0.7 });
    expect(sqWeights.vol + sqWeights.kdj + sqWeights.macd + sqWeights.rsi).toBeCloseTo(4.0, 5);

    const summary = arbitrateResonanceSummary({
      enriched: [],
      regime: 'TRENDING_BEAR',
      regimeLabel: '空頭主跌體制',
      volume: {
        isAvailable: true,
        isVolumeAnchoredToPrevClose: false,
        volumeDisplay: 1000,
        volumeUnit: '張',
        obvTrend: 'FALLING',
        statusLabel: '資金流出偏空',
        tone: 'BEAR',
        interpretation: '',
      },
      kdj: { isAvailable: true, statusLabel: '空方收斂修正', tone: 'BEAR', interpretation: '' },
      macd: {
        isAvailable: true,
        histStreakDays: 3,
        zeroAxisPosition: 'BELOW',
        divergence: 'BULLISH',
        statusLabel: '底背離築底',
        tone: 'BULL',
        interpretation: '',
      },
      rsi: {
        isAvailable: true,
        crossState: 'NEUTRAL',
        divergence: 'NONE',
        statusLabel: '空方偏弱整理',
        tone: 'BEAR',
        interpretation: '',
      },
      keyLevels: { supportLevel: 90, highResistance: 110 },
    });

    expect(summary.hasConflict).toBe(true);
    expect(summary.overallTone).toBe('WARN');
    expect(summary.conflictAlert).toContain('底背離');
    expect(summary.bullCount + summary.bearCount + summary.warnCount + summary.neutralCount).toBe(4);
  });
});
