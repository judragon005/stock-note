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
 * 內部安全文字/CSV 請求輔助器：相容自訂 fetchJson (回傳字串或 Response) 與原生 fetch
 */
async function executeTextRequest(url, customFetch, timeoutMs = 8000) {
  try {
    if (typeof customFetch === 'function') {
      const result = await customFetch(url, timeoutMs);
      if (!result) return null;
      if (typeof result === 'string') return result;
      if (typeof result.text === 'function') {
        if (result.ok === false) return null;
        return await result.text();
      }
      return String(result);
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => {
      if (controller) controller.abort();
    }, timeoutMs);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/csv, text/plain, */*',
        },
        signal: controller ? controller.signal : undefined,
      });
      if (!res.ok) return null;
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

/**
 * 抓取 FRED 官方免 Key 公開 CSV 序列並解析最新有效數值 (Spec 0222 Ticket 01)
 * 支援 CPIAUCSL 與製造業/工業序列 (AMTMNO, AMTMTI, INDPRO) 12 個月 YoY 年增率 (%) 計算
 */
async function fetchFredCsvObservations(seriesId, fetchJson, timeoutMs = 8000, options = {}) {
  if (!seriesId || typeof seriesId !== 'string') return null;
  const trimmedId = seriesId.trim();
  if (!trimmedId) return null;

  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(trimmedId)}`;
  const csvText = await executeTextRequest(url, fetchJson, timeoutMs);
  if (!csvText || typeof csvText !== 'string') return null;

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return null;

  // 跳過標頭行 (DATE,VALUE 等)
  const validObs = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) continue;
    const dateStr = line.slice(0, commaIdx).trim();
    const valStr = line.slice(commaIdx + 1).replace(/["']/g, '').trim();
    if (valStr !== '.' && valStr !== '') {
      const num = parseFloat(valStr);
      if (Number.isFinite(num)) {
        validObs.push({ date: dateStr, num });
      }
    }
  }

  if (validObs.length === 0) return null;

  // 依日期升序排列 (最舊 -> 最新)
  validObs.sort((a, b) => a.date.localeCompare(b.date));

  const yoySeries = ['CPIAUCSL', 'AMTMNO', 'AMTMTI', 'INDPRO'];
  const isYoy = options.calcYoY !== undefined ? !!options.calcYoY : yoySeries.includes(trimmedId);

  if (isYoy) {
    if (validObs.length === 1) return validObs[0].num;
    const latest = validObs[validObs.length - 1].num;
    const idx12Ago = Math.max(0, validObs.length - 13);
    const obs12Ago = validObs[idx12Ago].num;
    if (!obs12Ago || obs12Ago === 0) return null;
    return Number((((latest - obs12Ago) / obs12Ago) * 100).toFixed(2));
  }

  return validObs[validObs.length - 1].num;
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
 * 查詢 FRED 指定總經序列最新有效值；針對 CPIAUCSL 與製造業/工業序列 (AMTMNO, AMTMTI, INDPRO)
 * 自動取近 13 期計算 12 個月 YoY 年增率 (%) (Spec 0209 Ticket 04 & Spec 0222 Ticket 01)
 * 當無 API Key 或 API 請求失敗時，自動無縫 Fallback 至 FRED 官方公開 CSV 端點！
 */
async function fetchFredSeriesLatest(seriesId, apiKey, fetchJson, timeoutMs = 8000) {
  if (!seriesId || typeof seriesId !== 'string') {
    return null;
  }
  const trimmedId = seriesId.trim();
  if (!trimmedId) return null;

  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    return fetchFredCsvObservations(trimmedId, fetchJson, timeoutMs);
  }

  const yoySeries = ['CPIAUCSL', 'AMTMNO', 'AMTMTI', 'INDPRO'];
  const isYoy = yoySeries.includes(trimmedId);
  const limit = isYoy ? 20 : 10;
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(
    trimmedId
  )}&api_key=${encodeURIComponent(apiKey.trim())}&file_type=json&sort_order=desc&limit=${limit}`;

  const rawData = await executeJsonRequest(url, fetchJson, timeoutMs);
  if (!rawData || !Array.isArray(rawData.observations) || rawData.observations.length === 0) {
    // API 失敗或限流時，無縫 fallback 至免 Key 官方 CSV
    return fetchFredCsvObservations(trimmedId, fetchJson, timeoutMs);
  }

  if (isYoy) {
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
 * 抓取美債 10 年期殖利率 (FRED DGS10 優先，包含免 Key CSV fallback，失敗降級至 Yahoo ^TNX)
 */
async function fetchTreasuryYield10y(options = {}) {
  const { fredApiKey = process.env.FRED_API_KEY, fetchJson, timeoutMs = 8000 } = options;
  const dgs10 = await fetchFredSeriesLatest('DGS10', fredApiKey, fetchJson, timeoutMs);
  if (dgs10 !== null) return dgs10;
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
 * 解碼台灣期貨交易所 (TAIFEX) 原始位元組為繁體中文文字 (Spec 0239 T04)
 * 若 UTF-8 解碼含亂碼 (\uFFFD) 或未命中指定中文關鍵字，自動切換 Big5 解碼
 */
function decodeTaifexText(input, keywords = ['期貨', '外資', '賣權', '買權', '比率', '日期']) {
  if (input === null || input === undefined) return '';
  if (typeof input === 'string') return input;

  let bytes = null;
  if (input instanceof Uint8Array) {
    bytes = input;
  } else if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else if (ArrayBuffer.isView(input)) {
    bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  } else {
    return String(input);
  }

  if (bytes.byteLength === 0) return '';

  const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const hasReplacement = utf8Text.includes('\uFFFD');
  const kwList = Array.isArray(keywords) && keywords.length > 0 ? keywords : ['期貨', '外資'];
  const utf8HasKeyword = kwList.some((kw) => utf8Text.includes(kw));

  if (!hasReplacement && utf8HasKeyword) {
    return utf8Text;
  }

  try {
    const big5Text = new TextDecoder('big5').decode(bytes);
    const big5HasKeyword = kwList.some((kw) => big5Text.includes(kw));
    if (big5HasKeyword || (hasReplacement && !big5Text.includes('\uFFFD'))) {
      return big5Text;
    }
  } catch {
    // 若運行環境不支援 Big5 解碼器，退回 UTF-8 結果
  }

  return utf8Text;
}

/**
 * 簡易 CSV 列切分器：正確處理雙引號內含千分位逗號 (如 "-97,896")
 */
function splitCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * 安全解析含千分位逗號或百分比符號之數值字串
 */
function parseNumericCell(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).replace(/["',%\s]/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '--') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * 抓取 TAIFEX CSV 並透過 arrayBuffer + decodeTaifexText 正確解碼 Big5/UTF-8
 */
async function fetchTaifexCsvText(url, options = {}, keywords = ['期貨', '外資']) {
  const { fetchBuffer, fetchText, fetchJson, timeoutMs = 8000 } = options;

  const resolvePayloadToText = async (payload) => {
    if (!payload) return null;
    if (typeof payload === 'string') return payload;
    if (payload instanceof ArrayBuffer || ArrayBuffer.isView(payload)) {
      return decodeTaifexText(payload, keywords);
    }
    if (typeof payload.arrayBuffer === 'function') {
      if (payload.ok === false) return null;
      const buf = await payload.arrayBuffer();
      return decodeTaifexText(buf, keywords);
    }
    if (typeof payload.text === 'function') {
      if (payload.ok === false) return null;
      return await payload.text();
    }
    return null;
  };

  if (typeof fetchBuffer === 'function') {
    const raw = await fetchBuffer(url, timeoutMs);
    return resolvePayloadToText(raw);
  }
  if (typeof fetchText === 'function') {
    const raw = await fetchText(url, timeoutMs);
    return resolvePayloadToText(raw);
  }
  if (typeof fetchJson === 'function') {
    const raw = await fetchJson(url, timeoutMs);
    const asText = await resolvePayloadToText(raw);
    if (asText !== null) return asText;
    return { rawObject: raw };
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => {
    if (controller) controller.abort();
  }, timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller ? controller.signal : undefined,
    });
    if (!res || !res.ok) return null;
    if (typeof res.arrayBuffer === 'function') {
      const buf = await res.arrayBuffer();
      return decodeTaifexText(buf, keywords);
    }
    if (typeof res.text === 'function') {
      return await res.text();
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 抓取台指期三大法人未平倉淨額口數 (TAIFEX Big5 CSV 優先，FinMind 備援) (Spec 0239 T04)
 */
async function fetchTaifexInstitutionalOi(options = {}) {
  const { fetchJson, finmindApiKey = process.env.FINMIND_API_KEY, timeoutMs = 8000 } = options;
  try {
    const result = await fetchTaifexCsvText(
      'https://www.taifex.com.tw/cht/3/futContractsDateDown',
      options,
      ['期貨', '外資']
    );
    if (typeof result === 'string') {
      const parsed = parseTaifexInstitutionalFuturesCsv(result);
      if (parsed) return parsed;
    } else if (result && result.rawObject && typeof result.rawObject.foreignNetOi === 'number') {
      return result.rawObject;
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
 * 解析台灣期貨交易所 (TAIFEX) 選擇權賣權/買權未平倉比率 CSV (pcRatioDown) (Spec 0239 T04)
 * 不論 CSV 依日期升序或降序，皆精確擷取最新一日買賣權未平倉量比率 (%)
 */
function parseTaifexPutCallRatioCsv(csvText) {
  if (!csvText || typeof csvText !== 'string') return null;

  const lines = csvText
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const headerParts = splitCsvLine(lines[0]);
  let dateIdx = headerParts.findIndex((h) => h.includes('日期'));
  if (dateIdx < 0) dateIdx = 0;

  let oiRatioIdx = headerParts.findIndex((h) => h.includes('未平倉') && h.includes('比率'));
  if (oiRatioIdx < 0) oiRatioIdx = 6;

  let putOiIdx = headerParts.findIndex((h) => h.includes('賣權') && h.includes('未平倉') && !h.includes('比率'));
  if (putOiIdx < 0) putOiIdx = 4;

  let callOiIdx = headerParts.findIndex((h) => h.includes('買權') && h.includes('未平倉') && !h.includes('比率'));
  if (callOiIdx < 0) callOiIdx = 5;

  let latestDateKey = '';
  let latestRatio = null;

  for (let i = 1; i < lines.length; i++) {
    const parts = splitCsvLine(lines[i]);
    if (parts.length <= Math.max(dateIdx, 1)) continue;

    const rawDate = (parts[dateIdx] || '').replace(/["']/g, '').trim();
    const dateMatch = rawDate.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (!dateMatch) continue;
    const normalizedDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;

    let ratio = parts.length > oiRatioIdx ? parseNumericCell(parts[oiRatioIdx]) : null;
    if (ratio === null && parts.length > Math.max(putOiIdx, callOiIdx)) {
      const putOi = parseNumericCell(parts[putOiIdx]);
      const callOi = parseNumericCell(parts[callOiIdx]);
      if (putOi !== null && callOi !== null && callOi > 0) {
        ratio = (putOi / callOi) * 100;
      }
    }

    if (ratio !== null && Number.isFinite(ratio) && ratio > 0) {
      if (!latestDateKey || normalizedDate >= latestDateKey) {
        latestDateKey = normalizedDate;
        latestRatio = Number(ratio.toFixed(2));
      }
    }
  }

  return latestRatio;
}

/**
 * 抓取台灣期貨交易所 (TAIFEX) 最新一日台指選擇權 Put/Call Ratio (%) (Spec 0239 T04)
 */
async function fetchTaifexPutCallRatio(options = {}) {
  try {
    const result = await fetchTaifexCsvText(
      'https://www.taifex.com.tw/cht/3/pcRatioDown',
      options,
      ['賣權', '買權', '比率', '日期']
    );
    if (typeof result === 'string') {
      return parseTaifexPutCallRatioCsv(result);
    }
    if (result && result.rawObject && typeof result.rawObject.putCallRatio === 'number' && Number.isFinite(result.rawObject.putCallRatio)) {
      return Number(result.rawObject.putCallRatio.toFixed(2));
    }
  } catch {
    // 網路或格式異常時誠實回傳 null
  }
  return null;
}

/**
 * 自 SQLite daily_candles 讀取所有標的最新收盤價對照表 (供全市場擔保品總市值估算)
 */
function loadLatestClosePriceMapFromDb(db) {
  if (!db || typeof db.prepare !== 'function') return null;
  try {
    const rows = db
      .prepare(`
        SELECT c.symbol, c.close
        FROM daily_candles c
        INNER JOIN (
          SELECT symbol, MAX(date) AS max_date
          FROM daily_candles
          GROUP BY symbol
        ) latest
          ON c.symbol = latest.symbol AND c.date = latest.max_date
        WHERE c.close > 0
      `)
      .all();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const map = new Map();
    for (const r of rows) {
      if (r && r.symbol && typeof r.close === 'number' && Number.isFinite(r.close) && r.close > 0) {
        map.set(String(r.symbol).trim(), r.close);
      }
    }
    return map.size > 0 ? map : null;
  } catch {
    return null;
  }
}

/**
 * 自 TWSE MI_MARGN 官方回應 + 本機 SQLite 收盤價或大盤指數推導全市場信用融資維持率 (%) (Spec 0239 T04)
 * 嚴格遵守 Zero-Mock：查無真實融資統計時誠實回傳 null，絕不寫死假常數
 */
function deriveTwMarginMaintenanceRatio(data, context = {}) {
  if (!data || typeof data !== 'object') return null;

  // Tier 1：來源直接提供有效數值
  if (typeof data.maintenanceRatio === 'number' && Number.isFinite(data.maintenanceRatio) && data.maintenanceRatio > 0) {
    return Number(data.maintenanceRatio.toFixed(1));
  }

  // TWSE 官方回傳無資料訊號時立即返回 null
  if (data.stat && !String(data.stat).toUpperCase().includes('OK')) {
    return null;
  }

  const tables = Array.isArray(data.tables) ? data.tables : [];
  const summaryRows =
    (tables[0] && Array.isArray(tables[0].data) ? tables[0].data : null) ||
    (Array.isArray(data.creditList) ? data.creditList : null);
  if (!summaryRows || summaryRows.length === 0) return null;

  let totalMarginAmountK = null; // 融資金額(仟元) 今日餘額
  let totalMarginLots = null; // 融資(交易單位) 今日餘額 (張)

  for (const row of summaryRows) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const label = String(row[0] || '').trim();
    const todayVal = parseNumericCell(row[row.length - 1]);
    if (todayVal === null || todayVal <= 0) continue;

    if (label.includes('融資金額')) {
      totalMarginAmountK = todayVal;
    } else if (label.includes('融資') && !label.includes('金額')) {
      totalMarginLots = todayVal;
    }
  }

  if (!totalMarginAmountK || totalMarginAmountK <= 0) return null;
  const totalMarginAmountNtd = totalMarginAmountK * 1000;

  // 準備收盤價對照表 (外部傳入優先，其次自本機 SQLite 讀取)
  let priceMap = null;
  if (context.closePriceMap instanceof Map && context.closePriceMap.size > 0) {
    priceMap = context.closePriceMap;
  } else if (context.closePriceMap && typeof context.closePriceMap === 'object') {
    priceMap = new Map(Object.entries(context.closePriceMap));
  } else if (context.db) {
    priceMap = loadLatestClosePriceMapFromDb(context.db);
  }

  // Tier 2A：TWSE MI_MARGN tables[1] 各股融資餘額 × 本機真實收盤價 -> 真實擔保品總市值 / 融資總金額
  const detailTable = tables[1];
  if (priceMap && priceMap.size > 0 && detailTable && Array.isArray(detailTable.data) && detailTable.data.length > 0) {
    const fields = Array.isArray(detailTable.fields) ? detailTable.fields : [];
    let todayMarginIdx = fields.findIndex((f) => String(f || '').includes('今日餘額'));
    if (todayMarginIdx < 0) todayMarginIdx = 6;

    let matchedCollateralNtd = 0;
    let matchedLots = 0;

    for (const row of detailTable.data) {
      if (!Array.isArray(row) || row.length <= todayMarginIdx) continue;
      const symbol = String(row[0] || '').trim();
      const lots = parseNumericCell(row[todayMarginIdx]);
      const close = priceMap.get(symbol);
      if (lots !== null && lots > 0 && typeof close === 'number' && Number.isFinite(close) && close > 0) {
        matchedCollateralNtd += lots * 1000 * close;
        matchedLots += lots;
      }
    }

    if (matchedCollateralNtd > 0 && matchedLots > 0) {
      const coverage = totalMarginLots && totalMarginLots > 0 ? matchedLots / totalMarginLots : 1;
      if (coverage >= 0.5) {
        const estimatedCollateralNtd = coverage < 0.95 ? matchedCollateralNtd / coverage : matchedCollateralNtd;
        const ratio = (estimatedCollateralNtd / totalMarginAmountNtd) * 100;
        if (Number.isFinite(ratio) && ratio >= 80 && ratio <= 350) {
          return Number(ratio.toFixed(1));
        }
      }
    }
  }

  // Tier 2B：若無 MI_MARGN 明細表，嘗試以本機 SQLite tw_institutional_chips 最新融資餘額 × 收盤價計算
  if (priceMap && priceMap.size > 0 && context.db && typeof context.db.prepare === 'function') {
    try {
      const latestChipDateRow = context.db
        .prepare('SELECT MAX(date) AS max_date FROM tw_institutional_chips WHERE margin_balance > 0')
        .get();
      if (latestChipDateRow?.max_date) {
        const chipRows = context.db
          .prepare('SELECT symbol, margin_balance FROM tw_institutional_chips WHERE date = ? AND margin_balance > 0')
          .all(latestChipDateRow.max_date);
        let matchedCollateralNtd = 0;
        let matchedLots = 0;
        for (const r of chipRows) {
          const close = priceMap.get(String(r.symbol || '').trim());
          const lots = Number(r.margin_balance);
          if (Number.isFinite(lots) && lots > 0 && typeof close === 'number' && Number.isFinite(close) && close > 0) {
            matchedCollateralNtd += lots * 1000 * close;
            matchedLots += lots;
          }
        }
        if (matchedCollateralNtd > 0 && matchedLots > 0) {
          const coverage = totalMarginLots && totalMarginLots > 0 ? matchedLots / totalMarginLots : 1;
          if (coverage >= 0.5) {
            const estimatedCollateralNtd = coverage < 0.95 ? matchedCollateralNtd / coverage : matchedCollateralNtd;
            const ratio = (estimatedCollateralNtd / totalMarginAmountNtd) * 100;
            if (Number.isFinite(ratio) && ratio >= 80 && ratio <= 350) {
              return Number(ratio.toFixed(1));
            }
          }
        }
      }
    } catch {
      // 查表失敗時退至 Tier 3
    }
  }

  // Tier 3：MI_MARGN 確認有效信用統計 + 大盤現價與 60MA/20MA 建倉成本基準推導 (台灣法定 6 成融資基準 = 166.67%)
  const taiexQuote = context.taiexQuote;
  if (taiexQuote && typeof taiexQuote.price === 'number' && Number.isFinite(taiexQuote.price) && taiexQuote.price > 0) {
    const refMa =
      typeof taiexQuote.ma60 === 'number' && Number.isFinite(taiexQuote.ma60) && taiexQuote.ma60 > 0
        ? taiexQuote.ma60
        : typeof taiexQuote.ma20 === 'number' && Number.isFinite(taiexQuote.ma20) && taiexQuote.ma20 > 0
          ? taiexQuote.ma20
          : null;
    if (refMa) {
      const ratio = (100 / 0.6) * (taiexQuote.price / refMa);
      if (Number.isFinite(ratio) && ratio >= 80 && ratio <= 350) {
        return Number(ratio.toFixed(1));
      }
    }
  }

  return null;
}

/**
 * 抓取大盤整體融資維持率 (%) (Spec 0239 T04)
 */
async function fetchTwTotalMarginMaintenance(options = {}) {
  const {
    fetchJson,
    finmindApiKey = process.env.FINMIND_API_KEY,
    timeoutMs = 8000,
    db = null,
    closePriceMap = null,
    taiexQuote = null,
  } = options;
  try {
    const twseUrl = 'https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN?response=json';
    const data = await executeJsonRequest(twseUrl, fetchJson, timeoutMs);
    const derived = deriveTwMarginMaintenanceRatio(data, { db, closePriceMap, taiexQuote });
    if (derived !== null) {
      return derived;
    }
  } catch {
    // 降級至 FinMind 或回傳 null
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
    fetchBuffer,
    db = null,
    closePriceMap = null,
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

  const fredSeriesIds = [
    'DGS10',
    'DGS2',
    'DGS3MO',
    'T10Y2Y',
    'FEDFUNDS',
    'CPIAUCSL',
    'BAMLH0A0HYM2',
    'BAMLC0A0CM',
    'BAMLH0A3HYC',
    'T10YIE',
    'ICSA',
    'AMTMNO',
    'AMTMTI',
    'INDPRO',
  ];
  const fredPromises = fredSeriesIds.map((sid) =>
    fetchFredSeriesLatest(sid, fredApiKey, fetchJson, timeoutMs).catch(() => null)
  );

  const miMargnUrl = 'https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN?response=json';
  const [
    yahooResults,
    fredResults,
    cnnFearGreedScore,
    futuresOi,
    twPutCallRatio,
    miMargnRaw,
  ] = await Promise.all([
    Promise.all(yahooPromises),
    Promise.all(fredPromises),
    fetchCnnFearGreed({ fetchJson, timeoutMs }).catch(() => null),
    fetchTaifexInstitutionalOi({ fetchBuffer, fetchText, fetchJson, finmindApiKey, timeoutMs }).catch(() => null),
    fetchTaifexPutCallRatio({ fetchBuffer, fetchText, fetchJson, timeoutMs }).catch(() => null),
    executeJsonRequest(miMargnUrl, fetchJson, timeoutMs).catch(() => null),
  ]);

  const quotes = {};
  yahooSymbols.forEach((sym, idx) => {
    quotes[sym] = yahooResults[idx] || null;
  });

  // 結合已取回之 ^TWII 與可選本機 SQLite 收盤價推導全市場融資維持率 (無額外 MI_MARGN RTT)
  let twMarginMaintenance = deriveTwMarginMaintenanceRatio(miMargnRaw, {
    db,
    closePriceMap,
    taiexQuote: quotes['^TWII'],
  });
  if (twMarginMaintenance === null && finmindApiKey) {
    twMarginMaintenance = await fetchTwTotalMarginMaintenance({
      fetchJson: async (url, tMs) => {
        if (url.includes('MI_MARGN')) return null;
        return executeJsonRequest(url, fetchJson, tMs);
      },
      finmindApiKey,
      timeoutMs,
      db,
      closePriceMap,
      taiexQuote: quotes['^TWII'],
    }).catch(() => null);
  }

  const [
    dgs10,
    dgs2,
    dgs3mo,
    t10y2y,
    fedFunds,
    cpiYoY,
    creditSpreadOas,
    igSpreadOas,
    cccSpreadOas,
    breakeven10y,
    initialClaims,
    mfgNewOrdersYoY,
    mfgInventoriesYoY,
    industrialProdYoY,
  ] = fredResults;

  let ordersMinusInvSpread = null;
  if (
    typeof mfgNewOrdersYoY === 'number' &&
    Number.isFinite(mfgNewOrdersYoY) &&
    typeof mfgInventoriesYoY === 'number' &&
    Number.isFinite(mfgInventoriesYoY)
  ) {
    ordersMinusInvSpread = Number((mfgNewOrdersYoY - mfgInventoriesYoY).toFixed(2));
  }

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
    // 總經利率、通膨與信用利差 (Spec 0221 擴充投等債、CCC級、平衡通膨率與初請失業金)
    treasuryYield10y,
    treasuryYield2y,
    riskFreeRate3m,
    yieldSpread10y2y,
    fedFundsRate: fedFunds ?? null,
    cpiYoY: cpiYoY ?? null,
    usCpiYoY: cpiYoY ?? null,
    creditSpreadOas: creditSpreadOas ?? null,
    highYieldSpread: creditSpreadOas ?? null,
    twMarginMaintenanceRatio: twMarginMaintenance ?? null,
    twMarginMaintenance: twMarginMaintenance ?? null,
    igSpreadOas: igSpreadOas ?? null,
    cccSpreadOas: cccSpreadOas ?? null,
    breakeven10y: breakeven10y ?? null,
    initialClaims: initialClaims ?? null,
    // 美國製造業與景氣動能 (Spec 0222 Ticket 01)
    usMfgNewOrdersYoY: mfgNewOrdersYoY ?? null,
    usMfgInventoriesYoY: mfgInventoriesYoY ?? null,
    usOrdersMinusInvSpread: ordersMinusInvSpread ?? null,
    usIndustrialProdYoY: industrialProdYoY ?? null,
    // 市場情緒與台股籌碼
    vixClose: vix?.price ?? null,
    vixChangePercent: vix?.changePercent ?? null,
    cnnFearGreedScore: cnnFearGreedScore ?? null,
    twPutCallRatio: twPutCallRatio ?? null,
    twFuturesNetOi: futuresOi?.foreignNetOi ?? null,
    twForeignFuturesOi: futuresOi?.foreignNetOi ?? null,
    twTrustFuturesOi: futuresOi?.trustNetOi ?? null,
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
    twPutCallRatio: options.twPutCallRatio ?? pulse.twPutCallRatio ?? null,
    twForeignFuturesOi: pulse.twForeignFuturesOi,
    twTrustFuturesOi: pulse.twTrustFuturesOi,
    twMarginMaintenance: pulse.twMarginMaintenance,
    twMarginMaintenanceRatio: pulse.twMarginMaintenanceRatio,
    treasuryYield2y: pulse.treasuryYield2y,
    fedFundsRate: pulse.fedFundsRate,
    usCpiYoY: pulse.usCpiYoY,
    creditSpreadOas: pulse.creditSpreadOas,
    igSpreadOas: pulse.igSpreadOas,
    cccSpreadOas: pulse.cccSpreadOas,
    breakeven10y: pulse.breakeven10y,
    initialClaims: pulse.initialClaims,
    usMfgNewOrdersYoY: pulse.usMfgNewOrdersYoY,
    usMfgInventoriesYoY: pulse.usMfgInventoriesYoY,
    usOrdersMinusInvSpread: pulse.usOrdersMinusInvSpread,
    usIndustrialProdYoY: pulse.usIndustrialProdYoY,
    pulse,
  };
}

/**
 * 批次寫入 Lakehouse SQLite macro_sentiment_daily 表 (Spec 0183 & Spec 0221 & Spec 0222 全維度總經與情緒持久化)
 */
function ingestMacroSentimentToDb(data, customDbPath) {
  if (!data || !data.date) return false;
  const db = initSqliteLakehouseDb(customDbPath);

  let hasMfgCols = false;
  try {
    const cols = db.prepare('PRAGMA table_info(macro_sentiment_daily)').all();
    hasMfgCols = cols.some((c) => c.name === 'us_mfg_new_orders_yoy');
  } catch {
    hasMfgCols = false;
  }

  if (hasMfgCols) {
    const stmt = db.prepare(`
      INSERT INTO macro_sentiment_daily (
        date, risk_free_rate_3m, treasury_yield_10y, yield_spread_10y_2y,
        cnn_fear_greed_score, vix_close, tw_put_call_ratio, tw_foreign_futures_oi, tw_trust_futures_oi,
        treasury_yield_2y, fed_funds_rate, us_cpi_yoy, credit_spread_oas, tw_margin_maintenance_ratio,
        ig_spread_oas, ccc_spread_oas, breakeven_10y, initial_claims,
        us_mfg_new_orders_yoy, us_mfg_inventories_yoy, us_orders_minus_inv_spread, us_industrial_prod_yoy,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        risk_free_rate_3m = COALESCE(excluded.risk_free_rate_3m, macro_sentiment_daily.risk_free_rate_3m),
        treasury_yield_10y = COALESCE(excluded.treasury_yield_10y, macro_sentiment_daily.treasury_yield_10y),
        yield_spread_10y_2y = COALESCE(excluded.yield_spread_10y_2y, macro_sentiment_daily.yield_spread_10y_2y),
        cnn_fear_greed_score = COALESCE(excluded.cnn_fear_greed_score, macro_sentiment_daily.cnn_fear_greed_score),
        vix_close = COALESCE(excluded.vix_close, macro_sentiment_daily.vix_close),
        tw_put_call_ratio = COALESCE(excluded.tw_put_call_ratio, macro_sentiment_daily.tw_put_call_ratio),
        tw_foreign_futures_oi = COALESCE(excluded.tw_foreign_futures_oi, macro_sentiment_daily.tw_foreign_futures_oi),
        tw_trust_futures_oi = COALESCE(excluded.tw_trust_futures_oi, macro_sentiment_daily.tw_trust_futures_oi),
        treasury_yield_2y = COALESCE(excluded.treasury_yield_2y, macro_sentiment_daily.treasury_yield_2y),
        fed_funds_rate = COALESCE(excluded.fed_funds_rate, macro_sentiment_daily.fed_funds_rate),
        us_cpi_yoy = COALESCE(excluded.us_cpi_yoy, macro_sentiment_daily.us_cpi_yoy),
        credit_spread_oas = COALESCE(excluded.credit_spread_oas, macro_sentiment_daily.credit_spread_oas),
        tw_margin_maintenance_ratio = COALESCE(excluded.tw_margin_maintenance_ratio, macro_sentiment_daily.tw_margin_maintenance_ratio),
        ig_spread_oas = COALESCE(excluded.ig_spread_oas, macro_sentiment_daily.ig_spread_oas),
        ccc_spread_oas = COALESCE(excluded.ccc_spread_oas, macro_sentiment_daily.ccc_spread_oas),
        breakeven_10y = COALESCE(excluded.breakeven_10y, macro_sentiment_daily.breakeven_10y),
        initial_claims = COALESCE(excluded.initial_claims, macro_sentiment_daily.initial_claims),
        us_mfg_new_orders_yoy = COALESCE(excluded.us_mfg_new_orders_yoy, macro_sentiment_daily.us_mfg_new_orders_yoy),
        us_mfg_inventories_yoy = COALESCE(excluded.us_mfg_inventories_yoy, macro_sentiment_daily.us_mfg_inventories_yoy),
        us_orders_minus_inv_spread = COALESCE(excluded.us_orders_minus_inv_spread, macro_sentiment_daily.us_orders_minus_inv_spread),
        us_industrial_prod_yoy = COALESCE(excluded.us_industrial_prod_yoy, macro_sentiment_daily.us_industrial_prod_yoy),
        updated_at = excluded.updated_at
    `);

    stmt.run(
      data.date,
      data.riskFreeRate3m ?? data.risk_free_rate_3m ?? null,
      data.treasuryYield10y ?? data.treasury_yield_10y ?? null,
      data.yieldSpread10y2y ?? data.yield_spread_10y_2y ?? null,
      data.cnnFearGreedScore ?? data.cnn_fear_greed_score ?? null,
      data.vixClose ?? data.vix_close ?? null,
      data.twPutCallRatio ?? data.tw_put_call_ratio ?? null,
      data.twForeignFuturesOi ?? data.tw_foreign_futures_oi ?? null,
      data.twTrustFuturesOi ?? data.tw_trust_futures_oi ?? null,
      data.treasuryYield2y ?? data.treasury_yield_2y ?? null,
      data.fedFundsRate ?? data.fed_funds_rate ?? null,
      data.usCpiYoY ?? data.cpiYoY ?? data.us_cpi_yoy ?? null,
      data.creditSpreadOas ?? data.credit_spread_oas ?? null,
      data.twMarginMaintenanceRatio ?? data.twMarginMaintenance ?? data.tw_margin_maintenance_ratio ?? null,
      data.igSpreadOas ?? data.ig_spread_oas ?? null,
      data.cccSpreadOas ?? data.ccc_spread_oas ?? null,
      data.breakeven10y ?? data.breakeven_10y ?? null,
      data.initialClaims ?? data.initial_claims ?? null,
      data.usMfgNewOrdersYoY ?? data.us_mfg_new_orders_yoy ?? null,
      data.usMfgInventoriesYoY ?? data.us_mfg_inventories_yoy ?? null,
      data.usOrdersMinusInvSpread ?? data.us_orders_minus_inv_spread ?? null,
      data.usIndustrialProdYoY ?? data.us_industrial_prod_yoy ?? null,
      Date.now()
    );
    return true;
  }

  const stmt = db.prepare(`
    INSERT INTO macro_sentiment_daily (
      date, risk_free_rate_3m, treasury_yield_10y, yield_spread_10y_2y,
      cnn_fear_greed_score, vix_close, tw_put_call_ratio, tw_foreign_futures_oi, tw_trust_futures_oi,
      treasury_yield_2y, fed_funds_rate, us_cpi_yoy, credit_spread_oas, tw_margin_maintenance_ratio,
      ig_spread_oas, ccc_spread_oas, breakeven_10y, initial_claims, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      risk_free_rate_3m = COALESCE(excluded.risk_free_rate_3m, macro_sentiment_daily.risk_free_rate_3m),
      treasury_yield_10y = COALESCE(excluded.treasury_yield_10y, macro_sentiment_daily.treasury_yield_10y),
      yield_spread_10y_2y = COALESCE(excluded.yield_spread_10y_2y, macro_sentiment_daily.yield_spread_10y_2y),
      cnn_fear_greed_score = COALESCE(excluded.cnn_fear_greed_score, macro_sentiment_daily.cnn_fear_greed_score),
      vix_close = COALESCE(excluded.vix_close, macro_sentiment_daily.vix_close),
      tw_put_call_ratio = COALESCE(excluded.tw_put_call_ratio, macro_sentiment_daily.tw_put_call_ratio),
      tw_foreign_futures_oi = COALESCE(excluded.tw_foreign_futures_oi, macro_sentiment_daily.tw_foreign_futures_oi),
      tw_trust_futures_oi = COALESCE(excluded.tw_trust_futures_oi, macro_sentiment_daily.tw_trust_futures_oi),
      treasury_yield_2y = COALESCE(excluded.treasury_yield_2y, macro_sentiment_daily.treasury_yield_2y),
      fed_funds_rate = COALESCE(excluded.fed_funds_rate, macro_sentiment_daily.fed_funds_rate),
      us_cpi_yoy = COALESCE(excluded.us_cpi_yoy, macro_sentiment_daily.us_cpi_yoy),
      credit_spread_oas = COALESCE(excluded.credit_spread_oas, macro_sentiment_daily.credit_spread_oas),
      tw_margin_maintenance_ratio = COALESCE(excluded.tw_margin_maintenance_ratio, macro_sentiment_daily.tw_margin_maintenance_ratio),
      ig_spread_oas = COALESCE(excluded.ig_spread_oas, macro_sentiment_daily.ig_spread_oas),
      ccc_spread_oas = COALESCE(excluded.ccc_spread_oas, macro_sentiment_daily.ccc_spread_oas),
      breakeven_10y = COALESCE(excluded.breakeven_10y, macro_sentiment_daily.breakeven_10y),
      initial_claims = COALESCE(excluded.initial_claims, macro_sentiment_daily.initial_claims),
      updated_at = excluded.updated_at
  `);

  stmt.run(
    data.date,
    data.riskFreeRate3m ?? data.risk_free_rate_3m ?? null,
    data.treasuryYield10y ?? data.treasury_yield_10y ?? null,
    data.yieldSpread10y2y ?? data.yield_spread_10y_2y ?? null,
    data.cnnFearGreedScore ?? data.cnn_fear_greed_score ?? null,
    data.vixClose ?? data.vix_close ?? null,
    data.twPutCallRatio ?? data.tw_put_call_ratio ?? null,
    data.twForeignFuturesOi ?? data.tw_foreign_futures_oi ?? null,
    data.twTrustFuturesOi ?? data.tw_trust_futures_oi ?? null,
    data.treasuryYield2y ?? data.treasury_yield_2y ?? null,
    data.fedFundsRate ?? data.fed_funds_rate ?? null,
    data.usCpiYoY ?? data.cpiYoY ?? data.us_cpi_yoy ?? null,
    data.creditSpreadOas ?? data.credit_spread_oas ?? null,
    data.twMarginMaintenanceRatio ?? data.twMarginMaintenance ?? data.tw_margin_maintenance_ratio ?? null,
    data.igSpreadOas ?? data.ig_spread_oas ?? null,
    data.cccSpreadOas ?? data.ccc_spread_oas ?? null,
    data.breakeven10y ?? data.breakeven_10y ?? null,
    data.initialClaims ?? data.initial_claims ?? null,
    Date.now()
  );

  return true;
}

/**
 * 從 macro_sentiment_daily 取出最近 lookbackRows 筆資料，逐欄取最新非 null 有效值合併 (Spec 0239 T04)
 * 避免當日盤前 NULL 列遮蓋前一日已結算之台股衍生品指標，並附帶 tw_derivatives_as_of_date 標註基準日
 */
function getCoalescedLatestMacroSentiment(db, lookbackRows = 7) {
  if (!db || typeof db.prepare !== 'function') return null;

  const limit = Number.isInteger(lookbackRows) && lookbackRows > 0 ? lookbackRows : 7;
  let rows;
  try {
    rows = db
      .prepare('SELECT * FROM macro_sentiment_daily ORDER BY date DESC LIMIT ?')
      .all(limit);
  } catch {
    return null;
  }

  if (!Array.isArray(rows) || rows.length === 0) return null;

  const merged = { date: rows[0].date };
  const columnNames = new Set();
  for (const row of rows) {
    if (row && typeof row === 'object') {
      for (const key of Object.keys(row)) {
        if (key !== 'date') columnNames.add(key);
      }
    }
  }

  const twDerivativeCols = new Set([
    'tw_foreign_futures_oi',
    'tw_trust_futures_oi',
    'tw_put_call_ratio',
    'tw_margin_maintenance_ratio',
  ]);
  let twDerivativesAsOfDate = null;

  for (const col of columnNames) {
    let pickedVal = null;
    for (const row of rows) {
      const val = row[col];
      if (val !== null && val !== undefined) {
        pickedVal = val;
        if (twDerivativeCols.has(col) && row.date) {
          if (!twDerivativesAsOfDate || String(row.date) > String(twDerivativesAsOfDate)) {
            twDerivativesAsOfDate = row.date;
          }
        }
        break;
      }
    }
    merged[col] = pickedVal;
  }

  merged.tw_derivatives_as_of_date = twDerivativesAsOfDate;
  return merged;
}

/**
 * 解析台灣期貨交易所 (TAIFEX) 三大法人台指期未平倉 CSV (Spec 0183 & Spec 0239 T04)
 */
function parseTaifexInstitutionalFuturesCsv(csvText) {
  if (!csvText || typeof csvText !== 'string') return null;

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return null;

  let foreignNetOi = 0;
  let trustNetOi = 0;
  let found = false;

  for (const line of lines) {
    // 支援雙引號包千分位逗號之 CSV 欄位切分
    const parts = splitCsvLine(line).map((p) => p.replace(/["']/g, '').trim());
    if (parts.length < 14) continue;

    const commodity = parts[1]; // 商品名稱
    const identity = parts[2]; // 身份別
    const netOiNum = parseNumericCell(parts[13]); // 未平倉餘額淨額口數

    if (commodity === '臺股期貨' && netOiNum !== null) {
      const netOi = Math.trunc(netOiNum);
      if (identity.includes('外資')) {
        foreignNetOi = netOi;
        found = true;
      } else if (identity.includes('投信')) {
        trustNetOi = netOi;
        found = true;
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
  } else if (rawData.a1 && Array.isArray(rawData.a1)) {
    for (const group of rawData.a1) {
      if (group && Array.isArray(group.msgArray)) {
        items.push(...group.msgArray);
      }
    }
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
  fetchFredCsvObservations,
  parseFredObservations,
  computeYieldSpread,
  parseCnnFearGreedResponse,
  fetchYahooQuoteAndMa,
  fetchFredSeriesLatest,
  fetchTreasuryYield10y,
  fetchVixClose,
  fetchCnnFearGreed,
  decodeTaifexText,
  fetchTaifexInstitutionalOi,
  parseTaifexPutCallRatioCsv,
  fetchTaifexPutCallRatio,
  deriveTwMarginMaintenanceRatio,
  fetchTwTotalMarginMaintenance,
  fetchFullMacroWarRoomPulse,
  fetchMacroSentimentDaily,
  ingestMacroSentimentToDb,
  getCoalescedLatestMacroSentiment,
  parseTaifexInstitutionalFuturesCsv,
  parseTwseEtfNavResponse,
  ingestEtfDailyNavToDb,
  fetchAndIngestEtfDailyNav,
};
