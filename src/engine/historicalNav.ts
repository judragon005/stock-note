import {
  TradeRecord,
  CashTransaction,
  LoanRecord,
  HistoricalDailyPriceMap,
  HistoricalFxRateMap,
  PortfolioDailySnapshot,
  TimeRangeFilter,
  PortfolioPerformanceMetrics,
  Currency,
} from '../types/stock';
import { ReceivableDividend } from '../types/dividend';

/**
 * 產生兩個 YYYY-MM-DD 日期之間所有連續日期的字串陣列
 */
export function generateDateSequence(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return [startDate];
  }

  const current = new Date(start);
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * 向前補齊 (Forward-Fill) 缺失價格/匯率（遇休市日、假日或 API 缺漏時沿用前一交易日價格）
 */
export function forwardFillPrices(
  dates: string[],
  rawPrices: Record<string, number>,
  initialFallback = 0
): Record<string, number> {
  const result: Record<string, number> = {};
  let lastKnownPrice = initialFallback;

  // 若一開始就有最早報價，先尋找第一個已知價格作為初始 fallback
  if (lastKnownPrice === 0) {
    const firstKnownDate = Object.keys(rawPrices).sort()[0];
    if (firstKnownDate && rawPrices[firstKnownDate] > 0) {
      lastKnownPrice = rawPrices[firstKnownDate];
    }
  }

  for (const d of dates) {
    if (rawPrices[d] !== undefined && rawPrices[d] !== null && !isNaN(rawPrices[d]) && rawPrices[d] > 0) {
      lastKnownPrice = rawPrices[d];
    }
    result[d] = lastKnownPrice;
  }

  return result;
}

export interface CalculateHistoricalNavOptions {
  trades: TradeRecord[];
  cashTransactions?: CashTransaction[];
  loanRecords?: LoanRecord[];
  receivableDividends?: ReceivableDividend[];
  priceMap: HistoricalDailyPriceMap;
  fxMap?: HistoricalFxRateMap;
  currentPrices?: Record<string, number>;
  startDate?: string;
  endDate?: string;
  baseCurrency?: Currency;
}

/**
 * 核心引擎：逐日回測計算歷史資產淨值 (NAV) 與時間序列
 */
