import {
  DCAPlan,
  DCAScheduledExecution,
  CashflowOverdraftForecast,
  DCABacktestResult,
} from '../types/firePlanning';
import { BrokerAccount } from '../types/stock';
import { isMarketHoliday } from './holidayCalendar';

/**
 * 輔助函數：格式化日期為 YYYY-MM-DD
 */
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 輔助函數：解析 YYYY-MM-DD 為本地 Date
 */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 檢查特定日期是否為該市場的休市日（週末或國定假日）
 */
function isClosedDay(dateStr: string, market: 'TW' | 'US'): boolean {
  const d = parseDate(dateStr);
  const dayOfWeek = d.getDay();
  // 0: 週日, 6: 週六
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }
  return isMarketHoliday(dateStr, market);
}

/**
 * 尋找指定日期當天或之後的第一個開市工作日
 */
function getNextOpenTradingDay(dateStr: string, market: 'TW' | 'US'): { date: string; isDeferred: boolean } {
  let curr = parseDate(dateStr);
  let isDeferred = false;

  while (isClosedDay(formatDate(curr), market)) {
    isDeferred = true;
    curr.setDate(curr.getDate() + 1);
  }

  return {
    date: formatDate(curr),
    isDeferred,
  };
}

/**
 * 計算撮合日後的 N 個交易日交割日 (台股 T+2, 美股 T+1)
 */
function addTradingDays(startDateStr: string, tradingDaysCount: number, market: 'TW' | 'US'): string {
  let curr = parseDate(startDateStr);
  let added = 0;

  while (added < tradingDaysCount) {
    curr.setDate(curr.getDate() + 1);
    const candidateStr = formatDate(curr);
    if (!isClosedDay(candidateStr, market)) {
      added++;
    }
  }

  return formatDate(curr);
}

/**
 * 1. 產生未來 N 天的 DCA 約定扣款排程 (含假日順延撮合與交割結算日)
 */
export function generateDCASchedule(
  plans: DCAPlan[],
  daysAhead: number = 30,
  baseDateStr?: string
): DCAScheduledExecution[] {
  const activePlans = plans.filter((p) => p.isActive);
  if (activePlans.length === 0) return [];

  const baseDate = baseDateStr ? parseDate(baseDateStr) : new Date();
  const schedules: DCAScheduledExecution[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + i);

    const dayOfMonth = targetDate.getDate();
    const originalDateStr = formatDate(targetDate);

    for (const plan of activePlans) {
      if (plan.executionDays.includes(dayOfMonth)) {
        // 遇到約定扣款日，計算撮合開盤日
        const { date: tradingDate, isDeferred } = getNextOpenTradingDay(originalDateStr, plan.market);
        const settlementDays = plan.market === 'US' ? 1 : 2;
        const settlementDate = addTradingDays(tradingDate, settlementDays, plan.market);

        schedules.push({
          date: tradingDate,
          scheduledDay: dayOfMonth,
          settlementDate,
          planId: plan.id,
          symbol: plan.symbol,
          accountId: plan.accountId,
          amountTwd: plan.targetAmountTwd,
          isHolidayDeferred: isDeferred,
        });
      }
    }
  }

  // 依交割日與撮合日排序
  return schedules.sort((a, b) => a.settlementDate.localeCompare(b.settlementDate));
}

/**
 * 2. 推演未來 30 天現金防透支預警 (Overdraft Guard)
 */
export function forecastDCAOverdraftRisk(
  executions: DCAScheduledExecution[],
  accounts: BrokerAccount[],
  currentCashMap: Record<string, number>
): CashflowOverdraftForecast[] {
  const forecasts: CashflowOverdraftForecast[] = [];
  const runningBalances: Record<string, number> = { ...currentCashMap };
  const cumulativeDeductions: Record<string, number> = {};

  // 依交割日時間排序逐筆扣減
  const sortedExecutions = [...executions].sort((a, b) => a.settlementDate.localeCompare(b.settlementDate));

  for (const exec of sortedExecutions) {
    const account = accounts.find((a) => a.id === exec.accountId);
    const accountName = account ? account.name : '未知券商';

    const currentBalance = runningBalances[exec.accountId] ?? 0;
    const newBalance = currentBalance - exec.amountTwd;
    runningBalances[exec.accountId] = newBalance;

    const currentDeductions = (cumulativeDeductions[exec.accountId] ?? 0) + exec.amountTwd;
    cumulativeDeductions[exec.accountId] = currentDeductions;

    const isOverdraft = newBalance < 0;
    const shortfall = isOverdraft ? Math.abs(newBalance) : 0;

    forecasts.push({
      date: exec.settlementDate,
      accountId: exec.accountId,
      accountName,
      currentAvailableCashTwd: currentBalance,
      totalDeductionsUntilDate: currentDeductions,
      projectedCashTwd: newBalance,
      isOverdraftRisk: isOverdraft,
      shortfallAmountTwd: shortfall,
    });
  }

  return forecasts;
}

