import { describe, it, expect } from 'vitest';

declare const require: (id: string) => any;
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('Ticket 15 & Spec 0209: Macro War Room 3.0 Ingestion, Breadth & Pulse Pipeline', () => {
  const macroModule = require('../../scripts/market-sync/ingest-macro-sentiment.cjs');
  const dbCoreModule = require('../../scripts/market-sync/sqlite-db-core.cjs');

  it('1. parseFredObservations 應正確解析 FRED 殖利率序列最後有效值', () => {
    const mockFred = {
      observations: [
        { date: '2026-09-29', value: '4.32' },
        { date: '2026-09-30', value: '4.35' },
        { date: '2026-10-01', value: '.' }, // 假期或缺失值
      ],
    };

    const latest = macroModule.parseFredObservations(mockFred);
    expect(latest).toBe(4.35);
  });

  it('2. computeYieldSpread 應精確計算 10Y-2Y 殖利率倒掛利差', () => {
    // 10Y: 4.10, 2Y: 4.30 -> 利差 -0.20% (倒掛)
    const spread = macroModule.computeYieldSpread(4.10, 4.30);
    expect(spread).toBe(-0.20);
  });

  it('3. parseCnnFearGreedResponse 應提取當前分數與評級', () => {
    const mockCnn = {
      fear_and_greed: {
        score: 68.4,
        rating: 'greed',
        timestamp: '2026-10-02T16:00:00+00:00',
      },
    };

    const score = macroModule.parseCnnFearGreedResponse(mockCnn);
    expect(score).toBe(68.4);
  });

  it('4. fetchYahooQuoteAndMa 應計算最新報價、漲跌幅、20MA/60MA 與乖離率', async () => {
    const closes = [
      ...Array(40).fill(100), // 前 40 日均為 100
      ...Array(19).fill(110), // 接下來 19 日為 110
      121, // 最新一日收盤 121
    ];
    const mockFetchJson = async (url: string) => {
      expect(url).toContain(encodeURIComponent('^SOX'));
      return {
        chart: {
          result: [
            {
              meta: {
                regularMarketPrice: 121,
                chartPreviousClose: 110,
              },
              indicators: {
                quote: [{ close: closes }],
              },
            },
          ],
        },
      };
    };

    const quote = await macroModule.fetchYahooQuoteAndMa('^SOX', mockFetchJson, 5000);
    expect(quote).not.toBeNull();
    expect(quote.price).toBe(121);
    expect(quote.prevClose).toBe(110);
    expect(quote.changePercent).toBeCloseTo(10.0, 2);
    // 20MA = (19 * 110 + 121) / 20 = 2211 / 20 = 110.55
    expect(quote.ma20).toBeCloseTo(110.55, 2);
    // 60MA = (40 * 100 + 19 * 110 + 121) / 60 = 6211 / 60 = 103.52
    expect(quote.ma60).toBeCloseTo(103.52, 2);
    expect(quote.bias20Ma).toBeCloseTo(((121 - 110.55) / 110.55) * 100, 1);
    expect(quote.above20Ma).toBe(true);
    expect(quote.above60Ma).toBe(true);
  });

  it('5. fetchFredSeriesLatest 應支援一般序列最新值與 CPIAUCSL 12 個月年增率 (YoY %) 計算', async () => {
    const mockFetchJson = async (url: string) => {
      if (url.includes('series_id=CPIAUCSL')) {
        // 13 個月序列：12 個月前為 300.0，最新為 309.0 -> YoY = +3.0%
        const obs = [];
        for (let i = 0; i < 12; i++) {
          obs.push({
            date: `2025-${String(i + 1).padStart(2, '0')}-01`,
            value: String(300 + i * 0.5),
          });
        }
        obs.push({ date: '2026-01-01', value: '309.0' });
        return { observations: obs };
      }
      if (url.includes('series_id=BAMLH0A0HYM2')) {
        return {
          observations: [
            { date: '2026-10-19', value: '3.45' },
            { date: '2026-10-20', value: '.' },
          ],
        };
      }
      return null;
    };

    const cpiYoY = await macroModule.fetchFredSeriesLatest('CPIAUCSL', 'test_fred_key', mockFetchJson);
    expect(cpiYoY).toBeCloseTo(3.0, 2);

    const hyOas = await macroModule.fetchFredSeriesLatest('BAMLH0A0HYM2', 'test_fred_key', mockFetchJson);
    expect(hyOas).toBe(3.45);
  });

  it('6. fetchFullMacroWarRoomPulse 應平行聚合跨市場脈搏並精確換算台積電 ADR 折溢價', async () => {
    const mockFetchJson = async (url: string) => {
      if (url.includes('finance.yahoo.com')) {
        const makeYahoo = (price: number, prev: number) => ({
          chart: {
            result: [
              {
                meta: { regularMarketPrice: price, chartPreviousClose: prev },
                indicators: { quote: [{ close: [...Array(59).fill(prev), price] }] },
              },
            ],
          },
        });
        if (url.includes('TSM')) return makeYahoo(200, 195); // TSM ADR = $200
        if (url.includes('2330.TW')) return makeYahoo(1050, 1040); // 2330.TW = 1050 TWD
        if (url.includes('TWD%3DX') || url.includes('TWD=X')) return makeYahoo(32.0, 31.9); // USD/TWD = 32.0
        if (url.includes('%5ESOX') || url.includes('^SOX')) return makeYahoo(5200, 5100);
        if (url.includes('%5ETWII') || url.includes('^TWII')) return makeYahoo(23500, 23300);
        if (url.includes('%5EGSPC') || url.includes('^GSPC')) return makeYahoo(5850, 5800);
        if (url.includes('%5EIXIC') || url.includes('^IXIC')) return makeYahoo(18500, 18300);
        if (url.includes('GC%3DF') || url.includes('GC=F')) return makeYahoo(2750, 2730);
        if (url.includes('CL%3DF') || url.includes('CL=F')) return makeYahoo(71.5, 72.0);
        if (url.includes('DX-Y.NYB')) return makeYahoo(103.8, 103.5);
        if (url.includes('%5EVIX') || url.includes('^VIX')) return makeYahoo(18.2, 19.0);
        if (url.includes('%5ETNX') || url.includes('^TNX')) return makeYahoo(4.2, 4.15);
        if (url.includes('%5EIRX') || url.includes('^IRX')) return makeYahoo(4.6, 4.6);
      }
      if (url.includes('series_id=DGS10')) return { observations: [{ date: '2026-10-20', value: '4.22' }] };
      if (url.includes('series_id=DGS2')) return { observations: [{ date: '2026-10-20', value: '4.02' }] };
      if (url.includes('series_id=DGS3MO')) return { observations: [{ date: '2026-10-20', value: '4.65' }] };
      if (url.includes('series_id=T10Y2Y')) return { observations: [{ date: '2026-10-20', value: '0.20' }] };
      if (url.includes('series_id=FEDFUNDS')) return { observations: [{ date: '2026-10-20', value: '4.75' }] };
      if (url.includes('series_id=BAMLH0A0HYM2')) return { observations: [{ date: '2026-10-20', value: '3.12' }] };
      if (url.includes('series_id=CPIAUCSL')) {
        return {
          observations: [
            { date: '2025-10-01', value: '300.0' },
            ...Array(11).fill({ date: '2026-05-01', value: '304.0' }),
            { date: '2026-10-01', value: '307.5' },
          ],
        };
      }
      if (url.includes('dataviz.cnn.io')) {
        return { fear_and_greed: { score: 62.5, rating: 'greed' } };
      }
      return null;
    };

    const pulse = await macroModule.fetchFullMacroWarRoomPulse({
      fredApiKey: 'mock_fred_key',
      fetchJson: mockFetchJson,
    });

    // TSM ADR 折合台幣 = (200 * 32.0) / 5 = 1280 TWD
    expect(pulse.tsmAdrConvertedTwd).toBeCloseTo(1280, 2);
    // 溢價率 = ((1280 - 1050) / 1050) * 100 = 21.90%
    expect(pulse.tsmAdrPremiumPercent).toBeCloseTo(21.9, 1);
    expect(pulse.soxClose).toBe(5200);
    expect(pulse.goldPrice).toBe(2750);
    expect(pulse.oilWtiPrice).toBe(71.5);
    expect(pulse.dxyIndex).toBe(103.8);
    expect(pulse.treasuryYield10y).toBe(4.22);
    expect(pulse.yieldSpread10y2y).toBe(0.2);
    expect(pulse.fedFundsRate).toBe(4.75);
    expect(pulse.cpiYoY).toBeCloseTo(2.5, 2);
    expect(pulse.creditSpreadOas).toBe(3.12);
    expect(pulse.cnnFearGreedScore).toBe(62.5);
  });

  it('7. getTwMarketBreadthAndSpotSummary 應快速計算台股漲跌家數、拉積盤結構與三大法人現貨金額', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'macro-breadth-test-'));
    const dbPath = path.join(tmpDir, 'test_market.db');
    const db = dbCoreModule.initSqliteLakehouseDb(dbPath);

    try {
      const insertCandle = db.prepare(`
        INSERT INTO daily_candles (symbol, date, open, high, low, close, adj_close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      // 前一日 2026-10-19 與最新日 2026-10-20：2330 上漲，但 4 檔中小型股下跌 (declining 4 > advancing 1 * 1.3)
      // 且大盤指數 ^TWII 上漲 -> 應判定為 NARROW_TSMC_TRAP
      insertCandle.run('^TWII', '2026-10-19', 23000, 23100, 22900, 23000, 23000, 100000);
      insertCandle.run('^TWII', '2026-10-20', 23050, 23200, 23000, 23150, 23150, 110000);

      insertCandle.run('2330', '2026-10-19', 1000, 1010, 995, 1000, 1000, 50000);
      insertCandle.run('2330', '2026-10-20', 1020, 1060, 1015, 1050, 1050, 60000);

      const losers = ['2317', '2454', '2308', '2382'];
      for (const sym of losers) {
        insertCandle.run(sym, '2026-10-19', 200, 205, 198, 200, 200, 10000);
        insertCandle.run(sym, '2026-10-20', 198, 199, 190, 192, 192, 12000);
      }

      // 寫入法人籌碼 (2330 收盤 1050, 外資買超 1,000,000 股 -> 10.5 億; 9999 無收盤價 fallback 100 TWD)
      const insertChips = db.prepare(`
        INSERT INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertChips.run('2330', '2026-10-20', 1000000, 200000, -100000);
      insertChips.run('9999', '2026-10-20', 500000, 0, 0); // fallback 100 TWD -> 0.5 億

      const summary = dbCoreModule.getTwMarketBreadthAndSpotSummary(db);
      expect(summary.twMarketBreadth.advancingCount).toBe(1);
      expect(summary.twMarketBreadth.decliningCount).toBe(4);
      expect(summary.twMarketBreadth.breadthRegime).toBe('NARROW_TSMC_TRAP');
      expect(summary.twMarketBreadth.pctAbove20MA).toBeCloseTo(20.0, 1);

      // 外資: (1,000,000 * 1050 + 500,000 * 100) / 1e8 = 11.0 億
      expect(summary.twInstitutionalSpot.foreignNetTwdBillions).toBeCloseTo(11.0, 2);
      // 投信: (200,000 * 1050) / 1e8 = 2.1 億
      expect(summary.twInstitutionalSpot.trustNetTwdBillions).toBeCloseTo(2.1, 2);
      // 自營商: (-100,000 * 1050) / 1e8 = -1.05 億
      expect(summary.twInstitutionalSpot.dealerNetTwdBillions).toBeCloseTo(-1.05, 2);
      expect(summary.twInstitutionalSpot.totalNetTwdBillions).toBeCloseTo(12.05, 2);

      // 當大盤指數與個股同步下跌時，應判定為 BROAD_DECLINE
      const declineSummary = dbCoreModule.getTwMarketBreadthAndSpotSummary(db, {
        taiexChangePercent: -1.25,
      });
      expect(declineSummary.twMarketBreadth.breadthRegime).toBe('BROAD_DECLINE');
    } finally {
      dbCoreModule.closeSqliteDb();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
