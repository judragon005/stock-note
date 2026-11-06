import { useMemo } from 'react';
import { HoldingPosition, LoanRecord } from '../types/stock';
import { TargetAllocationConfig } from '../types/allocation';
import { MacroPortfolioShield } from '../types/macro';
import { calculateLookThroughExposure } from '../engine/lookThroughEngine';
import { calculateHoldingFxBreakdown } from '../engine/fxBreakdown';
import { calculateMarginStress } from '../engine/marginStressEngine';
import { calculateAllocationDrift } from '../engine/rebalancingEngine';
import {
  loadTargetAllocations,
  loadActiveTargetAllocationId,
  DEFAULT_MARKET_ALLOCATION,
} from '../utils/allocationStorage';
import { calculatePortfolioMacroShield } from '../engine/macroAdvisorEngine';

export type LookThroughReport = ReturnType<typeof calculateLookThroughExposure>;

export interface UseWarRoomPortfolioMetricsParams {
  holdings: HoldingPosition[];
  loans: LoanRecord[];
  cashBalanceTwd: number;
  totalNavTwd: number;
  usdToTwdRate: number;
  pendingSettlementOutflowTwd?: number;
  dcaCommitment7dTwd?: number;
  rebalancingConfig?: TargetAllocationConfig;
  vix?: number;
}

export interface WarRoomPortfolioMetricsResult {
  lookThroughReport: LookThroughReport;
  shield: MacroPortfolioShield;
}

/**
 * 純計算引擎：聚合戰情室投組維度風控指標 (ETF 穿透、美股匯差緩衝、質押維持率、偏離度與自由發射彈藥)
 * 零 DOM 依賴，保證單元測試速度與確定性。
 */
