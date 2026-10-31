/**
 * ingest-macro-sentiment.cjs
 * 宏觀殖利率、跨資產脈搏與市場情緒指標排程入庫模組 (Spec 0167 / Ticket 15 & Spec 0209 Tickets 02, 03, 04, 05)
 * 資料來源：Yahoo Finance v8 Chart + FRED API + CNN Fear & Greed + TAIFEX / TWSE / FinMind
 */

const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

/**
 * 內部安全 JSON 請求輔助器：同時相容自訂 fetchJson(url, timeoutMs) 與標準 fetch Response
 */
async function executeJsonRequest(url, customFetchJson, timeoutMs = 8000) {
  try {
    if (typeof customFetchJson === 'function') {
      const result = await customFetchJson(url, timeoutMs);
      if (!result) return null;
      if (typeof result.json === 'function') {
        if (result.ok === false) return null;
        return await result.json();
      }
      return result;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => {
      if (controller) controller.abort();
    }, timeoutMs);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json, text/plain, */*',
        },
        signal: controller ? controller.signal : undefined,
      });
      if (!res.ok) return null;
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

/**
 * 解析 FRED 序列數據，取得最後一個非空有效數值
 */
function parseFredObservations(rawData) {
  if (!rawData || !Array.isArray(rawData.observations) || rawData.observations.length === 0) {
    return null;
  }

  // 若序列為降序 (最新日期在前)，先轉為依日期升序以確保往回取最後有效值一致
  const obsList = [...rawData.observations];
  if (
    obsList.length >= 2 &&
    obsList[0]?.date &&
    obsList[obsList.length - 1]?.date &&
    String(obsList[0].date) > String(obsList[obsList.length - 1].date)
  ) {
    obsList.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  }

  // 從最新往回找第一個非 '.' 的有效浮點數
  for (let i = obsList.length - 1; i >= 0; i--) {
    const valStr = String(obsList[i].value).trim();
    if (valStr !== '.' && valStr !== '') {
      const num = parseFloat(valStr);
      if (!isNaN(num)) {
        return num;
      }
    }
  }

  return null;
}

/**
 * 計算 10Y - 2Y 美債利差 (殖利率倒掛指標)
 */
function computeYieldSpread(yield10y, yield2y) {
  if (yield10y === null || yield10y === undefined || yield2y === null || yield2y === undefined) {
    return null;
  }
  const spread = yield10y - yield2y;
  return Number(spread.toFixed(2));
}

/**
 * 解析 CNN 恐懼貪婪指數公開 JSON
 */
function parseCnnFearGreedResponse(rawData) {
  if (!rawData || !rawData.fear_and_greed || typeof rawData.fear_and_greed.score !== 'number') {
    return null;
  }
  return Number(rawData.fear_and_greed.score.toFixed(1));
}

/**
 * 抓取 Yahoo Finance 3 個月日 K 並計算最新價、漲跌幅、20MA、60MA 與乖離率 (Spec 0209 Ticket 04)
 */
async function fetchYahooQuoteAndMa(symbol, fetchJson, timeoutMs = 8000) {
  if (!symbol) return null;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=3mo&interval=1d`;
  const data = await executeJsonRequest(url, fetchJson, timeoutMs);
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta || {};
  const rawCloses = result.indicators?.quote?.[0]?.close || [];
  const validCloses = rawCloses.filter((v) => typeof v === 'number' && Number.isFinite(v));

  const price =
    typeof meta.regularMarketPrice === 'number' && Number.isFinite(meta.regularMarketPrice)
      ? meta.regularMarketPrice
      : validCloses.length > 0
        ? validCloses[validCloses.length - 1]
        : null;

  if (price === null) return null;

  const prevClose =
    typeof meta.chartPreviousClose === 'number' &&
    Number.isFinite(meta.chartPreviousClose) &&
    meta.chartPreviousClose > 0
      ? meta.chartPreviousClose
      : validCloses.length >= 2
        ? validCloses[validCloses.length - 2]
        : price;

  const changePercent =
    prevClose && prevClose !== 0 ? Number((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0;

  const slice20 = validCloses.length > 0 ? validCloses.slice(-20) : [price];
  const slice60 = validCloses.length > 0 ? validCloses.slice(-60) : [price];

  const ma20Raw = slice20.reduce((acc, v) => acc + v, 0) / slice20.length;
  const ma60Raw = slice60.reduce((acc, v) => acc + v, 0) / slice60.length;
  const ma20 = Number(ma20Raw.toFixed(2));
  const ma60 = Number(ma60Raw.toFixed(2));

  const bias20Ma = ma20Raw !== 0 ? Number((((price - ma20Raw) / ma20Raw) * 100).toFixed(2)) : 0;
  const above20Ma = price >= ma20Raw;
  const above60Ma = price >= ma60Raw;

  return {
    symbol,
    price,
    prevClose,
    changePercent,
    ma20,
    ma60,
    bias20Ma,
    above20Ma,
    above60Ma,
  };
}

/**
 * 查詢 FRED 指定總經序列最新有效值；針對 CPIAUCSL 自動取近 13 期計算 12 個月 YoY 年增率 (%) (Spec 0209 Ticket 04)
 */
async function fetchFredSeriesLatest(seriesId, apiKey, fetchJson, timeoutMs = 8000) {
  if (!seriesId || !apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    return null;
  }

  const limit = seriesId === 'CPIAUCSL' ? 15 : 10;
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(
    seriesId
  )}&api_key=${encodeURIComponent(apiKey.trim())}&file_type=json&sort_order=desc&limit=${limit}`;

  const rawData = await executeJsonRequest(url, fetchJson, timeoutMs);
  if (!rawData || !Array.isArray(rawData.observations) || rawData.observations.length === 0) {
    return null;
  }

  if (seriesId === 'CPIAUCSL') {
    const validObs = [];
    for (const item of rawData.observations) {
      const valStr = String(item?.value ?? '').trim();
      if (valStr !== '.' && valStr !== '') {
        const num = parseFloat(valStr);
        if (!isNaN(num)) {
          validObs.push({ date: String(item.date || ''), num });
        }
      }
    }
    if (validObs.length === 0) return null;
    if (validObs.length === 1) return validObs[0].num;

    // 依日期升序排列 (最舊 -> 最新)
    validObs.sort((a, b) => a.date.localeCompare(b.date));
    const latest = validObs[validObs.length - 1].num;
    const idx12Ago = Math.max(0, validObs.length - 13);
    const obs12Ago = validObs[idx12Ago].num;
    if (!obs12Ago || obs12Ago === 0) return null;

    return Number((((latest - obs12Ago) / obs12Ago) * 100).toFixed(2));
  }

  return parseFredObservations(rawData);
}

/**
 * 正規化 Yahoo 殖利率報價 (例如 ^TNX 若回傳 42.5 則轉為 4.25%)
 */
function normalizeYahooYield(val) {
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  return val > 20 ? Number((val / 10).toFixed(2)) : Number(val.toFixed(2));
}

/**
 * 抓取美債 10 年期殖利率 (FRED DGS10 優先，失敗降級至 Yahoo ^TNX)
 */
async function fetchTreasuryYield10y(options = {}) {
  const { fredApiKey = process.env.FRED_API_KEY, fetchJson, timeoutMs = 8000 } = options;
  if (fredApiKey) {
    const dgs10 = await fetchFredSeriesLatest('DGS10', fredApiKey, fetchJson, timeoutMs);
    if (dgs10 !== null) return dgs10;
  }
  const tnx = await fetchYahooQuoteAndMa('^TNX', fetchJson, timeoutMs);
  return normalizeYahooYield(tnx?.price);
}

/**
 * 抓取 VIX 恐慌指數最新收盤價
 */
async function fetchVixClose(options = {}) {
  const { fetchJson, timeoutMs = 8000 } = options;
  const vix = await fetchYahooQuoteAndMa('^VIX', fetchJson, timeoutMs);
  return vix?.price ?? null;
}

/**
 * 抓取 CNN Fear & Greed 分數
 */
async function fetchCnnFearGreed(options = {}) {
  const { fetchJson, timeoutMs = 8000 } = options;
  const url = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';
  const raw = await executeJsonRequest(url, fetchJson, timeoutMs);
  return parseCnnFearGreedResponse(raw);
}

/**
 * 抓取台指期三大法人未平倉淨額口數 (TAIFEX CSV 優先，FinMind 備援)
 */
async function fetchTaifexInstitutionalOi(options = {}) {
  const { fetchText, fetchJson, finmindApiKey = process.env.FINMIND_API_KEY, timeoutMs = 8000 } = options;
  try {
    if (typeof fetchText === 'function') {
      const csvText = await fetchText('https://www.taifex.com.tw/cht/3/futContractsDateDown', timeoutMs);
      const parsed = parseTaifexInstitutionalFuturesCsv(csvText);
      if (parsed) return parsed;
    } else if (typeof fetchJson === 'function') {
      const maybeCsvOrObj = await fetchJson('https://www.taifex.com.tw/cht/3/futContractsDateDown', timeoutMs);
      if (typeof maybeCsvOrObj === 'string') {
        const parsed = parseTaifexInstitutionalFuturesCsv(maybeCsvOrObj);
        if (parsed) return parsed;
      } else if (maybeCsvOrObj && typeof maybeCsvOrObj.foreignNetOi === 'number') {
        return maybeCsvOrObj;
      }
    } else {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(() => {
        if (controller) controller.abort();
      }, timeoutMs);
      try {
        const res = await fetch('https://www.taifex.com.tw/cht/3/futContractsDateDown', {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: controller ? controller.signal : undefined,
        });
        if (res.ok) {
          const csvText = await res.text();
          const parsed = parseTaifexInstitutionalFuturesCsv(csvText);
          if (parsed) return parsed;
        }
      } finally {
        clearTimeout(timer);
      }
    }
  } catch {
    // 降級至 FinMind 或回傳 null
  }

  if (finmindApiKey) {
    const startDate = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
    const fmUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanFuturesInstitutionalInvestors&data_id=TX&start_date=${startDate}&token=${encodeURIComponent(
      finmindApiKey
    )}`;
    const fmJson = await executeJsonRequest(fmUrl, fetchJson, timeoutMs);
    if (Array.isArray(fmJson?.data) && fmJson.data.length > 0) {
      let foreignNetOi = 0;
      let trustNetOi = 0;
      let found = false;
      for (const row of fmJson.data) {
        const name = String(row.institutional_investors || '');
        const net = Number(row.long_open_interest_balance_volume || 0) - Number(row.short_open_interest_balance_volume || 0);
        if (name.includes('外資')) {
          foreignNetOi = net;
          found = true;
        } else if (name.includes('投信')) {
          trustNetOi = net;
          found = true;
        }
      }
      if (found) return { foreignNetOi, trustNetOi };
    }
  }

  return null;
}

/**
 * 抓取大盤整體融資維持率 (%)
 */
async function fetchTwTotalMarginMaintenance(options = {}) {
  const { fetchJson, finmindApiKey = process.env.FINMIND_API_KEY, timeoutMs = 8000 } = options;
  try {
    const twseUrl = 'https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN?response=json';
    const data = await executeJsonRequest(twseUrl, fetchJson, timeoutMs);
    if (data && typeof data.maintenanceRatio === 'number') {
      return Number(data.maintenanceRatio.toFixed(1));
    }
  } catch {
    // ignore
  }

  if (finmindApiKey) {
    const startDate = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
    const fmUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockMarginPurchaseShortSaleTotal&start_date=${startDate}&token=${encodeURIComponent(
      finmindApiKey
    )}`;
    const fmJson = await executeJsonRequest(fmUrl, fetchJson, timeoutMs);
    if (Array.isArray(fmJson?.data) && fmJson.data.length > 0) {
      const latest = fmJson.data[fmJson.data.length - 1];
      if (typeof latest?.maintenance_ratio === 'number') {
        return Number(latest.maintenance_ratio.toFixed(1));
      }
    }
  }

  return null;
}

/**
 * 平行抓取 Macro War Room 3.0 全維度跨市場即時脈搏 (Spec 0209 Tickets 02, 03, 04, 05)
 */
async function fetchFullMacroWarRoomPulse(options = {}) {
  const {
    fredApiKey = process.env.FRED_API_KEY,
    finmindApiKey = process.env.FINMIND_API_KEY,
    tiingoApiKey = process.env.TIINGO_API_KEY,
    alphaVantageApiKey = process.env.ALPHAVANTAGE_API_KEY,
    fetchJson,
    fetchText,
    timeoutMs = 8000,
    date = new Date().toISOString().slice(0, 10),
  } = options;

  const yahooSymbols = [
    '^SOX',
    'TSM',
    '2330.TW',
    '^TWII',
    '^GSPC',
    '^IXIC',
    'GC=F',
    'CL=F',
    'DX-Y.NYB',
    'TWD=X',
    '^VIX',
    '^TNX',
    '^IRX',
  ];

  const yahooPromises = yahooSymbols.map((sym) =>
    fetchYahooQuoteAndMa(sym, fetchJson, timeoutMs).catch(() => null)
  );

  const fredSeriesIds = ['DGS10', 'DGS2', 'DGS3MO', 'T10Y2Y', 'FEDFUNDS', 'CPIAUCSL', 'BAMLH0A0HYM2'];
  const fredPromises = fredSeriesIds.map((sid) =>
    fredApiKey
      ? fetchFredSeriesLatest(sid, fredApiKey, fetchJson, timeoutMs).catch(() => null)
      : Promise.resolve(null)
  );

  const [
    yahooResults,
    fredResults,
    cnnFearGreedScore,
    futuresOi,
    twMarginMaintenance,
  ] = await Promise.all([
    Promise.all(yahooPromises),
    Promise.all(fredPromises),
    fetchCnnFearGreed({ fetchJson, timeoutMs }).catch(() => null),
    fetchTaifexInstitutionalOi({ fetchText, fetchJson, finmindApiKey, timeoutMs }).catch(() => null),
    fetchTwTotalMarginMaintenance({ fetchJson, finmindApiKey, timeoutMs }).catch(() => null),
  ]);

  const quotes = {};
  yahooSymbols.forEach((sym, idx) => {
    quotes[sym] = yahooResults[idx] || null;
  });

  const [dgs10, dgs2, dgs3mo, t10y2y, fedFunds, cpiYoY, creditSpreadOas] = fredResults;

  const sox = quotes['^SOX'];
  const tsmAdr = quotes['TSM'];
  const tsmTw = quotes['2330.TW'];
  const taiex = quotes['^TWII'];
  const sp500 = quotes['^GSPC'];
  const nasdaq = quotes['^IXIC'];
  const gold = quotes['GC=F'];
  const oilWti = quotes['CL=F'];
  const dxy = quotes['DX-Y.NYB'];
  const usdTwd = quotes['TWD=X'];
  const vix = quotes['^VIX'];
  const tnx = quotes['^TNX'];
  const irx = quotes['^IRX'];

  const tsmAdrPrice = tsmAdr?.price ?? null;
  const tsmTwPrice = tsmTw?.price ?? null;
  const usdToTwd = usdTwd?.price ?? null;

  let tsmAdrConvertedTwd = null;
  let tsmAdrPremiumPercent = null;
  if (tsmAdrPrice !== null && usdToTwd !== null && tsmAdrPrice > 0 && usdToTwd > 0) {
    const rawConverted = (tsmAdrPrice * usdToTwd) / 5;
    tsmAdrConvertedTwd = Number(rawConverted.toFixed(2));
    if (tsmTwPrice !== null && tsmTwPrice > 0) {
      tsmAdrPremiumPercent = Number((((rawConverted - tsmTwPrice) / tsmTwPrice) * 100).toFixed(2));
    }
  }

  const treasuryYield10y = dgs10 ?? normalizeYahooYield(tnx?.price) ?? null;
  const treasuryYield2y = dgs2 ?? null;
  const riskFreeRate3m = dgs3mo ?? normalizeYahooYield(irx?.price) ?? null;
  const yieldSpread10y2y = t10y2y ?? computeYieldSpread(treasuryYield10y, treasuryYield2y) ?? null;

  return {
    date,
    asOfTimestamp: new Date().toISOString(),
    quotes,
    soxQuote: sox,
    tsmAdrQuote: tsmAdr,
    tsmTwQuote: tsmTw,
    taiexQuote: taiex,
    sp500Quote: sp500,
    nasdaqQuote: nasdaq,
    goldQuote: gold,
    oilWtiQuote: oilWti,
    dxyQuote: dxy,
    usdTwdQuote: usdTwd,
    vixQuote: vix,
    dxy: dxy?.price ?? null,
    vix: vix?.price ?? null,
    goldPrice: gold?.price ?? null,
    oilPrice: oilWti?.price ?? null,
    // 半導體與台美連動領先指標
    soxClose: sox?.price ?? null,
    soxChangePercent: sox?.changePercent ?? null,
    soxMa20: sox?.ma20 ?? null,
    soxMa60: sox?.ma60 ?? null,
    soxBias20Ma: sox?.bias20Ma ?? null,
    soxAbove20Ma: sox?.above20Ma ?? null,
    soxAbove60Ma: sox?.above60Ma ?? null,
    tsmAdrPrice,
    tsmAdrChangePercent: tsmAdr?.changePercent ?? null,
    tsmTwPrice,
    tsmTwChangePercent: tsmTw?.changePercent ?? null,
    usdToTwd,
    usdTwdRate: usdToTwd,
    usdTwdChangePercent: usdTwd?.changePercent ?? null,
    tsmAdrConvertedTwd,
    tsmAdrPremiumPercent,
    // 大盤指數與均線位階
    taiexClose: taiex?.price ?? null,
    taiexChangePercent: taiex?.changePercent ?? null,
    taiexMa20: taiex?.ma20 ?? null,
    taiexMa60: taiex?.ma60 ?? null,
    taiexBias20Ma: taiex?.bias20Ma ?? null,
    taiexAbove20Ma: taiex?.above20Ma ?? null,
    taiexAbove60Ma: taiex?.above60Ma ?? null,
    sp500Close: sp500?.price ?? null,
    sp500ChangePercent: sp500?.changePercent ?? null,
    sp500Ma20: sp500?.ma20 ?? null,
    sp500Ma60: sp500?.ma60 ?? null,
    sp500Bias20Ma: sp500?.bias20Ma ?? null,
    sp500Above20Ma: sp500?.above20Ma ?? null,
    sp500Above60Ma: sp500?.above60Ma ?? null,
    nasdaqClose: nasdaq?.price ?? null,
    nasdaqChangePercent: nasdaq?.changePercent ?? null,
    nasdaqMa20: nasdaq?.ma20 ?? null,
    nasdaqMa60: nasdaq?.ma60 ?? null,
    nasdaqBias20Ma: nasdaq?.bias20Ma ?? null,
    nasdaqAbove20Ma: nasdaq?.above20Ma ?? null,
    nasdaqAbove60Ma: nasdaq?.above60Ma ?? null,
    // 匯率與大宗商品
    dxyIndex: dxy?.price ?? null,
    dxyClose: dxy?.price ?? null,
    dxyChangePercent: dxy?.changePercent ?? null,
    goldPrice: gold?.price ?? null,
    goldChangePercent: gold?.changePercent ?? null,
    oilWtiPrice: oilWti?.price ?? null,
    wtiCrudePrice: oilWti?.price ?? null,
    oilWtiChangePercent: oilWti?.changePercent ?? null,
    // 總經利率、通膨與信用利差
    treasuryYield10y,
    treasuryYield2y,
    riskFreeRate3m,
    yieldSpread10y2y,
    fedFundsRate: fedFunds ?? null,
    cpiYoY: cpiYoY ?? null,
    usCpiYoY: cpiYoY ?? null,
    creditSpreadOas: creditSpreadOas ?? null,
    highYieldSpread: creditSpreadOas ?? null,
    // 市場情緒與台股籌碼
    vixClose: vix?.price ?? null,
    vixChangePercent: vix?.changePercent ?? null,
    cnnFearGreedScore: cnnFearGreedScore ?? null,
    twFuturesNetOi: futuresOi?.foreignNetOi ?? null,
    twForeignFuturesOi: futuresOi?.foreignNetOi ?? null,
    twTrustFuturesOi: futuresOi?.trustNetOi ?? null,
    twMarginMaintenance: twMarginMaintenance ?? null,
  };
}

/**
 * 抓取每日宏觀情緒指標摘要 (供 sync-us-market 與 bootstrap-lakehouse-full 呼叫，徹底消滅硬編碼常數)
 */
async function fetchMacroSentimentDaily(options = {}) {
  const pulse = await fetchFullMacroWarRoomPulse(options);
  return {
    date: pulse.date || new Date().toISOString().slice(0, 10),
    riskFreeRate3m: pulse.riskFreeRate3m,
    treasuryYield10y: pulse.treasuryYield10y,
    yieldSpread10y2y: pulse.yieldSpread10y2y,
    cnnFearGreedScore: pulse.cnnFearGreedScore,
    vixClose: pulse.vixClose,
    twPutCallRatio: options.twPutCallRatio ?? null,
    twForeignFuturesOi: pulse.twForeignFuturesOi,
    twTrustFuturesOi: pulse.twTrustFuturesOi,
    twMarginMaintenance: pulse.twMarginMaintenance,
    pulse,
  };
}

/**
 * 批次寫入 Lakehouse SQLite macro_sentiment_daily 表 (Spec 0183 擴充期貨 OI)
 */
function ingestMacroSentimentToDb(data, customDbPath) {
  if (!data || !data.date) return false;
  const db = initSqliteLakehouseDb(customDbPath);

  const stmt = db.prepare(`
    INSERT INTO macro_sentiment_daily (
      date, risk_free_rate_3m, treasury_yield_10y, yield_spread_10y_2y,
      cnn_fear_greed_score, vix_close, tw_put_call_ratio, tw_foreign_futures_oi, tw_trust_futures_oi, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      risk_free_rate_3m = COALESCE(excluded.risk_free_rate_3m, macro_sentiment_daily.risk_free_rate_3m),
      treasury_yield_10y = COALESCE(excluded.treasury_yield_10y, macro_sentiment_daily.treasury_yield_10y),
      yield_spread_10y_2y = COALESCE(excluded.yield_spread_10y_2y, macro_sentiment_daily.yield_spread_10y_2y),
      cnn_fear_greed_score = COALESCE(excluded.cnn_fear_greed_score, macro_sentiment_daily.cnn_fear_greed_score),
      vix_close = COALESCE(excluded.vix_close, macro_sentiment_daily.vix_close),
      tw_put_call_ratio = COALESCE(excluded.tw_put_call_ratio, macro_sentiment_daily.tw_put_call_ratio),
      tw_foreign_futures_oi = COALESCE(excluded.tw_foreign_futures_oi, macro_sentiment_daily.tw_foreign_futures_oi),
      tw_trust_futures_oi = COALESCE(excluded.tw_trust_futures_oi, macro_sentiment_daily.tw_trust_futures_oi),
      updated_at = excluded.updated_at
  `);

  stmt.run(
    data.date,
    data.riskFreeRate3m ?? null,
    data.treasuryYield10y ?? null,
    data.yieldSpread10y2y ?? null,
    data.cnnFearGreedScore ?? null,
    data.vixClose ?? null,
    data.twPutCallRatio ?? null,
    data.twForeignFuturesOi ?? null,
    data.twTrustFuturesOi ?? null,
    Date.now()
  );

  return true;
}

/**
 * 解析台灣期貨交易所 (TAIFEX) 三大法人台指期未平倉 CSV (Spec 0183)
 */
function parseTaifexInstitutionalFuturesCsv(csvText) {
  if (!csvText || typeof csvText !== 'string') return null;

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return null;

  let foreignNetOi = 0;
  let trustNetOi = 0;
  let found = false;

  for (const line of lines) {
    // 依逗號切分並去除引號
    const parts = line.split(',').map((p) => p.replace(/["']/g, '').trim());
    if (parts.length < 14) continue;

    const commodity = parts[1]; // 商品名稱
    const identity = parts[2]; // 身份別
    const netOiStr = parts[13]; // 未平倉餘額淨額口數

    if (commodity === '臺股期貨') {
      const netOi = parseInt(netOiStr, 10);
      if (!isNaN(netOi)) {
        if (identity.includes('外資')) {
          foreignNetOi = netOi;
          found = true;
        } else if (identity.includes('投信')) {
          trustNetOi = netOi;
          found = true;
        }
      }
    }
  }

  return found ? { foreignNetOi, trustNetOi } : null;
}

/**
 * 解析證交所/投信公會 ETF 官方收盤淨值與折溢價 (Spec 0183 & Spec 0203)
 * 支援證交所官方真實 all_etf.txt 之 { a1: [{ msgArray: [...] }] } 結構與扁平陣列
 * 欄位精準映射：a=代碼, e=市價, f=官方淨值 (NAV), g=折溢價率 (%)
 */
function parseTwseEtfNavResponse(rawData, dateStr) {
  if (!rawData) return [];

  let items = [];
  if (Array.isArray(rawData)) {
    items = rawData;
  } else if (rawData.a1 && Array.isArray(rawData.a1) && rawData.a1[0] && Array.isArray(rawData.a1[0].msgArray)) {
    items = rawData.a1[0].msgArray;
  } else if (Array.isArray(rawData.msgArray)) {
    items = rawData.msgArray;
  }

  const results = [];
  for (const item of items) {
    const symbol = String(item.a || item.symbol || '').trim();
    if (!symbol) continue;

    // 官方 all_etf.txt: e=市價, f=淨值, g=折溢價率; 舊相容: c=市價, d=淨值, e=折溢價
    let closePrice = 0;
    let nav = 0;
    let premiumDiscountRatio = 0;

    if (item.f !== undefined || item.g !== undefined) {
      closePrice = parseFloat(String(item.e || '0').replace(/,/g, ''));
      nav = parseFloat(String(item.f || '0').replace(/,/g, ''));
      const ratioStr = String(item.g || '0').replace(/,/g, '').replace('%', '').trim();
      premiumDiscountRatio = parseFloat(ratioStr);
    } else {
      closePrice = parseFloat(String(item.c || item.close || '0').replace(/,/g, ''));
      nav = parseFloat(String(item.d || item.nav || '0').replace(/,/g, ''));
      const ratioStr = String(item.e || item.ratio || '0').replace(/,/g, '').replace('%', '').trim();
      premiumDiscountRatio = parseFloat(ratioStr);
    }

    if (!isNaN(closePrice) && closePrice > 0 && !isNaN(nav) && nav > 0) {
      results.push({
        symbol,
        date: dateStr,
        closePrice,
        nav,
        premiumDiscountRatio: isNaN(premiumDiscountRatio) ? 0 : premiumDiscountRatio,
      });
    }
  }
  return results;
}

/**
 * 批次寫入 etf_daily_nav 表 (Spec 0183)
 */
function ingestEtfDailyNavToDb(records, customDbPath) {
  if (!Array.isArray(records) || records.length === 0) return false;
  const db = initSqliteLakehouseDb(customDbPath);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO etf_daily_nav (
      symbol, date, close_price, nav, premium_discount_ratio, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  db.exec('BEGIN TRANSACTION;');
  try {
    for (const r of records) {
      stmt.run(r.symbol, r.date, r.closePrice, r.nav, r.premiumDiscountRatio, now);
    }
    db.exec('COMMIT;');
    return true;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * 聯網抓取並入庫全市場 ETF 淨值與折溢價 (Spec 0203 Ticket 05)
 */
async function fetchAndIngestEtfDailyNav(customDbPath, targetDateStr = new Date().toISOString().split('T')[0], fetcher = fetch) {
  try {
    const url = 'https://mis.twse.com.tw/stock/data/all_etf.txt';
    const res = await fetcher(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json, text/plain, */*',
      },
    });
    if (!res.ok) {
      return { success: false, count: 0, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const records = parseTwseEtfNavResponse(data, targetDateStr);
    if (records.length > 0) {
      ingestEtfDailyNavToDb(records, customDbPath);
      return { success: true, count: records.length };
    }
    return { success: false, count: 0, error: 'NO_VALID_RECORDS' };
  } catch (err) {
    return { success: false, count: 0, error: err.message };
  }
}

module.exports = {
  parseFredObservations,
  computeYieldSpread,
  parseCnnFearGreedResponse,
  fetchYahooQuoteAndMa,
  fetchFredSeriesLatest,
  fetchTreasuryYield10y,
  fetchVixClose,
  fetchCnnFearGreed,
  fetchTaifexInstitutionalOi,
  fetchTwTotalMarginMaintenance,
  fetchFullMacroWarRoomPulse,
  fetchMacroSentimentDaily,
  ingestMacroSentimentToDb,
  parseTaifexInstitutionalFuturesCsv,
  parseTwseEtfNavResponse,
  ingestEtfDailyNavToDb,
  fetchAndIngestEtfDailyNav,
};
