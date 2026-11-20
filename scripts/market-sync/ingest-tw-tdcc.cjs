/**
 * ingest-tw-tdcc.cjs
 * 台灣集中保管結算所 (TDCC) 股權分散表與千張大戶持股比入庫模組 (Spec 0163 / Ticket 06)
 */

const { initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { getLatestTdccPublishDate } = require('./trading-calendar-engine.cjs');

const TDCC_OPENDATA_URL = 'https://smart.tdcc.com.tw/opendata/getOD.ashx?id=1-5';


/**
 * 解析 TDCC 分級記錄，聚合各標的大戶與散戶比例
 * TDCC 分級標準：
 * 1~9: 1~50 張
 * 1~5: 1~10 張 (散戶)
 * 12~15: 400 張以上 (大戶)
 * 15: 1000 張以上 (千張大戶)
 * 17: 合計
 * @param {Array<{ symbol: string, level: number, shareholders: number, shares: number }>} rows
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Record<string, { symbol: string, date: string, totalShareholders: number, over400Ratio: number, over1000Ratio: number, under10Ratio: number }>}
 */
function parseTdccRecords(rows, dateStr) {
  const result = {};
  if (!Array.isArray(rows) || rows.length === 0) return result;

  const grouped = {};
  for (const r of rows) {
    if (!r || !r.symbol) continue;
    const sym = String(r.symbol).trim();
    if (!grouped[sym]) {
      grouped[sym] = {
        totalShares: 0,
        totalShareholders: 0,
        sharesOver400: 0,
        sharesOver1000: 0,
        sharesUnder10: 0,
      };
    }

    const g = grouped[sym];
    const lvl = Number(r.level);
    const shares = Number(r.shares) || 0;
    const shareholders = Number(r.shareholders) || 0;

    if (lvl === 17) {
      g.totalShares = shares;
      g.totalShareholders = shareholders;
    } else {
      if (lvl >= 12 && lvl <= 15) {
        g.sharesOver400 += shares;
      }
      if (lvl === 15) {
        g.sharesOver1000 += shares;
      }
      if (lvl >= 1 && lvl <= 5) {
        g.sharesUnder10 += shares;
      }
    }
  }

  for (const [sym, g] of Object.entries(grouped)) {
    const tot = g.totalShares > 0 ? g.totalShares : (g.sharesOver400 + g.sharesUnder10);
    const over400Ratio = tot > 0 ? (g.sharesOver400 / tot) * 100 : 0;
    const over1000Ratio = tot > 0 ? (g.sharesOver1000 / tot) * 100 : 0;
    const under10Ratio = tot > 0 ? (g.sharesUnder10 / tot) * 100 : 0;

    result[sym] = {
      symbol: sym,
      date: dateStr,
      totalShareholders: g.totalShareholders,
      over400Ratio: Number(over400Ratio.toFixed(2)),
      over1000Ratio: Number(over1000Ratio.toFixed(2)),
      under10Ratio: Number(under10Ratio.toFixed(2)),
    };
  }

  return result;
}

/**
 * 將 TDCC 股權分散記錄批次寫入 SQLite tw_tdcc_distribution
 * @param {Record<string, object>} distributionMap
 * @param {string} dateStr
 * @param {string} [customDbPath]
 * @returns {{ savedCount: number }}
 */
function saveTdccDistributionToSqlite(distributionMap, dateStr, customDbPath) {
  if (!distributionMap || typeof distributionMap !== 'object' || !dateStr) {
    return { savedCount: 0 };
  }

  const entries = Object.values(distributionMap);
  if (entries.length === 0) return { savedCount: 0 };

  const db = initSqliteLakehouseDb(customDbPath);
  const stmt = db.prepare(`
    INSERT INTO tw_tdcc_distribution (
      symbol, date, total_shareholders, over_400_ratio, over_1000_ratio, under_10_ratio, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, date) DO UPDATE SET
      total_shareholders = excluded.total_shareholders,
      over_400_ratio = excluded.over_400_ratio,
      over_1000_ratio = excluded.over_1000_ratio,
      under_10_ratio = excluded.under_10_ratio,
      updated_at = excluded.updated_at
  `);

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  const now = Date.now();
  try {
    for (const item of entries) {
      if (!item || !item.symbol) continue;
      stmt.run(
        String(item.symbol).trim(),
        String(dateStr).trim(),
        item.totalShareholders || null,
        item.over400Ratio !== undefined ? Number(item.over400Ratio) : null,
        item.over1000Ratio !== undefined ? Number(item.over1000Ratio) : null,
        item.under10Ratio !== undefined ? Number(item.under10Ratio) : null,
        now
      );
      count++;
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { savedCount: count };
}

/**
 * 解析 TDCC OpenData CSV 文本 (id=1-5)
 * 欄位格式：資料日期,證券代號,持股分級,人數,股數,占集保庫存數比例%
 * @param {string} csvText
 * @returns {{ dateStr: string | null, rows: Array<{ symbol: string, level: number, shareholders: number, shares: number }> }}
 */
function parseTdccCsv(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    return { dateStr: null, rows: [] };
  }

  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/);
  const rows = [];
  let dateStr = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 5) continue;

    const level = Number(cols[2]);
    if (!Number.isFinite(level) || level <= 0) continue; // 略過標題列

    const rawDate = cols[0];
    if (!dateStr && /^\d{8}$/.test(rawDate)) {
      dateStr = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
    } else if (!dateStr && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      dateStr = rawDate;
    }

    const symbol = cols[1];
    if (!symbol) continue;

    const shareholders = Number(cols[3].replace(/,/g, '')) || 0;
    const shares = Number(cols[4].replace(/,/g, '')) || 0;
    rows.push({ symbol, level, shareholders, shares });
  }

  return { dateStr, rows };
}

