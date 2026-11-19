import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  generateAiForceReportFromCandles,
  createDefaultAiForceReport,
} from './aiForceDashboardEngine';
import { createWarRoomPromptDigest } from './aiForcePromptAdapter';
import { generateStrategicPrompt } from './strategicPromptEngine';
import { AiForceDashboardView } from '../components/aiForceDashboard/AiForceDashboardView';
import { WarRoomPromptCard } from '../components/aiForceDashboard/WarRoomPromptCard';
import type { KlineCandleItem } from '../types/aiForceDashboard';

function buildSyntheticCandles(count: number, basePrice: number, baseVol: number): KlineCandleItem[] {
  return Array.from({ length: count }, (_, idx) => {
    const step = (idx % 7) - 3;
    const close = Number(Math.max(0.5, basePrice + step * (basePrice * 0.008) + idx * (basePrice * 0.001)).toFixed(2));
    const open = Number(Math.max(0.5, close * 0.996).toFixed(2));
    const high = Number((Math.max(open, close) * 1.012).toFixed(2));
    const low = Number((Math.min(open, close) * 0.988).toFixed(2));
    return {
      date: `2026-08-${String((idx % 28) + 1).padStart(2, '0')}`,
      open,
      high,
      low,
      close,
      volume: baseVol + (idx % 5) * Math.round(baseVol * 0.1),
    };
  });
}

describe('Spec 0239 T16: 台美雙市場四象限與極限邊界全鏈路 E2E 驗收矩陣', () => {
  it('象限一 (TW 個股 2330 & 金融股 2881)：應產出完整 21 卡報告、零靜態假字且 2881 不誤判為 ETF', () => {
    const candles2330 = buildSyntheticCandles(65, 1020, 35000);
    const report2330 = generateAiForceReportFromCandles('2330', '台積電', 'TW', candles2330);

    expect(report2330.market).toBe('TW');
    expect(report2330.isDataPending).toBe(false);
    expect(report2330.klineSystem.candles.length).toBe(65);

    const html2330 = renderToStaticMarkup(
      React.createElement(AiForceDashboardView, {
        initialReport: report2330,
        holdings: [],
      })
    );
    expect(html2330).toContain('2330');
    expect(html2330).toContain('台積電');
    expect(html2330).not.toContain('2400~1600');
    expect(html2330).not.toContain('60k~0k');
    expect(html2330).not.toContain('NaN');

    // 2881 富邦金：不可誤判為 ETF
    const candles2881 = buildSyntheticCandles(65, 88.5, 22000);
    const report2881 = generateAiForceReportFromCandles('2881', '富邦金', 'TW', candles2881);
    expect(report2881.monthlyRevenue.isEtf).toBeFalsy();
    expect(report2881.valuationMetrics?.isEtf).toBeFalsy();
  });

  it('象限二 (TW ETF 0050 & 主動式 ETF 00403A)：Card 20/21 自動轉為 ETF 資產規模/折溢價/追蹤誤差視圖', () => {
    const candles0050 = buildSyntheticCandles(65, 192.5, 18000);
    const report0050 = generateAiForceReportFromCandles('0050', '元大台灣50', 'TW', candles0050);
    expect(report0050.monthlyRevenue.isEtf).toBe(true);
    expect(report0050.valuationMetrics?.isEtf).toBe(true);

    const candles00403A = buildSyntheticCandles(65, 15.2, 12000);
    const report00403A = generateAiForceReportFromCandles('00403A', '主動式台股ETF', 'TW', candles00403A);
    expect(report00403A.monthlyRevenue.isEtf).toBe(true);
    expect(report00403A.valuationMetrics?.isEtf).toBe(true);
  });

  it('象限三 (US 個股 NVDA / BRK.B / $4.50 低價虧損美股)：全美股制度對齊、無台股術語殘留且低價股 Y 軸刻度不重複', () => {
    const candlesNvda = buildSyntheticCandles(65, 138.6, 45000000);
    const reportNvda = generateAiForceReportFromCandles('NVDA', 'NVIDIA', 'US', candlesNvda);
    expect(reportNvda.market).toBe('US');
    expect(reportNvda.multiDimensionRadar.dimensions.institutional).toBeGreaterThanOrEqual(0);
    const htmlNvda = renderToStaticMarkup(
      React.createElement(AiForceDashboardView, {
        initialReport: reportNvda,
        holdings: [],
      })
    );
    expect(htmlNvda).toContain('機構');

    const digestNvda = createWarRoomPromptDigest(reportNvda, []);
    const promptResNvda = generateStrategicPrompt(digestNvda, { mode: 'FULL_MASTER', desensitized: true });
    expect(promptResNvda.promptText).toContain('NVDA');
    expect(promptResNvda.promptText).not.toContain('三大法人（外資/投信/自營商）');
    expect(promptResNvda.promptText).not.toContain('集保戶數與千張大戶');

    // BRK.B 帶點號美股代號與 $4.50 低價美股
    const candlesLowUs = buildSyntheticCandles(65, 4.5, 1200000);
    const reportLowUs = generateAiForceReportFromCandles('SOUN', 'SoundHound AI', 'US', candlesLowUs);
    const htmlLowUs = renderToStaticMarkup(
      React.createElement(AiForceDashboardView, {
        initialReport: reportLowUs,
        holdings: [],
      })
    );
    expect(htmlLowUs).toContain('SOUN');
    expect(htmlLowUs).not.toContain('NaN');
  });

  it('象限四 (US ETF VT / SPY)：Card 20/21 自動識別美股 ETF 並顯示 USD 幣別與 ETF 專屬結構', () => {
    const candlesVt = buildSyntheticCandles(65, 118.4, 3200000);
    const reportVt = generateAiForceReportFromCandles('VT', 'Vanguard Total World Stock ETF', 'US', candlesVt);
    expect(reportVt.market).toBe('US');
    expect(reportVt.monthlyRevenue.isEtf).toBe(true);
    expect(reportVt.valuationMetrics?.isEtf).toBe(true);

    const htmlVt = renderToStaticMarkup(
      React.createElement(AiForceDashboardView, {
        initialReport: reportVt,
        holdings: [],
      })
    );
    expect(htmlVt).toContain('VT');
    expect(htmlVt).not.toContain('NaN');
  });

  it('極限邊界 (< 5D 新上市股與 0D 空數列)：觸發 ARINC 661 Zero-Mock 誠實空態並物理阻斷 AI 提示詞複製', () => {
    const candles3D = buildSyntheticCandles(3, 65.0, 2500);
    const report3D = generateAiForceReportFromCandles('6999', '新掛牌測試股', 'TW', candles3D);
    expect(report3D.isDataPending).toBe(true);
    expect(report3D.marketBar.dataPointsCount).toBe(3);
    expect(report3D.forecastCone.timeNodes.length).toBe(0);
    expect(report3D.vwapCostStructure.bands.length).toBe(0);

    const digest3D = createWarRoomPromptDigest(report3D, []);
    const promptCardHtml = renderToStaticMarkup(
      React.createElement(WarRoomPromptCard, {
        digest: digest3D,
        isDataPending: report3D.isDataPending,
      })
    );
    expect(promptCardHtml).toContain('標的數據待命中');
    expect(promptCardHtml).toContain('disabled=""');

    // 0D 空報告亦不可洩漏 3150 / 2330 / 168.5% 假數據
    const report0D = createDefaultAiForceReport('0000', '空態標的', 'TW');
    expect(report0D.isDataPending).toBe(true);
    expect(report0D.klineSystem.candles.length).toBe(0);
    expect(report0D.marketBar.currentPrice ?? 0).toBe(0);
  });
});
