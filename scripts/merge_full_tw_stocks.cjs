const fs = require('fs');
const path = require('path');

const summaryCsvPath = 'D:\\APP\\諮詢\\私人\\股市\\台股加權指數_歷史數據\\上市櫃股票與債券_歷史數據\\TWSE_TPEx_stocks_summary.csv';
const stockDictTsPath = path.join(__dirname, '..', 'src', 'data', 'stockDictionary.ts');

function isValidTaiwanSecurity(code, name) {
  const cleanCode = code.trim().toUpperCase();
  const cleanName = name.trim();

  if (!cleanCode || !cleanName) return false;

  if (
    /[購售牛熊]/.test(cleanName) ||
    cleanName.includes('展延') ||
    cleanName.includes('認購') ||
    cleanName.includes('認售')
  ) {
    return false;
  }

  if (/^(0[3-8]\d{4}|7\d{5})[A-Z]?$/.test(cleanCode)) {
    return false;
  }

  if (/^00\d{2,4}[A-Z0-9]?$/i.test(cleanCode)) return true;

  if (!cleanCode.startsWith('00') && /^\d{4}[1-9]$/.test(cleanCode)) {
    return false;
  }

  if (/^\d{4}$/.test(cleanCode)) return true;
  if (/^\d{4}[A-Z]$/.test(cleanCode)) return true;
  if (/^02\d{4}[A-Z0-9]?$/i.test(cleanCode)) return true;
  if (/^91\d{2,4}$/.test(cleanCode)) return true;

  if (cleanCode.length <= 6 && !/^(0[3-8]|7)/.test(cleanCode)) {
    return true;
  }

  return false;
}

// 1. 讀取既有 stockDictionary.ts 中的 STATIC_US_STOCKS 部分
const dictContent = fs.readFileSync(stockDictTsPath, 'utf-8');
const usStocksMatch = dictContent.match(/export const STATIC_US_STOCKS: StockDictionaryItem\[\] = \[([\s\S]*?)\];\s*\/\*\*/);
if (!usStocksMatch) {
  console.error('Failed to extract STATIC_US_STOCKS');
  process.exit(1);
}
const usStocksBlock = usStocksMatch[1].trim();

// 2. 讀取既有 STATIC_TW_STOCKS，建立已存在 category 的快取
const existingCategoryMap = new Map();
const twStockRegex = /\{\s*symbol:\s*'([^']+)',\s*name:\s*'([^']+)',\s*market:\s*'TW'(?:,\s*category:\s*'([^']+)')?/g;
let m;
while ((m = twStockRegex.exec(dictContent)) !== null) {
  existingCategoryMap.set(m[1].trim(), { name: m[2].trim(), category: m[3] || '' });
}
console.log(`Loaded ${existingCategoryMap.size} existing TW stocks from dictionary.`);

// 3. 讀取外部 CSV (TWSE_TPEx_stocks_summary.csv)
const csvContent = fs.readFileSync(summaryCsvPath, 'utf-8');
const lines = csvContent.split(/\r?\n/);

const twStocksMap = new Map();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const parts = line.split(',');
  if (parts.length < 15) continue;

  const code = parts[1].trim().toUpperCase();
  const name = parts[2].trim();
  const rawMarket = parts[14].trim();

  if (isValidTaiwanSecurity(code, name)) {
    let marketType = 'TWSE';
    let defaultCat = '上市股票';
    if (rawMarket.includes('TPEx') || rawMarket.includes('上櫃')) {
      marketType = 'TPEX';
      defaultCat = '上櫃股票';
    }
    if (code.startsWith('00')) {
      defaultCat = name.includes('債') ? '債券ETF' : (name.includes('高息') || name.includes('高股息')) ? '高股息ETF' : 'ETF';
    } else if (code.endsWith('A') || code.endsWith('B')) {
      defaultCat = '特別股';
    }

    const existing = existingCategoryMap.get(code);
    const finalName = name || (existing ? existing.name : code);
    const finalCategory = (existing && existing.category) ? existing.category : defaultCat;

    twStocksMap.set(code, {
      symbol: code,
      name: finalName,
      market: 'TW',
      category: finalCategory,
      source: marketType,
    });
  }
}