/**
 * 3. 定期定額 vs. 單筆歐印 (Lump-Sum) 歷史機會成本回測
 */
export function backtestDCAvsLumpSum(
  historicalPrices: { date: string; close: number }[],
  monthlyAmount: number,
  totalMonths: number
): DCABacktestResult {
  if (historicalPrices.length === 0 || monthlyAmount <= 0 || totalMonths <= 0) {
    return {
      symbol: '',
      totalMonths: 0,
      totalInvestedTwd: 0,
      dcaFinalValueTwd: 0,
      dcaTotalShares: 0,
      dcaAverageCost: 0,
      dcaReturnPercent: 0,
      dcaMaxDrawdownPercent: 0,
      lumpSumFinalValueTwd: 0,
      lumpSumTotalShares: 0,
      lumpSumReturnPercent: 0,
      lumpSumMaxDrawdownPercent: 0,
      wealthDeltaPercent: 0,
    };
  }

  const totalInvested = monthlyAmount * totalMonths;
  const initialPrice = historicalPrices[0].close;
  const finalPrice = historicalPrices[historicalPrices.length - 1].close;

  // Lump-Sum 策略: 期初一次買入
  const lumpSumTotalShares = totalInvested / initialPrice;
  const lumpSumFinalValue = lumpSumTotalShares * finalPrice;
  const lumpSumReturnPercent = Number((((lumpSumFinalValue - totalInvested) / totalInvested) * 100).toFixed(2));

  // 計算 Lump-Sum 歷程 MDD
  let lumpSumPeak = 0;
  let lumpSumMaxDrawdown = 0;
  for (const bar of historicalPrices) {
    const val = lumpSumTotalShares * bar.close;
    if (val > lumpSumPeak) lumpSumPeak = val;
    const dd = lumpSumPeak > 0 ? (lumpSumPeak - val) / lumpSumPeak : 0;
    if (dd > lumpSumMaxDrawdown) lumpSumMaxDrawdown = dd;
  }

  // DCA 策略: 按每月取樣一次 (按均勻步長取樣)
  const step = Math.max(1, Math.floor(historicalPrices.length / totalMonths));
  let dcaTotalShares = 0;
  let dcaPeak = 0;
  let dcaMaxDrawdown = 0;

  for (let m = 0; m < totalMonths; m++) {
    const idx = Math.min(m * step, historicalPrices.length - 1);
    const purchasePrice = historicalPrices[idx].close;
    const boughtShares = monthlyAmount / purchasePrice;
    dcaTotalShares += boughtShares;

    const currentVal = dcaTotalShares * purchasePrice;
    if (currentVal > dcaPeak) dcaPeak = currentVal;
    const dd = dcaPeak > 0 ? (dcaPeak - currentVal) / dcaPeak : 0;
    if (dd > dcaMaxDrawdown) dcaMaxDrawdown = dd;
  }

  const dcaFinalValue = dcaTotalShares * finalPrice;
  const dcaAverageCost = Number((totalInvested / dcaTotalShares).toFixed(2));
  const dcaReturnPercent = Number((((dcaFinalValue - totalInvested) / totalInvested) * 100).toFixed(2));
  const wealthDeltaPercent = Number(
    (((dcaFinalValue - lumpSumFinalValue) / lumpSumFinalValue) * 100).toFixed(2)
  );

  return {
    symbol: '',
    totalMonths,
    totalInvestedTwd: totalInvested,
    dcaFinalValueTwd: Math.round(dcaFinalValue),
    dcaTotalShares: Number(dcaTotalShares.toFixed(2)),
    dcaAverageCost,
    dcaReturnPercent,
    dcaMaxDrawdownPercent: Number((dcaMaxDrawdown * 100).toFixed(2)),
    lumpSumFinalValueTwd: Math.round(lumpSumFinalValue),
    lumpSumTotalShares: Number(lumpSumTotalShares.toFixed(2)),
    lumpSumReturnPercent,
    lumpSumMaxDrawdownPercent: Number((lumpSumMaxDrawdown * 100).toFixed(2)),
    wealthDeltaPercent,
  };
}
