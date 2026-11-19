import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeCik,
  resolveTickerToCik,
  getSecEdgarHeaders,
  fetchSecCompanyFacts,
  normalizeUsTickerSymbol,
} from './secEdgarTransport';
import { parseSecCompanyFactsToRecords } from './secEdgarParser';

declare const require: (id: string) => any;
const fs = require('fs');
const os = require('os');
const path = require('path');

// 模擬 SEC 官方 company_tickers.json 回傳格式（包含非原 18 檔美股與官方連字號格式 BRK-B）
const MOCK_SEC_COMPANY_TICKERS = {
  '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
  '1': { cik_str: 1067983, ticker: 'BRK-B', title: 'BERKSHIRE HATHAWAY INC' },
  '2': { cik_str: 1321655, ticker: 'PLTR', title: 'Palantir Technologies Inc.' },
  '3': { cik_str: 1341439, ticker: 'ORCL', title: 'ORACLE CORP' },
  '4': { cik_str: 59478, ticker: 'LLY', title: 'ELI LILLY & Co' },
};

// 模擬 SEC CompanyFacts 10-Q / 10-K 財務資料
const MOCK_COMPANY_FACTS_BRK = {
  cik: 1067983,
  entityName: 'BERKSHIRE HATHAWAY INC',
  facts: {
    'us-gaap': {
      Revenues: {
        units: {
          USD: [
            { end: '2025-09-30', val: 92500000000, fy: 2025, fp: 'Q3', form: '10-Q' },
            { end: '2025-12-31', val: 98000000000, fy: 2025, fp: 'FY', form: '10-K' },
          ],
        },
      },
      GrossProfit: {
        units: {
          USD: [
            { end: '2025-09-30', val: 31000000000, fy: 2025, fp: 'Q3', form: '10-Q' },
            { end: '2025-12-31', val: 33500000000, fy: 2025, fp: 'FY', form: '10-K' },
          ],
        },
      },
      OperatingIncomeLoss: {
        units: {
          USD: [
            { end: '2025-09-30', val: 14500000000, fy: 2025, fp: 'Q3', form: '10-Q' },
            { end: '2025-12-31', val: 16200000000, fy: 2025, fp: 'FY', form: '10-K' },
          ],
        },
      },
      NetIncomeLoss: {
        units: {
          USD: [
            { end: '2025-09-30', val: 12100000000, fy: 2025, fp: 'Q3', form: '10-Q' },
            { end: '2025-12-31', val: 13800000000, fy: 2025, fp: 'FY', form: '10-K' },
          ],
        },
      },
      EarningsPerShareDiluted: {
        units: {
          'USD/shares': [
            { end: '2025-09-30', val: 5.42, fy: 2025, fp: 'Q3', form: '10-Q' },
            { end: '2025-12-31', val: 6.18, fy: 2025, fp: 'FY', form: '10-K' },
          ],
        },
      },
    },
  },
};

function createTempCachePath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sec-edgar-t07-'));
  return path.join(dir, 'sec_company_tickers.json');
}

