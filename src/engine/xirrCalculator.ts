import { Currency } from '../types/stock';

export interface CashFlowEvent {
  date: string; // YYYY-MM-DD
  amount: number; // 負值為投入/買進/存入，正值為贖回/賣出/配息/期末淨值
  description?: string;
  category?: 'DEPOSIT' | 'WITHDRAWAL' | 'BUY' | 'SELL' | 'DIVIDEND' | 'TERMINAL_VALUE' | 'INTEREST' | 'FEE';
  currency?: Currency;
}

export interface XirrResult {
  rate: number; // 年化報酬率 (如 0.1582 代表 15.82%)
  ratePercent: number; // 年化報酬率百分比 (如 15.82)
  isAnnualized: boolean; // 是否為年化 (持有 >= 30 天為 true，< 30 天為 false 標記非年化)
  durationDays: number; // 總歷時天數
  iterations: number; // 數值迭代求解次數
  method: 'NEWTON_RAPHSON' | 'BISECTION' | 'TRIVIAL' | 'SHORT_PERIOD';
  totalInflow: number; // 累計流出投入本金 (正值化絕對值)
  totalOutflow: number; // 累計流入與期末市值
  simpleReturnPercent: number; // 累計絕對報酬率 %
  cashFlows?: CashFlowEvent[]; // 現金流事件明細 (供 UI 透視診斷)
}

export interface SecurityXirrResult extends XirrResult {
  symbol: string;
  currency: Currency;
  cashFlows: CashFlowEvent[];
}

/**
 * 計算兩個日期之間的天數差
 */
function getDaysDifference(d1: string, d2: string): number {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  return Math.max(0, (t2 - t1) / (1000 * 60 * 60 * 24));
}

/**
 * 計算淨現值 NPV(r) = Σ [ C_i / (1 + r)^((d_i - d_0) / 365) ]
 */
export function calculateNPV(cashFlows: CashFlowEvent[], r: number): number {
  if (cashFlows.length === 0) return 0;
  const d0 = cashFlows[0].date;

  let npv = 0;
  for (const cf of cashFlows) {
    const dt = getDaysDifference(d0, cf.date) / 365.0;
    const factor = Math.pow(1 + r, dt);
    if (isNaN(factor) || !isFinite(factor) || factor === 0) {
      return NaN;
    }
    npv += cf.amount / factor;
  }
  return npv;
}

/**
 * 計算 NPV 對折現率 r 的一階導數 NPV'(r) = Σ [ - ( (d_i - d_0) / 365 ) * C_i / (1 + r)^((d_i - d_0) / 365 + 1) ]
 */
export function calculateNPVDerivative(cashFlows: CashFlowEvent[], r: number): number {
  if (cashFlows.length === 0) return 0;
  const d0 = cashFlows[0].date;

  let derivative = 0;
  for (const cf of cashFlows) {
    const dt = getDaysDifference(d0, cf.date) / 365.0;
    const factor = Math.pow(1 + r, dt + 1);
    if (isNaN(factor) || !isFinite(factor) || factor === 0) {
      return NaN;
    }
    derivative += (-dt * cf.amount) / factor;
  }
  return derivative;
}

/**
 * XIRR 核心數值求解器：結合 Newton-Raphson 快速收斂與 Bisection 二分法降級防禦
 */
