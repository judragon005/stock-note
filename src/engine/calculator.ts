import { TradeRecord, HoldingPosition, PortfolioSummary, MarketType, Currency, TradeType } from '../types/stock';

export interface CalculationResult {
  holdings: HoldingPosition[];
  summary: PortfolioSummary;
}

/**
 * 純函式：計算單筆交易或公司行動對現有股數的異動結果
 * @param currentShares 現有持有股數
 * @param trade 包含交易類別、股數與比例之紀錄
 */
export function applyTradeToShares(
  currentShares: number,
  trade: { type: TradeType; shares?: number; ratio?: number; market?: MarketType; symbol?: string }
): number {
  const shares = Number(trade.shares) || 0;
  const ratio = Number(trade.ratio) || 0;
  const isTW = trade.market === 'TW' || (trade.symbol ? /^\d+$/.test(trade.symbol) : false);

  let result = currentShares;
  switch (trade.type) {
    case 'BUY':
    case 'CAPITAL_INCREASE':
    case 'CB_CONVERSION':
      result = currentShares + shares;
      break;

    case 'SELL':
    case 'TENDER_OFFER':
    case 'PREFERRED_REDEMPTION':
      result = Math.max(0, currentShares - Math.min(shares, currentShares));
      break;

    case 'STOCK_MERGER':
      result = 0; // 原標的在換股合併後持股歸零轉出
      break;

    case 'SPIN_OFF':
      result = currentShares; // 企業分拆母公司持有股數不變
      break;

    case 'STOCK_DIVIDEND': {
      const added = shares > 0 ? shares : (ratio > 0 ? currentShares * ratio : 0);
      result = currentShares + (isTW ? Math.round(added) : added);
      break;
    }

    case 'STOCK_SPLIT': {
      const multiplier = ratio > 0 ? ratio : (shares > 0 && currentShares > 0 ? (currentShares + shares) / currentShares : 1);
      const calculated = multiplier > 0 ? currentShares * multiplier : currentShares;
      result = isTW ? Math.round(calculated) : calculated;
      break;
    }

    case 'CAPITAL_REDUCTION': {
      const reduced = shares > 0 ? Math.min(shares, currentShares) : (ratio > 0 ? currentShares * ratio : 0);
      const finalReduced = isTW ? Math.round(reduced) : reduced;
      result = Math.max(0, currentShares - finalReduced);
      break;
    }

    case 'DIVIDEND':
    default:
      result = currentShares;
      break;
  }

  return isTW ? Math.round(result) : result;
}

/**
 * 依歷史交易日期時序回溯判定特定時點的持有股數 (As of Date)
 * @param trades 所有交易紀錄
 * @param targetDate 查詢基準日 (YYYY-MM-DD)
 * @param symbol 標的代碼
 */
export function getHoldingsAsOfDate(
  trades: TradeRecord[],
  targetDate: string,
  symbol: string
): number {
  const symbolUpper = symbol.toUpperCase();
  const sortedTrades = [...trades]
    .filter((t) => t.symbol.toUpperCase() === symbolUpper && t.date <= targetDate)
    .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.createdAt - b.createdAt));

  let currentShares = 0;
  for (const trade of sortedTrades) {
    currentShares = applyTradeToShares(currentShares, trade);
  }

  return currentShares;
}

