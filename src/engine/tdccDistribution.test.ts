import { describe, it, expect, beforeEach, afterEach } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');

describe('Ticket 06 - 台灣集保結算所 (TDCC) 股權分散與千張大戶持股比 (Spec 0163)', () => {
  const testDbPath = path.resolve(process.cwd(), '.scratch/market-cache/test_tdcc.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  it('1. parseTdccRecords 應精確計算 400 張、千張大戶比例與總股東人數', () => {
    const { parseTdccRecords } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');
    expect(typeof parseTdccRecords).toBe('function');

    // 模擬集保原始分級資料 (總共 15 級，1: 1~999股, 12: 400~600張, 15: 1000張以上, 17: 合計)
    const mockRows = [
      { symbol: '2330', level: 1, shareholders: 500000, shares: 100000000 },
      { symbol: '2330', level: 12, shareholders: 500, shares: 250000000 },
      { symbol: '2330', level: 15, shareholders: 1500, shares: 20000000000 },
      { symbol: '2330', level: 17, shareholders: 1200000, shares: 25930000000 }, // 總計
    ];

    const result = parseTdccRecords(mockRows, '2026-10-02');
    expect(result['2330']).toBeDefined();
    expect(result['2330'].symbol).toBe('2330');
    expect(result['2330'].totalShareholders).toBe(1200000);
    // 1000 張以上比例: 20,000,000,000 / 25,930,000,000 = ~77.13%
    expect(result['2330'].over1000Ratio).toBeCloseTo(77.13, 1);
  });

  it('2. saveTdccDistributionToSqlite 應成功將大戶持股記錄寫入 tw_tdcc_distribution', () => {
    const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    const { saveTdccDistributionToSqlite } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');

    const db = initSqliteLakehouseDb(testDbPath);

    const mockDistributionMap = {
      '2330': {
        symbol: '2330',
        date: '2026-10-02',
        totalShareholders: 1200000,
        over400Ratio: 88.5,
        over1000Ratio: 77.13,
        under10Ratio: 4.2,
      }
    };

    const res = saveTdccDistributionToSqlite(mockDistributionMap, '2026-10-02', testDbPath);
    expect(res.savedCount).toBe(1);

    const row = db.prepare("SELECT * FROM tw_tdcc_distribution WHERE symbol = '2330' AND date = '2026-10-02'").get() as any;
    expect(row).toBeDefined();
    expect(row.total_shareholders).toBe(1200000);
    expect(row.over_1000_ratio).toBe(77.13);
    expect(row.over_400_ratio).toBe(88.5);

    closeSqliteDb();
  });

  describe('Spec 0245 Seam 3 (T08 & T09): TDCC 語意合計列 (16/17)、10張散戶口徑與差集自癒逐週落盤', () => {
    it('T08-1: parseTdccQryResultHtml 應正確解析無差異數調整時序號為 16 之「合 計」列，且 under10Ratio 嚴格只計級距 1~3（1~10 張）', () => {
      const { parseTdccQryResultHtml } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');
      const htmlLevel16Total = `
        <table>
          <tr><td>1</td><td>1-999</td><td>230,055</td><td>45,693,131</td><td>0.96</td></tr>
          <tr><td>2</td><td>1,000-5,000</td><td>300,395</td><td>575,899,159</td><td>12.19</td></tr>
          <tr><td>3</td><td>5,001-10,000</td><td>30,516</td><td>232,719,507</td><td>4.92</td></tr>
          <tr><td>4</td><td>10,001-15,000</td><td>8,563</td><td>107,750,799</td><td>2.28</td></tr>
          <tr><td>5</td><td>15,001-20,000</td><td>4,594</td><td>84,139,548</td><td>1.78</td></tr>
          <tr><td>12</td><td>400,001-600,000</td><td>139</td><td>69,225,854</td><td>1.46</td></tr>
          <tr><td>13</td><td>600,001-800,000</td><td>88</td><td>60,656,721</td><td>1.28</td></tr>
          <tr><td>14</td><td>800,001-1,000,000</td><td>35</td><td>31,393,688</td><td>0.66</td></tr>
          <tr><td>15</td><td>1,000,001以上</td><td>293</td><td>2,988,819,479</td><td>63.31</td></tr>
          <tr><td>16</td><td>合 計</td><td>583,766</td><td>4,720,490,802</td><td>100.00</td></tr>
        </table>
      `;

      const parsed = parseTdccQryResultHtml(htmlLevel16Total, '2344', '2026-11-06');
      expect(parsed).not.toBeNull();
      expect(parsed.totalShareholders).toBe(583766);
      expect(parsed.over1000Ratio).toBeCloseTo(63.32, 1);
      expect(parsed.over400Ratio).toBeCloseTo(66.73, 1);
      // 嚴格僅加總 1~3 級距 (854,311,797 / 4,720,490,802 = 18.10%)，排除 4~5 級距 (10~20 張)
      expect(parsed.under10Ratio).toBeCloseTo(18.1, 1);
    });

    it('T08-2: parseTdccQryResultHtml 含級距 16 差異數調整與級距 17 合計列時同樣精準解析，缺合計列時以 1~15 級加總保底', () => {
      const { parseTdccQryResultHtml } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');
      const htmlWithDiff = `
        <table>
          <tr><td>1</td><td>1-999</td><td>100</td><td>50,000</td><td>5.00</td></tr>
          <tr><td>3</td><td>5,001-10,000</td><td>20</td><td>150,000</td><td>15.00</td></tr>
          <tr><td>4</td><td>10,001-15,000</td><td>10</td><td>120,000</td><td>12.00</td></tr>
          <tr><td>15</td><td>1,000,001以上</td><td>5</td><td>680,000</td><td>68.00</td></tr>
          <tr><td>16</td><td>差異數調整（說明4）</td><td>0</td><td>0</td><td>0.00</td></tr>
          <tr><td>17</td><td>合 計</td><td>135</td><td>1,000,000</td><td>100.00</td></tr>
        </table>
      `;
      const p1 = parseTdccQryResultHtml(htmlWithDiff, '2330', '2026-11-13');
      expect(p1.totalShareholders).toBe(135);
      expect(p1.under10Ratio).toBe(20);
      expect(p1.over1000Ratio).toBe(68);

      const htmlMissingTotal = `
        <table>
          <tr><td>1</td><td>1-999</td><td>100</td><td>200,000</td><td>20.00</td></tr>
          <tr><td>15</td><td>1,000,001以上</td><td>5</td><td>800,000</td><td>80.00</td></tr>
        </table>
      `;
      const p2 = parseTdccQryResultHtml(htmlMissingTotal, '2330', '2026-11-13');
      expect(p2.totalShareholders).toBe(105);
      expect(p2.over1000Ratio).toBe(80);
      expect(p2.under10Ratio).toBe(20);
    });

    it('T09-1: hasTdccSeriesGap 應檢出筆數不足、內部斷層 (>11天) 與基準日過期，連續完整 12 週回傳 false', () => {
      const { hasTdccSeriesGap } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');
      expect(typeof hasTdccSeriesGap).toBe('function');

      // 4 筆不足
      expect(
        hasTdccSeriesGap(
          [{ date: '2026-09-04' }, { date: '2026-10-22' }, { date: '2026-11-13' }, { date: '2026-11-20' }],
          { minWeeks: 10, latestPublishDate: '2026-11-20' }
        )
      ).toBe(true);

      // 11 筆但內部缺 2026-10-30（10-22 -> 11-06 相距 15 天 > 11 天）
      const withInteriorGap = [
        '2026-08-28', '2026-09-04', '2026-09-18', '2026-09-24', '2026-10-02',
        '2026-10-08', '2026-10-16', '2026-10-22', '2026-11-06', '2026-11-13', '2026-11-20',
      ].map((date) => ({ date }));
      expect(hasTdccSeriesGap(withInteriorGap, { minWeeks: 10, latestPublishDate: '2026-11-20' })).toBe(true);

      // 完整連續 10 週（容許連假週四結算相鄰 <= 11 天）
      const continuous10 = [
        '2026-09-18', '2026-09-24', '2026-10-02', '2026-10-08', '2026-10-16',
        '2026-10-22', '2026-10-30', '2026-11-06', '2026-11-13', '2026-11-20',
      ].map((date) => ({ date }));
      expect(hasTdccSeriesGap(continuous10, { minWeeks: 10, latestPublishDate: '2026-11-20' })).toBe(false);

      // 過期（最新日落後官方發布日 > 7 天）
      expect(hasTdccSeriesGap(continuous10, { minWeeks: 10, latestPublishDate: '2026-12-04' })).toBe(true);
    });

    it('T09-2: backfillSymbolTdccHistory 即使已有 >=8 週但存在內部缺口仍應僅補差集，且逐週寫庫抗中途 Abort', async () => {
      const { initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
      const { backfillSymbolTdccHistory } = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');

      const db = initSqliteLakehouseDb(testDbPath);
      // 預置 8 週，但刻意缺少 2026-10-30 與 2026-10-16，以及 2026-09-24
      const existing = [
        '2026-11-20', '2026-11-13', '2026-11-06', '2026-10-22',
        '2026-10-08', '2026-10-02', '2026-09-18', '2026-09-11',
      ];
      const ins = db.prepare(`
        INSERT INTO tw_tdcc_distribution (symbol, date, total_shareholders, over_400_ratio, over_1000_ratio, under_10_ratio, updated_at)
        VALUES ('0050', ?, 3500000, 25.0, 23.0, 39.0, 1000)
      `);
      for (const d of existing) ins.run(d);

      const officialDates = [
        '20261120', '20261113', '20261106', '20261030', '20261022', '20261016',
        '20261008', '20261002', '20260924', '20260918', '20260911', '20260904',
      ];
      const initHtml = `
        <input type="hidden" name="SYNCHRONIZER_TOKEN" value="tok-0" />
        <input type="hidden" name="firDate" value="20261120" />
        <select name="scaDate">
          ${officialDates.map((d) => `<option value="${d}">${d}</option>`).join('')}
        </select>
      `;

      const controller = new AbortController();
      const postRequestedDates: string[] = [];
      let postCount = 0;

      const mockFetcher = async (_url: string, opts?: any) => {
        if (!opts || !opts.method || opts.method === 'GET') {
          return {
            ok: true,
            headers: { getSetCookie: () => ['JSESSIONID=abc; Path=/'] },
            text: async () => initHtml,
          };
        }
        postCount++;
        const params = new URLSearchParams(opts.body);
        const scaDate = params.get('scaDate') || '';
        postRequestedDates.push(scaDate);

        // 第 3 次 POST 觸發中途 Abort 模擬超時中斷，驗證前 2 週已逐週落盤保存
        if (postCount === 3) {
          controller.abort();
          const abortErr: any = new Error('Aborted');
          abortErr.name = 'AbortError';
          throw abortErr;
        }

        return {
          ok: true,
          headers: { getSetCookie: () => [] },
          text: async () => `
            <input type="hidden" name="SYNCHRONIZER_TOKEN" value="tok-${postCount}" />
            <table>
              <tr><td>1</td><td>1-999</td><td>1,500,000</td><td>200,000,000</td><td>20.00</td></tr>
              <tr><td>15</td><td>1,000,001以上</td><td>300</td><td>250,000,000</td><td>25.00</td></tr>
              <tr><td>16</td><td>合 計</td><td>3,800,000</td><td>1,000,000,000</td><td>100.00</td></tr>
            </table>
          `,
        };
      };

      const res = await backfillSymbolTdccHistory('0050', 12, testDbPath, mockFetcher, controller.signal);
      // 驗證僅請求缺口差集 (20261030, 20261016, 20260924)，絕不重抓已有日期
      expect(postRequestedDates).toEqual(['20261030', '20261016', '20260924']);
      // 前 2 週必須已逐週即時寫入 SQLite，不因第 3 週 Abort 而蒸發
      expect(res.savedCount).toBe(2);
      const persisted = db
        .prepare("SELECT date FROM tw_tdcc_distribution WHERE symbol = '0050' AND date IN ('2026-10-30', '2026-10-16') ORDER BY date")
        .all() as any[];
      expect(persisted.map((r) => r.date)).toEqual(['2026-10-16', '2026-10-30']);

      closeSqliteDb();
    });
  });
});
