/**
 * projectedCashflowEngine.ts
 * Spec 0183 (Ticket 02): 未來 12 個月現金流投影與枯水期警報引擎
 * 純前端算力，零外部 API 依賴
 */

import { HoldingPosition } from '../types/stock';

export type DividendFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';

export interface PayoutRateConfig {
  frequency: DividendFrequency;
  estimatedPerShare: number;
  payoutMonths?: number[]; // 1 ~ 12
}

export interface ProjectedCashflowInput {
  baseYearMonth: string; // 'YYYY-MM'
  holdings: HoldingPosition[];
  customPayoutRates?: Record<string, PayoutRateConfig>;
}

export interface ProjectedMonthBreakdown {
  symbol: string;
  name: string;
  estimatedAmountTwd: number;
  perShareDividend: number;
  shares: number;
}

export interface ProjectedMonthItem {
  yearMonth: string; // 'YYYY-MM'
  monthNumber: number; // 1 ~ 12
  estimatedTotalTwd: number;
  isDrySeason: boolean; // 是否為枯水期 (低於月均 50%)
  breakdown: ProjectedMonthBreakdown[];
}

export interface ProjectedCashflowResult {
  baseYearMonth: string;
  annualTotalTwd: number;
  monthlyAverageTwd: number;
  drySeasonThresholdTwd: number;
  months: ProjectedMonthItem[];
  drySeasonMonths: number[]; // 枯水期月份清單 (1 ~ 12)
}

export interface ComplementaryRecommendation {
  symbol: string;
  name: string;
  frequency: DividendFrequency;
  payoutMonths: number[];
  matchingDryMonths: number[];
  description: string;
}

/**
 * 台灣常見熱門 ETF 與權值股預設除息/發放月份慣性庫
 */
const DEFAULT_DIVIDEND_PROFILES: Record<string, { frequency: DividendFrequency; payoutMonths: number[]; defaultYield: number }> = {
  // 月配型
  '00929': { frequency: 'MONTHLY', payoutMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 0.08 },
  '00934': { frequency: 'MONTHLY', payoutMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 0.07 },
  '00936': { frequency: 'MONTHLY', payoutMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 0.07 },
  '00940': { frequency: 'MONTHLY', payoutMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 0.06 },

  // 1/4/7/10 季配組
  '0056': { frequency: 'QUARTERLY', payoutMonths: [1, 4, 7, 10], defaultYield: 0.07 },
  '00888': { frequency: 'QUARTERLY', payoutMonths: [1, 4, 7, 10], defaultYield: 0.05 },
  '2330': { frequency: 'QUARTERLY', payoutMonths: [1, 4, 7, 10], defaultYield: 0.02 },

  // 2/5/8/11 季配組
  '00878': { frequency: 'QUARTERLY', payoutMonths: [2, 5, 8, 11], defaultYield: 0.065 },
  '00900': { frequency: 'QUARTERLY', payoutMonths: [2, 5, 8, 11], defaultYield: 0.06 },

  // 3/6/9/12 季配組
  '00919': { frequency: 'QUARTERLY', payoutMonths: [3, 6, 9, 12], defaultYield: 0.09 },
  '00713': { frequency: 'QUARTERLY', payoutMonths: [3, 6, 9, 12], defaultYield: 0.065 },

  // 半年配 (1/7 或 6/12)
  '0050': { frequency: 'SEMI_ANNUAL', payoutMonths: [2, 8], defaultYield: 0.035 },
  '006208': { frequency: 'SEMI_ANNUAL', payoutMonths: [7, 11], defaultYield: 0.035 },
};

/**
 * 計算指定標的在某月份是否入帳，及預估每股配息金額
 */
function resolvePayoutForMonth(
  symbol: string,
  monthNumber: number,
  currentPrice: number,
  customConfig?: PayoutRateConfig
): number {
  if (customConfig) {
    if (customConfig.frequency === 'MONTHLY') {
      return customConfig.estimatedPerShare;
    }
    const months = customConfig.payoutMonths || [7];
    if (months.includes(monthNumber)) {
      return customConfig.estimatedPerShare;
    }
    return 0;
  }

  const profile = DEFAULT_DIVIDEND_PROFILES[symbol];
  if (profile) {
    if (profile.payoutMonths.includes(monthNumber)) {
      const timesPerYear = profile.payoutMonths.length;
      const annualDividend = currentPrice * profile.defaultYield;
      return annualDividend / timesPerYear;
    }
    return 0;
  }

  // 一般年配股預設於 7 月或 8 月發放，以 4% 殖利率粗估
  if (monthNumber === 8) {
    return currentPrice * 0.04;
  }

  return 0;
}

