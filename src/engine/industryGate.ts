/**
 * 產業隔離與景氣循環防禦閘門 (Spec 0123)
 * Industry Gate & Cyclical Guard Engine
 */

import type { IndustryAttribute } from '../types/financialForensic';

/**
 * 知名金融業代碼清單（美股）
 */
const US_FINANCIAL_SYMBOLS = new Set([
  'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'BRK.A', 'BRK.B', 'BLK', 'SCHW',
  'AXP', 'USB', 'PNC', 'TFC', 'COF', 'MET', 'PRU', 'AIG', 'TRV', 'ALL',
]);

/**
 * 金融業產業關鍵字（英文與中文）
 */
const FINANCIAL_SECTOR_KEYWORDS = [
  'FINANCIAL', 'BANK', 'INSURANCE', 'ASSET MANAGEMENT', 'BROKERAGE',
  'CREDIT SERVICES', 'SAVINGS', 'FINANCE',
  '金融', '保險', '銀行', '證券', '金控',
];

/**
 * 知名強週期景氣循環股代碼清單
 */
const CYCLICAL_SYMBOLS = new Set([
  // 台股航運三雄
  '2603', '2609', '2615',
  // 台股記憶體族群
  '2408', '2344', '2337', '3006',
  // 台股面板雙虎
  '2409', '3481',
  // 美股原物料、鋼鐵、海運、記憶體
  'ZIM', 'CLF', 'X', 'NUE', 'STLD', 'FCX', 'AA', 'MOS', 'NTR', 'MU',
]);

/**
 * 強週期景氣循環產業關鍵字
 */
const CYCLICAL_SECTOR_KEYWORDS = [
  'BASIC MATERIALS', 'METALS & MINING', 'STEEL', 'CHEMICALS', 'MARINE SHIPPING',
  'SHIPPING', 'SEMICONDUCTOR MEMORY', 'AIR FREIGHT & LOGISTICS',
  '鋼鐵', '航運', '海運', '塑膠', '橡膠', '造紙', '水泥',
];

/**
 * 景氣循環股高峰警語標籤文字
 */
export const CYCLICAL_INDUSTRY_ALERT_TEXT =
  '⚠️ 景氣循環提醒：本標的屬於強週期類股，單季獲利易受全球供需與報價大幅波動，勿將單季高獲利盲目年化，請審慎評估景氣反轉風險。';

/**
 * 金融保險業指標豁免備註
 */
export const FINANCIALS_EXEMPTION_NOTE =
  '🏦 金融保險專用模型：存款負債結構豁免，已自動豁免負債比率與存貨週轉指標，著重評估 ROE、ROA 與淨利年增率。';

/**
 * 判定標的是否屬於金融保險控股業
 */
export function isFinancialIndustry(symbol: string, sector?: string): boolean {
  if (!symbol) return false;
  const cleanSymbol = symbol.trim().toUpperCase();

  // 1. 台股代碼規則：28 開頭均為金融保險類股 (2801 ~ 2892)
  if (/^28\d{2}$/.test(cleanSymbol)) {
    return true;
  }

  // 2. 美股代碼字典比對
  if (US_FINANCIAL_SYMBOLS.has(cleanSymbol)) {
    return true;
  }

  // 3. 產業類別 (Sector / Industry) 關鍵字比對
  if (sector) {
    const upperSector = sector.toUpperCase();
    if (FINANCIAL_SECTOR_KEYWORDS.some((kw) => upperSector.includes(kw))) {
      return true;
    }
  }

  return false;
}

/**
 * 判定標的是否屬於強週期景氣循環類股
 */
export function isCyclicalIndustry(symbol: string, sector?: string): boolean {
  if (!symbol) return false;
  const cleanSymbol = symbol.trim().toUpperCase();

  // 1. 台股代碼規則：
  // 20XX: 鋼鐵工業
  // 13XX: 塑膠工業
  // 11XX: 水泥工業
  if (/^(20|13|11)\d{2}$/.test(cleanSymbol)) {
    return true;
  }

  // 2. 固定代碼比對 (航運三雄、記憶體、美股原物料等)
  if (CYCLICAL_SYMBOLS.has(cleanSymbol)) {
    return true;
  }

  // 3. 產業關鍵字比對
  if (sector) {
    const upperSector = sector.toUpperCase();
    if (CYCLICAL_SECTOR_KEYWORDS.some((kw) => upperSector.includes(kw))) {
      return true;
    }
  }

  return false;
}

/**
 * 解析標的的標準產業屬性
 */
export function resolveIndustryAttribute(symbol: string, sector?: string): IndustryAttribute {
  if (isFinancialIndustry(symbol, sector)) {
    return 'FINANCIALS';
  }
  if (isCyclicalIndustry(symbol, sector)) {
    return 'CYCLICAL';
  }
  return 'STANDARD';
}

/**
 * 現金轉換週期 (CCC) 的動態解讀文字
 */
export function getCashConversionCycleLabel(cccDays: number): string {
  if (cccDays < 0) {
    return `CCC 為負 (${cccDays.toFixed(1)} 天)：具備極強上下游議價定價權，直接利用供應商資金營運。`;
  }
  if (cccDays <= 45) {
    return `CCC 週轉快速 (${cccDays.toFixed(1)} 天)：營運資本充裕，現金回收效率優異。`;
  }
  if (cccDays <= 90) {
    return `CCC 處於健康水準 (${cccDays.toFixed(1)} 天)。`;
  }
  return `CCC 偏長 (${cccDays.toFixed(1)} 天)：資金滯留在應收與存貨期間較長，需關注現金流流動性。`;
}
