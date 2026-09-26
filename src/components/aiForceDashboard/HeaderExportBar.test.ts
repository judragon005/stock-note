import { describe, it, expect } from 'vitest';
import { EXPORT_ACTIONS_CONFIG } from './HeaderExportBar';

describe('HeaderExportBar configuration', () => {
  it('應該定義 5 大標準匯出動作', () => {
    expect(EXPORT_ACTIONS_CONFIG).toHaveLength(5);
    const ids = EXPORT_ACTIONS_CONFIG.map((a) => a.id);
    expect(ids).toContain('DASHBOARD_PNG');
    expect(ids).toContain('ALL_CHARTS_PNG');
    expect(ids).toContain('CSV');
    expect(ids).toContain('HTML');
    expect(ids).toContain('PDF');
  });

  it('所有動作應具備繁體中文標籤與圖示', () => {
    EXPORT_ACTIONS_CONFIG.forEach((act) => {
      expect(act.label.length).toBeGreaterThan(0);
      expect(act.icon).toBeDefined();
    });
  });
});
