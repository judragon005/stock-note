import { describe, it, expect } from 'vitest';
import { parseBrokerSnapshotText, reconcileWithBrokerSnapshot, generateAuditAdjustmentTrade } from '../engine/reconciliationEngine';
import { HoldingPosition } from '../types/stock';

describe('TDD Seam: ReconciliationModal 資料流與狀態轉換測試 (Ticket 05)', () => {
  const mockHoldings = [
    {
      symbol: '2330',
      shares: 1000,
      costBasis: 600000,
      averagePrice: 600,
      currentPrice: 950,
      marketValue: 950000,
      unrealizedProfit: 350000,
      profitRate: 58.33,
      weightPercent: 100,
    },
  ] as unknown as HoldingPosition[];

  it('測試輸入多行剪貼簿文字時，完整資料管道解析、比對與調整單生成', () => {
    const rawInput = `2330\t台積電\t1,010\t950\n0050\t元大台灣50\t2,000\t170`;
    const parsed = parseBrokerSnapshotText(rawInput);
    expect(parsed).toHaveLength(2);

    const report = reconcileWithBrokerSnapshot(mockHoldings, parsed, '富邦證券');
    expect(report.totalComparedSymbols).toBe(2);
    expect(report.discrepancyCount).toBe(2);

    // 2330: 差 10 股
    const item2330 = report.items.find((i) => i.symbol === '2330');
    expect(item2330?.discrepancyType).toBe('DIFF_SHARES');
    expect(item2330?.diffShares).toBe(10);

    // 0050: 系統無此標的
    const item0050 = report.items.find((i) => i.symbol === '0050');
    expect(item0050?.discrepancyType).toBe('MISSING_IN_SYSTEM');
    expect(item0050?.diffShares).toBe(2000);

    // 產生調整單
    const adjTrade = generateAuditAdjustmentTrade(item2330!.symbol, item2330!.diffShares, 'TW', 'TWD', '富邦證券 對賬校準');
    expect(adjTrade.type).toBe('ADJUSTMENT');
    expect(adjTrade.shares).toBe(10);
    expect(adjTrade.price).toBe(0);
    expect(adjTrade.note).toContain('富邦證券 對賬校準');
  });
});
