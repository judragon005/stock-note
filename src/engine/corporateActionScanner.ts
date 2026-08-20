import { TradeRecord, TradeType, MarketType, Currency } from '../types/stock';
import { getHoldingsAsOfDate } from './calculator';

export interface RawCorporateEvent {
  symbol: string;
  market: MarketType;
  type: TradeType; // 'DIVIDEND' | 'STOCK_DIVIDEND' | 'STOCK_SPLIT' | 'CAPITAL_REDUCTION' | 'CAPITAL_INCREASE'
  date: string; // YYYY-MM-DD
  price?: number; // 每股配息或減資退款
  ratio?: number; // 分割比率或配股率
  shares?: number; // 變更股數
  cashAmount?: number; // 總退款或入帳金額
  description?: string;
}

export interface ScannedCorporateAction {
  id: string;
  symbol: string;
  name: string;
  market: MarketType;
  currency: Currency;
  type: TradeType;
  date: string;
  exDate?: string;
  ratio?: number;
  price?: number;
  sharesHeldOnDate: number;
  estimatedSharesChange: number;
  estimatedCashAmount: number;
  description: string;
  isAlreadyRecorded: boolean;
}

/**
 * 內建台美熱門標的公開歷史除權息與分割資料庫（支援離線/容錯/無網路時優雅降級）
 */
