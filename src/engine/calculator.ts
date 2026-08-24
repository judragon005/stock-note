import {
  TradeRecord,
  HoldingPosition,
  PortfolioSummary,
  MarketType,
  Currency,
  TradeType,
  AccountingView,
  BrokerAccount,
  FrictionSummary,
  TaxRateCategory,
} from '../types/stock';
import { resolveOfficialSecurityName } from '../utils/storage';

export interface CalculationResult {
  holdings: HoldingPosition[];
  summary: PortfolioSummary;
  frictionSummary?: FrictionSummary;
}

/**
 * 試算預估賣出證券交易稅（台股債券 ETF 0% 免稅，台股股票 ETF 0.1%，台股現股 0.3%，美股 0%）
 */
export function calculateEstimatedSellTax(symbol: string, market: MarketType, grossMarketValue: number): number {
  if (grossMarketValue <= 0) return 0;
  if (market === 'TW') {
    const cleanSymbol = symbol.trim().toUpperCase();
    // 債券型 ETF（如 00679B, 00687B）依台灣稅法停徵證券交易稅 (0%)
    if (cleanSymbol.endsWith('B')) {
      return 0;
    }
    // 股票型 ETF (00 開頭) 證交稅為 0.1%
    const isETF = cleanSymbol.startsWith('00');
    const taxRate = isETF ? 0.001 : 0.003;
    return Math.floor(grossMarketValue * taxRate);
  }
  return 0;
}

/**
 * 計算預估賣出手續費 (台股 0.1425% 搭配自訂折讓率，美股 0)
 * @param market 市場
 * @param grossMarketValue 牌面毛市值
 * @param discountRate 手續費折扣率 (例如 1.0 為全額牌告對齊券商 App 預設、0.6 為 6折、0.28 為 2.8折)
 * @param minFee 最低手續費門檻 (預設 20 元)
 */
export function calculateEstimatedSellFee(
  market: MarketType,
  grossMarketValue: number,
  discountRate: number = 1.0,
  minFee: number = 20
): number {
  if (grossMarketValue <= 0) return 0;
  if (market === 'US') {
    return 0; // 美股海外券商免手續費或微量監管費
  }
  // 台股券商公定手續費 0.1425%
  const standardFee = grossMarketValue * 0.001425;
  const discountedFee = Math.max(minFee, Math.floor(standardFee * discountRate));
  return Math.max(0, discountedFee);
}

/**
 * 依特定券商帳戶規則計算預估賣出手續費
 */
export function calculateAccountSellFee(
  grossMarketValue: number,
  account?: BrokerAccount,
  fallbackDiscount: number = 1.0
): number {
  if (grossMarketValue <= 0) return 0;
  if (!account) {
    const standardFee = grossMarketValue * 0.001425;
    return Math.max(20, Math.floor(standardFee * fallbackDiscount));
  }

  if (account.market === 'US') {
    if (account.usFeeType === 'SUB_BROKERAGE') {
      const fee = grossMarketValue * (account.feeRate || 0.001) * (account.discountRate || 1.0);
      return Math.max(account.minFee || 0, Math.floor(fee));
    }
    return 0; // ZERO_COMMISSION
  }

  // 台股帳戶
  const standardFee = grossMarketValue * (account.feeRate || 0.001425);
  const discounted = Math.floor(standardFee * (account.discountRate ?? fallbackDiscount));
  return Math.max(account.minFee ?? 20, discounted);
}

/**
 * 智慧修復歷史帳本中「稅費合一 (Ghostfolio / 舊版 CSV 匯入缺 tax)」之台股賣出交易
 * 依據成交金額精準推導證交稅 (0.3% / 0.1% / 0%) 並從原 fee 中分離，保持交割淨額與損益 100% 恆等
 */
