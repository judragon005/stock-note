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
    const yieldOnCostPercent = item.totalCostBasis > 0 ? (item.totalDividends / item.totalCostBasis) * 100 : 0;

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
      yieldOnCostPercent,
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

/**
 * 試算台股手續費（支援券商電子下單折數與最低收費門檻）
 * @param price 每股成交價
 * @param shares 成交股數
 * @param discountRate 券商折數 (如 1.0 = 不打折, 0.6 = 6折, 0.28 = 2.8折)
 * @param minFee 最低手續費 (預設 20 元，若設為 0 則不設低消)
 */
export function calculateTaiwanFee(
  price: number,
  shares: number,
  discountRate: number = 1.0,
  minFee: number = 20
): number {
  if (price <= 0 || shares <= 0) return 0;
  const rawAmount = price * shares;
  const baseFee = rawAmount * 0.001425;
  const discountedFee = Math.floor(baseFee * discountRate);
  if (minFee > 0 && discountedFee < minFee) {
    return minFee;
  }
  return Math.max(1, discountedFee);
}

/**
 * 試算台股證交稅 (股票 0.3%，ETF 0.1%)
 * @param price 每股成交價
 * @param shares 成交股數
 * @param isETF 是否為 ETF
 */
export function calculateTaiwanTax(
  price: number,
  shares: number,
  isETF: boolean = false
): number {
  if (price <= 0 || shares <= 0) return 0;
  const rawAmount = price * shares;
  const rate = isETF ? 0.001 : 0.003;
  return Math.floor(rawAmount * rate);
}