export function calculateXIRR(rawCashFlows: CashFlowEvent[]): XirrResult {
  // 1. 過濾無效金流並依日期升冪排序
  const rawFiltered = rawCashFlows
    .filter((f) => f && f.date && !isNaN(f.amount))
    .sort((a, b) => a.date.localeCompare(b.date));

  let totalInflow = 0; // 總投入本金 (amount < 0 的絕對值總和)
  let totalOutflow = 0; // 總產出與期末 (amount > 0 的總和)

  for (const f of rawFiltered) {
    if (f.amount < 0) {
      totalInflow += Math.abs(f.amount);
    } else if (f.amount > 0) {
      totalOutflow += f.amount;
    }
  }

  // 2. 邊界檢查：無金流或資料點不足
  if (rawFiltered.length < 2 || totalInflow === 0) {
    return {
      rate: 0,
      ratePercent: 0,
      isAnnualized: false,
      durationDays: 0,
      iterations: 0,
      method: 'TRIVIAL',
      totalInflow,
      totalOutflow,
      simpleReturnPercent: 0,
      cashFlows: rawFiltered,
    };
  }

  const durationDays = Math.round(getDaysDifference(rawFiltered[0].date, rawFiltered[rawFiltered.length - 1].date));
  const simpleReturnPercent = Math.round(((totalOutflow - totalInflow) / totalInflow) * 10000) / 100;

  // 全額虧損或無正向產出 (期末資產歸零)
  if (totalOutflow === 0) {
    return {
      rate: -1.0,
      ratePercent: -100,
      isAnnualized: false,
      durationDays,
      iterations: 0,
      method: 'TRIVIAL',
      totalInflow,
      totalOutflow,
      simpleReturnPercent: -100,
      cashFlows: rawFiltered,
    };
  }

  const flows = rawFiltered.filter((f) => f.amount !== 0);

  // 3. 30 天智能自適應平滑防護 (未滿 30 天不年化放大)
  if (durationDays < 30) {
    return {
      rate: simpleReturnPercent / 100,
      ratePercent: simpleReturnPercent,
      isAnnualized: false,
      durationDays,
      iterations: 0,
      method: 'SHORT_PERIOD',
      totalInflow,
      totalOutflow,
      simpleReturnPercent,
      cashFlows: flows,
    };
  }

  // 4. Newton-Raphson 數值迭代求解
  const MAX_NEWTON_ITER = 50;
  const TOLERANCE = 1e-7;

  // 初始猜測值：以年化累積報酬率作為先驗猜測
  const years = Math.max(0.1, durationDays / 365.0);
  let guess = totalInflow > 0 && totalOutflow > 0
    ? Math.pow(totalOutflow / totalInflow, 1 / years) - 1
    : 0.1;
  guess = Math.max(-0.95, Math.min(2.0, guess));

  let r = guess;
  let newtonConverged = false;
  let iterCount = 0;

  for (let i = 0; i < MAX_NEWTON_ITER; i++) {
    iterCount = i + 1;
    const npv = calculateNPV(flows, r);
    const deriv = calculateNPVDerivative(flows, r);

    if (isNaN(npv) || isNaN(deriv) || Math.abs(deriv) < 1e-12) {
      break; // 遇到導數近 0 或 NaN，跳出並切換至二分法
    }

    const nextR = r - npv / deriv;

    if (Math.abs(nextR - r) < TOLERANCE || Math.abs(npv) < TOLERANCE) {
      r = nextR;
      newtonConverged = true;
      break;
    }

    r = nextR;
    // 若 r 跌入極端危險區 (< -0.999)，跳出降級
    if (r <= -0.999 || r > 100.0) {
      break;
    }
  }

  if (newtonConverged && r > -0.999) {
    const ratePercent = Math.round(r * 10000) / 100;
    return {
      rate: r,
      ratePercent,
      isAnnualized: true,
      durationDays,
      iterations: iterCount,
      method: 'NEWTON_RAPHSON',
      totalInflow,
      totalOutflow,
      simpleReturnPercent,
      cashFlows: flows,
    };
  }

  // 5. Bisection 二分逼近法降級 (Fallback)
  let low = -0.9999;
  let high = 10.0;
  const MAX_BISECT_ITER = 100;
  let bisectIter = 0;

  // 先擴大 high 邊界若高報酬
  while (calculateNPV(flows, high) > 0 && high < 1000.0) {
    high *= 2;
  }

  for (let i = 0; i < MAX_BISECT_ITER; i++) {
    bisectIter = i + 1;
    const mid = (low + high) / 2;
    const npvMid = calculateNPV(flows, mid);

    if (Math.abs(npvMid) < 1e-6 || (high - low) / 2 < 1e-6) {
      r = mid;
      break;
    }

    const npvLow = calculateNPV(flows, low);
    if (npvLow * npvMid < 0) {
      high = mid;
    } else {
      low = mid;
    }
    r = mid;
  }

  const ratePercent = Math.round(r * 10000) / 100;
  return {
    rate: r,
    ratePercent,
    isAnnualized: true,
    durationDays,
    iterations: iterCount + bisectIter,
    method: 'BISECTION',
    totalInflow,
    totalOutflow,
    simpleReturnPercent,
    cashFlows: flows,
  };
}

import { TradeRecord, CashTransaction, PortfolioDailySnapshot } from '../types/stock';

export interface CalculateSecurityXirrOptions {
  symbol: string;
  trades: TradeRecord[];
  currentMarketValue: number;
  today?: string;
  currency?: Currency;
}

/**
 * 計算單一持股標的之含息 XIRR (Security-Level XIRR)
 */