export function calculateHistoricalNavSeries(options: CalculateHistoricalNavOptions): PortfolioDailySnapshot[] {
  const {
    trades,
    cashTransactions = [],
    loanRecords = [],
    receivableDividends = [],
    priceMap,
    fxMap = {},
    currentPrices = {},
    baseCurrency = 'TWD',
  } = options;

  if (trades.length === 0 && cashTransactions.length === 0 && loanRecords.length === 0) {
    return [];
  }

  // 1. 找出全歷史起訖日期
  const allDatesFromInputs: string[] = [];
  trades.forEach((t) => allDatesFromInputs.push(t.date));
  cashTransactions.forEach((c) => allDatesFromInputs.push(c.date));
  loanRecords.forEach((l) => {
    const d = l.startDate || l.date;
    if (d) allDatesFromInputs.push(d);
  });

  allDatesFromInputs.sort();
  const earliestDate = options.startDate || allDatesFromInputs[0] || new Date().toISOString().split('T')[0];
  const latestDate = options.endDate || allDatesFromInputs[allDatesFromInputs.length - 1] || earliestDate;

  const dateSequence = generateDateSequence(earliestDate, latestDate);

  // 2. 預處理歷史匯率 (Forward Fill)
  const filledFxMap = forwardFillPrices(dateSequence, fxMap, 32.0);

  // 3. 預處理各標的歷史價格 (Forward Fill，支援即時市價保底)
  const filledPriceMap: Record<string, Record<string, number>> = {};
  const allSymbols = Array.from(new Set(trades.map((t) => t.symbol.toUpperCase())));

  allSymbols.forEach((sym) => {
    const raw = { ...(priceMap[sym] || {}) };
    const curPrice = currentPrices[sym];
    const symbolTrades = trades.filter((t) => t.symbol.toUpperCase() === sym).sort((a, b) => a.date.localeCompare(b.date));
    const firstTrade = symbolTrades[0];
    const lastTrade = symbolTrades[symbolTrades.length - 1];
    
    // 若有當前最新市價，優先作為 fallback；否則以最後/最初買進成交價為基準
    const initialPrice = curPrice && curPrice > 0
      ? curPrice
      : (lastTrade ? lastTrade.price : (firstTrade ? firstTrade.price : 0));

    // 若最後一日或今天沒有日 K 報價，但有即時市價，將最新日期注入為即時市價
    if (curPrice && curPrice > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const lastSeqDate = dateSequence[dateSequence.length - 1];
      if (lastSeqDate) {
        raw[lastSeqDate] = curPrice;
      }
      if (todayStr && !raw[todayStr]) {
        raw[todayStr] = curPrice;
      }
    }

    filledPriceMap[sym] = forwardFillPrices(dateSequence, raw, initialPrice);
  });

  // 4. 按日期分組事件
  const tradesByDate: Record<string, TradeRecord[]> = {};
  trades.forEach((t) => {
    if (!tradesByDate[t.date]) tradesByDate[t.date] = [];
    tradesByDate[t.date].push(t);
  });

  const cashByDate: Record<string, CashTransaction[]> = {};
  cashTransactions.forEach((c) => {
    if (!cashByDate[c.date]) cashByDate[c.date] = [];
    cashByDate[c.date].push(c);
  });

  const loansByDate: Record<string, LoanRecord[]> = {};
  loanRecords.forEach((l) => {
    const loanDate = l.startDate || l.date || earliestDate;
    if (!loansByDate[loanDate]) loansByDate[loanDate] = [];
    loansByDate[loanDate].push(l);
  });

  // 5. 狀態機變數 (State Machine Variables)
  interface MarginLot {
    buyDate: string;
    shares: number;
    priceInBase: number;
    debtInBase: number;
    interestRate: number;
  }
  const marginLotsBySymbol: Record<string, MarginLot[]> = {};
  const currentShares: Record<string, number> = {};
  let currentCashBalance = 0; // 統一折算為 baseCurrency (TWD)
  let currentLoanBalance = 0; // 統一折算為 baseCurrency (TWD)
  let netInvestedCapital = 0; // 累計外部入金 - 出金 (或純買入成本累計)
  const hasExplicitCashBook = cashTransactions.length > 0;

  const series: PortfolioDailySnapshot[] = [];
  let prevTotalNAV: number | null = null;
  let currentUnitNAV = 100.0;
  let peakUnitNAV = 100.0;
  let currentUnits = 0;

  for (const date of dateSequence) {
    const dailyEvents: string[] = [];
    const fxRate = filledFxMap[date] || 32.0;
    let dailyNetExternalFlow = 0;

    // (A) 處理當日現金帳本出入金 (過濾掉已由股票交易在 (C) 步驟處理的連動流水)
    if (cashByDate[date]) {
      for (const cash of cashByDate[date]) {
        if (cash.relatedTradeId) continue; // 避免與 (C) 步驟的股票買賣/股息重覆計算

        const cashAmountInBase = cash.currency === 'USD' && baseCurrency === 'TWD'
          ? cash.amount * fxRate
          : cash.currency === 'TWD' && baseCurrency === 'USD'
          ? cash.amount / fxRate
          : cash.amount;

        const cat = cash.category || cash.type;
        if (cat === 'DEPOSIT') {
          currentCashBalance += Math.abs(cashAmountInBase);
          netInvestedCapital += Math.abs(cashAmountInBase);
          dailyNetExternalFlow += Math.abs(cashAmountInBase);
          dailyEvents.push(`入金: ${cash.amount.toLocaleString()} ${cash.currency}`);
        } else if (cat === 'WITHDRAWAL') {
          currentCashBalance -= Math.abs(cashAmountInBase);
          netInvestedCapital -= Math.abs(cashAmountInBase);
          dailyNetExternalFlow -= Math.abs(cashAmountInBase);
          dailyEvents.push(`出金: ${cash.amount.toLocaleString()} ${cash.currency}`);
        } else if (cat === 'INTEREST_INCOME' || cat === 'INTEREST') {
          currentCashBalance += Math.abs(cashAmountInBase);
          dailyEvents.push(`利息收入: ${cash.amount.toLocaleString()} ${cash.currency}`);
        } else if (cat === 'FINANCING_FEE' || cat === 'WIRE_FEE' || cat === 'FEE' || cat === 'TAX') {
          currentCashBalance -= Math.abs(cashAmountInBase);
          dailyEvents.push(`費用支出: ${cash.amount.toLocaleString()} ${cash.currency}`);
        } else if (cat === 'FX_TRANSFER_IN') {
          currentCashBalance += Math.abs(cashAmountInBase);
        } else if (cat === 'FX_TRANSFER_OUT') {
          currentCashBalance -= Math.abs(cashAmountInBase);
        }
      }
    }

    // (B) 處理當日借貸異動
    if (loansByDate[date]) {
      for (const loan of loansByDate[date]) {
        const loanAmountInBase = loan.currency === 'USD' && baseCurrency === 'TWD'
          ? loan.principal * fxRate
          : loan.currency === 'TWD' && baseCurrency === 'USD'
          ? loan.principal / fxRate
          : loan.principal;

        if (loan.type === 'BORROW') {
          currentLoanBalance += loanAmountInBase;
          currentCashBalance += loanAmountInBase; // 借款資金入現金帳
          dailyEvents.push(`借款 (${loan.name}): ${loan.principal.toLocaleString()} ${loan.currency}`);
        } else if (loan.type === 'REPAY') {
          currentLoanBalance = Math.max(0, currentLoanBalance - loanAmountInBase);
          currentCashBalance -= loanAmountInBase; // 還款自現金扣除
          dailyEvents.push(`還款 (${loan.name}): ${loan.principal.toLocaleString()} ${loan.currency}`);
        } else if (loan.type === 'INTEREST_PAYMENT') {
          currentCashBalance -= loanAmountInBase;
          dailyEvents.push(`支付利息 (${loan.name}): ${loan.principal.toLocaleString()} ${loan.currency}`);
        }
      }
    }

    // (C) 處理當日證券交易與公司行動
    if (tradesByDate[date]) {
      for (const trade of tradesByDate[date]) {
        const sym = trade.symbol.toUpperCase();
        const tradeAmount = trade.shares * trade.price;
        const totalTradeCost = tradeAmount + (trade.fee || 0) + (trade.tax || 0);

        const totalCostInBase = trade.currency === 'USD' && baseCurrency === 'TWD'
          ? totalTradeCost * fxRate
          : trade.currency === 'TWD' && baseCurrency === 'USD'
          ? totalTradeCost / fxRate
          : totalTradeCost;

        const tradeAmountInBase = trade.currency === 'USD' && baseCurrency === 'TWD'
          ? tradeAmount * fxRate
          : trade.currency === 'TWD' && baseCurrency === 'USD'
          ? tradeAmount / fxRate
          : tradeAmount;

        const feeTaxInBase = trade.currency === 'USD' && baseCurrency === 'TWD'
          ? ((trade.fee || 0) + (trade.tax || 0)) * fxRate
          : trade.currency === 'TWD' && baseCurrency === 'USD'
          ? ((trade.fee || 0) + (trade.tax || 0)) / fxRate
          : ((trade.fee || 0) + (trade.tax || 0));

        const isMarginBuy = trade.type === 'MARGIN_BUY' || (trade.type === 'BUY' && Boolean(trade.isMargin));
        const isMarginSell = trade.type === 'MARGIN_SELL' || (trade.type === 'SELL' && Boolean(trade.isMargin));

        switch (trade.type) {
          case 'BUY':
          case 'MARGIN_BUY':
          case 'CAPITAL_INCREASE': {
            currentShares[sym] = (currentShares[sym] || 0) + trade.shares;
            if (isMarginBuy) {
              const marginRate = trade.marginRate ?? 0.4;
              const marginInterestRate = trade.marginInterestRate ?? 0.065;
              const downPaymentInBase = tradeAmountInBase * marginRate + feeTaxInBase;
              const marginDebtInBase = tradeAmountInBase * (1 - marginRate);
              currentLoanBalance += marginDebtInBase;

              if (!marginLotsBySymbol[sym]) {
                marginLotsBySymbol[sym] = [];
              }
              marginLotsBySymbol[sym].push({
                buyDate: trade.date,
                shares: trade.shares,
                priceInBase: tradeAmountInBase / trade.shares,
                debtInBase: marginDebtInBase,
                interestRate: marginInterestRate,
              });

              if (hasExplicitCashBook) {
                currentCashBalance -= downPaymentInBase;
              } else {
                netInvestedCapital += downPaymentInBase;
                dailyNetExternalFlow += downPaymentInBase;
              }
              dailyEvents.push(`融資買進 ${sym}: ${trade.shares.toLocaleString()}股 (自備款 ${marginRate * 100}%)`);
            } else {
              if (hasExplicitCashBook) {
                currentCashBalance -= totalCostInBase;
              } else {
                // 若無獨立現金帳本，則每次買進直接視同新增投入本金
                netInvestedCapital += totalCostInBase;
                dailyNetExternalFlow += totalCostInBase;
              }
              dailyEvents.push(`買進 ${sym}: ${trade.shares.toLocaleString()}股 @ ${trade.price}`);
            }
            break;
          }
          case 'SELL':
          case 'MARGIN_SELL': {
            currentShares[sym] = Math.max(0, (currentShares[sym] || 0) - trade.shares);
            const netSellProceeds = tradeAmountInBase - feeTaxInBase;
            if (isMarginSell) {
              // 融資賣出：依照 FIFO 沖銷融資批次，精準計算利息並扣除借款
              let remainingSharesToSell = trade.shares;
              let debtToRepay = 0;
              let financingInterest = 0;

              const lots = marginLotsBySymbol[sym] || [];
              while (remainingSharesToSell > 0 && lots.length > 0) {
                const currentLot = lots[0];
                const matchedShares = Math.min(remainingSharesToSell, currentLot.shares);
                const proportion = matchedShares / currentLot.shares;
                const debtPortion = currentLot.debtInBase * proportion;

                const sellTime = new Date(date).getTime();
                const buyTime = new Date(currentLot.buyDate).getTime();
                const holdDays = Math.max(0, Math.round((sellTime - buyTime) / 86400000));

                const interest = debtPortion * currentLot.interestRate * (holdDays / 365);

                debtToRepay += debtPortion;
                financingInterest += interest;

                currentLot.shares -= matchedShares;
                currentLot.debtInBase -= debtPortion;
                remainingSharesToSell -= matchedShares;

                if (currentLot.shares <= 0.00001) {
                  lots.shift();
                }
              }

              if (remainingSharesToSell > 0) {
                const marginRate = trade.marginRate ?? 0.4;
                const unmatchedAmount = (remainingSharesToSell * trade.price);
                const unmatchedAmountInBase = trade.currency === 'USD' && baseCurrency === 'TWD'
                  ? unmatchedAmount * fxRate
                  : trade.currency === 'TWD' && baseCurrency === 'USD'
                  ? unmatchedAmount / fxRate
                  : unmatchedAmount;
                debtToRepay += unmatchedAmountInBase * (1 - marginRate);
              }

              currentLoanBalance = Math.max(0, currentLoanBalance - debtToRepay);
              const netToCash = netSellProceeds - debtToRepay - financingInterest;
              if (hasExplicitCashBook) {
                currentCashBalance += netToCash;
              } else {
                netInvestedCapital -= Math.max(0, netToCash);
                dailyNetExternalFlow -= Math.max(0, netToCash);
              }
              const interestNote = financingInterest > 0 ? ` (利息: ${Math.round(financingInterest).toLocaleString()} ${baseCurrency})` : '';
              dailyEvents.push(`融資賣出 ${sym}: ${trade.shares.toLocaleString()}股${interestNote}`);
            } else {
              if (hasExplicitCashBook) {
                currentCashBalance += netSellProceeds;
              } else {
                // 無獨立現金帳本時，賣出變現視為回收部分本金或結算
                netInvestedCapital -= netSellProceeds;
                dailyNetExternalFlow -= netSellProceeds;
              }
              dailyEvents.push(`賣出 ${sym}: ${trade.shares.toLocaleString()}股 @ ${trade.price}`);
            }
            break;
          }
          case 'DIVIDEND': {
            const divAmount = trade.cashAmount !== undefined && trade.cashAmount !== null
              ? trade.cashAmount
              : trade.shares * trade.price;
            const netDiv = divAmount - (trade.tax || 0) - (trade.fee || 0);
            const netDivInBase = trade.currency === 'USD' && baseCurrency === 'TWD'
              ? netDiv * fxRate
              : trade.currency === 'TWD' && baseCurrency === 'USD'
              ? netDiv / fxRate
              : netDiv;

            currentCashBalance += netDivInBase;
            dailyEvents.push(`配息入帳 ${sym}: ${netDiv.toLocaleString()} ${trade.currency}`);
            break;
          }
          case 'STOCK_DIVIDEND': {
            currentShares[sym] = (currentShares[sym] || 0) + trade.shares;
            dailyEvents.push(`配股增資 ${sym}: +${trade.shares.toLocaleString()}股`);
            break;
          }
          case 'STOCK_SPLIT': {
            if (trade.ratio && trade.ratio > 0) {
              currentShares[sym] = (currentShares[sym] || 0) * trade.ratio;
              dailyEvents.push(`股票分割 ${sym}: 1拆${trade.ratio}`);
            }
            break;
          }
          case 'CAPITAL_REDUCTION': {
            if (trade.ratio && trade.ratio > 0) {
              currentShares[sym] = (currentShares[sym] || 0) * (1 - trade.ratio);
            }
            if (trade.cashAmount && trade.cashAmount > 0) {
              const refundInBase = trade.currency === 'USD' && baseCurrency === 'TWD'
                ? trade.cashAmount * fxRate
                : trade.currency === 'TWD' && baseCurrency === 'USD'
                ? trade.cashAmount / fxRate
                : trade.cashAmount;
              currentCashBalance += refundInBase;
            }
            dailyEvents.push(`減資退還 ${sym}`);
            break;
          }
          default:
            break;
        }
      }
    }

    // (D) 計算當日持股市值 (Stock Market Value)
    let totalStockMarketValue = 0;
    for (const [sym, shares] of Object.entries(currentShares)) {
      if (shares > 0) {
        const price = filledPriceMap[sym]?.[date] || 0;
        // 判斷該標的幣別
        const sampleTrade = trades.find((t) => t.symbol.toUpperCase() === sym);
        const isUSD = sampleTrade?.currency === 'USD' || sampleTrade?.market === 'US';
        const priceInBase = isUSD && baseCurrency === 'TWD'
          ? price * fxRate
          : !isUSD && baseCurrency === 'USD'
          ? price / fxRate
          : price;

        totalStockMarketValue += shares * priceInBase;
      }
    }

    // (D.2) 計算當日應收未入帳股利 (除息日至發放日之間平滑補償)
    let dailyReceivableDividends = 0;
    if (receivableDividends && receivableDividends.length > 0) {
      for (const div of receivableDividends) {
        if (date >= div.exDate && date < div.payDate) {
          const divAmountInBase = div.estimatedNetDividendInTWD && baseCurrency === 'TWD'
            ? div.estimatedNetDividendInTWD
            : div.currency === 'USD' && baseCurrency === 'TWD'
            ? div.estimatedNetDividend * fxRate
            : div.currency === 'TWD' && baseCurrency === 'USD'
            ? div.estimatedNetDividend / fxRate
            : div.estimatedNetDividend;
          dailyReceivableDividends += divAmountInBase;
        }
      }
    }
    dailyReceivableDividends = Math.round(dailyReceivableDividends * 100) / 100;

    // (E) 計算總資產淨值 (NAV = 持股市值 + 現金餘額 + 應收股利 - 借貸負債)
    const totalNAV = Math.round((totalStockMarketValue + currentCashBalance + dailyReceivableDividends - currentLoanBalance) * 100) / 100;
    const effectiveCostBasis = Math.max(0, Math.round(netInvestedCapital * 100) / 100);
    const cumulativeReturnPnL = Math.round((totalNAV - effectiveCostBasis) * 100) / 100;
    const cumulativeReturnPercent = effectiveCostBasis > 0
      ? Math.round((cumulativeReturnPnL / effectiveCostBasis) * 10000) / 100
      : 0;

    // GIPS 單位淨值法 (Unit NAV / TWR) 狀態機
    const preFlowNAV = totalNAV - dailyNetExternalFlow;

    let dailyPnL = 0;
    let dailyReturnPercent = 0;

    if (prevTotalNAV !== null && prevTotalNAV > 0) {
      dailyPnL = Math.round((preFlowNAV - prevTotalNAV) * 100) / 100;
      const dailyReturnRate = (preFlowNAV - prevTotalNAV) / prevTotalNAV;
      dailyReturnPercent = Math.round(dailyReturnRate * 10000) / 100;

      // 更新當日單位淨值
      currentUnitNAV = currentUnitNAV * (1 + dailyReturnRate);
    } else {
      currentUnitNAV = 100.0;
      dailyPnL = 0;
      dailyReturnPercent = 0;
    }

    // 處理當日外部出入金增減份額
    if (dailyNetExternalFlow !== 0 && currentUnitNAV > 0) {
      currentUnits += dailyNetExternalFlow / currentUnitNAV;
    } else if (currentUnits === 0 && totalNAV > 0 && currentUnitNAV > 0) {
      currentUnits = totalNAV / currentUnitNAV;
    }

    if (currentUnits < 0) {
      currentUnits = 0;
    }

    prevTotalNAV = totalNAV;

    const roundedUnitNAV = Math.round(currentUnitNAV * 100) / 100;
    if (roundedUnitNAV > peakUnitNAV) {
      peakUnitNAV = roundedUnitNAV;
    }

    let underwaterDrawdownPercent = 0.0;
    if (peakUnitNAV > 0) {
      const dd = (roundedUnitNAV - peakUnitNAV) / peakUnitNAV;
      underwaterDrawdownPercent = Math.round(dd * 10000) / 100;
      if (underwaterDrawdownPercent >= 0) {
        underwaterDrawdownPercent = 0.0;
      }
    }

    series.push({
      date,
      totalNAV,
      unitNAV: roundedUnitNAV,
      units: Math.round(currentUnits * 1000) / 1000,
      underwaterDrawdownPercent,
      stockMarketValue: Math.round(totalStockMarketValue * 100) / 100,
      cashBalance: Math.round(currentCashBalance * 100) / 100,
      receivableDividends: dailyReceivableDividends,
      loanBalance: Math.round(currentLoanBalance * 100) / 100,
      netCostBasis: effectiveCostBasis,
      cumulativeReturnPnL,
      cumulativeReturnPercent,
      dailyPnL,
      dailyReturnPercent,
      events: dailyEvents,
    });
  }

  return series;
}

