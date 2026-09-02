import {
  TargetAllocationConfig,
  RebalanceItemRecommendation,
  RebalancePlanResult,
  RebalanceItemStatus,
  RebalanceAction,
} from '../types/allocation';
import { HoldingPosition, MarketType, Currency } from '../types/stock';

/**
 * 下單規格單位結構
 */
export interface OrderUnitsResult {
  shares: number;
  lotsSummary: string;
}

/**
 * 依據偏離度數值與容忍門檻評定健康度等級
 */
export function evaluateDriftStatus(
  driftPercent: number,
  toleranceBandPercent: number
): RebalanceItemStatus {
  const absDrift = Math.abs(driftPercent);
  if (absDrift <= toleranceBandPercent) {
    return 'BALANCED';
  }
  if (absDrift <= toleranceBandPercent * 2) {
    return 'MILD_DRIFT';
  }
  return 'SEVERE_DRIFT';
}

/**
 * 計算總投資組合市值 (包含台股、美股與可用現金，折算 TWD)
 */
export function calculateTotalPortfolioValue(
  holdings: HoldingPosition[],
  cashBalanceTwd: number = 0,
  usdToTwdRate: number = 32
): {
  totalPortfolioValueTwd: number;
  twHoldingValueTwd: number;
  usHoldingValueTwd: number;
  cashBalanceTwd: number;
} {
  const activeHoldings = holdings.filter((h) => h.shares > 0);
  const twHoldingValueTwd = activeHoldings
    .filter((h) => h.market === 'TW')
    .reduce((sum, h) => sum + h.marketValue, 0);

  const usHoldingValueTwd = activeHoldings
    .filter((h) => h.market === 'US')
    .reduce((sum, h) => sum + h.marketValue * usdToTwdRate, 0);

  const cleanCash = Math.max(0, cashBalanceTwd);
  const totalPortfolioValueTwd = twHoldingValueTwd + usHoldingValueTwd + cleanCash;

  return {
    totalPortfolioValueTwd,
    twHoldingValueTwd,
    usHoldingValueTwd,
    cashBalanceTwd: cleanCash,
  };
}

/**
 * 將建議金額換算為建議下單股數與張數描述
 */
export function convertAmountToOrderUnits(
  market: MarketType | undefined,
  price: number,
  amountTwd: number,
  currency: Currency,
  usdToTwdRate: number
): OrderUnitsResult {
  if (price <= 0 || amountTwd <= 0) {
    return { shares: 0, lotsSummary: '0 股' };
  }

  const effectiveRate = currency === 'USD' ? usdToTwdRate : 1;
  const priceInTwd = price * effectiveRate;
  const rawShares = amountTwd / priceInTwd;

  if (market === 'US') {
    const shares = Number(rawShares.toFixed(3));
    return {
      shares,
      lotsSummary: `${shares} 股`,
    };
  }

  // 台股預設整數股
  const integerShares = Math.floor(rawShares);
  const lots = Math.floor(integerShares / 1000);
  const oddShares = integerShares % 1000;

  let lotsSummary = `${integerShares} 股`;
  if (lots > 0 && oddShares > 0) {
    lotsSummary = `${lots} 張 + ${oddShares} 股`;
  } else if (lots > 0) {
    lotsSummary = `${lots} 張`;
  }

  return {
    shares: integerShares,
    lotsSummary,
  };
}

/**
 * 預估交易摩擦成本 (台股手續費 0.1425% + 現股賣稅 0.3%，美股預設 0)
 */
export function estimateTransactionFriction(
  market: MarketType | undefined,
  action: RebalanceAction,
  amountTwd: number
): number {
  if (action === 'HOLD' || amountTwd <= 0) return 0;
  if (market === 'TW') {
    const fee = amountTwd * 0.001425;
    const tax = action === 'SELL' ? amountTwd * 0.003 : 0;
    return Math.max(1, Math.round(fee + tax));
  }
  return 0; // 美股主流零佣金
}

/**
 * 偏離度分析引擎：計算各標的之當前佔比、目標佔比與偏離狀態
 */
