import { TradeRecord } from '../types/stock';

const STORAGE_KEY = 'STOCK_TRACKER_TRADES_V1';
const RATE_STORAGE_KEY = 'STOCK_TRACKER_USD_TWD_RATE';

export function loadTradesFromStorage(): TradeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSampleTrades();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
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
  const headers = ['日期', '市場', '代碼', '名稱', '類別', '股數', '單價', '幣別', '手續費', '稅費', '標籤', '備註'];
  const rows = trades.map(t => [
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
    `"${(t.tags || []).join(';')}"`,
    `"${(t.note || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
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
