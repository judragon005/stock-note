import { StockDictionaryItem } from '../types/stockDictionary';
import { batchImportStockDictionary } from './stockNameResolver';
import { fetchWithCORSProxy } from './priceFetcher';
import { logger } from '../utils/logger';

export interface SyncStockResult {
  success: boolean;
  twseCount: number;
  tpexCount: number;
  totalSynced: number;
  error?: string;
}

/**
 * 嚴格過濾台股合法標的，排除上萬檔短天期衍生性認購售權證、牛熊證與可轉換公司債 (CB)
 */
export function isValidTaiwanSecurity(code: string, name: string): boolean {
  const cleanCode = code.trim().toUpperCase();
  const cleanName = name.trim();

  // 1. 排除空值
  if (!cleanCode || !cleanName) return false;

  // 2. 排除名稱中明顯為權證/牛熊證/展延證
  if (
    /[購售牛熊]/.test(cleanName) ||
    cleanName.includes('展延') ||
    cleanName.includes('認購') ||
    cleanName.includes('認售')
  ) {
    return false;
  }

  // 3. 排除 6 碼權證代碼 (以 03~08 或 7 開頭之 6 位數)
  if (/^(0[3-8]\d{4}|7\d{5})[A-Z]?$/.test(cleanCode)) {
    return false;
  }

  // 4. 優先允許 00 開頭之 ETF / 主動型 ETF / 債券 ETF (如 0050, 00878, 00679B, 00937B, 00403A, 009816)
  if (/^00\d{2,4}[A-Z0-9]?$/i.test(cleanCode)) return true;

  // 5. 排除 5 碼可轉債 (非 00 開頭，4碼數字 + 第5碼為數字 1~9，例如 23301, 65471)
  if (!cleanCode.startsWith('00') && /^\d{4}[1-9]$/.test(cleanCode)) {
    return false;
  }

  // 6. 允許合法證券格式：
  // a) 標準 4 碼股票 / 上櫃 / 興櫃 / 創新板 (如 2330, 6547, 7700)
  if (/^\d{4}$/.test(cleanCode)) return true;

  // b) 4 碼 + 1 英文字母特別股 (如 2881A, 2882B)
  if (/^\d{4}[A-Z]$/.test(cleanCode)) return true;

  // c) 02 開頭之 ETN (如 020000)
  if (/^02\d{4}[A-Z0-9]?$/i.test(cleanCode)) return true;

  // d) 91 開頭之 TDR 存託憑證 (如 9105)
  if (/^91\d{2,4}$/.test(cleanCode)) return true;

  // 其它一般合規股票代碼 (長度 <= 6 且非 03~08/7 開頭)
  if (cleanCode.length <= 6 && !/^(0[3-8]|7)/.test(cleanCode)) {
    return true;
  }

  return false;
}

/**
 * 臺灣證券交易所 (TWSE) 與 櫃買中心 (TPEx) 官方清單同步引擎
 */
export async function syncOfficialTaiwanStockList(
  customFetch: (url: string, timeoutMs?: number) => Promise<any> = fetchWithCORSProxy
): Promise<SyncStockResult> {
  let twseCount = 0;
  let tpexCount = 0;
  const itemsMap = new Map<string, StockDictionaryItem>();
  const now = new Date().toISOString();

  try {
    // 1. 抓取 TWSE 上市每日全量代碼與名稱清單
    const twseUrl = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';
    try {
      const twseData = await customFetch(twseUrl, 8000);
      if (Array.isArray(twseData)) {
        for (const row of twseData) {
          const rawCode = row.Code || row.code || row.symbol || row.SecuritiesCompanyCode;
          const rawName = row.Name || row.name || row.CompanyAbbreviation;
          if (rawCode && rawName && typeof rawCode === 'string' && typeof rawName === 'string') {
            const cleanCode = rawCode.trim().toUpperCase();
            const cleanName = rawName.trim();
            if (isValidTaiwanSecurity(cleanCode, cleanName) && !itemsMap.has(cleanCode)) {
              itemsMap.set(cleanCode, {
                symbol: cleanCode,
                name: cleanName,
                market: 'TW',
                source: 'OPENAPI_SYNC',
                updatedAt: now,
              });
              twseCount++;
            }
          }
        }
      }
    } catch (err) {
      logger.warn('Failed to sync TWSE openapi list:', err);
    }

    // 2. 抓取 TPEx 櫃買中心主板 (上櫃) 代碼與名稱清單
    const tpexMainUrl = 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes';
    try {
      const tpexData = await customFetch(tpexMainUrl, 8000);
      if (Array.isArray(tpexData)) {
        for (const row of tpexData) {
          const rawCode =
            row.SecId || row.secId || row.SecuritiesCompanyCode || row.Code || row.symbol;
          const rawName =
            row.CompanyName || row.companyName || row.CompanyAbbreviation || row.Name || row.name;
          if (rawCode && rawName && typeof rawCode === 'string' && typeof rawName === 'string') {
            const cleanCode = rawCode.trim().toUpperCase();
            const cleanName = rawName.trim();
            if (isValidTaiwanSecurity(cleanCode, cleanName) && !itemsMap.has(cleanCode)) {
              itemsMap.set(cleanCode, {
                symbol: cleanCode,
                name: cleanName,
                market: 'TW',
                source: 'OPENAPI_SYNC',
                updatedAt: now,
              });
              tpexCount++;
            }
          }
        }
      }
    } catch (err) {
      logger.warn('Failed to sync TPEx mainboard list:', err);
    }

    // 3. 抓取 TPEx 興櫃股票清單
    const tpexEsbUrl = 'https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics';
    try {
      const esbData = await customFetch(tpexEsbUrl, 8000);
      if (Array.isArray(esbData)) {
        for (const row of esbData) {
          const rawCode =
            row.SecId || row.secId || row.SecuritiesCompanyCode || row.Code || row.symbol;
          const rawName =
            row.CompanyName || row.companyName || row.CompanyAbbreviation || row.Name || row.name;
          if (rawCode && rawName && typeof rawCode === 'string' && typeof rawName === 'string') {
            const cleanCode = rawCode.trim().toUpperCase();
            const cleanName = rawName.trim();
            if (isValidTaiwanSecurity(cleanCode, cleanName) && !itemsMap.has(cleanCode)) {
              itemsMap.set(cleanCode, {
                symbol: cleanCode,
                name: cleanName,
                market: 'TW',
                source: 'OPENAPI_SYNC',
                updatedAt: now,
              });
              tpexCount++;
            }
          }
        }
      }
    } catch (err) {
      logger.warn('Failed to sync TPEx ESB list:', err);
    }

    const itemsToImport = Array.from(itemsMap.values());

    // 4. 若抓取到任何資料，批次匯入本地字典
    if (itemsToImport.length > 0) {
      batchImportStockDictionary(itemsToImport);
      return {
        success: true,
        twseCount,
        tpexCount,
        totalSynced: itemsToImport.length,
      };
    }

    // 若兩者皆未抓到，且先前已有錯誤
    if (twseCount === 0 && tpexCount === 0) {
      throw new Error('未取得任何 TWSE / TPEx 官方清單資料，請確認網路連線或稍後再試。');
    }

    return {
      success: true,
      twseCount,
      tpexCount,
      totalSynced: itemsToImport.length,
    };
  } catch (err: any) {
    logger.error('syncOfficialTaiwanStockList encountered error:', err);
    return {
      success: false,
      twseCount: 0,
      tpexCount: 0,
      totalSynced: 0,
      error: err?.message || '同步臺灣證交所與櫃買中心清單時發生未預期錯誤',
    };
  }
}
