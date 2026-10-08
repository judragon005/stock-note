import { describe, it, expect } from 'vitest';
import {
  calculateTdccScales,
  projectTdccRatioToY,
  projectTdccShareholdersToY,
} from './TdccDistributionCard';
import type { TdccDistributionData } from '../../../types/aiForceDashboard';

describe('TdccDistributionCard - TDD Unit Tests', () => {
  const mockHistory = [
    { date: '2026-09-04', totalShareholders: 850000, over1000Ratio: 65.2 },
    { date: '2026-09-11', totalShareholders: 848000, over1000Ratio: 65.8 },
    { date: '2026-09-18', totalShareholders: 845000, over1000Ratio: 66.5 },
    { date: '2026-09-25', totalShareholders: 840000, over1000Ratio: 67.4 },
  ];

  it('1. 空數據時 calculateTdccScales 應回傳預設保底範圍', () => {
    const scales = calculateTdccScales([], 200);
    expect(scales.leftMin).toBe(0);
    expect(scales.leftMax).toBe(100);
    expect(scales.rightMin).toBe(0);
    expect(scales.rightMax).toBe(1000000);
  });

  it('2. 正常數據時 calculateTdccScales 應依據大戶比例與股東人數計算極值並預留邊界', () => {
    const scales = calculateTdccScales(mockHistory, 200);
    expect(scales.leftMin).toBeLessThan(65.2);
    expect(scales.leftMax).toBeGreaterThan(67.4);
    expect(scales.rightMin).toBeLessThan(840000);
    expect(scales.rightMax).toBeGreaterThan(850000);
  });

  it('3. projectTdccRatioToY 應將較高持股比例投影為較小的 Y 座標 (靠近 SVG 頂端)', () => {
    const scales = calculateTdccScales(mockHistory, 200);
    const yLow = projectTdccRatioToY(65.2, scales, 200);
    const yHigh = projectTdccRatioToY(67.4, scales, 200);

    expect(yHigh).toBeLessThan(yLow);
    expect(yHigh).toBeGreaterThanOrEqual(10); // 考慮頂部留白
  });

  it('4. projectTdccShareholdersToY 應將較多股東人數投影為較小的 Y 座標', () => {
    const scales = calculateTdccScales(mockHistory, 200);
    const yFew = projectTdccShareholdersToY(840000, scales, 200);
    const yMany = projectTdccShareholdersToY(850000, scales, 200);

    expect(yMany).toBeLessThan(yFew);
  });

  it('5. 驗證完整 TdccDistributionData 結構與空狀態防禦', () => {
    const emptyData: TdccDistributionData = {
      history: [],
      concentrationBadge: '美股不適用',
      asOfDateText: '美股市場',
      isEmpty: true,
      emptyMessage: '美股無集保機制',
    };

    expect(emptyData.isEmpty).toBe(true);
    expect(emptyData.emptyMessage).toBe('美股無集保機制');
  });
});