/**
 * 依據基準 YYYY-MM 產出連續 12 個月字串清單
 */
function generate12MonthKeys(baseYearMonth: string): Array<{ yearMonth: string; monthNumber: number }> {
  const [baseYearStr, baseMonthStr] = baseYearMonth.split('-');
  const baseYear = parseInt(baseYearStr, 10);
  const baseMonth = parseInt(baseMonthStr, 10);

  const result: Array<{ yearMonth: string; monthNumber: number }> = [];
  for (let i = 0; i < 12; i++) {
    let year = baseYear;
    let month = baseMonth + i;
    while (month > 12) {
      year += 1;
      month -= 12;
    }
    const monthStr = month.toString().padStart(2, '0');
    result.push({
      yearMonth: `${year}-${monthStr}`,
      monthNumber: month,
    });
  }
  return result;
}

/**
 * 產出未來 12 個月現金流投影
 */
export function generate12MonthProjectedCashflow(input: ProjectedCashflowInput): ProjectedCashflowResult {
  const monthKeys = generate12MonthKeys(input.baseYearMonth);
  const monthlyItems: ProjectedMonthItem[] = [];

  let annualTotalTwd = 0;

  for (const { yearMonth, monthNumber } of monthKeys) {
    const breakdown: ProjectedMonthBreakdown[] = [];
    let monthTotal = 0;

    for (const h of input.holdings) {
      if (h.shares <= 0) continue;
      const customConfig = input.customPayoutRates?.[h.symbol];
      const perShare = resolvePayoutForMonth(h.symbol, monthNumber, h.currentPrice, customConfig);

      if (perShare > 0) {
        const amount = Math.round(perShare * h.shares);
        monthTotal += amount;
        breakdown.push({
          symbol: h.symbol,
          name: h.name,
          estimatedAmountTwd: amount,
          perShareDividend: perShare,
          shares: h.shares,
        });
      }
    }

    annualTotalTwd += monthTotal;
    monthlyItems.push({
      yearMonth,
      monthNumber,
      estimatedTotalTwd: monthTotal,
      isDrySeason: false, // 稍後統一依月均標記
      breakdown,
    });
  }

  const monthlyAverageTwd = annualTotalTwd / 12;
  const drySeasonThresholdTwd = monthlyAverageTwd * 0.5;

  const drySeasonMonths: number[] = [];

  // 標記枯水期月份
  for (const item of monthlyItems) {
    if (item.estimatedTotalTwd < drySeasonThresholdTwd) {
      item.isDrySeason = true;
      if (!drySeasonMonths.includes(item.monthNumber)) {
        drySeasonMonths.push(item.monthNumber);
      }
    }
  }

  return {
    baseYearMonth: input.baseYearMonth,
    annualTotalTwd,
    monthlyAverageTwd,
    drySeasonThresholdTwd,
    months: monthlyItems,
    drySeasonMonths,
  };
}

/**
 * 偵測枯水期月份列表 (1 ~ 12)
 */
export function detectDrySeasonMonths(result: ProjectedCashflowResult): number[] {
  return result.drySeasonMonths;
}

/**
 * 依據枯水期月份，自預設庫中推薦具備互補配息月份的優質標的
 */
export function recommendComplementaryDividendMonths(dryMonths: number[]): ComplementaryRecommendation[] {
  const recommendations: ComplementaryRecommendation[] = [];

  for (const [symbol, profile] of Object.entries(DEFAULT_DIVIDEND_PROFILES)) {
    // 找出該標的配息月份與枯水期月份的交集
    const matching = profile.payoutMonths.filter((m) => dryMonths.includes(m));
    if (matching.length > 0) {
      let name = symbol;
      if (symbol === '00919') name = '群益台灣精選高息';
      else if (symbol === '00713') name = '元大台灣高息低波';
      else if (symbol === '00878') name = '國泰永續高股息';
      else if (symbol === '0056') name = '元大高股息';
      else if (symbol === '00929') name = '復華台灣科技優息';

      recommendations.push({
        symbol,
        name,
        frequency: profile.frequency,
        payoutMonths: profile.payoutMonths,
        matchingDryMonths: matching,
        description: `於 ${matching.join('、')} 月發放配息，可完美補足該月份之現金流缺口。`,
      });
    }
  }

  // 依照補足月份數量多寡降序排列
  return recommendations.sort((a, b) => b.matchingDryMonths.length - a.matchingDryMonths.length);
}
