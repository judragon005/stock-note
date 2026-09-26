import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TechnicalAlertsView,
  KdMaView,
  MacdView,
  RawDataView,
  generateTechnicalAlerts,
  deriveKdMaMetrics,
  deriveMacdMetrics,
  paginateCandles,
} from './TaskPanels';
import { createDefaultAiForceReport } from '../../engine/aiForceDashboardEngine';
import type { KlineCandleItem } from '../../types/aiForceDashboard';

describe('TaskPanels 底部任務視圖真實資料動態連動 (Spec 0143 Ticket 3)', () => {
  const mockCandles: KlineCandleItem[] = Array.from({ length: 25 }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    open: 1000 + i * 10,
    high: 1015 + i * 10,
    low: 995 + i * 10,
    close: 1010 + i * 10,
    volume: 5000 + i * 100,
    ma5: 1000 + i * 10,
    ma10: 990 + i * 10,
    ma20: 980 + i * 10,
    ma60: 950 + i * 10,
    k: Number((70 + (i % 15)).toFixed(1)),
    d: Number((65 + (i % 15)).toFixed(1)),
    dif: Number((15 + i * 0.5).toFixed(2)),
    macd: Number((10 + i * 0.4).toFixed(2)),
    macdHist: Number((5 + i * 0.1).toFixed(2)),
    rsi: Number((60 + (i % 20)).toFixed(1)),
  }));

  const baseReport = createDefaultAiForceReport('2330', '台積電', 'TW');
  const mockReport = {
    ...baseReport,
    symbol: '2330',
    name: '台積電',
    marketBar: {
      ...baseReport.marketBar,
      currentPrice: 1250,
    },
    klineSystem: {
      ...baseReport.klineSystem,
      candles: mockCandles,
      keyLevels: {
        highResistance: 1260,
        mainForceCost: 1180,
        supportLevel: 1100,
      },
    },
    vwapCostStructure: {
      ...baseReport.vwapCostStructure,
      mainForceVwap: 1180,
    },
  };

  describe('任務二：技術警示報告 (TechnicalAlertsView & generateTechnicalAlerts)', () => {
    it('generateTechnicalAlerts 應依據真實日 K 與指標動態計算警示項目', () => {
      const alerts = generateTechnicalAlerts(mockReport);
      expect(alerts.length).toBeGreaterThanOrEqual(3);

      // 檢查是否含有均線或 VWAP 警示項目
      const hasMaAlert = alerts.some((a) => a.title.includes('均線'));
      expect(hasMaAlert).toBe(true);

      // 均線警示訊息中應包含真實數值 ($1,240 或 $1,250 等)，而非寫死的 2345
      const maAlert = alerts.find((a) => a.title.includes('均線'));
      expect(maAlert?.message).not.toContain('2345');
      expect(maAlert?.message).not.toContain('2280');
    });

    it('TechnicalAlertsView 渲染時應動態呈現當前標的名稱與真實警示', () => {
      const html = renderToStaticMarkup(React.createElement(TechnicalAlertsView, { report: mockReport }));

      // 應呈現 2330 台積電
      expect(html).toContain('2330 台積電');

      // 絕不出現寫死的致茂舊版數值
      expect(html).not.toContain('2345');
      expect(html).not.toContain('2280');
    });
  });

  describe('任務三：KD + MA 視圖 (KdMaView & deriveKdMaMetrics)', () => {
    it('deriveKdMaMetrics 應取得最新日 K 的真實 K、D 與 MA20 數值', () => {
      const last = mockCandles[mockCandles.length - 1];
      const metrics = deriveKdMaMetrics(mockReport);

      expect(metrics.k).toBe(last.k);
      expect(metrics.d).toBe(last.d);
      expect(metrics.ma20).toBe(last.ma20);
      expect(metrics.kdCrossingState).toBeDefined();
    });

    it('KdMaView 渲染時應包含真實指標數值並繪製原生 SVG 走勢圖', () => {
      const last = mockCandles[mockCandles.length - 1];
      const html = renderToStaticMarkup(React.createElement(KdMaView, { report: mockReport }));

      // 包含真實 K 與 D 值
      expect(html).toContain(String(last.k));
      expect(html).toContain(String(last.d));

      // 應包含 <svg> 向量圖形元素，而非舊版的純文字 placeholder
      expect(html).toContain('<svg');
      expect(html).not.toContain('視覺化已就緒');
    });
  });

  describe('任務四：MACD 視圖 (MacdView & deriveMacdMetrics)', () => {
    it('deriveMacdMetrics 應取得最新日 K 的真實 DIF、MACD 與 OSC 數值', () => {
      const last = mockCandles[mockCandles.length - 1];
      const metrics = deriveMacdMetrics(mockReport);

      expect(metrics.dif).toBe(last.dif);
      expect(metrics.macd).toBe(last.macd);
      expect(metrics.macdHist).toBe(last.macdHist);
    });

    it('MacdView 渲染時應包含真實 DIF/MACD 數值並繪製原生 SVG 圖表', () => {
      const last = mockCandles[mockCandles.length - 1];
      const html = renderToStaticMarkup(React.createElement(MacdView, { report: mockReport }));

      expect(html).toContain(String(last.dif));
      expect(html).toContain(String(last.macd));

      // 應包含原生 <svg> 圖表
      expect(html).toContain('<svg');
      expect(html).not.toContain('零軸向上發散中');
    });
  });

  describe('任務五：原始資料總表 (RawDataView & paginateCandles)', () => {
    it('paginateCandles 應正確分頁計算歷史日 K 數列', () => {
      const page1 = paginateCandles(mockCandles, 1, 10);
      expect(page1.items.length).toBe(10);
      expect(page1.totalPages).toBe(3);
      expect(page1.currentPage).toBe(1);

      // 第一頁的第一筆應為最新日 K
      expect(page1.items[0].date).toBe(mockCandles[mockCandles.length - 1].date);

      const page3 = paginateCandles(mockCandles, 3, 10);
      expect(page3.items.length).toBe(5);
    });

    it('RawDataView 渲染時應顯示完整欄位與分頁指示器', () => {
      const html = renderToStaticMarkup(React.createElement(RawDataView, { report: mockReport }));

      // 最新日 K 出現於表格中
      const latestDate = mockCandles[mockCandles.length - 1].date;
      expect(html).toContain(latestDate);

      // 應包含分頁指示與按鈕
      expect(html).toMatch(/第 1/);
      expect(html).toContain('下一頁');
    });
  });
});
