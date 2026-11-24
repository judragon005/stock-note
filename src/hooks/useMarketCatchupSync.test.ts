import { describe, it, expect, vi } from 'vitest';
import {
  shouldNotifySyncCompleted,
  shouldContinueCatchupPolling,
  createCatchupPollController,
} from './useMarketCatchupSync';

describe('Ticket 01: useMarketCatchupSync 狀態切換與節流測試 (Spec 0166)', () => {
  it('1. shouldNotifySyncCompleted 應在前次追趕中且本次結束時觸發 true', () => {
    expect(shouldNotifySyncCompleted(true, false)).toBe(true);
  });

  it('2. shouldNotifySyncCompleted 在其他狀態下應嚴格回傳 false (防止重複觸發重載)', () => {
    // 兩次都在追趕中
    expect(shouldNotifySyncCompleted(true, true)).toBe(false);
    // 兩次都未在追趕中
    expect(shouldNotifySyncCompleted(false, false)).toBe(false);
    // 剛啟動追趕
    expect(shouldNotifySyncCompleted(false, true)).toBe(false);
  });

  describe('Spec 0246 Ticket 08 (Seam 2): 背景追趕進行中自動輪詢與完成刷新契約', () => {
    it('3. shouldContinueCatchupPolling 應於 isCatchingUp 且未達上限時回傳 true，完成或逾上限則停止', () => {
      expect(shouldContinueCatchupPolling(true, 0, 60)).toBe(true);
      expect(shouldContinueCatchupPolling(true, 59, 60)).toBe(true);
      expect(shouldContinueCatchupPolling(true, 60, 60)).toBe(false);
      expect(shouldContinueCatchupPolling(false, 2, 60)).toBe(false);
    });

    it('4. createCatchupPollController 偵測到 isCatchingUp=true 時應定時輪詢 /api/market/sync-status 直至完成並僅通知一次 onSyncCompleted', async () => {
      vi.useFakeTimers();
      try {
        const responses = [
          { isCatchingUp: true, tw: { latestDate: '2026-11-19', anchorDate: '2026-11-23', isStale: true }, us: { latestDate: '2026-11-23', anchorDate: '2026-11-23', isStale: false }, lastCatchupTime: 1, timestamp: 1 },
          { isCatchingUp: true, tw: { latestDate: '2026-11-20', anchorDate: '2026-11-23', isStale: true }, us: { latestDate: '2026-11-23', anchorDate: '2026-11-23', isStale: false }, lastCatchupTime: 1, timestamp: 2 },
          { isCatchingUp: false, tw: { latestDate: '2026-11-23', anchorDate: '2026-11-23', isStale: false }, us: { latestDate: '2026-11-23', anchorDate: '2026-11-23', isStale: false }, lastCatchupTime: 1, timestamp: 3 },
        ];
        let callIdx = 0;
        const requestedUrls: string[] = [];
        const mockFetcher = vi.fn(async (url: string) => {
          requestedUrls.push(url);
          const payload = responses[Math.min(callIdx++, responses.length - 1)];
          return { ok: true, json: async () => payload } as any;
        });

        const onCompleted = vi.fn();
        const controller = createCatchupPollController({
          fetcher: mockFetcher as unknown as typeof fetch,
          pollIntervalMs: 1000,
          maxPollAttempts: 10,
          onSyncCompleted: onCompleted,
        });

        // 首次檢查帶 ?catchup=true -> 啟動追趕 (isCatchingUp: true)
        await controller.checkStatus(true);
        expect(requestedUrls).toEqual(['/api/market/sync-status?catchup=true']);
        expect(onCompleted).toHaveBeenCalledTimes(0);

        // 第 1 次輪詢 (不帶 ?catchup=true) -> 仍在追趕中
        await vi.advanceTimersByTimeAsync(1000);
        expect(requestedUrls).toEqual(['/api/market/sync-status?catchup=true', '/api/market/sync-status']);
        expect(onCompleted).toHaveBeenCalledTimes(0);

        // 第 2 次輪詢 -> 追趕完成 (isCatchingUp: false) -> 觸發 onSyncCompleted 並停止輪詢
        await vi.advanceTimersByTimeAsync(1000);
        expect(onCompleted).toHaveBeenCalledTimes(1);

        // 後續時間推進不應再發起任何多餘輪詢
        await vi.advanceTimersByTimeAsync(5000);
        expect(requestedUrls).toHaveLength(3);

        controller.dispose();
      } finally {
        vi.useRealTimers();
      }
    });

    it('5. 輪詢遭遇單次瞬斷（HTTP 503 或網路例外）應容錯繼續輪詢至成功；連續 3 次失敗才停止並重設狀態', async () => {
      vi.useFakeTimers();
      try {
        let step = 0;
        const mockFetcher = vi.fn(async () => {
          step += 1;
          if (step === 1) {
            return {
              ok: true,
              json: async () => ({
                isCatchingUp: true,
                tw: { latestDate: '2026-11-19', anchorDate: '2026-11-23', isStale: true },
                us: { latestDate: '2026-11-23', anchorDate: '2026-11-23', isStale: false },
                lastCatchupTime: 1,
                timestamp: 1,
              }),
            } as any;
          }
          if (step === 2) {
            return { ok: false, status: 503 } as any;
          }
          return {
            ok: true,
            json: async () => ({
              isCatchingUp: false,
              tw: { latestDate: '2026-11-23', anchorDate: '2026-11-23', isStale: false },
              us: { latestDate: '2026-11-23', anchorDate: '2026-11-23', isStale: false },
              lastCatchupTime: 1,
              timestamp: 3,
            }),
          } as any;
        });

        const onCompleted = vi.fn();
        const controller = createCatchupPollController({
          fetcher: mockFetcher as unknown as typeof fetch,
          pollIntervalMs: 500,
          maxPollAttempts: 10,
          onSyncCompleted: onCompleted,
        });

        await controller.checkStatus(true); // step 1: catching up
        await vi.advanceTimersByTimeAsync(500); // step 2: 503 transient failure -> should retry
        await vi.advanceTimersByTimeAsync(500); // step 3: recovered -> completed!
        expect(mockFetcher).toHaveBeenCalledTimes(3);
        expect(onCompleted).toHaveBeenCalledTimes(1);
        controller.dispose();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
