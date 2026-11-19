import { describe, it, expect, vi, afterEach } from 'vitest';

declare const require: (id: string) => any;

const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  parseTwseDayTrade,
  parseTpexMargin,
  stripOtcSuffix,
} = require('../../scripts/market-sync/ingest-tw-extended-chips.cjs');

const {
  parseTpexT86BulkData,
} = require('../../scripts/market-sync/market-sync-core.cjs');

const {
  fetchAndIngestTwDailyData,
  filterTpexSnapshotByTargetDate,
  parseRocOrIsoDateToIso,
} = require('../../scripts/market-sync/backfill-tw-history-web.cjs');

const {
  fetchAndIngestTwPledge,
  parseTwPledgeReport,
  TWSE_PLEDGE_URL,
  TPEX_PLEDGE_URL,
} = require('../../scripts/market-sync/ingest-tw-pledge.cjs');

const {
  fetchAndTagTwStockStatuses,
  getStockStatus,
} = require('../../scripts/market-sync/tag-tw-stock-status.cjs');

const {
  initSqliteLakehouseDb,
  closeSqliteDb,
} = require('../../scripts/market-sync/sqlite-db-core.cjs');

function makeTempDb(prefix: string): string {
  return path.join(os.tmpdir(), `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.db`);
}

function cleanupDb(dbPath: string) {
  closeSqliteDb();
  for (const suffix of ['', '-wal', '-shm']) {
    const p = `${dbPath}${suffix}`;
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {
        // 清理暫存檔容錯
      }
    }
  }
}