describe('Spec 0239 T07: SEC EDGAR 伺服器端代理、全美股動態 CIK 解析與瀏覽器合規重構', () => {
  const tempFilesToClean: string[] = [];

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    while (tempFilesToClean.length > 0) {
      const target = tempFilesToClean.pop()!;
      try {
        fs.rmSync(path.dirname(target), { recursive: true, force: true });
      } catch {
        // 清理暫存目錄失敗忽略
      }
    }
  });

  describe('1. 伺服器端代理模組 (scripts/market-sync/sec-edgar-proxy.cjs)', () => {
    it('resolveUsCikDynamic 應從 SEC company_tickers.json 動態解析任意美股 10 碼零填充 CIK（突破 18 檔靜態上限）並支援 BRK.B <-> BRK-B 正規化', async () => {
      const proxy = require('../../scripts/market-sync/sec-edgar-proxy.cjs');
      proxy.resetSecProxyState();

      const cachePath = createTempCachePath();
      tempFilesToClean.push(cachePath);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => MOCK_SEC_COMPANY_TICKERS,
      });

      const pltrCik = await proxy.resolveUsCikDynamic('PLTR', {
        fetchImpl: mockFetch,
        cachePath,
        minIntervalMs: 0,
      });
      const llyCik = await proxy.resolveUsCikDynamic('lly', {
        fetchImpl: mockFetch,
        cachePath,
        minIntervalMs: 0,
      });
      const brkDotCik = await proxy.resolveUsCikDynamic('BRK.B', {
        fetchImpl: mockFetch,
        cachePath,
        minIntervalMs: 0,
      });
      const brkDashCik = await proxy.resolveUsCikDynamic('BRK-B', {
        fetchImpl: mockFetch,
        cachePath,
        minIntervalMs: 0,
      });
      const missingCik = await proxy.resolveUsCikDynamic('NOT_EXIST_TICKER_999', {
        fetchImpl: mockFetch,
        cachePath,
        minIntervalMs: 0,
      });

      expect(pltrCik).toBe('0001321655');
      expect(llyCik).toBe('0000059478');
      expect(brkDotCik).toBe('0001067983');
      expect(brkDashCik).toBe('0001067983');
      expect(missingCik).toBeNull();

      // 應只發起一次遠端下載，並帶上合規 SEC User-Agent 與 Accept 標頭
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.sec.gov/files/company_tickers.json',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'StockTrackerApp/1.0 (local-analytics@stocktracker.local)',
            Accept: 'application/json',
          }),
        })
      );
    });

    it('resolveUsCikDynamic 應支援本地檔案快取與 7 天 TTL（重啟記憶體快取後命中檔案快取；超過 7 天自動重新抓取）', async () => {
      const proxy = require('../../scripts/market-sync/sec-edgar-proxy.cjs');
      proxy.resetSecProxyState();

      const cachePath = createTempCachePath();
      tempFilesToClean.push(cachePath);

      const baseNow = 1_750_000_000_000;
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => MOCK_SEC_COMPANY_TICKERS,
      });

      // 首次下載並寫入本地快取檔
      const first = await proxy.resolveUsCikDynamic('ORCL', {
        fetchImpl: mockFetch,
        cachePath,
        nowFn: () => baseNow,
        minIntervalMs: 0,
      });
      expect(first).toBe('0001341439');
      expect(fs.existsSync(cachePath)).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 清空記憶體快取（模擬行程重啟），第 6 天應直接命中本地快取檔而不發網路請求
      proxy.resetSecProxyState();
      const day6Now = baseNow + 6 * 24 * 60 * 60 * 1000;
      const second = await proxy.resolveUsCikDynamic('PLTR', {
        fetchImpl: mockFetch,
        cachePath,
        nowFn: () => day6Now,
        minIntervalMs: 0,
      });
      expect(second).toBe('0001321655');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 超過 7 天 TTL（第 8 天）應重新向 SEC 下載最新清單
      const day8Now = baseNow + 8 * 24 * 60 * 60 * 1000;
      const third = await proxy.resolveUsCikDynamic('AAPL', {
        fetchImpl: mockFetch,
        cachePath,
        nowFn: () => day8Now,
        minIntervalMs: 0,
      });
      expect(third).toBe('0000320193');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('伺服器端代理必須強制執行 <= 10 req/s 速率限制（相鄰請求間隔至少 110ms）', async () => {
      const proxy = require('../../scripts/market-sync/sec-edgar-proxy.cjs');
      proxy.resetSecProxyState();

      const cachePath = createTempCachePath();
      tempFilesToClean.push(cachePath);

      // 使用虛擬時鐘與記錄器驗證嚴格 >= 110ms 間隔
      let virtualNow = 10_000;
      const sleepCalls: number[] = [];
      const requestTimestamps: number[] = [];

      const sleepFn = async (ms: number) => {
        sleepCalls.push(ms);
        virtualNow += ms;
      };

      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        requestTimestamps.push(virtualNow);
        if (url.includes('company_tickers.json')) {
          return { ok: true, status: 200, json: async () => MOCK_SEC_COMPANY_TICKERS };
        }
        return { ok: true, status: 200, json: async () => MOCK_COMPANY_FACTS_BRK };
      });

      // 首次呼叫會連續觸發 company_tickers.json 與 companyfacts 兩次 SEC 請求，接著再發一次 companyfacts
      await proxy.fetchSecCompanyFactsServer('BRK.B', {
        fetchImpl: mockFetch,
        cachePath,
        nowFn: () => virtualNow,
        sleepFn,
      });
      await proxy.fetchSecCompanyFactsServer('PLTR', {
        fetchImpl: mockFetch,
        cachePath,
        nowFn: () => virtualNow,
        sleepFn,
      });

      expect(requestTimestamps.length).toBe(3);
      expect(requestTimestamps[1] - requestTimestamps[0]).toBeGreaterThanOrEqual(110);
      expect(requestTimestamps[2] - requestTimestamps[1]).toBeGreaterThanOrEqual(110);
      expect(sleepCalls.length).toBeGreaterThanOrEqual(2);
      expect(sleepCalls.every((ms) => ms >= 110)).toBe(true);
    });

    it('fetchSecCompanyFactsServer 應動態查出 CIK 並以合規標頭請求 SEC companyfacts JSON，且查無 CIK 或 HTTP 失敗時明確報錯', async () => {
      const proxy = require('../../scripts/market-sync/sec-edgar-proxy.cjs');
      proxy.resetSecProxyState();

      const cachePath = createTempCachePath();
      tempFilesToClean.push(cachePath);

      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('company_tickers.json')) {
          return { ok: true, status: 200, json: async () => MOCK_SEC_COMPANY_TICKERS };
        }
        if (url.includes('CIK0001067983.json')) {
          return { ok: true, status: 200, json: async () => MOCK_COMPANY_FACTS_BRK };
        }
        return { ok: false, status: 429, json: async () => ({}) };
      });

      const facts = await proxy.fetchSecCompanyFactsServer('BRK.B', {
        fetchImpl: mockFetch,
        cachePath,
        minIntervalMs: 0,
      });

      expect(facts.entityName).toBe('BERKSHIRE HATHAWAY INC');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://data.sec.gov/api/xbrl/companyfacts/CIK0001067983.json',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'StockTrackerApp/1.0 (local-analytics@stocktracker.local)',
            Accept: 'application/json',
          }),
        })
      );

      // 查無 CIK 應拋錯（不可靜默回傳空物件）
      await expect(
        proxy.fetchSecCompanyFactsServer('UNKNOWN_SYMBOL_ZZZ', {
          fetchImpl: mockFetch,
          cachePath,
          minIntervalMs: 0,
        })
      ).rejects.toThrow(/CIK/);

      // SEC 回應 429 應拋錯
      await expect(
        proxy.fetchSecCompanyFactsServer('PLTR', {
          fetchImpl: mockFetch,
          cachePath,
          minIntervalMs: 0,
        })
      ).rejects.toThrow(/429/);
    });

    it('冷啟動並發呼叫 resolveUsCikDynamic 應合併為單次 company_tickers.json 下載，且本地快取損毀時應自動重建', async () => {
      const proxy = require('../../scripts/market-sync/sec-edgar-proxy.cjs');
      proxy.resetSecProxyState();

      const cachePath = createTempCachePath();
      tempFilesToClean.push(cachePath);

      // 預先寫入損毀的快取檔
      fs.writeFileSync(cachePath, '{corrupted_json', 'utf8');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => MOCK_SEC_COMPANY_TICKERS,
      });

      const [cikPltr, cikOrcl] = await Promise.all([
        proxy.resolveUsCikDynamic('PLTR', { fetchImpl: mockFetch, cachePath, minIntervalMs: 0 }),
        proxy.resolveUsCikDynamic('ORCL', { fetchImpl: mockFetch, cachePath, minIntervalMs: 0 }),
      ]);

      expect(cikPltr).toBe('0001321655');
      expect(cikOrcl).toBe('0001341439');
      // 單飛去重：兩筆並發查詢只下載一次
      expect(mockFetch).toHaveBeenCalledTimes(1);
      // 驗證損毀快取已被修復為合法 JSON
      const repaired = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      expect(repaired.tickers.PLTR).toBe('0001321655');
    });
  });

  describe('2. 前端傳輸層重構 (src/engine/secEdgarTransport.ts)', () => {
    it('瀏覽器環境下 getSecEdgarHeaders 必須徹底移除 Forbidden Header (User-Agent 與 Accept-Encoding)', () => {
      vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });

      const headers = getSecEdgarHeaders();
      expect(headers.Accept).toBe('application/json');
      expect(headers['User-Agent']).toBeUndefined();
      expect(headers['Accept-Encoding']).toBeUndefined();
      expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain('user-agent');
      expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain('accept-encoding');
    });

    it('瀏覽器環境下 fetchSecCompanyFacts 應改打本地中介層 /api/market/sec-edgar/companyfacts/:symbol 且零 Forbidden Header，並支援任意美股與 BRK.B/BRK-B', async () => {
      vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });

      const mockFetcher = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => MOCK_COMPANY_FACTS_BRK,
      });

      // 非 18 檔靜態清單標的 PLTR 也可透過本地代理直接查詢
      await fetchSecCompanyFacts('PLTR', mockFetcher);
      expect(mockFetcher).toHaveBeenNthCalledWith(
        1,
        '/api/market/sec-edgar/companyfacts/PLTR',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        })
      );

      // 驗證實際傳出的 headers 絕無 User-Agent / Accept-Encoding
      const sentHeaders = mockFetcher.mock.calls[0][1].headers as Record<string, string>;
      expect(sentHeaders['User-Agent']).toBeUndefined();
      expect(sentHeaders['Accept-Encoding']).toBeUndefined();

      // 驗證 BRK.B / BRK-B / BRK_B 正規化與完整 10-Q/10-K 解析閉環
      const brkFacts = await fetchSecCompanyFacts('brk_b', mockFetcher);
      expect(mockFetcher).toHaveBeenNthCalledWith(
        2,
        '/api/market/sec-edgar/companyfacts/BRK.B',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        })
      );

      const records = parseSecCompanyFactsToRecords('BRK.B', brkFacts);
      expect(records).toHaveLength(2);
      const q3 = records.find((r) => r.year === 2025 && r.quarter === 3);
      const q4 = records.find((r) => r.year === 2025 && r.quarter === 4);
      expect(q3?.income).toEqual({
        revenue: 92500000000,
        grossProfit: 31000000000,
        operatingIncome: 14500000000,
        netIncome: 12100000000,
        eps: 5.42,
      });
      expect(q4?.income).toEqual({
        revenue: 98000000000,
        grossProfit: 33500000000,
        operatingIncome: 16200000000,
        netIncome: 13800000000,
        eps: 6.18,
      });
    });

    it('代碼正規化與既有關聯函式應保持向後相容並支援 BRK.B <-> BRK-B <-> BRK_B', () => {
      expect(normalizeCik(1067983)).toBe('0001067983');
      expect(normalizeUsTickerSymbol(' brk_b ')).toBe('BRK.B');
      expect(normalizeUsTickerSymbol('BRK-B')).toBe('BRK-B');
      expect(normalizeUsTickerSymbol('brk.b')).toBe('BRK.B');

      expect(resolveTickerToCik('BRK.B')).toBe('0001067983');
      expect(resolveTickerToCik('BRK-B')).toBe('0001067983');
      expect(resolveTickerToCik('BRK_B')).toBe('0001067983');
    });

    it('瀏覽器環境下本地代理回應 404 或 429 時應明確拋錯不吞噬錯誤', async () => {
      vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });

      const mock404 = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
      await expect(fetchSecCompanyFacts('UNKNOWN_XYZ', mock404)).rejects.toThrow(/404/);

      const mock429 = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
      await expect(fetchSecCompanyFacts('AAPL', mock429)).rejects.toThrow(/429/);
    });
  });
});
