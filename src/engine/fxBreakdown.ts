import { HoldingPosition } from '../types/stock';
import { FxBreakdownResult } from '../types/dividend';

/**
 * 試算美股標的之股票本體損益與外匯匯差損益 (雙軸獨立解耦)
 * @param holding 持倉標的 (市場須為 US 或幣別為 USD)
 * @param costFxRate 買進加權平均匯率 (若無則 fallback 至 currentFxRate)
 * @param currentFxRate 即時最新匯率
 */
export function calculateHoldingFxBreakdown(
  holding: HoldingPosition,
  costFxRate: number = 32.0,
  currentFxRate: number = 32.0
): FxBreakdownResult {
  const symbol = holding.symbol;
  const currency = holding.currency;
  const shares = holding.shares || 0;
  const avgCostUSD = holding.avgCost || 0;
  const currentPriceUSD = holding.currentPrice || 0;
  const totalCostUSD = holding.totalCostBasis || 0;
  const currentMarketValueUSD = holding.grossMarketValue || 0;

  // 1. 股票本體價差 (折合 TWD) = (現價USD - 均價USD) * 股數 * 現時匯率
  const assetGainUSD = (currentPriceUSD - avgCostUSD) * shares;
  const assetGainTWD = Math.round(assetGainUSD * currentFxRate);
  const assetGainPercent = avgCostUSD > 0 ? ((currentPriceUSD - avgCostUSD) / avgCostUSD) * 100 : 0;

  // 2. 外匯匯差損益 (TWD) = 原始投入美元成本 * (現時匯率 - 買進匯率)
  const fxDiff = currentFxRate - costFxRate;
  const fxGainTWD = Math.round(totalCostUSD * fxDiff);
  const fxGainPercent = costFxRate > 0 ? (fxDiff / costFxRate) * 100 : 0;

  // 3. 總損益 (TWD) = 本體損益 + 匯差損益
  const totalGainTWD = assetGainTWD + fxGainTWD;
  const originalCostTWD = totalCostUSD * costFxRate;
  const totalGainPercent = originalCostTWD > 0 ? (totalGainTWD / originalCostTWD) * 100 : 0;

  return {
    symbol,
    currency,
    totalCostUSD,
    currentMarketValueUSD,
    costFxRate,
    currentFxRate,
    assetGainTWD,
    assetGainPercent: Number(assetGainPercent.toFixed(2)),
    fxGainTWD,
    fxGainPercent: Number(fxGainPercent.toFixed(2)),
    totalGainTWD,
    totalGainPercent: Number(totalGainPercent.toFixed(2)),
  };
}
