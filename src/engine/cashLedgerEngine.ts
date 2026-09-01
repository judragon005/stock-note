import {
  BrokerAccount,
  TradeRecord,
  CashTransaction,
  CashFlowCategory,
  CashEntryType,
  LoanRecord,
  PriceQuote,
  Currency,
} from '../types/stock';
import { bankersRound } from '../utils/formatters';
import { isBusinessDay } from './holidayCalendar';
import { estimatePaymentDate } from './receivableDividendEngine';

export interface AccountBalanceSummary {
  accountId: string;
  accountName: string;
  currency: Currency;
  balance: number; // 實質可用現金 (等同 settledCash)
  settledCash: number; // 實質已交割可用現金 (可隨時出金提領)
  pendingReceivables: number; // 在途應收款總額 (所有未到期/待交割之正向流入)
  pendingPayables: number; // 在途應付款總額 (所有未到期/待交割之負向流出，以正數絕對值呈現)
  netPendingAmount: number; // 在途淨額 (pendingReceivables - pendingPayables)
  pendingSettlementAmount: number; // 舊相容別名 (等同 netPendingAmount)
  projectedBalance: number; // 預計交割後總餘額 (settledCash + netPendingAmount)
  totalDeposits: number;
  totalWithdrawals: number;
  totalStockBuys: number;
  totalStockSells: number;
  totalDividends: number;
  totalInterestIncome: number;
  totalFinancingFees: number;
  totalWireFees: number;
}

export interface CashLedgerSummary {
  byAccount: Record<string, AccountBalanceSummary>;
  totalTWD: number;
  totalUSD: number;
  totalCashInTWD: number;
  totalSettledCashInTWD: number;
  totalPendingReceivablesInTWD: number;
  totalPendingPayablesInTWD: number;
  totalNetPendingInTWD: number;
  totalProjectedCashInTWD: number;
}

export interface NetCapitalSummary {
  totalDepositsInTWD: number;
  totalWithdrawalsInTWD: number;
  totalNetCapitalInTWD: number;
}

export type PledgeStatus = 'SAFE' | 'WARNING' | 'DANGER';

export interface PledgeMaintenanceRatioResult {
  loanId: string;
  collateralMarketValue: number;
  principal: number;
  maintenanceRatio: number; // e.g. 160%
  status: PledgeStatus;
  isMarginCall: boolean;
}

export interface LeverageMetrics {
  totalDebtInTWD: number;
  totalAssetInTWD: number;
  netAssetValueInTWD: number;
  debtRatioPercent: number; // LTV %
  estimatedAnnualInterestInTWD: number;
}

/**
 * 建立空的帳戶資金結算摘要物件 (Factory Helper)
 */
export function createEmptyAccountSummary(
  accountId: string,
  accountName: string,
  currency: Currency
): AccountBalanceSummary {
  return {
    accountId,
    accountName,
    currency,
    balance: 0,
    settledCash: 0,
    pendingReceivables: 0,
    pendingPayables: 0,
    netPendingAmount: 0,
    pendingSettlementAmount: 0,
    projectedBalance: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalStockBuys: 0,
    totalStockSells: 0,
    totalDividends: 0,
    totalInterestIncome: 0,
    totalFinancingFees: 0,
    totalWireFees: 0,
  };
}

/**
 * 判定交易是否屬於未來事件或在途待交割款項 (Single Source of Truth)
 */
export function isPendingOrFutureTransaction(
  tx: CashTransaction,
  todayStr: string
): boolean {
  const isFutureEvent = tx.date > todayStr;
  const isPendingSettlement =
    tx.settlementStatus === 'PENDING' ||
    (Boolean(tx.settlementDate) && tx.settlementDate! > todayStr);
  return isFutureEvent || isPendingSettlement;
}

/**
 * 依各帳戶計算現金餘額與各類金流累計 (僅計入已到期/已交割款項，完整支援三層可用性)
 */
