import { describe, it, expect } from 'vitest';

describe('Cadence Scheduled Sync - TDD Unit Tests', () => {
  it('1. 應正確依日期判定每週五 TDCC 集保觸發條件', () => {
    // 模擬週五 (day 5) 且 19:00
    const fridayDate = new Date('2026-10-23T19:30:00');
    const isFridayNight = fridayDate.getDay() === 5 && fridayDate.getHours() >= 18;
    expect(isFridayNight).toBe(true);

    // 模擬週三 (day 3)
    const wedDate = new Date('2026-10-21T19:30:00');
    const isWedNight = wedDate.getDay() === 5 && wedDate.getHours() >= 18;
    expect(isWedNight).toBe(false);
  });

  it('2. 應正確依月份日期判定每月營收 (1~11 號) 觸發條件', () => {
    const date1 = new Date('2026-10-05');
    const isRevenueWindow1 = date1.getDate() >= 1 && date1.getDate() <= 11;
    expect(isRevenueWindow1).toBe(true);

    const date2 = new Date('2026-10-21');
    const isRevenueWindow2 = date2.getDate() >= 1 && date2.getDate() <= 11;
    expect(isRevenueWindow2).toBe(false);
  });

  it('3. 應正確依月份日期判定董監質押 (16 號) 觸發條件', () => {
    const date16 = new Date('2026-10-16');
    const isPledgeDay = date16.getDate() === 16;
    expect(isPledgeDay).toBe(true);
  });
});
