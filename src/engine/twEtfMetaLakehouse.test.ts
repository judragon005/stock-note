import { describe, it, expect, afterEach } from 'vitest';
import { generateAiForceReportFromCandles } from './aiForceDashboardEngine';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const os = require('os');
const path = require('path');

describe('Spec 0241 T01-T04: 台股全市場 ETF 動態 AUM 與 etf_meta 湖倉閉環 (Debt 0061 #3)', () => {
  const tempFiles: string[] = [];

  function createTempDbPath(tag: string): string {
    const p = path.join(os.tmpdir(), `spec0241-${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    tempFiles.push(p);
    return p;
  }

  afterEach(() => {
    for (const p of tempFiles.splice(0, tempFiles.length)) {
      for (const suffix of ['', '-wal', '-shm']) {
        try {
          if (fs.existsSync(p + suffix)) fs.unlinkSync(p + suffix);
        } catch {}
      }
    }
  });

  it('T01: initSqliteLakehouseDb 應對舊版 etf_daily_nav 執行冪等 ALTER TABLE 並建立 etf_meta 表', () => {
    const { DatabaseSync } = require('node:sqlite');
    const { initSqliteLakehouseDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const dbPath = createTempDbPath('migrate');

    // 先建立舊版 schema（不含 issued_units / unit_change / aum_billion）
    const rawDb = new DatabaseSync(dbPath);
    rawDb.exec(`
      CREATE TABLE etf_daily_nav (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        close_price REAL NOT NULL,
        nav REAL NOT NULL,
        premium_discount_ratio REAL NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (symbol, date)
      );
      INSERT INTO etf_daily_nav VALUES ('0050', '2026-11-19', 84.6, 84.56, 0.05, 1700000000000);
    `);
    rawDb.close();

    const db = initSqliteLakehouseDb(dbPath);
    const navCols = db.prepare('PRAGMA table_info(etf_daily_nav)').all().map((c: any) => c.name);
    expect(navCols).toContain('issued_units');
    expect(navCols).toContain('unit_change');
    expect(navCols).toContain('aum_billion');

    const metaCols = db.prepare('PRAGMA table_info(etf_meta)').all().map((c: any) => c.name);
    expect(metaCols).toContain('symbol');
    expect(metaCols).toContain('expense_ratio');
    expect(metaCols).toContain('expense_source');
    expect(metaCols).toContain('tracking_index');

    // 舊資料不流失
    const row = db.prepare("SELECT * FROM etf_daily_nav WHERE symbol = '0050'").get();
    expect(row.nav).toBeCloseTo(84.56, 4);
    db.close();
  });

  it('T02: parseTwseEtfNavResponse 與 ingestEtfDailyNavToDb 應由 all_etf.txt 的 c*f 零成本衍生全市場 AUM 與申贖流', () => {
    const { parseTwseEtfNavResponse, ingestEtfDailyNavToDb } = require('../../scripts/market-sync/ingest-macro-sentiment.cjs');
    const { initSqliteLakehouseDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');

    const rawPayload = {
      a1: [
        {
          msgArray: [
            { a: '0050', b: '元大台灣50', c: 25759000000, d: 228000000, e: 84.6, f: 84.56, g: 0.05 },
            { a: '00693U', b: '期街口S&P黃豆', c: 45666000, d: 0, e: 21.9, f: 21.94, g: -0.19 },
          ],
        },
      ],
    };

    const parsed = parseTwseEtfNavResponse(rawPayload, '2026-11-20');
    expect(parsed).toHaveLength(2);
    expect(parsed[0].issuedUnits).toBe(25759000000);
    expect(parsed[0].unitChange).toBe(228000000);
    expect(parsed[0].aumBillion).toBeCloseTo(21781.81, 2);
    expect(parsed[1].aumBillion).toBeCloseTo(10.02, 2);

    const dbPath = createTempDbPath('nav-aum');
    expect(ingestEtfDailyNavToDb(parsed, dbPath)).toBe(true);
    const db = initSqliteLakehouseDb(dbPath);
    const saved = db.prepare("SELECT * FROM etf_daily_nav WHERE symbol = '00693U'").get();
    expect(saved.aum_billion).toBeCloseTo(10.02, 2);
    expect(saved.issued_units).toBe(45666000);
    db.close();
  });

  it('T03: ingest-tw-etf-meta.cjs 應保留 .TW/.TWO 後綴查 Yahoo 費率、寫入 30D TTL 與 UNAVAILABLE 負快取', async () => {
    const {
      formatTwYahooEtfCandidates,
      parseTwseEtfOpenApiMeta,
      getOrFetchTwEtfMeta,
      resetTwEtfMetaStateForTest,
    } = require('../../scripts/market-sync/ingest-tw-etf-meta.cjs');
    const { initSqliteLakehouseDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');

    resetTwEtfMetaStateForTest();
    expect(formatTwYahooEtfCandidates('0050')).toEqual(['0050.TW', '0050.TWO']);
    expect(formatTwYahooEtfCandidates('00679B')).toEqual(['00679B.TWO', '00679B.TW']);

    const openApiRows = parseTwseEtfOpenApiMeta([
      {
        基金代號: '0050',
        基金簡稱: '元大台灣50',
        基金類型: '國內成分證券ETF',
        '標的指數/追蹤指數名稱': '臺灣50指數',
        上市日期: '0920630',
        保管機構: '中國信託',
      },
    ]);
    expect(openApiRows[0]).toMatchObject({
      symbol: '0050',
      name: '元大台灣50',
      trackingIndex: '臺灣50指數',
    });

    const dbPath = createTempDbPath('etf-meta');
    const db = initSqliteLakehouseDb(dbPath);
    const requestedUrls: string[] = [];

    const mockFetcher = async (url: string) => {
      requestedUrls.push(url);
      if (url.includes('fc.yahoo.com')) {
        return { ok: true, headers: { get: () => 'A1=test; Path=/' }, text: async () => '' };
      }
      if (url.includes('getcrumb')) {
        return { ok: true, text: async () => 'crumb123' };
      }
      if (url.includes('0050.TW')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            quoteSummary: {
              result: [
                {
                  fundProfile: {
                    family: 'Yuanta Securities Inv Trust',
                    feesExpensesInvestment: { annualReportExpenseRatio: { raw: 0.0032 } },
                  },
                },
              ],
            },
          }),
        };
      }
      // 00693U 查無費率 -> 誠實返回空物件觸發 UNAVAILABLE 負快取
      return {
        ok: true,
        status: 200,
        json: async () => ({
          quoteSummary: {
            result: [{ fundProfile: { family: 'JKO Asset Management', feesExpensesInvestment: {} } }],
          },
        }),
      };
    };

    const meta0050 = await getOrFetchTwEtfMeta(db, '0050', { fetcher: mockFetcher });
    expect(meta0050?.expense_ratio).toBeCloseTo(0.32, 4);
    expect(meta0050?.expense_source).toBe('YAHOO');
    expect(requestedUrls.some((u) => u.includes('0050.TW'))).toBe(true);
    expect(requestedUrls.some((u) => u.includes('0050-TW'))).toBe(false);

    // TTL 內重查 0050 不應再發出 quoteSummary 請求
    const prevCount = requestedUrls.length;
    const cached0050 = await getOrFetchTwEtfMeta(db, '0050', { fetcher: mockFetcher });
    expect(cached0050?.expense_ratio).toBeCloseTo(0.32, 4);
    expect(requestedUrls.length).toBe(prevCount);

    // 00693U 查無費率 -> 寫入 UNAVAILABLE，TTL 內不重打
    const meta00693 = await getOrFetchTwEtfMeta(db, '00693U', { fetcher: mockFetcher });
    expect(meta00693?.expense_ratio).toBeNull();
    expect(meta00693?.expense_source).toBe('UNAVAILABLE');
    const after00693Count = requestedUrls.length;
    await getOrFetchTwEtfMeta(db, '00693U', { fetcher: mockFetcher });
    expect(requestedUrls.length).toBe(after00693Count);

    db.close();
  });

  it('T04: buildAiForceDashboardReport 應優先採用湖倉實時 aumBillion/expenseRatio 覆寫靜態基準，且冷門 ETF 無費率時遵守 Zero-Mock', () => {
    const candles = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      open: 84,
      high: 85,
      low: 83.5,
      close: 84.6,
      volume: 15000000,
    }));

    // 0050 帶入實時湖倉 21,781.81 億與 0.32% 費率 -> 必須覆寫靜態 4380 / 0.43
    const report0050 = generateAiForceReportFromCandles(
      '0050',
      '元大台灣50',
      'TW',
      candles,
      undefined,
      undefined,
      new Date('2026-11-20T06:00:00Z'),
      {
        etfMeta: { aumBillion: 21781.81, expenseRatio: 0.32 },
        etfNav: { date: '2026-11-20', closePrice: 84.6, nav: 84.56, premiumDiscountRatio: 0.05 },
      }
    );
    expect(report0050.monthlyRevenue.etfData?.aumBillion).toBeCloseTo(21781.81, 2);
    expect(report0050.valuationMetrics?.etfExpenseRatio).toBeCloseTo(0.32, 4);

    // 00693U 冷門期貨 ETF 帶入實時湖倉 10.02 億、無費率 -> AUM 有實值、費率為 undefined
    const report00693 = generateAiForceReportFromCandles(
      '00693U',
      '期街口S&P黃豆',
      'TW',
      candles,
      undefined,
      undefined,
      new Date('2026-11-20T06:00:00Z'),
      {
        etfMeta: { aumBillion: 10.02, expenseRatio: null },
        etfNav: { date: '2026-11-20', closePrice: 21.9, nav: 21.94, premiumDiscountRatio: -0.19 },
      }
    );
    expect(report00693.monthlyRevenue.etfData?.aumBillion).toBeCloseTo(10.02, 2);
    expect(report00693.valuationMetrics?.etfExpenseRatio).toBeUndefined();
  });
});
