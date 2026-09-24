import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTaipeiClock, RealtimeMarketClock } from './RealtimeMarketClock';

describe('RealtimeMarketClock 自封閉即時台北市場時鐘規範測試 (Ticket 01 / PRD #0138)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatTaipeiClock 台北時區時鐘格式化', () => {
    it('應正確將 UTC 時間轉換為台北時區 (UTC+8) 的 HH:mm:ss 格式', () => {
      // 2026-09-24T04:43:08Z -> 台北時間 12:43:08
      const date = new Date('2026-09-24T04:43:08Z');
      const clockStr = formatTaipeiClock(date);
      expect(clockStr).toBe('12:43:08');
    });

    it('跨日與補零格式驗證 (例如 09:05:03)', () => {
      // 2026-09-24T01:05:03Z -> 台北時間 09:05:03
      const date = new Date('2026-09-24T01:05:03Z');
      const clockStr = formatTaipeiClock(date);
      expect(clockStr).toBe('09:05:03');
    });

    it('午夜時段補零驗證 (例如 00:00:00)', () => {
      // 2026-09-23T16:00:00Z -> 台北時間 00:00:00
      const date = new Date('2026-09-23T16:00:00Z');
      const clockStr = formatTaipeiClock(date);
      expect(clockStr).toBe('00:00:00');
    });
  });

  describe('自封閉計時器與動態更新機制', () => {
    it('應能正確輸出 RealtimeMarketClock 元件定義', () => {
      expect(RealtimeMarketClock).toBeDefined();
      expect(typeof RealtimeMarketClock).toBe('function');
    });
  });
});
