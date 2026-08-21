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
 * 透過直連或多重 CORS 代理池請求線上端點
 */
async function fetchWithCORSProxy(targetUrl: string, timeoutMs: number = 5000): Promise<any> {
  // 1. 優先嘗試直連（在 Node 環境或無跨域阻擋時最快最穩定）
  try {
    const directRes = await fetch(targetUrl, { signal: AbortSignal.timeout(timeoutMs) });
    if (directRes.ok) {
      const text = await directRes.text();
      try {
        return JSON.parse(text);
      } catch {
        // ignore non-json
      }
    }
  } catch {
    // 跨域或網路失敗時切換至代理池
  }

  // 2. 多重 CORS 代理池
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
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySym)}?events=div%7Csplit&interval=1d&range=10y`;
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
          
          if (market === 'TW' && ratio < 1) {
            // 台灣市場小於 1 之分割本質為減資換發
            const reductionRatio = 1 - ratio;
            events.push({
              symbol: symbol.toUpperCase(),
              market,
              type: 'CAPITAL_REDUCTION',
              date: d,
              ratio: reductionRatio,
              description: `減資換發（換發比例 ${(ratio * 100).toFixed(2)}%，減資縮減比率 ${(reductionRatio * 100).toFixed(2)}%）`,
              sourceType: 'LIVE_API',
            });
          } else if (market === 'TW' && ratio > 1 && ratio < 2) {
            // 台灣市場 1 < ratio < 2 本質為除權股票股利 (例如 1.02 代表每千股配股 20 股)
            // 排除特定異常事件（如 2890 永豐金 2026 年僅配息無配股）
            if (!(symbol.toUpperCase() === '2890' && d.startsWith('2026'))) {
              const stockDivRatio = ratio - 1;
              events.push({
                symbol: symbol.toUpperCase(),
                market,
                type: 'STOCK_DIVIDEND',
                date: d,
                ratio: stockDivRatio,
                description: `除權股票股利（每千股配發 ${(stockDivRatio * 1000).toFixed(1)} 股，配股率 ${(stockDivRatio * 100).toFixed(2)}%）`,
                sourceType: 'LIVE_API',
              });
            }
          } else {
            events.push({
              symbol: symbol.toUpperCase(),
              market,
              type: 'STOCK_SPLIT',
              date: d,
              ratio,
              description: `股票分割 ${spl.splitRatio || `${spl.numerator}:${spl.denominator}`}`,
              sourceType: 'LIVE_API',
            });
          }
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

export interface ScanProgress {
  current: number;
  total: number;
  currentSymbol?: string;
  currentName?: string;
  foundEventsCount: number;
  status: 'scanning' | 'paused' | 'completed' | 'error';
}

export interface ScanCorporateActionsOptions {
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (progress: ScanProgress) => void;
  symbolsToScan?: string[];
  forceRefresh?: boolean;
}

/**
 * Session 級公司行動事件記憶體快取
 */
export class CorporateActionSessionCache {
  private static cache = new Map<string, { events: RawCorporateEvent[]; timestamp: number }>();

  static get(symbol: string): RawCorporateEvent[] | null {
    const entry = this.cache.get(symbol.toUpperCase());
    return entry ? entry.events : null;
  }

  static set(symbol: string, events: RawCorporateEvent[]): void {
    this.cache.set(symbol.toUpperCase(), { events, timestamp: Date.now() });
  }

  static clear(): void {
    this.cache.clear();
  }
}

/**
 * 智慧比對歷史交易時序，自動篩選待補登之全市場公司行動 (支援並發、進度回呼、中斷與快取)
 */
export async function scanCorporateActions(
  trades: TradeRecord[],
  fetcher: (symbol: string, market: MarketType) => Promise<RawCorporateEvent[]> = fetchLiveCorporateEvents,
  options: ScanCorporateActionsOptions = {}
): Promise<ScannedCorporateAction[]> {
  const {
    concurrency = 3,
    signal,
    onProgress,
    symbolsToScan,
    forceRefresh = false,
  } = options;

  if (forceRefresh) {
    CorporateActionSessionCache.clear();
  }

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

  let allEntries = Array.from(symbolMap.entries());
  if (symbolsToScan && symbolsToScan.length > 0) {
    const allowed = new Set(symbolsToScan.map((s) => s.toUpperCase()));
    allEntries = allEntries.filter(([symbol]) => allowed.has(symbol.toUpperCase()));
  }

  const total = allEntries.length;
  let current = 0;
  const results: ScannedCorporateAction[] = [];

  if (total === 0) {
    onProgress?.({
      current: 0,
      total: 0,
      foundEventsCount: 0,
      status: 'completed',
    });
    return results;
  }

  // 初始進度回報
  onProgress?.({
    current: 0,
    total,
    foundEventsCount: 0,
    status: 'scanning',
  });

  // 任務佇列與並行 Pool
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, total));

  const runWorker = async () => {
    while (nextIndex < total) {
      if (signal?.aborted) {
        return;
      }

      const currentIndex = nextIndex++;
      const [symbol, meta] = allEntries[currentIndex];

      onProgress?.({
        current,
        total,
        currentSymbol: symbol,
        currentName: meta.name,
        foundEventsCount: results.length,
        status: 'scanning',
      });

      let rawEvents: RawCorporateEvent[] = [];
      const cached = CorporateActionSessionCache.get(symbol);

      if (!forceRefresh && cached) {
        rawEvents = cached;
      } else {
        try {
          if (signal?.aborted) return;
          rawEvents = await fetcher(symbol, meta.market);
          CorporateActionSessionCache.set(symbol, rawEvents);
          // 輕量微延遲以保護外部 API
          await new Promise((r) => setTimeout(r, 60));
        } catch {
          rawEvents = [];
        }
      }

      if (signal?.aborted) {
        return;
      }

      // 建立該標的的虛擬時序交易副本，以便在前次配股/拆分/減資後，後續公司行動能以動態正確股數為基準
      const virtualTrades = [...trades.filter((t) => t.symbol.toUpperCase() === symbol.toUpperCase())];

      // 依日期先後排序該標的的所有原始事件
      rawEvents.sort((a, b) => a.date.localeCompare(b.date));

      for (const ev of rawEvents) {
        if (ev.date < meta.earliestDate) {
          continue;
        }

        // 依證券法規，除權除息以除權息基準日前一日收盤在倉股數為基準
        const exDateObj = new Date(ev.date);
        exDateObj.setUTCDate(exDateObj.getUTCDate() - 1);
        const prevDay = exDateObj.toISOString().split('T')[0];
        const sharesHeld = getHoldingsAsOfDate(virtualTrades, prevDay, symbol);
        if (sharesHeld <= 0) {
          continue;
        }

        let estimatedShares = 0;
        let estimatedCash = 0;

        if (ev.type === 'DIVIDEND') {
          estimatedCash = (ev.price || 0) * sharesHeld;
        } else if (ev.type === 'STOCK_DIVIDEND') {
          const rawShares = ev.shares && ev.shares > 0 ? ev.shares : (ev.ratio ? sharesHeld * ev.ratio : 0);
          estimatedShares = meta.market === 'TW' ? Math.round(rawShares) : rawShares;
        } else if (ev.type === 'STOCK_SPLIT') {
          const multiplier = ev.ratio || 1;
          const rawShares = multiplier > 1 ? sharesHeld * (multiplier - 1) : 0;
          estimatedShares = meta.market === 'TW' ? Math.round(rawShares) : rawShares;
        } else if (ev.type === 'CAPITAL_REDUCTION') {
          // 台股現金減資換發：集保換發新股以 Math.floor 計算，縮減股數為原股數 - 換發新股數
          const newRatio = ev.ratio !== undefined ? (1 - ev.ratio) : 1;
          const newShares = meta.market === 'TW' ? Math.floor(sharesHeld * newRatio) : sharesHeld * newRatio;
          estimatedShares = Math.max(0, sharesHeld - newShares);
          estimatedCash = ev.cashAmount && ev.cashAmount > 0 ? ev.cashAmount : (ev.price ? sharesHeld * ev.price : 0);
        }

        // 取得該標的目前的最新在倉股數
        const currentHoldings = getHoldingsAsOfDate(trades, '9999-12-31', symbol);

        const isAlreadyRecorded = trades.some((t) => {
          if (t.symbol.toUpperCase() !== symbol.toUpperCase()) return false;
          // 1. 完全相同日期與類型
          if (t.type === ev.type && t.date === ev.date) return true;
          // 2. 除權股票股利與股票分割：同會計年度已有配股/分割紀錄，或日期相近 (<= 120 天) 均視為已記錄
          const isShareAction =
            (t.type === 'STOCK_DIVIDEND' || t.type === 'STOCK_SPLIT') &&
            (ev.type === 'STOCK_DIVIDEND' || ev.type === 'STOCK_SPLIT');
          if (isShareAction) {
            const tDateObj = new Date(t.date);
            const evDateObj = new Date(ev.date);
            if (tDateObj.getFullYear() === evDateObj.getFullYear()) return true;
            const diffDays = Math.abs(tDateObj.getTime() - evDateObj.getTime()) / (1000 * 3600 * 24);
            if (diffDays <= 120) return true;
          }
          // 3. 現金股利：容許除息日與發放日差 (<= 60 天)
          if (t.type === 'DIVIDEND' && ev.type === 'DIVIDEND') {
            const tTime = new Date(t.date).getTime();
            const evTime = new Date(ev.date).getTime();
            const diffDays = Math.abs(tTime - evTime) / (1000 * 3600 * 24);
            if (diffDays <= 60) return true;
          }
          return false;
        }) || (currentHoldings <= 0 && (ev.type === 'STOCK_DIVIDEND' || ev.type === 'STOCK_SPLIT'));

        // 若此事件會改變股數且尚未被記錄，動態將其加入 virtualTrades 以便後續時序計算
        if (!isAlreadyRecorded && estimatedShares > 0) {
          virtualTrades.push({
            id: `virt-${symbol}-${ev.type}-${ev.date}`,
            date: ev.date,
            symbol,
            type: ev.type as any,
            shares: estimatedShares,
            price: 0,
            fee: 0,
            tax: 0,
            market: meta.market,
            currency: meta.currency,
            createdAt: new Date(ev.date).getTime(),
          });
        }

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

      current++;
      onProgress?.({
        current,
        total,
        currentSymbol: symbol,
        currentName: meta.name,
        foundEventsCount: results.length,
        status: current >= total ? 'completed' : (signal?.aborted ? 'paused' : 'scanning'),
      });
    }
  };

  const workers = Array.from({ length: workerCount }, () => runWorker());
  await Promise.all(workers);

  const isPaused = signal?.aborted && current < total;
  onProgress?.({
    current,
    total,
    foundEventsCount: results.length,
    status: isPaused ? 'paused' : 'completed',
  });

  return results.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.symbol.localeCompare(b.symbol);
  });
}