export function repairLedgerTaxAndFee(trades: TradeRecord[]): {
  repairedTrades: TradeRecord[];
  fixedCount: number;
  totalTaxSeparated: number;
} {
  let fixedCount = 0;
  let totalTaxSeparated = 0;

  const repairedTrades = trades.map((t) => {
    // 僅修復台股賣出、且 tax 為 0 (或未設定)、且 shares > 0、price > 0 的紀錄
    if (t.type === 'SELL' && (t.market === 'TW' || !t.market) && (!t.tax || t.tax === 0) && t.shares > 0 && t.price > 0) {
      const cleanSym = (t.symbol || '').trim().toUpperCase();
      const isBond = cleanSym.endsWith('B');
      if (isBond) {
        // 債券型 ETF 0% 免稅，屬正常合法狀態，無須修復
        return t;
      }

      const isETF = cleanSym.startsWith('00');
      const isDayTrading = t.taxRateCategory === 'DAY_TRADING';
      const estimatedTax = calculateTaiwanTax(t.price, t.shares, isETF, isDayTrading, false);

      if (estimatedTax > 0) {
        let newTax = estimatedTax;
        let newFee = t.fee || 0;

        // 若原手續費大於或等於推導出的證交稅（代表稅被灌進了 fee），進行安全拆分
        if (newFee >= estimatedTax) {
          newFee = Math.max(1, newFee - estimatedTax);
        }
        // 若原手續費小於證交稅（代表記錄時純填手續費，漏填了證交稅），保留 newFee，補上 newTax

        fixedCount++;
        totalTaxSeparated += newTax;
        const category: TaxRateCategory = isDayTrading
          ? 'DAY_TRADING'
          : (isETF ? 'STOCK_ETF' : 'STOCK_REGULAR');
        return {
          ...t,
          tax: newTax,
          fee: newFee,
          taxRateCategory: category,
        };
      }
    }
    return t;
  });

  return { repairedTrades, fixedCount, totalTaxSeparated };
}

/**
 * 交易摩擦成本深度分析統計函式 (Friction Cost Center)
 */
