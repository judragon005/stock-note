/**
 * seed-symbols-universe.cjs
 * 標的註冊表種子入庫與極速模糊搜尋
 */

const fs = require('fs');
const path = require('path');
const { getSqliteDbConnection, initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

// Tier 1 核心美股標的種子
const DEFAULT_US_SEED = [
  { symbol: 'VOO', name: 'Vanguard標普500 ETF', market: 'US', exchange: 'NYSE', type: 'ETF' },
  { symbol: 'SPY', name: 'SPDR標普500 ETF', market: 'US', exchange: 'NYSE', type: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco那斯達克100 ETF', market: 'US', exchange: 'NASDAQ', type: 'ETF' },
  { symbol: 'IVV', name: 'iShares核心標普500 ETF', market: 'US', exchange: 'NYSE', type: 'ETF' },
  { symbol: 'VTI', name: 'Vanguard整體股市ETF', market: 'US', exchange: 'NYSE', type: 'ETF' },
  { symbol: 'VT', name: 'Vanguard全世界股票ETF', market: 'US', exchange: 'NYSE', type: 'ETF' },
  { symbol: 'TLT', name: 'iShares 20年期以上美國公債ETF', market: 'US', exchange: 'NASDAQ', type: 'ETF' },
  { symbol: 'IEF', name: 'iShares 7-10年期美國公債ETF', market: 'US', exchange: 'NASDAQ', type: 'ETF' },
  { symbol: 'GLD', name: 'SPDR黃金ETF', market: 'US', exchange: 'NYSE', type: 'ETF' },
  { symbol: 'AAPL', name: '蘋果', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'MSFT', name: '微軟', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'NVDA', name: '輝達', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'AMZN', name: '亞馬遜', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'GOOGL', name: 'Alphabet A', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'GOOG', name: 'Alphabet C', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'META', name: 'Meta', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'TSLA', name: '特斯拉', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'AVGO', name: '博通', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'COST', name: '好市多', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'AMD', name: '超微', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'NFLX', name: '網飛', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'BRK-B', name: '波克夏B', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'JNJ', name: '嬌生', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'JPM', name: '摩根大通', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'UNH', name: '聯合健康', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'XOM', name: '埃克森美孚', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'LLY', name: '禮來', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'PG', name: '寶僑', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'HD', name: '家得寶', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'V', name: 'Visa', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'MA', name: '萬事達卡', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'CRM', name: '賽富時', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'ABBV', name: '艾伯維', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'CVX', name: '雪佛龍', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'MRK', name: '默克', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'BAC', name: '美國銀行', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'KO', name: '可口可樂', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'PEP', name: '百事可樂', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'TMO', name: '賽默飛世爾', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'WMT', name: '沃爾瑪', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'MCD', name: '麥當勞', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'DIS', name: '迪士尼', market: 'US', exchange: 'NYSE', type: 'STOCK' },
  { symbol: 'CSCO', name: '思科', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
  { symbol: 'ADBE', name: '奧多比', market: 'US', exchange: 'NASDAQ', type: 'STOCK' },
];

/**
 * 批次更新或插入標的元數據
 * @param {Array<{ symbol: string, name: string, market: string, exchange?: string, type?: string, status?: string }>} symbols
 * @param {string} [customDbPath]
 */
function upsertSymbolsMeta(symbols, customDbPath) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return { upsertedCount: 0 };
  }

  const db = initSqliteLakehouseDb(customDbPath);
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO symbols_meta (symbol, name, market, exchange, type, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol) DO UPDATE SET
      name = excluded.name,
      market = excluded.market,
      exchange = COALESCE(excluded.exchange, symbols_meta.exchange),
      type = COALESCE(excluded.type, symbols_meta.type),
      status = COALESCE(symbols_meta.status, excluded.status),
      updated_at = excluded.updated_at
  `);

  db.exec('BEGIN TRANSACTION;');
  let count = 0;
  try {
    for (const item of symbols) {
      if (!item || !item.symbol || !item.name) continue;
      const cleanSym = String(item.symbol).trim().toUpperCase();
      const cleanName = String(item.name).trim();
      const market = String(item.market || 'TW').trim().toUpperCase();
      const exchange = item.exchange ? String(item.exchange).trim() : (market === 'TW' ? 'TWSE' : 'US');
      const type = item.type ? String(item.type).trim() : (cleanSym.startsWith('00') ? 'ETF' : 'STOCK');
      const status = item.status ? String(item.status).trim() : 'NORMAL';

      stmt.run(cleanSym, cleanName, market, exchange, type, status, now);
      count++;
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { upsertedCount: count };
}

/**
 * 極速模糊搜尋標的（30ms 內）
 * @param {string} query
 * @param {number} [limit=20]
 * @param {string} [customDbPath]
 */
function searchSymbolsMeta(query, limit = 20, customDbPath) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return [];
  }

  const cleanQuery = query.trim();
  // 防禦特殊無效字元
  if (cleanQuery.includes(';') || cleanQuery.includes('--')) {
    return [];
  }

  const db = getSqliteDbConnection(customDbPath);
  const pattern = `%${cleanQuery}%`;
  const exactSym = cleanQuery.toUpperCase();
  const prefixSym = `${exactSym}%`;

  const stmt = db.prepare(`
    SELECT symbol, name, market, exchange, type, status
    FROM symbols_meta
    WHERE symbol LIKE ? OR name LIKE ?
    ORDER BY
      CASE
        WHEN symbol = ? THEN 0
        WHEN symbol LIKE ? THEN 1
        WHEN name LIKE ? THEN 2
        ELSE 3
      END,
      symbol ASC
    LIMIT ?
  `);

  return stmt.all(pattern, pattern, exactSym, prefixSym, pattern, Math.max(1, limit));
}

/**
 * 匯入預設全市場標的種子名單（台股 2,300+ 檔 + 美股核心清單）
 * @param {string} [customDbPath]
 */
function seedDefaultSymbolsUniverse(customDbPath) {
  const seeds = [...DEFAULT_US_SEED];

  // 嘗試讀取 public/market-cache/tw_market_summary.json
  const twSummaryPath = path.resolve(__dirname, '../../public/market-cache/tw_market_summary.json');
  if (fs.existsSync(twSummaryPath)) {
    try {
      const content = fs.readFileSync(twSummaryPath, 'utf8');
      const data = JSON.parse(content);
      if (data && data.stocks) {
        for (const [sym, stock] of Object.entries(data.stocks)) {
          seeds.push({
            symbol: sym,
            name: stock.name || sym,
            market: 'TW',
            exchange: 'TWSE',
            type: sym.startsWith('00') ? 'ETF' : 'STOCK',
          });
        }
      }
    } catch (e) {
      // 忽略
    }
  }

  // 嘗試從 src/data/stockDictionary.ts 擷取台股清單
  if (seeds.length < 500) {
    const dictPath = path.resolve(__dirname, '../../src/data/stockDictionary.ts');
    if (fs.existsSync(dictPath)) {
      try {
        const text = fs.readFileSync(dictPath, 'utf8');
        const regex = /\{\s*symbol:\s*'([^']+)',\s*name:\s*'([^']+)',\s*market:\s*'([^']+)'/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
          seeds.push({
            symbol: match[1],
            name: match[2],
            market: match[3],
            exchange: match[3] === 'TW' ? 'TWSE' : 'NASDAQ',
            type: match[1].startsWith('00') ? 'ETF' : 'STOCK',
          });
        }
      } catch (e) {
        // 忽略
      }
    }
  }

  const result = upsertSymbolsMeta(seeds, customDbPath);
  return { totalSeeded: result.upsertedCount };
}

module.exports = {
  upsertSymbolsMeta,
  searchSymbolsMeta,
  seedDefaultSymbolsUniverse,
  DEFAULT_US_SEED,
};
