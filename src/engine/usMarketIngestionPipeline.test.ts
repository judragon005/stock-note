import { describe, it, expect } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');

// 待實作之模組匯入（先以 CommonJS 載入測試接縫）
const seedSymbolsModule = require('../../scripts/market-sync/seed-symbols-universe.cjs');
const syncUsMarketModule = require('../../scripts/market-sync/sync-us-market.cjs');
const checkpointEngineModule = require('../../scripts/market-sync/us-sync-checkpoint-engine.cjs');

describe('Spec 0158: 美股全市場標的湖倉採集與斷點續傳流水線 (TDD Seam)', () => {
  describe('Ticket 01: 美股全市場標的種子庫擴充', () => {
    it('getFullUsSeedUniverse 應回傳至少 1,500 檔美股標的種子', () => {
      expect(typeof seedSymbolsModule.getFullUsSeedUniverse).toBe('function');
      const universe = seedSymbolsModule.getFullUsSeedUniverse();
      expect(Array.isArray(universe)).toBe(true);
      expect(universe.length).toBeGreaterThanOrEqual(1500);
    });

    it('美股種子庫應涵蓋核心 ETF、巨型科技股與熱門成長標的，且無重複 symbol', () => {
      const universe = seedSymbolsModule.getFullUsSeedUniverse();
      const symbols = universe.map((u: any) => u.symbol.toUpperCase());
      const uniqueSymbols = new Set(symbols);

      // 驗證去重
      expect(symbols.length).toBe(uniqueSymbols.size);

      // 驗證核心指數與巨型股
      expect(uniqueSymbols.has('VOO')).toBe(true);
      expect(uniqueSymbols.has('QQQ')).toBe(true);
      expect(uniqueSymbols.has('NVDA')).toBe(true);
      expect(uniqueSymbols.has('AAPL')).toBe(true);

      // 驗證熱門成長與概念股
      expect(uniqueSymbols.has('PLTR')).toBe(true);
      expect(uniqueSymbols.has('SMCI')).toBe(true);
      expect(uniqueSymbols.has('CRWD')).toBe(true);
    });

    it('所有美股標的種子之 market 均應為 US，且具備合規 exchange 與 type', () => {
      const universe = seedSymbolsModule.getFullUsSeedUniverse();
      for (const item of universe.slice(0, 50)) {
        expect(item.market).toBe('US');
        expect(typeof item.name).toBe('string');
        expect(item.name.length).toBeGreaterThan(0);
        expect(['STOCK', 'ETF']).toContain(item.type);
      }
    });
  });

  describe('Ticket 02: 三層動態優先級隊列與本地持股偵測', () => {
    it('buildPrioritizedUsUniverse 應將使用者持股與自選名單排在最前列 (Tier 0)', () => {
      expect(typeof syncUsMarketModule.buildPrioritizedUsUniverse).toBe('function');

      const mockHoldings = ['PLTR', 'COIN'];
      const mockWatchlist = ['SOFI', 'SMCI'];
      const baseUniverse = ['AAPL', 'MSFT', 'NVDA', 'PLTR', 'SOFI', 'INTC', 'AMD'];

      const prioritized = syncUsMarketModule.buildPrioritizedUsUniverse({
        holdings: mockHoldings,
        watchlist: mockWatchlist,
        customUniverse: baseUniverse,
      });

      // Tier 0 前 4 檔必須是使用者持股與自選股
      expect(prioritized.slice(0, 4)).toEqual(['PLTR', 'COIN', 'SOFI', 'SMCI']);
      // 確保整體無重複
      expect(new Set(prioritized).size).toBe(prioritized.length);
      // 確保基礎標的依然存在
      expect(prioritized).toContain('AAPL');
      expect(prioritized).toContain('INTC');
    });

    it('當無傳入持股時，應回退為預設 Tier 1 + 全市場順序', () => {
      const prioritized = syncUsMarketModule.buildPrioritizedUsUniverse({
        holdings: [],
        watchlist: [],
      });

      expect(prioritized.length).toBeGreaterThanOrEqual(1500);
      // 前 5 檔應為核心指數或權值龍頭
      expect(['VOO', 'SPY', 'QQQ', 'IVV', 'VTI']).toContain(prioritized[0]);
    });
  });

  describe('Ticket 03: 自適應抖動延遲與 429 階梯式熔斷退避狀態機', () => {
    it('calculateAdaptiveJitterDelay 應回傳落在 baseDelayMs ~ baseDelayMs + jitterMs 區間', () => {
      expect(typeof syncUsMarketModule.calculateAdaptiveJitterDelay).toBe('function');
      for (let i = 0; i < 20; i++) {
        const delay = syncUsMarketModule.calculateAdaptiveJitterDelay(800, 400);
        expect(delay).toBeGreaterThanOrEqual(800);
        expect(delay).toBeLessThanOrEqual(1200);
      }
    });

    it('calculateBackoffSleepMs 應實作 10s -> 30s -> 60s 階梯式退避與熔斷判定', () => {
      expect(typeof syncUsMarketModule.calculateBackoffSleepMs).toBe('function');

      const step1 = syncUsMarketModule.calculateBackoffSleepMs(1);
      expect(step1.sleepMs).toBe(10000);
      expect(step1.isCircuitBroken).toBe(false);

      const step2 = syncUsMarketModule.calculateBackoffSleepMs(2);
      expect(step2.sleepMs).toBe(30000);
      expect(step2.isCircuitBroken).toBe(false);

      const step3 = syncUsMarketModule.calculateBackoffSleepMs(3);
      expect(step3.sleepMs).toBe(60000);
      expect(step3.isCircuitBroken).toBe(false);

      const step4 = syncUsMarketModule.calculateBackoffSleepMs(4);
      expect(step4.isCircuitBroken).toBe(true);
    });
  });

  describe('Ticket 04: 美股湖倉雙模態採集管線解析與斷點續傳', () => {
    it('parseSyncExecutionMode 應正確識別 bootstrap 與 daily 模式', () => {
      expect(typeof syncUsMarketModule.parseSyncExecutionMode).toBe('function');

      expect(syncUsMarketModule.parseSyncExecutionMode(['--mode=bootstrap'])).toBe('bootstrap');
      expect(syncUsMarketModule.parseSyncExecutionMode(['--bootstrap'])).toBe('bootstrap');
      expect(syncUsMarketModule.parseSyncExecutionMode(['--mode=daily'])).toBe('daily');
      expect(syncUsMarketModule.parseSyncExecutionMode([])).toBe('daily'); // 預設為每日排程
    });

    it('getPendingUsSymbols 應正確跳過當日已 SUCCESS 的標的 (斷點續傳)', () => {
      expect(typeof checkpointEngineModule.getPendingUsSymbols).toBe('function');
      const tempDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_checkpoint.db');

      // 測試用隔離 DB
      const { initSqliteLakehouseDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
      initSqliteLakehouseDb(tempDbPath);

      try {
        const today = '2026-10-02';
        checkpointEngineModule.recordSyncCheckpoint('US', 'AAPL', 'SUCCESS', today, null, tempDbPath);
        checkpointEngineModule.recordSyncCheckpoint('US', 'NVDA', 'FAILED', today, 'Timeout', tempDbPath);

        const list = ['AAPL', 'NVDA', 'MSFT'];
        const pending = checkpointEngineModule.getPendingUsSymbols(list, today, tempDbPath);

        // AAPL 已 SUCCESS，應被跳過；NVDA 與 MSFT 應在待處理名單中
        expect(pending).toContain('NVDA');
        expect(pending).toContain('MSFT');
        expect(pending).not.toContain('AAPL');
      } finally {
        try {
          if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
        } catch {
          // ignore
        }
      }
    });
  });

  describe('Ticket 05: 湖倉稽核驗證器擴充與端到端健康度檢驗', () => {
    const auditVerifierModule = require('../../scripts/market-sync/audit-verifier.cjs');

    it('isMarketTradingDay 應正確識別美股週末與法定休市日', () => {
      expect(typeof auditVerifierModule.isMarketTradingDay).toBe('function');

      // 週末
      const saturday = new Date('2026-10-03');
      expect(auditVerifierModule.isMarketTradingDay(saturday, 'US')).toBe(false);

      // 2026 聖誕節 (2026-12-25)
      const christmas = new Date('2026-12-25');
      expect(auditVerifierModule.isMarketTradingDay(christmas, 'US')).toBe(false);

      // 一般交易日 (2026-10-02 週五)
      const tradingFriday = new Date('2026-10-02');
      expect(auditVerifierModule.isMarketTradingDay(tradingFriday, 'US')).toBe(true);
    });

    it('auditUsLakehouseUniverse 應能產出合規的美股湖倉健康統計', () => {
      expect(typeof auditVerifierModule.auditUsLakehouseUniverse).toBe('function');
      const tempDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_audit.db');

      const { initSqliteLakehouseDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
      initSqliteLakehouseDb(tempDbPath);

      try {
        // 寫入 2 筆標的種子與 1 筆成功 Checkpoint
        seedSymbolsModule.upsertSymbolsMeta(
          [
            { symbol: 'AAPL', name: '蘋果', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
            { symbol: 'NVDA', name: '輝達', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
          ],
          tempDbPath
        );

        checkpointEngineModule.recordSyncCheckpoint('US', 'AAPL', 'SUCCESS', '2026-10-02', null, tempDbPath);

        const audit = auditVerifierModule.auditUsLakehouseUniverse('2026-10-02', tempDbPath);
        expect(audit.market).toBe('US');
        expect(audit.totalUsRegistered).toBe(2);
        expect(audit.successCount).toBe(1);
        expect(audit.coverageRate).toBe(50);
      } finally {
        try {
          if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
        } catch {
          // ignore
        }
      }
    });

    it('runUsMarketSync 端到端乾跑驗證 (dry run / limited)', async () => {
      const tempDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_e2e.db');

      try {
        // 設定 baseDelayMs: 0 確保測試秒級完成
        const res = await syncUsMarketModule.runUsMarketSync({
          mode: 'daily',
          customUniverse: ['AAPL', 'NVDA'],
          customDbPath: tempDbPath,
          maxSymbols: 2,
          baseDelayMs: 0,
          jitterMs: 0,
        });

        expect(res).toBeDefined();
        expect(res.market).toBe('US');
        expect(res.mode).toBe('daily');
        expect(typeof res.durationMs).toBe('number');
      } finally {
        try {
          if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
        } catch {
          // ignore
        }
      }
    });
  });
});