export function calculateSecurityXirr(options: CalculateSecurityXirrOptions): SecurityXirrResult {
  const { symbol, trades, currentMarketValue, today, currency = 'TWD' } = options;
  const symUpper = symbol.toUpperCase();
  const symbolTrades = trades
    .filter((t) => t.symbol.toUpperCase() === symUpper)
    .sort((a, b) => a.date.localeCompare(b.date));

  const cashFlows: CashFlowEvent[] = [];

  for (const trade of symbolTrades) {
    const tradeAmount = trade.shares * trade.price;
    const fee = trade.fee || 0;
    const tax = trade.tax || 0;

    switch (trade.type) {
      case 'BUY':
      case 'CAPITAL_INCREASE': {
        const cost = tradeAmount + fee + tax;
        cashFlows.push({
          date: trade.date,
          amount: -cost,
          description: `買進 ${trade.shares.toLocaleString()}股 @ ${trade.price}`,
          category: 'BUY',
          currency: trade.currency || currency,
        });
        break;
      }
      case 'SELL': {
        const proceeds = tradeAmount - fee - tax;
        cashFlows.push({
          date: trade.date,
          amount: proceeds,
          description: `賣出 ${trade.shares.toLocaleString()}股 @ ${trade.price}`,
          category: 'SELL',
          currency: trade.currency || currency,
        });
        break;
      }
      case 'DIVIDEND': {
        const divAmount = trade.cashAmount !== undefined && trade.cashAmount !== null
          ? trade.cashAmount
          : tradeAmount;
        const netDiv = divAmount - fee - tax;
        if (netDiv > 0) {
          cashFlows.push({
            date: trade.date,
            amount: netDiv,
            description: `現金股利入帳 (每股 ${trade.price} 元)`,
            category: 'DIVIDEND',
            currency: trade.currency || currency,
          });
        }
        break;
      }
      case 'CAPITAL_REDUCTION': {
        if (trade.cashAmount && trade.cashAmount > 0) {
          cashFlows.push({
            date: trade.date,
            amount: trade.cashAmount,
            description: `現金減資退還款項`,
            category: 'DIVIDEND',
            currency: trade.currency || currency,
          });
        }
        break;
      }
      default:
        break;
    }
  }

  // 期末在庫持股市值
  if (currentMarketValue > 0) {
    const terminalDate = today || new Date().toISOString().split('T')[0];
    cashFlows.push({
      date: terminalDate,
      amount: currentMarketValue,
      description: `當前在庫持股市值`,
      category: 'TERMINAL_VALUE',
      currency,
    });
  }

  const baseResult = calculateXIRR(cashFlows);
  return {
    ...baseResult,
    symbol,
    currency,
    cashFlows,
  };
}

export interface CalculatePortfolioXirrOptions {
  cashTransactions?: CashTransaction[];
  trades?: TradeRecord[];
  terminalNAV: number;
  today?: string;
  baseCurrency?: Currency;
  fxMap?: Record<string, number>;
}

/**
 * 計算整戶總體 XIRR (Portfolio-Level XIRR)
 */
