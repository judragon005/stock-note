import { describe, it, expect } from 'vitest';
import { resolveAssetClass, isCanonicalEtfSymbol } from './assetClassifier';
import { getMarketSettlementStatus } from './marketSettlementEngine';
import {
  parseYahooHistoricalCandlesResponse,
  parseYahooHistoricalChartResponse,
} from './historicalPriceFetcher';

describe('Spec 0239 T02: 單一權威資產分類器 resolveAssetClass', () => {
  it('1. 優先序 ①：metaType 顯式指定 ETF 或 STOCK 時應具有最高優先權', () => {
    expect(resolveAssetClass('2330', '台積電', 'TW', 'ETF')).toBe('ETF');
    expect(resolveAssetClass('2330', '台積電', 'TW', 'etf')).toBe('ETF');
    expect(resolveAssetClass('0050', '元大台灣50', 'TW', 'STOCK')).toBe('STOCK');
    expect(resolveAssetClass('VOO', 'Vanguard S&P 500', 'US', 'stock')).toBe('STOCK');
  });

  it('2. 優先序 ②：台股 ETF / REITs 代碼嚴格正則應準確判別為 ETF', () => {
    const twEtfSymbols = [
      '0050',
      '0056',
      '00878',
      '00919',
      '00679B',
      '00631L',
      '00632R',
      '00980A',
      '009800',
      '01001T',
      '0050.TW',
      '00679B.TWO',
    ];
    for (const sym of twEtfSymbols) {
      expect(resolveAssetClass(sym, undefined, 'TW')).toBe('ETF');
      expect(isCanonicalEtfSymbol(sym, undefined, 'TW')).toBe(true);
    }

    // 非法或一般個股代碼不得誤判為 ETF
    expect(resolveAssetClass('2330', '台積電', 'TW')).toBe('STOCK');
    expect(resolveAssetClass('001', '測試短碼', 'TW')).toBe('STOCK');
    expect(resolveAssetClass('0123', '非五碼01開頭', 'TW')).toBe('STOCK');
  });

  it('3. 優先序 ③：擴充美股主流 ETF 白名單 46 檔全數應回傳 ETF，個股應回傳 STOCK', () => {
    const usEtfs = [
      'VT', 'VOO', 'VTI', 'SPY', 'QQQ', 'QQQM', 'IVV', 'SCHD',
      'BND', 'AGG', 'VIG', 'VYM', 'JEPI', 'JEPQ', 'GLD', 'SLV',
      'VNQ', 'TLT', 'IEF', 'SHY', 'SGOV', 'SOXX', 'SMH', 'XLF',
      'XLK', 'XLE', 'XLV', 'XLY', 'XLP', 'XLU', 'XLI', 'XLB',
      'XLC', 'XLRE', 'EEM', 'VEA', 'VWO', 'VGK', 'TQQQ', 'SQQQ',
      'SOXL', 'ARKK', 'DIA', 'IWM', 'VXUS', 'BNDX',
    ];
    for (const sym of usEtfs) {
      expect(resolveAssetClass(sym, undefined, 'US')).toBe('ETF');
      expect(resolveAssetClass(sym.toLowerCase())).toBe('ETF');
    }

    for (const stock of ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'BRK.B', 'AMD']) {
      expect(resolveAssetClass(stock, undefined, 'US')).toBe('STOCK');
      expect(isCanonicalEtfSymbol(stock, undefined, 'US')).toBe(false);
    }
  });

  it('4. 優先序 ④：名稱包含 ETF 或指數股票型應回傳 ETF，但嚴禁誤殺富邦金、國泰金、富邦媒、國泰建、元大金', () => {
    expect(resolveAssetClass('MYFUND', '某某科技 ETF 基金', 'US')).toBe('ETF');
    expect(resolveAssetClass('CUSTOM', '台股高息指數股票型基金', 'TW')).toBe('ETF');

    // 防誤殺核心驗證：投信同名金控 / 企業股必須嚴格回傳 STOCK
    const mustBeStock: Array<[string, string]> = [
      ['2881', '富邦金'],
      ['2882', '國泰金'],
      ['8454', '富邦媒'],
      ['2501', '國泰建'],
      ['2885', '元大金'],
      ['2891', '中信金'],
      ['6005', '群益證'],
    ];
    for (const [sym, name] of mustBeStock) {
      expect(resolveAssetClass(sym, name, 'TW')).toBe('STOCK');
      expect(isCanonicalEtfSymbol(sym, name, 'TW')).toBe(false);
    }
  });
});

