/**
 * ingest-historical-chips.cjs
 * 台股三大法人全歷史與融資融券全歷史 CSV 解析與深層湖倉入庫模組 (Spec 0162 / Ticket 03 & 04)
 */

const fs = require('fs');
const path = require('path');
const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

// 本機數據庫路徑
const HISTORICAL_BASE_DIR = 'D:\\APP\\諮詢\\私人\\股市\\台股加權指數_歷史數據\\上市櫃股票與債券_歷史數據';
const CHIPS_DIR = path.join(HISTORICAL_BASE_DIR, '全歷史籌碼與融資融券數據庫');

/**
 * 解析三大法人歷史 CSV 文本內容，聚合為按日期排列的張數清單
 * @param {string} content - CSV 檔案內容
 * @param {number} [limit=260] - 最大保留交易日天數
 * @returns {Array<{ date: string, foreign_net: number, trust_net: number, dealer_net: number }>}
 */
function parseHistoricalInstitutionalContent(content, limit = 260) {
  if (!content || typeof content !== 'string') return [];
  const lines = content.split(/\r?\n/);
  if (lines.length <= 1) return [];

  const byDate = new Map();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 6) continue;

    const date = parts[0]?.trim();
    const instType = parts[2]?.trim();
    const netShares = parseFloat(parts[5]?.trim()) || 0;
    if (!date || !instType) continue;

    if (!byDate.has(date)) {
      byDate.set(date, {
        foreign_shares: 0,
        trust_shares: 0,
        dealer_shares: 0,
      });
    }

    const current = byDate.get(date);
    if (instType.includes('Foreign_Investor') || instType.includes('Foreign_Dealer')) {
      current.foreign_shares += netShares;
    } else if (instType.includes('Investment_Trust')) {
      current.trust_shares += netShares;
    } else if (instType.includes('Dealer_self') || instType.includes('Dealer_Hedging') || instType.includes('Dealer')) {
      current.dealer_shares += netShares;
    }
  }

  const sortedDates = Array.from(byDate.keys()).sort();
  const slicedDates = limit > 0 && sortedDates.length > limit ? sortedDates.slice(-limit) : sortedDates;

  return slicedDates.map((d) => {
    const raw = byDate.get(d);
    return {
      date: d,
      foreign_net: Math.round(raw.foreign_shares / 1000),
      trust_net: Math.round(raw.trust_shares / 1000),
      dealer_net: Math.round(raw.dealer_shares / 1000),
    };
  });
}

/**
 * 解析融資融券歷史 CSV 文本內容
 * @param {string} content - CSV 檔案內容
 * @param {number} [limit=260] - 最大保留交易日天數
 * @returns {Array<{ date: string, margin_balance: number, short_balance: number }>}
 */
function parseHistoricalMarginContent(content, limit = 260) {
  if (!content || typeof content !== 'string') return [];
  const lines = content.split(/\r?\n/);
  if (lines.length <= 1) return [];

  const byDate = new Map();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 8) continue;

    const date = parts[0]?.trim();
    const marginBalance = parseInt(parts[4]?.trim(), 10) || 0;
    const shortBalance = parseInt(parts[7]?.trim(), 10) || 0;
    if (!date) continue;

    byDate.set(date, {
      margin_balance: marginBalance,
      short_balance: shortBalance,
    });
  }

  const sortedDates = Array.from(byDate.keys()).sort();
  const slicedDates = limit > 0 && sortedDates.length > limit ? sortedDates.slice(-limit) : sortedDates;

  return slicedDates.map((d) => {
    const raw = byDate.get(d);
    return {
      date: d,
      margin_balance: raw.margin_balance,
      short_balance: raw.short_balance,
    };
  });
}

/**
 * 將特定標的之法人與資券記錄批次沉澱至 SQLite tw_institutional_chips
 * @param {string} symbol - 股票代碼
 * @param {Array<{ date: string, foreign_net?: number, trust_net?: number, dealer_net?: number }>} [instRecords]
 * @param {Array<{ date: string, margin_balance?: number, short_balance?: number }>} [marginRecords]
 * @param {string} [customDbPath]
 * @returns {{ savedCount: number }}
 */
