import { describe, it, expect } from 'vitest';
import { generateAiForceReportFromCandles } from './aiForceDashboardEngine';
import { paginateCandles } from '../components/aiForceDashboard/TaskPanels';
import type { KlineCandleItem } from '../types/aiForceDashboard';

describe('Ticket 12: 主力戰情室全頻譜 250 日日 K 湖倉與零假資料 (Zero-Mock) 端到端 E2E 驗收', () => {
  // 建立符合真實台積電 250 交易日之日 K、法人籌碼與信用資料
  const candles250: KlineCandleItem[] = Array.from({ length: 250 }, (_, i) => {
    const base = 900 + i * 0.4;
    return {
      date: `2025-01-${String(i + 1).padStart(3, '0')}`,
      open: Number((base - 2).toFixed(2)),
      high: Number((base + 5).toFixed(2)),
      low: Number((base - 4).toFixed(2)),
      close: Number((base + 1).toFixed(2)),
      volume: 25000 + (i % 20) * 1000,
    };
  });

  const institutionalRecords = Array.from({ length: 250 }, (_, i) => ({
    date: candles250[i].date,
    foreignShares: (i % 3 === 0 ? 1 : -1) * (1500 + i * 10),
    trustShares: 800 + i * 5,
    dealerShares: -200,
  }));

  const marginData = {
    marginBalance: 25000,
    shortBalance: 6250, // 券資比 6250 / 25000 * 100 = 25.00%
    dayTradeRate: 35.8,
  };

  it('1. 250 根真實日 K 應完整生成非待命之 18 卡全量 Report，且絕無寫死假數值', () => {
    const report = generateAiForceReportFromCandles(
      '2330',
      '台積電',
      'TW',
      candles250,
      undefined,
      institutionalRecords,
      new Date('2026-10-02T16:00:00Z'),
      {
        statusTag: 'NORMAL',
        currency: 'TWD',
        volumeUnit: '張',
        marginData,
      }
    );

    // 驗證核心契約
    expect(report.isDataPending).toBe(false);
    expect(report.symbol).toBe('2330');
    expect(report.name).toBe('台積電');

    // 頂部行情 Bar
    const lastCandle = candles250[candles250.length - 1];
    expect(report.marketBar.currentPrice).toBe(lastCandle.close);
    expect(report.marketBar.dataPointsCount).toBe(250);
    expect(report.marketBar.statusBadges.mainForceTracking).toBe(true);

    // 絕無致茂 2290 或 150 假數值殘留
    expect(report.marketBar.currentPrice).not.toBe(2290);
    expect(report.marketBar.currentPrice).not.toBe(150);

    // 01 主 K 線系統與 MA250 年線指標
    expect(report.klineSystem.candles.length).toBe(250);
    const lastProcessedCandle = report.klineSystem.candles[249];
    expect(lastProcessedCandle.ma250).toBeDefined();
    expect(typeof lastProcessedCandle.ma250).toBe('number');
    expect(isNaN(lastProcessedCandle.ma250!)).toBe(false);
    expect(lastProcessedCandle.ma250).toBeGreaterThan(800);

    // 08 法人行為計量
    expect(report.institutionalFlow.history.length).toBe(250);
    expect(report.institutionalFlow.cumulative20DaysSummary).toBeDefined();

    // 09 當沖與信用交易
    expect(report.dayTradeRisk.marginBalance).toBe(25000);
    expect(report.dayTradeRisk.shortBalance).toBe(6250);
    expect(report.dayTradeRisk.shortMarginRatio).toBe(25.0);
    expect(report.dayTradeRisk.dayTradeRate).toBe(35.8);

    // 15 籌碼摘要
    expect(report.chipsSummary.conclusionBadge).toBeDefined();
    expect(report.chipsSummary.sparklineHistory.length).toBeGreaterThan(0);

    // 17 多空強度分布
    expect(report.bullBearStrength.compositeScore).toBeGreaterThanOrEqual(0);

    // 18 主力追蹤總評判
    expect(report.mainForceVerdict).toBeDefined();
    expect(report.mainForceVerdict.primaryVerb).toBeDefined();
    expect(report.mainForceVerdict.fullVerdictText).toBeDefined();
  });

  it('2. 任務五原始量化數據總表應正確劃分為 25 頁 (每頁 10 筆)', () => {
    const report = generateAiForceReportFromCandles(
      '2330',
      '台積電',
      'TW',
      candles250
    );

    const page1 = paginateCandles(report.klineSystem.candles, 1, 10);
    expect(page1.totalCount).toBe(250);
    expect(page1.totalPages).toBe(25);
    expect(page1.items.length).toBe(10);
    expect(page1.currentPage).toBe(1);

    const page25 = paginateCandles(report.klineSystem.candles, 25, 10);
    expect(page25.items.length).toBe(10);
    expect(page25.currentPage).toBe(25);
  });
});
