import { describe, it, expect, vi, beforeEach } from 'vitest';

declare const require: (id: string) => any;

describe('Spec 0168 / Ticket 08: 台美雙軌全歷史回補總控與中介層端點', () => {
  const {
    parseBackfillCliArgs,
    getBackfillCheckpoint,
    saveBackfillCheckpoint,
    getBackfillGlobalStatus,
    triggerBackfillTask,
    resetBackfillStateForTest,
  } = require('../../scripts/market-sync/backfill-full-market-history.cjs');

  const { createMarketApiMiddleware } = require('../../scripts/market-sync/vite-market-middleware.cjs');

  beforeEach(() => {
    resetBackfillStateForTest();
    vi.restoreAllMocks();
  });

  describe('1. 命令列參數解析 (CLI Args Parsing)', () => {
    it('應支援預設參數 (--market=ALL, --days=250)', () => {
      const config = parseBackfillCliArgs([]);
      expect(config.market).toBe('ALL');
      expect(config.days).toBe(250);
      expect(config.throttleMs).toBe(3000);
    });

    it('應正確解析自訂參數 --market=TW --days=60 --throttle=1500', () => {
      const config = parseBackfillCliArgs([
        '--market=TW',
        '--days=60',
        '--throttle=1500',
      ]);
      expect(config.market).toBe('TW');
      expect(config.days).toBe(60);
      expect(config.throttleMs).toBe(1500);
    });
  });

  describe('2. SQLite sync_checkpoints 斷點讀寫', () => {
    it('saveBackfillCheckpoint 與 getBackfillCheckpoint 應能正確保存與讀取進度 JSON', () => {
      const path = require('path');
      const os = require('os');
      const fs = require('fs');
      const { initSqliteLakehouseDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');

      const tempDbPath = path.join(os.tmpdir(), `test_checkpoint_${Date.now()}.db`);
      try {
        const db = initSqliteLakehouseDb(tempDbPath);
        const taskKey = 'TW_DATE_DRIVEN_2026';
        const payload = {
          completedDates: ['2026-10-06', '2026-10-07'],
          lastProcessedDate: '2026-10-07',
          totalCandles: 4800,
        };

        saveBackfillCheckpoint(db, taskKey, payload);
        const saved = getBackfillCheckpoint(db, taskKey);
        expect(saved).toBeDefined();
        expect(saved.lastProcessedDate).toBe('2026-10-07');
        expect(saved.completedDates).toEqual(['2026-10-06', '2026-10-07']);
        expect(saved.totalCandles).toBe(4800);
      } finally {
        if (fs.existsSync(tempDbPath)) {
          try { fs.unlinkSync(tempDbPath); } catch {}
        }
      }
    });
  });

  describe('3. 中介層端點 GET /api/market/backfill-status 與 POST /api/market/backfill-all', () => {
    it('GET /api/market/backfill-status 初始狀態應回傳 isRunning: false', () => {
      const middleware = createMarketApiMiddleware();
      let responseBody = '';
      let statusCode = 0;

      const req: any = {
        url: '/api/market/backfill-status',
        method: 'GET',
      };
      const res: any = {
        writeHead: vi.fn((code: number) => {
          statusCode = code;
        }),
        end: vi.fn((data: string) => {
          responseBody = data;
        }),
      };
      const next = vi.fn();

      middleware(req, res, next);
      expect(statusCode).toBe(200);
      const json = JSON.parse(responseBody);
      expect(json.isRunning).toBe(false);
      expect(json.market).toBeDefined();
    });

    it('POST /api/market/backfill-all 應能成功啟動背景任務並回傳成功訊息', async () => {
      const middleware = createMarketApiMiddleware();
      let responseBody = '';
      let statusCode = 0;

      const req: any = {
        url: '/api/market/backfill-all?market=TW&days=10',
        method: 'POST',
      };
      const res: any = {
        writeHead: vi.fn((code: number) => {
          statusCode = code;
        }),
        end: vi.fn((data: string) => {
          responseBody = data;
        }),
      };
      const next = vi.fn();

      middleware(req, res, next);
      expect(statusCode).toBe(200);
      const json = JSON.parse(responseBody);
      expect(json.success).toBe(true);
      expect(json.message).toContain('啟動');

      // 查詢狀態應顯示 isRunning: true
      const status = getBackfillGlobalStatus();
      expect(status.isRunning).toBe(true);
      expect(status.market).toBe('TW');
    });

    it('若任務已在執行中，triggerBackfillTask 應防禦性拒絕重複啟動', () => {
      const res1 = triggerBackfillTask({ market: 'US', days: 5 });
      expect(res1.started).toBe(true);

      const res2 = triggerBackfillTask({ market: 'TW', days: 5 });
      expect(res2.started).toBe(false);
      expect(res2.message).toContain('已在背景執行中');
    });
  });
});
