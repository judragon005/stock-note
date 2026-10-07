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
});

