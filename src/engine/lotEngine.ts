import { TradeRecord } from '../types/stock';
import {
  TaxLot,
  LotDisposal,
  AccountingMethod,
  TaxComparisonResult,
} from '../types/lot';
import { roundFractionalShares } from './calculator';

export interface ProcessTradesLotOptions {
  accountingMethod?: AccountingMethod;
  symbolOverrides?: Record<string, AccountingMethod>;
}

export interface LotEngineResult {
  openLots: TaxLot[];                      // 當前仍在庫的未沖銷批次
  closedLots: TaxLot[];                    // 歷史已全數出清的批次
  disposals: LotDisposal[];                // 歷史所有賣出沖銷配對紀錄
  realizedPnLBySymbol: Record<string, number>;
  totalRealizedPnL: number;
}

/**
 * 計算兩日期之間的自然日天數差
 */
export function calculateHoldingDays(buyDateStr: string, sellDateStr: string): number {
  if (!buyDateStr || !sellDateStr) return 0;
  const buyDate = new Date(`${buyDateStr}T00:00:00Z`);
  const sellDate = new Date(`${sellDateStr}T00:00:00Z`);
  const diffMs = sellDate.getTime() - buyDate.getTime();
  if (isNaN(diffMs)) return 0;
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * 多批次沖銷核心運算引擎
 */
export function processLots(
  trades: TradeRecord[],
  options: ProcessTradesLotOptions = {}
): LotEngineResult {
  const globalMethod: AccountingMethod = options.accountingMethod || 'MOVING_AVERAGE';
  const symbolOverrides = options.symbolOverrides || {};

  // 按日期與建立時間嚴格升冪排序
  const sortedTrades = [...trades].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.createdAt - b.createdAt;
  });

  const openLotsMap = new Map<string, TaxLot[]>(); // symbol -> TaxLot[]
  const closedLots: TaxLot[] = [];
  const disposals: LotDisposal[] = [];
  const realizedPnLBySymbol: Record<string, number> = {};

  const getOpenLots = (sym: string): TaxLot[] => {
    const clean = sym.trim().toUpperCase();
    if (!openLotsMap.has(clean)) {
      openLotsMap.set(clean, []);
    }
    return openLotsMap.get(clean)!;
  };

  for (const trade of sortedTrades) {
    const sym = trade.symbol.trim().toUpperCase();
    const lots = getOpenLots(sym);
    const shares = Number(trade.shares) || 0;
    const price = Number(trade.price) || 0;
    const fee = Number(trade.fee) || 0;
    const tax = Number(trade.tax) || 0;
    const ratio = Number(trade.ratio) || 0;
    const cashAmount = Number(trade.cashAmount) || 0;
    const market = trade.market || (trade.currency === 'USD' ? 'US' : 'TW');
    const currency = trade.currency || (market === 'US' ? 'USD' : 'TWD');
    const isTW = market === 'TW';

    if (!realizedPnLBySymbol[sym]) {
      realizedPnLBySymbol[sym] = 0;
    }

    switch (trade.type) {
      case 'BUY':
      case 'CAPITAL_INCREASE':
      case 'CB_CONVERSION': {
        if (shares <= 0) break;
        const totalCost = shares * price + fee;
        const newLot: TaxLot = {
          id: `lot-${trade.id}`,
          buyTradeId: trade.id,
          symbol: sym,
          market,
          currency,
          accountId: trade.accountId,
          buyDate: trade.date,
          buyPrice: price,
          originalShares: shares,
          remainingShares: shares,
          fee,
          totalCostBasis: totalCost,
          unitCost: totalCost / shares,
          createdAt: trade.createdAt || Date.now(),
        };
        lots.push(newLot);
        break;
      }

      case 'STOCK_SPLIT': {
        const totalCurrentShares = lots.reduce((sum, l) => sum + l.remainingShares, 0);
        const multiplier = ratio > 0 ? ratio : (shares > 0 && totalCurrentShares > 0 ? (totalCurrentShares + shares) / totalCurrentShares : 1);
        if (multiplier > 0) {
          for (const lot of lots) {
            const newShares = lot.remainingShares * multiplier;
            lot.remainingShares = isTW ? Math.round(newShares) : roundFractionalShares(newShares);
            lot.originalShares = isTW ? Math.round(lot.originalShares * multiplier) : roundFractionalShares(lot.originalShares * multiplier);
            lot.unitCost = lot.remainingShares > 0 ? lot.totalCostBasis / lot.remainingShares : 0;
          }
        }
        break;
      }

      case 'STOCK_DIVIDEND': {
        const totalCurrentShares = lots.reduce((sum, l) => sum + l.remainingShares, 0);
        if (totalCurrentShares > 0) {
          const addedTotal = shares > 0 ? shares : (ratio > 0 ? totalCurrentShares * ratio : 0);
          for (const lot of lots) {
            const weight = lot.remainingShares / totalCurrentShares;
            const addedForLot = addedTotal * weight;
            const finalAdded = isTW ? Math.round(addedForLot) : roundFractionalShares(addedForLot);
            lot.remainingShares += finalAdded;
            lot.originalShares += finalAdded;
            lot.unitCost = lot.remainingShares > 0 ? lot.totalCostBasis / lot.remainingShares : 0;
          }
        }
        break;
      }

      case 'CAPITAL_REDUCTION': {
        const totalCurrentShares = lots.reduce((sum, l) => sum + l.remainingShares, 0);
        if (totalCurrentShares > 0) {
          const reducedTotal = shares > 0 ? Math.min(shares, totalCurrentShares) : (ratio > 0 ? totalCurrentShares * ratio : 0);
          const refundTotal = cashAmount > 0 ? cashAmount : (price > 0 ? reducedTotal * price : 0);

          for (const lot of lots) {
            const weight = lot.remainingShares / totalCurrentShares;
            const reducedForLot = reducedTotal * weight;
            const refundForLot = refundTotal * weight;

            const finalReduced = isTW ? Math.round(reducedForLot) : roundFractionalShares(reducedForLot);
            lot.remainingShares = Math.max(0, lot.remainingShares - finalReduced);

            if (refundForLot > 0) {
              if (refundForLot > lot.totalCostBasis) {
                const excessGain = refundForLot - lot.totalCostBasis;
                realizedPnLBySymbol[sym] += excessGain;
                lot.totalCostBasis = 0;
              } else {
                lot.totalCostBasis -= refundForLot;
              }
            }

            lot.unitCost = lot.remainingShares > 0 ? lot.totalCostBasis / lot.remainingShares : 0;
          }
        }
        break;
      }

      case 'SELL':
      case 'TENDER_OFFER':
      case 'PREFERRED_REDEMPTION': {
        if (shares <= 0 || lots.length === 0) break;

        const effectiveMethod = symbolOverrides[sym] || globalMethod;
        let remainingToSell = shares;

        if (effectiveMethod === 'MOVING_AVERAGE') {
          // 移動加權平均法：池化整體成本
          const totalShares = lots.reduce((sum, l) => sum + l.remainingShares, 0);
          const totalCost = lots.reduce((sum, l) => sum + l.totalCostBasis, 0);
          if (totalShares > 0) {
            const soldShares = Math.min(shares, totalShares);
            const avgUnitCost = totalCost / totalShares;
            const costOfSold = avgUnitCost * soldShares;
            const netProceeds = soldShares * price - fee - tax;
            const profit = netProceeds - costOfSold;

            realizedPnLBySymbol[sym] += profit;

            // 計算加權平均持有天數與在席最早買進日
            let weightedHoldingDaysSum = 0;
            let earliestBuyDate = lots[0].buyDate;
            for (const lot of lots) {
              const days = calculateHoldingDays(lot.buyDate, trade.date);
              const weight = lot.remainingShares / totalShares;
              weightedHoldingDaysSum += days * weight;
              if (lot.buyDate < earliestBuyDate) {
                earliestBuyDate = lot.buyDate;
              }
            }
            const weightedHoldingDays = Math.round(weightedHoldingDaysSum);
            const isLongTerm = weightedHoldingDays >= 365;

            // 依比例扣減在庫 Lots（採用最後一筆剩餘差額法，杜絕浮點漂移）
            let accumulatedDeductedShares = 0;
            for (let i = 0; i < lots.length; i++) {
              const lot = lots[i];
              const isLast = i === lots.length - 1;
              let deductShares: number;

              if (isLast) {
                deductShares = Math.min(lot.remainingShares, Math.max(0, soldShares - accumulatedDeductedShares));
              } else {
                const prop = lot.remainingShares / totalShares;
                const rawDeduct = soldShares * prop;
                deductShares = Math.min(
                  lot.remainingShares,
                  isTW ? Math.round(rawDeduct) : roundFractionalShares(rawDeduct)
                );
                accumulatedDeductedShares += deductShares;
              }

              const deductCost = lot.remainingShares > 0 ? lot.totalCostBasis * (deductShares / lot.remainingShares) : 0;
              lot.remainingShares = Math.max(0, lot.remainingShares - deductShares);
              lot.totalCostBasis = Math.max(0, lot.totalCostBasis - deductCost);
              lot.unitCost = lot.remainingShares > 0 ? lot.totalCostBasis / lot.remainingShares : 0;
            }

            // 清理已完全出清之 Lot
            for (let i = lots.length - 1; i >= 0; i--) {
              if (lots[i].remainingShares <= 1e-6) {
                const closed = lots.splice(i, 1)[0];
                closedLots.push(closed);
              }
            }

            const buyDateLabel = earliestBuyDate !== trade.date
              ? `加權平均 (最早: ${earliestBuyDate})`
              : trade.date;

            disposals.push({
              id: `disp-${trade.id}-mov`,
              sellTradeId: trade.id,
              lotId: 'pool-moving-avg',
              buyTradeId: 'multiple',
              symbol: sym,
              buyDate: buyDateLabel,
              sellDate: trade.date,
              shares: soldShares,
              unitCost: avgUnitCost,
              costBasis: costOfSold,
              sellPrice: price,
              grossProceeds: soldShares * price,
              allocatedFee: fee,
              allocatedTax: tax,
              netProceeds,
              realizedPnL: profit,
              realizedPnLPercent: costOfSold > 0 ? (profit / costOfSold) * 100 : 0,
              holdingDays: weightedHoldingDays,
              isLongTerm,
            });
          }
          break;
        }

        // 排序候選 Lots (FIFO / LIFO / HIFO)
        const sortedCandidateLots = [...lots].sort((a, b) => {
          if (effectiveMethod === 'FIFO') {
            if (a.buyDate !== b.buyDate) return a.buyDate.localeCompare(b.buyDate);
            return a.createdAt - b.createdAt;
          }
          if (effectiveMethod === 'LIFO') {
            if (a.buyDate !== b.buyDate) return b.buyDate.localeCompare(a.buyDate);
            return b.createdAt - a.createdAt;
          }
          if (effectiveMethod === 'HIFO') {
            if (Math.abs(a.unitCost - b.unitCost) > 1e-6) {
              return b.unitCost - a.unitCost; // 單價高者優先
            }
            return a.buyDate.localeCompare(b.buyDate);
          }
          return 0;
        });

        for (const lot of sortedCandidateLots) {
          if (remainingToSell <= 0) break;
          if (lot.remainingShares <= 0) continue;

          const matchShares = Math.min(lot.remainingShares, remainingToSell);
          const propOfTrade = shares > 0 ? matchShares / shares : 1;
          const matchGrossProceeds = matchShares * price;
          const matchFee = fee * propOfTrade;
          const matchTax = tax * propOfTrade;
          const matchNetProceeds = matchGrossProceeds - matchFee - matchTax;

          const lotCostPortion = lot.totalCostBasis * (matchShares / lot.remainingShares);
          const matchRealizedPnL = matchNetProceeds - lotCostPortion;

          lot.remainingShares -= matchShares;
          lot.totalCostBasis = Math.max(0, lot.totalCostBasis - lotCostPortion);
          lot.unitCost = lot.remainingShares > 0 ? lot.totalCostBasis / lot.remainingShares : 0;

          const holdingDays = calculateHoldingDays(lot.buyDate, trade.date);
          const isLongTerm = holdingDays >= 365;

          disposals.push({
            id: `disp-${trade.id}-${lot.id}`,
            sellTradeId: trade.id,
            lotId: lot.id,
            buyTradeId: lot.buyTradeId,
            symbol: sym,
            buyDate: lot.buyDate,
            sellDate: trade.date,
            shares: matchShares,
            unitCost: lot.unitCost || (lotCostPortion / matchShares),
            costBasis: lotCostPortion,
            sellPrice: price,
            grossProceeds: matchGrossProceeds,
            allocatedFee: matchFee,
            allocatedTax: matchTax,
            netProceeds: matchNetProceeds,
            realizedPnL: matchRealizedPnL,
            realizedPnLPercent: lotCostPortion > 0 ? (matchRealizedPnL / lotCostPortion) * 100 : 0,
            holdingDays,
            isLongTerm,
          });

          realizedPnLBySymbol[sym] += matchRealizedPnL;
          remainingToSell -= matchShares;
        }

        // 清理已完全出清的 Lot
        for (let i = lots.length - 1; i >= 0; i--) {
          if (lots[i].remainingShares <= 1e-6) {
            const closed = lots.splice(i, 1)[0];
            closedLots.push(closed);
          }
        }
        break;
      }

      default:
        break;
    }
  }

  const allOpenLots: TaxLot[] = [];
  for (const list of openLotsMap.values()) {
    allOpenLots.push(...list.filter((l) => l.remainingShares > 1e-6));
  }

  const totalRealizedPnL = Object.values(realizedPnLBySymbol).reduce((sum, pnl) => sum + pnl, 0);

  return {
    openLots: allOpenLots,
    closedLots,
    disposals,
    realizedPnLBySymbol,
    totalRealizedPnL,
  };
}