export function calculateAllocationDrift(
  config: TargetAllocationConfig,
  holdings: HoldingPosition[],
  cashBalanceTwd: number = 0,
  usdToTwdRate: number = 32
): RebalanceItemRecommendation[] {
  const activeHoldings = holdings.filter((h) => h.shares > 0);
  const { totalPortfolioValueTwd, twHoldingValueTwd, usHoldingValueTwd } =
    calculateTotalPortfolioValue(holdings, cashBalanceTwd, usdToTwdRate);

  const tolerance = config.toleranceBandPercent || 5.0;

  // 1. 市場維度試算 (TW / US / CASH)
  if (config.type === 'MARKET') {
    return config.items.map((item) => {
      let currentValueTwd = 0;
      let name = item.name || item.key;
      let market: MarketType | undefined;
      let currency: Currency = 'TWD';
      let currentPrice = 1;

      if (item.key === 'TW') {
        currentValueTwd = twHoldingValueTwd;
        market = 'TW';
        name = name || '台股部位 (TW)';
      } else if (item.key === 'US') {
        currentValueTwd = usHoldingValueTwd;
        market = 'US';
        currency = 'USD';
        name = name || '美股部位 (US)';
      } else if (item.key === 'CASH') {
        currentValueTwd = Math.max(0, cashBalanceTwd);
        name = name || '現金與儲備 (CASH)';
      }

      const currentPercent =
        totalPortfolioValueTwd > 0 ? (currentValueTwd / totalPortfolioValueTwd) * 100 : 0;
      const driftPercent = Number((currentPercent - item.targetPercent).toFixed(2));
      const status = evaluateDriftStatus(driftPercent, tolerance);

      return {
        key: item.key,
        name,
        market,
        currency,
        currentPrice,
        currentValueTwd,
        currentPercent: Number(currentPercent.toFixed(2)),
        targetPercent: item.targetPercent,
        driftPercent,
        status,
        action: 'HOLD',
        recommendedAmountTwd: 0,
        recommendedAmountOriginal: 0,
        recommendedShares: 0,
      };
    });
  }

  // 2. 個股維度試算 (Symbol-level)
  return config.items.map((item) => {
    const symbolKey = item.key.toUpperCase();
    const holding = activeHoldings.find((h) => h.symbol.toUpperCase() === symbolKey);

    const market: MarketType = holding ? holding.market : symbolKey.match(/^\d{4,6}$/) ? 'TW' : 'US';
    const currency: Currency = holding ? holding.currency : market === 'US' ? 'USD' : 'TWD';
    const currentPrice = holding ? holding.currentPrice : 0;
    const rate = currency === 'USD' ? usdToTwdRate : 1;
    const currentValueTwd = holding ? holding.marketValue * rate : 0;
    const name = holding ? holding.name || item.name || item.key : item.name || item.key;

    const currentPercent =
      totalPortfolioValueTwd > 0 ? (currentValueTwd / totalPortfolioValueTwd) * 100 : 0;
    const driftPercent = Number((currentPercent - item.targetPercent).toFixed(2));
    const status = evaluateDriftStatus(driftPercent, tolerance);

    return {
      key: item.key,
      name,
      market,
      currency,
      currentPrice,
      currentValueTwd,
      currentPercent: Number(currentPercent.toFixed(2)),
      targetPercent: item.targetPercent,
      driftPercent,
      status,
      action: 'HOLD',
      recommendedAmountTwd: 0,
      recommendedAmountOriginal: 0,
      recommendedShares: 0,
    };
  });
}

/**
 * 定期注水加碼再平衡演算法 (Cash-in Only)
 * 優先補足低配標的，絕不賣出任何持股
 */
export function generateCashInRebalancePlan(
  config: TargetAllocationConfig,
  holdings: HoldingPosition[],
  cashInflowTwd: number,
  cashBalanceTwd: number = 0,
  usdToTwdRate: number = 32
): RebalancePlanResult {
  const driftItems = calculateAllocationDrift(config, holdings, cashBalanceTwd, usdToTwdRate);
  const { totalPortfolioValueTwd } = calculateTotalPortfolioValue(holdings, cashBalanceTwd, usdToTwdRate);
  const newTotalValueTwd = totalPortfolioValueTwd + cashInflowTwd;
  const tolerance = config.toleranceBandPercent || 5.0;

  // 1. 計算各標的理論目標市值與資金缺口
  const gapItems = driftItems.map((item) => {
    const targetValueTwd = (newTotalValueTwd * item.targetPercent) / 100;
    const gapTwd = Math.max(0, targetValueTwd - item.currentValueTwd);
    return {
      ...item,
      targetValueTwd,
      gapTwd,
    };
  });

  const totalGapTwd = gapItems.reduce((sum, i) => sum + i.gapTwd, 0);
  let totalBuyAmountTwd = 0;
  let totalFrictionTwd = 0;

  // 2. 分配注水資金
  const recommendations: RebalanceItemRecommendation[] = gapItems.map((item) => {
    let allocatedTwd = 0;

    if (cashInflowTwd > 0) {
      if (totalGapTwd <= cashInflowTwd) {
        // 資金充足：完全補足缺口，剩餘現金等比分配
        const remainingCash = cashInflowTwd - totalGapTwd;
        allocatedTwd = item.gapTwd + (remainingCash * item.targetPercent) / 100;
      } else {
        // 資金不足：依缺口比例分配
        allocatedTwd = totalGapTwd > 0 ? cashInflowTwd * (item.gapTwd / totalGapTwd) : 0;
      }
    }

    allocatedTwd = Math.round(allocatedTwd);
    const action: RebalanceAction = allocatedTwd > 50 ? 'BUY' : 'HOLD';
    const effectiveRate = item.currency === 'USD' ? usdToTwdRate : 1;
    const amountOriginal = Number((allocatedTwd / effectiveRate).toFixed(2));

    const units = convertAmountToOrderUnits(
      item.market,
      item.currentPrice,
      allocatedTwd,
      item.currency,
      usdToTwdRate
    );

    if (action === 'BUY') {
      totalBuyAmountTwd += allocatedTwd;
      totalFrictionTwd += estimateTransactionFriction(item.market, 'BUY', allocatedTwd);
    }

    return {
      key: item.key,
      name: item.name,
      market: item.market,
      currency: item.currency,
      currentPrice: item.currentPrice,
      currentValueTwd: item.currentValueTwd,
      currentPercent: item.currentPercent,
      targetPercent: item.targetPercent,
      driftPercent: item.driftPercent,
      status: item.status,
      action,
      recommendedAmountTwd: allocatedTwd,
      recommendedAmountOriginal: amountOriginal,
      recommendedShares: units.shares,
      recommendedLotsSummary: units.lotsSummary,
    };
  });

  const isFullyBalanced = recommendations.every((r) => r.status === 'BALANCED');

  return {
    mode: 'CASH_IN',
    totalPortfolioValueTwd,
    newTotalValueTwd,
    cashInflowTwd,
    isFullyBalanced,
    toleranceBandPercent: tolerance,
    recommendations,
    summary: {
      totalBuyAmountTwd,
      totalSellAmountTwd: 0,
      estimatedFrictionTwd: totalFrictionTwd,
    },
  };
}

