import { TradeRecord, MarketType, TradeType, Currency } from '../types/stock';

const STORAGE_KEY = 'STOCK_TRACKER_TRADES_V1';
const RATE_STORAGE_KEY = 'STOCK_TRACKER_USD_TWD_RATE';
const PRICES_STORAGE_KEY = 'STOCK_TRACKER_CUSTOM_PRICES_V1';

export function loadTradesFromStorage(): TradeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSampleTrades();
    const parsed = JSON.parse(raw);
    const validated = validateTradesSchema(parsed);
    if (validated) return validated;
    return getDefaultSampleTrades();
  } catch (err) {
    console.error('Failed to load trades from localStorage:', err);
    return getDefaultSampleTrades();
  }
}

export function saveTradesToStorage(trades: TradeRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  } catch (err) {
    console.error('Failed to save trades to localStorage:', err);
  }
}

export function loadExchangeRate(): number {
  try {
    const raw = localStorage.getItem(RATE_STORAGE_KEY);
    if (raw) {
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0) return val;
    }
    return 32.5;
  } catch {
    return 32.5;
  }
}

export function saveExchangeRate(rate: number): void {
  try {
    localStorage.setItem(RATE_STORAGE_KEY, rate.toString());
  } catch (err) {
    console.error('Failed to save exchange rate:', err);
  }
}

export function loadCustomPricesFromStorage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PRICES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const validPrices: Record<string, number> = {};
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof val === 'number' && !isNaN(val) && val >= 0) {
          validPrices[key] = val;
        }
      }
      return validPrices;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveCustomPricesToStorage(prices: Record<string, number>): void {
  try {
    localStorage.setItem(PRICES_STORAGE_KEY, JSON.stringify(prices));
  } catch (err) {
    console.error('Failed to save custom prices:', err);
  }
}

