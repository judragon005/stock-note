/**
 * Spec 0249 T07: 美股持倉按需除權息同步入庫與 TTM 批次查詢契約測試
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  isUsMarketSymbol,
  backfillUsHoldingsDividends,
  queryTtmDividendProfiles,
} = require('./on-demand-backfill-orchestrator.cjs');
const { closeAllSqliteLakehouseDbs } = require('./sqlite-db-core.cjs');
const { createMarketApiMiddleware } = require('./vite-market-middleware.cjs');

async function run() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec0249-us-ttm-'));
  const dbPath = path.join(tmpDir, 'test.db');

  try {
    // 1. 美股代碼辨識契約
    assert.equal(isUsMarketSymbol('VOO'), true);
    assert.equal(isUsMarketSymbol('AAPL'), true);
    assert.equal(isUsMarketSymbol('BRK.B'), true);
    assert.equal(isUsMarketSymbol('2330'), false);
    assert.equal(isUsMarketSymbol('00679B'), false);
    assert.equal(isUsMarketSymbol('00411A'), false);

    // 2. 模擬 Yahoo Finance 2 年除息回傳（含 1 筆未來日期以驗證因果屏障）
    const mockFetcher = async (url) => {
      assert.ok(url.includes('/VOO?range=2y'), `Expected US Yahoo URL, got ${url}`);
      return {
        ok: true,
        json: async () => ({
          chart: {
            result: [
              {
                events: {
                  dividends: {
                    d1: { date: Math.floor(Date.parse('2026-03-20T00:00:00Z') / 1000), amount: 1.7 },
                    d2: { date: Math.floor(Date.parse('2026-06-20T00:00:00Z') / 1000), amount: 1.75 },
                    d3: { date: Math.floor(Date.parse('2026-09-20T00:00:00Z') / 1000), amount: 1.65 },
                    d4: { date: Math.floor(Date.parse('2026-12-20T00:00:00Z') / 1000), amount: 1.8 }, // 未來日期，應被因果屏障攔截
                  },
                },
              },
            ],
          },
        }),
      };
    };

    const syncRes = await backfillUsHoldingsDividends(['VOO', '2330', 'voo'], dbPath, mockFetcher);
    assert.deepEqual(syncRes.syncedSymbols, ['VOO']);
    assert.equal(syncRes.totalSaved, 4);

    // 3. 重複執行驗證冪等 UPSERT
    const syncRes2 = await backfillUsHoldingsDividends(['VOO'], dbPath, mockFetcher);
    assert.equal(syncRes2.totalSaved, 4);

    // 4. 查詢 TTM（today = 2026-11-26，應只計入 3/6/9 月共 5.10 USD，排除 12/20 未來日期）
    const profiles = queryTtmDividendProfiles(['VOO', 'TSLA'], dbPath, '2026-11-26');
    assert.ok(profiles.VOO, 'VOO TTM profile should exist');
    assert.deepEqual(profiles.VOO.payoutMonths, [3, 6, 9]);
    assert.equal(profiles.VOO.annualPerShareDividend, 5.1);
    assert.equal(profiles.VOO.source, 'LAKEHOUSE_TTM');
    assert.equal(profiles.TSLA, undefined);

    // 5. 驗證 HTTP 中介層 GET /api/market/ttm-dividends?symbols=VOO,TSLA&today=2026-11-26 回傳 200 與正確 JSON
    const middleware = createMarketApiMiddleware(dbPath);
    let httpStatus = 0;
    let httpBody = '';
    await new Promise((resolve, reject) => {
      const req = { url: '/api/market/ttm-dividends?symbols=VOO,TSLA&today=2026-11-26', method: 'GET' };
      const res = {
        writeHead(code) {
          httpStatus = code;
        },
        end(payload) {
          httpBody = String(payload || '');
          resolve();
        },
      };
      Promise.resolve(middleware(req, res, () => resolve())).catch(reject);
    });
    assert.equal(httpStatus, 200, `Expected HTTP 200, got ${httpStatus}: ${httpBody}`);
    const parsedHttp = JSON.parse(httpBody);
    assert.deepEqual(parsedHttp.profiles.VOO.payoutMonths, [3, 6, 9]);
    assert.equal(parsedHttp.profiles.VOO.annualPerShareDividend, 5.1);
    assert.equal(parsedHttp.profiles.TSLA, undefined);

    console.log('✔ Spec 0249 T07 US TTM dividend sync, query & HTTP middleware contract tests passed');
  } finally {
    if (typeof closeAllSqliteLakehouseDbs === 'function') closeAllSqliteLakehouseDbs();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Windows 檔案鎖定忽略清理異常
    }
  }
}

run().catch((err) => {
  console.error('✖ Spec 0249 T07 test failed:', err);
  process.exit(1);
});
