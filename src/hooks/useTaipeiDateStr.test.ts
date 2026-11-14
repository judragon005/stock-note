import { describe, it, expect, vi } from 'vitest';
import { createTaipeiDateSyncController } from './useTaipeiDateStr';

describe('useTaipeiDateStr / createTaipeiDateSyncController (Ticket #545 跨午夜刷新)', () => {
  it('當系統時間跨越台北午夜 23:59:50 -> 00:00:50 時，輪詢應觸發日期更新', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T15:59:50.000Z')); // 台北 2026-03-10 23:59:50

    const updates: string[] = [];
    const controller = createTaipeiDateSyncController((next) => updates.push(next));
    expect(controller.getCurrentDate()).toBe('2026-03-10');

    const cleanup = controller.start();
    try {
      // 推進 60 秒至 台北 2026-03-11 00:00:50
      vi.advanceTimersByTime(60_000);
      expect(updates).toEqual(['2026-03-11']);
    } finally {
      cleanup();
      vi.useRealTimers();
    }
  });
});
