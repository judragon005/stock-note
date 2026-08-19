import { TradeRecord, HoldingPosition, PortfolioSummary, MarketType, Currency } from '../types/stock';

export interface CalculationResult {
  holdings: HoldingPosition[];
  summary: PortfolioSummary;
}

export function calculateHoldingsAndSummary(
  trades: TradeRecord[],
  currentPrices: Record<string, number> = {},
  usdToTwdRate: number = 32.0
): CalculationResult {
  // 1. 嚴格依交易日期與建立時間排序
  const sortedTrades = [...trades].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.createdAt - b.createdAt;
  });

  interface Accumulator {
    symbol: string;
    name: string;
    market: MarketType;
    currency: Currency;
    shares: number;
    totalCostBasis: number;
    realizedPnL: number;
    totalDividends: number;
  }

  const map = new Map<string, Accumulator>();

  for (const trade of sortedTrades) {
    if (!map.has(trade.symbol)) {
      map.set(trade.symbol, {
        symbol: trade.symbol,
        name: trade.name || trade.symbol,
        market: trade.market || (trade.currency === 'USD' ? 'US' : 'TW'),
        currency: trade.currency || (trade.market === 'US' ? 'USD' : 'TWD'),
        shares: 0,
        totalCostBasis: 0,
        realizedPnL: 0,
        totalDividends: 0,
      });
    }

    const item = map.get(trade.symbol)!;
    if (trade.name && trade.name !== trade.symbol) {
      item.name = trade.name;
    }

    const fee = Number(trade.fee) || 0;
    const tax = Number(trade.tax) || 0;
    const price = Number(trade.price) || 0;
    const shares = Number(trade.shares) || 0;

    if (trade.type === 'BUY') {
      const grossAmount = shares * price;
      const netCost = grossAmount + fee + tax;
      item.totalCostBasis += netCost;
      item.shares += shares;
    } else if (trade.type === 'SELL') {
      if (item.shares > 0) {
        const avgUnitCost = item.totalCostBasis / item.shares;
        const sellShares = Math.min(shares, item.shares);
        const costOfSold = sellShares * avgUnitCost;
        const netRevenue = (sellShares * price) - fee - tax;
        const pnl = netRevenue - costOfSold;

        item.realizedPnL += pnl;
        item.shares -= sellShares;
        item.totalCostBasis = Math.max(0, item.totalCostBasis - costOfSold);

        if (item.shares <= 0) {
          item.shares = 0;
          item.totalCostBasis = 0;
        }
      }
    } else if (trade.type === 'DIVIDEND') {
      let divAmount = 0;
      if (price > 0 && shares > 0) {
        divAmount = (price * shares) - tax - fee;
      } else if (price > 0) {
        divAmount = price - tax - fee;
      } else if (fee > 0) {
        divAmount = fee;
      }
      item.totalDividends += Math.max(0, divAmount);
    }
  }

  const holdings: HoldingPosition[] = [];

  for (const item of map.values()) {
    const avgCost = item.shares > 0 ? item.totalCostBasis / item.shares : 0;
    const currentPrice = currentPrices[item.symbol] !== undefined ? currentPrices[item.symbol] : (avgCost || 0);
    const marketValue = item.shares * currentPrice;
    const unrealizedPnL = marketValue - item.totalCostBasis;
    const unrealizedPnLPercent = item.totalCostBasis > 0 ? (unrealizedPnL / item.totalCostBasis) * 100 : 0;

    holdings.push({
      symbol: item.symbol,
      name: item.name,
      market: item.market,
      currency: item.currency,
      shares: item.shares,
      avgCost,
      totalCostBasis: item.totalCostBasis,
      currentPrice,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      realizedPnL: item.realizedPnL,
      totalDividends: item.totalDividends,
    });
  }

  // 匯總計算
  const summary: PortfolioSummary = {
    twd: {
      totalCost: 0,
      marketValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      totalDividends: 0,
    },
    usd: {
      totalCost: 0,
      marketValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      totalDividends: 0,
    },
    combinedTWD: {
      totalCost: 0,
      marketValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      totalDividends: 0,
      netAssetValue: 0,
    },
    usdToTwdRate,
  };

  for (const h of holdings) {
    if (h.currency === 'TWD') {
      summary.twd.totalCost += h.totalCostBasis;
      summary.twd.marketValue += h.marketValue;
      summary.twd.unrealizedPnL += h.unrealizedPnL;
      summary.twd.realizedPnL += h.realizedPnL;
      summary.twd.totalDividends += h.totalDividends;
    } else {
      summary.usd.totalCost += h.totalCostBasis;
      summary.usd.marketValue += h.marketValue;
      summary.usd.unrealizedPnL += h.unrealizedPnL;
      summary.usd.realizedPnL += h.realizedPnL;
      summary.usd.totalDividends += h.totalDividends;
    }
  }

  if (summary.twd.totalCost > 0) {
    summary.twd.unrealizedPnLPercent = (summary.twd.unrealizedPnL / summary.twd.totalCost) * 100;
  }
  if (summary.usd.totalCost > 0) {
    summary.usd.unrealizedPnLPercent = (summary.usd.unrealizedPnL / summary.usd.totalCost) * 100;
  }

  // Combined TWD
  const usdRate = usdToTwdRate > 0 ? usdToTwdRate : 32.0;
  summary.combinedTWD.totalCost = summary.twd.totalCost + (summary.usd.totalCost * usdRate);
  summary.combinedTWD.marketValue = summary.twd.marketValue + (summary.usd.marketValue * usdRate);
  summary.combinedTWD.unrealizedPnL = summary.twd.unrealizedPnL + (summary.usd.unrealizedPnL * usdRate);
  summary.combinedTWD.realizedPnL = summary.twd.realizedPnL + (summary.usd.realizedPnL * usdRate);
  summary.combinedTWD.totalDividends = summary.twd.totalDividends + (summary.usd.totalDividends * usdRate);
  summary.combinedTWD.netAssetValue = summary.combinedTWD.marketValue;

  if (summary.combinedTWD.totalCost > 0) {
    summary.combinedTWD.unrealizedPnLPercent = (summary.combinedTWD.unrealizedPnL / summary.combinedTWD.totalCost) * 100;
  }

  return { holdings, summary };
}