/**
 * 比較多種會計沖銷模式 (FIFO vs LIFO vs HIFO vs MOVING_AVERAGE) 之稅務與損益差異
 */
export function calculateTaxComparison(
  trades: TradeRecord[],
  currentPrices: Record<string, number> = {}
): Record<AccountingMethod, TaxComparisonResult> {
  const methods: AccountingMethod[] = ['FIFO', 'LIFO', 'HIFO', 'MOVING_AVERAGE'];
  const results = {} as Record<AccountingMethod, TaxComparisonResult>;

  const fifoRes = processLots(trades, { accountingMethod: 'FIFO' });

  for (const m of methods) {
    const res = m === 'FIFO' ? fifoRes : processLots(trades, { accountingMethod: m });

    let shortTermPnL = 0;
    let longTermPnL = 0;

    for (const d of res.disposals) {
      if (d.isLongTerm) {
        longTermPnL += d.realizedPnL;
      } else {
        shortTermPnL += d.realizedPnL;
      }
    }

    const remainingCostBasis = res.openLots.reduce((sum, l) => sum + l.totalCostBasis, 0);
    const unrealizedPnL = res.openLots.reduce((sum, l) => {
      const price = currentPrices[l.symbol] ?? l.buyPrice;
      const marketVal = l.remainingShares * price;
      return sum + (marketVal - l.totalCostBasis);
    }, 0);

    // 相較於 FIFO 的潛在節稅/遞延額 (FIFO 獲利 - 當前獲利)
    const potentialTaxSavingsVsFIFO = Math.max(0, fifoRes.totalRealizedPnL - res.totalRealizedPnL);

    results[m] = {
      method: m,
      totalRealizedPnL: res.totalRealizedPnL,
      shortTermRealizedPnL: shortTermPnL,
      longTermRealizedPnL: longTermPnL,
      remainingCostBasis,
      unrealizedPnLOnRemainingLots: unrealizedPnL,
      potentialTaxSavingsVsFIFO,
    };
  }

  // 補齊 SPECIFIC_LOT
  results['SPECIFIC_LOT'] = {
    ...results['MOVING_AVERAGE'],
    method: 'SPECIFIC_LOT',
  };

  return results;
}
