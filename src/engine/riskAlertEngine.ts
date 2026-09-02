import { HoldingRiskMetrics, RiskAlertStatus, TradePlan } from '../types/stock';

/**
 * 計算預期風報酬比 (Risk/Reward Ratio)
 * 公式: (takeProfitPrice - entryPrice) / (entryPrice - stopLossPrice)
 */
export function calculatePlannedRiskRewardRatio(
  entryPrice: number,
  stopLossPrice?: number,
  takeProfitPrice?: number
): number | undefined {
  if (
    typeof stopLossPrice !== 'number' ||
    typeof takeProfitPrice !== 'number' ||
    isNaN(stopLossPrice) ||
    isNaN(takeProfitPrice) ||
    stopLossPrice <= 0 ||
    takeProfitPrice <= 0 ||
    entryPrice <= 0
  ) {
    return undefined;
  }

  // 多頭現股交易防禦：停損需小於進場價，停利需大於進場價
  const riskAmount = entryPrice - stopLossPrice;
  const rewardAmount = takeProfitPrice - entryPrice;

  if (riskAmount <= 0 || rewardAmount <= 0) {
    return undefined;
  }

  const ratio = rewardAmount / riskAmount;
  return Math.round(ratio * 100) / 100;
}

/**
 * 評估當前市價對應交易計畫之風控狀態
 * @param currentPrice 當前市價
 * @param stopLossPrice 預設停損價
 * @param takeProfitPrice 預設停利價
 * @param thresholdRatio 接近警示閥值比例 (預設 3%)
 */
export function evaluateRiskStatus(
  currentPrice: number,
  stopLossPrice?: number,
  takeProfitPrice?: number,
  thresholdRatio = 0.03
): RiskAlertStatus {
  if (currentPrice <= 0) {
    return 'NORMAL';
  }

  // 1. 停損判定 (最高優先)
  if (typeof stopLossPrice === 'number' && stopLossPrice > 0) {
    if (currentPrice <= stopLossPrice) {
      return 'STOP_LOSS_TRIGGERED';
    }
    const diffRatio = (currentPrice - stopLossPrice) / currentPrice;
    if (diffRatio <= thresholdRatio) {
      return 'NEAR_STOP_LOSS';
    }
  }

  // 2. 停利判定
  if (typeof takeProfitPrice === 'number' && takeProfitPrice > 0) {
    if (currentPrice >= takeProfitPrice) {
      return 'TAKE_PROFIT_TRIGGERED';
    }
    const diffRatio = (takeProfitPrice - currentPrice) / currentPrice;
    if (diffRatio <= thresholdRatio) {
      return 'NEAR_TAKE_PROFIT';
    }
  }

  return 'NORMAL';
}

/**
 * 計算離停損與停利之價差百分比
 * 正數: 緩衝安全距離; 負數: 穿價溢出
 */
export function calculateRiskDistances(
  currentPrice: number,
  stopLossPrice?: number,
  takeProfitPrice?: number
): {
  distanceToStopLossPercent?: number;
  distanceToTakeProfitPercent?: number;
} {
  let distanceToStopLossPercent: number | undefined = undefined;
  let distanceToTakeProfitPercent: number | undefined = undefined;

  if (currentPrice > 0) {
    if (typeof stopLossPrice === 'number' && stopLossPrice > 0) {
      const diff = ((currentPrice - stopLossPrice) / currentPrice) * 100;
      distanceToStopLossPercent = Math.round(diff * 100) / 100;
    }

    if (typeof takeProfitPrice === 'number' && takeProfitPrice > 0) {
      const diff = ((takeProfitPrice - currentPrice) / currentPrice) * 100;
      distanceToTakeProfitPercent = Math.round(diff * 100) / 100;
    }
  }

  return {
    distanceToStopLossPercent,
    distanceToTakeProfitPercent,
  };
}

/**
 * 組合產生完整之持股風控指標物件 (HoldingRiskMetrics)
 */
export function buildHoldingRiskMetrics(
  currentPrice: number,
  plan?: TradePlan,
  entryPrice?: number
): HoldingRiskMetrics {
  if (!plan || (typeof plan.stopLossPrice !== 'number' && typeof plan.takeProfitPrice !== 'number')) {
    return {
      riskStatus: 'NORMAL',
    };
  }

  const { stopLossPrice, takeProfitPrice, entryReason } = plan;
  const riskStatus = evaluateRiskStatus(currentPrice, stopLossPrice, takeProfitPrice);
  const distances = calculateRiskDistances(currentPrice, stopLossPrice, takeProfitPrice);
  
  const plannedRiskRewardRatio =
    plan.plannedRiskRewardRatio ||
    (entryPrice ? calculatePlannedRiskRewardRatio(entryPrice, stopLossPrice, takeProfitPrice) : undefined);

  return {
    stopLossPrice,
    takeProfitPrice,
    riskStatus,
    distanceToStopLossPercent: distances.distanceToStopLossPercent,
    distanceToTakeProfitPercent: distances.distanceToTakeProfitPercent,
    plannedRiskRewardRatio,
    entryReason,
  };
}
