import { describe, it, expect } from 'vitest';
import {
  exportReportToCsv,
  generateSummaryHtml,
  sanitizeCsvCell,
} from './exportReportPipeline';
import type { AiForceDashboardReport } from '../types/aiForceDashboard';

describe('exportReportPipeline & DDE defense', () => {
  it('應該對以 =, +, -, @ 開頭的儲存格進行 DDE 注入消毒', () => {
    expect(sanitizeCsvCell('=cmd|"/C calc"!A0')).toBe(`'=cmd|"/C calc"!A0`);
    expect(sanitizeCsvCell('+123')).toBe(`'+123`);
    expect(sanitizeCsvCell('-456')).toBe(`'-456`);
    expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe(`'@SUM(A1:A10)`);
    expect(sanitizeCsvCell('台積電')).toBe('台積電');
    expect(sanitizeCsvCell('2330')).toBe('2330');
  });

  it('應該產出包含標題與指標之完整 CSV 格式字串', () => {
    const mockReport = {
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      updatedAt: '2026-09-18 13:30',
      marketBar: {
        currentPrice: 2310,
        changeAmount: 30,
        changePercent: 1.32,
        volumeShares: 25410,
        openPrice: 2290,
        highPrice: 2320,
        lowPrice: 2285,
        prevClose: 2280,
      },
      mainForceVerdict: {
        primaryVerb: '調節減碼',
        fullVerdictText: 'AI 結論：法人小幅調節',
      },
    } as unknown as AiForceDashboardReport;

    const csv = exportReportToCsv(mockReport);
    expect(csv).toContain('標的代號,標的名稱,市場,現價,漲跌幅');
    expect(csv).toContain('2330,台積電,TW,2310,1.32%');
    expect(csv).toContain('主力語意,調節減碼');
  });

  it('應該產出獨立可離線查看之 HTML 總結報告字串', () => {
    const mockReport = {
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      updatedAt: '2026-09-18 13:30',
      marketBar: {
        currentPrice: 2310,
      },
      mainForceVerdict: {
        primaryVerb: '調節減碼',
        fullVerdictText: 'AI 結論：法人小幅調節',
      },
    } as unknown as AiForceDashboardReport;

    const html = generateSummaryHtml(mockReport);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('2330 台積電');
    expect(html).toContain('主力語意：調節減碼');
    expect(html).toContain('AI 主力行為量化決策總結報告');
  });

  it('Ticket 04: filterChartSvgElements 應精準過濾掉小於 60x60 之微小圖示，保留主要圖表', async () => {
    const { filterChartSvgElements } = await import('./exportReportPipeline');
    const mockSvgs = [
      { getBoundingClientRect: () => ({ width: 16, height: 16 }) },
      { getBoundingClientRect: () => ({ width: 24, height: 24 }) },
      { getBoundingClientRect: () => ({ width: 680, height: 280 }) }, // K線圖
      { getBoundingClientRect: () => ({ width: 320, height: 220 }) }, // 雷達圖
    ];

    const filtered = filterChartSvgElements(mockSvgs);
    expect(filtered.length).toBe(2);
  });

  it('Ticket 04: triggerAllChartsDownload 在 Node 離線環境下應安全返回 0 而不拋錯', async () => {
    const { triggerAllChartsDownload } = await import('./exportReportPipeline');
    const count = await triggerAllChartsDownload('2886');
    expect(count).toBe(0);
  });
});