/**
 * 清除舊版由 Math.sin/Math.cos 產生的合成 TDCC 假資料
 * 舊版合成公式固定滿足：under_10_ratio = round(max(2, (100 - over_400_ratio) * 0.6), 2)
 * @param {string} [customDbPath]
 * @returns {{ deletedCount: number }}
 */
function purgeSyntheticRecords(customDbPath) {
  const db = initSqliteLakehouseDb(customDbPath);
  const rows = db
    .prepare('SELECT rowid, over_400_ratio, under_10_ratio FROM tw_tdcc_distribution')
    .all();

  const syntheticRowIds = [];
  for (const r of rows) {
    if (r.over_400_ratio === null || r.under_10_ratio === null) continue;
    const expectedUnder10 = Number(Math.max(2, (100 - r.over_400_ratio) * 0.6).toFixed(2));
    if (Math.abs(r.under_10_ratio - expectedUnder10) <= 0.01) {
      syntheticRowIds.push(r.rowid);
    }
  }

  if (syntheticRowIds.length === 0) return { deletedCount: 0 };

  const delStmt = db.prepare('DELETE FROM tw_tdcc_distribution WHERE rowid = ?');
  db.exec('BEGIN TRANSACTION;');
  try {
    for (const id of syntheticRowIds) {
      delStmt.run(id);
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { deletedCount: syntheticRowIds.length };
}

/**
 * 執行全市場台股 TDCC 集保股權分散表真實資料抓取與入庫 (Spec 0237 Ticket 01)
 * 離線或抓取失敗時回傳 { savedCount: 0 }，嚴禁寫入任何合成假資料
 * @param {string} [customDbPath]
 * @param {string | { targetDate?: string, fetcher?: Function, purgeSynthetic?: boolean }} [targetDateOrOptions]
 * @param {number} [backfillWeeks]
 * @param {{ targetDate?: string, fetcher?: Function, purgeSynthetic?: boolean }} [options]
 * @returns {Promise<{ savedCount: number, targetDate: string, weeksCount: number }>}
 */
async function runTdccIngestion(customDbPath, targetDateOrOptions, backfillWeeks, options) {
  const opts =
    typeof targetDateOrOptions === 'object' && targetDateOrOptions !== null
      ? targetDateOrOptions
      : options || {};
  const explicitDate = typeof targetDateOrOptions === 'string' ? targetDateOrOptions : opts.targetDate;
  const anchorDateStr = explicitDate || getLatestTdccPublishDate();
  const fetcher = opts.fetcher || globalThis.fetch;

  const db = initSqliteLakehouseDb(customDbPath);
  const symbols = db.prepare("SELECT symbol FROM symbols_meta WHERE market = 'TW'").all();
  if (symbols.length === 0 || typeof fetcher !== 'function') {
    return { savedCount: 0, targetDate: anchorDateStr, weeksCount: 0 };
  }

  let csvText = '';
  try {
    const res = await fetcher(TDCC_OPENDATA_URL, {
      headers: {
        Accept: 'text/csv,text/plain,*/*',
        'User-Agent': 'StockTracker/1.0 (local-sync)',
      },
    });
    if (!res || !res.ok) {
      return { savedCount: 0, targetDate: anchorDateStr, weeksCount: 0 };
    }
    csvText = await res.text();
  } catch {
    return { savedCount: 0, targetDate: anchorDateStr, weeksCount: 0 };
  }

  const { dateStr: csvDateStr, rows } = parseTdccCsv(csvText);
  if (rows.length === 0) {
    return { savedCount: 0, targetDate: anchorDateStr, weeksCount: 0 };
  }

  const registeredSet = new Set(symbols.map((s) => String(s.symbol).trim()));
  const filteredRows = rows.filter((r) => registeredSet.has(r.symbol));
  if (filteredRows.length === 0) {
    return { savedCount: 0, targetDate: explicitDate || csvDateStr || anchorDateStr, weeksCount: 0 };
  }

  if (opts.purgeSynthetic !== false) {
    purgeSyntheticRecords(customDbPath);
  }

  const effectiveDate = explicitDate || csvDateStr || anchorDateStr;
  const distributionMap = parseTdccRecords(filteredRows, effectiveDate);
  const { savedCount } = saveTdccDistributionToSqlite(distributionMap, effectiveDate, customDbPath);

  return { savedCount, targetDate: effectiveDate, weeksCount: savedCount > 0 ? 1 : 0 };
}

const TDCC_QRY_STOCK_URL = 'https://www.tdcc.com.tw/portal/zh/smWeb/qryStock';

/**
 * 解析 TDCC 官方 qryStock HTML 頁面中的可用歷史週次清單與表單 Token (Spec 0242)
 */
function parseTdccQryPageMeta(html) {
  if (!html || typeof html !== 'string') {
    return { synToken: '', firDate: '', dates: [] };
  }
  const synToken = html.match(/name="SYNCHRONIZER_TOKEN"\s+value="([^"]+)"/i)?.[1] || '';
  const dates = [...html.matchAll(/<option\s+value="(\d{8})"/gi)].map((m) => m[1]);
  const uniqueDates = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  const firDate = html.match(/name="firDate"\s+value="(\d{8})"/i)?.[1] || uniqueDates[0] || '';
  return { synToken, firDate, dates: uniqueDates };
}

/**
 * 解析 TDCC 官方 qryStock 查詢結果 HTML 的 15 級股權分散表 (Spec 0242)
 * 與 parseTdccRecords 保持 100% 相同級距口徑：1~5 散戶、12~15 為 400 張以上、15 為千張大戶、17 為合計
 */
function parseTdccQryResultHtml(html, symbol, dateIso) {
  if (!html || typeof html !== 'string') return null;
  const trs = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const parsedRows = [];
  for (const tr of trs) {
    const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    );
    if (tds.length !== 5) continue;
    const lvl = parseInt(tds[0], 10);
    if (!Number.isFinite(lvl) || lvl < 1 || lvl > 17) continue;
    const shareholders = parseInt(tds[2].replace(/,/g, ''), 10) || 0;
    const shares = parseInt(tds[3].replace(/,/g, ''), 10) || 0;
    parsedRows.push({ symbol, level: lvl, shareholders, shares });
  }
  if (parsedRows.length === 0) return null;
  const distMap = parseTdccRecords(parsedRows, dateIso);
  return distMap[symbol] || null;
}