const BUILT_IN_EVENT_REGISTRY: RawCorporateEvent[] = [
  // 台積電 (2330)
  { symbol: '2330', market: 'TW', type: 'DIVIDEND', date: '2024-03-18', price: 3.5, description: '2023Q3 現金股利每股 3.5 元' },
  { symbol: '2330', market: 'TW', type: 'DIVIDEND', date: '2024-06-13', price: 3.5, description: '2023Q4 現金股利每股 3.5 元' },
  { symbol: '2330', market: 'TW', type: 'DIVIDEND', date: '2024-09-12', price: 4.0, description: '2024Q1 現金股利每股 4.0 元' },
  { symbol: '2330', market: 'TW', type: 'DIVIDEND', date: '2024-12-12', price: 4.0, description: '2024Q2 現金股利每股 4.0 元' },
  { symbol: '2330', market: 'TW', type: 'DIVIDEND', date: '2025-03-18', price: 4.5, description: '2024Q3 現金股利每股 4.5 元' },
  { symbol: '2330', market: 'TW', type: 'DIVIDEND', date: '2025-06-12', price: 4.5, description: '2024Q4 現金股利每股 4.5 元' },
  { symbol: '2330', market: 'TW', type: 'DIVIDEND', date: '2025-09-18', price: 5.0, description: '2025Q1 現金股利每股 5.0 元' },

  // 元大台灣50 (0050)
  { symbol: '0050', market: 'TW', type: 'DIVIDEND', date: '2024-01-17', price: 3.0, description: '2023 下半年度配息 3.0 元' },
  { symbol: '0050', market: 'TW', type: 'DIVIDEND', date: '2024-07-16', price: 1.0, description: '2024 上半年度配息 1.0 元' },
  { symbol: '0050', market: 'TW', type: 'DIVIDEND', date: '2025-01-16', price: 2.6, description: '2024 下半年度配息 2.6 元' },
  { symbol: '0050', market: 'TW', type: 'DIVIDEND', date: '2025-07-16', price: 1.5, description: '2025 上半年度配息 1.5 元' },

  // 國泰永續高股息 (00878)
  { symbol: '00878', market: 'TW', type: 'DIVIDEND', date: '2024-02-27', price: 0.40, description: '2024Q1 配息 0.40 元' },
  { symbol: '00878', market: 'TW', type: 'DIVIDEND', date: '2024-05-17', price: 0.51, description: '2024Q2 配息 0.51 元' },
  { symbol: '00878', market: 'TW', type: 'DIVIDEND', date: '2024-08-16', price: 0.55, description: '2024Q3 配息 0.55 元' },
  { symbol: '00878', market: 'TW', type: 'DIVIDEND', date: '2024-11-18', price: 0.55, description: '2024Q4 配息 0.55 元' },
  { symbol: '00878', market: 'TW', type: 'DIVIDEND', date: '2025-02-20', price: 0.55, description: '2025Q1 配息 0.55 元' },
  { symbol: '00878', market: 'TW', type: 'DIVIDEND', date: '2025-05-16', price: 0.55, description: '2025Q2 配息 0.55 元' },

  // 聯電 (2303)
  { symbol: '2303', market: 'TW', type: 'DIVIDEND', date: '2024-07-02', price: 3.0, description: '2023 年度現金股利 3.0 元' },
  { symbol: '2303', market: 'TW', type: 'DIVIDEND', date: '2025-07-03', price: 2.8, description: '2024 年度現金股利 2.8 元' },

  // 玉山金 (2884)
  { symbol: '2884', market: 'TW', type: 'DIVIDEND', date: '2024-07-25', price: 1.2, description: '2023 年度現金股利 1.2 元' },
  { symbol: '2884', market: 'TW', type: 'STOCK_DIVIDEND', date: '2024-07-25', ratio: 0.02, description: '2023 年度股票股利每股配 0.2 元 (配股率 0.02)' },
  { symbol: '2884', market: 'TW', type: 'DIVIDEND', date: '2025-07-24', price: 1.3, description: '2024 年度現金股利 1.3 元' },
  { symbol: '2884', market: 'TW', type: 'STOCK_DIVIDEND', date: '2025-07-24', ratio: 0.015, description: '2024 年度股票股利每股配 0.15 元' },

  // 美股 NVDA
  { symbol: 'NVDA', market: 'US', type: 'STOCK_SPLIT', date: '2024-06-10', ratio: 10, description: '1 拆 10 股票分割 (10-for-1 Stock Split)' },
  { symbol: 'NVDA', market: 'US', type: 'DIVIDEND', date: '2024-06-11', price: 0.01, description: '2024Q2 季度股息 $0.01' },
  { symbol: 'NVDA', market: 'US', type: 'DIVIDEND', date: '2024-09-12', price: 0.01, description: '2024Q3 季度股息 $0.01' },
  { symbol: 'NVDA', market: 'US', type: 'DIVIDEND', date: '2024-12-05', price: 0.01, description: '2024Q4 季度股息 $0.01' },
  { symbol: 'NVDA', market: 'US', type: 'DIVIDEND', date: '2025-03-12', price: 0.01, description: '2025Q1 季度股息 $0.01' },

  // 美股 AAPL
  { symbol: 'AAPL', market: 'US', type: 'DIVIDEND', date: '2024-02-09', price: 0.24, description: '2024Q1 季度股息 $0.24' },
  { symbol: 'AAPL', market: 'US', type: 'DIVIDEND', date: '2024-05-10', price: 0.25, description: '2024Q2 季度股息 $0.25' },
  { symbol: 'AAPL', market: 'US', type: 'DIVIDEND', date: '2024-08-12', price: 0.25, description: '2024Q3 季度股息 $0.25' },
  { symbol: 'AAPL', market: 'US', type: 'DIVIDEND', date: '2024-11-08', price: 0.25, description: '2024Q4 季度股息 $0.25' },
  { symbol: 'AAPL', market: 'US', type: 'DIVIDEND', date: '2025-02-10', price: 0.25, description: '2025Q1 季度股息 $0.25' },

  // 美股 VOO
  { symbol: 'VOO', market: 'US', type: 'DIVIDEND', date: '2024-03-22', price: 1.54, description: '2024Q1 季度配息 $1.54' },
  { symbol: 'VOO', market: 'US', type: 'DIVIDEND', date: '2024-06-28', price: 1.66, description: '2024Q2 季度配息 $1.66' },
  { symbol: 'VOO', market: 'US', type: 'DIVIDEND', date: '2024-09-27', price: 1.77, description: '2024Q3 季度配息 $1.77' },
  { symbol: 'VOO', market: 'US', type: 'DIVIDEND', date: '2024-12-20', price: 1.95, description: '2024Q4 季度配息 $1.95' },
];

/**
 * 線上即時查詢 Yahoo Finance API 或 TWSE 公開除權息資訊 (含 CORS 代理與快取容錯)
 */
