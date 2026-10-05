import { describe, it, expect } from 'vitest';
import { shouldNotifySyncCompleted } from './useMarketCatchupSync';

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
});