export function calculateAccountBalances(
  accounts: BrokerAccount[],
  transactions: CashTransaction[],
  fxRate = 32.0,
  asOfDate?: string
): CashLedgerSummary {
  const todayStr = asOfDate || new Date().toISOString().split('T')[0];
  const byAccount: Record<string, AccountBalanceSummary> = {};

  // 1. 初始化所有帳戶
  for (const acc of accounts) {
    byAccount[acc.id] = createEmptyAccountSummary(
      acc.id,
      acc.name,
      acc.market === 'US' ? 'USD' : 'TWD'
    );
  }

  // 2. 遍歷累加每筆現金流水
  for (const tx of transactions) {
    if (!byAccount[tx.accountId]) {
      byAccount[tx.accountId] = createEmptyAccountSummary(
        tx.accountId,
        '未知帳戶',
        tx.currency
      );
    }

    const acc = byAccount[tx.accountId];
    const cat = tx.category || tx.type;

    // 判定是否為未發生或待交割在途款項 (使用共用判定函式)
    if (isPendingOrFutureTransaction(tx, todayStr)) {
      // 尚未發生或在途待交割：依正負金額分別歸入在途應收與在途應付
      if (tx.amount > 0) {
        acc.pendingReceivables += tx.amount;
      } else if (tx.amount < 0) {
        acc.pendingPayables += Math.abs(tx.amount);
      }
      acc.pendingSettlementAmount += tx.amount;
    } else {
      // 已實質生效/交割：計入可用現金餘額與各項統計
      acc.balance += tx.amount;

      switch (cat) {
        case 'DEPOSIT':
        case 'LOAN_DISBURSEMENT':
        case 'CAPITAL_RETURN':
          acc.totalDeposits += Math.abs(tx.amount);
          break;
        case 'WITHDRAWAL':
        case 'LOAN_REPAYMENT':
          acc.totalWithdrawals += Math.abs(tx.amount);
          break;
        case 'STOCK_BUY':
          acc.totalStockBuys += Math.abs(tx.amount);
          break;
        case 'STOCK_SELL':
          acc.totalStockSells += Math.abs(tx.amount);
          break;
        case 'DIVIDEND_PAYOUT':
        case 'DIVIDEND':
          acc.totalDividends += Math.abs(tx.amount);
          break;
        case 'INTEREST_INCOME':
        case 'INTEREST':
          acc.totalInterestIncome += Math.abs(tx.amount);
          break;
        case 'FINANCING_FEE':
          acc.totalFinancingFees += Math.abs(tx.amount);
          break;
        case 'WIRE_FEE':
        case 'FEE':
        case 'TAX':
          acc.totalWireFees += Math.abs(tx.amount);
          break;
        default:
          break;
      }
    }
  }

  // 3. 匯總 TWD / USD 與折算總額，計算三層可用性 (依市場幣別精確清洗浮點數)
  let totalTWD = 0;
  let totalUSD = 0;
  let totalPendingReceivablesInTWD = 0;
  let totalPendingPayablesInTWD = 0;

  for (const acc of Object.values(byAccount)) {
    if (acc.currency === 'USD') {
      acc.balance = bankersRound(acc.balance, 2);
      acc.settledCash = acc.balance;
      acc.pendingReceivables = bankersRound(acc.pendingReceivables, 2);
      acc.pendingPayables = bankersRound(acc.pendingPayables, 2);
      acc.netPendingAmount = bankersRound(acc.pendingReceivables - acc.pendingPayables, 2);
      acc.pendingSettlementAmount = acc.netPendingAmount;
      acc.projectedBalance = bankersRound(acc.balance + acc.netPendingAmount, 2);
      acc.totalDeposits = bankersRound(acc.totalDeposits, 2);
      acc.totalWithdrawals = bankersRound(acc.totalWithdrawals, 2);
      acc.totalStockBuys = bankersRound(acc.totalStockBuys, 2);
      acc.totalStockSells = bankersRound(acc.totalStockSells, 2);
      acc.totalDividends = bankersRound(acc.totalDividends, 2);
      acc.totalInterestIncome = bankersRound(acc.totalInterestIncome, 2);
      acc.totalFinancingFees = bankersRound(acc.totalFinancingFees, 2);
      acc.totalWireFees = bankersRound(acc.totalWireFees, 2);
      
      totalUSD += acc.balance;
      totalPendingReceivablesInTWD += acc.pendingReceivables * fxRate;
      totalPendingPayablesInTWD += acc.pendingPayables * fxRate;
    } else {
      acc.balance = Math.round(acc.balance);
      acc.settledCash = acc.balance;
      acc.pendingReceivables = Math.round(acc.pendingReceivables);
      acc.pendingPayables = Math.round(acc.pendingPayables);
      acc.netPendingAmount = Math.round(acc.pendingReceivables - acc.pendingPayables);
      acc.pendingSettlementAmount = acc.netPendingAmount;
      acc.projectedBalance = Math.round(acc.balance + acc.netPendingAmount);
      acc.totalDeposits = Math.round(acc.totalDeposits);
      acc.totalWithdrawals = Math.round(acc.totalWithdrawals);
      acc.totalStockBuys = Math.round(acc.totalStockBuys);
      acc.totalStockSells = Math.round(acc.totalStockSells);
      acc.totalDividends = Math.round(acc.totalDividends);
      acc.totalInterestIncome = Math.round(acc.totalInterestIncome);
      acc.totalFinancingFees = Math.round(acc.totalFinancingFees);
      acc.totalWireFees = Math.round(acc.totalWireFees);

      totalTWD += acc.balance;
      totalPendingReceivablesInTWD += acc.pendingReceivables;
      totalPendingPayablesInTWD += acc.pendingPayables;
    }
  }

  const totalSettledCashInTWD = Math.round(totalTWD + totalUSD * fxRate);
  const totalNetPendingInTWD = Math.round(totalPendingReceivablesInTWD - totalPendingPayablesInTWD);
  const totalProjectedCashInTWD = totalSettledCashInTWD + totalNetPendingInTWD;

  return {
    byAccount,
    totalTWD,
    totalUSD,
    totalCashInTWD: totalSettledCashInTWD,
    totalSettledCashInTWD,
    totalPendingReceivablesInTWD: Math.round(totalPendingReceivablesInTWD),
    totalPendingPayablesInTWD: Math.round(totalPendingPayablesInTWD),
    totalNetPendingInTWD,
    totalProjectedCashInTWD,
  };
}

/**
 * 計算特定帳戶之「即時交易可用購買力 (Trading Buying Power)」
 * 
 * 券商級風控原則：
 * Buying Power = 實質可用現金 (Settled Cash) + 股票賣出在途款 (Pending Stock Sells) - 股票買進在途款 (Pending Stock Buys)
 * 
 * 防禦性守則：
 * - 尚未到帳之現金股利 (DIVIDEND_PAYOUT)、減資退款 (CAPITAL_RETURN) 與電匯在途入金不提前計入購買力，避免超額下單風險。
 */
