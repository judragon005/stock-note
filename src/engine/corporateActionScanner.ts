import { TradeRecord, TradeType, MarketType, Currency } from '../types/stock';
import { getHoldingsAsOfDate } from './calculator';

export interface RawCorporateEvent {
  symbol: string;
  market: MarketType;
  type: TradeType;
  date: string; // YYYY-MM-DD
  price?: number; // 每股配息或減資退款
  ratio?: number; // 分割比率或配股率或減資比率
  shares?: number; // 變更股數
  cashAmount?: number; // 總退款或入帳金額
  description?: string;
  sourceType?: 'LIVE_API';
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
  sourceType: 'LIVE_API';
}

/**
 * 透過多重 CORS 代理池請求線上端點
 */
async function fetchWithCORSProxy(targetUrl: string, timeoutMs: number = 5000): Promise<any> {
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok) {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          // ignore non-json response
        }
      }
    } catch {
      // try next proxy
    }
  }
  return null;
}

/**
 * 將台灣民國年或 YYYYMMDD 格式轉換為標準 YYYY-MM-DD
 */
export function normalizeTWSEDate(rawDateStr: string): string {
  if (!rawDateStr) return '';
  const cleaned = rawDateStr.replace(/[^0-9]/g, '');
  if (cleaned.length === 7) {
    // 民國年 1140915
    const year = parseInt(cleaned.slice(0, 3), 10) + 1911;
    const month = cleaned.slice(3, 5);
    const day = cleaned.slice(5, 7);
    return `${year}-${month}-${day}`;
  }
  if (cleaned.length === 6) {
    // 民國年 990915
    const year = parseInt(cleaned.slice(0, 2), 10) + 1911;
    const month = cleaned.slice(2, 4);
    const day = cleaned.slice(4, 6);
    return `${year}-${month}-${day}`;
  }
  if (cleaned.length === 8) {
    // 西元年 20250915
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }
  return rawDateStr;
}

/**
 * 查詢台灣證交所 (TWSE) 官方減資預告表 (TWT48U_ALL)
 */
export async function fetchTWSECapitalReductions(symbol: string): Promise<RawCorporateEvent[]> {
  const events: RawCorporateEvent[] = [];
  try {
    const url = 'https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL';
    const data = await fetchWithCORSProxy(url, 4000);
    if (Array.isArray(data)) {
      const target = data.filter((item: any) => {
        const code = (item.Code || item['股票代號'] || item['公司代號'] || '').trim();
        return code === symbol;
      });

      for (const item of target) {
        const rawDate = item.Date || item['恢復買賣日期'] || item['最後交易日'] || item['減資換發新股基準日'] || '';
        const date = normalizeTWSEDate(rawDate);
        const refund = parseFloat(item.RefundPerShare || item['每股退還股款(元)'] || item['退還股款'] || '0') || 0;
        const ratioRaw = parseFloat(item.ReductionRatio || item['減資比率'] || '0') || 0;
        const ratio = ratioRaw > 1 ? ratioRaw / 100 : ratioRaw; // 28.28% -> 0.2828
        const reason = item.ReductionType || item['減資事由'] || '現金減資';

        if (date) {
          events.push({
            symbol: symbol.toUpperCase(),
            market: 'TW',
            type: 'CAPITAL_REDUCTION',
            date,
            price: refund,
            ratio: ratio > 0 ? ratio : undefined,
            description: `${reason}（減資比率 ${(ratio * 100).toFixed(2)}%，每股退款 ${refund} 元）`,
            sourceType: 'LIVE_API',
          });
        }
      }
    }
  } catch {
    // fallback gracefully
  }
  return events;
}

/**
 * 查詢台灣證交所 (TWSE) 除權除息預告表 (TWT49U_ALL)
 */
export async function fetchTWSEDividends(symbol: string): Promise<RawCorporateEvent[]> {
  const events: RawCorporateEvent[] = [];
  try {
    const url = 'https://openapi.twse.com.tw/v1/exchangeReport/TWT49U_ALL';
    const data = await fetchWithCORSProxy(url, 4000);
    if (Array.isArray(data)) {
      const target = data.filter((item: any) => {
        const code = (item.Code || item['股票代號'] || '').trim();
        return code === symbol;
      });

      for (const item of target) {
        const rawDate = item.Date || item['除權息日期'] || '';
        const date = normalizeTWSEDate(rawDate);
        const cashDiv = parseFloat(item.CashDividend || item['現金股利(元/股)'] || item['現金股利'] || '0') || 0;
        const stockDivRatio = parseFloat(item.StockDividend || item['無償配股率'] || '0') || 0;

        if (date) {
          if (cashDiv > 0) {
            events.push({
              symbol: symbol.toUpperCase(),
              market: 'TW',
              type: 'DIVIDEND',
              date,
              price: cashDiv,
              description: `現金股利每股 ${cashDiv} TWD`,
              sourceType: 'LIVE_API',
            });
          }
          if (stockDivRatio > 0) {
            events.push({
              symbol: symbol.toUpperCase(),
              market: 'TW',
              type: 'STOCK_DIVIDEND',
              date,
              ratio: stockDivRatio > 1 ? stockDivRatio / 100 : stockDivRatio,
              description: `股票股利配股率 ${stockDivRatio}`,
              sourceType: 'LIVE_API',
            });
          }
        }
      }
    }
  } catch {
    // fallback gracefully
  }
  return events;
}

