// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getSqliteDbConnection, initSqliteLakehouseDb } from '../../scripts/market-sync/sqlite-db-core.cjs';
import {
  saveAlignedCandlesBatchToSqlite,
  extractCandlesForLakehouse,
} from '../../scripts/market-sync/backfill-local-csv.cjs';

describe('Ticket 01: 台股 2,361 檔歷史 CSV 250+ 交易日日 K 批次入庫模組 (TDD)', () => {
  const testDbDir = path.resolve(process.cwd(), '.scratch/test-lakehouse-deep');
  let testDbPath = '';

  beforeEach(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    testDbPath = path.join(testDbDir, `test_lakehouse_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.db`);
    initSqliteLakehouseDb(testDbPath);
  });

  afterEach(() => {
    // 測試完成後保留或安全容錯刪除
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {}
  });

  it('1. extractCandlesForLakehouse 應能自長天期對齊日 K 中截取最近 260 根 (>= 250 根)', () => {
    // 構造 350 根日 K
    const longCandles = Array.from({ length: 350 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(3, '0')}`,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 102 + i,
      volume: 1000 + i,
    }));

    const result = extractCandlesForLakehouse(longCandles, 260);
    expect(result.length).toBe(260);
    // 應取最後 260 根 (由舊到新)
    expect(result[0].date).toBe(longCandles[90].date);
    expect(result[259].date).toBe(longCandles[349].date);
  });

  it('2. extractCandlesForLakehouse 若總長度不足 260 根，應完整保留現有長度', () => {
    const shortCandles = Array.from({ length: 80 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      open: 50,
      high: 52,
      low: 49,
      close: 51,
      volume: 500,
    }));

    const result = extractCandlesForLakehouse(shortCandles, 260);
    expect(result.length).toBe(80);
  });

  it('3. saveAlignedCandlesBatchToSqlite 應支援將 260 根日 K 完整寫入 daily_candles 並維持快速檢索', () => {
    const candles260 = Array.from({ length: 260 }, (_, i) => ({
      d: `2025-10-${String(i + 1).padStart(3, '0')}`,
      o: 900 + i,
      h: 910 + i,
      l: 890 + i,
      c: 905 + i,
      v: 25000000,
    }));

    const candlesMap = {
      '2330': candles260,
    };

    const count = saveAlignedCandlesBatchToSqlite(candlesMap, testDbPath);
    expect(count).toBe(260);

    const db = getSqliteDbConnection(testDbPath);
    const rows = db
      .prepare('SELECT * FROM daily_candles WHERE symbol = ? ORDER BY date DESC')
      .all('2330');

    expect(rows.length).toBe(260);
    // 覆蓋索引查詢時間驗證
    const t0 = performance.now();
    const queried = db
      .prepare('SELECT * FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT 250')
      .all('2330');
    const t1 = performance.now();

    expect(queried.length).toBe(250);
    expect(t1 - t0).toBeLessThan(50); // 查詢時間應極速小於 50ms (通常 < 5ms)
  });

  describe('Ticket 02: 日 K 湖倉查詢 API 與前端 Loader 穿透 (TDD)', () => {
    it('應能模擬 /api/market/history/:symbol?limit=250 正確回傳 250 筆升冪排序之日 K', () => {
      const candles280 = Array.from({ length: 280 }, (_, i) => ({
        d: `2025-01-${String(i + 1).padStart(3, '0')}`,
        o: 100,
        h: 105,
        l: 95,
        c: 102,
        v: 1000,
      }));

      saveAlignedCandlesBatchToSqlite({ '0050': candles280 }, testDbPath);

      const db = getSqliteDbConnection(testDbPath);
      const limit = 250;
      const rawDesc = db
        .prepare('SELECT * FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT ?')
        .all('0050', limit);

      // 轉為由舊至新
      rawDesc.reverse();

      expect(rawDesc.length).toBe(250);
      expect(rawDesc[0].date).toBe('2025-01-031'); // 280 - 250 + 1
      expect(rawDesc[249].date).toBe('2025-01-280');
    });
  });
});
