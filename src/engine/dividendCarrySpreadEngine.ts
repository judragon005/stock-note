/**
 * 質押借貸淨利差 (Carry Spread) 與累計匯費警報模組
 * 遵循 KISS 原則與第一性原理，純函數零外部套件
 */

/**
 * 質押借貸淨利差計算參數
 */
export interface CarrySpreadParams {
  dividendIncomeTwd: number;
  loanInterestExpenseTwd: number;
}

/**
 * 質押借貸淨利差計算結果
 */
export interface CarrySpreadResult {
  netCashflowTwd: number;
  isNegativeSpread: boolean;
}

/**
 * 計算質押借貸淨利差 (Carry Spread)
 *
 * @param params 股息收入與質押借貸利息支出 (TWD)
 * @returns 淨現金流與是否出現負利差警示
 */
export function calculateNetCarrySpread(params: CarrySpreadParams): CarrySpreadResult {
  const { dividendIncomeTwd, loanInterestExpenseTwd } = params;
  const netCashflowTwd = dividendIncomeTwd - loanInterestExpenseTwd;
  const isNegativeSpread = netCashflowTwd < 0;

  return {
    netCashflowTwd,
    isNegativeSpread,
  };
}

/**
 * 跨行匯費損耗評估參數
 */
export interface WireFeeFrictionParams {
  payoutAmountTwd: number;
  wireFeeTwd: number;
}

/**
 * 跨行匯費損耗評估結果
 */
export interface WireFeeFrictionResult {
  feeRatioPct: number;
  isHighFrictionAlert: boolean;
  alertMessage?: string;
}

/**
 * 評估單筆配息之跨行匯費摩擦損耗與微額警報
 *
 * 當單筆配息金額 < 500 元且匯費 >= 10 元時，觸發高摩擦耗損警報。
 *
 * @param params 配息入帳金額與跨行匯費 (TWD)
 * @returns 費率百分比、是否警報與警示文案
 */
export function evaluateWireFeeFriction(params: WireFeeFrictionParams): WireFeeFrictionResult {
  const { payoutAmountTwd, wireFeeTwd } = params;

  // 計算費率百分比，四捨五入至小數點後第 2 位
  const feeRatioPct =
    payoutAmountTwd > 0
      ? Number(((wireFeeTwd / payoutAmountTwd) * 100).toFixed(2))
      : 0;

  // 警報門檻：單筆配息小於 500 元且匯費大於等於 10 元
  if (payoutAmountTwd < 500 && wireFeeTwd >= 10) {
    const roundedPayout = Math.round(payoutAmountTwd);
    const roundedFee = Math.round(wireFeeTwd);
    const alertMessage = `單筆配息 NT$ ${roundedPayout} 遭扣跨行匯費 NT$ ${roundedFee}，摩擦耗損達 ${feeRatioPct.toFixed(1)}%，建議變更收益分配至保管銀行`;

    return {
      feeRatioPct,
      isHighFrictionAlert: true,
      alertMessage,
    };
  }

  return {
    feeRatioPct,
    isHighFrictionAlert: false,
  };
}

/**
 * 匯費損耗項目介面
 */
export interface WireFeeItem {
  wireFeeTwd?: number;
}

/**
 * 計算歷史累計跨行匯費損耗總額
 *
 * @param items 配息項目陣列
 * @returns 累計跨行匯費總額 (TWD)
 */
export function calculateTotalWireFeeLoss(items: Array<WireFeeItem>): number {
  return items.reduce((sum, item) => sum + (item.wireFeeTwd ?? 0), 0);
}
