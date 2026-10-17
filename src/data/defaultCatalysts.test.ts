import { describe, it, expect } from 'vitest';
import {
  OFFICIAL_FORWARD_CATALYSTS,
  generateRollingSeedCatalysts,
} from './defaultCatalysts';
import { calculateUpcomingCatalysts } from '../engine/macroAdvisorEngine';

describe('官方前瞻種子庫與自適應滾動產生器 (defaultCatalysts)', () => {
  it('1. OFFICIAL_FORWARD_CATALYSTS 應收錄 2026 Q4 與 2027 年重磅日程', () => {
    expect(OFFICIAL_FORWARD_CATALYSTS.length).toBeGreaterThanOrEqual(4);
    const fomcNov = OFFICIAL_FORWARD_CATALYSTS.find((c) => c.date === '2026-11-05');
    expect(fomcNov).toBeDefined();
    expect(fomcNov?.category).toBe('CENTRAL_BANK');
    expect(fomcNov?.impact).toBe('HIGH');
  });

  it('2. 在基準日 2026-10-17 下，generateRollingSeedCatalysts 應回傳未來非空且 >= 4 筆事件', () => {
    const list = generateRollingSeedCatalysts('2026-10-17');
    const calculated = calculateUpcomingCatalysts(list, '2026-10-17');

    expect(calculated.length).toBeGreaterThanOrEqual(4);
    // 所有事件天數必須非負且升冪排序
    calculated.forEach((c) => {
      expect(c.daysLeft).toBeGreaterThanOrEqual(0);
    });
    for (let i = 1; i < calculated.length; i++) {
      expect(calculated[i].daysLeft).toBeGreaterThanOrEqual(calculated[i - 1].daysLeft);
    }
  });

  it('3. 在未來任何時間點 (如 2027-05-15)，仍能透過常態週期與滾動種子維持非空', () => {
    const list = generateRollingSeedCatalysts('2027-05-15');
    const calculated = calculateUpcomingCatalysts(list, '2027-05-15');

    expect(calculated.length).toBeGreaterThanOrEqual(4);
  });
});
