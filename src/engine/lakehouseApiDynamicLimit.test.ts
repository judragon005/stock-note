// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createMarketApiMiddleware } from '../../scripts/market-sync/vite-market-middleware.cjs';
import {
  initSqliteLakehouseDb,
  getSqliteDbConnection,
  closeSqliteDb,
} from '../../scripts/market-sync/sqlite-db-core.cjs';

// 模擬 HTTP 請求
function simulateRequest(middleware, urlPath, method = 'GET') {
  return new Promise((resolve) => {
    let statusCode = 200;
    let headers = {};
    let body = '';

    const req = { url: urlPath, method };
    const res = {
      writeHead(code, h) {
        statusCode = code;
        headers = h;
      },
      end(data) {
        body = data;
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: statusCode, headers, data: parsed });
      },
    };

    middleware(req, res, () => {
      resolve({ status: 404, headers: {}, data: { error: 'PASSTHROUGH_NEXT' } });
    });
  });
}

describe('Spec 0188 / Ticket 03: 中介層 API 動態 Limit 查詢與預載視窗對齊 (TDD: Red)', () => {
  const testDbDir = path.resolve(process.cwd(), '.scratch/test-lakehouse-deep');
  let testDbPath = '';

  beforeEach(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    testDbPath = path.join(testDbDir, `test_api_limit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.db`);
    initSqliteLakehouseDb(testDbPath);

    const db = getSqliteDbConnection(testDbPath);
    // 注入 350 根連續日 K
    const insertStmt = db.prepare(`
      INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume, turnover)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    for (let i = 1; i <= 350; i++) {
      const year = 2025 + Math.floor(i / 365);
      const dayOfYear = String((i % 365) + 1).padStart(3, '0');
      const d = `${year}-01-${dayOfYear}`;
      insertStmt.run('2330', d, 100, 105, 95, 102, 102, 1000, 100000);
    }
    db.exec('COMMIT;');
  });

  afterEach(() => {
    closeSqliteDb();
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {}
  });

  it('1. GET /api/market/history/:symbol 未帶 limit 時，應精確預設回傳 250 筆日 K (極速預載視窗)', async () => {
    const middleware = createMarketApiMiddleware(testDbPath);
    const res = await simulateRequest(middleware, '/api/market/history/2330');

    expect(res.status).toBe(200);
    expect(res.data.symbol).toBe('2330');
    expect(res.data.candles).toHaveLength(250);
  });

  it('2. GET /api/market/history/:symbol?limit=300 傳入自訂天數時，應精確回傳 300 筆', async () => {
    const middleware = createMarketApiMiddleware(testDbPath);
    const res = await simulateRequest(middleware, '/api/market/history/2330?limit=300');

    expect(res.status).toBe(200);
    expect(res.data.candles).toHaveLength(300);
  });

  it('3. GET /api/market/history/:symbol?limit=all 傳入 all 時，應回傳在庫之全量 350 筆日 K', async () => {
    const middleware = createMarketApiMiddleware(testDbPath);
    const res = await simulateRequest(middleware, '/api/market/history/2330?limit=all');

    expect(res.status).toBe(200);
    expect(res.data.candles).toHaveLength(350);
  });
});
