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

  describe('4. [Spec 0184 / Ticket 05] ETA 預估計算器 (calculateEta)', () => {
    const { calculateEta } = require('../../scripts/market-sync/backfill-full-market-history.cjs');

    it('當剛開始 (completedDays=0) 時，應回傳預估中或計算中', () => {
      const eta = calculateEta(Date.now(), 0, 250);
      expect(eta.remainingMs).toBe(0);
      expect(eta.etaFormatted).toBe('計算中...');
    });

    it('當已完成 10 天耗時 30 秒，總計 100 天，應能正確推算剩餘 270 秒 (約 5 分鐘)', () => {
      const fakeStartedAt = Date.now() - 30000; // 30秒前
      const eta = calculateEta(fakeStartedAt, 10, 100);
      // 平均 3 秒/天，剩餘 90 天 => 270,000ms => 約 5 分鐘 (4.5 min rounds to 5 min)
      expect(eta.remainingMs).toBeGreaterThan(260000);
      expect(eta.remainingMs).toBeLessThan(280000);
      expect(eta.etaFormatted).toContain('剩餘約 5 分鐘');
      expect(eta.etaFormatted).toContain('預計');
      expect(eta.etaFormatted).toContain('完成');
    });

    it('當已全數完成時，應回傳已完成', () => {
      const eta = calculateEta(Date.now() - 10000, 250, 250);
      expect(eta.remainingMs).toBe(0);
      expect(eta.etaFormatted).toBe('已完成');
    });
  });

  describe('5. [Spec 0186 / Ticket 02] 美股湖倉在庫標的統計透視', () => {
    it('backfillGlobalStatus.us 應包含 totalInLakehouse 欄位且預設為 0', () => {
      const status = getBackfillGlobalStatus();
      expect(status.us).toBeDefined();
      expect(typeof status.us.totalInLakehouse).toBe('number');
      expect(status.us.totalInLakehouse).toBe(0);
    });
  });

  describe('6. [Spec 0187 / Ticket 01 & 02 & 03] 全生命週期逾時、單日看門狗與任務取消重設控制', () => {
    const {
      cancelBackfillTask,
      resetBackfillGlobalStatus,
    } = require('../../scripts/market-sync/backfill-full-market-history.cjs');
    const { defaultFetchJson } = require('../../scripts/market-sync/backfill-tw-history-web.cjs');

    it('Ticket 01: defaultFetchJson 應支援超時拋錯 (AbortSignal.timeout)', async () => {
      // 請求一個超時的位址，傳入 100ms 超時
      const start = Date.now();
      await expect(
        defaultFetchJson('http://10.255.255.1', { timeoutMs: 100 })
      ).rejects.toThrow();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(2500); // 應迅速超時，不掛起 (放寬至 2.5s 避開 CPU 密集時之調度抖動)
    });

    it('Ticket 03: cancelBackfillTask 應能中斷進行中任務並將 isRunning 設為 false', () => {
      triggerBackfillTask({ market: 'TW', days: 20 });
      expect(getBackfillGlobalStatus().isRunning).toBe(true);

      const cancelRes = cancelBackfillTask();
      expect(cancelRes.cancelled).toBe(true);
      expect(getBackfillGlobalStatus().isRunning).toBe(false);
      expect(getBackfillGlobalStatus().error).toContain('取消');
    });

    it('Ticket 03: resetBackfillGlobalStatus 應能強制重設狀態鎖與清除錯誤', () => {
      const resetRes = resetBackfillGlobalStatus();
      expect(resetRes.reset).toBe(true);
      const status = getBackfillGlobalStatus();
      expect(status.isRunning).toBe(false);
      expect(status.error).toBeNull();
    });

    it('Ticket 03: 中介層應註冊 POST /api/market/backfill-cancel 與 POST /api/market/backfill-reset', () => {
      const middleware = createMarketApiMiddleware();
      let responseBody = '';
      let statusCode = 0;

      const req: any = {
        url: '/api/market/backfill-cancel',
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
    });
  });
});


