/**
 * YOC (成本殖利率, Yield On Cost) 與實質填息/貼息標籤計算模組
 * 遵循 KISS 原則與第一性原理，純函數零外部套件
 */

/**
 * 實質填息 / 貼息 / 自癒狀態代碼
 * FILLED: 實質填息 (現價已回補除息缺口)
 * UNFILLED: 貼息中 (現價低於除息前基準，處於領息但本金虧損狀態)
 * CLOSED_POSITION: 已結清部位 (該標的已全數平倉賣出，無需持續追蹤即時貼息)
 * PENDING_DATA: 待補除息價 (缺乏除息前收盤價或參考價數據，防禦性提示)
 */
export type DividendFillStatus = 'FILLED' | 'UNFILLED' | 'CLOSED_POSITION' | 'PENDING_DATA';

/**
 * 填息狀態判斷參數介面
 */
export interface DividendFillStatusParams {
  currentPrice: number;
  exPrice?: number;
  dividendPerShare: number;
  isClosedPosition?: boolean;
}

/**
 * 計算單股 YOC (成本殖利率, Yield on Cost)
 *
 * 公式: (每股年化配息 / 每股平均持股成本) * 100%
 *
 * @param annualDividendPerShare 每股年化配息 (元)
 * @param averageCostPrice 每股平均持股成本 (元)
 * @returns YOC 百分比 (四捨五入至小數第 2 位；若成本或配息 <= 0 則回傳 0)
 */
export function calculateYieldOnCost(
  annualDividendPerShare: number,
  averageCostPrice: number
): number {
  if (averageCostPrice <= 0 || annualDividendPerShare <= 0) {
    return 0;
  }

  const rawPercentage = (annualDividendPerShare / averageCostPrice) * 100;
  return Math.round((rawPercentage + Number.EPSILON) * 100) / 100;
}

/**
 * 計算部位總成本 YOC (依據總配息與總持股成本基準)
 *
 * 公式: (年度總配息毛額 TWD / 總成本基準 TWD) * 100%
 *
 * @param annualDividendGrossTwd 年度預估總配息毛額 (TWD)
 * @param totalCostBasisTwd 部位總成本基準 (TWD)
 * @returns YOC 百分比 (四捨五入至小數第 2 位；若成本基準或總配息 <= 0 則回傳 0)
 */
export function calculatePositionYieldOnCost(
  annualDividendGrossTwd: number,
  totalCostBasisTwd: number
): number {
  if (totalCostBasisTwd <= 0 || annualDividendGrossTwd <= 0) {
    return 0;
  }

  const rawPercentage = (annualDividendGrossTwd / totalCostBasisTwd) * 100;
  return Math.round((rawPercentage + Number.EPSILON) * 100) / 100;
}

/**
 * 判斷實質填息 / 貼息狀態
 *
 * 基準價定義: 除息參考價 + 每股除息金額 (即除息前一日收盤基準價)
 * 判定原則:
 * - 當現價 >= 除息前基準價 時，判定為 'FILLED' (實質填息，投資人真正賺到股息且本金未受損)
 * - 當現價 < 除息前基準價 時，判定為 'UNFILLED' (貼息中 / 本金返還假象)
 *
 * @param params 現價、除息參考價與每股配息
 * @returns 'FILLED' | 'UNFILLED'
 */
export function determineDividendFillStatus(params: DividendFillStatusParams): DividendFillStatus {
  const { currentPrice, exPrice, dividendPerShare, isClosedPosition } = params;

  // 1. 若該持股已被全數平倉賣出，標記為已結清部位
  if (isClosedPosition) {
    return 'CLOSED_POSITION';
  }

  // 2. 若缺乏除息參考價或數據無效，標記為待補除息價
  if (exPrice === undefined || exPrice === null || isNaN(exPrice) || exPrice <= 0) {
    return 'PENDING_DATA';
  }

  const preExDividendBenchmark = exPrice + dividendPerShare;

  // 3. 納入 1e-9 浮點運算防禦誤差容限
  if (currentPrice >= preExDividendBenchmark - 1e-9) {
    return 'FILLED';
  }

  return 'UNFILLED';
}

/**
 * 格式化填息狀態為繁體中文友善標籤
 *
 * @param status 'FILLED' | 'UNFILLED' | 'CLOSED_POSITION' | 'PENDING_DATA'
 * @returns '實質填息' | '貼息中' | '已結清' | '待補除息價'
 */
export function formatDividendFillStatusLabel(status: DividendFillStatus): string {
  switch (status) {
    case 'FILLED':
      return '實質填息';
    case 'UNFILLED':
      return '貼息中';
    case 'CLOSED_POSITION':
      return '已結清部位';
    case 'PENDING_DATA':
      return '待補除息價';
    default: {
      const _exhaustiveCheck: never = status;
      return _exhaustiveCheck;
    }
  }
}

/**
 * 解析標的現金股利之年化頻率倍數 (Spec 0230 領域層下沉，消滅 Feature Envy)
 *
 * @param symbol 標的代碼
 * @param market 市場類別 ('TW' | 'US')
 * @param customFrequency 自訂配息頻率 (可選)
 * @returns 年化乘數 (月配: 12, 季配: 4, 半年配: 2, 年配: 1)
 */
export function resolveDividendFrequencyMultiplier(
  symbol: string,
  market: 'TW' | 'US' = 'TW',
  frequency?: string
): number {
  if (frequency) {
    if (frequency === 'MONTHLY') return 12;
    if (frequency === 'QUARTERLY') return 4;
    if (frequency === 'SEMI_ANNUAL') return 2;
    if (frequency === 'ANNUAL') return 1;
  }

  const upper = symbol.toUpperCase();

  // 常見美股月配 ETF / REITs
  const US_MONTHLY_SYMBOLS = new Set(['O', 'MAIN', 'STAG', 'JEPI', 'JEPQ', 'TLTW', 'HYGW']);
  if (market === 'US') {
    if (US_MONTHLY_SYMBOLS.has(upper)) return 12;
    // 美股普通股與主流 ETF 預設均為季配
    return 4;
  }

  // 台股常見月配
  const TW_MONTHLY_SYMBOLS = new Set(['00929', '00934', '00936', '00940']);
  if (TW_MONTHLY_SYMBOLS.has(upper)) return 12;

  // 台股常見半年配
  const TW_SEMI_ANNUAL_SYMBOLS = new Set(['0050', '006208', '2454']);
  if (TW_SEMI_ANNUAL_SYMBOLS.has(upper)) return 2;

  // 台股常見季配
  const TW_QUARTERLY_SYMBOLS = new Set(['0056', '00878', '00919', '00713', '2330', '00888', '00900']);
  if (TW_QUARTERLY_SYMBOLS.has(upper)) return 4;

  // 台股其餘個股常態為夏秋年配
  return 1;
}
