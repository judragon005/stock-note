import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ZavyDualTrackDecisionCard } from './ZavyDualTrackDecisionCard';
import { TrackADecision, TrackBDecision } from '../../types/zavySlowWealth';

describe('ZavyDualTrackDecisionCard (第三鏡頭 A/B 雙軌決策卡片測試)', () => {
  const mockTrackA: TrackADecision = {
    cyclePhase: 'EXPANSION',
    recommendedEquityWeightRange: [70, 85],
    recommendedEquityWeightMid: 77.5,
    maxDrawdownTolerancePercent: 20,
    stressScenarioDrawdownPercent: 30,
    riskBudgetMaxEquityExposurePercent: 66.7,
    finalSuggestedEquityExposurePercent: 66.7,
    recommendedActionSummary: '景氣擴張順風期，持股可維持 70%~85% 積極水位。',
    currentEquityWeightPercent: 78.4,
    debtRepaymentSummary: '目前質押借款總額為 $500,000，負債即負向債券，優先償還質押本金相當於鎖定無風險正報酬並釋放維持率安全邊際。',
    activeLoanPrincipalTwd: 500000,
    sellWaterfallPreview: {
      tier1SellCandidates: ['2603 長榮'],
      tier2SellCandidates: ['00878 國泰永續高股息'],
      tier3PreservedCandidates: ['0056 元大高股息'],
      tier4CoreHoldings: ['0050 元大台灣50 🔒[設質鎖定]'],
    },
  };

  const mockTrackB: TrackBDecision = {
    currentAssetAllocation: {
      equityPercent: 72.5,
      govBondPercent: 10.0,
      corpBondPercent: 5.5,
      goldPercent: 5.0,
      reitsPercent: 2.0,
      cashPercent: 5.0,
    },
    targetAllocation: {
      equityPercent: 60,
      govBondPercent: 20,
      goldPercent: 10,
      cashPercent: 10,
    },
    isRebalanceRecommended: true,
    rebalanceTriggerReason: '股票資產實際佔比 (72.5%) 偏離目標 (60%) 超過 ±5% 閾值。',
    dividendRedirectPlanSummary: '建議將每年股息現金活水優先注入純公債 (00687B) 與黃金 (00635U)。',
    dividendRedirectDetails: [
      { targetCategory: '純政府公債 (00687B)', allocationPercent: 66.7, amountTwd: 80000 },
      { targetCategory: '黃金儲備 (00635U)', allocationPercent: 33.3, amountTwd: 40000 },
    ],
    fire30xStatus: {
      targetCapital30xTwd: 18000000,
      currentProgressPercent: 45.5,
      isCoastFireAchieved: true,
    },
    srrRiskReductionPercent: 18.4,
    equityOnlyExhaustionRate: 24.2,
    shieldedExhaustionRate: 5.8,
  };

  it('[Spec 0223 / Ticket 04] 鏡頭三 A/B 雙軌決策應掛載 TermTooltip、5 檔風險耐受度 Pills、當前實際持股對比、質押還款建議與 B 軌真假防彈衣/SRR/30x 本金全貫通', () => {
    const htmlTrackA = renderToStaticMarkup(
      <ZavyDualTrackDecisionCard trackA={mockTrackA} trackB={mockTrackB} />
    );

    // 1. 應掛載 TermTooltip 與「見自己」雙軌定位指引
    expect(htmlTrackA).toContain('term-tooltip-trigger');
    expect(htmlTrackA).toContain('見自己');

    // 2. 應提供 5 檔風險耐受度互動 Pills，且切換至 15% 穩健時即時更新安全持股上限 (15 / 30 = 50%)
    expect(htmlTrackA).toContain('10% 保守');
    expect(htmlTrackA).toContain('15% 穩健');
    expect(htmlTrackA).toContain('20% 平衡');
    expect(htmlTrackA).toContain('25% 積極');
    expect(htmlTrackA).toContain('30% 進取');

    let updatedTol = 20;
    const handleTol = (tol: number) => {
      updatedTol = tol;
    };
    handleTol(15);
    expect(updatedTol).toBe(15);
    const htmlTrackATol15 = renderToStaticMarkup(
      <ZavyDualTrackDecisionCard
        trackA={{
          ...mockTrackA,
          maxDrawdownTolerancePercent: updatedTol,
          riskBudgetMaxEquityExposurePercent: 50,
          finalSuggestedEquityExposurePercent: 50,
        }}
        trackB={mockTrackB}
        onUpdateTolerance={handleTol}
      />
    );
    expect(htmlTrackATol15).toContain('耐受回撤 15% / 壓力跌幅 30%');
    expect(htmlTrackATol15).toContain('50%');

    // 3. 應並列顯示當前實際持股與最終建議持股上限，以及質押還款建議橫幅
    expect(htmlTrackA).toContain('當前實際持股 78.4%');
    expect(htmlTrackA).toContain('66.7%');
    expect(htmlTrackA).toContain('目前質押借款總額為 $500,000');
    expect(htmlTrackA).toContain('0050 元大台灣50 🔒[設質鎖定]');

    // 4. 切換至 B 軌檢視
    const htmlTrackB = renderToStaticMarkup(
      <ZavyDualTrackDecisionCard
        trackA={mockTrackA}
        trackB={mockTrackB}
        initialActiveTab="TRACK_B"
      />
    );

    expect(htmlTrackB).toContain('股票資產實際佔比 (72.5%) 偏離目標 (60%) 超過 ±5% 閾值。');
    expect(htmlTrackB).toContain('公司債 5.5%');
    expect(htmlTrackB).toContain('REITs 2%');
    expect(htmlTrackB).toContain('80,000');
    expect(htmlTrackB).toContain('18,000,000');
    expect(htmlTrackB).toContain('24.2%');
    expect(htmlTrackB).toContain('5.8%');
    expect(htmlTrackB).toContain('18.4%');
  });
});

