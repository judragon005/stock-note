import { describe, it, expect } from 'vitest';

declare const require: (id: string) => any;

describe('Ticket 13: Ingest TW Insider Pledge Records Pipeline', () => {
  const { parseTwPledgeReport, computePledgeRatio } = require('../../scripts/market-sync/ingest-tw-pledge.cjs');

  it('1. computePledgeRatio 應精確計算質押比率', () => {
    // 質押 5,000,000 股，總持股 10,000,000 股 -> 50.0%
    expect(computePledgeRatio(5000000, 10000000)).toBe(50.0);
    // 總持股為 0 時應防除以零
    expect(computePledgeRatio(100, 0)).toBe(0);
  });

  it('2. parseTwPledgeReport 應正確清洗並格式化開放資料', () => {
    const mockGovPledgeData = [
      {
        出表年月: '11502', // 2026-02
        公司代號: '2330',
        公司名稱: '台積電',
        董監事設質股數: '50000000',
        董監事持有股數: '1000000000',
        內部人申報轉讓股數: '0',
      },
      {
        出表年月: '11502',
        公司代號: '2454',
        公司名稱: '聯發科',
        董監事設質股數: '12000000',
        董監事持有股數: '30000000',
        內部人申報轉讓股數: '600',
      },
    ];

    const records = parseTwPledgeReport(mockGovPledgeData);
    expect(records.length).toBe(2);

    expect(records[0].symbol).toBe('2330');
    expect(records[0].reportDate).toBe('2026-02');
    expect(records[0].pledgedShares).toBe(50000000);
    expect(records[0].totalDirectorShares).toBe(1000000000);
    expect(records[0].pledgeRatio).toBe(5.0);

    expect(records[1].symbol).toBe('2454');
    expect(records[1].pledgeRatio).toBe(40.0);
    expect(records[1].insiderTransferShares).toBe(600);
  });

  it('3. fetchAndIngestTwPledge 應自證交所 OpenAPI t187ap11_L 抓取並入庫 SQLite tw_insider_pledge_records (Spec 0203 Ticket 06)', async () => {
    const path = require('path');
    const fs = require('fs');
    const sqliteDbCore = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { fetchAndIngestTwPledge } = require('../../scripts/market-sync/ingest-tw-pledge.cjs');

    if (!sqliteDbCore.isSqliteSupported()) return;

    const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_pledge_openapi.db');
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }

    try {
      const mockFetcher = async () => ({
        ok: true,
        status: 200,
        json: async () => [
          {
            出表年月: '11509',
            公司代號: '2330',
            公司名稱: '台積電',
            董監事設質股數: '0',
            董監事持有股數: '175000000',
            內部人申報轉讓股數: '0',
          },
          {
            出表年月: '11509',
            公司代號: '2317',
            公司名稱: '鴻海',
            董監事設質股數: '25000000',
            董監事持有股數: '220000000',
            內部人申報轉讓股數: '0',
          },
        ],
      });

      const res = await fetchAndIngestTwPledge(testDbPath, mockFetcher);
      expect(res.success).toBe(true);
      expect(res.count).toBe(2);

      const db = sqliteDbCore.getSqliteDbConnection(testDbPath);
      const rows = db.prepare('SELECT * FROM tw_insider_pledge_records ORDER BY symbol ASC').all();
      expect(rows.length).toBe(2);
      expect(rows[0].symbol).toBe('2317');
      expect(rows[0].pledge_ratio).toBe(11.4);
      expect(rows[1].symbol).toBe('2330');
      expect(rows[1].pledge_ratio).toBe(0.0);
    } finally {
      sqliteDbCore.closeSqliteDb();
      if (fs.existsSync(testDbPath)) {
        try { fs.unlinkSync(testDbPath); } catch {}
      }
    }
  });
});

