import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MacroQuickCalibrationModal } from './MacroQuickCalibrationModal';
import type { MacroIndicatorSnapshot } from '../../types/macro';

const MOCK_MACRO_SNAPSHOT: MacroIndicatorSnapshot = {
  date: '2026-10-27',
  updatedAt: Date.now(),
  us10y: 4.25,
  us2y: 3.95,
  yieldSpread: 0.3,
  isYieldInverted: false,
  vix: 22.5,
  vixLevel: 'ELEVATED',
  fearAndGreedIndex: 45,
  fearAndGreedLevel: 'FEAR',
  goldPrice: 2750,
  oilPrice: 72,
  dxy: 104.2,
  usdToTwd: 32.1,
  twFuturesNetOi: -45000,
  twMarginMaintenance: 165.2,
  creditSpreadOAS: 3.5,
  cdsInsuranceIndex: 65,
};

describe('MacroQuickCalibrationModal (Spec 0205 / Ticket 03)', () => {
  it('當 isOpen 為 false 時不應渲染彈窗 (輸出空字串)', () => {
    const html = renderToStaticMarkup(
      <MacroQuickCalibrationModal
        isOpen={false}
        onClose={vi.fn()}
        macroSnapshot={MOCK_MACRO_SNAPSHOT}
        onSave={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('當 isOpen 為 true 時應正確渲染快速校準表單各項欄位標籤與標題', () => {
    const html = renderToStaticMarkup(
      <MacroQuickCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        macroSnapshot={MOCK_MACRO_SNAPSHOT}
        onSave={vi.fn()}
      />
    );

    expect(html).toContain('10 秒極簡快速校準宏觀數據');
    expect(html).toContain('美債 10 年期殖利率 (%)');
    expect(html).toContain('美債 2 年期殖利率 (%)');
    expect(html).toContain('VIX 恐慌指數');
    expect(html).toContain('外資台指期未平倉淨口數');
    expect(html).toContain('全市場融資維持率 (%)');
    expect(html).toContain('高收益債信用利差 OAS (%)');
    expect(html).toContain('CDS 信用違約交換指數 (基點)');
    expect(html).toContain('💾 儲存並即時重算');
  });
});
