import { describe, it, expect } from 'vitest';
import { calculateBehavioralAuditReport } from './behavioralAuditEngine';
import { TradeRecord, HoldingPosition } from '../types/stock';

describe('TDD Seam: behavioralAuditEngine (交易心理學與情緒偏誤量化覆盤)', () => {
  const mockTrades: TradeRecord[] = [
    // 獲利交易：買進 2026-01-01，賣出 2026-01-05 (持有 4 天，獲利)
    {
      id: 't-1',
      date: '2026-01-01',
      symbol: '2330',
      market: 'TW',
      currency: 'TWD',
      type: 'BUY',
      shares: 1000,
      price: 800,
      fee: 200,
      tax: 0,
      createdAt: 1,
    },
    {
      id: 't-2',
      date: '2026-01-05',
      symbol: '2330',
      market: 'TW',
      currency: 'TWD',
      type: 'SELL',
      shares: 1000,
      price: 850,
      fee: 200,
      tax: 2550,
      createdAt: 2,
    },
    // 虧損交易：買進 2026-02-01，賣出 2026-04-12 (持有 70 天，認賠賣出)
    {
      id: 't-3',
      date: '2026-02-01',
      symbol: '2603',
      market: 'TW',
      currency: 'TWD',
      type: 'BUY',
      shares: 2000,
      price: 200,
      fee: 400,
      tax: 0,
      createdAt: 3,
    },
    {
      id: 't-4',
      date: '2026-04-12',
      symbol: '2603',
      market: 'TW',
      currency: 'TWD',
      type: 'SELL',
      shares: 2000,
      price: 160,
      fee: 400,
      tax: 960,
      createdAt: 4,
    },
  ];

  const mockHoldings: HoldingPosition[] = [
    // 目前在庫未實現浮虧部位：買進 2026-01-10，持股至今已 120 天，浮虧 -30%
    {
      symbol: '3231',
      shares: 1000,
      costBasis: 150000,
      averagePrice: 150,
      currentPrice: 105,
      marketValue: 105000,
      unrealizedProfit: -45000,
      profitRate: -30,
      weightPercent: 100,
      firstBuyDate: '2026-01-10',
    } as any,
  ];

  it('應精確量化處置效應：虧損平均持有天數遠高於獲利天數時標示 SEVERE', () => {
    const report = calculateBehavioralAuditReport(mockTrades, mockHoldings, 1000000);

    expect(report.disposition.avgHoldingDaysGain).toBeCloseTo(4, 0);
    expect(report.disposition.avgHoldingDaysLoss).toBeGreaterThan(60);
    expect(report.disposition.holdingDaysBiasRatio).toBeGreaterThan(5.0);
    expect(report.disposition.severity).toBe('SEVERE');
    expect(report.disposition.diagnosisText).toContain('處置效應');
  });

  it('應精算手續費與稅費總和及年化摩擦拖累率', () => {
    const report = calculateBehavioralAuditReport(mockTrades, mockHoldings, 1000000);
    // 總手續費 = 200 + 200 + 400 + 400 = 1200
    // 總證交稅 = 2550 + 960 = 3510
    // 總摩擦成本 = 4710
    expect(report.friction.totalFeesPaid).toBe(1200);
    expect(report.friction.totalTaxesPaid).toBe(3510);
    expect(report.friction.totalFrictionCost).toBe(4710);
    expect(report.friction.annualizedDragRatePercent).toBeGreaterThan(0);
  });

  it('應檢驗追高交易與生成客觀交易紀律建議', () => {
    const report = calculateBehavioralAuditReport(mockTrades, mockHoldings, 1000000);
    expect(report.actionableInsights.length).toBeGreaterThanOrEqual(2);
    expect(report.actionableInsights.some((i) => i.includes('處置效應') || i.includes('停損'))).toBe(true);
  });
});
