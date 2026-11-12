import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ZavyMacroCompassCard } from './ZavyMacroCompassCard';
import { ZavyMarketBreadthCard } from './ZavyMarketBreadthCard';
import { ZavyDualTrackDecisionCard } from './ZavyDualTrackDecisionCard';
import { ZavySlowWealthWorkspace } from './ZavySlowWealthWorkspace';
import {
  MacroCompassEvaluation,
  MacroIndicatorSnapshot,
  TrackADecision,
  TrackBDecision,
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

  it('[Spec 0223 / Ticket 01] ZavySlowWealthWorkspace 頂部應提供「新手 30 秒慢富導覽」按鈕與三步驟白話心法卡', () => {
    const collapsedHtml = renderToStaticMarkup(
      <ZavySlowWealthWorkspace holdings={[]} accounts={[]} totalNavTwd={1000000} />
    );
    expect(collapsedHtml).toContain('新手 30 秒慢富導覽');
    expect(collapsedHtml).not.toContain('第一步：看天氣（鏡頭一）');

    const expandedHtml = renderToStaticMarkup(
      <ZavySlowWealthWorkspace
        holdings={[]}
        accounts={[]}
        totalNavTwd={1000000}
        initialShowBeginnerGuide={true}
      />
    );
    expect(expandedHtml).toContain('第一步：看天氣（鏡頭一）');
    expect(expandedHtml).toContain('第二步：量體溫（鏡頭二）');
    expect(expandedHtml).toContain('第三步：穿防彈衣（鏡頭三）');
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

  it('[Spec 0223 / Ticket 03] 鏡頭二應掛載 TermTooltip、顯示反恐慌定心丸、十年線防禦錨點、大盤/融資回撤雙膠囊與落底總結指引', () => {
    const html = renderToStaticMarkup(
      <ZavyMarketBreadthCard
        breadth={{
          asOfDate: '2026-11-10',
          market: 'TW',
          breadth20: 16.5,
          breadth60: 38.0,
          breadth200: 55.2,
          totalFilteredStocks: 2333,
        }}
        marginStatus={{
          asOfDate: '2026-11-10',
          indexDrawdownPercent: -8.5,
          marginDrawdownPercent: -12.0,
          marginDeleveragingRatio: 1.41,
          isDeleveragingSufficient: true,
          statusText: '融資減幅超過大盤跌幅，去槓桿清洗充分。',
        }}
        interpretation={{
          breadth20: 16.5,
          breadth60: 38.0,
          breadth200: 55.2,
          isOversoldOpportuneBuy: true,
          is200MaDivergenceInvalidated: false,
          fallbackIndicator: '200MA 寬度長期趨勢過濾',
          interpretationHeadline: '💎 製造業擴張期之波浪回檔黃金買點',
          actionGuidance: '總經大趨勢維持上行，短期 20MA 寬度急速超賣屬於非系統性「漣漪震盪」，勿對漣漪起反應。',
        }}
        bottomingChecklist={{
          checklist: [
            {
              id: 'deleveraging',
              label: '融資去槓桿充分度',
              isSatisfied: true,
              actualValueDescription: '比率 1.41',
              thresholdDescription: '比率 >= 1.0 且融資實質下降',
            },
          ],
          satisfiedCount: 3,
          totalCount: 4,
          bottomingReadinessScore: 75,
          verdict: 'BOTTOM_SIGNAL_CONFIRMED',
          guidanceText: '落底要件已高度齊備，浮額清洗充分且結構超賣，為中期修正之極佳分批佈局點。',
        }}
      />
    );

    expect(html).toContain('term-tooltip-trigger');
    expect(html).toContain('200MA 寬度長期趨勢過濾');
    expect(html).toContain('慢富定心丸');
    expect(html).toContain('大盤回撤 -8.5%');
    expect(html).toContain('融資減幅 -12.0%');
    expect(html).toContain('比率 &gt;= 1.0 且融資實質下降');
    expect(html).toContain('落底要件已高度齊備，浮額清洗充分且結構超賣，為中期修正之極佳分批佈局點。');
  });

  it('[Spec 0223 / Ticket 04] 鏡頭三 A/B 雙軌決策應掛載 TermTooltip、5 檔風險耐受度 Pills、當前實際持股對比、質押還款建議與 B 軌真假防彈衣/SRR/30x 本金全貫通', () => {
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