/**
 * 依據時間維度篩選序列 (1M, 3M, 6M, 1Y, YTD, ALL)
 */
export function filterNavSeriesByRange(
  series: PortfolioDailySnapshot[],
  range: TimeRangeFilter
): PortfolioDailySnapshot[] {
  if (series.length === 0 || range === 'ALL') {
    return series;
  }

  const latestDateStr = series[series.length - 1].date;
  const latestDate = new Date(latestDateStr);

  let cutoffDate = new Date(latestDate);

  switch (range) {
    case '1M':
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      break;
    case '3M':
      cutoffDate.setMonth(cutoffDate.getMonth() - 3);
      break;
    case '6M':
      cutoffDate.setMonth(cutoffDate.getMonth() - 6);
      break;
    case '1Y':
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
      break;
    case 'YTD':
      cutoffDate = new Date(latestDate.getFullYear(), 0, 1);
      break;
  }

  const cutoffStr = cutoffDate.toISOString().split('T')[0];
  const filtered = series.filter((s) => s.date >= cutoffStr);
  return filtered.length > 0 ? filtered : series;
}

import { calculateTimeRangeXirr } from './xirrCalculator';

/**
 * 計算指定序列的關鍵績效指標 (Current NAV, ATH, MDD, Return %, CAGR, XIRR)
 */
