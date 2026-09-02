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
  const currentShares: Record<string, number> = {};
  let currentCashBalance = 0; // 統一折算為 baseCurrency (TWD)
  let currentLoanBalance = 0; // 統一折算為 baseCurrency (TWD)
  let netInvestedCapital = 0; // 累計外部入金 - 出金 (或純買入成本累計)
  const hasExplicitCashBook = cashTransactions.length > 0;

  const series: PortfolioDailySnapshot[] = [];
  let prevNAV: number | null = null;

  for (const date of dateSequence) {
    const dailyEvents: string[] = [];
    const fxRate = filledFxMap[date] || 32.0;

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
          dailyEvents.push(`入金: ${cash.amount.toLocaleString()} ${cash.currency}`);
        } else if (cat === 'WITHDRAWAL') {
          currentCashBalance -= Math.abs(cashAmountInBase);
          netInvestedCapital -= Math.abs(cashAmountInBase);
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
              const downPaymentInBase = tradeAmountInBase * marginRate + feeTaxInBase;
              const marginDebtInBase = tradeAmountInBase * (1 - marginRate);
              currentLoanBalance += marginDebtInBase;
              if (hasExplicitCashBook) {
                currentCashBalance -= downPaymentInBase;
              } else {
                netInvestedCapital += downPaymentInBase;
              }
              dailyEvents.push(`融資買進 ${sym}: ${trade.shares.toLocaleString()}股 (自備款 ${marginRate * 100}%)`);
            } else {
              if (hasExplicitCashBook) {
                currentCashBalance -= totalCostInBase;
              } else {
                // 若無獨立現金帳本，則每次買進直接視同新增投入本金
                netInvestedCapital += totalCostInBase;
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
              // 融資賣出：扣除融資借款後淨額入現金帳
              const marginRate = trade.marginRate ?? 0.4;
              const debtToRepay = tradeAmountInBase * (1 - marginRate);
              currentLoanBalance = Math.max(0, currentLoanBalance - debtToRepay);
              const netToCash = netSellProceeds - debtToRepay;
              if (hasExplicitCashBook) {
                currentCashBalance += netToCash;
              } else {
                netInvestedCapital -= Math.max(0, netToCash);
              }
              dailyEvents.push(`融資賣出 ${sym}: ${trade.shares.toLocaleString()}股`);
            } else {
              if (hasExplicitCashBook) {
                currentCashBalance += netSellProceeds;
              } else {
                // 無獨立現金帳本時，賣出變現視為回收部分本金或結算
                netInvestedCapital -= netSellProceeds;
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

    // (E) 計算總資產淨值 (NAV = 持股市值 + 現金餘額 - 借貸負債)
    const totalNAV = Math.round((totalStockMarketValue + currentCashBalance - currentLoanBalance) * 100) / 100;
    const effectiveCostBasis = Math.max(0, Math.round(netInvestedCapital * 100) / 100);
    const cumulativeReturnPnL = Math.round((totalNAV - effectiveCostBasis) * 100) / 100;
    const cumulativeReturnPercent = effectiveCostBasis > 0
      ? Math.round((cumulativeReturnPnL / effectiveCostBasis) * 10000) / 100
      : 0;

    let dailyPnL = 0;
    let dailyReturnPercent = 0;
    if (prevNAV !== null && prevNAV > 0) {
      dailyPnL = Math.round((totalNAV - prevNAV) * 100) / 100;
      dailyReturnPercent = Math.round((dailyPnL / prevNAV) * 10000) / 100;
    }
    prevNAV = totalNAV;

    series.push({
      date,
      totalNAV,
      stockMarketValue: Math.round(totalStockMarketValue * 100) / 100,
      cashBalance: Math.round(currentCashBalance * 100) / 100,
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