export function validateTradesSchema(data: unknown): TradeRecord[] | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const validTypes = new Set<TradeType>([
    'BUY',
    'SELL',
    'DIVIDEND',
    'STOCK_DIVIDEND',
    'STOCK_SPLIT',
    'CAPITAL_REDUCTION',
    'CAPITAL_INCREASE',
  ]);

  const validTrades: TradeRecord[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') return null;

    const t = item as Partial<TradeRecord>;
    if (
      typeof t.date !== 'string' || !t.date ||
      typeof t.symbol !== 'string' || !t.symbol ||
      (t.market !== 'TW' && t.market !== 'US') ||
      !validTypes.has(t.type as TradeType)
    ) {
      return null;
    }

    validTrades.push({
      id: t.id || `trade-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      date: t.date,
      symbol: t.symbol.toUpperCase(),
      name: t.name || t.symbol,
      market: t.market as MarketType,
      currency: (t.currency || (t.market === 'TW' ? 'TWD' : 'USD')) as Currency,
      type: t.type as TradeType,
      shares: typeof t.shares === 'number' && !isNaN(t.shares) ? t.shares : 0,
      price: typeof t.price === 'number' && !isNaN(t.price) ? t.price : 0,
      fee: typeof t.fee === 'number' ? t.fee : 0,
      tax: typeof t.tax === 'number' ? t.tax : 0,
      ratio: typeof t.ratio === 'number' ? t.ratio : undefined,
      cashAmount: typeof t.cashAmount === 'number' ? t.cashAmount : undefined,
      exDate: typeof t.exDate === 'string' ? t.exDate : undefined,
      tags: Array.isArray(t.tags) ? t.tags : [],
      note: t.note || '',
      createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
    });
  }

  return validTrades;
}

export function mergeTrades(existing: TradeRecord[], incoming: TradeRecord[]): TradeRecord[] {
  const existingIds = new Set(existing.map((t) => t.id));
  const newTrades: TradeRecord[] = [];

  for (const item of incoming) {
    let tradeToAdd = item;
    if (!tradeToAdd.id) {
      tradeToAdd = {
        ...tradeToAdd,
        id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdAt: tradeToAdd.createdAt || Date.now(),
      };
    }
    if (!existingIds.has(tradeToAdd.id)) {
      newTrades.push(tradeToAdd);
      existingIds.add(tradeToAdd.id);
    }
  }

  return [...newTrades, ...existing];
}

// 輔助函式：解析包含引號與逗號之單行 CSV
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export interface ParseCSVResult {
  trades: TradeRecord[];
  successCount: number;
  skippedCount: number;
}

export function parseCSVToTrades(csvText: string): ParseCSVResult {
  // 移除 BOM
  let cleaned = csvText;
  if (cleaned.charCodeAt(0) === 0xFEFF) {
    cleaned = cleaned.slice(1);
  }

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { trades: [], successCount: 0, skippedCount: 0 };
  }

  // 表頭映射
  const headerLine = lines[0];
  const headerCols = parseCSVLine(headerLine).map((h) => h.toLowerCase().replace(/["']/g, '').trim());

  const getColIndex = (names: string[]): number => {
    return headerCols.findIndex((col) => names.some((n) => col.includes(n.toLowerCase())));
  };

  const idxDate = getColIndex(['日期', 'date']);
  const idxMarket = getColIndex(['市場', 'market']);
  const idxSymbol = getColIndex(['代碼', 'symbol', 'code']);
  const idxName = getColIndex(['名稱', 'name']);
  const idxType = getColIndex(['類別', 'type', 'action']);
  const idxShares = getColIndex(['股數', 'shares', 'qty', 'quantity']);
  const idxPrice = getColIndex(['單價', 'price']);
  const idxCurrency = getColIndex(['幣別', 'currency']);
  const idxFee = getColIndex(['手續費', 'fee']);
  const idxTax = getColIndex(['稅費', 'tax']);
  const idxRatio = getColIndex(['比例', 'ratio', '折數']);
  const idxCashAmount = getColIndex(['退款', 'cashamount', '現金金額', '金額']);
  const idxExDate = getColIndex(['基準日', 'exdate', '除權息日']);
  const idxTags = getColIndex(['標籤', 'tags', 'tag']);
  const idxNote = getColIndex(['備註', 'note', 'memo']);

  const trades: TradeRecord[] = [];
  let skippedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const getVal = (idx: number): string => (idx >= 0 && idx < row.length ? row[idx] : '');

    const rawDate = getVal(idxDate);
    const rawMarket = getVal(idxMarket).toUpperCase();
    const rawSymbol = getVal(idxSymbol).toUpperCase();
    const rawName = getVal(idxName);
    const rawType = getVal(idxType).toUpperCase();
    const rawShares = parseFloat(getVal(idxShares));
    const rawPrice = parseFloat(getVal(idxPrice));
    const rawCurrency = getVal(idxCurrency).toUpperCase();
    const rawFee = parseFloat(getVal(idxFee)) || 0;
    const rawTax = parseFloat(getVal(idxTax)) || 0;
    const rawRatio = parseFloat(getVal(idxRatio));
    const rawCashAmount = parseFloat(getVal(idxCashAmount));
    const rawExDate = getVal(idxExDate);
    const rawTags = getVal(idxTags);
    const rawNote = getVal(idxNote);

    // 格式防呆檢查
    const market: MarketType = rawMarket === 'US' ? 'US' : rawMarket === 'TW' ? 'TW' : rawSymbol.length >= 4 && /^\d+$/.test(rawSymbol) ? 'TW' : 'US';

    let type: TradeType = 'BUY';
    if (rawType.includes('STOCK_DIV') || rawType.includes('除權') || rawType.includes('配股')) {
      type = 'STOCK_DIVIDEND';
    } else if (rawType.includes('SPLIT') || rawType.includes('分割') || rawType.includes('拆股')) {
      type = 'STOCK_SPLIT';
    } else if (rawType.includes('REDUCTION') || rawType.includes('減資')) {
      type = 'CAPITAL_REDUCTION';
    } else if (rawType.includes('INCREASE') || rawType.includes('增資') || rawType.includes('認股')) {
      type = 'CAPITAL_INCREASE';
    } else if (rawType.includes('DIV') || rawType.includes('息')) {
      type = 'DIVIDEND';
    } else if (rawType.includes('SELL') || rawType.includes('賣')) {
      type = 'SELL';
    } else {
      type = 'BUY';
    }

    const currency: Currency = rawCurrency === 'USD' ? 'USD' : rawCurrency === 'TWD' ? 'TWD' : market === 'TW' ? 'TWD' : 'USD';

    if (!rawDate || !rawSymbol) {
      skippedCount++;
      continue;
    }

    if (
      (type === 'BUY' || type === 'SELL' || type === 'CAPITAL_INCREASE') &&
      (isNaN(rawShares) || rawShares <= 0 || isNaN(rawPrice) || rawPrice < 0)
    ) {
      skippedCount++;
      continue;
    }

    const tags = rawTags
      ? rawTags.split(/[;,]/).map((t) => t.trim()).filter((t) => t.length > 0)
      : [];

    trades.push({
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      date: rawDate,
      symbol: rawSymbol,
      name: rawName || rawSymbol,
      market,
      currency,
      type,
      shares: isNaN(rawShares) ? 0 : rawShares,
      price: isNaN(rawPrice) ? 0 : rawPrice,
      fee: isNaN(rawFee) ? 0 : rawFee,
      tax: isNaN(rawTax) ? 0 : rawTax,
      ratio: !isNaN(rawRatio) && rawRatio > 0 ? rawRatio : undefined,
      cashAmount: !isNaN(rawCashAmount) ? rawCashAmount : undefined,
      exDate: rawExDate || undefined,
      tags,
      note: rawNote,
      createdAt: Date.now() - (lines.length - i) * 1000,
    });
  }

  return {
    trades,
    successCount: trades.length,
    skippedCount,
  };
}

export function exportTradesToJSON(trades: TradeRecord[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(trades, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `stock_trades_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportTradesToCSV(trades: TradeRecord[]): void {
  const headers = ['日期', '市場', '代碼', '名稱', '類別', '股數', '單價', '幣別', '手續費', '稅費', '比例', '退款/配發金額', '基準日', '標籤', '備註'];
  const rows = trades.map((t) => [
    t.date,
    t.market,
    t.symbol,
    `"${(t.name || '').replace(/"/g, '""')}"`,
    t.type,
    t.shares,
    t.price,
    t.currency,
    t.fee,
    t.tax,
    t.ratio !== undefined ? t.ratio : '',
    t.cashAmount !== undefined ? t.cashAmount : '',
    t.exDate || '',
    `"${(t.tags || []).join(';')}"`,
    `"${(t.note || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', `stock_trades_backup_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function getDefaultSampleTrades(): TradeRecord[] {
  return [
    {
      id: 'trade-tw-1',
      date: '2026-01-05',
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      currency: 'TWD',
      type: 'BUY',
      shares: 1000,
      price: 620,
      fee: 883,
      tax: 0,
      tags: ['核心持股', '晶圓代工'],
      note: '長線定期定額建倉',
      createdAt: Date.now() - 10000000,
    },
    {
      id: 'trade-tw-2',
      date: '2026-02-12',
      symbol: '0050',
      name: '元大台灣50',
      market: 'TW',
      currency: 'TWD',
      type: 'BUY',
      shares: 2000,
      price: 165,
      fee: 470,
      tax: 0,
      tags: ['大盤指數', '被動投資'],
      note: '大盤回檔加碼',
      createdAt: Date.now() - 8000000,
    },
    {
      id: 'trade-us-1',
      date: '2026-01-15',
      symbol: 'NVDA',
      name: 'NVIDIA Corp.',
      market: 'US',
      currency: 'USD',
      type: 'BUY',
      shares: 25,
      price: 110,
      fee: 0,
      tax: 0,
      tags: ['AI動能', '美股核心'],
      note: 'AI伺服器需求強勁',
      createdAt: Date.now() - 6000000,
    },
    {
      id: 'trade-us-2',
      date: '2026-02-01',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'US',
      currency: 'USD',
      type: 'BUY',
      shares: 15,
      price: 220,
      fee: 0,
      tax: 0,
      tags: ['護城河', '美股核心'],
      note: '蘋果生態系護城河',
      createdAt: Date.now() - 4000000,
    },
    {
      id: 'trade-us-3',
      date: '2026-02-20',
      symbol: 'NVDA',
      name: 'NVIDIA Corp.',
      market: 'US',
      currency: 'USD',
      type: 'SELL',
      shares: 5,
      price: 140,
      fee: 0.5,
      tax: 0,
      tags: ['停利', '波段'],
      note: '部分獲利入袋再平衡',
      createdAt: Date.now() - 2000000,
    }
  ];
}
