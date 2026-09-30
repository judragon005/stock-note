import { describe, it, expect } from 'vitest';
import { getMarketSettlementStatus } from './marketSettlementEngine';

describe('marketSettlementEngine (市場結算與前日收盤數據定錨引擎)', () => {
  describe('台股 (TW) 市場結算判定', () => {
    it('平日 15:00 前（如週三 11:30 盤中），應判定未結算並以「前一交易日」為量化定錨日', () => {
      // 2026-09-30 (週三) 11:30:00 (台北時間)
      const now = new Date('2026-09-30T11:30:00+08:00');
      const status = getMarketSettlementStatus('TW', now);

      expect(status.isSettled).toBe(false);
      expect(status.anchorTradingDate).toBe('2026-09-29'); // 前一交易日週二
      expect(status.reason).toContain('台股尚未完成當日盤後籌碼結算');
      expect(status.isTradingHours).toBe(true);
    });

    it('平日 13:30 收盤但未達 15:00（如週三 14:15），仍判定未結算（籌碼未公告）', () => {
      // 2026-09-30 (週三) 14:15:00 (台北時間)
      const now = new Date('2026-09-30T14:15:00+08:00');
      const status = getMarketSettlementStatus('TW', now);

      expect(status.isSettled).toBe(false);
      expect(status.anchorTradingDate).toBe('2026-09-29');
      expect(status.isTradingHours).toBe(false); // 13:30 已收盤但籌碼未齊
    });

    it('平日 15:00 (含) 之後（如週三 15:30），應判定已結算，量化定錨日為當日', () => {
      // 2026-09-30 (週三) 15:30:00 (台北時間)
      const now = new Date('2026-09-30T15:30:00+08:00');
      const status = getMarketSettlementStatus('TW', now);

      expect(status.isSettled).toBe(true);
      expect(status.anchorTradingDate).toBe('2026-09-30');
      expect(status.isTradingHours).toBe(false);
    });

    it('週一盤中 10:00，應判定未結算，並正確跨過週末退回至「前週五」', () => {
      // 2026-09-28 (週一) 10:00:00 (台北時間)
      const now = new Date('2026-09-28T10:00:00+08:00');
      const status = getMarketSettlementStatus('TW', now);

      expect(status.isSettled).toBe(false);
      expect(status.anchorTradingDate).toBe('2026-09-25'); // 前週五
    });

    it('週日休市期間，應判定未結算，並退回至「前週五」', () => {
      // 2026-09-27 (週日) 14:00:00 (台北時間)
      const now = new Date('2026-09-27T14:00:00+08:00');
      const status = getMarketSettlementStatus('TW', now);

      expect(status.isSettled).toBe(false);
      expect(status.anchorTradingDate).toBe('2026-09-25'); // 前週五
      expect(status.isTradingHours).toBe(false);
    });
  });

  describe('美股 (US) 市場結算判定', () => {
    it('台北時間早上 08:00 前（如週四 07:30），美股盤後數據未完整結算，判定未結算', () => {
      // 2026-10-01 (週四) 07:30:00 (台北時間)
      const now = new Date('2026-10-01T07:30:00+08:00');
      const status = getMarketSettlementStatus('US', now);

      expect(status.isSettled).toBe(false);
      // 前一交易日為週二 2026-09-29（因為週三收盤數據尚未過 08:00 結算線）
      expect(status.anchorTradingDate).toBe('2026-09-29');
      expect(status.reason).toContain('美股尚未完成盤後數據結算');
    });

    it('台北時間早上 08:00 (含) 之後（如週四 08:30），美股前日數據已結算完全', () => {
      // 2026-10-01 (週四) 08:30:00 (台北時間)
      const now = new Date('2026-10-01T08:30:00+08:00');
      const status = getMarketSettlementStatus('US', now);

      expect(status.isSettled).toBe(true);
      // 美東週三交易日 2026-09-30 已結算完成
      expect(status.anchorTradingDate).toBe('2026-09-30');
    });

    it('台北時間週一早上 07:30（週末結束），應正確退回至前週四收盤', () => {
      // 2026-09-28 (週一) 07:30:00 (台北時間)
      const now = new Date('2026-09-28T07:30:00+08:00');
      const status = getMarketSettlementStatus('US', now);

      expect(status.isSettled).toBe(false);
      expect(status.anchorTradingDate).toBe('2026-09-25'); // 週五收盤
    });
  });
});
