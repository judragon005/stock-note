import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DualMomentumRotationCard } from './DualMomentumRotationCard';
import {
  DEFAULT_MOMENTUM_UNIVERSES,
  evaluateDualMomentum,
} from '../../engine/dualMomentumEngine';

describe('DualMomentumRotationCard (Spec 0235 Ticket 07)', () => {
  it('應依 us3m 動態無風險利率顯示排行榜、在庫持倉權重徽章，並提供一鍵技術面與下單換倉按鈕', () => {
    const universe = DEFAULT_MOMENTUM_UNIVERSES.find((u) => u.id === 'global_macro')!;
    const result = evaluateDualMomentum({
      universeConfig: universe,
      quotesMap: {},
      riskFreeRateAnnualized: 0.043,
    });

    const html = renderToStaticMarkup(
      <DualMomentumRotationCard
        universes={DEFAULT_MOMENTUM_UNIVERSES}
        selectedUniverseId={universe.id}
        onSelectUniverse={vi.fn()}
        momentumSignal={result}
        asOfDate="2026-11-18"
        daysUntilMonthEnd={12}
        effectiveRiskFreeRate={0.043}
        holdingWeightMap={{ [universe.symbols[0].symbol]: 18.5 }}
        onInspectTechnical={vi.fn()}
        onOpenTradeModal={vi.fn()}
      />
    );

    expect(html).toContain('雙重動能跨資產輪動排行榜');
    expect(html).toContain('4.3%');
    expect(html).toContain('在庫 18.5%');
    expect(html).toContain('📈 技術面');
    expect(html).toContain('⚡ 下單換倉');
  });
});
