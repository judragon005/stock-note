import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MacroDualThermometerBar } from './MacroDualThermometerBar';
import type { MacroIndicatorSnapshot, MacroDualThermometerResult } from '../../types/macro';

describe('MacroDualThermometerBar (雙溫度計排版與防折行測試)', () => {
  const mockMacroSnapshot = {
    date: '2026-10-31',
    soxIndex: 5120.5,
    soxChangePercent: -1.2,
    soxAbove20Ma: false,
    soxBias20Ma: -1.5,
    tsmAdrPremiumPercent: 11.75,
    taiexIndex: 22800.0,
    taiexChangePercent: 0.35,
    taiexAbove20Ma: true,
    taiexBias20Ma: 0.88,
    twMarketBreadth: {
      advancingCount: 380,
      decliningCount: 590,
      unchangedCount: 100,
      pctAbove20MA: 48.5,
      breadthRegime: 'NARROW_TSMC_TRAP' as const,
    },
    twInstitutionalSpot: {
      foreignNetTwdBillions: 100,
      trustNetTwdBillions: 20,
      dealerNetTwdBillions: 5.4,
      totalNetTwdBillions: 125.4,
    },
    twFuturesNetOi: -31200,
    usdToTwd: 32.15,
    updatedAt: Date.now(),
  } as unknown as MacroIndicatorSnapshot;

  const mockDualThermometer: MacroDualThermometerResult = {
    strategicRegime: {
      score: 43,
      stance: 'NEUTRAL',
      label: '長線平衡 · 核心配置',
      recommendedEquityCapPercent: 51,
      drivers: ['美債殖利率曲線倒掛 (-0.13%)', '美國 CPI 通膨年增率偏高 (4.02%)', '信用利差維持低位 (3.5%)'],
    },
    tacticalSwing: {
      score: 25,
      signal: 'DEFENSIVE_CASH',
      label: '雙破月線且籌碼偏空 · 收回波段現金',
      twSwingSummary: '台股位於 20MA 月線下 (乖離 -5.27%)，⚠️ 呈現拉積盤結構。',
      usSwingSummary: '費半 (^SOX) 回測 20MA 下方 (乖離 -9.25%)，TSM ADR 溢折價 11.75%。',
      isNarrowTsmcTrap: true,
      drivers: ['偵測到台股拉積盤結構（指數紅盤但下跌家數顯著多於上漲家數），中小型股慎防失血'],
    },
  };

  it('波段溫度計數值應套用 nowrap 與 tabular-nums 防折行樣式，且第一行不包含拉積盤徽章', () => {
    const html = renderToStaticMarkup(
      <MacroDualThermometerBar
        macroSnapshot={mockMacroSnapshot}
        dualThermometer={mockDualThermometer}
        activeMarketTab="GLOBAL"
        onMarketTabChange={vi.fn()}
      />
    );

    // 斷言分數存在且帶有 nowrap 與 tabular-nums
    expect(html).toContain('25 / 100');
    expect(html).toContain('white-space:nowrap');
    expect(html).toContain('font-variant-numeric:tabular-nums');

    // 斷言拉積盤警訊徽章存在
    expect(html).toContain('⚠️ 拉積盤警訊（賺指數賠價差）');

    // 驗證拉積盤警訊與戰術訊號 label 在同一個 div 容器中（次行對稱），而非在標題旁
    const secondLineContent = html.substring(
      html.indexOf('雙破月線且籌碼偏空 · 收回波段現金'),
      html.indexOf('雙破月線且籌碼偏空 · 收回波段現金') + 400
    );
    expect(secondLineContent).toContain('⚠️ 拉積盤警訊（賺指數賠價差）');
  });

  it('Spec 0235 Ticket 05: GLOBAL/TW 卡4顯示外資現貨，US 視角顯示 S&P 500 與 Nasdaq', () => {
    const globalHtml = renderToStaticMarkup(
      <MacroDualThermometerBar
        macroSnapshot={{
          ...mockMacroSnapshot,
          sp500Index: 5985.2,
          sp500ChangePercent: 0.65,
          sp500Bias20Ma: 1.4,
          nasdaqIndex: 19240.8,
          nasdaqChangePercent: 1.12,
          nasdaqBias20Ma: 2.1,
        }}
        dualThermometer={mockDualThermometer}
        activeMarketTab="GLOBAL"
        onMarketTabChange={vi.fn()}
      />
    );
    expect(globalHtml).toContain('外資 +100.0 億');

    const usHtml = renderToStaticMarkup(
      <MacroDualThermometerBar
        macroSnapshot={{
          ...mockMacroSnapshot,
          sp500Index: 5985.2,
          sp500ChangePercent: 0.65,
          sp500Bias20Ma: 1.4,
          nasdaqIndex: 19240.8,
          nasdaqChangePercent: 1.12,
          nasdaqBias20Ma: 2.1,
        }}
        dualThermometer={mockDualThermometer}
        activeMarketTab="US"
        onMarketTabChange={vi.fn()}
      />
    );
    expect(usHtml).toContain('S&amp;P 500 (^GSPC)');
    expect(usHtml).toContain('5,985.2');
    expect(usHtml).toContain('Nasdaq (^IXIC)');
    expect(usHtml).toContain('19,240.8');
  });
});