export async function fetchLiveCorporateEvents(symbol: string, market: MarketType): Promise<RawCorporateEvent[]> {
  const events: RawCorporateEvent[] = [];
  const querySymbol = market === 'TW' ? `${symbol}.TW` : symbol;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?events=div%7Csplit&interval=1d&range=5y`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      const data = await response.json();
      const chartResult = data?.chart?.result?.[0];
      const rawDividends = chartResult?.events?.dividends;
      const rawSplits = chartResult?.events?.splits;

      if (rawDividends && typeof rawDividends === 'object') {
        for (const div of Object.values(rawDividends) as any[]) {
          const d = new Date(div.date * 1000).toISOString().split('T')[0];
          events.push({
            symbol: symbol.toUpperCase(),
            market,
            type: 'DIVIDEND',
            date: d,
            price: Number(div.amount) || 0,
            description: `現金股利每股 ${div.amount} ${market === 'TW' ? 'TWD' : 'USD'}`,
          });
        }
      }

      if (rawSplits && typeof rawSplits === 'object') {
        for (const spl of Object.values(rawSplits) as any[]) {
          const d = new Date(spl.date * 1000).toISOString().split('T')[0];
          const ratio = (spl.numerator || 1) / (spl.denominator || 1);
          events.push({
            symbol: symbol.toUpperCase(),
            market,
            type: 'STOCK_SPLIT',
            date: d,
            ratio,
            description: `股票分割 ${spl.splitRatio || `${spl.numerator}:${spl.denominator}`}`,
          });
        }
      }
    }
  } catch {
    // 網路請求超時或受限，優雅降級為使用內建資料庫
  }

  // 融合內建資料庫補充
  const fallbackEvents = BUILT_IN_EVENT_REGISTRY.filter((e) => e.symbol.toUpperCase() === symbol.toUpperCase());
  for (const fb of fallbackEvents) {
    if (!events.some((ev) => ev.date === fb.date && ev.type === fb.type)) {
      events.push(fb);
    }
  }

  return events;
}

/**
 * 智慧掃描使用者持股期間的所有公司行動
 */
export async function scanCorporateActions(
  trades: TradeRecord[],
  customFetcher?: (symbol: string, market: MarketType) => Promise<RawCorporateEvent[]>
): Promise<ScannedCorporateAction[]> {
  // 1. 整理使用者曾持有過的所有標的與名稱、市場
  const symbolMap = new Map<string, { symbol: string; name: string; market: MarketType; currency: Currency }>();
  for (const t of trades) {
    if (!symbolMap.has(t.symbol)) {
      symbolMap.set(t.symbol, {
        symbol: t.symbol,
        name: t.name || t.symbol,
        market: t.market || (t.currency === 'USD' ? 'US' : 'TW'),
        currency: t.currency || (t.market === 'US' ? 'USD' : 'TWD'),
      });
    }
  }

  const results: ScannedCorporateAction[] = [];

  for (const [symbol, info] of symbolMap.entries()) {
    // 取得該標的所有歷史公司行動
    let events: RawCorporateEvent[] = [];
    if (customFetcher) {
      events = await customFetcher(symbol, info.market);
    } else {
      events = await fetchLiveCorporateEvents(symbol, info.market);
    }

    for (const ev of events) {
      // 判定基準日當時持股
      const sharesHeld = getHoldingsAsOfDate(trades, ev.date, symbol);
      if (sharesHeld <= 0) {
        // 若該基準日當時並無持股，則不列入
        continue;
      }

      // 檢查是否已存在於現有交易中 (查重)
      const isAlreadyRecorded = trades.some((t) => {
        return (
          t.symbol.toUpperCase() === symbol.toUpperCase() &&
          t.date === ev.date &&
          t.type === ev.type
        );
      });

      let estimatedCash = 0;
      let estimatedShares = 0;

      if (ev.type === 'DIVIDEND') {
        const p = ev.price || 0;
        estimatedCash = ev.cashAmount !== undefined ? ev.cashAmount : sharesHeld * p;
      } else if (ev.type === 'STOCK_DIVIDEND') {
        const r = ev.ratio || (ev.price ? ev.price / 10 : 0);
        estimatedShares = ev.shares !== undefined ? ev.shares : Math.round(sharesHeld * r);
      } else if (ev.type === 'STOCK_SPLIT') {
        const r = ev.ratio || 1;
        estimatedShares = (sharesHeld * r) - sharesHeld;
      } else if (ev.type === 'CAPITAL_REDUCTION') {
        const r = ev.ratio || 0;
        estimatedShares = -(sharesHeld * r);
        const p = ev.price || 0;
        estimatedCash = ev.cashAmount !== undefined ? ev.cashAmount : sharesHeld * p;
      }

      results.push({
        id: `scanned-${symbol}-${ev.date}-${ev.type}`,
        symbol,
        name: info.name,
        market: info.market,
        currency: info.currency,
        type: ev.type,
        date: ev.date,
        exDate: ev.date,
        ratio: ev.ratio,
        price: ev.price,
        sharesHeldOnDate: sharesHeld,
        estimatedSharesChange: estimatedShares,
        estimatedCashAmount: estimatedCash,
        description: ev.description || `${symbol} ${ev.type}`,
        isAlreadyRecorded,
      });
    }
  }

  // 依日期倒序排列
  return results.sort((a, b) => b.date.localeCompare(a.date));
}
