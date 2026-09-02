import { MarketType, Currency, TradeType } from '../types/stock';
import { resolveOfficialSecurityName } from './stockNameResolver';

/**
 * 日期標準化解析器
 * 支援民國年 (113/05/20, 113-05-20, 1130520)、美式日期 (MM/DD/YYYY)、純數字 (YYYYMMDD) 與標準 ISO 格式
 */
export function normalizeDateString(rawDate: string): string {
  if (!rawDate || typeof rawDate !== 'string') return '';
  const trimmed = rawDate.trim();
  if (!trimmed || trimmed === 'N/A' || trimmed === '--') return '';

  // 1. 純數字西元年 YYYYMMDD (例如 20240520)
  if (/^\d{8}$/.test(trimmed)) {
    const y = trimmed.slice(0, 4);
    const m = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    return `${y}-${m}-${d}`;
  }

  // 2. 純數字民國年 YYYMMDD (例如 1130520 或 991231)
  if (/^\d{7}$/.test(trimmed)) {
    const y = parseInt(trimmed.slice(0, 3), 10) + 1911;
    const m = trimmed.slice(3, 5);
    const d = trimmed.slice(5, 7);
    return `${y}-${m}-${d}`;
  }

  // 3. 民國年格式 (例如 113/5/20, 113-05-20, 99/12/31)
  const rocMatch = trimmed.match(/^(\d{2,3})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (rocMatch) {
    const rocYear = parseInt(rocMatch[1], 10);
    // 民國年份通常在 50 ~ 150 之間
    if (rocYear < 1900) {
      const year = rocYear + 1911;
      const month = rocMatch[2].padStart(2, '0');
      const day = rocMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // 4. 西元年月日 YYYY/MM/DD 或 YYYY-MM-DD
  const standardMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (standardMatch) {
    const year = standardMatch[1];
    const month = standardMatch[2].padStart(2, '0');
    const day = standardMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 5. 美式日期 MM/DD/YYYY 或 MM-DD-YYYY
  const usMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (usMatch) {
    const month = usMatch[1].padStart(2, '0');
    const day = usMatch[2].padStart(2, '0');
    const year = usMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 6. 原生 Date 解析 fallback
  const parsedTimestamp = Date.parse(trimmed);
  if (!isNaN(parsedTimestamp)) {
    const d = new Date(parsedTimestamp);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return '';
}

/**
 * 數值與符號清洗器
 * 支援千分位 (12,345.67)、貨幣符號 ($50, NT$ 100, US$ 20)、百分比 (5%)、會計括號負數 (1,234.50)
 */
export function sanitizeNumeric(raw: string | number | undefined | null, fallback = 0): number {
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw === 'number') return isNaN(raw) ? fallback : raw;

  const str = String(raw).trim();
  if (!str || str === '--' || str === 'N/A' || str === '-') return fallback;

  // 檢查是否為括號負數，例如 (1,234.50)
  const isNegativeParen = /^\(.*\)$/.test(str);

  // 清除常見雜質：括號、逗點、貨幣符號、空格、百分比等
  const cleanStr = str
    .replace(/[()]/g, '')
    .replace(/,/g, '')
    .replace(/NT\$|US\$|\$|¥|€|£/gi, '')
    .replace(/%/g, '')
    .trim();

  const num = parseFloat(cleanStr);
  if (isNaN(num)) return fallback;

  return isNegativeParen ? -Math.abs(num) : num;
}

/**
 * 交易類別語意推斷器
 * 支援台美各大券商中文與英文字串動作識別
 */
export function inferTradeType(rawType: string | undefined | null): TradeType {
  if (!rawType || typeof rawType !== 'string') return 'BUY';
  const upper = rawType.trim().toUpperCase();

  // 1. CB 轉換 / 換股 / 合併
  if (upper.includes('CONVERSION') || upper.includes('可轉債') || upper.includes('CB') || upper.includes('債券轉換')) {
    return 'CB_CONVERSION';
  }
  if (upper.includes('MERGER') || upper.includes('換股') || upper.includes('合併')) {
    return 'STOCK_MERGER';
  }
  if (upper.includes('PREFERRED') || upper.includes('特別股') || upper.includes('贖回')) {
    return 'PREFERRED_REDEMPTION';
  }
  if (upper.includes('SPIN') || upper.includes('分拆')) {
    return 'SPIN_OFF';
  }
  if (upper.includes('TENDER') || upper.includes('收購') || upper.includes('私有化')) {
    return 'TENDER_OFFER';
  }

  // 2. 減資 / 認股增資
  if (upper.includes('REDUCTION') || upper.includes('減資')) {
    return 'CAPITAL_REDUCTION';
  }
  if (upper.includes('INCREASE') || upper.includes('增資') || upper.includes('認股')) {
    return 'CAPITAL_INCREASE';
  }

  // 3. 股票股利 / 拆股 (必須在現金股利之前比對，避免 DIVIDEND 誤判)
  if (
    upper.includes('STOCK_DIV') ||
    upper.includes('STOCK DIV') ||
    upper.includes('股票股利') ||
    upper.includes('配股') ||
    upper.includes('除權')
  ) {
    return 'STOCK_DIVIDEND';
  }
  if (upper.includes('SPLIT') || upper.includes('分割') || upper.includes('拆股')) {
    return 'STOCK_SPLIT';
  }

  // 4. 現金股利 / 配息
  if (upper.includes('DIV') || upper.includes('息') || upper.includes('股利')) {
    return 'DIVIDEND';
  }

  // 5. 賣出
  if (
    upper.includes('SELL') ||
    upper.includes('SLD') ||
    upper.includes('SOLD') ||
    upper.includes('賣')
  ) {
    return 'SELL';
  }

  // 6. 預設買進
  return 'BUY';
}

export interface SecurityResolved {
  symbol: string;
  name: string;
  market: MarketType;
  currency: Currency;
}

/**
 * 標的代碼與名稱智慧解析器
 * 自動清洗代碼雜質 (如 2330.TW -> 2330)、判定市場 (TW/US) 與幣別 (TWD/USD)，並自動補全官方名稱
 */
export function resolveSymbolAndName(
  rawSymbol: string | undefined | null,
  rawName?: string | null,
  rawMarket?: string | null
): SecurityResolved {
  let cleanSymbol = (rawSymbol || '').trim().toUpperCase();

  // 清洗後綴如 .TW, .TWO, .US 等
  cleanSymbol = cleanSymbol.replace(/\.(TW|TWO|US|O)$/i, '').trim();

  // 市場判定
  let market: MarketType = 'TW';
  const mUpper = (rawMarket || '').trim().toUpperCase();

  if (mUpper === 'US' || mUpper === '美股' || mUpper === 'USA') {
    market = 'US';
  } else if (mUpper === 'TW' || mUpper === '台股' || mUpper === '上市' || mUpper === '上櫃') {
    market = 'TW';
  } else if (cleanSymbol.length >= 4 && /^\d+$/.test(cleanSymbol)) {
    market = 'TW';
  } else if (/^[A-Z]{1,5}$/.test(cleanSymbol)) {
    market = 'US';
  }

  const currency: Currency = market === 'TW' ? 'TWD' : 'USD';
  const name = resolveOfficialSecurityName(cleanSymbol, rawName?.trim() || cleanSymbol);

  return {
    symbol: cleanSymbol,
    name,
    market,
    currency,
  };
}