/**
 * 透過 TDCC 官方免費歷史查詢介面 (qryStock) 補齊單一標的近 N 週（最高 51 週）歷史集保 (Spec 0242)
 */
async function fetchSymbolTdccHistoryFromOfficial(
  symbol,
  weeks = 12,
  existingDatesSet = new Set(),
  fetcher = globalThis.fetch,
  signal = undefined,
  delayMs = 180
) {
  const cleanSymbol = String(symbol).trim().toUpperCase();
  const querySym = cleanSymbol.endsWith('O') ? cleanSymbol.slice(0, -1) : cleanSymbol;

  const initRes = await fetcher(TDCC_QRY_STOCK_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    ...(signal ? { signal } : {}),
  });
  if (!initRes || !initRes.ok || typeof initRes.text !== 'function') return [];

  const cookieList =
    typeof initRes.headers?.getSetCookie === 'function'
      ? initRes.headers.getSetCookie()
      : initRes.headers?.get?.('set-cookie')
        ? [initRes.headers.get('set-cookie')]
        : [];
  const cookies = cookieList.map((c) => String(c).split(';')[0]).filter(Boolean).join('; ');
  const initHtml = await initRes.text();
  let { synToken, firDate, dates } = parseTdccQryPageMeta(initHtml);
  if (!synToken || dates.length === 0) return [];

  const targetDates = dates.slice(0, Math.min(51, Math.max(1, weeks))).filter((d8) => {
    const iso = `${d8.slice(0, 4)}-${d8.slice(4, 6)}-${d8.slice(6, 8)}`;
    return !existingDatesSet.has(iso);
  });

  const collected = [];
  for (let i = 0; i < targetDates.length; i++) {
    if (signal?.aborted) break;
    const d8 = targetDates[i];
    const dateIso = `${d8.slice(0, 4)}-${d8.slice(4, 6)}-${d8.slice(6, 8)}`;
    const body = new URLSearchParams({
      SYNCHRONIZER_TOKEN: synToken,
      SYNCHRONIZER_URI: '/portal/zh/smWeb/qryStock',
      method: 'submit',
      firDate: firDate || dates[0],
      scaDate: d8,
      sqlMethod: 'StockNo',
      stockNo: querySym,
      stockName: '',
    });

    const postRes = await fetcher(TDCC_QRY_STOCK_URL, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(cookies ? { Cookie: cookies } : {}),
        Referer: TDCC_QRY_STOCK_URL,
      },
      body: body.toString(),
      ...(signal ? { signal } : {}),
    });
    if (!postRes || !postRes.ok || typeof postRes.text !== 'function') break;
    const postHtml = await postRes.text();
    const nextMeta = parseTdccQryPageMeta(postHtml);
    if (nextMeta.synToken) {
      synToken = nextMeta.synToken;
    }

    const parsed = parseTdccQryResultHtml(postHtml, cleanSymbol, dateIso);
    if (parsed && parsed.totalShareholders > 0) {
      collected.push(parsed);
    }

    if (delayMs > 0 && i < targetDates.length - 1 && !signal?.aborted) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return collected;
}

