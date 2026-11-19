import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const path = require('path');
const fs = require('fs');
const os = require('os');

// 輔助工具：將 ASCII 字串與 Big5 位元組陣列組合成真實 Big5 Uint8Array / ArrayBuffer
const BIG5_TOKENS: Record<string, number[]> = {
  日期: [0xa4, 0xe9, 0xb4, 0xc1],
  商品名稱: [0xb0, 0xd3, 0xab, 0x7e, 0xa6, 0x57, 0xba, 0xd9],
  身份別: [0xa8, 0xad, 0xa5, 0xf7, 0xa7, 0x4f],
  臺股期貨: [0xbb, 0x4f, 0xaa, 0xd1, 0xb4, 0xc1, 0xb3, 0x66],
  外資及陸資: [0xa5, 0x7e, 0xb8, 0xea, 0xa4, 0xce, 0xb3, 0xb0, 0xb8, 0xea],
  投信: [0xa7, 0xeb, 0xab, 0x48],
  自營商: [0xa6, 0xdb, 0xc0, 0xe7, 0xb0, 0xd3],
  賣權成交量: [0xbd, 0xe6, 0xc5, 0x76, 0xa6, 0xa8, 0xa5, 0xe6, 0xb6, 0x71],
  買權成交量: [0xb6, 0x52, 0xc5, 0x76, 0xa6, 0xa8, 0xa5, 0xe6, 0xb6, 0x71],
  '買賣權成交量比率%': [0xb6, 0x52, 0xbd, 0xe6, 0xc5, 0x76, 0xa6, 0xa8, 0xa5, 0xe6, 0xb6, 0x71, 0xa4, 0xf1, 0xb2, 0x76, 0x25],
  賣權未平倉量: [0xbd, 0xe6, 0xc5, 0x76, 0xa5, 0xbc, 0xa5, 0xad, 0xad, 0xdc, 0xb6, 0x71],
  買權未平倉量: [0xb6, 0x52, 0xc5, 0x76, 0xa5, 0xbc, 0xa5, 0xad, 0xad, 0xdc, 0xb6, 0x71],
  '買賣權未平倉量比率%': [0xb6, 0x52, 0xbd, 0xe6, 0xc5, 0x76, 0xa5, 0xbc, 0xa5, 0xad, 0xad, 0xdc, 0xb6, 0x71, 0xa4, 0xf1, 0xb2, 0x76, 0x25],
};

function encodeBig5Chunks(chunks: Array<string | keyof typeof BIG5_TOKENS>): ArrayBuffer {
  const bytes: number[] = [];
  for (const chunk of chunks) {
    if (BIG5_TOKENS[chunk]) {
      bytes.push(...BIG5_TOKENS[chunk]);
    } else {
      for (let i = 0; i < chunk.length; i++) {
        bytes.push(chunk.charCodeAt(i) & 0xff);
      }
    }
  }
  return new Uint8Array(bytes).buffer;
}

