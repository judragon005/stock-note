import { describe, it, expect } from 'vitest';
import { EXPORT_ACTIONS_CONFIG, resolveExportBarTexts } from './HeaderExportBar';

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

  describe('resolveExportBarTexts - 真實數據動態綁定規範 (Ticket 01)', () => {
    it('應優先採用 report.marketBar 中動態傳入之來源與區間文字，淘汰寫死假字串', () => {
      const mockReport = {
        marketBar: {
          dataSourceText: '日 K TWSE | 即時報價',
          dataRangeText: '2026-08-01 ~ 2026-09-30，共 42 個交易日',
        },
      } as any;

      const { sourcesText, rangeText } = resolveExportBarTexts(mockReport);
      expect(sourcesText).toBe('日 K TWSE | 即時報價');
      expect(rangeText).toBe('2026-08-01 ~ 2026-09-30，共 42 個交易日');
      expect(rangeText).not.toContain('2026-05-04 ~ 2026-09-18');
    });

    it('若 report 內無 dataRangeText，應安全回退為合理提示而非硬編碼致茂區間', () => {
      const mockReport = {
        marketBar: {},
      } as any;

      const { sourcesText, rangeText } = resolveExportBarTexts(mockReport);
      expect(sourcesText).toContain('TWSE');
      expect(rangeText).toBe('歷史行情資料');
      expect(rangeText).not.toContain('2026-05-04 ~ 2026-09-18');
    });

    it('若明確傳入自訂 sourcesText 或 rangeText，應具備最高覆蓋優先級', () => {
      const mockReport = {
        marketBar: {
          dataSourceText: '日 K TWSE',
          dataRangeText: '2026-01-01 ~ 2026-09-30',
        },
      } as any;

      const { sourcesText, rangeText } = resolveExportBarTexts(
        mockReport,
        '自訂來源',
        '自訂區間'
      );
      expect(sourcesText).toBe('自訂來源');
      expect(rangeText).toBe('自訂區間');
    });
  });
});


