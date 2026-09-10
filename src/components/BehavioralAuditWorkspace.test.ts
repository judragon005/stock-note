import { describe, it, expect } from 'vitest';
import { calculateBehavioralAuditReport } from '../engine/behavioralAuditEngine';
import { TradeRecord, HoldingPosition } from '../types/stock';

describe('TDD Seam: BehavioralAuditWorkspace 覆盤資料流整合測試 (Ticket 14)', () => {
  const mockTrades: TradeRecord[] = [
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
      date: '2026-01-04', // 持有 3 天
      symbol: '2330',
      market: 'TW',
      currency: 'TWD',
      type: 'SELL',
      shares: 1000,
      price: 860,
      fee: 200,
      tax: 2580,
      createdAt: 2,
    },
    {
      id: 't-3',
      date: '2026-01-10',
      symbol: '2603',
      market: 'TW',
      currency: 'TWD',
      type: 'BUY',
      shares: 1000,
      price: 220,
      fee: 300,
      tax: 0,
      createdAt: 3,
    },
    {
      id: 't-4',
      date: '2026-04-20', // 持有 100 天認賠
      symbol: '2603',
      market: 'TW',
      currency: 'TWD',
      type: 'SELL',
      shares: 1000,
      price: 170,
      fee: 300,
      tax: 510,
      createdAt: 4,
    },
  ];

  const mockHoldings: HoldingPosition[] = [];

  it('工作區資料流應產出客觀 AI 覆盤建議與處置效應嚴重警告', () => {
    const report = calculateBehavioralAuditReport(mockTrades, mockHoldings, 1000000);

    expect(report.disposition.severity).toBe('SEVERE');
    expect(report.actionableInsights).toHaveLength(2);
    expect(report.actionableInsights[0]).toContain('截斷虧損');
    expect(report.actionableInsights[1]).toContain('讓利潤奔馳');
    expect(report.friction.totalFeesPaid).toBe(1000);
    expect(report.friction.totalTaxesPaid).toBe(3090);
  });
});
