import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ZavyMacroCompassCard } from './ZavyMacroCompassCard';
import { MacroCompassEvaluation, MacroIndicatorSnapshot } from '../../types/zavySlowWealth';

describe('ZavyMacroCompassCard (總經三級週期羅盤卡片誠實展示測試)', () => {
  const mockEvaluation: MacroCompassEvaluation = {
    tidal: {
      regime: 'PRODUCTIVITY_EXPANSION',
      treasury10yNewNormalStatus: 'IN_RANGE_4_TO_5_5',
      narrative: '生產力擴張期',
    },
    wave: {
      phase: 'EXPANSION',
      confidenceScore: 50,
      cycleSummary: '製造業處於健康擴張期。',
      smallTruckVsBigTruckStatus: {
        twStatus: 'SYNCHRONIZED',
        leadTimeMonths: 0,
        commentary: '美台製造業週期基本同步。',
      },
    },
    creditRadar: {
      creditRiskLevel: 'LOW',
      isOasOverheatedLow: false,
      hasEarlyCccStress: false,
      warningMessage: '✅ 信貸流動性充裕',
    },
  };

  it('無資料時應誠實呈現 --，嚴禁硬編碼假常數 (4.45 / 51.5 / 53.8 / 3.20 / 7.50)', () => {
    const emptySnapshot: MacroIndicatorSnapshot = {};

    const html = renderToStaticMarkup(
      <ZavyMacroCompassCard evaluation={mockEvaluation} snapshot={emptySnapshot} />
    );

    // 嚴禁出現假兜底數值
    expect(html).not.toContain('4.45');
    expect(html).not.toContain('51.5');
    expect(html).not.toContain('53.8');
    expect(html).not.toContain('3.20');
    expect(html).not.toContain('7.50');

    // 應誠實包含 --
    expect(html).toContain('--');
    expect(html).toContain('美 ISM: --');
    expect(html).toContain('台 PMI: --');
  });

  it('有真實數據時應如實呈現對應數值與百分比', () => {
    const realSnapshot: MacroIndicatorSnapshot = {
      treasuryYield10y: 4.35,
      usIsmPmi: 52.3,
      twPmi: 54.1,
      highYieldSpreadOas: 3.42,
      cccHighYieldSpread: 8.15,
    };

    const html = renderToStaticMarkup(
      <ZavyMacroCompassCard evaluation={mockEvaluation} snapshot={realSnapshot} />
    );

    expect(html).toContain('4.35%');
    expect(html).toContain('美 ISM: 52.3');
    expect(html).toContain('台 PMI: 54.1');
    expect(html).toContain('高收益債 OAS 3.42%');
    expect(html).toContain('CCC 垃圾債利差 8.15%');
  });
});