/**
 * 線上即時查詢 Yahoo Finance API (支援台股上市/上櫃、美股全市場、ETF 與債券)
 */
export async function fetchYahooFinanceEvents(symbol: string, market: MarketType): Promise<RawCorporateEvent[]> {
  const events: RawCorporateEvent[] = [];
  const symbolCandidates = market === 'TW'
    ? [`${symbol}.TW`, `${symbol}.TWO`]
    : [symbol.toUpperCase()];

  for (const querySym of symbolCandidates) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySym)}?events=div%7Csplit&interval=1d&range=5y`;
      const data = await fetchWithCORSProxy(url, 4000);
      const chartResult = data?.chart?.result?.[0];
      const rawDividends = chartResult?.events?.dividends;
      const rawSplits = chartResult?.events?.splits;

      let found = false;

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
            sourceType: 'LIVE_API',
          });
          found = true;
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
            sourceType: 'LIVE_API',
          });
          found = true;
        }
      }

      if (found) break;
    } catch {
      // try next candidate
    }
  }

  return events;
}

/**
 * 線上即時查詢全市場公開除權息、減資與分割事件 (100% 純線上即時資料源)
 */
export async function fetchLiveCorporateEvents(symbol: string, market: MarketType): Promise<RawCorporateEvent[]> {
  const events: RawCorporateEvent[] = [];

  if (market === 'TW') {
    // 1. 台股優先查詢官方 TWSE 減資公開資料庫
    const reductionEvents = await fetchTWSECapitalReductions(symbol);
    events.push(...reductionEvents);

    // 2. 查詢 TWSE 除權息預告表
    const twseDivEvents = await fetchTWSEDividends(symbol);
    for (const ev of twseDivEvents) {
      if (!events.some((e) => e.date === ev.date && e.type === ev.type)) {
        events.push(ev);
      }
    }
  }

  // 3. 查詢 Yahoo Finance 全市場資料 (美股或台股歷史除權息/分割補充)
  const yahooEvents = await fetchYahooFinanceEvents(symbol, market);
  for (const ev of yahooEvents) {
    if (!events.some((e) => e.date === ev.date && e.type === ev.type)) {
      events.push(ev);
    }
  }

  return events;
}

/**
 * 智慧比對歷史交易時序，自動篩選待補登之全市場公司行動
 */
export async function scanCorporateActions(
  trades: TradeRecord[],
  fetcher: (symbol: string, market: MarketType) => Promise<RawCorporateEvent[]> = fetchLiveCorporateEvents
): Promise<ScannedCorporateAction[]> {
  const symbolMap = new Map<string, { market: MarketType; name: string; currency: Currency; earliestDate: string }>();

  for (const trade of trades) {
    if (!symbolMap.has(trade.symbol)) {
      symbolMap.set(trade.symbol, {
        market: trade.market,
        name: trade.name || trade.symbol,
        currency: trade.currency,
        earliestDate: trade.date,
      });
    } else {
      const entry = symbolMap.get(trade.symbol)!;
      if (trade.date < entry.earliestDate) {
        entry.earliestDate = trade.date;
      }
    }
  }

  const results: ScannedCorporateAction[] = [];

  for (const [symbol, meta] of symbolMap.entries()) {
    let rawEvents: RawCorporateEvent[] = [];
    try {
      rawEvents = await fetcher(symbol, meta.market);
    } catch {
      rawEvents = [];
    }

    for (const ev of rawEvents) {
      // 僅檢視在持股起始日 (earliestDate) 當日或之後發生的事件
      if (ev.date < meta.earliestDate) {
        continue;
      }

      // 依基準日時序推算持股數
      const sharesHeld = getHoldingsAsOfDate(trades, ev.date, symbol);

      // 若該基準日時尚未持有或已清倉 (持股 = 0)，則略過
      if (sharesHeld <= 0) {
        continue;
      }

      let estimatedShares = 0;
      let estimatedCash = 0;

      if (ev.type === 'DIVIDEND') {
        estimatedCash = (ev.price || 0) * sharesHeld;
      } else if (ev.type === 'STOCK_DIVIDEND') {
        estimatedShares = ev.shares && ev.shares > 0 ? ev.shares : (ev.ratio ? sharesHeld * ev.ratio : 0);
      } else if (ev.type === 'STOCK_SPLIT') {
        const multiplier = ev.ratio || 1;
        estimatedShares = multiplier > 1 ? sharesHeld * (multiplier - 1) : 0;
      } else if (ev.type === 'CAPITAL_REDUCTION') {
        estimatedShares = ev.shares && ev.shares > 0 ? ev.shares : (ev.ratio ? sharesHeld * ev.ratio : 0);
        estimatedCash = ev.cashAmount && ev.cashAmount > 0 ? ev.cashAmount : (ev.price ? sharesHeld * ev.price : 0);
      }

      // 檢查是否已在 TradeRecords 中記錄
      const isAlreadyRecorded = trades.some(
        (t) => t.symbol.toUpperCase() === symbol.toUpperCase() && t.type === ev.type && t.date === ev.date
      );

      results.push({
        id: `scan-${symbol}-${ev.type}-${ev.date}`,
        symbol,
        name: meta.name,
        market: meta.market,
        currency: meta.currency,
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
        sourceType: 'LIVE_API',
      });
    }
  }

  // 依日期與代碼排序
  return results.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.symbol.localeCompare(b.symbol);
  });
}