export function calculateTradingBuyingPower(
  accountSummary: AccountBalanceSummary,
  transactions: CashTransaction[],
  asOfDate?: string
): number {
  const todayStr = asOfDate || new Date().toISOString().split('T')[0];
  let buyingPower = accountSummary.settledCash;

  for (const tx of transactions) {
    if (tx.accountId !== accountSummary.accountId) continue;

    if (isPendingOrFutureTransaction(tx, todayStr)) {
      const cat = tx.category || tx.type;
      // 僅股票賣出與股票買進在途款影響即時下單購買力
      if (cat === 'STOCK_SELL' || tx.type === 'STOCK_SELL') {
        buyingPower += Math.abs(tx.amount);
      } else if (cat === 'STOCK_BUY' || tx.type === 'STOCK_BUY') {
        buyingPower -= Math.abs(tx.amount);
      }
    }
  }

  if (accountSummary.currency === 'USD') {
    return bankersRound(buyingPower, 2);
  }
  return Math.round(buyingPower);
}

/**
 * 計算全市場折算台幣之總交易購買力
 */
export function calculateTotalBuyingPower(
  ledgerSummary: CashLedgerSummary,
  transactions: CashTransaction[],
  fxRate = 32.0,
  asOfDate?: string
): number {
  let totalBpInTWD = 0;

  for (const acc of Object.values(ledgerSummary.byAccount)) {
    const bp = calculateTradingBuyingPower(acc, transactions, asOfDate);
    if (acc.currency === 'USD') {
      totalBpInTWD += bp * fxRate;
    } else {
      totalBpInTWD += bp;
    }
  }

  return Math.round(totalBpInTWD);
}

export interface PendingSettlementItem {
  transactionId: string;
  accountId: string;
  accountName: string;
  currency: Currency;
  type: CashEntryType;
  category: CashFlowCategory;
  amount: number;
  date: string;
  tradeDate?: string;
  settlementDate: string;
  daysUntilSettlement: number;
  settlementStatus: 'PENDING' | 'SETTLED';
  note?: string;
}

export interface PendingSettlementTimelineGroup {
  overdue: PendingSettlementItem[];    // 已逾期待核銷 (< 0 天)
  today: PendingSettlementItem[];      // 今日交割 (0 天)
  tomorrow: PendingSettlementItem[];   // 明日交割 (1 天)
  thisWeek: PendingSettlementItem[];   // 本週排程 (2 ~ 7 天)
  future: PendingSettlementItem[];     // 未來排程 (> 7 天)
  totalInflowInTWD: number;
  totalOutflowInTWD: number;
  netInflowInTWD: number;
}

/**
 * 依據未來交割日將在途待交割項目分組為時序排程 (Settlement Timeline Grouping)
 */
export function groupPendingSettlementsByTimeline(
  transactions: CashTransaction[],
  accounts: BrokerAccount[],
  fxRate = 32.0,
  todayStr?: string
): PendingSettlementTimelineGroup {
  const today = todayStr || new Date().toISOString().split('T')[0];
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const result: PendingSettlementTimelineGroup = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    future: [],
    totalInflowInTWD: 0,
    totalOutflowInTWD: 0,
    netInflowInTWD: 0,
  };

  const dToday = new Date(today);

  for (const tx of transactions) {
    if (!isPendingOrFutureTransaction(tx, today)) {
      continue;
    }

    const sDate = tx.settlementDate || tx.date;
    const dSettlement = new Date(sDate);
    const diffMs = dSettlement.getTime() - dToday.getTime();
    const daysUntilSettlement = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const item: PendingSettlementItem = {
      transactionId: tx.id,
      accountId: tx.accountId,
      accountName: accountMap.get(tx.accountId) || '未知帳戶',
      currency: tx.currency,
      type: tx.type,
      category: tx.category || (tx.type as CashFlowCategory),
      amount: tx.amount,
      date: tx.date,
      tradeDate: tx.tradeDate,
      settlementDate: sDate,
      daysUntilSettlement,
      settlementStatus: tx.settlementStatus || 'PENDING',
      note: tx.note,
    };

    const rate = tx.currency === 'USD' ? (tx.fxRateToTwd || fxRate) : 1;
    const amountInTWD = tx.amount * rate;

    if (amountInTWD > 0) {
      result.totalInflowInTWD += amountInTWD;
    } else {
      result.totalOutflowInTWD += Math.abs(amountInTWD);
    }

    if (daysUntilSettlement < 0) {
      result.overdue.push(item);
    } else if (daysUntilSettlement === 0) {
      result.today.push(item);
    } else if (daysUntilSettlement === 1) {
      result.tomorrow.push(item);
    } else if (daysUntilSettlement <= 7) {
      result.thisWeek.push(item);
    } else {
      result.future.push(item);
    }
  }

  // 排序各組：依交割日期由近至遠升冪排列
  const sortByDate = (a: PendingSettlementItem, b: PendingSettlementItem) => a.settlementDate.localeCompare(b.settlementDate);
  result.overdue.sort(sortByDate);
  result.today.sort(sortByDate);
  result.tomorrow.sort(sortByDate);
  result.thisWeek.sort(sortByDate);
  result.future.sort(sortByDate);

  result.totalInflowInTWD = Math.round(result.totalInflowInTWD);
  result.totalOutflowInTWD = Math.round(result.totalOutflowInTWD);
  result.netInflowInTWD = Math.round(result.totalInflowInTWD - result.totalOutflowInTWD);

  return result;
}