export function calculateFrictionCostSummary(
  trades: TradeRecord[],
  holdings: HoldingPosition[],
  accounts: BrokerAccount[] = [],
  usdRate: number = 32.0
): FrictionSummary {
  let totalBuyFee = 0;
  let totalSellFee = 0;
  let totalSellTax = 0;
  let totalUSDividendTax = 0;
  let totalTWDividendTax = 0;
  let totalFeeSavedByDiscount = 0;

  const accountMap = new Map<string, BrokerAccount>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  for (const t of trades) {
    const rawFee = t.fee || 0;
    const rawTax = t.tax || 0;
    const isUS = t.market === 'US' || t.currency === 'USD';
    const rate = isUS ? usdRate : 1.0;
    const feeInTWD = rawFee * rate;
    const taxInTWD = rawTax * rate;
    const volume = t.shares * t.price;

    if (t.type === 'BUY') {
      totalBuyFee += feeInTWD;
      if (t.market === 'TW' && volume > 0) {
        // 台股法定標準牌告手續費基準：低消 20 元 + 費率 0.1425%
        const standardFee = Math.max(20, Math.floor(volume * 0.001425));
        if (standardFee > rawFee) {
          totalFeeSavedByDiscount += (standardFee - rawFee);
        }
      }
    } else if (t.type === 'SELL') {
      totalSellFee += feeInTWD;
      totalSellTax += taxInTWD;
      if (t.market === 'TW' && volume > 0) {
        const standardFee = Math.max(20, Math.floor(volume * 0.001425));
        if (standardFee > rawFee) {
          totalFeeSavedByDiscount += (standardFee - rawFee);
        }
      }
    } else if (t.type === 'DIVIDEND') {
      if (isUS) {
        // 美股現金股利 30% 預扣稅 (Withholding Tax)
        const usDivTax = rawTax > 0 ? rawTax : Math.round(volume * 0.3);
        totalUSDividendTax += usDivTax;
      } else if (t.market === 'TW') {
        // 台股現金股利二代健保補充保費：單筆 >= 20,000 元課 2.11%
        if (volume >= 20000) {
          const twDivTax = rawTax > 0 ? rawTax : Math.floor(volume * 0.0211);
          totalTWDividendTax += twDivTax;
        }
      }
    }
  }

  const totalUSDividendTaxInTWD = totalUSDividendTax * usdRate;
  const totalRealizedFriction = totalBuyFee + totalSellFee + totalSellTax + totalUSDividendTaxInTWD + totalTWDividendTax;

  let totalEstimatedFutureTax = 0;
  let totalEstimatedFutureFee = 0;

  for (const h of holdings) {
    if (h.shares > 0 && h.grossMarketValue > 0) {
      const isUS = h.market === 'US' || h.currency === 'USD';
      const rate = isUS ? usdRate : 1.0;
      totalEstimatedFutureTax += (h.estimatedSellTax * rate);
      totalEstimatedFutureFee += (h.estimatedSellFee * rate);
    }
  }

  const totalEstimatedFutureFriction = totalEstimatedFutureTax + totalEstimatedFutureFee;
  const totalGrossAsset = holdings.reduce((sum, h) => {
    if (h.shares <= 0) return sum;
    const isUS = h.market === 'US' || h.currency === 'USD';
    return sum + (isUS ? h.grossMarketValue * usdRate : h.grossMarketValue);
  }, 0);

  const frictionImpactPercent = totalGrossAsset > 0
    ? ((totalRealizedFriction + totalEstimatedFutureFriction) / totalGrossAsset) * 100
    : 0;

  return {
    totalBuyFee: Math.round(totalBuyFee),
    totalSellFee: Math.round(totalSellFee),
    totalSellTax: Math.round(totalSellTax),
    totalUSDividendTax,
    totalTWDividendTax,
    totalRealizedFriction: Math.round(totalRealizedFriction),
    totalFeeSavedByDiscount: Math.round(totalFeeSavedByDiscount),
    totalEstimatedFutureFriction: Math.round(totalEstimatedFutureFriction),
    totalEstimatedFutureTax: Math.round(totalEstimatedFutureTax),
    totalEstimatedFutureFee: Math.round(totalEstimatedFutureFee),
    frictionImpactPercent,
  };
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
      result = 0;
      break;

    case 'SPIN_OFF':
      result = currentShares;
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
  usdToTwdRate: number = 32.0,
  accountingView: AccountingView = 'TOTAL_RETURN',
  accounts: BrokerAccount[] = [],
  selectedAccountId: 'ALL' | string = 'ALL'
): CalculationResult {
  const accountMap = new Map<string, BrokerAccount>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  // 依選定帳戶進行交易過濾
  const filteredTrades = selectedAccountId === 'ALL'
    ? trades
    : trades.filter((t) => (t.accountId || (t.market === 'TW' ? 'broker-tw-default' : 'broker-us-default')) === selectedAccountId);

  const sortedTrades = [...filteredTrades].sort((a, b) => {
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
    accountId?: string;
  }

  const map = new Map<string, Accumulator>();

  const getOrCreateItem = (
    sym: string,
    defaultName?: string,
    defaultMarket?: MarketType,
    defaultCurrency?: Currency,
    defaultAccountId?: string
  ): Accumulator => {
    const cleanSym = sym.trim().toUpperCase();
    if (!map.has(cleanSym)) {
      map.set(cleanSym, {
        symbol: cleanSym,
        name: resolveOfficialSecurityName(cleanSym, defaultName),
        market: defaultMarket || 'TW',
        currency: defaultCurrency || (defaultMarket === 'US' ? 'USD' : 'TWD'),
        accountId: defaultAccountId,
        shares: 0,
        originalBuyShares: 0,
        totalCostBasis: 0,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
      });
    }
    return map.get(cleanSym)!;
  };

  for (const trade of sortedTrades) {
    const item = getOrCreateItem(
      trade.symbol,
      trade.name,
      trade.market || (trade.currency === 'USD' ? 'US' : 'TW'),
      trade.currency || (trade.market === 'US' ? 'USD' : 'TWD'),
      trade.accountId
    );
    if (trade.accountId) {
      item.accountId = trade.accountId;
    }

    if (trade.name && trade.name !== trade.symbol) {
      item.name = resolveOfficialSecurityName(item.symbol, trade.name);
    }

    const fee = Number(trade.fee) || 0;
    const tax = Number(trade.tax) || 0;
    const shares = Number(trade.shares) || 0;
    const price = Number(trade.price) || 0;
    const ratio = Number(trade.ratio) || 0;
    const cashAmount = Number(trade.cashAmount) || 0;

    switch (trade.type) {
      case 'BUY': {
        const netCost = shares * price + fee;
        item.shares += shares;
        item.originalBuyShares += shares;
        item.totalCostBasis += netCost;
        break;
      }

      case 'SELL': {
        if (item.shares > 0) {
          const soldShares = Math.min(shares, item.shares);
          const avgUnitCost = item.totalCostBasis / item.shares;
          const costOfSold = avgUnitCost * soldShares;
          const netProceeds = soldShares * price - fee - tax;
          const profit = netProceeds - costOfSold;

          item.shares = Math.max(0, item.shares - soldShares);
          item.realizedPnL += profit;
          item.totalCostBasis = Math.max(0, item.totalCostBasis - costOfSold);

          if (item.shares <= 0) {
            item.shares = 0;
            item.totalCostBasis = 0;
          }
        }
        break;
      }

      case 'DIVIDEND': {
        const netDiv = (shares > 0 && price > 0 ? shares * price : cashAmount) - fee - tax;
        item.totalDividends += Math.max(0, netDiv);
        break;
      }

      case 'STOCK_DIVIDEND': {
        const added = shares > 0 ? shares : (ratio > 0 ? item.shares * ratio : 0);
        const finalAdded = item.market === 'TW' ? Math.round(added) : added;
        item.shares += finalAdded;
        item.totalStockDividendsShares += finalAdded;
        break;
      }

      case 'STOCK_SPLIT': {
        const multiplier = ratio > 0 ? ratio : (shares > 0 && item.shares > 0 ? (item.shares + shares) / item.shares : 1);
        if (multiplier > 0) {
          const newShares = item.shares * multiplier;
          item.shares = item.market === 'TW' ? Math.round(newShares) : newShares;
        }
        break;
      }

      case 'CAPITAL_REDUCTION': {
        const reduced = shares > 0 ? Math.min(shares, item.shares) : (ratio > 0 ? item.shares * ratio : 0);
        const finalReduced = item.market === 'TW' ? Math.round(reduced) : reduced;
        item.shares = Math.max(0, item.shares - finalReduced);

        const refund = cashAmount > 0 ? cashAmount : (price > 0 && finalReduced > 0 ? finalReduced * price : 0);
        if (refund > 0) {
          item.totalCapitalReturned += refund;
          item.totalCostBasis = Math.max(0, item.totalCostBasis - refund);
        }

        if (item.shares <= 0) {
          item.totalCostBasis = 0;
        }
        break;
      }

      case 'CAPITAL_INCREASE': {
        const netCost = shares * price + fee;
        item.shares += shares;
        item.originalBuyShares += shares;
        item.totalCostBasis += netCost;
        break;
      }

      case 'STOCK_MERGER': {
        const targetSym = trade.targetSymbol || '';
        if (targetSym && targetSym !== trade.symbol) {
          const targetItem = getOrCreateItem(targetSym, trade.targetName || targetSym, item.market, item.currency);
          const transferCost = item.totalCostBasis;
          const mergedShares = shares > 0 ? shares : (ratio > 0 ? item.shares * ratio : 0);
          item.shares = 0;
          item.totalCostBasis = 0;

          if (cashAmount > 0) {
            item.realizedPnL += cashAmount;
          }

          targetItem.shares += mergedShares;
          targetItem.totalCostBasis += Math.max(0, transferCost - cashAmount);
        }
        break;
      }

      case 'PREFERRED_REDEMPTION': {
        const redemptionTotal = (shares > 0 ? shares : item.shares) * (price > 0 ? price : 1);
        const pnl = (redemptionTotal - fee - tax) - item.totalCostBasis;
        item.realizedPnL += pnl;
        item.shares = 0;
        item.totalCostBasis = 0;
        break;
      }

      case 'SPIN_OFF': {
        const targetSym = trade.targetSymbol || '';
        const alloc = trade.allocationRatio || 0;
        if (targetSym && targetSym !== trade.symbol && alloc > 0 && alloc < 1) {
          const splitCost = item.totalCostBasis * alloc;
          item.totalCostBasis = Math.max(0, item.totalCostBasis - splitCost);

          const targetItem = getOrCreateItem(targetSym, trade.targetName || targetSym, item.market, item.currency);
          const newShares = shares > 0 ? shares : (ratio > 0 ? item.shares * ratio : 0);
          targetItem.shares += newShares;
          targetItem.totalCostBasis += splitCost;
        }
        break;
      }

      case 'CB_CONVERSION': {
        const convPrice = trade.conversionPrice || price;
        const convCost = shares * (convPrice > 0 ? convPrice : price) + fee;
        item.shares += shares;
        item.totalCostBasis += convCost;
        break;
      }

      case 'TENDER_OFFER': {
        if (item.shares > 0) {
          const boughtShares = Math.min(shares, item.shares);
          const avgUnitCost = item.totalCostBasis / item.shares;
          const costOfBought = avgUnitCost * boughtShares;
          const netProceeds = boughtShares * price - fee - tax;
          const profit = netProceeds - costOfBought;

          item.shares = Math.max(0, item.shares - boughtShares);
          item.realizedPnL += profit;
          item.totalCostBasis = Math.max(0, item.totalCostBasis - costOfBought);

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
    const grossMarketValue = item.shares * currentPrice;
    
    const estimatedSellTax = calculateEstimatedSellTax(item.symbol, item.market, grossMarketValue);
    const targetAccount = item.accountId
      ? accountMap.get(item.accountId)
      : accounts.find((a) => a.market === item.market);
    const estimatedSellFee = calculateAccountSellFee(grossMarketValue, targetAccount);
    const netMarketValue = Math.max(0, grossMarketValue - estimatedSellTax - estimatedSellFee);

    const unrealizedPnLBroker = netMarketValue - item.totalCostBasis;
    const unrealizedPnLBrokerPercent = item.totalCostBasis > 0 ? (unrealizedPnLBroker / item.totalCostBasis) * 100 : 0;

    const totalReturnPnL = (grossMarketValue - item.totalCostBasis) + item.totalDividends + item.realizedPnL;
    const totalReturnPercent = item.totalCostBasis > 0 ? (totalReturnPnL / item.totalCostBasis) * 100 : 0;
    const adjustedCostBasis = Math.max(0, item.totalCostBasis - item.totalDividends);
    const yieldOnCostPercent = item.totalCostBasis > 0 ? (item.totalDividends / item.totalCostBasis) * 100 : 0;

    const isBroker = accountingView === 'BROKER';
    const marketValue = isBroker ? netMarketValue : grossMarketValue;
    const unrealizedPnL = isBroker ? unrealizedPnLBroker : (grossMarketValue - item.totalCostBasis);
    const unrealizedPnLPercent = isBroker ? unrealizedPnLBrokerPercent : (item.totalCostBasis > 0 ? (unrealizedPnL / item.totalCostBasis) * 100 : 0);

    holdings.push({
      symbol: item.symbol,
      name: item.name,
      market: item.market,
      currency: item.currency,
      shares: item.shares,
      originalBuyShares: item.originalBuyShares,
      avgCost,
      totalCostBasis: item.totalCostBasis,
      adjustedCostBasis,
      currentPrice,
      marketValue,
      grossMarketValue,
      estimatedSellTax,
      estimatedSellFee,
      netMarketValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      unrealizedPnLBroker,
      unrealizedPnLBrokerPercent,
      realizedPnL: item.realizedPnL,
      totalDividends: item.totalDividends,
      totalCapitalReturned: item.totalCapitalReturned,
      totalStockDividendsShares: item.totalStockDividendsShares,
      totalReturnPnL,
      totalReturnPercent,
      yieldOnCostPercent,
    });
  }

  holdings.sort((a, b) => {
    const marketWeightA = a.market === 'TW' ? 0 : 1;
    const marketWeightB = b.market === 'TW' ? 0 : 1;
    if (marketWeightA !== marketWeightB) {
      return marketWeightA - marketWeightB;
    }
    return a.symbol.localeCompare(b.symbol);
  });

  const summary: PortfolioSummary = {
    twd: {
      totalCost: 0,
      marketValue: 0,
      grossMarketValue: 0,
      netMarketValue: 0,
      estimatedSellTax: 0,
      estimatedSellFee: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalReturnPnL: 0,
      totalReturnPercent: 0,
    },
    usd: {
      totalCost: 0,
      marketValue: 0,
      grossMarketValue: 0,
      netMarketValue: 0,
      estimatedSellTax: 0,
      estimatedSellFee: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalReturnPnL: 0,
      totalReturnPercent: 0,
    },
    combinedTWD: {
      totalCost: 0,
      marketValue: 0,
      grossMarketValue: 0,
      netMarketValue: 0,
      estimatedSellTax: 0,
      estimatedSellFee: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalReturnPnL: 0,
      totalReturnPercent: 0,
      netAssetValue: 0,
    },
    usdToTwdRate,
  };

  for (const h of holdings) {
    const targetSlice = h.currency === 'TWD' ? summary.twd : summary.usd;
    targetSlice.totalCost += h.totalCostBasis;
    targetSlice.marketValue += h.marketValue;
    targetSlice.grossMarketValue += h.grossMarketValue;
    targetSlice.netMarketValue += h.netMarketValue;
    targetSlice.estimatedSellTax += h.estimatedSellTax;
    targetSlice.estimatedSellFee += h.estimatedSellFee;
    targetSlice.unrealizedPnL += h.unrealizedPnL;
    targetSlice.realizedPnL += h.realizedPnL;
    targetSlice.totalDividends += h.totalDividends;
    targetSlice.totalCapitalReturned += h.totalCapitalReturned;
    targetSlice.totalReturnPnL += h.totalReturnPnL;
  }

  if (summary.twd.totalCost > 0) {
    summary.twd.unrealizedPnLPercent = (summary.twd.unrealizedPnL / summary.twd.totalCost) * 100;
    summary.twd.totalReturnPercent = (summary.twd.totalReturnPnL / summary.twd.totalCost) * 100;
  }
  if (summary.usd.totalCost > 0) {
    summary.usd.unrealizedPnLPercent = (summary.usd.unrealizedPnL / summary.usd.totalCost) * 100;
    summary.usd.totalReturnPercent = (summary.usd.totalReturnPnL / summary.usd.totalCost) * 100;
  }

  const usdRate = usdToTwdRate > 0 ? usdToTwdRate : 32.0;
  summary.combinedTWD.totalCost = summary.twd.totalCost + (summary.usd.totalCost * usdRate);
  summary.combinedTWD.marketValue = summary.twd.marketValue + (summary.usd.marketValue * usdRate);
  summary.combinedTWD.grossMarketValue = summary.twd.grossMarketValue + (summary.usd.grossMarketValue * usdRate);
  summary.combinedTWD.netMarketValue = summary.twd.netMarketValue + (summary.usd.netMarketValue * usdRate);
  summary.combinedTWD.estimatedSellTax = summary.twd.estimatedSellTax + (summary.usd.estimatedSellTax * usdRate);
  summary.combinedTWD.estimatedSellFee = summary.twd.estimatedSellFee + (summary.usd.estimatedSellFee * usdRate);
  summary.combinedTWD.unrealizedPnL = summary.twd.unrealizedPnL + (summary.usd.unrealizedPnL * usdRate);
  summary.combinedTWD.realizedPnL = summary.twd.realizedPnL + (summary.usd.realizedPnL * usdRate);
  summary.combinedTWD.totalDividends = summary.twd.totalDividends + (summary.usd.totalDividends * usdRate);
  summary.combinedTWD.totalCapitalReturned = summary.twd.totalCapitalReturned + (summary.usd.totalCapitalReturned * usdRate);
  summary.combinedTWD.totalReturnPnL = summary.twd.totalReturnPnL + (summary.usd.totalReturnPnL * usdRate);
  summary.combinedTWD.netAssetValue = summary.combinedTWD.marketValue;

  if (summary.combinedTWD.totalCost > 0) {
    summary.combinedTWD.unrealizedPnLPercent = (summary.combinedTWD.unrealizedPnL / summary.combinedTWD.totalCost) * 100;
    summary.combinedTWD.totalReturnPercent = (summary.combinedTWD.totalReturnPnL / summary.combinedTWD.totalCost) * 100;
  }

  const frictionSummary = calculateFrictionCostSummary(filteredTrades, holdings, accounts, usdRate);

  return { holdings, summary, frictionSummary };
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
 * 試算台股證交稅 (現股 0.3%，當沖 0.15%，股票 ETF 0.1%，債券 ETF 0% 免稅)
 * @param price 每股成交價
 * @param shares 成交股數
 * @param isETF 是否為股票型 ETF (0.1%)
 * @param isDayTrading 是否為現股當沖 (0.15%)
 * @param isBondETF 是否為債券型 ETF (0%)
 */
export function calculateTaiwanTax(
  price: number,
  shares: number,
  isETF: boolean = false,
  isDayTrading: boolean = false,
  isBondETF: boolean = false
): number {
  if (price <= 0 || shares <= 0 || isBondETF) return 0;
  const rawAmount = price * shares;
  let rate = 0.003;
  if (isDayTrading) {
    rate = 0.0015;
  } else if (isETF) {
    rate = 0.001;
  }
  return Math.floor(rawAmount * rate);
}

