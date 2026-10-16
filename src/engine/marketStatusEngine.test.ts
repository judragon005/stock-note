import { describe, it, expect } from 'vitest';
import { getTwMarketStatus, getUsMarketStatus } from './marketStatusEngine';

describe('Spec 0190 / Ticket 12: 台美市場即時營業狀態引擎 (marketStatusEngine)', () => {
  describe('1. 台股市場狀態 (TW)', () => {
    it('營業日 10:30 (台北時間) 應判定為盤中交易中 (OPEN)', () => {
      // 2026-10-07 10:30:00 台北時間 = 2026-10-07T02:30:00.000Z
      const simulatedTime = new Date('2026-10-07T02:30:00.000Z');
      const status = getTwMarketStatus(simulatedTime);
      expect(status.status).toBe('OPEN');
      expect(status.statusLabel).toBe('盤中交易中');
      expect(status.isOpen).toBe(true);
      expect(status.isHoliday).toBe(false);
      expect(status.marketTimeFormatted).toBe('10:30');
    });

    it('營業日 08:45 (台北時間) 應判定為盤前試撮 (PRE_MARKET)', () => {
      // 2026-10-07 08:45:00 台北時間 = 2026-10-07T00:45:00.000Z
      const simulatedTime = new Date('2026-10-07T00:45:00.000Z');
      const status = getTwMarketStatus(simulatedTime);
      expect(status.status).toBe('PRE_MARKET');
      expect(status.statusLabel).toBe('盤前試撮');
      expect(status.isOpen).toBe(false);
    });

    it('法定休市日 (2026-09-28 教師節) 應判定為休市並顯示中文原因', () => {
      const simulatedTime = new Date('2026-09-28T02:30:00.000Z');
      const status = getTwMarketStatus(simulatedTime);
      expect(status.status).toBe('CLOSED');
      expect(status.statusLabel).toBe('休市');
      expect(status.isOpen).toBe(false);
      expect(status.isHoliday).toBe(true);
      expect(status.holidayReason).toBe('教師節');
    });

    it('天災停市日 (2026-07-10 巴威颱風) 應判定為休市', () => {
      const simulatedTime = new Date('2026-07-10T02:30:00.000Z');
      const status = getTwMarketStatus(simulatedTime);
      expect(status.isHoliday).toBe(true);
      expect(status.holidayReason).toBe('巴威颱風停市');
    });
  });

  describe('2. 美股市場狀態 (US)', () => {
    it('夏令時間美東 11:00 應判定為盤中交易中 (OPEN)', () => {
      // 2026-10-07 11:00 美東 (EDT UTC-4) = 2026-10-07T15:00:00.000Z
      const simulatedTime = new Date('2026-10-07T15:00:00.000Z');
      const status = getUsMarketStatus(simulatedTime);
      expect(status.status).toBe('OPEN');
      expect(status.statusLabel).toBe('盤中交易中');
      expect(status.isOpen).toBe(true);
      expect(status.marketTimeFormatted).toBe('11:00');
    });

    it('美股國定休市日 (2026-01-19 馬丁路德金紀念日) 應判定為休市並給出原因', () => {
      // 2026-01-19 14:00 美東 (EST UTC-5) = 2026-01-19T19:00:00.000Z
      const simulatedTime = new Date('2026-01-19T19:00:00.000Z');
      const status = getUsMarketStatus(simulatedTime);
      expect(status.status).toBe('CLOSED');
      expect(status.statusLabel).toBe('休市');
      expect(status.isHoliday).toBe(true);
      expect(status.holidayReason).toContain('馬丁路德金紀念日');
    });

    it('美股半日市 (2026-11-27 黑色星期五) 11:00 美東應判定為半日市交易中', () => {
      // 2026-11-27 11:00 美東 (EST UTC-5) = 2026-11-27T16:00:00.000Z
      const simulatedTime = new Date('2026-11-27T16:00:00.000Z');
      const status = getUsMarketStatus(simulatedTime);
      expect(status.status).toBe('EARLY_CLOSE');
      expect(status.statusLabel).toBe('半日市交易中');
      expect(status.isEarlyClose).toBe(true);
      expect(status.isOpen).toBe(true);
    });
  });
});