function saveHistoricalChipsBatchToSqlite(symbol, instRecords = [], marginRecords = [], customDbPath) {
  if (!symbol) return { savedCount: 0 };
  const cleanSymbol = symbol.trim().toUpperCase();

  const mergedByDate = new Map();

  if (Array.isArray(instRecords)) {
    for (const r of instRecords) {
      if (!r || !r.date) continue;
      mergedByDate.set(r.date, {
        foreign_net: r.foreign_net ?? 0,
        trust_net: r.trust_net ?? 0,
        dealer_net: r.dealer_net ?? 0,
        margin_balance: null,
        short_balance: null,
      });
    }
  }

  if (Array.isArray(marginRecords)) {
    for (const m of marginRecords) {
      if (!m || !m.date) continue;
      if (!mergedByDate.has(m.date)) {
        mergedByDate.set(m.date, {
          foreign_net: 0,
          trust_net: 0,
          dealer_net: 0,
          margin_balance: m.margin_balance ?? null,
          short_balance: m.short_balance ?? null,
        });
      } else {
        const item = mergedByDate.get(m.date);
        item.margin_balance = m.margin_balance ?? item.margin_balance;
        item.short_balance = m.short_balance ?? item.short_balance;
      }
    }
  }

  if (mergedByDate.size === 0) return { savedCount: 0 };

  const db = initSqliteLakehouseDb(customDbPath);
  const stmt = db.prepare(`
    INSERT INTO tw_institutional_chips (symbol, date, foreign_net, trust_net, dealer_net, margin_balance, short_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol, date) DO UPDATE SET
      foreign_net = COALESCE(excluded.foreign_net, tw_institutional_chips.foreign_net),
      trust_net = COALESCE(excluded.trust_net, tw_institutional_chips.trust_net),
      dealer_net = COALESCE(excluded.dealer_net, tw_institutional_chips.dealer_net),
      margin_balance = COALESCE(excluded.margin_balance, tw_institutional_chips.margin_balance),
      short_balance = COALESCE(excluded.short_balance, tw_institutional_chips.short_balance)
  `);

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  try {
    for (const [date, val] of mergedByDate.entries()) {
      stmt.run(
        cleanSymbol,
        date,
        val.foreign_net ?? 0,
        val.trust_net ?? 0,
        val.dealer_net ?? 0,
        val.margin_balance !== undefined ? val.margin_balance : null,
        val.short_balance !== undefined ? val.short_balance : null
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
 * 批次掃描本機 CHIPS_DIR 下全部三大法人與融資融券 CSV 並入庫 SQLite (全市場歷史籌碼沉澱)
 * @param {string} [chipsDir]
 * @param {number} [limit=260]
 * @param {string} [customDbPath]
 * @returns {{ processedSymbols: number, totalRecords: number }}
 */
function runAllHistoricalChipsIngestion(chipsDir = CHIPS_DIR, limit = 260, customDbPath) {
  if (!fs.existsSync(chipsDir)) {
    console.warn(`[籌碼入庫警告] 找不到籌碼歷史目錄: ${chipsDir}`);
    return { processedSymbols: 0, totalRecords: 0 };
  }

  const files = fs.readdirSync(chipsDir);
  const instFiles = new Map();
  const marginFiles = new Map();

  for (const f of files) {
    const sym = f.split('_')[0];
    if (!sym) continue;
    if (f.includes('三大法人')) instFiles.set(sym, path.join(chipsDir, f));
    else if (f.includes('融資融券')) marginFiles.set(sym, path.join(chipsDir, f));
  }

  const allSymbols = new Set([...instFiles.keys(), ...marginFiles.keys()]);
  console.log(`[籌碼入庫] 找到三大法人標的 ${instFiles.size} 檔，融資融券標的 ${marginFiles.size} 檔，聯集共 ${allSymbols.size} 檔`);

  let totalRecords = 0;
  let processedSymbols = 0;

  for (const sym of allSymbols) {
    let instRecords = [];
    let marginRecords = [];

    const instPath = instFiles.get(sym);
    if (instPath && fs.existsSync(instPath)) {
      const content = fs.readFileSync(instPath, 'utf8');
      instRecords = parseHistoricalInstitutionalContent(content, limit);
    }

    const marginPath = marginFiles.get(sym);
    if (marginPath && fs.existsSync(marginPath)) {
      const content = fs.readFileSync(marginPath, 'utf8');
      marginRecords = parseHistoricalMarginContent(content, limit);
    }

    if (instRecords.length > 0 || marginRecords.length > 0) {
      const res = saveHistoricalChipsBatchToSqlite(sym, instRecords, marginRecords, customDbPath);
      totalRecords += res.savedCount;
      processedSymbols++;
    }
  }

  console.log(`✔ [籌碼入庫完成] 成功處理 ${processedSymbols} 檔標的，累計寫入 ${totalRecords} 筆歷史籌碼記錄至 tw_institutional_chips`);
  return { processedSymbols, totalRecords };
}

if (require.main === module) {
  runAllHistoricalChipsIngestion();
}

module.exports = {
  parseHistoricalInstitutionalContent,
  parseHistoricalMarginContent,
  saveHistoricalChipsBatchToSqlite,
  runAllHistoricalChipsIngestion,
  CHIPS_DIR,
};