export function calculatePerformanceMetrics(
  series: PortfolioDailySnapshot[],
  cashTransactions: CashTransaction[] = [],
  baseCurrency: Currency = 'TWD'
): PortfolioPerformanceMetrics {
  if (series.length === 0) {
    return {
      currentNAV: 0,
      netCostBasis: 0,
      totalProfitPnL: 0,
      totalReturnPercent: 0,
      maxDrawdownPercent: 0,
      allTimeHighNAV: 0,
    };
  }

  const latest = series[series.length - 1];
  let allTimeHighNAV = -Infinity;
  let allTimeHighDate = series[0].date;
  let maxDrawdownPercent = 0;

  for (const pt of series) {
    if (pt.totalNAV > allTimeHighNAV) {
      allTimeHighNAV = pt.totalNAV;
      allTimeHighDate = pt.date;
    }

    if (allTimeHighNAV > 0) {
      const drawdown = ((allTimeHighNAV - pt.totalNAV) / allTimeHighNAV) * 100;
      if (drawdown > maxDrawdownPercent) {
        maxDrawdownPercent = drawdown;
      }
    }
  }

  const daysDiff = (new Date(latest.date).getTime() - new Date(series[0].date).getTime()) / (1000 * 3600 * 24);
  let annualizedReturnPercent: number | undefined = undefined;

  if (daysDiff >= 365 && latest.netCostBasis > 0 && latest.totalNAV > 0) {
    const years = daysDiff / 365.25;
    const totalMultiplier = latest.totalNAV / latest.netCostBasis;
    annualizedReturnPercent = Math.round((Math.pow(totalMultiplier, 1 / years) - 1) * 10000) / 100;
  }

  // 區間 XIRR 求解
  const xirrResult = calculateTimeRangeXirr(series, cashTransactions, baseCurrency);

  return {
    currentNAV: latest.totalNAV,
    netCostBasis: latest.netCostBasis,
    totalProfitPnL: latest.cumulativeReturnPnL,
    totalReturnPercent: latest.cumulativeReturnPercent,
    maxDrawdownPercent: Math.round(maxDrawdownPercent * 100) / 100,
    allTimeHighNAV: Math.max(0, allTimeHighNAV),
    allTimeHighDate,
    annualizedReturnPercent,
    xirrPercent: xirrResult.ratePercent,
    isXirrAnnualized: xirrResult.isAnnualized,
    xirrDurationDays: xirrResult.durationDays,
  };
}