/**
 * 核心會計引擎：計算所有標的之持倉統計、均價與投資組合摘要
 */
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
    originalBuyShares: number;
    totalCostBasis: number;
    realizedPnL: number;
    totalDividends: number;
    totalCapitalReturned: number;
    totalStockDividendsShares: number;
  }

  const map = new Map<string, Accumulator>();

  const getOrCreateItem = (
    sym: string,
    defaultName?: string,
    defaultMarket?: MarketType,
    defaultCurrency?: Currency
  ): Accumulator => {
    if (!map.has(sym)) {
      map.set(sym, {
        symbol: sym,
        name: defaultName || sym,
        market: defaultMarket || 'TW',
        currency: defaultCurrency || (defaultMarket === 'US' ? 'USD' : 'TWD'),
        shares: 0,
        originalBuyShares: 0,
        totalCostBasis: 0,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
      });
    }
    return map.get(sym)!;
  };

  for (const trade of sortedTrades) {
    const item = getOrCreateItem(
      trade.symbol,
      trade.name,
      trade.market || (trade.currency === 'USD' ? 'US' : 'TW'),
      trade.currency || (trade.market === 'US' ? 'USD' : 'TWD')
    );

    if (trade.name && trade.name !== trade.symbol) {
      item.name = trade.name;
    }

    const isTW = item.market === 'TW' || /^\d+$/.test(trade.symbol);
    const fee = Number(trade.fee) || 0;
    const tax = Number(trade.tax) || 0;
    const price = Number(trade.price) || 0;
    const rawShares = Number(trade.shares) || 0;
    const shares = isTW ? Math.round(rawShares) : rawShares;
    const ratio = Number(trade.ratio) || 0;
    const cashAmount = trade.cashAmount !== undefined ? Number(trade.cashAmount) : 0;

    switch (trade.type) {
      case 'BUY': {
        const grossAmount = shares * price;
        const netCost = grossAmount + fee + tax;
        item.totalCostBasis += netCost;
        item.shares += shares;
        item.originalBuyShares += shares;
        break;
      }

      case 'SELL': {
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
        break;
      }

      case 'DIVIDEND': {
        let divAmount = 0;
        if (cashAmount > 0) {
          divAmount = cashAmount;
        } else if (price > 0 && shares > 0) {
          divAmount = (price * shares) - tax - fee;
        } else if (price > 0) {
          divAmount = price - tax - fee;
        } else if (fee > 0) {
          divAmount = fee;
        }
        item.totalDividends += Math.max(0, divAmount);
        break;
      }

      case 'STOCK_DIVIDEND': {
        const rawAdded = shares > 0 ? shares : (ratio > 0 ? item.shares * ratio : 0);
        const addedShares = isTW ? Math.round(rawAdded) : rawAdded;
        item.shares += addedShares;
        item.totalStockDividendsShares += addedShares;
        break;
      }

      case 'STOCK_SPLIT': {
        const splitMultiplier = ratio > 0 ? ratio : (shares > 0 && item.shares > 0 ? (item.shares + shares) / item.shares : 1);
        if (splitMultiplier > 0) {
          item.shares *= splitMultiplier;
          if (isTW) item.shares = Math.round(item.shares);
        }
        break;
      }

      case 'CAPITAL_REDUCTION': {
        const rawReduced = shares > 0 ? Math.min(shares, item.shares) : (ratio > 0 ? item.shares * ratio : 0);
        const reducedShares = isTW ? Math.round(rawReduced) : rawReduced;
        const preReductionShares = item.shares;
        item.shares = Math.max(0, item.shares - reducedShares);
        if (isTW) item.shares = Math.round(item.shares);

        const refund = cashAmount > 0 ? cashAmount : (price > 0 ? preReductionShares * price : 0);
        if (refund > 0) {
          item.totalCostBasis = Math.max(0, item.totalCostBasis - refund);
          item.totalCapitalReturned += refund;
        }
        break;
      }

      case 'CAPITAL_INCREASE': {
        const grossAmount = shares * price;
        const netCost = grossAmount + fee + tax;
        item.totalCostBasis += netCost;
        item.shares += shares;
        item.originalBuyShares += shares;
        break;
      }

      case 'STOCK_MERGER': {
        const transferCost = item.totalCostBasis;
        const preMergerShares = item.shares;
        item.shares = 0;
        item.totalCostBasis = 0;

        if (trade.targetSymbol) {
          const targetItem = getOrCreateItem(
            trade.targetSymbol,
            trade.targetName || trade.targetSymbol,
            item.market,
            item.currency
          );
          const rawSharesB = shares > 0 ? shares : (ratio > 0 ? preMergerShares * ratio : preMergerShares);
          const newSharesB = isTW ? Math.round(rawSharesB) : rawSharesB;
          targetItem.shares += newSharesB;
          targetItem.originalBuyShares += newSharesB;
          targetItem.totalCostBasis += Math.max(0, transferCost - cashAmount);
        }
        break;
      }

      case 'PREFERRED_REDEMPTION': {
        const redemptionTotal = cashAmount > 0 ? cashAmount : (price > 0 && shares > 0 ? price * shares : price);
        const pnl = (redemptionTotal - fee - tax) - item.totalCostBasis;
        item.realizedPnL += pnl;
        item.shares = 0;
        item.totalCostBasis = 0;
        break;
      }

      case 'SPIN_OFF': {
        const alloc = trade.allocationRatio !== undefined && trade.allocationRatio > 0 ? trade.allocationRatio : 0.2;
        const splitCost = item.totalCostBasis * alloc;
        item.totalCostBasis = Math.max(0, item.totalCostBasis - splitCost);

        if (trade.targetSymbol) {
          const targetItem = getOrCreateItem(
            trade.targetSymbol,
            trade.targetName || trade.targetSymbol,
            item.market,
            item.currency
          );
          const rawChild = shares > 0 ? shares : (ratio > 0 ? item.shares * ratio : 0);
          const newSharesChild = isTW ? Math.round(rawChild) : rawChild;
          targetItem.shares += newSharesChild;
          targetItem.originalBuyShares += newSharesChild;
          targetItem.totalCostBasis += splitCost;
        }
        break;
      }

      case 'CB_CONVERSION': {
        const convCost = cashAmount > 0 ? cashAmount : (shares > 0 && price > 0 ? shares * price + fee + tax : fee + tax);
        item.totalCostBasis += convCost;
        item.shares += shares;
        item.originalBuyShares += shares;
        break;
      }

      case 'TENDER_OFFER': {
        if (item.shares > 0) {
          const avgUnitCost = item.totalCostBasis / item.shares;
          const sellShares = Math.min(shares > 0 ? shares : item.shares, item.shares);
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
        break;
      }

      default:
        break;
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
      originalBuyShares: item.originalBuyShares,
      avgCost,
      totalCostBasis: item.totalCostBasis,
      adjustedCostBasis: item.totalCostBasis,
      currentPrice,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      realizedPnL: item.realizedPnL,
      totalDividends: item.totalDividends,
      totalCapitalReturned: item.totalCapitalReturned,
      totalStockDividendsShares: item.totalStockDividendsShares,
      yieldOnCostPercent,
    });
  }

  // 依規格排序：台股置前、美股置底；同市場內依標的代碼字母數字升冪排序（完全吻合照片 2 順序）
  holdings.sort((a, b) => {
    const marketWeightA = a.market === 'TW' ? 0 : 1;
    const marketWeightB = b.market === 'TW' ? 0 : 1;
    if (marketWeightA !== marketWeightB) {
      return marketWeightA - marketWeightB;
    }
    return a.symbol.localeCompare(b.symbol);
  });

  // 匯總計算
  const summary: PortfolioSummary = {
    twd: {
      totalCost: 0,
      marketValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
    },
    usd: {
      totalCost: 0,
      marketValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
    },
    combinedTWD: {
      totalCost: 0,
      marketValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
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
      summary.twd.totalCapitalReturned += h.totalCapitalReturned;
    } else {
      summary.usd.totalCost += h.totalCostBasis;
      summary.usd.marketValue += h.marketValue;
      summary.usd.unrealizedPnL += h.unrealizedPnL;
      summary.usd.realizedPnL += h.realizedPnL;
      summary.usd.totalDividends += h.totalDividends;
      summary.usd.totalCapitalReturned += h.totalCapitalReturned;
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
  summary.combinedTWD.totalCapitalReturned = summary.twd.totalCapitalReturned + (summary.usd.totalCapitalReturned * usdRate);
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