describe('Spec 0239 T02: marketSettlementEngine 時區與結算引擎校正', () => {
  it('1. 強制 hourCycle: h23 — 台北午夜 00:15 不得因 hour=24 誤判為台股當日已結算', () => {
    // 2026-09-30 (週三) 00:15:00 台北時間
    const midnight = new Date('2026-09-30T00:15:00+08:00');
    const status = getMarketSettlementStatus('TW', midnight);

    expect(status.isSettled).toBe(false);
    expect(status.anchorTradingDate).toBe('2026-09-29');
    expect(status.currentTradingDate).toBe('2026-09-30');
    expect(status.isTradingHours).toBe(false);
  });

  it('2. 台北時間週日與週一 00:00~07:59（美東週六/週日休市），美股應回傳 isSettled: true 且定錨上週五', () => {
    // 2026-09-27 (週日) 00:30 與 07:30 台北時間 -> 美東週六
    for (const iso of [
      '2026-09-27T00:30:00+08:00',
      '2026-09-27T07:30:00+08:00',
      '2026-09-28T00:30:00+08:00',
      '2026-09-28T07:30:00+08:00',
    ]) {
      const status = getMarketSettlementStatus('US', new Date(iso));
      expect(status.isSettled).toBe(true);
      expect(status.anchorTradingDate).toBe('2026-09-25'); // 上週五
      expect(status.isTradingHours).toBe(false);
      expect(status.reason).toBeUndefined();
      expect(status.currentTradingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('3. 美東夏令 (EDT) 與冬令 (EST) 盤中交易時段 09:30~16:00 應精準判定並回傳美東 currentTradingDate', () => {
    // 夏令 EDT (UTC-4)：2026-09-30 10:00 EDT = 台北 2026-09-30 22:00
    const summerOpen = getMarketSettlementStatus('US', new Date('2026-09-30T22:00:00+08:00'));
    expect(summerOpen.isTradingHours).toBe(true);
    expect(summerOpen.isSettled).toBe(false);
    expect(summerOpen.anchorTradingDate).toBe('2026-09-29');
    expect(summerOpen.currentTradingDate).toBe('2026-09-30');

    // 冬令 EST (UTC-5)：台北 2026-01-14 22:00 = 美東 2026-01-14 09:00 EST (尚未開盤)
    const winterPreOpen = getMarketSettlementStatus('US', new Date('2026-01-14T22:00:00+08:00'));
    expect(winterPreOpen.isTradingHours).toBe(false);
    expect(winterPreOpen.isSettled).toBe(true);
    expect(winterPreOpen.anchorTradingDate).toBe('2026-01-13');
    expect(winterPreOpen.currentTradingDate).toBe('2026-01-14');

    // 冬令 EST (UTC-5)：台北 2026-01-15 04:30 = 美東 2026-01-14 15:30 EST (仍在盤中！夏令此時已收盤)
    const winterLateTrading = getMarketSettlementStatus('US', new Date('2026-01-15T04:30:00+08:00'));
    expect(winterLateTrading.isTradingHours).toBe(true);
    expect(winterLateTrading.isSettled).toBe(false);
    expect(winterLateTrading.anchorTradingDate).toBe('2026-01-13');
    expect(winterLateTrading.currentTradingDate).toBe('2026-01-14');

    // 冬令 EST 盤後未達台北 08:00：台北 2026-01-15 05:30 = 美東 2026-01-14 16:30 EST
    const winterAfterCloseBeforeSettle = getMarketSettlementStatus('US', new Date('2026-01-15T05:30:00+08:00'));
    expect(winterAfterCloseBeforeSettle.isTradingHours).toBe(false);
    expect(winterAfterCloseBeforeSettle.isSettled).toBe(false);
    expect(winterAfterCloseBeforeSettle.anchorTradingDate).toBe('2026-01-13');
    expect(winterAfterCloseBeforeSettle.currentTradingDate).toBe('2026-01-14');

    // 冬令 EST 達台北 08:00 結算：台北 2026-01-15 08:00 = 美東 2026-01-14 19:00 EST
    const winterSettled = getMarketSettlementStatus('US', new Date('2026-01-15T08:00:00+08:00'));
    expect(winterSettled.isTradingHours).toBe(false);
    expect(winterSettled.isSettled).toBe(true);
    expect(winterSettled.anchorTradingDate).toBe('2026-01-14');
    expect(winterSettled.currentTradingDate).toBe('2026-01-14');
  });
});

describe('Spec 0239 T02: market-freshness-service 時區 DST、休市日曆與空庫判定', () => {
  it('1. 美股冬令 (EST) 16:30 (21:30 UTC) 尚未達 17:00 結算，不應被誤判為 EDT 17:30 已結算', async () => {
    // @ts-expect-error cjs import
    const { getMarketAnchorDate } = await import('../../scripts/market-sync/market-freshness-service.cjs');

    // 2026-01-15 (週四) 16:30 EST = 2026-01-15T21:30:00Z
    const estBeforeSettle = new Date('2026-01-15T21:30:00Z');
    expect(getMarketAnchorDate('US', estBeforeSettle)).toBe('2026-01-14');

    // 2026-01-15 (週四) 17:30 EST = 2026-01-15T22:30:00Z
    const estAfterSettle = new Date('2026-01-15T22:30:00Z');
    expect(getMarketAnchorDate('US', estAfterSettle)).toBe('2026-01-15');
  });

  it('2. 應整合 market-holidays.json 跳過台股與美股法定休市日', async () => {
    // @ts-expect-error cjs import
    const { getMarketAnchorDate } = await import('../../scripts/market-sync/market-freshness-service.cjs');

    // 台股 2026-04-06 (週一 清明節補假) 16:00，且 04-03 (週五 兒童節補假) 亦休市 -> 應回退至 2026-04-02 (週四)
    expect(getMarketAnchorDate('TW', new Date('2026-04-06T16:00:00+08:00'))).toBe('2026-04-02');

    // 美股 2026-11-26 (週四 感恩節) 18:00 EST -> 應回退至 2026-11-25 (週三)
    expect(getMarketAnchorDate('US', new Date('2026-11-26T18:00:00-05:00'))).toBe('2026-11-25');
  });

  it('3. 空資料庫 (twLatest === null 或 usLatest === null) 時 isStale 必須回傳 true', async () => {
    // @ts-expect-error cjs import
    const { checkMarketFreshness } = await import('../../scripts/market-sync/market-freshness-service.cjs');

    const emptyDb = {
      prepare: () => ({
        get: () => null,
      }),
    };
    const res = checkMarketFreshness(emptyDb, new Date('2026-10-02T16:00:00+08:00'));
    expect(res.tw.latestDate).toBeNull();
    expect(res.tw.isStale).toBe(true);
    expect(res.us.latestDate).toBeNull();
    expect(res.us.isStale).toBe(true);
  });
});

describe('Spec 0239 T02: Yahoo Timestamp 嚴格市場時區轉換 (ingest-us-quotes & historicalPriceFetcher)', () => {
  it('1. ingest-us-quotes.cjs 解析美股收盤 timestamp (21:00 UTC = 台北隔日 05:00) 必須鎖定 America/New_York 不偏移隔日', async () => {
    // @ts-expect-error cjs import
    const { parseYahooChartData, formatDateYMD } = await import('../../scripts/market-sync/ingest-us-quotes.cjs');

    // 2026-01-15 16:00 EST = 2026-01-15T21:00:00Z (在 UTC+8 台北時間為 2026-01-16 05:00)
    const usCloseTs = Math.floor(Date.parse('2026-01-15T21:00:00Z') / 1000);
    expect(formatDateYMD(new Date(usCloseTs * 1000))).toBe('2026-01-15');

    const candles = parseYahooChartData({
      chart: {
        result: [
          {
            meta: { symbol: 'NVDA' },
            timestamp: [usCloseTs],
            indicators: {
              quote: [{ open: [130], high: [135], low: [129], close: [134], volume: [1000000] }],
              adjclose: [{ adjclose: [134] }],
            },
          },
        ],
      },
    });

    expect(candles).toHaveLength(1);
    expect(candles[0].date).toBe('2026-01-15');
  });

  it('2. historicalPriceFetcher.ts 美股使用 America/New_York、台股使用 Asia/Taipei 轉日期', () => {
    // 美股：2026-01-15 16:00 EST = 2026-01-15T21:00:00Z (台北 2026-01-16 05:00)
    const usTs = Math.floor(Date.parse('2026-01-15T21:00:00Z') / 1000);
    const usPayload = {
      chart: {
        result: [
          {
            meta: { symbol: 'NVDA', exchangeTimezoneName: 'America/New_York' },
            timestamp: [usTs],
            indicators: { quote: [{ open: [130], high: [135], low: [129], close: [134], volume: [500] }] },
          },
        ],
      },
    };

    const usCandles = parseYahooHistoricalCandlesResponse(usPayload, 'US');
    expect(usCandles[0].date).toBe('2026-01-15');
    // 即使未顯式傳 market，亦應由 meta 判別美股並使用 America/New_York
    const usMapAuto = parseYahooHistoricalChartResponse(usPayload);
    expect(usMapAuto['2026-01-15']).toBe(134);
    expect(usMapAuto['2026-01-16']).toBeUndefined();

    // 台股：2026-01-15 09:00 CST = 2026-01-15T01:00:00Z (美東 2026-01-14 20:00)
    const twTs = Math.floor(Date.parse('2026-01-15T01:00:00Z') / 1000);
    const twPayload = {
      chart: {
        result: [
          {
            meta: { symbol: '2330.TW' },
            timestamp: [twTs],
            indicators: { quote: [{ open: [1000], high: [1020], low: [995], close: [1010], volume: [1000] }] },
          },
        ],
      },
    };

    const twCandles = parseYahooHistoricalCandlesResponse(twPayload, 'TW');
    expect(twCandles[0].date).toBe('2026-01-15');
    const twMapAuto = parseYahooHistoricalChartResponse(twPayload);
    expect(twMapAuto['2026-01-15']).toBe(1010);
  });
});

describe('Spec 0239 T02: sync-tw-market.cjs 強制鎖定 Asia/Taipei 日期上下文', () => {
  it('1. 跨 UTC 午夜時 (2026-05-14T16:30:00Z = 台北 2026-05-15 00:30 週五)，日期與民國年必須精準為台北日期且 hour 為 0', async () => {
    // @ts-expect-error cjs import
    const { getTaipeiDateContext } = await import('../../scripts/market-sync/sync-tw-market.cjs');

    const ctx = getTaipeiDateContext(null, new Date('2026-05-14T16:30:00Z'));
    expect(ctx.dateStr).toBe('2026-05-15');
    expect(ctx.yyyymmdd).toBe('20260515');
    expect(ctx.rocDateStr).toBe('115/05/15');
    expect(ctx.dayOfWeek).toBe(5); // 週五
    expect(ctx.dayOfMonth).toBe(15);
    expect(ctx.currentHour).toBe(0); // 00:30 必為 0，不得為 24
  });

  it('2. 顯式傳入目標日期字串時應不受 OS 時區干擾正確解析', async () => {
    // @ts-expect-error cjs import
    const { getTaipeiDateContext } = await import('../../scripts/market-sync/sync-tw-market.cjs');

    const ctx = getTaipeiDateContext('2026-10-02', new Date('2026-10-02T10:30:00Z'));
    expect(ctx.dateStr).toBe('2026-10-02');
    expect(ctx.yyyymmdd).toBe('20261002');
    expect(ctx.rocDateStr).toBe('115/10/02');
    expect(ctx.dayOfWeek).toBe(5); // 週五
    expect(ctx.dayOfMonth).toBe(2);
    expect(ctx.currentHour).toBe(18); // 10:30Z = 18:30 台北
  });
});