export function calculatePortfolioXirr(options: CalculatePortfolioXirrOptions): XirrResult {
  const {
    cashTransactions = [],
    trades = [],
    terminalNAV,
    today = new Date().toISOString().split('T')[0],
    baseCurrency = 'TWD',
    fxMap = {},
  } = options;

  const cashFlows: CashFlowEvent[] = [];
  
  // 智能探針：檢查是否存在非交易連動之顯式手動出入金流水
  const manualExternalFlows = cashTransactions.filter(
    (c) => !c.relatedTradeId && (c.category === 'DEPOSIT' || c.category === 'WITHDRAWAL' || c.type === 'DEPOSIT' || c.type === 'WITHDRAWAL')
  );
  const hasExplicitCashBook = manualExternalFlows.length > 0;

  if (hasExplicitCashBook) {
    for (const c of manualExternalFlows) {
      const fxRate = (c.currency === 'USD' && baseCurrency === 'TWD') || (c.currency === 'TWD' && baseCurrency === 'USD')
        ? (fxMap[c.date] || 32.0)
        : 1.0;

      const amtInBase = c.currency === 'USD' && baseCurrency === 'TWD'
        ? c.amount * fxRate
        : c.currency === 'TWD' && baseCurrency === 'USD'
        ? c.amount / fxRate
        : c.amount;

      const cat = c.category || c.type;
      if (cat === 'DEPOSIT') {
        cashFlows.push({
          date: c.date,
          amount: -Math.abs(amtInBase),
          description: `銀行入金: ${c.amount.toLocaleString()} ${c.currency}`,
          category: 'DEPOSIT',
          currency: baseCurrency,
        });
      } else if (cat === 'WITHDRAWAL') {
        cashFlows.push({
          date: c.date,
          amount: Math.abs(amtInBase),
          description: `銀行出金: ${c.amount.toLocaleString()} ${c.currency}`,
          category: 'WITHDRAWAL',
          currency: baseCurrency,
        });
      }
    }
  } else {
    // Mode B 自適應降級：無顯式手動出入金時，以股票買賣與股息歷史推算實質投入產出金流
    for (const t of trades) {
      const fxRate = (t.currency === 'USD' && baseCurrency === 'TWD') || (t.currency === 'TWD' && baseCurrency === 'USD')
        ? (fxMap[t.date] || 32.0)
        : 1.0;

      const tradeAmount = t.shares * t.price;
      const totalCost = (tradeAmount + (t.fee || 0) + (t.tax || 0)) * (t.currency === 'USD' && baseCurrency === 'TWD' ? fxRate : (t.currency === 'TWD' && baseCurrency === 'USD' ? 1 / fxRate : 1));
      const netProceeds = (tradeAmount - (t.fee || 0) - (t.tax || 0)) * (t.currency === 'USD' && baseCurrency === 'TWD' ? fxRate : (t.currency === 'TWD' && baseCurrency === 'USD' ? 1 / fxRate : 1));

      if (t.type === 'BUY' || t.type === 'MARGIN_BUY' || t.type === 'CAPITAL_INCREASE') {
        cashFlows.push({
          date: t.date,
          amount: -totalCost,
          description: `買進 ${t.symbol}`,
          category: 'BUY',
          currency: baseCurrency,
        });
      } else if (t.type === 'SELL' || t.type === 'MARGIN_SELL') {
        cashFlows.push({
          date: t.date,
          amount: netProceeds,
          description: `賣出 ${t.symbol}`,
          category: 'SELL',
          currency: baseCurrency,
        });
      } else if (t.type === 'DIVIDEND') {
        const divAmt = t.cashAmount !== undefined && t.cashAmount !== null ? t.cashAmount : tradeAmount;
        const netDiv = (divAmt - (t.tax || 0) - (t.fee || 0)) * (t.currency === 'USD' && baseCurrency === 'TWD' ? fxRate : 1);
        if (netDiv > 0) {
          cashFlows.push({
            date: t.date,
            amount: netDiv,
            description: `現金股息 ${t.symbol}`,
            category: 'DIVIDEND',
            currency: baseCurrency,
          });
        }
      }
    }
  }

  // 期末總資產淨值 (Terminal NAV)
  if (terminalNAV > 0) {
    cashFlows.push({
      date: today,
      amount: terminalNAV,
      description: '當前整戶總資產淨值 (Terminal NAV)',
      category: 'TERMINAL_VALUE',
      currency: baseCurrency,
    });
  }

  return calculateXIRR(cashFlows);
}

/**
 * 計算特定時間區間的 XIRR (Time-Range-Level XIRR: 1M, 3M, 1Y, etc.)
 */
export function calculateTimeRangeXirr(
  filteredSeries: PortfolioDailySnapshot[],
  cashTransactions: CashTransaction[] = [],
  baseCurrency: Currency = 'TWD'
): XirrResult {
  if (filteredSeries.length < 2) {
    return {
      rate: 0,
      ratePercent: 0,
      isAnnualized: false,
      durationDays: 0,
      iterations: 0,
      method: 'TRIVIAL',
      totalInflow: 0,
      totalOutflow: 0,
      simpleReturnPercent: 0,
    };
  }

  const startDate = filteredSeries[0].date;
  const endDate = filteredSeries[filteredSeries.length - 1].date;
  const initialNAV = filteredSeries[0].totalNAV;
  const terminalNAV = filteredSeries[filteredSeries.length - 1].totalNAV;

  const cashFlows: CashFlowEvent[] = [
    {
      date: startDate,
      amount: -initialNAV,
      description: `期初資產淨值 (${startDate})`,
      category: 'TERMINAL_VALUE',
      currency: baseCurrency,
    },
  ];

  // 區間內外部出入金
  const rangeCash = cashTransactions.filter((c) => c.date > startDate && c.date < endDate && !c.relatedTradeId);
  for (const c of rangeCash) {
    const cat = c.category || c.type;
    if (cat === 'DEPOSIT') {
      cashFlows.push({
        date: c.date,
        amount: -Math.abs(c.amount),
        description: `區間入金`,
        category: 'DEPOSIT',
        currency: c.currency,
      });
    } else if (cat === 'WITHDRAWAL') {
      cashFlows.push({
        date: c.date,
        amount: Math.abs(c.amount),
        description: `區間出金`,
        category: 'WITHDRAWAL',
        currency: c.currency,
      });
    }
  }

  cashFlows.push({
    date: endDate,
    amount: terminalNAV,
    description: `期末資產淨值 (${endDate})`,
    category: 'TERMINAL_VALUE',
    currency: baseCurrency,
  });

  return calculateXIRR(cashFlows);
}
