/**
 * taxOptimizationGuard.ts
 * Spec 0183 (Ticket 05): 二代健保單筆 2 萬拆單防禦與所得稅抵減警報
 * 純前端算力，零外部 API 依賴
 */

export interface Nhi20kCheckInput {
  symbol: string;
  name: string;
  currentShares: number;
  cashDividendPerShare: number;
}

export interface Nhi20kOptimizationResult {
  symbol: string;
  name: string;
  grossDividendTwd: number;
  triggersNhiDeduction: boolean; // 是否超過 20,000 門檻觸發 2.11% 扣繳
  nhiFeeTwd: number; // 預估扣繳金額
  isSplitRecommended: boolean; // 是否在微調推薦區間 (20,000 ~ 25,000 元)
  recommendedSafeShares: number; // 建議安全持股數 (剛好低於 2 萬)
  sharesToTrim: number; // 建議除息前微調賣出股數
  potentialSavingsTwd: number; // 可省下金額
  guidanceMessage: string;
}

export interface DividendTaxDeductionStats {
  totalDividendTwd: number;
  deductionRate: number; // 8.5%
  maxCapTwd: number; // 80,000 元
  estimatedDeductionAmountTwd: number; // 實際可抵減稅額
  remainingDeductionCapacityTwd: number; // 剩餘可抵減額度
  isCapReached: boolean;
  effectiveThresholdTwd: number; // 941,176 元 (80,000 / 0.085)
}

// 台灣法定門檻常數
const NHI_THRESHOLD_TWD = 20000;
const NHI_RATE = 0.0211; // 2.11%
const TAIWAN_DIVIDEND_DEDUCTION_RATE = 0.085; // 8.5%
const TAIWAN_DIVIDEND_DEDUCTION_CAP = 80000; // 80,000 元

/**
 * 評估單筆股息是否觸發二代健保 2.11% 扣繳，以及是否值得在除息前拆單/微調調節
 */
export function evaluateNhi20kOptimization(input: Nhi20kCheckInput): Nhi20kOptimizationResult {
  const shares = Math.max(0, input.currentShares);
  const dps = Math.max(0, input.cashDividendPerShare);
  const grossDividend = Math.round(shares * dps);

  const triggersNhiDeduction = grossDividend >= NHI_THRESHOLD_TWD;
  const nhiFeeTwd = triggersNhiDeduction ? Math.round(grossDividend * NHI_RATE) : 0;

  // 推薦微調區間：介於 20,000 ~ 25,000 元之間，只需小幅調節幾百股即可省下數百元
  const isSplitRecommended = triggersNhiDeduction && grossDividend <= 25000;

  let recommendedSafeShares = shares;
  let sharesToTrim = 0;
  let potentialSavingsTwd = 0;
  let guidanceMessage = triggersNhiDeduction
    ? `單筆股息預估 NT$ ${grossDividend.toLocaleString()}，將扣繳 2.11% 二代健保費 NT$ ${nhiFeeTwd.toLocaleString()}。`
    : `單筆股息預估 NT$ ${grossDividend.toLocaleString()}，未達 20,000 元門檻，免扣二代健保。`;

  if (isSplitRecommended && dps > 0) {
    // 目標：股息最高為 19,999 元
    recommendedSafeShares = Math.floor((NHI_THRESHOLD_TWD - 1) / dps);
    sharesToTrim = Math.max(0, shares - recommendedSafeShares);
    potentialSavingsTwd = nhiFeeTwd;
    guidanceMessage = `⚠️ 剛好跨越二代健保門檻！建議除息前微調賣出 ${sharesToTrim.toLocaleString()} 股（保留 ${recommendedSafeShares.toLocaleString()} 股），單筆股息降至 NT$ 19,999 以下，可合法省下 NT$ ${potentialSavingsTwd.toLocaleString()} 扣繳款！`;
  }

  return {
    symbol: input.symbol,
    name: input.name,
    grossDividendTwd: grossDividend,
    triggersNhiDeduction,
    nhiFeeTwd,
    isSplitRecommended,
    recommendedSafeShares,
    sharesToTrim,
    potentialSavingsTwd,
    guidanceMessage,
  };
}

/**
 * 統計當年度本國應稅股利與 8.5% 綜合所得稅抵減額度
 */
export function calculateDividendTaxDeductionStats(totalDividendTwd: number): DividendTaxDeductionStats {
  const total = Math.max(0, totalDividendTwd);
  const rawDeduction = Math.round(total * TAIWAN_DIVIDEND_DEDUCTION_RATE);
  const estimatedDeductionAmountTwd = Math.min(rawDeduction, TAIWAN_DIVIDEND_DEDUCTION_CAP);
  const remainingDeductionCapacityTwd = Math.max(0, TAIWAN_DIVIDEND_DEDUCTION_CAP - estimatedDeductionAmountTwd);
  const isCapReached = estimatedDeductionAmountTwd >= TAIWAN_DIVIDEND_DEDUCTION_CAP;
  const effectiveThresholdTwd = Math.round(TAIWAN_DIVIDEND_DEDUCTION_CAP / TAIWAN_DIVIDEND_DEDUCTION_RATE);

  return {
    totalDividendTwd: total,
    deductionRate: TAIWAN_DIVIDEND_DEDUCTION_RATE,
    maxCapTwd: TAIWAN_DIVIDEND_DEDUCTION_CAP,
    estimatedDeductionAmountTwd,
    remainingDeductionCapacityTwd,
    isCapReached,
    effectiveThresholdTwd,
  };
}