/**
 * 計算外部淨投入本金 (純入金 - 純出金)
 */
export function calculateNetInvestedCapital(
  transactions: CashTransaction[],
  fxRate = 32.0
): NetCapitalSummary {
  let totalDepositsInTWD = 0;
  let totalWithdrawalsInTWD = 0;

  for (const tx of transactions) {
    const cat = tx.category || tx.type;
    const rate = tx.currency === 'USD' ? (tx.fxRateToTwd || fxRate) : 1;

    if (cat === 'DEPOSIT') {
      totalDepositsInTWD += Math.abs(tx.amount) * rate;
    } else if (cat === 'WITHDRAWAL') {
      totalWithdrawalsInTWD += Math.abs(tx.amount) * rate;
    }
  }

  return {
    totalDepositsInTWD,
    totalWithdrawalsInTWD,
    totalNetCapitalInTWD: totalDepositsInTWD - totalWithdrawalsInTWD,
  };
}

/**
 * 建立雙向換匯/調撥交易對
 */
export function createFxTransferPair(params: {
  sourceAccountId: string;
  targetAccountId: string;
  sourceAmount: number; // 扣除金額 (正數)
  targetAmount: number; // 增加金額 (正數)
  fxRate?: number;
  fee?: number;
  date: string;
  note?: string;
}): { outflow: CashTransaction; inflow: CashTransaction } {
  const pairId = `pair-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const outflow: CashTransaction = {
    id: `tx-out-${pairId}`,
    accountId: params.sourceAccountId,
    currency: 'TWD',
    type: 'FX_TRANSFER_OUT',
    category: 'FX_TRANSFER_OUT',
    amount: -Math.abs(params.sourceAmount),
    fee: params.fee,
    fxRate: params.fxRate,
    transferTargetAccountId: params.targetAccountId,
    transferPairId: pairId,
    date: params.date,
    note: params.note,
    createdAt: now,
  };

  const inflow: CashTransaction = {
    id: `tx-in-${pairId}`,
    accountId: params.targetAccountId,
    currency: 'USD',
    type: 'FX_TRANSFER_IN',
    category: 'FX_TRANSFER_IN',
    amount: Math.abs(params.targetAmount),
    fxRate: params.fxRate,
    transferTargetAccountId: params.sourceAccountId,
    transferPairId: pairId,
    date: params.date,
    note: params.note,
    createdAt: now + 1,
  };

  return { outflow, inflow };
}

/**
 * 依據使用者輸入之交割戶真實現金餘額，自動計算並產生校正入金/出金流水
 */
export function reconcileAccountBalance(params: {
  accountId: string;
  targetBalance: number; // 使用者交割戶目前真實餘額
  currentBalance: number; // 目前系統計算餘額
  currency: Currency;
  date?: string; // 預設最早交易日或當前日期
}): CashTransaction | null {
  const diff = params.targetBalance - params.currentBalance;
  if (Math.abs(diff) < 0.001) return null;

  const isDeposit = diff > 0;
  const now = Date.now();

  return {
    id: `tx-reconcile-${params.accountId}-${now}`,
    accountId: params.accountId,
    currency: params.currency,
    type: isDeposit ? 'DEPOSIT' : 'WITHDRAWAL',
    category: isDeposit ? 'DEPOSIT' : 'WITHDRAWAL',
    amount: diff, // 正數為補足入金，負數為校正出金
    date: params.date || new Date().toISOString().split('T')[0],
    note: `初始本金/交割戶真實餘額校正 (目標: ${params.currency === 'USD' ? '$' : 'NT$'} ${params.targetBalance.toLocaleString()})`,
    createdAt: now,
  };
}

/**
 * 計算單筆質押維持率與狀態
 */
export function calculatePledgeMaintenanceRatio(
  loan: LoanRecord,
  quotes: Record<string, PriceQuote>
): PledgeMaintenanceRatioResult {
  let collateralMarketValue = 0;

  if (loan.pledgedCollateral && loan.pledgedCollateral.length > 0) {
    for (const item of loan.pledgedCollateral) {
      const q = quotes[item.symbol];
      const price = q ? q.price : 0;
      collateralMarketValue += item.shares * price;
    }
  }

  const principal = loan.principal || 0;
  const maintenanceRatio = principal > 0 ? (collateralMarketValue / principal) * 100 : 0;

  const warningRatio = loan.warningRatio ?? 130;
  const safeRatio = loan.safeRatio ?? 166;

  let status: PledgeStatus = 'SAFE';
  let isMarginCall = false;

  if (maintenanceRatio < warningRatio) {
    status = 'DANGER';
    isMarginCall = true;
  } else if (maintenanceRatio < safeRatio) {
    status = 'WARNING';
    isMarginCall = false;
  }

  return {
    loanId: loan.id,
    collateralMarketValue,
    principal,
    maintenanceRatio,
    status,
    isMarginCall,
  };
}

/**
 * 計算整體淨負債比 (LTV) 與年化利息支出 (含本利和與規費之總借款負債)
 */
export function calculateOverallLeverageMetrics(
  loans: LoanRecord[],
  totalStockMarketValue: number,
  totalCashBalance: number,
  fxRate = 32.0,
  asOfDate?: string
): LeverageMetrics {
  let totalDebtInTWD = 0;
  let estimatedAnnualInterestInTWD = 0;

  for (const loan of loans) {
    if (!loan.principal || loan.principal <= 0) continue;
    const rate = loan.currency === 'USD' ? fxRate : 1;
    const payoff = calculateLoanInterestAndPayoff(loan, asOfDate);
    const debtInTWD = payoff.totalPayoffAmount * rate;
    totalDebtInTWD += debtInTWD;

    const interestRate = loan.annualInterestRate
      ? loan.annualInterestRate / 100
      : (loan.interestRate || 0);
    estimatedAnnualInterestInTWD += (loan.principal * rate) * interestRate;
  }

  const totalAssetInTWD = totalStockMarketValue + totalCashBalance;
  const netAssetValueInTWD = totalAssetInTWD - totalDebtInTWD;
  const debtRatioPercent = totalAssetInTWD > 0 ? (totalDebtInTWD / totalAssetInTWD) * 100 : 0;

  return {
    totalDebtInTWD,
    totalAssetInTWD,
    netAssetValueInTWD,
    debtRatioPercent,
    estimatedAnnualInterestInTWD,
  };
}

/**
 * 計算台股 (T+2) 或美股 (T+1) 的預計交割扣款/入帳日 (避開週六日與國定休市日)
 * 美國證券交易委員會 (SEC) 於 2024 年 5 月 28 日起全面實施 T+1 標準結算週期
 */
export function calculateSettlementDate(tradeDateStr: string, market: 'TW' | 'US' = 'TW'): string {
  const parts = tradeDateStr.split('-');
  if (parts.length !== 3) return tradeDateStr;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(Date.UTC(year, month, day));

  if (isNaN(d.getTime())) return tradeDateStr;

  // 台股 T+2 營業日，美股 (2024 SEC 新法規) T+1 營業日
  let businessDaysToAdd = market === 'TW' ? 2 : 1;

  while (businessDaysToAdd > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const currentDateStr = d.toISOString().split('T')[0];

    // 依據市場休市日曆與週末過濾判斷有效營業日
    if (isBusinessDay(currentDateStr, market)) {
      businessDaysToAdd--;
    }
  }

  return d.toISOString().split('T')[0];
}

/**
 * 依據金流類別與市場規則取得交割扣款/入帳日 (Settlement Date Resolver)
 * 1. 股票買進 / 賣出：依據市場 (TW: T+2, US: T+1) 自動略過週末推算。
 * 2. 跨國換匯 / 電匯調撥 (FX_TRANSFER_IN/OUT, WIRE_FEE)：預設 T+2 銀行清算週期 (跳過週末)。
 * 3. 質押借款撥款 (LOAN_DISBURSEMENT)：預設 T+1 撥款週期 (跳過週末)。
 * 4. 現金股息：若有提供 customPaymentDate (公告發放日) 則優先採用；否則預設為交易日。
 * 5. 其餘一般金流 (入出金/手續費/稅費/借貸還款)：預設為交易記錄當日即時生效。
 */
export function getSettlementDate(
  tradeDateStr: string,
  market: 'TW' | 'US' = 'TW',
  category?: CashFlowCategory | string,
  customPaymentDate?: string
): string {
  if (customPaymentDate) {
    return customPaymentDate;
  }

  // 1. 股票買進/賣出：依據市場 (TW: T+2, US: T+1) 自動略過週末推算
  if (!category || category === 'STOCK_BUY' || category === 'STOCK_SELL') {
    return calculateSettlementDate(tradeDateStr, market);
  }

  // 2. 跨國換匯與電匯調撥：預設 T+2 銀行清算週期 (跳過週末)
  if (
    category === 'FX_TRANSFER_IN' ||
    category === 'FX_TRANSFER_OUT' ||
    category === 'WIRE_FEE'
  ) {
    return calculateSettlementDate(tradeDateStr, 'TW');
  }

  // 3. 股票質押借款撥款：預設 T+1 撥款週期 (跳過週末)
  if (category === 'LOAN_DISBURSEMENT') {
    return calculateSettlementDate(tradeDateStr, 'US');
  }

  // 4. 其餘一般金流 (入出金/手續費/稅費/借貸還款等) 預設為交易記錄當日即時生效
  return tradeDateStr;
}

/**
 * 股票質押利息與還款金額結構
 */
export interface LoanInterestMetrics {
  daysElapsed: number; // 計息天數
  accruedInterest: number; // 累計至今日應返還利息
  monthlyEstimatedInterest: number; // 預估每月利息
  pledgeFees: number; // 設質三大規費總和
  totalPayoffAmount: number; // 應還款總金額 (本金 + 應計利息 + 設質規費)
}

/**
 * 計算單筆質押借款截至今日之應返還利息、月息與本利和應還款金額 (含設質三大規費)
 */
export function calculateLoanInterestAndPayoff(loan: LoanRecord, asOfDate?: string): LoanInterestMetrics {
  const todayStr = asOfDate || new Date().toISOString().split('T')[0];
  const startStr = loan.lastInterestPaymentDate || loan.startDate || loan.date || todayStr;
  
  const dStart = new Date(startStr);
  const dToday = new Date(todayStr);

  const diffMs = Math.max(0, dToday.getTime() - dStart.getTime());
  const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const rate = (loan.annualInterestRate || (loan.interestRate ? loan.interestRate * 100 : 0)) / 100;
  const principal = loan.principal;

  const accruedInterest = Math.round(principal * (rate / 365) * daysElapsed);
  const monthlyEstimatedInterest = Math.round(principal * (rate / 12));
  
  // 精準計算設質三大規費總和，若有細項則以細項加總為準，避免重複加總
  const pledgeFees = (loan.transferFee !== undefined || loan.pledgeRegistryFee !== undefined || loan.handlingFee !== undefined)
    ? ((loan.transferFee || 0) + (loan.pledgeRegistryFee || 0) + (loan.handlingFee || 0))
    : (loan.pledgeFee || 0);

  const totalPayoffAmount = principal + accruedInterest + pledgeFees;

  return {
    daysElapsed,
    accruedInterest,
    monthlyEstimatedInterest,
    pledgeFees,
    totalPayoffAmount,
  };
}

/**
 * 依據質押借款合約，自動產生歷月定期扣息之現金流水 (Monthly Loan Interest Transactions)
 */
export function generateMonthlyLoanInterestTransactions(
  loans: LoanRecord[],
  asOfDate?: string
): CashTransaction[] {
  const todayStr = asOfDate || new Date().toISOString().split('T')[0];
  const interestTransactions: CashTransaction[] = [];

  for (const loan of loans) {
    if (!loan.principal || loan.principal <= 0) continue;
    const rate = (loan.annualInterestRate || (loan.interestRate ? loan.interestRate * 100 : 0)) / 100;
    if (rate <= 0) continue;

    const startStr = loan.startDate || loan.date || todayStr;
    const dStart = new Date(startStr);
    const dToday = new Date(todayStr);

    if (isNaN(dStart.getTime()) || isNaN(dToday.getTime()) || dStart > dToday) continue;

    const monthlyInterest = Math.round(loan.principal * (rate / 12));
    if (monthlyInterest <= 0) continue;

    // 逐月推算結息日 (預設每月 20 號)
    const cursor = new Date(dStart);
    cursor.setDate(20);
    if (cursor < dStart) {
      cursor.setMonth(cursor.getMonth() + 1);
    }

    while (cursor <= dToday) {
      const dateStr = cursor.toISOString().split('T')[0];
      const tx: CashTransaction = {
        id: `tx-loan-interest-${loan.id}-${dateStr}`,
        accountId: loan.accountId || 'broker-tw-default',
        currency: loan.currency || 'TWD',
        type: 'FINANCING_FEE',
        category: 'FINANCING_FEE',
        amount: -monthlyInterest,
        date: dateStr,
        note: `[自動推算] ${loan.name || '質押借款'}月利息 (${dateStr} 結息扣款)`,
        createdAt: cursor.getTime(),
      };
      interestTransactions.push(tx);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return interestTransactions;
}

/**
 * 將 TradeRecord 與 CashTransaction 進行同步
 * 自動為買進/賣出/股息/減資生成或清理交割流水
 * 依據市場規則自動試算台股 (T+2) / 美股 (T+1) 交割日與交割狀態
 */
export function syncTradesWithCashTransactions(
  trades: TradeRecord[],
  currentCashTransactions: CashTransaction[],
  asOfDate?: string
): CashTransaction[] {
  // 1. 保留手動建立（無 relatedTradeId）的現金流水
  const manualTransactions = currentCashTransactions.filter((tx) => !tx.relatedTradeId);

  // 2. 建立既有連動流水的索引字典
  const existingAutoTxMap = new Map<string, CashTransaction>();
  for (const tx of currentCashTransactions) {
    if (tx.relatedTradeId) {
      existingAutoTxMap.set(tx.relatedTradeId, tx);
    }
  }

  const todayStr = asOfDate || new Date().toISOString().split('T')[0];

  // 3. 根據最新 trades 生成對應的現金流水
  const generatedAutoTransactions: CashTransaction[] = [];

  for (const trade of trades) {
    let category: CashFlowCategory | null = null;
    let amount = 0;

    const isUS = trade.market === 'US' || trade.currency === 'USD';

    const isMarginBuy = trade.type === 'MARGIN_BUY' || (trade.type === 'BUY' && Boolean(trade.isMargin));
    const isMarginSell = trade.type === 'MARGIN_SELL' || (trade.type === 'SELL' && Boolean(trade.isMargin));

    if (trade.type === 'BUY' || trade.type === 'MARGIN_BUY') {
      category = 'STOCK_BUY';
      const marginRate = isMarginBuy ? (trade.marginRate ?? 0.4) : 1.0;
      const principalCost = trade.shares * trade.price * marginRate;
      const rawCost = principalCost + (trade.fee || 0);
      amount = isUS ? -bankersRound(rawCost, 2) : -Math.round(rawCost);
    } else if (trade.type === 'SELL' || trade.type === 'MARGIN_SELL') {
      category = 'STOCK_SELL';
      const rawNet = trade.shares * trade.price - (trade.fee || 0) - (trade.tax || 0);
      amount = isUS ? bankersRound(rawNet, 2) : Math.round(rawNet);
    } else if (trade.type === 'DIVIDEND') {
      category = 'DIVIDEND_PAYOUT';
      // 現金股利入帳：若已明確設定實收金額 (cashAmount)，優先以實收金額入帳；否則依 (shares * price - tax) 計算
      if (trade.cashAmount !== undefined && trade.cashAmount > 0) {
        amount = isUS ? bankersRound(trade.cashAmount, 2) : Math.floor(trade.cashAmount);
      } else {
        const rawGross = (trade.shares && trade.price) ? trade.shares * trade.price : 0;
        const gross = isUS ? bankersRound(rawGross, 2) : Math.floor(rawGross);
        if (isUS) {
          amount = gross;
        } else {
          const tax = trade.tax || 0;
          amount = gross - tax;
        }
      }
    } else if (trade.type === 'CAPITAL_REDUCTION' && trade.cashAmount && trade.cashAmount > 0) {
      category = 'CAPITAL_RETURN';
      amount = trade.cashAmount;
    }

    if (category) {
      const isUS = trade.market === 'US' || trade.currency === 'USD';
      let settlementDate = trade.date;
      if (category === 'STOCK_BUY' || category === 'STOCK_SELL') {
        settlementDate = calculateSettlementDate(trade.date, isUS ? 'US' : 'TW');
      } else if (category === 'DIVIDEND_PAYOUT') {
        settlementDate = trade.payDate || estimatePaymentDate(trade.exDate || trade.date, trade.market);
      }
      
      const settlementStatus = todayStr >= settlementDate ? 'SETTLED' : 'PENDING';
      const existing = existingAutoTxMap.get(trade.id);

      const cycleLabel = isUS ? '美股 T+1' : '台股 T+2';
      let notePrefix = '';
      if (category === 'STOCK_BUY' || category === 'STOCK_SELL') {
        notePrefix = `[${cycleLabel} 交割日: ${settlementDate}] `;
      } else if (category === 'DIVIDEND_PAYOUT') {
        notePrefix = `[預估入帳發放日: ${settlementDate}] `;
      }

      let tradeTypeLabel: string = trade.type;
      if (isMarginBuy) {
        const ratePercent = ((trade.marginRate ?? 0.4) * 100).toFixed(0);
        tradeTypeLabel = `融資買進: 自備款 ${ratePercent}%`;
      } else if (isMarginSell) {
        tradeTypeLabel = '融資賣出';
      }

      const tx: CashTransaction = {
        id: existing ? existing.id : `tx-auto-${trade.id}`,
        accountId: trade.accountId || (isUS ? 'broker-us-default' : 'broker-tw-default'),
        currency: trade.currency || (isUS ? 'USD' : 'TWD'),
        type: category,
        category,
        amount,
        date: trade.date,
        tradeDate: trade.date,
        settlementDate,
        settlementStatus,
        relatedTradeId: trade.id,
        note: `${notePrefix}自動連動: ${trade.name || trade.symbol} (${tradeTypeLabel})`,
        createdAt: existing ? existing.createdAt : trade.createdAt || Date.now(),
      };
      generatedAutoTransactions.push(tx);
    }
  }

  const allTx = [...manualTransactions, ...generatedAutoTransactions];
  return sortCashTransactions(allTx, 'ASC');
}

/**
 * 排序現金流水帳本 (支援 ASC 舊➔新 / DESC 新➔舊)
 * 日期以 YYYY-MM-DD 自然字串比對，徹底阻絕 NaN 與時區亂序
 * 同日依照金流權重（先流入 ➔ 後稅費 ➔ 後流出）精確排列
 */
export function sortCashTransactions(
  transactions: CashTransaction[],
  sortOrder: 'ASC' | 'DESC' = 'DESC'
): CashTransaction[] {
  return [...transactions].sort((a, b) => {
    const dateA = a.tradeDate || a.date || '';
    const dateB = b.tradeDate || b.date || '';
    if (dateA !== dateB) {
      return sortOrder === 'DESC' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
    }

    const getFlowPriority = (tx: CashTransaction) => {
      const cat = tx.category || tx.type;
      if (
        cat === 'DEPOSIT' ||
        cat === 'INTEREST_INCOME' ||
        cat === 'INTEREST' ||
        cat === 'DIVIDEND_PAYOUT' ||
        cat === 'DIVIDEND' ||
        cat === 'STOCK_SELL' ||
        cat === 'CAPITAL_RETURN' ||
        cat === 'LOAN_DISBURSEMENT' ||
        cat === 'FX_TRANSFER_IN'
      ) {
        return 1;
      }
      if (cat === 'TAX' || (tx.note && tx.note.includes('預扣稅'))) {
        return 2;
      }
      return 3;
    };

    const prioA = getFlowPriority(a);
    const prioB = getFlowPriority(b);
    if (prioA !== prioB) {
      return sortOrder === 'DESC' ? prioB - prioA : prioA - prioB;
    }

    return sortOrder === 'DESC'
      ? (b.createdAt || 0) - (a.createdAt || 0)
      : (a.createdAt || 0) - (b.createdAt || 0);
  });
}

/**
 * 智能歸一化利息項目名稱 (去除日期區間括號與明細後綴，使同類/同券商利息能自動合併)
 * 支援全形逗號「，」、半形逗號「,」、中點「·」、各類破折號與明細後綴截斷
 */
export function normalizeInterestName(rawNote?: string, fallback = '利息收入'): string {
  if (!rawNote || !rawNote.trim()) return fallback;
  let name = rawNote.trim();

  // 1. 去除括號內的日期區間，如 (9/29-10/29)、(8/29~9/28)、(10/30–11/25)、(2026/01/01~2026/01/31) 等
  name = name.replace(/\s*\([^)]*\d+[/~–—-]\d+[^)]*\)/g, '').trim();

  // 2. 去除常見明細分隔符（全形逗號「，」、半形逗號「,」、中點「·」、冒號「：/:」）後接「利息」、「預扣」、「+」、「$」等後綴
  name = name.split(/[\u00b7,，:：]\s*(?:利息|預扣|本金|\+|\$|\d)/)[0].trim();

  // 3. 若有直接「，」、「·」或「,」分割，直接取前半段主項目名稱
  if (name.includes('·')) {
    name = name.split('·')[0].trim();
  }
  if (name.includes('，')) {
    name = name.split('，')[0].trim();
  }
  if (name.includes(',')) {
    name = name.split(',')[0].trim();
  }

  // 4. 去除結尾多餘連字號、逗號或空白
  name = name.replace(/[-~_–—,，·:：]\s*$/, '').trim();

  return name || fallback;
}

export interface InterestIncomeItem {
  id: string;
  name: string;        // 項目名稱 (例如：Schwab 嘉信理財-現金利息、活存利息、借券收益)
  amount: number;      // 該項目累計金額 (原生幣別)
  amountInTWD: number; // 折算台幣金額
  currency: Currency;  // TWD | USD
}

export interface InterestIncomeSummary {
  totalInterestAmount: number;         // 當前市場幣別或折算 TWD 利息總額
  totalInterestInTWD: number;          // 折算台幣總利息
  totalInterestTaxUSD: number;         // 美元現金利息預扣稅總額
  totalInterestTaxTWD: number;         // 台幣現金利息預扣稅總額
  interestItems: InterestIncomeItem[]; // 各項利息明細獨立清單 (供膠囊渲染)
}

/**
 * 依市場與項目備註聚合各項利息收入與利息預扣稅 (供被動收益卡片與獨立膠囊使用)
 */
export function aggregateInterestIncomeDetails(
  transactions: CashTransaction[],
  market: 'TW' | 'US' | 'ALL' = 'ALL',
  fxRate = 32.0,
  asOfDate?: string
): InterestIncomeSummary {
  const todayStr = asOfDate || new Date().toISOString().split('T')[0];
  const itemMap = new Map<string, InterestIncomeItem>();

  let totalInterestAmount = 0;
  let totalInterestInTWD = 0;
  let totalInterestTaxUSD = 0;
  let totalInterestTaxTWD = 0;

  for (const tx of transactions) {
    if (isPendingOrFutureTransaction(tx, todayStr)) continue;

    const cat = tx.category || tx.type;

    // 1. 統計利息預扣稅 (類別為 TAX 且備註包含利息關鍵字)
    if (cat === 'TAX' && tx.note && (tx.note.includes('利息') || tx.note.toLowerCase().includes('interest'))) {
      const taxAbs = Math.abs(tx.amount);
      if (tx.currency === 'USD') {
        totalInterestTaxUSD += taxAbs;
      } else {
        totalInterestTaxTWD += taxAbs;
      }
    }

    // 2. 僅統計已生效/已交割之利息收入
    if (cat !== 'INTEREST_INCOME' && cat !== 'INTEREST') continue;

    // 市場過濾
    if (market === 'US' && tx.currency !== 'USD') continue;
    if (market === 'TW' && tx.currency !== 'TWD') continue;

    const normalizedName = normalizeInterestName(tx.note);
    const groupKey = `${normalizedName}__${tx.currency}`;
    const amount = Math.abs(tx.amount);
    const amountInTWD = tx.currency === 'USD' ? amount * fxRate : amount;

    if (itemMap.has(groupKey)) {
      const existing = itemMap.get(groupKey)!;
      existing.amount = tx.currency === 'USD' ? bankersRound(existing.amount + amount, 2) : Math.round(existing.amount + amount);
      existing.amountInTWD = bankersRound(existing.amountInTWD + amountInTWD, 2);
    } else {
      itemMap.set(groupKey, {
        id: groupKey,
        name: normalizedName,
        amount: tx.currency === 'USD' ? bankersRound(amount, 2) : Math.round(amount),
        amountInTWD: bankersRound(amountInTWD, 2),
        currency: tx.currency,
      });
    }

    if (market === 'US') {
      totalInterestAmount += tx.currency === 'USD' ? amount : 0;
    } else if (market === 'TW') {
      totalInterestAmount += tx.currency === 'TWD' ? amount : 0;
    } else {
      totalInterestAmount += amountInTWD;
    }
    totalInterestInTWD += amountInTWD;
  }

  const interestItems = Array.from(itemMap.values()).sort((a, b) => b.amountInTWD - a.amountInTWD);

  return {
    totalInterestAmount: market === 'US' ? bankersRound(totalInterestAmount, 2) : Math.round(totalInterestAmount),
    totalInterestInTWD: bankersRound(totalInterestInTWD, 2),
    totalInterestTaxUSD: bankersRound(totalInterestTaxUSD, 2),
    totalInterestTaxTWD: Math.round(totalInterestTaxTWD),
    interestItems,
  };
}

