import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Spec 0183 Ticket 06: syncFuturesOiAndEtfNav (期貨未平倉與 ETF 淨值折溢價解析)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_sync_etf_futures.db');
  let ingestMacroSentiment: any;
  let sqliteDbCore: any;

  beforeEach(() => {
    sqliteDbCore = require('../../scripts/market-sync/sqlite-db-core.cjs');
    ingestMacroSentiment = require('../../scripts/market-sync/ingest-macro-sentiment.cjs');
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  afterEach(() => {
    if (sqliteDbCore && sqliteDbCore.closeSqliteDb) {
      sqliteDbCore.closeSqliteDb();
    }
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  it('1. parseTaifexInstitutionalFuturesCsv 應正確自期交所三大法人 CSV 解析外資與投信台指期未平倉口數', () => {
    // 模擬期交所標準每日未平倉 CSV 片段
    const mockTaifexCsv = `
日期,商品名稱,身份別,多方交易口數,多方契約金額,空方交易口數,空方契約金額,多空淨額口數,多空淨額契約金額,多方未平倉口數,多方未平倉契約金額,空方未平倉口數,空方未平倉契約金額,未平倉餘額淨額口數,未平倉餘額淨額契約金額
2026/10/15,臺股期貨,外資及陸資,12000,4500000,15000,5600000,-3000,-1100000,32000,12000000,70500,26500000,-38500,-14500000
2026/10/15,臺股期貨,投信,4000,1500000,1000,375000,3000,1125000,28000,10500000,4000,1500000,24000,9000000
2026/10/15,臺股期貨,自營商,8000,3000000,7000,2625000,1000,375000,15000,5625000,10000,3750000,5000,1875000
`;

    const parsed = ingestMacroSentiment.parseTaifexInstitutionalFuturesCsv(mockTaifexCsv);
    expect(parsed).toBeTruthy();
    expect(parsed.foreignNetOi).toBe(-38500); // 外資淨空單 38,500 口
    expect(parsed.trustNetOi).toBe(24000); // 投信淨多單 24,000 口
  });

  it('2. parseTwseEtfNavResponse 應正確解析證交所/投信公會 ETF 官方收盤淨值與折溢價', () => {
    const mockTwseData = [
      { a: '0050', b: '元大台灣50', c: '165.50', d: '164.80', e: '0.42' },
      { a: '00878', b: '國泰永續高股息', c: '23.00', d: '22.90', e: '0.44' },
      { a: '00919', b: '群益台灣精選高息', c: '24.20', d: '23.80', e: '1.68' },
    ];

    const records = ingestMacroSentiment.parseTwseEtfNavResponse(mockTwseData, '2026-10-15');
    expect(records).toHaveLength(3);
    expect(records[0].symbol).toBe('0050');
    expect(records[0].closePrice).toBe(165.5);
    expect(records[0].nav).toBe(164.8);
    expect(records[0].premiumDiscountRatio).toBe(0.42);

    expect(records[2].symbol).toBe('00919');
    expect(records[2].premiumDiscountRatio).toBe(1.68);
  });

  it('3. ingestEtfDailyNavToDb 與 ingestMacroSentimentToDb 應成功入庫', () => {
    if (!sqliteDbCore.isSqliteSupported()) return;

    const mockRecords = [
      {
        symbol: '0050',
        date: '2026-10-15',
        closePrice: 165.5,
        nav: 164.8,
        premiumDiscountRatio: 0.42,
      },
    ];

    const successEtf = ingestMacroSentiment.ingestEtfDailyNavToDb(mockRecords, testDbPath);
    expect(successEtf).toBe(true);

    const successMacro = ingestMacroSentiment.ingestMacroSentimentToDb(
      {
        date: '2026-10-15',
        twForeignFuturesOi: -38500,
        twTrustFuturesOi: 24000,
      },
      testDbPath
    );
    expect(successMacro).toBe(true);

    const db = sqliteDbCore.getSqliteDbConnection(testDbPath);
    const etfRow = db.prepare('SELECT * FROM etf_daily_nav WHERE symbol = ?').get('0050');
    expect(etfRow.nav).toBe(164.8);

    const macroRow = db.prepare('SELECT tw_foreign_futures_oi FROM macro_sentiment_daily WHERE date = ?').get('2026-10-15');
    expect(macroRow.tw_foreign_futures_oi).toBe(-38500);
  });

  it('4. parseTwseEtfNavResponse 應能解包證交所真實 all_etf.txt 之 { a1: [{ msgArray: [...] }] } 結構並正確映射 e, f, g (Spec 0203 Ticket 05)', () => {
    const mockOfficialTwsePayload = {
      a1: [
        {
          msgArray: [
            { a: '0050', b: '元大台灣50', e: '195.50', f: '195.42', g: '0.04%' },
            { a: '0056', b: '元大高股息', e: '38.20', f: '38.35', g: '-0.39%' },
            { a: '00878', b: '國泰永續高股息', e: '22.80', f: '22.75', g: '0.22%' },
          ],
        },
      ],
    };

    const records = ingestMacroSentiment.parseTwseEtfNavResponse(mockOfficialTwsePayload, '2026-10-22');
    expect(records).toHaveLength(3);
    expect(records[0].symbol).toBe('0050');
    expect(records[0].closePrice).toBe(195.5);
    expect(records[0].nav).toBe(195.42);
    expect(records[0].premiumDiscountRatio).toBe(0.04);

    expect(records[1].symbol).toBe('0056');
    expect(records[1].closePrice).toBe(38.2);
    expect(records[1].nav).toBe(38.35);
    expect(records[1].premiumDiscountRatio).toBe(-0.39);
  });

  it('5. fetchAndIngestEtfDailyNav 應成功抓取並寫入 SQLite 湖倉 etf_daily_nav (Spec 0203 Ticket 05)', async () => {
    if (!sqliteDbCore.isSqliteSupported()) return;

    const mockFetcher = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        a1: [
          {
            msgArray: [
              { a: '0050', b: '元大台灣50', e: '195.50', f: '195.42', g: '0.04%' },
              { a: '006208', b: '富邦台50', e: '115.00', f: '114.90', g: '0.09%' },
            ],
          },
        ],
      }),
    });

    const res = await ingestMacroSentiment.fetchAndIngestEtfDailyNav(testDbPath, '2026-10-22', mockFetcher);
    expect(res.success).toBe(true);
    expect(res.count).toBe(2);

    const db = sqliteDbCore.getSqliteDbConnection(testDbPath);
    const rows = db.prepare('SELECT * FROM etf_daily_nav WHERE date = ? ORDER BY symbol ASC').all('2026-10-22');
    expect(rows.length).toBe(2);
    expect(rows[0].symbol).toBe('0050');
    expect(rows[0].close_price).toBe(195.5);
    expect(rows[0].nav).toBe(195.42);
    expect(rows[0].premium_discount_ratio).toBe(0.04);
  });
});

