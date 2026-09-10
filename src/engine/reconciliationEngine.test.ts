import { describe, it, expect } from 'vitest';
import {
  parseBrokerSnapshotText,
  reconcileWithBrokerSnapshot,
  detectMultiLotMatches,
  generateAuditAdjustmentTrade,
} from './reconciliationEngine';
import { HoldingPosition, TradeRecord } from '../types/stock';

describe('TDD Seam: reconciliationEngine (跨券商持倉對賬審計與衝突消解)', () => {
  describe('1. parseBrokerSnapshotText (剪貼簿與 CSV 文字解析)', () => {
    it('應支援解析 Tab 分隔 (TSV) 之券商剪貼簿文字，並正確去除千分位', () => {
      const rawText = `代碼\t股票名稱\t庫存股數\t現價
2330\t台積電\t1,000\t980
0050\t元大台灣50\t2,500\t175.5`;

      const result = parseBrokerSnapshotText(rawText);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        symbol: '2330',
        shares: 1000,
        currentPrice: 980,
      });
      expect(result[1]).toEqual({
        symbol: '0050',
        shares: 2500,
        currentPrice: 175.5,
      });
    });

    it('應支援解析逗點分隔 (CSV) 格式文字', () => {
      const rawText = `symbol,shares,price
AAPL,150.5,225.2
NVDA,300,128.4`;

      const result = parseBrokerSnapshotText(rawText);
      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].shares).toBe(150.5);
      expect(result[1].symbol).toBe('NVDA');
      expect(result[1].shares).toBe(300);
    });

    it('遇無效格式、空行或只有單一代碼無股數時，應優雅跳過而不崩潰', () => {
      const rawText = `\n   \nInvalidLine\n2330\tNaN\n2454\t500`;
      const result = parseBrokerSnapshotText(rawText);
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('2454');
      expect(result[0].shares).toBe(500);
    });
  });

  describe('2. reconcileWithBrokerSnapshot (雙向逐檔庫存差額比對)', () => {
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
        weightPercent: 60,
      },
      {
        symbol: '0050',
        shares: 2000,
        costBasis: 300000,
        averagePrice: 150,
        currentPrice: 170,
        marketValue: 340000,
        unrealizedProfit: 40000,
        profitRate: 13.33,
        weightPercent: 25,
      },
      {
        symbol: '2454', // 系統有，但券商無 (ORPHAN_IN_SYSTEM)
        shares: 100,
        costBasis: 100000,
        averagePrice: 1000,
        currentPrice: 1200,
        marketValue: 120000,
        unrealizedProfit: 20000,
        profitRate: 20,
        weightPercent: 15,
      },
    ] as unknown as HoldingPosition[];

    it('應正確分類 MATCH, DIFF_SHARES, MISSING_IN_SYSTEM, ORPHAN_IN_SYSTEM', () => {
      const brokerSnapshot = [
        { symbol: '2330', shares: 1000, currentPrice: 950 }, // 完全吻合 MATCH
        { symbol: '0050', shares: 2005, currentPrice: 170 }, // 股數差異 DIFF_SHARES (+5)
        { symbol: 'AAPL', shares: 50, currentPrice: 220 },   // 系統完全遺漏 MISSING_IN_SYSTEM
      ];

      const report = reconcileWithBrokerSnapshot(mockHoldings, brokerSnapshot, '國泰證券');

      expect(report.totalComparedSymbols).toBe(4); // 2330, 0050, 2454, AAPL
      expect(report.matchedCount).toBe(1);
      expect(report.discrepancyCount).toBe(3);

      const matchItem = report.items.find((i) => i.symbol === '2330');
      expect(matchItem?.discrepancyType).toBe('MATCH');
      expect(matchItem?.diffShares).toBe(0);

      const diffItem = report.items.find((i) => i.symbol === '0050');
      expect(diffItem?.discrepancyType).toBe('DIFF_SHARES');
      expect(diffItem?.expectedShares).toBe(2000);
      expect(diffItem?.actualShares).toBe(2005);
      expect(diffItem?.diffShares).toBe(5);

      const missingItem = report.items.find((i) => i.symbol === 'AAPL');
      expect(missingItem?.discrepancyType).toBe('MISSING_IN_SYSTEM');
      expect(missingItem?.diffShares).toBe(50);

      const orphanItem = report.items.find((i) => i.symbol === '2454');
      expect(orphanItem?.discrepancyType).toBe('ORPHAN_IN_SYSTEM');
      expect(orphanItem?.diffShares).toBe(-100);
    });
  });

  describe('3. detectMultiLotMatches (同日零股分批拆合模糊匹配)', () => {
    const existingTrades: TradeRecord[] = [
      {
        id: 't-1',
        date: '2026-09-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 200,
        price: 900,
        fee: 20,
        tax: 0,
        createdAt: 1,
      },
      {
        id: 't-2',
        date: '2026-09-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 300,
        price: 900,
        fee: 20,
        tax: 0,
        createdAt: 2,
      },
      {
        id: 't-3',
        date: '2026-09-01',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 500,
        price: 902,
        fee: 20,
        tax: 0,
        createdAt: 3,
      },
    ];

    it('當同日同標的多筆零股買進總和等於匯入單股數時，應辨識為整股合單', () => {
      const incomingTrade: Partial<TradeRecord> = {
        date: '2026-09-01',
        symbol: '2330',
        market: 'TW',
        type: 'BUY',
        shares: 1000,
        price: 901,
      };

      const candidates = detectMultiLotMatches(incomingTrade, existingTrades);
      expect(candidates).not.toBeNull();
      expect(candidates?.isExactSumMatch).toBe(true);
      expect(candidates?.matchingExistingTrades).toHaveLength(3);
      expect(candidates?.aggregatedIncomingShares).toBe(1000);
    });

    it('若股數總和不相符，應返回 null 不誤判', () => {
      const incomingTrade: Partial<TradeRecord> = {
        date: '2026-09-01',
        symbol: '2330',
        market: 'TW',
        type: 'BUY',
        shares: 900, // 總和為 1000，不相符
      };

      const candidates = detectMultiLotMatches(incomingTrade, existingTrades);
      expect(candidates).toBeNull();
    });
  });

  describe('4. generateAuditAdjustmentTrade (無損審計調整單生成)', () => {
    it('若系統少算 10 股，應產生 +10 股且成本手續費為 0 的 ADJUSTMENT 交易', () => {
      const adj = generateAuditAdjustmentTrade('2330', 10, 'TW', 'TWD', '除權配股補平');
      expect(adj.type).toBe('ADJUSTMENT');
      expect(adj.symbol).toBe('2330');
      expect(adj.shares).toBe(10);
      expect(adj.price).toBe(0);
      expect(adj.fee).toBe(0);
      expect(adj.tax).toBe(0);
      expect(adj.note).toContain('除權配股補平');
      expect(adj.id).toBeDefined();
    });

    it('若系統多算 5 股，應產生 -5 股的 ADJUSTMENT 交易', () => {
      const adj = generateAuditAdjustmentTrade('0050', -5, 'TW', 'TWD', '減資折讓扣減');
      expect(adj.type).toBe('ADJUSTMENT');
      expect(adj.shares).toBe(-5);
      expect(adj.price).toBe(0);
    });

    it('連續快速生成多筆調整單時，ID 應具備唯一性杜絕碰撞', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const adj = generateAuditAdjustmentTrade('2330', 1, 'TW', 'TWD');
        expect(ids.has(adj.id)).toBe(false);
        ids.add(adj.id);
      }
      expect(ids.size).toBe(50);
    });
  });
});
