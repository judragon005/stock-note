import { DailyCandle, MuscleBookerIndicatorPoint } from '../types/indicators';

export interface InstitutionalChipRow {
  symbol: string;
  name: string;
  foreignNetShares: number; // 張數
  trustNetShares: number;   // 張數
  dealerNetShares: number;  // 張數
  totalNetShares: number;   // 張數
}

const parseCleanNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const str = String(val).replace(/,/g, '').trim();
  if (str === '--' || str === '' || str === '---') return 0;
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

export function formatDateYMD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 解析 TWSE 官方 T86 三大法人買賣超全市場日報
 */
export function parseTwseT86BulkData(rawData: any): Record<string, InstitutionalChipRow> {
  const result: Record<string, InstitutionalChipRow> = {};
  if (!rawData || (rawData.stat !== 'OK' && rawData.stat !== 'ok') || !Array.isArray(rawData.data)) {
    return result;
  }

  for (const row of rawData.data) {
    if (!Array.isArray(row) || row.length < 12) continue;

    const symbol = String(row[0]).trim();
    const name = String(row[1]).trim();

    // 換算股數至張數 (除以 1000)
    const foreignNetShares = Math.round(parseCleanNumber(row[4]) / 1000);
    const trustNetShares = Math.round(parseCleanNumber(row[10]) / 1000);
    const dealerNetShares = Math.round(parseCleanNumber(row[11]) / 1000);
    const totalNetShares = foreignNetShares + trustNetShares + dealerNetShares;

    result[symbol] = {
      symbol,
      name,
      foreignNetShares,
      trustNetShares,
      dealerNetShares,
      totalNetShares,
    };
  }

  return result;
}

/**
 * 解析 TPEx 官方三大法人買賣超全市場日報
 */
export function parseTpexT86BulkData(rawData: any): Record<string, InstitutionalChipRow> {
  const result: Record<string, InstitutionalChipRow> = {};
  if (!rawData) return result;

  const tables = Array.isArray(rawData.tables) ? rawData.tables : [rawData];
  for (const table of tables) {
    const dataRows = Array.isArray(table?.data) ? table.data : Array.isArray(table?.aaData) ? table.aaData : null;
    if (!dataRows) continue;

    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length < 9) continue;
      const symbol = String(row[0]).trim();
      const name = String(row[1]).trim();

      const foreignNetShares = Math.round(parseCleanNumber(row[4]) / 1000);
      const trustNetShares = Math.round(parseCleanNumber(row[7]) / 1000);
      const dealerNetShares = Math.round(parseCleanNumber(row[8]) / 1000);
      const totalNetShares = foreignNetShares + trustNetShares + dealerNetShares;

      result[symbol] = {
        symbol,
        name,
        foreignNetShares,
        trustNetShares,
        dealerNetShares,
        totalNetShares,
      };
    }
  }

  return result;
}

/**
 * 解析 TWSE 每日收盤行情 (MI_INDEX)
 */
export function parseTwseDailyQuotesBulk(
  rawData: any,
  dateStr: string
): Record<string, DailyCandle> {
  const result: Record<string, DailyCandle> = {};
  if (!rawData || !Array.isArray(rawData.tables)) return result;

  // 搜尋包含每日收盤行情的資料表
  for (const table of rawData.tables) {
    if (!Array.isArray(table.data)) continue;

    for (const row of table.data) {
      if (!Array.isArray(row) || row.length < 9) continue;
      const symbol = String(row[0]).trim();
      // 跳過權證或特殊非股票標的 (若代號過長或不符)
      if (symbol.length > 6) continue;

      const volume = parseCleanNumber(row[2]);
      const open = parseCleanNumber(row[5]);
      const high = parseCleanNumber(row[6]);
      const low = parseCleanNumber(row[7]);
      const close = parseCleanNumber(row[8]);

      if (close > 0) {
        result[symbol] = {
          date: dateStr,
          open: open > 0 ? open : close,
          high: high > 0 ? high : close,
          low: low > 0 ? low : close,
          close,
          volume,
        };
      }
    }
  }

  return result;
}

/**
 * 解析 TPEx 每日收盤行情
 */
export function parseTpexDailyQuotesBulk(
  rawData: any,
  dateStr: string
): Record<string, DailyCandle> {
  const result: Record<string, DailyCandle> = {};
  if (!rawData) return result;

  const tables = Array.isArray(rawData.tables) ? rawData.tables : [rawData];
  for (const table of tables) {
    const dataRows = Array.isArray(table?.data) ? table.data : Array.isArray(table?.aaData) ? table.aaData : null;
    if (!dataRows) continue;

    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length < 7) continue;
      const symbol = String(row[0]).trim();
      if (symbol.length > 6) continue;

      const close = parseCleanNumber(row[2]);
      const open = parseCleanNumber(row[4]);
      const high = parseCleanNumber(row[5]);
      const low = parseCleanNumber(row[6]);
      const volume = parseCleanNumber(row[7]);

      if (close > 0) {
        result[symbol] = {
          date: dateStr,
          open: open > 0 ? open : close,
          high: high > 0 ? high : close,
          low: low > 0 ? low : close,
          close,
          volume,
        };
      }
    }
  }

  return result;
}

import { calculateMuscleBookerIndicators } from './muscleBookerEngine';

/**
 * 本地 CPU 快速增量計算全量技術指標 (委託肌肉書僮 SSOT 引擎)
 */
export function computeIncrementalIndicators(
  candles: DailyCandle[]
): MuscleBookerIndicatorPoint[] {
  if (!candles || candles.length === 0) return [];
  return calculateMuscleBookerIndicators(candles);
}