// 3.1 讀取全市場標的歷史數據庫索引總表.csv (補足其餘標的至 2340+ 檔)
const fullIndexCsvPath = 'D:\\APP\\諮詢\\私人\\股市\\台股加權指數_歷史數據\\上市櫃股票與債券_歷史數據\\全市場標的歷史數據庫索引總表.csv';
if (fs.existsSync(fullIndexCsvPath)) {
  const fullIndexContent = fs.readFileSync(fullIndexCsvPath, 'utf-8');
  const fullLines = fullIndexContent.split(/\r?\n/);
  for (let i = 1; i < fullLines.length; i++) {
    const line = fullLines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 3) continue;

    const code = parts[0].trim().toUpperCase();
    const name = parts[1].trim();
    const rawMarket = parts[2].trim();

    if (isValidTaiwanSecurity(code, name) && !twStocksMap.has(code)) {
      let marketType = 'TWSE';
      let defaultCat = '上市股票';
      if (rawMarket.includes('TPEx') || rawMarket.includes('上櫃')) {
        marketType = 'TPEX';
        defaultCat = '上櫃股票';
      }
      if (code.startsWith('00')) {
        defaultCat = name.includes('債') ? '債券ETF' : (name.includes('高息') || name.includes('高股息')) ? '高股息ETF' : 'ETF';
      } else if (code.endsWith('A') || code.endsWith('B')) {
        defaultCat = '特別股';
      }

      const existing = existingCategoryMap.get(code);
      const finalName = name || (existing ? existing.name : code);
      const finalCategory = (existing && existing.category) ? existing.category : defaultCat;

      twStocksMap.set(code, {
        symbol: code,
        name: finalName,
        market: 'TW',
        category: finalCategory,
        source: marketType,
      });
    }
  }
}

// 確保既有的所有 TW stocks 也不會被漏掉
for (const [code, item] of existingCategoryMap.entries()) {
  if (!twStocksMap.has(code) && isValidTaiwanSecurity(code, item.name)) {
    twStocksMap.set(code, {
      symbol: code,
      name: item.name,
      market: 'TW',
      category: item.category || '台股標的',
      source: 'TWSE',
    });
  }
}

console.log(`Total valid TW stocks compiled: ${twStocksMap.size}`);

// 排序：ETF (00開頭) 放前，其餘按代碼排序
const sortedTwStocks = Array.from(twStocksMap.values()).sort((a, b) => {
  const aIsEtf = a.symbol.startsWith('00');
  const bIsEtf = b.symbol.startsWith('00');
  if (aIsEtf && !bIsEtf) return -1;
  if (!aIsEtf && bIsEtf) return 1;
  return a.symbol.localeCompare(b.symbol);
});

// 生成新的 stockDictionary.ts
let newTsContent = `import { StockDictionaryItem } from '../types/stockDictionary';

/**
 * 台股全市場官方標的靜態種子資料庫 (共 ${sortedTwStocks.length} 檔)
 * 涵蓋全上市櫃股票、ETF、特別股與合法證券，100% 離線中文化覆蓋
 */
export const STATIC_TW_STOCKS: StockDictionaryItem[] = [\n`;

for (const s of sortedTwStocks) {
  newTsContent += `  { symbol: '${s.symbol}', name: '${s.name}', market: 'TW', category: '${s.category}', source: '${s.source}' },\n`;
}

newTsContent += `];

/**
 * 美股主流靜態種子資料庫 (S&P 500 與主要熱門 ETF，共 500+ 檔)
 */
export const STATIC_US_STOCKS: StockDictionaryItem[] = [
${usStocksBlock}
];

/**
 * 完整靜態字典清單
 */
export const STATIC_STOCK_DICTIONARY: StockDictionaryItem[] = [
  ...STATIC_TW_STOCKS,
  ...STATIC_US_STOCKS,
];

/**
 * 快速鍵值字典：以代碼大寫為 Key，對應繁體中文名稱
 */
export const STATIC_SECURITY_NAMES: Record<string, string> = STATIC_STOCK_DICTIONARY.reduce(
  (acc, item) => {
    acc[item.symbol.toUpperCase()] = item.name;
    return acc;
  },
  {} as Record<string, string>
);
`;

fs.writeFileSync(stockDictTsPath, newTsContent, 'utf-8');
console.log(`Successfully updated ${stockDictTsPath}`);
