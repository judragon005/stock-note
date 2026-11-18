import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarketPulseAndCanariesCard } from './MarketPulseAndCanariesCard';
import { sanitizeMacroRecord } from '../../utils/macroPulseStorage';

describe('MarketPulseAndCanariesCard (Spec 0235 Ticket 04)', () => {
  it('應汰除寫死的 CDS 65 與 M2 2.8%，真實呈現 FRED 信貸/製造業指標與多週期市場寬度', () => {
    const macro = sanitizeMacroRecord({
      date: '2026-11-18',
      us10y: 4.35,
      us2y: 4.1,
      vix: 19.2,
      cnnFearGreedScore: 46,
      goldPrice: 2680,
      oilPrice: 69.5,
      dxy: 105.4,
      usdToTwd: 32.35,
      usCpiYoY: 2.6,
      creditSpreadOas: 3.12,
      igSpreadOas: 0.89,
      cccSpreadOas: 8.75,
      breakeven10y: 2.34,
      usOrdersMinusInvSpread: 2.4,
      twFuturesNetOi: -33500,
      twMarginMaintenance: 162.4,
      multiHorizonBreadth: {
        tw: { breadth20: 52, breadth60: 47, breadth200: 61, totalStocks: 1800 },
        us: { breadth20: 64, breadth60: 59, breadth200: 68, totalStocks: 500 },
        twMarginDeleveraging: {
          taiexMaxDrawdown: -7.2,
          marginReductionPercent: -8.6,
          marginDeleveragingRatio: 1.19,
          isCleaned: true,
        },
      },
    } as any);

    const html = renderToStaticMarkup(
      <MarketPulseAndCanariesCard
        macroSnapshot={macro}
        marketView="GLOBAL"
        historyList={[macro as any]}
        isRefreshing={false}
        onRefreshPulse={vi.fn()}
        onExportCsv={vi.fn()}
      />
    );

    expect(html).not.toContain('CDS 債券違約保險指數');
    expect(html).not.toContain('美 M2 年增');
    expect(html).toContain('8.75%');
    expect(html).toContain('0.89%');
    expect(html).toContain('2.34%');
    expect(html).toContain('+2.4%');
    expect(html).toContain('2.6%');
    expect(html).toContain('52%');
    expect(html).toContain('64%');
    expect(html).toContain('1.19x');
  });

  it('缺少選填 FRED 與寬度欄位時應優雅降級顯示 -- 而不拋錯', () => {
    const minimal = sanitizeMacroRecord({ date: '2026-11-18' });
    const html = renderToStaticMarkup(
      <MarketPulseAndCanariesCard
        macroSnapshot={minimal}
        marketView="GLOBAL"
        historyList={[]}
        isRefreshing={false}
        onRefreshPulse={vi.fn()}
        onExportCsv={vi.fn()}
      />
    );
    expect(html).toContain('市場四柱即時脈搏');
    expect(html).toContain('--');
  });
});
