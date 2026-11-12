import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ZavyMacroCompassCard } from './ZavyMacroCompassCard';
import {
  MacroCompassEvaluation,
  MacroIndicatorSnapshot,
} from '../../types/zavySlowWealth';

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

  it('[Spec 0223 / Ticket 02] 鏡頭一應掛載 TermTooltip、顯示潮汐敘事、中文週期階段、免費真實替代硬數據與小車 LEADING_DOWN 三態', () => {
    const evalLeadingDown: MacroCompassEvaluation = {
      ...mockEvaluation,
      tidal: {
        regime: 'PRODUCTIVITY_EXPANSION',
        treasury10yNewNormalStatus: 'IN_RANGE_4_TO_5_5',
        narrative: '目前處於 AI 與先進半導體驅動之全球生產力大週期擴張期。',
      },
      wave: {
        phase: 'EXPANSION',
        confidenceScore: 83,
        cycleSummary: '美台製造業同步處於 50 以上健康擴張期。',
        smallTruckVsBigTruckStatus: {
          twStatus: 'LEADING_DOWN',
          leadTimeMonths: 3,
          commentary: '台灣小車率先面臨庫存堆積壓力，預告後續大卡車動能將趨緩。',
        },
      },
    };

    const proxySnapshot: MacroIndicatorSnapshot = {
      treasuryYield10y: 4.42,
      usNewOrdersMinusInventory: 3.2,
      twRevenueDiffusionIndex: 58.5,
      twExportOrdersYoY: 14.2,
    };

    const html = renderToStaticMarkup(
      <ZavyMacroCompassCard evaluation={evalLeadingDown} snapshot={proxySnapshot} />
    );

    // 1. 應掛載 TermTooltip 觸發器與新手圖標
    expect(html).toContain('term-tooltip-trigger');
    expect(html).toContain('新手解說與買賣指引');

    // 2. 應顯示潮汐完整白話敘事與中文波浪階段（非英文 EXPANSION）
    expect(html).toContain('目前處於 AI 與先進半導體驅動之全球生產力大週期擴張期。');
    expect(html).toContain('【擴張成長期】');
    expect(html).not.toContain('【EXPANSION】');

    // 3. 官方 PMI 為空時，應並列展示免費真實替代硬數據（新訂單減存貨 & 台股營收擴散指數）
    expect(html).toContain('美新訂單-存貨: +3.2%');
    expect(html).toContain('台股營收擴散: 58.5%');

    // 4. 台灣小車 LEADING_DOWN 應正確顯示「台灣小車率先降溫轉弱」與領先月數及營收/外銷 YoY
    expect(html).toContain('台灣小車率先降溫轉弱');
    expect(html).toContain('領先約 3 個月');
    expect(html).toContain('+14.2%');
  });
});
