import { describe, it, expect, vi } from 'vitest';
import {
  isTaiwanMarketOpen,
  isUSMarketOpen,
  isAnyMarketOpen,
  orchestrateBatchRefresh,
} from './usePriceAutoRefresh';
import { PriceQuote, MarketType } from '../types/stock';

describe('usePriceAutoRefresh Hook & Orchestration (TDD Seam)', () => {
  describe('1. 交易時段判定 (Market Session Logic)', () => {
    it('台股開盤判定：週一至週五 09:00 至 13:30 應為開盤', () => {
      // 週三 10:30 (台北時間)
      const openDate = new Date('2026-08-19T10:30:00+08:00');
      expect(isTaiwanMarketOpen(openDate)).toBe(true);

      // 週三 09:00 (台北時間準時開盤)
      const exactOpen = new Date('2026-08-19T09:00:00+08:00');
      expect(isTaiwanMarketOpen(exactOpen)).toBe(true);

      // 週三 13:30 (台北時間收盤時點)
      const exactClose = new Date('2026-08-19T13:30:00+08:00');
      expect(isTaiwanMarketOpen(exactClose)).toBe(true);
    });

    it('台股休市判定：盤前、盤後或週末應為休市', () => {
      // 週三 08:59:59 (盤前)
      const preMarket = new Date('2026-08-19T08:59:59+08:00');
      expect(isTaiwanMarketOpen(preMarket)).toBe(false);

      // 週三 13:30:01 (盤後)
      const postMarket = new Date('2026-08-19T13:30:01+08:00');
      expect(isTaiwanMarketOpen(postMarket)).toBe(false);

      // 週六 10:30 (週末)
      const saturday = new Date('2026-08-22T10:30:00+08:00');
      expect(isTaiwanMarketOpen(saturday)).toBe(false);

      // 週日 10:30 (週末)
      const sunday = new Date('2026-08-23T10:30:00+08:00');
      expect(isTaiwanMarketOpen(sunday)).toBe(false);
    });

    it('美股開盤判定：夏令台北時間週一至週五 21:30 至翌日 04:00 應為開盤', () => {
      // 週一 22:30 (台北時間)
      const usOpen1 = new Date('2026-08-17T22:30:00+08:00');
      expect(isUSMarketOpen(usOpen1)).toBe(true);

      // 週二 02:00 (台北時間翌日凌晨)
      const usOpen2 = new Date('2026-08-18T02:00:00+08:00');
      expect(isUSMarketOpen(usOpen2)).toBe(true);

      // 週一 15:00 (台北時間下午，美股休市)
      const usClosedDay = new Date('2026-08-17T15:00:00+08:00');
      expect(isUSMarketOpen(usClosedDay)).toBe(false);

      // 週日 23:00 (週末休市)
      const sundayNight = new Date('2026-08-23T23:00:00+08:00');
      expect(isUSMarketOpen(sundayNight)).toBe(false);
    });

    it('全市場綜合開盤判定 isAnyMarketOpen', () => {
      const twTime = new Date('2026-08-19T10:30:00+08:00'); // 台股開盤
      expect(isAnyMarketOpen(twTime)).toBe(true);

      const usTime = new Date('2026-08-19T22:30:00+08:00'); // 美股開盤
      expect(isAnyMarketOpen(usTime)).toBe(true);

      const closedTime = new Date('2026-08-19T17:00:00+08:00'); // 兩市皆休
      expect(isAnyMarketOpen(closedTime)).toBe(false);
    });
  });

  describe('2. 輪詢排程與鎖定過濾 (orchestrateBatchRefresh)', () => {
    it('應自動過濾已鎖定標的，僅對未鎖定之有效持股發起批次請求', async () => {
      const mockBatchFetcher = vi.fn().mockResolvedValue({
        '2330': {
          symbol: '2330',
          market: 'TW',
          price: 1050,
          currency: 'TWD',
          status: 'DELAYED',
          updatedAt: Date.now(),
          source: 'YAHOO',
        } as PriceQuote,
      });

      const holdings = [
        { symbol: '2330', market: 'TW' as MarketType, shares: 1000 },
        { symbol: 'NVDA', market: 'US' as MarketType, shares: 50 },
        { symbol: '0050', market: 'TW' as MarketType, shares: 0 }, // 0 股不請求
      ];

      const lockedSymbols = ['NVDA']; // NVDA 已自訂鎖定

      const quotes = await orchestrateBatchRefresh(holdings, lockedSymbols, mockBatchFetcher);

      expect(mockBatchFetcher).toHaveBeenCalledWith([
        { symbol: '2330', market: 'TW' },
      ]);
      expect(quotes['2330']?.price).toBe(1050);
      expect(quotes['NVDA']).toBeUndefined();
    });

    it('若所有標的皆已鎖定或無持股，應不發起網路請求', async () => {
      const mockBatchFetcher = vi.fn();
      const holdings = [{ symbol: 'NVDA', market: 'US' as MarketType, shares: 50 }];
      const lockedSymbols = ['NVDA'];

      const quotes = await orchestrateBatchRefresh(holdings, lockedSymbols, mockBatchFetcher);
      expect(mockBatchFetcher).not.toHaveBeenCalled();
      expect(quotes).toEqual({});
    });
  });
});