/**
 * 單一標的 TDCC 集保股權分散歷史序列按需補齊 (Spec 0241 Ticket 03 & Spec 0242 官方免費升級)
 * 優先序：TDCC 官方 qryStock (免費支援近 51 週) -> FinMind (相容既有用例或自帶 FINMIND_TOKEN)
 * @param {string} symbol
 * @param {number} [weeks=12]
 * @param {string} [customDbPath]
 * @param {Function} [fetcher]
 * @returns {Promise<{ savedCount: number, skipped?: boolean }>}
 */
async function backfillSymbolTdccHistory(symbol, weeks = 12, customDbPath, fetcher = globalThis.fetch, signal = undefined) {
  if (!symbol || typeof fetcher !== 'function' || signal?.aborted) {
    return { savedCount: 0 };
  }

  const cleanSymbol = String(symbol).trim().toUpperCase();
  const aliasSym = cleanSymbol.endsWith('O') ? cleanSymbol.slice(0, -1) : `${cleanSymbol}O`;

  try {
    const db = initSqliteLakehouseDb(customDbPath);
    const existingRows = db
      .prepare('SELECT date FROM tw_tdcc_distribution WHERE symbol IN (?, ?)')
      .all(cleanSymbol, aliasSym);
    const existingDatesSet = new Set(existingRows.map((r) => r.date));
    const targetCount = Math.min(51, Math.max(4, weeks));
    if (existingDatesSet.size >= Math.min(targetCount, 8)) {
      return { savedCount: 0, skipped: true };
    }

    // 1. Primary: TDCC 官方免費歷史表單 (免 Token、支援過去 51 週)
    try {
      const officialItems = await fetchSymbolTdccHistoryFromOfficial(
        cleanSymbol,
        targetCount,
        existingDatesSet,
        fetcher,
        signal
      );
      if (officialItems.length > 0) {
        let totalSaved = 0;
        for (const item of officialItems) {
          const { savedCount } = saveTdccDistributionToSqlite({ [cleanSymbol]: item }, item.date, customDbPath);
          totalSaved += savedCount;
        }
        return { savedCount: totalSaved };
      }
    } catch (err) {
      if (err?.name === 'AbortError') return { savedCount: 0 };
    }

    if (signal?.aborted) return { savedCount: 0 };

    // 2. Fallback: FinMind API (僅於自帶 FINMIND_TOKEN 或測試 mock 時生效)
    const startDateObj = new Date(Date.now() - (targetCount * 7 + 21) * 86400000);
    const startDate = startDateObj.toISOString().slice(0, 10);
    const querySym = cleanSymbol.endsWith('O') ? cleanSymbol.slice(0, -1) : cleanSymbol;
    const tokenParam = process.env.FINMIND_TOKEN ? `&token=${encodeURIComponent(process.env.FINMIND_TOKEN)}` : '';
    const apiUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockHoldingSharesPer&data_id=${encodeURIComponent(querySym)}&start_date=${startDate}${tokenParam}`;

    const res = await fetcher(apiUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'StockTracker/1.0 (local-sync)' },
      ...(signal ? { signal } : {}),
    });
    if (!res || !res.ok || typeof res.json !== 'function') return { savedCount: 0 };

    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : [];
    if (rows.length === 0) return { savedCount: 0 };

    const byDate = {};
    for (const r of rows) {
      if (!r || !r.date) continue;
      const d = String(r.date).slice(0, 10);
      if (!byDate[d]) {
        byDate[d] = {
          date: d,
          totalShareholders: 0,
          fallbackShareholders: 0,
          over400Ratio: 0,
          over1000Ratio: 0,
          under10Ratio: 0,
        };
      }
      const g = byDate[d];
      const lvl = String(r.HoldingSharesLevel || '').trim().toLowerCase();
      const people = Number(r.people) || 0;
      const pct = Number(r.percent) || 0;

      if (lvl === 'total') {
        g.totalShareholders = people;
      } else {
        g.fallbackShareholders += people;
        if (
          lvl === '400,001-600,000' ||
          lvl === '600,001-800,000' ||
          lvl === '800,001-1,000,000' ||
          lvl === 'more than 1,000,001'
        ) {
          g.over400Ratio += pct;
        }
        if (lvl === 'more than 1,000,001') {
          g.over1000Ratio += pct;
        }
        if (lvl === '1-999' || lvl === '1,000-5,000' || lvl === '5,001-10,000') {
          g.under10Ratio += pct;
        }
      }
    }

    const sortedDates = Object.keys(byDate).sort().slice(-targetCount);
    let totalSaved = 0;
    for (const d of sortedDates) {
      const g = byDate[d];
      const item = {
        symbol: cleanSymbol,
        date: d,
        totalShareholders: g.totalShareholders > 0 ? g.totalShareholders : g.fallbackShareholders,
        over400Ratio: Number(g.over400Ratio.toFixed(2)),
        over1000Ratio: Number(g.over1000Ratio.toFixed(2)),
        under10Ratio: Number(g.under10Ratio.toFixed(2)),
      };
      const { savedCount } = saveTdccDistributionToSqlite({ [cleanSymbol]: item }, d, customDbPath);
      totalSaved += savedCount;
    }

    return { savedCount: totalSaved };
  } catch {
    return { savedCount: 0 };
  }
}

module.exports = {
  TDCC_OPENDATA_URL,
  TDCC_QRY_STOCK_URL,
  parseTdccCsv,
  parseTdccRecords,
  parseTdccQryPageMeta,
  parseTdccQryResultHtml,
  fetchSymbolTdccHistoryFromOfficial,
  saveTdccDistributionToSqlite,
  purgeSyntheticRecords,
  runTdccIngestion,
  backfillSymbolTdccHistory,
};

if (require.main === module) {
  console.log('🏛️ [TDCC Ingestion] 啟動全市場台股集保大戶股權分散表入庫 (Spec 0164)...');
  runTdccIngestion()
    .then(({ savedCount, targetDate }) => {
      console.log(`✔ 成功入庫 ${savedCount.toLocaleString()} 檔台股集保大戶數據 (基準日期: ${targetDate}) 至 tw_tdcc_distribution！`);
    })
    .catch((err) => {
      console.error('❌ TDCC 入庫失敗:', err);
      process.exit(1);
    });
}
