import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

declare const require: (id: string) => any;

const { DatabaseSync } = require('node:sqlite');

const usFundamentalsModule = require('../../scripts/market-sync/us-fundamentals-ingestion.cjs');

/**
 * 建立模擬 Fetch Response 輔助工廠
 */
function createMockResponse(options: {
  status?: number;
  ok?: boolean;
  json?: any;
  text?: string;
  setCookies?: string[];
  headers?: Record<string, string>;
}) {
  const status = options.status ?? 200;
  const ok = options.ok ?? (status >= 200 && status < 300);
  const rawHeaders = new Map<string, string>();
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      rawHeaders.set(k.toLowerCase(), v);
    }
  }
  const setCookies = options.setCookies ?? [];
  if (setCookies.length > 0 && !rawHeaders.has('set-cookie')) {
    rawHeaders.set('set-cookie', setCookies.join(', '));
  }

  return {
    status,
    ok,
    headers: {
      get(key: string) {
        return rawHeaders.get(key.toLowerCase()) ?? null;
      },
      getSetCookie() {
        return setCookies;
      },
    },
    async json() {
      return options.json;
    },
    async text(): Promise<string> {
      return options.text ?? (options.json !== undefined ? JSON.stringify(options.json) : '');
    },
  };
}

/**
 * 美股個股（如 NVDA）完整 Yahoo Finance v10 quoteSummary 測試夾具
 */
function createStockQuoteSummaryFixture() {
  return {
    quoteSummary: {
      result: [
        {
          summaryDetail: {
            trailingPE: { raw: 54.32, fmt: '54.32' },
            forwardPE: { raw: 36.15, fmt: '36.15' },
            priceToSalesTrailing12Months: { raw: 28.45, fmt: '28.45' },
            dividendYield: { raw: 0.0185, fmt: '1.85%' },
            trailingAnnualDividendYield: { raw: 0.0172, fmt: '1.72%' },
          },
          defaultKeyStatistics: {
            trailingPE: { raw: 54.0, fmt: '54.00' },
            forwardPE: { raw: 35.9, fmt: '35.90' },
            priceToBook: { raw: 48.2, fmt: '48.20' },
            shortPercentOfFloat: { raw: 0.0124, fmt: '1.24%' },
          },
          financialData: {
            currentPrice: { raw: 135.5, fmt: '135.50' },
          },
          majorHoldersBreakdown: {
            institutionsPercentHeld: { raw: 0.6845, fmt: '68.45%' },
            insidersPercentHeld: { raw: 0.0432, fmt: '4.32%' },
          },
          price: {
            regularMarketPrice: { raw: 135.5, fmt: '135.50' },
          },
        },
      ],
      error: null,
    },
  };
}

/**
 * 美股 ETF（如 VT）Yahoo Finance v10 quoteSummary 測試夾具
 */
function createEtfQuoteSummaryFixture() {
  return {
    quoteSummary: {
      result: [
        {
          summaryDetail: {
            yield: { raw: 0.0215, fmt: '2.15%' },
            totalAssets: { raw: 42_500_000_000, fmt: '42.50B' },
            navPrice: { raw: 118.0, fmt: '118.00' },
          },
          defaultKeyStatistics: {
            annualReportExpenseRatio: { raw: 0.0008, fmt: '0.08%' },
          },
          fundProfile: {
            feesExpensesInvestment: {
              annualReportExpenseRatio: { raw: 0.0007, fmt: '0.07%' },
            },
          },
          price: {
            regularMarketPrice: { raw: 118.59, fmt: '118.59' },
          },
        },
      ],
      error: null,
    },
  };
}

