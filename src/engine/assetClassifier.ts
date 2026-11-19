/**
 * 單一權威資產分類器 (Spec 0239 T02)
 * 統一判定標的為 ETF 或 STOCK，杜絕投信同名企業股（富邦金、國泰金、富邦媒、國泰建等）誤分類
 */

export type AssetClass = 'ETF' | 'STOCK';

/**
 * 台股 ETF / REITs 代碼嚴格正則：
 * - 00 開頭接 2~4 位數字 + 可選單一大寫英文字母尾碼 (如 0050, 00878, 00679B, 00631L, 00980A, 009800)
 * - 01 開頭接 3 位數字 + 可選單一大寫英文字母尾碼 (如 01001T REITs)
 */
const TW_CANONICAL_ETF_REGEX = /^(00\d{2,4}[A-Z]?|01\d{3}[A-Z]?)$/i;

/**
 * 擴充美股主流 ETF 白名單
 */
export const US_ETF_WHITELIST: ReadonlySet<string> = new Set([
  'VT', 'VOO', 'VTI', 'SPY', 'QQQ', 'QQQM', 'IVV', 'SCHD',
  'BND', 'AGG', 'VIG', 'VYM', 'JEPI', 'JEPQ', 'GLD', 'SLV',
  'VNQ', 'TLT', 'IEF', 'SHY', 'SGOV', 'SOXX', 'SMH', 'XLF',
  'XLK', 'XLE', 'XLV', 'XLY', 'XLP', 'XLU', 'XLI', 'XLB',
  'XLC', 'XLRE', 'EEM', 'VEA', 'VWO', 'VGK', 'TQQQ', 'SQQQ',
  'SOXL', 'ARKK', 'DIA', 'IWM', 'VXUS', 'BNDX',
]);

/**
 * 單一權威資產分類函式
 * 優先序：
 * 1. metaType 明確指定 ('ETF' / 'STOCK')
 * 2. 台股 ETF/REITs 嚴格代碼正則
 * 3. 美股主流 ETF 白名單
 * 4. 名稱明確包含 'ETF' 或 '指數股票型'（嚴禁包含富邦、國泰、元大等會誤殺金融/企業股的字詞）
 * 5. 其餘一律判定為 'STOCK'
 */
export function resolveAssetClass(
  symbol: string,
  name?: string,
  market?: 'TW' | 'US',
  metaType?: string
): AssetClass {
  // ① 顯式 metaType 最高優先權
  const normalizedMeta = metaType?.trim().toUpperCase();
  if (normalizedMeta === 'ETF') return 'ETF';
  if (normalizedMeta === 'STOCK') return 'STOCK';

  // 正規化代碼（去空白、轉大寫，並剝除 .TW / .TWO 後綴）
  const rawSym = (symbol || '').trim().toUpperCase();
  const baseSym = rawSym.replace(/\.(TWO|TW)$/i, '');

  // ② 台股 ETF / REITs 代碼嚴格正則
  if (market !== 'US' && TW_CANONICAL_ETF_REGEX.test(baseSym)) {
    return 'ETF';
  }

  // ③ 擴充美股主流 ETF 白名單
  if (US_ETF_WHITELIST.has(baseSym)) {
    return 'ETF';
  }

  // ④ 名稱明確包含 ETF 或 指數股票型（絕不匹配投信/金控品牌字眼）
  if (name) {
    const upperName = name.toUpperCase();
    if (upperName.includes('ETF') || name.includes('指數股票型')) {
      return 'ETF';
    }
  }

  // ⑤ 其餘預設為個股
  return 'STOCK';
}

/**
 * 相容函式：判斷標的是否為正規 ETF
 */
export function isCanonicalEtfSymbol(
  symbol: string,
  name?: string,
  market?: 'TW' | 'US',
  metaType?: string
): boolean {
  return resolveAssetClass(symbol, name, market, metaType) === 'ETF';
}
