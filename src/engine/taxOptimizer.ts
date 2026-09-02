import { TradeRecord } from '../types/stock';
import { AccountingMethod } from '../types/lot';
import { processLots } from './lotEngine';

export interface TaxLossHarvestingOpportunity {
  symbol: string;
  lotId: string;
  buyDate: string;
  shares: number;
  unitCost: number;
  currentPrice: number;
  unrealizedLoss: number;          // 帳面未實現虧損額 (負數)
  holdingDays: number;
  isLongTerm: boolean;
  recommendationNote: string;
}

/**
 * 掃描投資組合中適合進行 Tax-Loss Harvesting (節稅虧損收割) 的在席批次
 */
export function scanTaxLossHarvestingOpportunities(
  trades: TradeRecord[],
  currentPrices: Record<string, number>,
  method: AccountingMethod = 'HIFO'
): TaxLossHarvestingOpportunity[] {
  const result = processLots(trades, { accountingMethod: method });
  const opportunities: TaxLossHarvestingOpportunity[] = [];

  for (const lot of result.openLots) {
    const curPrice = currentPrices[lot.symbol] ?? lot.buyPrice;
    const currentMarketValue = lot.remainingShares * curPrice;
    const unrealizedPnL = currentMarketValue - lot.totalCostBasis;

    // 若該批次處於實質未實現虧損 (虧損金額 > $10)
    if (unrealizedPnL < -10) {
      const todayStr = new Date().toISOString().split('T')[0];
      const buyDate = new Date(`${lot.buyDate}T00:00:00Z`);
      const today = new Date(`${todayStr}T00:00:00Z`);
      const holdingDays = Math.max(0, Math.round((today.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24)));
      const isLongTerm = holdingDays >= 365;

      const note = isLongTerm
        ? `長期持有批次 (已持有 ${holdingDays} 天)，可出脫認列長期資本損失，抵扣其他長期利得。`
        : `短期持有高成本批次 (買進價 $${lot.buyPrice.toFixed(2)})，優先出脫可抵扣高稅率之短期資本利得。`;

      opportunities.push({
        symbol: lot.symbol,
        lotId: lot.id,
        buyDate: lot.buyDate,
        shares: lot.remainingShares,
        unitCost: lot.unitCost,
        currentPrice: curPrice,
        unrealizedLoss: unrealizedPnL,
        holdingDays,
        isLongTerm,
        recommendationNote: note,
      });
    }
  }

  // 依虧損幅度（由虧損最多者排前）
  return opportunities.sort((a, b) => a.unrealizedLoss - b.unrealizedLoss);
}
