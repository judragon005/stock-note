import { describe, it, expect, vi } from 'vitest';

declare const require: (id: string) => any;

describe('Spec 0168 / Ticket 07: 台股日期驅動歷史回補模組 (backfill-tw-history-web.cjs)', () => {
  const {
    generateTradeDateCandidates,
    formatRocDate,
    parseTwseDailyQuotesWithTransactions,
    parseTpexDailyQuotesWithTransactions,
    fetchAndIngestTwDailyData,
    saveTwDailyQuotesBatch,
  } = require('../../scripts/market-sync/backfill-tw-history-web.cjs');

  describe('1. 日期迭代器與民國年格式化', () => {
    it('generateTradeDateCandidates 應自動排除週末 (週六與週日)', () => {
      // 指定 2026-10-07 (週三)，往前取 5 天
      const dates = generateTradeDateCandidates(5, '2026-10-07');
      expect(dates.length).toBe(5);
      // 確保排除週日 (0) 與週六 (6)
      for (const d of dates) {
        const dayOfWeek = new Date(d).getDay();
        expect(dayOfWeek).not.toBe(0);
        expect(dayOfWeek).not.toBe(6);
      }
    });

    it('formatRocDate 應正確將 YYYY-MM-DD 轉為民國年 YYY/MM/DD', () => {
      expect(formatRocDate('2026-10-07')).toBe('115/10/07');
      expect(formatRocDate('2025-01-02')).toBe('114/01/02');
    });
  });

  describe('2. TWSE MI_INDEX 官方收盤行情與真實成交筆數解析', () => {
    it('應精準提取開高低收、成交量、成交金額，以及第 4 欄之官方 transactions 成交筆數', () => {
      const mockTwseMiIndex = {
        stat: 'OK',
        tables: [
          {
            title: '每日收盤行情(全部(不含權證、牛熊證))',
            data: [
              // 0:代號, 1:名稱, 2:成交股數, 3:成交筆數, 4:成交金額, 5:開盤, 6:最高, 7:最低, 8:收盤
              ['2330', '台積電', '25,123,456', '38,912', '24,567,890,123', '980.00', '990.00', '975.00', '988.00'],
              ['0050', '元大台灣50', '8,456,123', '12,345', '1,567,890,123', '180.00', '182.50', '179.50', '182.00'],
              ['999999', '非標準標的', '0', '0', '0', '--', '--', '--', '--'], // 異常標的應過濾
            ],
          },
        ],
      };

      const quotes = parseTwseDailyQuotesWithTransactions(mockTwseMiIndex, '2026-10-07');
      expect(Object.keys(quotes)).toEqual(['2330', '0050']);

      const tsmc = quotes['2330'];
      expect(tsmc.symbol).toBe('2330');
      expect(tsmc.date).toBe('2026-10-07');
      expect(tsmc.open).toBe(980);
      expect(tsmc.high).toBe(990);
      expect(tsmc.low).toBe(975);
      expect(tsmc.close).toBe(988);
      expect(tsmc.volume).toBe(25123456);
      expect(tsmc.turnover).toBe(24567890123);
      expect(tsmc.transactions).toBe(38912); // 真實成交筆數驗證！
    });
  });

  describe('3. TPEx 1430 官方上櫃行情解析與櫃買標的 O 尾綴自動正規化', () => {
    it('應自動將 3293O 與 00411AO 剝除 O 尾綴，轉為標準代碼 3293 與 00411A，並解析 transactions', () => {
      const mockTpex1430 = {
        tables: [
          {
            data: [
              // 0:代號, 1:名稱, 2:收盤價, 3:漲跌, 4:開盤價, 5:最高價, 6:最低價, 7:成交筆數, 8:成交股數, 9:成交金額
              ['3293O', '鈊象', '1,050.00', '+10.00', '1,040.00', '1,060.00', '1,035.00', '4,512', '1,234,567', '1,296,000,000'],
              ['00411AO', '主動統一前沿科技', '15.68', '+0.12', '15.55', '15.72', '15.50', '1,892', '12,500,000', '196,000,000'],
            ],
          },
        ],
      };

      const quotes = parseTpexDailyQuotesWithTransactions(mockTpex1430, '2026-10-07');
      expect(quotes['3293O']).toBeUndefined(); // 舊的 O 代碼不應殘留
      expect(quotes['00411AO']).toBeUndefined();

      expect(quotes['3293']).toBeDefined();
      expect(quotes['3293'].symbol).toBe('3293');
      expect(quotes['3293'].close).toBe(1050);
      expect(quotes['3293'].transactions).toBe(4512);

      expect(quotes['00411A']).toBeDefined();
      expect(quotes['00411A'].symbol).toBe('00411A');
      expect(quotes['00411A'].close).toBe(15.68);
      expect(quotes['00411A'].transactions).toBe(1892);
    });
  });

  describe('4. 休市日辨識與防爬蟲延遲', () => {
    it('當遇到假日或官方休市無資料時，應優雅辨識為非交易日並跳過，不拋錯', async () => {
      const mockHolidayFetcher = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('MI_INDEX')) {
          return { stat: '很抱歉，沒有符合條件的資料!' };
        }
        if (url.includes('stk_wn1430')) {
          return { tables: [{ data: [] }] };
        }
        return { data: [] };
      });

      const result = await fetchAndIngestTwDailyData('2026-10-10', {
        fetcher: mockHolidayFetcher,
        throttleMs: 0,
        inMemoryOnly: true,
      });

      expect(result.isTradingDay).toBe(false);
      expect(result.quotesCount).toBe(0);
      expect(result.chipsCount).toBe(0);
    });
  });

  describe('5. saveTwDailyQuotesBatch 事務入庫與 transactions 欄位持久化', () => {
    it('應能正確將含有 transactions 欄位之日 K 寫入 SQLite 並冪等更新', () => {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const { initSqliteLakehouseDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');

      const tempDbPath = path.join(os.tmpdir(), `test_backfill_${Date.now()}.db`);
      try {
        const mockQuotes = {
          '00411A': {
            symbol: '00411A',
            date: '2026-10-07',
            open: 15.55,
            high: 15.72,
            low: 15.5,
            close: 15.68,
            adj_close: 15.68,
            volume: 12500000,
            turnover: 196000000,
            transactions: 1892,
          },
        };

        const res = saveTwDailyQuotesBatch(mockQuotes, tempDbPath);
        expect(res.savedCount).toBe(1);

        const db = initSqliteLakehouseDb(tempDbPath);
        const row = db.prepare('SELECT * FROM daily_candles WHERE symbol = ? AND date = ?').get('00411A', '2026-10-07');
        expect(row).toBeDefined();
        expect(row.symbol).toBe('00411A');
        expect(row.close).toBe(15.68);
        expect(row.transactions).toBe(1892);
      } finally {
        if (fs.existsSync(tempDbPath)) {
          try { fs.unlinkSync(tempDbPath); } catch {}
        }
      }
    });
  });

  describe('6. [Spec 0184 / Ticket 01] 盤中時間守衛與交易日曆重用', () => {
    it('generateTradeDateCandidates 應排除法定休市日 (如 2026-10-09 國慶補假)', () => {
      // 基準從 2026-10-12 (週一) 往前推 5 個交易日
      // 2026-10-12 (一), 2026-10-09 (五為法定國慶休市), 2026-10-08 (四), 2026-10-07 (三), 2026-10-06 (二), 2026-10-05 (一)
      const dates = generateTradeDateCandidates(5, '2026-10-12');
      expect(dates).not.toContain('2026-10-09'); // 國慶連假必須排除
      expect(dates).not.toContain('2026-10-10'); // 週六
      expect(dates).not.toContain('2026-10-11'); // 週日
      expect(dates).toEqual(['2026-10-12', '2026-10-08', '2026-10-07', '2026-10-06', '2026-10-05']);
    });

    it('未給定基準日且當前時間小於 15:30 時，候選起始日應自動定錨至昨日 (T-1)', () => {
      // 模擬上午 10:00 (盤中)
      const mockNow = new Date('2026-10-16T10:00:00+08:00');
      const dates = generateTradeDateCandidates(3, undefined, mockNow);
      expect(dates[0]).not.toBe('2026-10-16'); // 盤中未收盤不可將今天排入
      expect(dates[0]).toBe('2026-10-15');
    });

    it('未給定基準日且當前時間大於等於 15:30 時，候選起始日應包含今日 (T)', () => {
      // 模擬下午 16:00 (盤後)
      const mockNow = new Date('2026-10-16T16:00:00+08:00');
      const dates = generateTradeDateCandidates(3, undefined, mockNow);
      expect(dates[0]).toBe('2026-10-16');
    });
  });

  describe('7. [Spec 0184 / Ticket 02] TPEx 1430 權證標的排除 (6 碼 7 開頭)', () => {
    it('應過濾排除 6 碼以 7 開頭之認購/認售權證，保留股票、ETF 與可轉債', () => {
      const mockTpexWithWarrants = {
        tables: [
          {
            data: [
              ['3293', '鈊象', '1,050.00', '+10.00', '1,040.00', '1,060.00', '1,035.00', '4,512', '1,234,567', '1,296,000,000'],
              ['700001', '群益01', '1.25', '+0.05', '1.20', '1.28', '1.20', '120', '50,000', '62,500'], // 權證應被排除
              ['739999', '元大99', '0.85', '-0.02', '0.87', '0.87', '0.85', '80', '30,000', '25,500'], // 權證應被排除
              ['00411A', '主動統一', '15.68', '+0.12', '15.55', '15.72', '15.50', '1,892', '12,500,000', '196,000,000'],
              ['15601', '中砂一', '120.00', '+1.50', '118.50', '121.00', '118.50', '50', '10,000', '1,200,000'], // 5 碼可轉債應保留
            ],
          },
        ],
      };

      const quotes = parseTpexDailyQuotesWithTransactions(mockTpexWithWarrants, '2026-10-07');
      expect(quotes['700001']).toBeUndefined();
      expect(quotes['739999']).toBeUndefined();
      expect(quotes['3293']).toBeDefined();
      expect(quotes['00411A']).toBeDefined();
      expect(quotes['15601']).toBeDefined();
    });
  });

  describe('8. [Spec 0184 / Ticket 04] SQLite 雙指標健康快取秒級略過 (Smart Cache Skip)', () => {
    it('當日普通股 >= 1800 且籌碼 >= 2000 時，fetchAndIngestTwDailyData 應回傳 cached: true 且不發起網路請求', async () => {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const { initSqliteLakehouseDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');

      const tempDbPath = path.join(os.tmpdir(), `test_cache_skip_${Date.now()}.db`);
      const db = initSqliteLakehouseDb(tempDbPath);

      // 預先插入 1850 檔 4 碼股票與 2050 檔籌碼
      db.exec('BEGIN TRANSACTION;');
      const candleStmt = db.prepare('INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (let i = 1000; i < 2850; i++) {
        candleStmt.run(String(i), '2026-10-15', 100, 105, 95, 100, 100, 1000);
      }
      const chipStmt = db.prepare('INSERT INTO tw_institutional_chips (symbol, date, foreign_net) VALUES (?, ?, ?)');
      for (let i = 1000; i < 3050; i++) {
        chipStmt.run(String(i), '2026-10-15', 10);
      }
      db.exec('COMMIT;');

      const mockFetcher = vi.fn();
      try {
        const res = await fetchAndIngestTwDailyData('2026-10-15', {
          fetcher: mockFetcher,
          dbPath: tempDbPath,
          throttleMs: 0,
        });

        expect(res.cached).toBe(true);
        expect(mockFetcher).not.toHaveBeenCalled(); // 100% 略過網路請求！
      } finally {
        if (fs.existsSync(tempDbPath)) {
          try { fs.unlinkSync(tempDbPath); } catch {}
        }
      }
    });

    it('若帶入 force: true，即使快取命中也應強制連網重新抓取', async () => {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const { initSqliteLakehouseDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');

      const tempDbPath = path.join(os.tmpdir(), `test_cache_force_${Date.now()}.db`);
      const db = initSqliteLakehouseDb(tempDbPath);

      db.exec('BEGIN TRANSACTION;');
      const candleStmt = db.prepare('INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (let i = 1000; i < 2850; i++) {
        candleStmt.run(String(i), '2026-10-15', 100, 105, 95, 100, 100, 1000);
      }
      const chipStmt = db.prepare('INSERT INTO tw_institutional_chips (symbol, date, foreign_net) VALUES (?, ?, ?)');
      for (let i = 1000; i < 3050; i++) {
        chipStmt.run(String(i), '2026-10-15', 10);
      }
      db.exec('COMMIT;');

      const mockFetcher = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('MI_INDEX')) return { stat: 'OK', tables: [{ data: [['2330', '台積電', '100', '10', '1000', '900', '910', '890', '905']] }] };
        return { data: [] };
      });

      try {
        const res = await fetchAndIngestTwDailyData('2026-10-15', {
          fetcher: mockFetcher,
          dbPath: tempDbPath,
          throttleMs: 0,
          force: true, // 強制穿透！
        });

        expect(res.cached).toBeFalsy();
        expect(mockFetcher).toHaveBeenCalled();
      } finally {
        if (fs.existsSync(tempDbPath)) {
          try { fs.unlinkSync(tempDbPath); } catch {}
        }
      }
    });
  });

  describe('9. [Spec 0184 / Ticket 03] 單邊缺失保護與隔離', () => {
    it('當上市有資料但上櫃完全無資料時，應標記為單邊缺失異常且 hasError: true', async () => {
      const mockFetcher = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('MI_INDEX')) {
          return {
            stat: 'OK',
            tables: [
              {
                fields: ['證券代號', '證券名稱', '收盤價', '成交筆數', '開盤價', '最高價', '最低價', '成交股數', '成交金額'],
                data: [['2330', '台積電', '950', '25000', '940', '955', '938', '35000000', '33000000000']],
              },
            ],
          };
        }
        // 上櫃與籌碼端點回傳空或無資料
        return { tables: [], data: [] };
      });

      const res = await fetchAndIngestTwDailyData('2026-10-15', {
        fetcher: mockFetcher,
        inMemoryOnly: true,
        throttleMs: 0,
      });

      expect(res.hasError).toBe(true);
      expect(res.errorReason).toContain('單邊缺失');
      expect(res.twseQuotesCount).toBeGreaterThan(0);
      expect(res.tpexQuotesCount).toBe(0);
    });
  });
});