describe('Spec 0239 T06: 美股基本面/13F/ETF 抓取與持久化模組 (us-fundamentals-ingestion)', () => {
  let db: any;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    if (typeof usFundamentalsModule.resetUsFundamentalsStateForTest === 'function') {
      usFundamentalsModule.resetUsFundamentalsStateForTest();
    }
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('契約 1: ensureUsFundamentalsTable(db) 冪等建表與索引', () => {
    it('應冪等建立 us_fundamentals_daily 資料表、全部指定欄位、複合主鍵與查詢索引', () => {
      expect(typeof usFundamentalsModule.ensureUsFundamentalsTable).toBe('function');

      // 連續呼叫兩次確保冪等不拋錯
      usFundamentalsModule.ensureUsFundamentalsTable(db);
      usFundamentalsModule.ensureUsFundamentalsTable(db);

      const columns = db.prepare('PRAGMA table_info(us_fundamentals_daily)').all();
      const colNames = columns.map((c: any) => c.name);

      expect(colNames).toEqual(
        expect.arrayContaining([
          'symbol',
          'date',
          'pe',
          'forward_pe',
          'pb',
          'ps_ratio',
          'dividend_yield',
          'institutional_ratio',
          'insider_ratio',
          'short_float_ratio',
          'public_float_ratio',
          'etf_aum_billion',
          'etf_expense_ratio',
          'etf_nav_price',
          'etf_premium_discount_ratio',
          'source',
          'updated_at',
        ])
      );

      // 驗證複合主鍵 (symbol, date)
      const pkCols = columns
        .filter((c: any) => c.pk > 0)
        .sort((a: any, b: any) => a.pk - b.pk)
        .map((c: any) => c.name);
      expect(pkCols).toEqual(['symbol', 'date']);

      // 驗證至少建立一支查詢索引
      const indexes = db.prepare("PRAGMA index_list(us_fundamentals_daily)").all();
      const nonAutoIndexes = indexes.filter((idx: any) => idx.origin === 'c');
      expect(nonAutoIndexes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('契約 2: parseYahooQuoteSummaryToFundamentals(symbol, rawJson) 純函式解析', () => {
    it('應精準解包美股個股之 .raw 估值、13F 持股與放空比例並計算 publicFloatRatio', () => {
      expect(typeof usFundamentalsModule.parseYahooQuoteSummaryToFundamentals).toBe('function');

      const parsed = usFundamentalsModule.parseYahooQuoteSummaryToFundamentals(
        'nvda',
        createStockQuoteSummaryFixture()
      );

      expect(parsed).not.toBeNull();
      expect(parsed.symbol).toBe('NVDA');
      expect(parsed.pe).toBeCloseTo(54.32, 4);
      expect(parsed.forwardPe).toBeCloseTo(36.15, 4);
      expect(parsed.pb).toBeCloseTo(48.2, 4);
      expect(parsed.psRatio).toBeCloseTo(28.45, 4);
      expect(parsed.dividendYield).toBeCloseTo(1.85, 4);
      expect(parsed.institutionalRatio).toBeCloseTo(68.45, 4);
      expect(parsed.insiderRatio).toBeCloseTo(4.32, 4);
      expect(parsed.shortFloatRatio).toBeCloseTo(1.24, 4);
      // 100 - 68.45 - 4.32 = 27.23
      expect(parsed.publicFloatRatio).toBe(27.23);

      // 個股不具 ETF 專屬欄位時應為 null（Zero-Mock）
      expect(parsed.etfAumBillion).toBeNull();
      expect(parsed.etfExpenseRatio).toBeNull();
      expect(parsed.etfNavPrice).toBeNull();
      expect(parsed.etfPremiumDiscountRatio).toBeNull();
    });

    it('應精準解包美股 ETF 之 AUM(十億美元)、費用率(%)、NAV、折溢價(%) 與 yield 殖利率', () => {
      const parsed = usFundamentalsModule.parseYahooQuoteSummaryToFundamentals(
        'VT',
        createEtfQuoteSummaryFixture()
      );

      expect(parsed).not.toBeNull();
      expect(parsed.symbol).toBe('VT');
      expect(parsed.dividendYield).toBeCloseTo(2.15, 4);
      expect(parsed.etfAumBillion).toBeCloseTo(42.5, 4);
      // 優先取 fundProfile.feesExpensesInvestment.annualReportExpenseRatio (0.0007 -> 0.07%)
      expect(parsed.etfExpenseRatio).toBeCloseTo(0.07, 4);
      expect(parsed.etfNavPrice).toBeCloseTo(118.0, 4);
      // ((118.59 - 118.0) / 118.0) * 100 = 0.5%
      expect(parsed.etfPremiumDiscountRatio).toBeCloseTo(0.5, 4);
      // ETF 缺失之個股欄位一律為 null
      expect(parsed.pe).toBeNull();
      expect(parsed.institutionalRatio).toBeNull();
      expect(parsed.publicFloatRatio).toBeNull();
    });

    it('應嚴格遵守 Zero-Mock 與備援鏈：缺失欄位回傳 null、高持股合計不為負、fallback 欄位正確生效', () => {
      const partialJson = {
        quoteSummary: {
          result: [
            {
              summaryDetail: {
                trailingAnnualDividendYield: { raw: 0.031, fmt: '3.10%' },
                navPrice: { raw: 0 }, // 不可除以零
              },
              defaultKeyStatistics: {
                trailingPE: { raw: 19.8 },
                forwardPE: { raw: 16.4 },
                annualReportExpenseRatio: { raw: 0.0009 },
              },
              majorHoldersBreakdown: {
                institutionsPercentHeld: { raw: 0.96 },
                insidersPercentHeld: { raw: 0.08 },
              },
              price: {
                regularMarketPrice: { raw: 50 },
              },
            },
          ],
        },
      };

      const parsed = usFundamentalsModule.parseYahooQuoteSummaryToFundamentals('BRK.B', partialJson);
      expect(parsed.symbol).toBe('BRK.B');
      expect(parsed.pe).toBe(19.8);
      expect(parsed.forwardPe).toBe(16.4);
      expect(parsed.pb).toBeNull();
      expect(parsed.psRatio).toBeNull();
      expect(parsed.dividendYield).toBeCloseTo(3.1, 4);
      expect(parsed.etfExpenseRatio).toBeCloseTo(0.09, 4);
      // 96 + 8 = 104 -> Math.max(0, -4) = 0
      expect(parsed.publicFloatRatio).toBe(0);
      // navPrice 為 0 時嚴禁除以零，應回傳 null
      expect(parsed.etfPremiumDiscountRatio).toBeNull();

      // 僅有機構持股、缺少內部人持股時，publicFloatRatio 必須為 null
      const missingInsider = {
        quoteSummary: {
          result: [
            {
              majorHoldersBreakdown: {
                institutionsPercentHeld: { raw: 0.72 },
                insidersPercentHeld: {},
              },
            },
          ],
        },
      };
      const parsedMissing = usFundamentalsModule.parseYahooQuoteSummaryToFundamentals('AAPL', missingInsider);
      expect(parsedMissing.institutionalRatio).toBeCloseTo(72, 4);
      expect(parsedMissing.insiderRatio).toBeNull();
      expect(parsedMissing.publicFloatRatio).toBeNull();

      // 完全無效的回應應安全回傳 null
      expect(usFundamentalsModule.parseYahooQuoteSummaryToFundamentals('AAPL', null)).toBeNull();
      expect(
        usFundamentalsModule.parseYahooQuoteSummaryToFundamentals('AAPL', {
          quoteSummary: { result: [] },
        })
      ).toBeNull();
    });
  });

  describe('契約 3: fetchYahooQuoteSummaryWithCrumb(symbol, options) Cookie/Crumb 快取、401 重試、429 熔斷與點號正規化', () => {
    it('應取得 Cookie + Crumb 並快取 30 分鐘，且將點號代碼 BRK.B 轉為 BRK-B 請求 Yahoo', async () => {
      expect(typeof usFundamentalsModule.fetchYahooQuoteSummaryWithCrumb).toBe('function');

      const requestedUrls: string[] = [];
      const mockFetch = vi.fn(async (url: string, init?: any) => {
        requestedUrls.push(url);
        if (url.startsWith('https://fc.yahoo.com')) {
          return createMockResponse({
            status: 404,
            ok: false,
            setCookies: ['A1=token123; Expires=Wed, 21 Oct 2035 07:28:00 GMT; Path=/; Domain=.yahoo.com'],
          });
        }
        if (url.includes('/v1/test/getcrumb')) {
          expect(init?.headers?.Cookie).toContain('A1=token123');
          return createMockResponse({ status: 200, text: 'CRUMB_ALPHA_1' });
        }
        if (url.includes('/v10/finance/quoteSummary/')) {
          expect(init?.headers?.Cookie).toContain('A1=token123');
          return createMockResponse({ status: 200, json: createStockQuoteSummaryFixture() });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const t0 = 1_700_000_000_000;
      const res1 = await usFundamentalsModule.fetchYahooQuoteSummaryWithCrumb('BRK.B', {
        fetchImpl: mockFetch,
        now: t0,
      });

      expect(res1).not.toBeNull();
      expect(requestedUrls[2]).toContain('/v10/finance/quoteSummary/BRK-B');
      expect(requestedUrls[2]).toContain('crumb=CRUMB_ALPHA_1');

      // 10 分鐘後再次查詢其他標的，應直接命中 30 分鐘 Crumb 快取，不再呼叫 fc.yahoo.com 與 getcrumb
      const res2 = await usFundamentalsModule.fetchYahooQuoteSummaryWithCrumb('NVDA', {
        fetchImpl: mockFetch,
        now: t0 + 10 * 60 * 1000,
      });
      expect(res2).not.toBeNull();
      expect(requestedUrls.filter((u) => u.startsWith('https://fc.yahoo.com')).length).toBe(1);
      expect(requestedUrls.filter((u) => u.includes('/v1/test/getcrumb')).length).toBe(1);
      expect(requestedUrls.length).toBe(4);
    });

    it('遇 HTTP 401 時應自動刷新 Cookie + Crumb 並重試 1 次成功回傳', async () => {
      let crumbSeq = 0;
      let summaryAttempts = 0;

      const mockFetch = vi.fn(async (url: string) => {
        if (url.startsWith('https://fc.yahoo.com')) {
          crumbSeq++;
          return createMockResponse({
            status: 404,
            ok: false,
            setCookies: [`A3=session_${crumbSeq}; Path=/`],
          });
        }
        if (url.includes('/v1/test/getcrumb')) {
          return createMockResponse({ status: 200, text: `CRUMB_${crumbSeq}` });
        }
        if (url.includes('/v10/finance/quoteSummary/')) {
          summaryAttempts++;
          if (summaryAttempts === 1) {
            return createMockResponse({ status: 401, ok: false, text: 'Unauthorized' });
          }
          expect(url).toContain('crumb=CRUMB_2');
          return createMockResponse({ status: 200, json: createStockQuoteSummaryFixture() });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const res = await usFundamentalsModule.fetchYahooQuoteSummaryWithCrumb('AAPL', {
        fetchImpl: mockFetch,
        now: 1_700_000_000_000,
      });

      expect(res).not.toBeNull();
      expect(summaryAttempts).toBe(2);
      expect(crumbSeq).toBe(2);
    });

    it('遇 HTTP 429 應立即啟動 5 分鐘熔斷器並安全降級回傳 null，熔斷期間 0 外部請求且 5 分鐘後自動恢復', async () => {
      expect(typeof usFundamentalsModule.isUsQuoteSummaryCircuitOpen).toBe('function');

      let fetchCalls = 0;
      const mockFetch = vi.fn(async (url: string) => {
        fetchCalls++;
        if (url.startsWith('https://fc.yahoo.com')) {
          return createMockResponse({ status: 404, ok: false, setCookies: ['A1=c1; Path=/'] });
        }
        if (url.includes('/v1/test/getcrumb')) {
          return createMockResponse({ status: 200, text: 'CRUMB_OK' });
        }
        if (url.includes('/v10/finance/quoteSummary/')) {
          return createMockResponse({ status: 429, ok: false, text: 'Too Many Requests' });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const t0 = 1_700_000_000_000;
      expect(usFundamentalsModule.isUsQuoteSummaryCircuitOpen(t0)).toBe(false);

      const res429 = await usFundamentalsModule.fetchYahooQuoteSummaryWithCrumb('NVDA', {
        fetchImpl: mockFetch,
        now: t0,
      });
      expect(res429).toBeNull();
      expect(usFundamentalsModule.isUsQuoteSummaryCircuitOpen(t0 + 1000)).toBe(true);

      // 熔斷期間再次呼叫必須直接降級為 null，0 新增 fetch
      const callsBefore = fetchCalls;
      const resDuringOpen = await usFundamentalsModule.fetchYahooQuoteSummaryWithCrumb('MSFT', {
        fetchImpl: mockFetch,
        now: t0 + 4 * 60 * 1000,
      });
      expect(resDuringOpen).toBeNull();
      expect(fetchCalls).toBe(callsBefore);

      // 超過 5 分鐘後熔斷器關閉
      expect(usFundamentalsModule.isUsQuoteSummaryCircuitOpen(t0 + 5 * 60 * 1000 + 1)).toBe(false);
    });

    it('超過 30 分鐘 Crumb 快取應自動刷新，且支援純 set-cookie 字串標頭與 401 僅重試 1 次上限', async () => {
      let fcCalls = 0;
      let summaryCalls = 0;

      const mockFetch = vi.fn(async (url: string) => {
        if (url.startsWith('https://fc.yahoo.com')) {
          fcCalls++;
          // 模擬僅有 headers.get('set-cookie')（無 getSetCookie）且含 Expires 逗號之雙 Cookie
          return {
            status: 404,
            ok: false,
            headers: {
              get(k: string) {
                return k.toLowerCase() === 'set-cookie'
                  ? `A1=v${fcCalls}; Expires=Wed, 21 Oct 2035 07:28:00 GMT; Path=/, A3=s${fcCalls}; Path=/`
                  : null;
              },
            },
            async text(): Promise<string> {
              return '';
            },
          };
        }
        if (url.includes('/v1/test/getcrumb')) {
          return createMockResponse({ status: 200, text: `CRUMB_T${fcCalls}` });
        }
        if (url.includes('/v10/finance/quoteSummary/MSFT')) {
          return createMockResponse({ status: 200, json: createStockQuoteSummaryFixture() });
        }
        if (url.includes('/v10/finance/quoteSummary/FAIL401')) {
          summaryCalls++;
          return createMockResponse({ status: 401, ok: false, text: 'Unauthorized' });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const t0 = 1_700_000_000_000;
      const r1 = await usFundamentalsModule.fetchYahooQuoteSummaryWithCrumb('MSFT', {
        fetchImpl: mockFetch,
        now: t0,
      });
      expect(r1).not.toBeNull();
      expect(fcCalls).toBe(1);

      // 31 分鐘後應重新向 fc.yahoo.com 取得新 Cookie + Crumb
      const r2 = await usFundamentalsModule.fetchYahooQuoteSummaryWithCrumb('MSFT', {
        fetchImpl: mockFetch,
        now: t0 + 31 * 60 * 1000,
      });
      expect(r2).not.toBeNull();
      expect(fcCalls).toBe(2);

      // 持續 401 時只應重試 1 次（總計 2 次 quoteSummary 請求），不陷入無限重試
      const rFail = await usFundamentalsModule.fetchYahooQuoteSummaryWithCrumb('FAIL401', {
        fetchImpl: mockFetch,
        now: t0 + 32 * 60 * 1000,
      });
      expect(rFail).toBeNull();
      expect(summaryCalls).toBe(2);
    });
  });

  describe('契約 4: fetchAndIngestUsDividends(db, symbol, options) 美股個股與 ETF 近 2 年配息入庫', () => {
    it('應從 Yahoo v8 Chart events=div 解析近 2 年真實配息並寫入 corporate_action_calendar (market=US, action_type=DIVIDEND)', async () => {
      expect(typeof usFundamentalsModule.fetchAndIngestUsDividends).toBe('function');

      const requestedUrls: string[] = [];
      const mockFetch = vi.fn(async (url: string) => {
        requestedUrls.push(url);
        return createMockResponse({
          status: 200,
          json: {
            chart: {
              result: [
                {
                  meta: { symbol: 'VT' },
                  events: {
                    dividends: {
                      '1710768600': { amount: 0.4215, date: 1710768600 }, // 2024-03-18
                      '1718717400': { amount: 0.7854, date: 1718717400 }, // 2024-06-18
                      '1726666200': { amount: 0, date: 1726666200 }, // 0 元應過濾 (Zero-Mock)
                    },
                  },
                },
              ],
            },
          },
        });
      });

      const result = await usFundamentalsModule.fetchAndIngestUsDividends(db, 'VT', {
        fetchImpl: mockFetch,
        now: 1_730_000_000_000,
      });

      expect(requestedUrls[0]).toContain('/v8/finance/chart/VT');
      expect(requestedUrls[0]).toContain('range=2y');
      expect(requestedUrls[0]).toContain('interval=1d');
      expect(requestedUrls[0]).toContain('events=div');
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);

      const rows = db
        .prepare(
          `SELECT symbol, market, action_type, ex_date, cash_dividend_per_share
           FROM corporate_action_calendar
           WHERE symbol = 'VT'
           ORDER BY ex_date ASC`
        )
        .all();

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        symbol: 'VT',
        market: 'US',
        action_type: 'DIVIDEND',
        ex_date: '2024-03-18',
        cash_dividend_per_share: 0.4215,
      });
      expect(rows[1]).toMatchObject({
        symbol: 'VT',
        market: 'US',
        action_type: 'DIVIDEND',
        ex_date: '2024-06-18',
        cash_dividend_per_share: 0.7854,
      });
    });

    it('應對含點號代碼 (如 BF.B) 正規化為 BF-B 請求 Yahoo，但以原碼 BF.B 寫入 SQLite', async () => {
      const requestedUrls: string[] = [];
      const mockFetch = vi.fn(async (url: string) => {
        requestedUrls.push(url);
        return createMockResponse({
          status: 200,
          json: {
            chart: {
              result: [
                {
                  events: {
                    dividends: {
                      '1710768600': { amount: 0.2178, date: 1710768600 },
                    },
                  },
                },
              ],
            },
          },
        });
      });

      const res = await usFundamentalsModule.fetchAndIngestUsDividends(db, 'BF.B', {
        fetchImpl: mockFetch,
      });

      expect(requestedUrls[0]).toContain('/v8/finance/chart/BF-B');
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);

      const row = db
        .prepare("SELECT symbol, market, cash_dividend_per_share FROM corporate_action_calendar WHERE symbol = 'BF.B'")
        .get();
      expect(row).toMatchObject({
        symbol: 'BF.B',
        market: 'US',
        cash_dividend_per_share: 0.2178,
      });
    });
  });

  describe('契約 5: getOrFetchUsFundamentals(db, symbol, options) 24H SQLite TTL 快取與自動補齊', () => {
    it('SQLite 尚無紀錄時應抓取 quoteSummary 入庫並補齊美股配息；24 小時內再查應 0 外部請求直接命中快取', async () => {
      expect(typeof usFundamentalsModule.getOrFetchUsFundamentals).toBe('function');

      const mockFetch = vi.fn(async (url: string) => {
        if (url.startsWith('https://fc.yahoo.com')) {
          return createMockResponse({ status: 404, ok: false, setCookies: ['A1=cache_test; Path=/'] });
        }
        if (url.includes('/v1/test/getcrumb')) {
          return createMockResponse({ status: 200, text: 'CRUMB_CACHE' });
        }
        if (url.includes('/v10/finance/quoteSummary/')) {
          return createMockResponse({ status: 200, json: createEtfQuoteSummaryFixture() });
        }
        if (url.includes('/v8/finance/chart/')) {
          return createMockResponse({
            status: 200,
            json: {
              chart: {
                result: [
                  {
                    events: {
                      dividends: {
                        '1718717400': { amount: 0.7854, date: 1718717400 },
                      },
                    },
                  },
                ],
              },
            },
          });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const t0 = 1_730_000_000_000;
      const first = await usFundamentalsModule.getOrFetchUsFundamentals(db, 'VT', {
        fetchImpl: mockFetch,
        now: t0,
      });

      expect(first).not.toBeNull();
      expect(first.symbol).toBe('VT');
      expect(first.fromCache).toBe(false);
      expect(first.etfAumBillion).toBeCloseTo(42.5, 4);
      expect(first.etfExpenseRatio).toBeCloseTo(0.07, 4);

      // 確認已持久化至 us_fundamentals_daily 與 corporate_action_calendar
      const savedFund = db
        .prepare("SELECT * FROM us_fundamentals_daily WHERE symbol = 'VT'")
        .get();
      expect(savedFund).toBeTruthy();
      expect(savedFund.etf_aum_billion).toBeCloseTo(42.5, 4);

      const savedDivs = db
        .prepare("SELECT * FROM corporate_action_calendar WHERE symbol = 'VT' AND market = 'US'")
        .all();
      expect(savedDivs).toHaveLength(1);

      // 12 小時後再查：必須 100% 命中 24H TTL 快取，0 次外部請求！
      const callsAfterFirst = mockFetch.mock.calls.length;
      const second = await usFundamentalsModule.getOrFetchUsFundamentals(db, 'VT', {
        fetchImpl: mockFetch,
        now: t0 + 12 * 60 * 60 * 1000,
      });

      expect(second).not.toBeNull();
      expect(second.fromCache).toBe(true);
      expect(second.etfAumBillion).toBeCloseTo(42.5, 4);
      expect(mockFetch.mock.calls.length).toBe(callsAfterFirst);

      // 超過 24 小時後再查：應重新向 Yahoo 抓取並更新 SQLite
      const third = await usFundamentalsModule.getOrFetchUsFundamentals(db, 'VT', {
        fetchImpl: mockFetch,
        now: t0 + 25 * 60 * 60 * 1000,
      });

      expect(third).not.toBeNull();
      expect(third.fromCache).toBe(false);
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });

    it('當資料過期且外部觸發 429 熔斷時，應安全降級回傳既有快取並標記 stale=true；完全無快取時回傳 null', async () => {
      const mock429Fetch = vi.fn(async (url: string) => {
        if (url.startsWith('https://fc.yahoo.com')) {
          return createMockResponse({ status: 404, ok: false, setCookies: ['A1=x; Path=/'] });
        }
        if (url.includes('/v1/test/getcrumb')) {
          return createMockResponse({ status: 200, text: 'CRUMB_X' });
        }
        return createMockResponse({ status: 429, ok: false, text: 'Rate Limited' });
      });

      const t0 = 1_730_000_000_000;
      // 1. 完全無快取 + 429 -> 回傳 null
      const emptyResult = await usFundamentalsModule.getOrFetchUsFundamentals(db, 'NVDA', {
        fetchImpl: mock429Fetch,
        now: t0,
      });
      expect(emptyResult).toBeNull();

      // 2. 先人工寫入一筆已過期的舊快取，熔斷期間應安全降級回傳舊快取
      usFundamentalsModule.ensureUsFundamentalsTable(db);
      db.prepare(
        `INSERT INTO us_fundamentals_daily (
          symbol, date, pe, forward_pe, pb, ps_ratio, dividend_yield,
          institutional_ratio, insider_ratio, short_float_ratio, public_float_ratio,
          etf_aum_billion, etf_expense_ratio, etf_nav_price, etf_premium_discount_ratio,
          source, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        'AAPL',
        '2024-10-01',
        31.5,
        28.2,
        45.1,
        8.4,
        0.52,
        61.2,
        0.07,
        0.8,
        38.73,
        null,
        null,
        null,
        null,
        'YAHOO_QUOTE_SUMMARY',
        t0 - 48 * 60 * 60 * 1000
      );

      const staleResult = await usFundamentalsModule.getOrFetchUsFundamentals(db, 'AAPL', {
        fetchImpl: mock429Fetch,
        now: t0 + 1000,
      });
      expect(staleResult).not.toBeNull();
      expect(staleResult.fromCache).toBe(true);
      expect(staleResult.stale).toBe(true);
      expect(staleResult.pe).toBe(31.5);
    });
  });
});
