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
  historicalPayoutMonths?: Record<string, number[]>; // 歷史實際除息發放月份 SSOT 映射
  usdToTwdRate?: number; // 美元兌台幣匯率，預設 32.0
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

/** 歷史標的預設年化粗估殖利率 (4.5%) */
export const DEFAULT_HISTORICAL_ESTIMATED_YIELD = 0.045;

/** 夏秋除權息旺季年配預估殖利率 (4.0%) */
export const DEFAULT_SUMMER_FALL_YIELD = 0.04;

/**
 * 台灣常見熱門 ETF 與權值股預設除息/發放月份慣性庫
 * 嚴格以實質現金「入帳發放日 (Payment Date)」為基準，消滅除息月與入帳月混淆
 */
export const DEFAULT_DIVIDEND_PROFILES: Record<string, { frequency: DividendFrequency; payoutMonths: number[]; defaultYield: number }> = {
  // 月配型 (1~12月每月入帳)
  '00929': { frequency: 'MONTHLY', payoutMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 0.08 },
  '00934': { frequency: 'MONTHLY', payoutMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 0.07 },
  '00936': { frequency: 'MONTHLY', payoutMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 0.07 },
  '00940': { frequency: 'MONTHLY', payoutMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 0.06 },

  // 0056 元大高股息: 1/4/7/10 月除息，實質現金發放於 2/5/8/11 月
  '0056': { frequency: 'QUARTERLY', payoutMonths: [2, 5, 8, 11], defaultYield: 0.07 },
  '00888': { frequency: 'QUARTERLY', payoutMonths: [2, 5, 8, 11], defaultYield: 0.05 },

  // 00878 國泰永續高股息: 2/5/8/11 月除息，實質現金發放於 3/6/9/12 月
  '00878': { frequency: 'QUARTERLY', payoutMonths: [3, 6, 9, 12], defaultYield: 0.065 },
  '00900': { frequency: 'QUARTERLY', payoutMonths: [3, 6, 9, 12], defaultYield: 0.06 },

  // 00919 群益精選高息 / 00713 元大高息低波 / 2330 台積電: 3/6/9/12 月除息，實質現金發放於 1/4/7/10 月 (跨年次月中旬)
  '00919': { frequency: 'QUARTERLY', payoutMonths: [1, 4, 7, 10], defaultYield: 0.09 },
  '00713': { frequency: 'QUARTERLY', payoutMonths: [1, 4, 7, 10], defaultYield: 0.065 },
  '2330': { frequency: 'QUARTERLY', payoutMonths: [1, 4, 7, 10], defaultYield: 0.02 },

  // 半年配 (1/7 或 6/12 除息)
  '0050': { frequency: 'SEMI_ANNUAL', payoutMonths: [2, 8], defaultYield: 0.035 },
  '006208': { frequency: 'SEMI_ANNUAL', payoutMonths: [7, 11], defaultYield: 0.035 },
  '2454': { frequency: 'SEMI_ANNUAL', payoutMonths: [1, 7], defaultYield: 0.045 }, // 聯發科: 常態 1 月與 7 月除息/入帳

  // 常見權值與週期股 (夏秋年配 / 旺季入帳)
  '2303': { frequency: 'ANNUAL', payoutMonths: [7], defaultYield: 0.05 }, // 聯電: 常態 7 月發放
  '2344': { frequency: 'ANNUAL', payoutMonths: [8], defaultYield: 0.025 }, // 華邦電: 常態 8 月發放 (Spec 0230 週期股合理預估)
};

/**
 * 依據標的代碼字串生成確定性的夏秋除權息旺季發放月 (7, 8, 9 月平滑分散，對齊規格書)
 * 避免所有非清單股票盲目集中於單一 8 月造成 29 筆暴衝
 */
export const FALLBACK_SUMMER_MONTHS = [7, 8, 9];

function getFallbackSummerPayoutMonth(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_SUMMER_MONTHS[hash % FALLBACK_SUMMER_MONTHS.length];
}

/**
 * 月度配息解析上下文 (消除 Data Clumps 異味)
 */
export interface PayoutResolutionContext {
  symbol: string;
  monthNumber: number;
  currentPrice: number;
  customConfig?: PayoutRateConfig;
  historicalMonths?: number[];
}

/**
 * 計算指定標的在某月份是否入帳，及預估每股配息金額
 */
function resolvePayoutForMonth(ctx: PayoutResolutionContext): number {
  const { symbol, monthNumber, currentPrice, customConfig, historicalMonths } = ctx;

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

  // 1. 若內建常態庫已有 Profile，優先以 Profile 官方常態發放月為唯一準則（保持年化累計 100% 且防止單月歷史覆蓋全季預估）
  const sym = symbol.toUpperCase();
  const profile = DEFAULT_DIVIDEND_PROFILES[sym];
  if (profile) {
    if (profile.payoutMonths.includes(monthNumber)) {
      const normalTimesPerYear = Math.max(profile.payoutMonths.length, 1);
      const annualDividend = currentPrice * profile.defaultYield;
      return annualDividend / normalTimesPerYear;
    }
    return 0;
  }

  // 2. 若非內建清單標的，優先對齊真實歷史發放節奏
  if (historicalMonths && historicalMonths.length > 0) {
    if (historicalMonths.includes(monthNumber)) {
      const timesPerYear = historicalMonths.length;
      return (currentPrice * DEFAULT_HISTORICAL_ESTIMATED_YIELD) / timesPerYear;
    }
    return 0;
  }

  // 3. 無自訂設定、非內建常態配息標的且無歷史配息紀錄（如不配息成長股），誠實回傳 0 預期配息 (Spec 0231 #549)
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
  const fxRate = input.usdToTwdRate && input.usdToTwdRate > 0 ? input.usdToTwdRate : 32.0;

  let annualTotalTwd = 0;

  for (const { yearMonth, monthNumber } of monthKeys) {
    const breakdown: ProjectedMonthBreakdown[] = [];
    let monthTotal = 0;

    for (const h of input.holdings) {
      if (h.shares <= 0) continue;
      const sym = h.symbol.toUpperCase();
      const customConfig = input.customPayoutRates?.[sym] || input.customPayoutRates?.[h.symbol];
      const historicalMonths = input.historicalPayoutMonths?.[sym] || input.historicalPayoutMonths?.[h.symbol];
      const perShare = resolvePayoutForMonth({
        symbol: sym,
        monthNumber,
        currentPrice: h.currentPrice,
        customConfig,
        historicalMonths,
      });

      if (perShare > 0) {
        const isUs = h.market === 'US' || h.currency === 'USD';
        // 美股配息須扣除 30% IRS 預扣稅並乘上即時匯率折合台幣 (Spec 0231 #549)
        const netPerShareInTwd = isUs ? perShare * 0.7 * fxRate : perShare;
        const amount = Math.round(netPerShareInTwd * h.shares);
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