/**
 * 全量買賣再平衡演算法 (Full Rebalancing)
 * 嚴格重置至目標權重，計算超配賣出與低配買進
 */
export function generateFullRebalancePlan(
  config: TargetAllocationConfig,
  holdings: HoldingPosition[],
  cashBalanceTwd: number = 0,
  usdToTwdRate: number = 32
): RebalancePlanResult {
  const driftItems = calculateAllocationDrift(config, holdings, cashBalanceTwd, usdToTwdRate);
  const { totalPortfolioValueTwd } = calculateTotalPortfolioValue(holdings, cashBalanceTwd, usdToTwdRate);
  const tolerance = config.toleranceBandPercent || 5.0;

  let totalBuyAmountTwd = 0;
  let totalSellAmountTwd = 0;
  let totalFrictionTwd = 0;

  const recommendations: RebalanceItemRecommendation[] = driftItems.map((item) => {
    const targetValueTwd = (totalPortfolioValueTwd * item.targetPercent) / 100;
    const diffTwd = targetValueTwd - item.currentValueTwd;

    let action: RebalanceAction = 'HOLD';
    let recommendedAmountTwd = 0;

    // 偏離超過容忍帶或金額顯著時建議調倉
    if (Math.abs(item.driftPercent) > tolerance || Math.abs(diffTwd) >= 1000) {
      if (diffTwd > 0) {
        action = 'BUY';
        recommendedAmountTwd = Math.round(diffTwd);
        totalBuyAmountTwd += recommendedAmountTwd;
        totalFrictionTwd += estimateTransactionFriction(item.market, 'BUY', recommendedAmountTwd);
      } else if (diffTwd < 0) {
        action = 'SELL';
        recommendedAmountTwd = Math.round(Math.abs(diffTwd));
        totalSellAmountTwd += recommendedAmountTwd;
        totalFrictionTwd += estimateTransactionFriction(item.market, 'SELL', recommendedAmountTwd);
      }
    }

    const effectiveRate = item.currency === 'USD' ? usdToTwdRate : 1;
    const recommendedAmountOriginal = Number((recommendedAmountTwd / effectiveRate).toFixed(2));

    const units = convertAmountToOrderUnits(
      item.market,
      item.currentPrice,
      recommendedAmountTwd,
      item.currency,
      usdToTwdRate
    );

    return {
      key: item.key,
      name: item.name,
      market: item.market,
      currency: item.currency,
      currentPrice: item.currentPrice,
      currentValueTwd: item.currentValueTwd,
      currentPercent: item.currentPercent,
      targetPercent: item.targetPercent,
      driftPercent: item.driftPercent,
      status: item.status,
      action,
      recommendedAmountTwd,
      recommendedAmountOriginal,
      recommendedShares: units.shares,
      recommendedLotsSummary: units.lotsSummary,
    };
  });

  const isFullyBalanced = recommendations.every((r) => r.status === 'BALANCED');

  return {
    mode: 'FULL_REBALANCE',
    totalPortfolioValueTwd,
    newTotalValueTwd: totalPortfolioValueTwd,
    cashInflowTwd: 0,
    isFullyBalanced,
    toleranceBandPercent: tolerance,
    recommendations,
    summary: {
      totalBuyAmountTwd,
      totalSellAmountTwd,
      estimatedFrictionTwd: totalFrictionTwd,
    },
  };
}