export function calculateWarRoomPortfolioMetrics(
  params: UseWarRoomPortfolioMetricsParams
): WarRoomPortfolioMetricsResult {
  const {
    holdings,
    loans,
    cashBalanceTwd,
    totalNavTwd,
    usdToTwdRate,
    pendingSettlementOutflowTwd = 0,
    dcaCommitment7dTwd = 0,
    rebalancingConfig,
    vix,
  } = params;

  // 1. ETF 穿透曝險計算
  const lookThroughReport = calculateLookThroughExposure(holdings, usdToTwdRate);

  // 2. 質押債務與擔保品現值統計
  let totalDebt = 0;
  let totalCollateral = 0;
  const pledgedLoans = loans.filter((l) => l.principal > 0 && l.loanType === 'PLEDGE');
  for (const l of pledgedLoans) {
    const debtTwd = l.currency === 'USD' ? l.principal * usdToTwdRate : l.principal;
    totalDebt += debtTwd;
    if (l.pledgedCollateral) {
      for (const col of l.pledgedCollateral) {
        const h = holdings.find((item) => item.symbol === col.symbol);
        if (h) {
          const fx = h.currency === 'USD' ? usdToTwdRate : 1;
          totalCollateral += col.shares * (h.currentPrice || 0) * fx;
        }
      }
    }
  }

  // 3. 美股持倉與加權成本匯率、累積未實現匯差緩衝墊
  const usHoldings = holdings.filter(
    (h) => (h.market === 'US' || h.currency === 'USD') && h.shares > 0
  );
  const usStockUSD = usHoldings.reduce(
    (acc, h) => acc + (h.currentPrice || h.avgCost || 0) * (h.shares || 0),
    0
  );

  let usTotalCostUsd = 0;
  let usWeightedFxNumerator = 0;
  let usFxCushionTWD = 0;
  for (const h of usHoldings) {
    const costUsd = h.totalCostBasis || (h.avgCost || 0) * (h.shares || 0);
    const costFx = (h as unknown as { avgExchangeRate?: number }).avgExchangeRate || 31.8;
    const fxResult = calculateHoldingFxBreakdown(h, costFx, usdToTwdRate);
    usTotalCostUsd += costUsd;
    usWeightedFxNumerator += costUsd * costFx;
    usFxCushionTWD += fxResult.fxGainTWD;
  }
  const usWeightedCostFxRate =
    usTotalCostUsd > 0 ? Number((usWeightedFxNumerator / usTotalCostUsd).toFixed(2)) : undefined;

  // 4. 計算真實目標配置最大偏離度
  let realMaxDriftPercent = 0;
  try {
    let activeConfig = rebalancingConfig;
    if (!activeConfig) {
      const configs = typeof localStorage !== 'undefined' ? loadTargetAllocations() : [DEFAULT_MARKET_ALLOCATION];
      const activeId = typeof localStorage !== 'undefined' ? loadActiveTargetAllocationId() : DEFAULT_MARKET_ALLOCATION.id;
      activeConfig = configs.find((c: TargetAllocationConfig) => c.id === activeId) || configs[0] || DEFAULT_MARKET_ALLOCATION;
    }
    const driftItems = calculateAllocationDrift(activeConfig, holdings, cashBalanceTwd, usdToTwdRate);
    realMaxDriftPercent = driftItems.reduce(
      (maxVal, item) => Math.max(maxVal, Math.abs(item.driftPercent || 0)),
      0
    );
  } catch {
    realMaxDriftPercent = 0;
  }

  // 5. 穿透台積電與半導體產業總曝險權重
  const tsmcExp = lookThroughReport.exposures
    .filter((e) => e.symbol === '2330' || e.symbol === 'TSM' || e.symbol === '2330.TW')
    .reduce((acc, e) => acc + (e.portfolioWeightPercent || 0), 0);
  const semiSectorExp = lookThroughReport.sectorBreakdown
    .filter((s) => s.sector.includes('半導體') || s.sector.toLowerCase().includes('semi'))
    .reduce((acc, s) => acc + (s.weightPercent || 0), 0);
  const effectiveSemiWeight = Math.max(semiSectorExp, tsmcExp);

  // 6. 質押距 130% 斷頭線安全耐受跌幅
  const marginStress = calculateMarginStress({
    holdings,
    loans: pledgedLoans,
    usdToTwdRate,
  });
  const maxDropToleranceTo130Percent =
    marginStress.hasLoans && typeof marginStress.maxDropTolerancePercent === 'number'
      ? Number((marginStress.maxDropTolerancePercent / 100).toFixed(4))
      : undefined;

  // 7. 產出全資產防禦護盾與自由發射彈藥 (Free Ammo)
  const shield = calculatePortfolioMacroShield({
    navTWD: totalNavTwd,
    cashTWD: cashBalanceTwd,
    totalLoanDebtTWD: totalDebt,
    collateralValueTWD: totalCollateral,
    maxDriftPercent: Number(realMaxDriftPercent.toFixed(1)),
    usStockValueUSD: usStockUSD,
    pendingSettlementOutflowTWD: pendingSettlementOutflowTwd,
    upcoming7dDcaCommitmentTWD: dcaCommitment7dTwd,
    tsmcLookThroughWeightPercent: Number(tsmcExp.toFixed(1)),
    semiLookThroughWeightPercent: Number(effectiveSemiWeight.toFixed(1)),
    vix,
    usWeightedCostFxRate,
    usFxCushionTWD,
    maxDropToleranceTo130Percent,
  });

  return {
    lookThroughReport,
    shield,
  };
}

/**
 * 自訂 Hook：供 React 戰情室視圖元件呼叫，具備 useMemo 依賴防重繪保護。
 * 消除 WarRoomWorkspace.tsx 巨石元件發散式變化 (Divergent Change) 代碼異味。
 */
export function useWarRoomPortfolioMetrics(
  params: UseWarRoomPortfolioMetricsParams
): WarRoomPortfolioMetricsResult {
  const {
    holdings,
    loans,
    cashBalanceTwd,
    totalNavTwd,
    usdToTwdRate,
    pendingSettlementOutflowTwd,
    dcaCommitment7dTwd,
    rebalancingConfig,
    vix,
  } = params;

  return useMemo(() => {
    return calculateWarRoomPortfolioMetrics({
      holdings,
      loans,
      cashBalanceTwd,
      totalNavTwd,
      usdToTwdRate,
      pendingSettlementOutflowTwd,
      dcaCommitment7dTwd,
      rebalancingConfig,
      vix,
    });
  }, [
    holdings,
    loans,
    cashBalanceTwd,
    totalNavTwd,
    usdToTwdRate,
    pendingSettlementOutflowTwd,
    dcaCommitment7dTwd,
    rebalancingConfig,
    vix,
  ]);
}
