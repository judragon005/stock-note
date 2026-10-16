// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getSqliteDbConnection, initSqliteLakehouseDb } from '../../scripts/market-sync/sqlite-db-core.cjs';
import { parseHistoricalInstitutionalContent } from '../../scripts/market-sync/ingest-historical-chips.cjs';
import { extractCandlesForLakehouse } from '../../scripts/market-sync/backfill-local-csv.cjs';

describe('Spec 0188 / Ticket 01: 湖倉索引補強與入庫深度解耦 (TDD: Red)', () => {
  const testDbDir = path.resolve(process.cwd(), '.scratch/test-lakehouse-deep');
  let testDbPath = '';

  beforeEach(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    testDbPath = path.join(testDbDir, `test_indexing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.db`);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {}
  });

  it('1. initSqliteLakehouseDb 應為 tw_institutional_chips 建立 idx_chips_symbol_date 複合索引', () => {
    const db = initSqliteLakehouseDb(testDbPath);
    const indexes = db.prepare("PRAGMA index_list('tw_institutional_chips')").all();
    const hasSymbolDateIndex = indexes.some(idx => idx.name === 'idx_chips_symbol_date');
    expect(hasSymbolDateIndex).toBe(true);
  });

  it('2. parseHistoricalInstitutionalContent 當未傳入 limit 或傳入 0 時，應全量保留所有天數不再截斷至 260 筆', () => {
    // 構造 300 天的法人 CSV 文本
    const lines = ['﻿日期,股票代號,法人類別,買進股數,賣出股數,買賣超股數'];
    for (let i = 1; i <= 300; i++) {
      const dayStr = String(i).padStart(3, '0');
      lines.push(`2025-01-${dayStr},2330,Foreign_Investor,1000000,500000,500000`);
    }
    const csvContent = lines.join('\n');

    // 未指定 limit (預設應為 0 全量)
    const records = parseHistoricalInstitutionalContent(csvContent);
    expect(records.length).toBe(300);

    // 明確指定 limit = 0 (全量)
    const recordsAll = parseHistoricalInstitutionalContent(csvContent, 0);
    expect(recordsAll.length).toBe(300);
  });

  it('3. extractCandlesForLakehouse 當未傳入 limit 或傳入 0 時，應全量保留所有日 K 不再截斷至 260 筆', () => {
    const mockCandles = [];
    for (let i = 1; i <= 400; i++) {
      mockCandles.push({
        date: `2025-01-${String(i).padStart(3, '0')}`,
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000,
      });
    }

    // 未指定 limit (預設應為 0 全量)
    const extracted = extractCandlesForLakehouse(mockCandles);
    expect(extracted.length).toBe(400);

    // 明確指定 limit = 0 (全量)
    const extractedAll = extractCandlesForLakehouse(mockCandles, 0);
    expect(extractedAll.length).toBe(400);
  });
});