describe('Spec 0239 T03: 台股當沖 TWTB4U、TPEx 歷史防污染、處置狀態與董監質押管線', () => {
  const tempDbs: string[] = [];

  afterEach(() => {
    while (tempDbs.length > 0) {
      const p = tempDbs.pop()!;
      cleanupDb(p);
    }
  });

  describe('1. ingest-tw-extended-chips: TWTB4U RWD tables 解析與 TPEx O 尾綴剝除', () => {
    it('parseTwseDayTrade 應優先從 rawData.tables 鎖定含「證券代號」表頭之個股表並依成交股數計算正確當沖率', () => {
      const mockRwdTwtb4u = {
        stat: 'OK',
        date: '20261019',
        tables: [
          {
            title: '115年10月19日 當日沖銷交易統計資訊',
            fields: ['統計項目', '數值'],
            data: [
              ['當日沖銷交易成交股數', '1,234,567,890'],
              ['當日沖銷交易成交股數佔市場比率(%)', '35.12'],
            ],
          },
          {
            title: '115年10月19日 當日沖銷交易標的及成交資訊',
            fields: [
              '證券代號',
              '證券名稱',
              '暫停現股賣出後現股當沖之註記',
              '當日沖銷交易成交股數',
              '當日沖銷交易買進成交金額',
              '當日沖銷交易賣出成交金額',
            ],
            data: [
              ['2330', '台積電', '', '10,000,000', '9,800,000,000', '9,850,000,000'],
              ['2603', '長榮', '', '32,000,000', '6,400,000,000', '6,420,000,000'],
              ['2317', '鴻海', '', '--', '--', '--'],
            ],
          },
        ],
      };

      const volumeMap = {
        '2330': { volume: 40000000 },
        '2603': { volume: 80000000 },
        '2317': { volume: 0 },
      };

      const parsed = parseTwseDayTrade(mockRwdTwtb4u, volumeMap);
      expect(parsed['2330']).toBeDefined();
      expect(parsed['2330'].dayTradeShares).toBe(10000000);
      expect(parsed['2330'].dayTradeRate).toBe(25);
      expect(parsed['2603'].dayTradeRate).toBe(40);
      // 零成交量或無效字元不可產生 NaN
      expect(Number.isNaN(parsed['2317'].dayTradeRate)).toBe(false);
      expect(parsed['2317'].dayTradeRate).toBe(0);
      // 摘要表文字項目不可混入個股結果
      expect(parsed['當日沖銷交易成交股數']).toBeUndefined();
    });

    it('parseTwseDayTrade 應支援含當沖買進/賣出股數與成交股數欄位之 table，且相容舊版 rawData.data', () => {
      const mockBuySellTable = {
        tables: [
          {
            fields: ['證券代號', '證券名稱', '成交股數', '當日沖銷買進股數', '當日沖銷賣出股數'],
            data: [
              ['2454', '聯發科', '10,000,000', '3,000,000', '3,000,000'],
            ],
          },
        ],
      };
      const parsedTable = parseTwseDayTrade(mockBuySellTable);
      expect(parsedTable['2454']).toBeDefined();
      expect(parsedTable['2454'].dayTradeBuyShares).toBe(3000000);
      expect(parsedTable['2454'].dayTradeSellShares).toBe(3000000);
      expect(parsedTable['2454'].dayTradeRate).toBe(30);

      const mockLegacy = {
        data: [['2330', '台積電', '35,000,000', '3,500,000', '10.00']],
      };
      const parsedLegacy = parseTwseDayTrade(mockLegacy);
      expect(parsedLegacy['2330'].dayTradeRate).toBe(10);
    });

    it('parseTpexMargin 應統一使用 stripOtcSuffix 剝除 8299O 與 00679BO 尾綴 O', () => {
      expect(typeof stripOtcSuffix).toBe('function');
      expect(stripOtcSuffix('8299O')).toBe('8299');
      expect(stripOtcSuffix('00679BO')).toBe('00679B');

      const mockTpexMargin = [
        {
          Date: '1151019',
          SecuritiesCompanyCode: '8299O',
          MarginPurchaseBalance: '4,200',
          ShortSaleBalance: '120',
        },
        {
          Date: '1151019',
          SecuritiesCompanyCode: '00679BO',
          MarginPurchaseBalance: '15,000',
          ShortSaleBalance: '0',
        },
      ];

      const parsed = parseTpexMargin(mockTpexMargin);
      expect(parsed['8299O']).toBeUndefined();
      expect(parsed['00679BO']).toBeUndefined();
      expect(parsed['8299']?.marginBalance).toBe(4200);
      expect(parsed['00679B']?.marginBalance).toBe(15000);
    });
  });

  describe('2. market-sync-core: parseTpexT86BulkData 統一剝除上櫃 O 尾綴', () => {
    it('應將 8299O 與 00679BO 正規化為 8299 與 00679B（相容 24 欄與舊版格式）', () => {
      const officialRow = new Array(24).fill('0');
      officialRow[0] = '8299O';
      officialRow[1] = '群聯';
      officialRow[10] = '2,000,000';
      officialRow[13] = '500,000';
      officialRow[22] = '-100,000';
      officialRow[23] = '2,400,000';

      const bondRow = new Array(24).fill('0');
      bondRow[0] = '00679BO';
      bondRow[1] = '元大美債20年';
      bondRow[10] = '10,000,000';
      bondRow[23] = '10,000,000';

      const parsed = parseTpexT86BulkData({
        tables: [{ data: [officialRow, bondRow] }],
      });

      expect(parsed['8299O']).toBeUndefined();
      expect(parsed['00679BO']).toBeUndefined();
      expect(parsed['8299']?.symbol).toBe('8299');
      expect(parsed['8299']?.foreignNetShares).toBe(2000);
      expect(parsed['00679B']?.symbol).toBe('00679B');
      expect(parsed['00679B']?.foreignNetShares).toBe(10000);
    });
  });

  describe('3. backfill-tw-history-web: TPEx 歷史防污染、RWD 當沖串接與錯誤日誌', () => {
    it('filterTpexSnapshotByTargetDate 與 parseRocOrIsoDateToIso 應嚴格比對民國年 Date 與 targetDateStr', () => {
      expect(parseRocOrIsoDateToIso('1151019')).toBe('2026-10-19');
      expect(parseRocOrIsoDateToIso('115/10/19')).toBe('2026-10-19');

      const snapshotToday = [
        { Date: '1151019', SecuritiesCompanyCode: '8299O', MarginPurchaseBalance: '5,000', ShortSaleBalance: '100' },
      ];
      // 歷史日期 2026-10-12 與今日快照 2026-10-19 不符 -> 必須過濾為空避免污染
      expect(filterTpexSnapshotByTargetDate(snapshotToday, '2026-10-12', 'TPEx Margin', { silent: true })).toEqual([]);
      // 吻合日期 2026-10-19 -> 允許通過
      expect(filterTpexSnapshotByTargetDate(snapshotToday, '2026-10-19', 'TPEx Margin', { silent: true })).toHaveLength(1);
    });

    it('fetchAndIngestTwDailyData 回補歷史日期時，若 TPEx OpenAPI 回傳最新快照日期不符，嚴禁污染歷史 SQLite 且不靜默吞錯', async () => {
      const dbPath = makeTempDb('test_t03_tpex_hygiene');
      tempDbs.push(dbPath);
      const logs: string[] = [];

      const mockFetcher = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('MI_INDEX')) {
          return {
            stat: 'OK',
            tables: [{ data: [['2330', '台積電', '20,000,000', '15,000', '19,600,000,000', '980', '990', '975', '985']] }],
          };
        }
        if (url.includes('otc_quotes_no1430')) {
          return {
            tables: [{ data: [['8299O', '群聯', '600', '+5', '595', '605', '590', '2,000', '1,000,000', '600,000,000']] }],
          };
        }
        if (url.includes('T86')) {
          const rows = Array.from({ length: 520 }, (_, i) => [
            String(1100 + i), '股', '0', '0', '1000', '0', '0', '0', '0', '0', '0', '0', '1000',
          ]);
          return { stat: 'OK', data: rows };
        }
        if (url.includes('3itrade_hedge_result')) {
          const rows = Array.from({ length: 520 }, (_, i) => {
            const row = new Array(24).fill('0');
            row[0] = `${5000 + i}O`;
            row[1] = '櫃股';
            row[10] = '1000';
            row[23] = '1000';
            return row;
          });
          return { tables: [{ data: rows }] };
        }
        if (url.includes('tpex_mainboard_margin_balance')) {
          // 模擬 TPEx OpenAPI 無視歷史參數 d=115/10/12，回傳最新 1151019 快照
          return [
            { Date: '1151019', SecuritiesCompanyCode: '8299O', MarginPurchaseBalance: '9,999', ShortSaleBalance: '888' },
          ];
        }
        if (url.includes('tpex_mainboard_peratio_analysis')) {
          return [
            { Date: '1151019', SecuritiesCompanyCode: '8299O', PriceEarningRatio: '22.5', PriceBookRatio: '3.1', YieldRatio: '4.2' },
          ];
        }
        if (url.includes('TWT93U')) {
          throw new Error('模擬 TWT93U 暫時性逾時');
        }
        if (url.includes('TWTB4U')) {
          return {
            stat: 'OK',
            tables: [
              { title: '統計', fields: ['統計項目', '數值'], data: [['比率', '35.0']] },
              {
                title: '當日沖銷交易標的',
                fields: ['證券代號', '證券名稱', '註記', '當日沖銷交易成交股數', '買進金額', '賣出金額'],
                data: [['2330', '台積電', '', '5,000,000', '4,900,000,000', '4,925,000,000']],
              },
            ],
          };
        }
        return {};
      });

      const res = await fetchAndIngestTwDailyData('2026-10-12', {
        fetcher: mockFetcher,
        dbPath,
        throttleMs: 0,
        retries: 1,
        retryDelayMs: 0,
        logger: (msg: string) => logs.push(msg),
      });

      expect(res.isTradingDay).toBe(true);
      const db = initSqliteLakehouseDb(dbPath);

      // 1. TWTB4U RWD tables 結合 MI_INDEX 成交股數 (5M / 20M = 25%) 正確寫入
      const chip2330 = db.prepare('SELECT day_trade_rate FROM tw_institutional_chips WHERE symbol = ? AND date = ?').get('2330', '2026-10-12');
      expect(chip2330?.day_trade_rate).toBe(25);

      // 2. TPEx 8299 不得被 2026-10-19 快照污染寫入 2026-10-12 的融資與估值表
      const margin8299 = db.prepare('SELECT margin_balance FROM tw_institutional_chips WHERE symbol = ? AND date = ?').get('8299', '2026-10-12');
      expect(margin8299?.margin_balance ?? null).toBeNull();
      const val8299 = db.prepare('SELECT pe FROM tw_valuation_daily WHERE symbol = ? AND date = ?').get('8299', '2026-10-12');
      expect(val8299).toBeUndefined();

      // 3. 錯誤與跳過事件皆有明確降噪日誌（不得靜默吞噬）
      expect(logs.some((l) => l.includes('TWT93U') && l.includes('逾時'))).toBe(true);
      expect(logs.some((l) => l.includes('2026-10-19') && l.includes('2026-10-12'))).toBe(true);
    });
  });

  describe('4. ingest-tw-pledge: 支援 TWSE + TPEx 雙市場董監質押與容錯日誌', () => {
    it('fetchAndIngestTwPledge 應同時抓取上市 t187ap11_L 與上櫃 mopsfin_t187ap11_O 並寫入 SQLite', async () => {
      expect(TWSE_PLEDGE_URL).toContain('t187ap11_L');
      expect(TPEX_PLEDGE_URL).toContain('tpex.org.tw');

      const dbPath = makeTempDb('test_t03_pledge_dual');
      tempDbs.push(dbPath);
      const calledUrls: string[] = [];

      const mockFetcher = vi.fn().mockImplementation(async (url: string) => {
        calledUrls.push(url);
        if (url.includes('twse.com.tw')) {
          return {
            ok: true,
            status: 200,
            json: async () => [
              {
                出表年月: '11509',
                公司代號: '2330',
                董監事設質股數: '10,000,000',
                董監事持有股數: '200,000,000',
                內部人申報轉讓股數: '0',
              },
            ],
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              出表日期: '1150915',
              公司代號: '8299O',
              董監事設質股數: '3,000,000',
              董監事持有股數: '10,000,000',
              內部人申報轉讓股數: '500',
            },
          ],
        };
      });

      const res = await fetchAndIngestTwPledge(dbPath, mockFetcher);
      expect(res.success).toBe(true);
      expect(res.count).toBe(2);
      expect(calledUrls.some((u) => u.includes('twse.com.tw'))).toBe(true);
      expect(calledUrls.some((u) => u.includes('tpex.org.tw'))).toBe(true);

      const db = initSqliteLakehouseDb(dbPath);
      const row2330 = db.prepare('SELECT * FROM tw_insider_pledge_records WHERE symbol = ?').get('2330');
      const row8299 = db.prepare('SELECT * FROM tw_insider_pledge_records WHERE symbol = ?').get('8299');
      expect(row2330?.pledge_ratio).toBe(5);
      expect(row8299?.report_date).toBe('2026-09');
      expect(row8299?.pledge_ratio).toBe(30);
      expect(row8299?.insider_transfer_shares).toBe(500);
    });

    it('單一市場失敗時應記錄錯誤並仍成功寫入另一市場資料', async () => {
      const dbPath = makeTempDb('test_t03_pledge_partial');
      tempDbs.push(dbPath);
      const logs: string[] = [];

      const mockFetcher = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('tpex.org.tw')) {
          throw new Error('TPEx ECONNRESET');
        }
        return {
          ok: true,
          status: 200,
          json: async () => [
            { 出表年月: '11509', 公司代號: '2317', 董監事設質股數: '100', 董監事持有股數: '1000' },
          ],
        };
      });

      const res = await fetchAndIngestTwPledge(dbPath, mockFetcher, {
        logger: (msg: string) => logs.push(msg),
      });
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
      expect(logs.some((l) => l.includes('TPEx') && l.includes('ECONNRESET'))).toBe(true);

      // 驗證 parseTwPledgeReport 7 碼民國日期解析
      const parsed7 = parseTwPledgeReport([
        { 出表日期: '1151015', 公司代號: '3293O', 董監事設質股數: '50', 董監事持有股數: '200' },
      ]);
      expect(parsed7[0].symbol).toBe('3293');
      expect(parsed7[0].reportDate).toBe('2026-10');
      expect(parsed7[0].pledgeRatio).toBe(25);
    });
  });

  describe('5. tag-tw-stock-status: fetchAndTagTwStockStatuses 抓取 TWSE/TPEx 注意與處置清單', () => {
    it('應抓取上市櫃注意與處置清單、套用 DISPOSITION > ATTENTION 優先級並更新 symbols_meta.status', async () => {
      const dbPath = makeTempDb('test_t03_stock_status');
      tempDbs.push(dbPath);
      const db = initSqliteLakehouseDb(dbPath);

      const insertMeta = db.prepare(`
        INSERT INTO symbols_meta (symbol, name, market, exchange, status, updated_at)
        VALUES (?, ?, 'TW', ?, ?, ?)
      `);
      const now = Date.now();
      insertMeta.run('2330', '台積電', 'TWSE', 'NORMAL', now);
      insertMeta.run('2603', '長榮', 'TWSE', 'NORMAL', now);
      insertMeta.run('8299', '群聯', 'TPEX', 'NORMAL', now);
      insertMeta.run('3293', '鈊象', 'TPEX', 'DISPOSITION', now); // 測試解除處置後重置為 NORMAL

      const mockFetcher = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('twse.com.tw') && url.includes('notice')) {
          return { ok: true, status: 200, json: async () => [{ Code: '2330', Name: '台積電' }, { Code: '2603', Name: '長榮' }] };
        }
        if (url.includes('twse.com.tw') && url.includes('punish')) {
          return { ok: true, status: 200, json: async () => [{ Code: '2603', Name: '長榮' }] };
        }
        if (url.includes('tpex.org.tw') && url.includes('warning')) {
          return { ok: true, status: 200, json: async () => [{ SecuritiesCompanyCode: '8299O', CompanyName: '群聯' }] };
        }
        if (url.includes('tpex.org.tw') && url.includes('disposal')) {
          return { ok: true, status: 200, json: async () => [] };
        }
        return { ok: false, status: 404, json: async () => [] };
      });

      // 直接傳入 db 實例驗證 dbOrPath 相容性
      const res = await fetchAndTagTwStockStatuses(db, { fetcher: mockFetcher });
      expect(res.success).toBe(true);
      expect(res.updatedCount).toBe(3);
      expect(getStockStatus('2330', db)).toBe('ATTENTION');
      expect(getStockStatus('2603', db)).toBe('DISPOSITION');
      expect(getStockStatus('8299', db)).toBe('ATTENTION');
      expect(getStockStatus('3293', db)).toBe('NORMAL');
    });

    it('當所有遠端來源皆失敗時，不得重置既有處置狀態且須記錄錯誤', async () => {
      const dbPath = makeTempDb('test_t03_status_fail_safe');
      tempDbs.push(dbPath);
      const db = initSqliteLakehouseDb(dbPath);
      db.prepare(`
        INSERT INTO symbols_meta (symbol, name, market, exchange, status, updated_at)
        VALUES ('2603', '長榮', 'TW', 'TWSE', 'DISPOSITION', ?)
      `).run(Date.now());

      const logs: string[] = [];
      const failingFetcher = vi.fn().mockRejectedValue(new Error('network offline'));

      const res = await fetchAndTagTwStockStatuses(dbPath, {
        fetcher: failingFetcher,
        logger: (msg: string) => logs.push(msg),
      });

      expect(res.success).toBe(false);
      expect(res.errors.length).toBeGreaterThanOrEqual(4);
      expect(logs.length).toBeGreaterThanOrEqual(4);
      // 原有處置狀態應受保護不被清空
      expect(getStockStatus('2603', dbPath)).toBe('DISPOSITION');
    });
  });
});
