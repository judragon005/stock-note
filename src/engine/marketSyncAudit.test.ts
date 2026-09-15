import { describe, it, expect } from 'vitest';
// @ts-ignore
import auditVerifier from '../../scripts/market-sync/audit-verifier.cjs';

const { isMarketTradingDay, verifyMarketDataIntegrity } = auditVerifier;

describe('Market Sync Audit & Zero Data Loss Verification (防漏水稽核測試)', () => {
  describe('1. isMarketTradingDay (交易日與休市日判定)', () => {
    it('週六與週日應正確判定為休市 (非交易日)', () => {
      // 2026-09-19 是週六, 2026-09-20 是週日
      const saturday = new Date('2026-09-19T10:00:00Z');
      const sunday = new Date('2026-09-20T10:00:00Z');
      expect(isMarketTradingDay(saturday, 'TW')).toBe(false);
      expect(isMarketTradingDay(sunday, 'TW')).toBe(false);
    });

    it('一般週一至週五應判定為交易日', () => {
      // 2026-09-15 是週二
      const tuesday = new Date('2026-09-15T10:00:00Z');
      expect(isMarketTradingDay(tuesday, 'TW')).toBe(true);
    });

    it('國定假日（如春節、中秋）應判定為休市', () => {
      const cny = new Date('2026-02-17T10:00:00Z');
      expect(isMarketTradingDay(cny, 'TW')).toBe(false);
    });
  });

  describe('2. verifyMarketDataIntegrity (覆蓋率與完整性檢查)', () => {
    it('無遺漏標的時應返回 HEALTHY 與 100% 完整率', () => {
      const mockSummary = {
        stocks: {
          '2330': { symbol: '2330' },
          '2317': { symbol: '2317' },
        },
        failedSymbols: [],
      };

      const result = verifyMarketDataIntegrity(mockSummary);
      expect(result.status).toBe('HEALTHY');
      expect(result.integrityRate).toBe(100);
      expect(result.actualCount).toBe(2);
      expect(result.missingSymbols.length).toBe(0);
    });

    it('有失敗標的時應返回 PARTIAL_SUCCESS 並列出遺漏清單', () => {
      const mockSummary = {
        stocks: {
          'AAPL': { symbol: 'AAPL' },
        },
        failedSymbols: ['GOOGL', 'AMZN'],
      };

      const result = verifyMarketDataIntegrity(mockSummary);
      expect(result.status).toBe('PARTIAL_SUCCESS');
      expect(result.integrityRate).toBeCloseTo(33.33, 1);
      expect(result.missingSymbols).toEqual(['GOOGL', 'AMZN']);
    });
  });
});