describe('Spec 0239 T04: 台股總經衍生品採集 (TAIFEX Big5 期貨 OI / P/C Ratio / 融資維持率 / 逐欄非空合併)', () => {
  let macroModule: any;
  let sqliteDbCore: any;
  let tmpDir: string;
  let testDbPath: string;

  beforeEach(() => {
    sqliteDbCore = require('../../scripts/market-sync/sqlite-db-core.cjs');
    macroModule = require('../../scripts/market-sync/ingest-macro-sentiment.cjs');
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 't04-tw-macro-'));
    testDbPath = path.join(tmpDir, 'test_t04.db');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (sqliteDbCore && sqliteDbCore.closeSqliteDb) {
      sqliteDbCore.closeSqliteDb();
    }
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('契約 1: TAIFEX Big5 解碼與期貨三大法人未平倉解析', () => {
    it('1.1 decodeTaifexText 應能正確將 Big5 位元組還原為繁體中文，同時相容 UTF-8 無損通過', () => {
      const big5Buf = encodeBig5Chunks([
        '日期', ',', '商品名稱', ',', '身份別', ',c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,c13,c14\r\n',
        '2026/11/18,', '臺股期貨', ',', '外資及陸資', ',100,100,100,100,0,0,10000,0,107896,0,"-97,896",0\r\n',
        '2026/11/18,', '臺股期貨', ',', '投信', ',100,100,100,100,0,0,28420,0,10000,0,"18,420",0\r\n',
      ]);

      const decodedBig5 = macroModule.decodeTaifexText(big5Buf);
      expect(decodedBig5).toContain('臺股期貨');
      expect(decodedBig5).toContain('外資及陸資');
      expect(decodedBig5).not.toContain('\uFFFD');

      const parsed = macroModule.parseTaifexInstitutionalFuturesCsv(decodedBig5);
      expect(parsed).toEqual({
        foreignNetOi: -97896,
        trustNetOi: 18420,
      });

      // UTF-8 Buffer 也應保持正確繁體中文不誤轉 Big5
      const utf8Csv =
        '日期,商品名稱,身份別,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,c13,c14\n' +
        '2026/11/18,臺股期貨,外資及陸資,0,0,0,0,0,0,0,0,0,0,-41200,0\n' +
        '2026/11/18,臺股期貨,投信,0,0,0,0,0,0,0,0,0,0,22100,0\n';
      const utf8Buf = new TextEncoder().encode(utf8Csv).buffer;
      const decodedUtf8 = macroModule.decodeTaifexText(utf8Buf);
      expect(decodedUtf8).toContain('臺股期貨');
      expect(macroModule.parseTaifexInstitutionalFuturesCsv(decodedUtf8)).toEqual({
        foreignNetOi: -41200,
        trustNetOi: 22100,
      });
    });

    it('1.2 fetchTaifexInstitutionalOi 走原生 fetch 收到 Big5 ArrayBuffer 時，應使用 arrayBuffer() + decodeTaifexText 解析', async () => {
      const big5Buf = encodeBig5Chunks([
        '日期', ',', '商品名稱', ',', '身份別', ',c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,c13,c14\r\n',
        '2026/11/18,', '臺股期貨', ',', '外資及陸資', ',100,100,100,100,0,0,10000,0,107896,0,-97896,0\r\n',
        '2026/11/18,', '臺股期貨', ',', '投信', ',100,100,100,100,0,0,28420,0,10000,0,18420,0\r\n',
        '2026/11/18,', '臺股期貨', ',', '自營商', ',100,100,100,100,0,0,5000,0,3000,0,2000,0\r\n',
      ]);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => big5Buf,
        // 若仍誤用 res.text() (UTF-8 解碼 Big5)，會產出亂碼導致測試失敗
        text: async () => new TextDecoder('utf-8').decode(big5Buf),
      });
      vi.stubGlobal('fetch', mockFetch);

      const res = await macroModule.fetchTaifexInstitutionalOi({ finmindApiKey: '' });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(res).toEqual({
        foreignNetOi: -97896,
        trustNetOi: 18420,
      });
    });
  });

  describe('契約 2: 台指選擇權 Put/Call Ratio (tw_put_call_ratio) 採集與入庫', () => {
    it('2.1 parseTaifexPutCallRatioCsv 應自多日資料（不論升序或降序）精確提取最新一日賣權/買權未平倉比率 (%)', () => {
      const descCsv = [
        '日期,賣權成交量,買權成交量,買賣權成交量比率%,賣權未平倉量,買權未平倉量,買賣權未平倉量比率%',
        '2026/11/18,452100,418200,108.11,285400,248200,114.99',
        '2026/11/17,410000,430000,95.35,260000,255000,101.96',
      ].join('\n');
      expect(macroModule.parseTaifexPutCallRatioCsv(descCsv)).toBe(114.99);

      // 升序（最舊在前、最新在後）且含 % 符號
      const ascCsv = [
        '日期,賣權成交量,買權成交量,買賣權成交量比率%,賣權未平倉量,買權未平倉量,買賣權未平倉量比率%',
        '2026/11/17,410000,430000,95.35%,260000,255000,101.96%',
        '2026/11/18,452100,418200,108.11%,285400,248200,122.45%',
      ].join('\n');
      expect(macroModule.parseTaifexPutCallRatioCsv(ascCsv)).toBe(122.45);

      // 空資料回傳 null
      expect(macroModule.parseTaifexPutCallRatioCsv('')).toBeNull();
    });

    it('2.2 fetchTaifexPutCallRatio 應支援 Big5 pcRatioDown CSV 解碼並回傳最新 P/C Ratio (%)', async () => {
      const big5PcBuf = encodeBig5Chunks([
        '日期', ',', '賣權成交量', ',', '買權成交量', ',', '買賣權成交量比率%', ',',
        '賣權未平倉量', ',', '買權未平倉量', ',', '買賣權未平倉量比率%', '\r\n',
        '2026/11/18,452100,418200,108.11,285400,248200,114.99\r\n',
        '2026/11/17,410000,430000,95.35,260000,255000,101.96\r\n',
      ]);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => big5PcBuf,
        text: async () => new TextDecoder('utf-8').decode(big5PcBuf),
      });
      vi.stubGlobal('fetch', mockFetch);

      const pcRatio = await macroModule.fetchTaifexPutCallRatio();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(String(mockFetch.mock.calls[0][0])).toContain('pcRatioDown');
      expect(pcRatio).toBe(114.99);
    });

    it('2.3 fetchFullMacroWarRoomPulse 與 fetchMacroSentimentDaily 應接通 twPutCallRatio 並成功入庫 SQLite', async () => {
      if (!sqliteDbCore.isSqliteSupported()) return;

      const mockFetchJson = async (url: string) => {
        if (url.includes('pcRatioDown')) {
          return [
            '日期,賣權成交量,買權成交量,買賣權成交量比率%,賣權未平倉量,買權未平倉量,買賣權未平倉量比率%',
            '2026/11/18,452100,418200,108.11,285400,248200,118.65',
          ].join('\n');
        }
        if (url.includes('futContractsDateDown')) {
          return [
            '日期,商品名稱,身份別,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,c13,c14',
            '2026/11/18,臺股期貨,外資及陸資,0,0,0,0,0,0,0,0,0,0,-97896,0',
            '2026/11/18,臺股期貨,投信,0,0,0,0,0,0,0,0,0,0,18420,0',
          ].join('\n');
        }
        return null;
      };

      const daily = await macroModule.fetchMacroSentimentDaily({
        date: '2026-11-18',
        fredApiKey: '',
        finmindApiKey: '',
        fetchJson: mockFetchJson,
      });

      expect(daily.twPutCallRatio).toBe(118.65);
      expect(daily.pulse.twPutCallRatio).toBe(118.65);
      expect(daily.twForeignFuturesOi).toBe(-97896);

      const ok = macroModule.ingestMacroSentimentToDb(daily, testDbPath);
      expect(ok).toBe(true);

      const db = sqliteDbCore.getSqliteDbConnection(testDbPath);
      const row = db
        .prepare('SELECT tw_put_call_ratio, tw_foreign_futures_oi, tw_trust_futures_oi FROM macro_sentiment_daily WHERE date = ?')
        .get('2026-11-18');
      expect(row.tw_put_call_ratio).toBe(118.65);
      expect(row.tw_foreign_futures_oi).toBe(-97896);
      expect(row.tw_trust_futures_oi).toBe(18420);
    });
  });

  describe('契約 3: 全市場信用融資維持率 (tw_margin_maintenance_ratio) 真實計算', () => {
    it('3.1 應從 TWSE MI_MARGN tables[0] 總融資金額與 tables[1] 個股融資餘額 × 本機 SQLite 收盤價精確計算擔保品總市值比', async () => {
      if (!sqliteDbCore.isSqliteSupported()) return;

      const db = sqliteDbCore.initSqliteLakehouseDb(testDbPath);
      const insertCandle = db.prepare(`
        INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      // 2330: 10,000 張 * 1000 股 * 1000 元 = 100 億元
      // 2317: 30,000 張 * 1000 股 * 200 元 = 60 億元
      // 總擔保品市值 = 160 億元；若全市場融資總金額 = 95 億元 (9,500,000 仟元)
      // 真實融資維持率 = (160 / 95) * 100 = 168.42% -> 168.4
      insertCandle.run('2330', '2026-11-18', 990, 1010, 985, 1000, 1000, 30000);
      insertCandle.run('2317', '2026-11-18', 198, 202, 197, 200, 200, 50000);

      const mockMiMargn = {
        stat: 'OK',
        date: '20261118',
        tables: [
          {
            title: '115年11月18日 信用交易統計',
            fields: ['項目', '買進', '賣出', '現金(券)償還', '前日餘額', '今日餘額'],
            data: [
              ['融資(交易單位)', '5,000', '4,000', '100', '39,100', '40,000'],
              ['融券(交易單位)', '500', '400', '10', '2,000', '1,900'],
              ['融資金額(仟元)', '500,000', '400,000', '10,000', '9,410,000', '9,500,000'],
            ],
          },
          {
            title: '115年11月18日 融資融券彙總 (全部)',
            fields: ['代號', '名稱', '買進', '賣出', '現金償還', '前日餘額', '今日餘額', '次一營業日限額'],
            data: [
              ['2330', '台積電', '500', '400', '10', '9,910', '10,000', '500,000'],
              ['2317', '鴻海', '1,000', '800', '20', '29,820', '30,000', '800,000'],
            ],
          },
        ],
      };

      const ratio = await macroModule.fetchTwTotalMarginMaintenance({
        fetchJson: async () => mockMiMargn,
        db,
        finmindApiKey: '',
      });

      expect(ratio).toBe(168.4);
    });

    it('3.2 無個股明細時，應依 MI_MARGN tables[0] 有效融資餘額結合大盤指數現價與 60MA 合理推導維持率', async () => {
      const mockMiMargnOnlySummary = {
        stat: 'OK',
        date: '20261118',
        tables: [
          {
            title: '115年11月18日 信用交易統計',
            fields: ['項目', '買進', '賣出', '現金(券)償還', '前日餘額', '今日餘額'],
            data: [
              ['融資(交易單位)', '345,120', '312,450', '8,200', '7,420,100', '7,444,570'],
              ['融資金額(仟元)', '18,520,000', '16,810,000', '420,000', '320,500,000', '321,790,000'],
            ],
          },
        ],
      };

      // (100 / 0.6) * (23500 / 23000) = 166.6667 * 1.021739 = 170.29 -> 170.3
      const ratio = await macroModule.fetchTwTotalMarginMaintenance({
        fetchJson: async () => mockMiMargnOnlySummary,
        taiexQuote: { price: 23500, ma20: 23200, ma60: 23000 },
        finmindApiKey: '',
      });

      expect(ratio).toBe(170.3);
    });

    it('3.3 Zero-Mock 邊界：MI_MARGN 查無資料或 stat 非 OK 時應誠實回傳 null，嚴禁捏造假常數', async () => {
      const nullRatio1 = await macroModule.fetchTwTotalMarginMaintenance({
        fetchJson: async () => ({ stat: '很抱歉，沒有符合條件的資料!' }),
        taiexQuote: { price: 23500, ma20: 23200, ma60: 23000 },
        finmindApiKey: '',
      });
      expect(nullRatio1).toBeNull();

      const nullRatio2 = await macroModule.fetchTwTotalMarginMaintenance({
        fetchJson: async () => null,
        taiexQuote: { price: 23500, ma20: 23200, ma60: 23000 },
        finmindApiKey: '',
      });
      expect(nullRatio2).toBeNull();
    });
  });

  describe('契約 4: getCoalescedLatestMacroSentiment(db, lookbackRows = 7) 逐欄非空合併', () => {
    it('4.1 今日盤前衍生品為 NULL 時應逐欄承接最近 7 筆最新有效值，並標註 tw_derivatives_as_of_date', () => {
      if (!sqliteDbCore.isSqliteSupported()) return;

      const db = sqliteDbCore.initSqliteLakehouseDb(testDbPath);

      // 2026-11-17：融資維持率有效 (168.4)，較舊外資 OI (-85000)
      macroModule.ingestMacroSentimentToDb(
        {
          date: '2026-11-17',
          vixClose: 16.5,
          treasuryYield10y: 4.35,
          twForeignFuturesOi: -85000,
          twTrustFuturesOi: 15000,
          twPutCallRatio: 105.2,
          twMarginMaintenanceRatio: 168.4,
        },
        testDbPath
      );

      // 2026-11-18：最新期貨 OI (-97896) 與 P/C Ratio (114.99)，但融資維持率缺失
      macroModule.ingestMacroSentimentToDb(
        {
          date: '2026-11-18',
          vixClose: 17.2,
          treasuryYield10y: 4.41,
          twForeignFuturesOi: -97896,
          twTrustFuturesOi: 18420,
          twPutCallRatio: 114.99,
          twMarginMaintenanceRatio: null,
        },
        testDbPath
      );

      // 2026-11-19 (今日盤前)：美股 VIX 與美債已更新，但台股衍生品全為 NULL
      macroModule.ingestMacroSentimentToDb(
        {
          date: '2026-11-19',
          vixClose: 18.8,
          treasuryYield10y: 4.45,
          twForeignFuturesOi: null,
          twTrustFuturesOi: null,
          twPutCallRatio: null,
          twMarginMaintenanceRatio: null,
        },
        testDbPath
      );

      const merged = macroModule.getCoalescedLatestMacroSentiment(db, 7);
      expect(merged).not.toBeNull();
      expect(merged.date).toBe('2026-11-19');
      expect(merged.vix_close).toBe(18.8);
      expect(merged.treasury_yield_10y).toBe(4.45);
      expect(merged.tw_foreign_futures_oi).toBe(-97896);
      expect(merged.tw_trust_futures_oi).toBe(18420);
      expect(merged.tw_put_call_ratio).toBe(114.99);
      expect(merged.tw_margin_maintenance_ratio).toBe(168.4);
      expect(merged.tw_derivatives_as_of_date).toBe('2026-11-18');
    });

    it('4.2 數值 0 屬於合法有效值不得被舊日覆蓋；超出 lookbackRows 視窗之資料不得被併入；空表回傳 null', () => {
      if (!sqliteDbCore.isSqliteSupported()) return;

      const db = sqliteDbCore.initSqliteLakehouseDb(testDbPath);
      expect(macroModule.getCoalescedLatestMacroSentiment(db, 7)).toBeNull();

      // 較舊一日 (第 3 筆)：有外資 OI 與非零投信 OI
      macroModule.ingestMacroSentimentToDb(
        {
          date: '2026-11-15',
          twForeignFuturesOi: -70000,
          twTrustFuturesOi: 12000,
          twPutCallRatio: 98.5,
        },
        testDbPath
      );
      // 第 2 筆：投信 OI 為 0 (有效值)，外資 OI 為 NULL
      macroModule.ingestMacroSentimentToDb(
        {
          date: '2026-11-18',
          twForeignFuturesOi: null,
          twTrustFuturesOi: 0,
          twPutCallRatio: null,
        },
        testDbPath
      );
      // 第 1 筆：今日皆為 NULL
      macroModule.ingestMacroSentimentToDb(
        {
          date: '2026-11-19',
          vixClose: 19.1,
        },
        testDbPath
      );

      // lookbackRows = 2：只看 11-19 與 11-18，不應抓到 11-15 的 -70000 或 98.5，且 0 應被保留
      const merged2 = macroModule.getCoalescedLatestMacroSentiment(db, 2);
      expect(merged2.date).toBe('2026-11-19');
      expect(merged2.tw_trust_futures_oi).toBe(0);
      expect(merged2.tw_foreign_futures_oi).toBeNull();
      expect(merged2.tw_put_call_ratio).toBeNull();
      expect(merged2.tw_derivatives_as_of_date).toBe('2026-11-18');

      // lookbackRows = 7：0 仍應保留（不被 11-15 的 12000 覆蓋），而外資 OI 與 P/C 承接 11-15
      const merged7 = macroModule.getCoalescedLatestMacroSentiment(db, 7);
      expect(merged7.tw_trust_futures_oi).toBe(0);
      expect(merged7.tw_foreign_futures_oi).toBe(-70000);
      expect(merged7.tw_put_call_ratio).toBe(98.5);
      expect(merged7.tw_derivatives_as_of_date).toBe('2026-11-18');
    });
  });
});
