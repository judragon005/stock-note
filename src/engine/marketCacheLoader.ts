import { MarketType } from '../types/stock';
import { DailyCandle, MuscleBookerIndicatorPoint } from '../types/indicators';
import { saveSymbolOhlcv, saveSymbolIndicators } from '../utils/db';
import { logger } from '../utils/logger';

export interface CachedStockData {
  symbol: string;
  name: string;
  date: string;
  quote?: DailyCandle | null;
  chips?: {
    foreignNetShares: number;
    trustNetShares: number;
    dealerNetShares: number;
    totalNetShares: number;
  } | null;
  indicator?: MuscleBookerIndicatorPoint | null;
}

export interface MarketCacheSummary {
  date: string;
  updatedAt: number;
  market: MarketType;
  totalSymbols: number;
  failedSymbols?: string[];
  durationMs: number;
  stocks: Record<string, CachedStockData>;
}

/**
 * 載入本地盤後快取總表 (0 網路延遲，熱載入秒讀)
 */
export async function loadMarketCacheSummary(
  market: MarketType
): Promise<MarketCacheSummary | null> {
  const fileName = market === 'TW' ? 'tw_market_summary.json' : 'us_market_summary.json';
  const cacheUrl = `/market-cache/${fileName}?_t=${Date.now()}`;

  try {
    const res = await fetch(cacheUrl);
    if (!res.ok) {
      return null;
    }
    const data: MarketCacheSummary = await res.json();
    return data;
  } catch (err) {
    logger.warn(`無法載入本地市場快取 [${market}]:`, err);
    return null;
  }
}

/**
 * 將快取資料在瀏覽器閒置時非同步批量同步至 IndexedDB
 */
export async function syncMarketCacheToIndexedDB(
  summary: MarketCacheSummary
): Promise<void> {
  if (!summary || !summary.stocks) return;

  const market = summary.market;
  const entries = Object.entries(summary.stocks);

  for (const [symbol, item] of entries) {
    try {
      if (item.quote) {
        await saveSymbolOhlcv({
          symbol,
          market,
          candles: [item.quote],
          updatedAt: Date.now(),
        });
      }
      if (item.indicator) {
        await saveSymbolIndicators({
          symbol,
          market,
          points: [item.indicator],
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      // 單檔寫入異常不阻斷整體流程
      logger.warn(`IndexedDB 快取沉澱跳過 [${symbol}]:`, err);
    }
  }
}

/**
 * 緊湊日 K 原始結構 { d, o, h, l, c, v }
 */
export interface RawCompactCandle {
  d: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

let compactHistoryPromise: Promise<Record<string, RawCompactCandle[]> | null> | null = null;

/**
 * 重設緊湊日 K 記憶體快取 (僅供測試或強制重載調用)
 */
export function resetCompactHistoryCache(): void {
  compactHistoryPromise = null;
}

/**
 * 按需載入台股全市場緊湊歷史日 K 數列並提取特定標的 (單例請求防重複)
 */
export async function loadSymbolCompactHistory(
  symbol: string
): Promise<DailyCandle[] | null> {
  const cleanSym = symbol.replace(/\.(TW|TWO)$/i, '').trim().toUpperCase();

  if (!compactHistoryPromise) {
    compactHistoryPromise = (async () => {
      try {
        const res = await fetch('/market-cache/tw_market_ohlcv_compact.json');
        if (!res.ok) {
          logger.warn(`無法讀取 tw_market_ohlcv_compact.json (HTTP ${res.status})`);
          compactHistoryPromise = null;
          return null;
        }
        const data: Record<string, RawCompactCandle[]> = await res.json();
        return data;
      } catch (err) {
        logger.warn('載入 tw_market_ohlcv_compact.json 失敗:', err);
        compactHistoryPromise = null;
        return null;
      }
    })();
  }

  const allCompact = await compactHistoryPromise;
  if (!allCompact || !allCompact[cleanSym] || allCompact[cleanSym].length === 0) {
    return null;
  }

  return allCompact[cleanSym].map((c) => ({
    date: c.d,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
    volume: c.v,
  }));
}

/**
 * 從每日盤後總表快取取得標的當日最新單筆行情 (若存在)
 */
export async function getLatestSummaryQuote(
  symbol: string
): Promise<DailyCandle | null> {
  const cleanSym = symbol.replace(/\.(TW|TWO)$/i, '').trim().toUpperCase();
  const summary = await loadMarketCacheSummary('TW');
  if (!summary || !summary.stocks) return null;

  const stock = summary.stocks[cleanSym] || summary.stocks[symbol];
  return stock?.quote || null;
}

/**
 * 取得台股櫃買別名候選清單 (Debt 0043 / Spec 0168 防禦性探測)
 * 若以標準代碼查無數據，自動嘗試尾綴 O；若帶 O 查無數據，嘗試去 O。
 */
export function getOtcAliasCandidates(symbol: string, market: MarketType = 'TW'): string[] {
  const clean = symbol.replace(/\.(TW|TWO|US)$/i, '').trim().toUpperCase();
  if (!clean) return [];
  if (market !== 'TW') {
    if (clean.includes('.')) {
      return [clean, clean.replace(/\./g, '-')];
    }
    if (clean.includes('-')) {
      return [clean, clean.replace(/-/g, '.')];
    }
    return [clean];
  }

  if (/^\d{2,}[A-Z0-9]*$/.test(clean)) {
    if (clean.endsWith('O') && clean.length >= 4) {
      return [clean, clean.slice(0, -1)];
    }
    return [clean, `${clean}O`];
  }
  return [clean];
}

/**
 * 優先從本地 Vite SQLite 數據湖倉載入標的歷史 250 天日 K，並非同步沉澱至 IndexedDB；
 * 若本地 API 不可用或處於離線環境，平滑降級為 Compact JSON 或已沉澱快取。
 */
export async function loadSymbolHistoryFromLakehouse(
  symbol: string,
  market: MarketType = 'TW'
): Promise<DailyCandle[] | null> {
  const cleanSym = symbol.replace(/\.(TW|TWO)$/i, '').trim().toUpperCase();
  const candidates = getOtcAliasCandidates(cleanSym, market);

  // 1. 優先嘗試請求本地 SQLite API (支援別名探測)
  for (const candidate of candidates) {
    try {
      const res = await fetch(`/api/market/history/${encodeURIComponent(candidate)}?limit=250`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.candles) && data.candles.length > 0) {
          const chipsMap = data.chips && typeof data.chips === 'object' ? data.chips : {};
          const candles: DailyCandle[] = data.candles.map((c: any) => ({
            date: c.date,
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
            volume: Number(c.volume),
            transactions: c.transactions != null ? Number(c.transactions) : undefined,
            foreignNetBuy: chipsMap[c.date]?.foreign_net != null ? Number(chipsMap[c.date].foreign_net) : undefined,
            trustNetBuy: chipsMap[c.date]?.trust_net != null ? Number(chipsMap[c.date].trust_net) : undefined,
            dealerNetBuy: chipsMap[c.date]?.dealer_net != null ? Number(chipsMap[c.date].dealer_net) : undefined,
          }));

          // 非同步沉澱至 IndexedDB (統一以請求標準代碼沉澱)
          saveSymbolOhlcv({
            symbol: cleanSym,
            market,
            candles,
            updatedAt: Date.now(),
          }).catch((err) => {
            logger.warn(`[marketCacheLoader] IndexedDB 沉澱失敗 (${cleanSym}):`, err);
          });

          return candles;
        }
      }
    } catch (err) {
      // 忽略網路錯誤，繼續下一個別名候選或平滑降級
    }
  }

  // 2. 降級策略：台股標的嘗試使用既有 compact 快取
  if (market === 'TW') {
    try {
      const compactCandles = await loadSymbolCompactHistory(cleanSym);
      if (compactCandles && compactCandles.length > 0) {
        return compactCandles;
      }
    } catch (err) {
      // 忽略
    }
  }

  return null;
}

export interface LakehouseSymbolMeta {
  symbol?: string;
  name?: string;
  market?: string;
  exchange?: string;
  type?: string;
  status?: 'NORMAL' | 'ATTENTION' | 'DISPOSITION' | string;
  industry?: string;
}

export interface LakehouseFullPayload {
  meta?: LakehouseSymbolMeta;
  candles: DailyCandle[];
  institutionalRecords?: Array<{
    date: string;
    foreignShares: number;
    trustShares: number;
    dealerShares: number;
    marginBalance?: number;
    shortBalance?: number;
    sblBalance?: number;
    dayTradeRate?: number;
  }>;
  marginBalance?: number;
  marginBalanceChange?: number;
  shortBalance?: number;
  shortBalanceChange?: number;
  sblBalance?: number;
  dayTradeRate?: number;
  tdccRecords?: Array<{
    date: string;
    totalShareholders?: number;
    over400Ratio?: number;
    over1000Ratio?: number;
    under10Ratio?: number;
  }>;
  revenueRecords?: Array<{
    yearMonth: string;
    revenue: number;
    lastYearRevenue?: number;
    yoyRate?: number;
    momRate?: number;
    isAllTimeHigh?: number;
  }>;
  marginAsOfDate?: string;
  macro?: any;
  pledge?: {
    report_date?: string;
    pledged_shares?: number;
    total_director_shares?: number;
    pledge_ratio?: number;
    insider_transfer_shares?: number;
  };
  valuation?: {
    pe?: number | null;
    forwardPe?: number | null;
    pb?: number | null;
    psRatio?: number | null;
    dividendYield?: number | null;
    asOfDate?: string;
    history?: Array<{
      pe?: number | null;
      pb?: number | null;
      dividendYield?: number | null;
      date?: string;
    }>;
  };
  us13fData?: {
    institutionalRatio?: number;
    insiderRatio?: number;
    shortFloatRatio?: number;
    publicFloatRatio?: number;
    isSqueezeRisk?: boolean;
    asOfQuarterText?: string;
  };
  etfMeta?: {
    aumBillion?: number;
    expenseRatio?: number | null;
    trackingIndex?: string;
    issuer?: string;
  };
  quarterlyFinancials?: Array<{
    symbol: string;
    market: string;
    year: number;
    quarter: number;
    periodDate?: string;
    revenue?: number | null;
    grossProfit?: number | null;
    operatingIncome?: number | null;
    netIncome?: number | null;
    eps?: number | null;
  }>;
  enrichmentPending?: boolean;
  etfNav?: {
    date: string;
    closePrice?: number;
    nav?: number;
    premiumDiscountRatio?: number;
    issuedUnits?: number;
    unitChange?: number;
    aumBillion?: number;
  };
  etfNavHistory?: Array<{
    date: string;
    nav?: number;
    closePrice?: number;
    premiumDiscountRatio?: number;
  }>;
  corporateActions?: Array<{
    exDate: string;
    paymentDate?: string;
    cashDividendPerShare?: number;
    stockDividendRatio?: number;
    mandatoryBuybackDate?: string;
  }>;
}

/**
 * 從本地 SQLite 湖倉同時載入標的歷史日 K、三大法人籌碼、集保大戶與月營收 (Spec 0164)
 */
export async function loadSymbolFullLakehouseData(
  symbol: string,
  market: MarketType = 'TW'
): Promise<LakehouseFullPayload | null> {
  const cleanSym = symbol.replace(/\.(TW|TWO)$/i, '').trim().toUpperCase();
  const candidates = getOtcAliasCandidates(cleanSym, market);

  for (const candidate of candidates) {
    try {
      const res = await fetch(`/api/market/history/${encodeURIComponent(candidate)}?limit=250`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.candles) && data.candles.length > 0) {
          const chipsMap = data.chips && typeof data.chips === 'object' ? data.chips : {};
          const candles: DailyCandle[] = data.candles.map((c: any) => ({
            date: c.date,
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
            volume: Number(c.volume),
            transactions: c.transactions != null ? Number(c.transactions) : undefined,
            foreignNetBuy: chipsMap[c.date]?.foreign_net != null ? Number(chipsMap[c.date].foreign_net) : undefined,
            trustNetBuy: chipsMap[c.date]?.trust_net != null ? Number(chipsMap[c.date].trust_net) : undefined,
            dealerNetBuy: chipsMap[c.date]?.dealer_net != null ? Number(chipsMap[c.date].dealer_net) : undefined,
          }));

          saveSymbolOhlcv({
            symbol: cleanSym,
            market,
            candles,
            updatedAt: Date.now(),
          }).catch((err) => {
            logger.warn(`[marketCacheLoader] IndexedDB 沉澱失敗 (${cleanSym}):`, err);
          });

        let institutionalRecords: LakehouseFullPayload['institutionalRecords'] = undefined;
        if (data.chips && typeof data.chips === 'object') {
          const chipRows = Object.values(data.chips) as any[];
          if (chipRows.length > 0) {
            institutionalRecords = chipRows.map((r: any) => ({
              date: r.date,
              foreignShares: Number(r.foreign_net) || 0,
              trustShares: Number(r.trust_net) || 0,
              dealerShares: Number(r.dealer_net) || 0,
              marginBalance: r.margin_balance != null ? Number(r.margin_balance) : undefined,
              shortBalance: r.short_balance != null ? Number(r.short_balance) : undefined,
              sblBalance: r.sbl_balance != null ? Number(r.sbl_balance) : undefined,
              dayTradeRate: r.day_trade_rate != null ? Number(r.day_trade_rate) : undefined,
            }));
          }
        }

        let tdccRecords: LakehouseFullPayload['tdccRecords'] = undefined;
        if (Array.isArray(data.tdcc) && data.tdcc.length > 0) {
          tdccRecords = data.tdcc.map((r: any) => ({
            date: r.date,
            totalShareholders: r.total_shareholders != null ? Number(r.total_shareholders) : undefined,
            over400Ratio: r.over_400_ratio != null ? Number(r.over_400_ratio) : undefined,
            over1000Ratio: r.over_1000_ratio != null ? Number(r.over_1000_ratio) : undefined,
            under10Ratio: r.under_10_ratio != null ? Number(r.under_10_ratio) : undefined,
          }));
        }

        let revenueRecords: LakehouseFullPayload['revenueRecords'] = undefined;
        if (Array.isArray(data.revenue) && data.revenue.length > 0) {
          revenueRecords = data.revenue.map((r: any) => ({
            yearMonth: r.year_month,
            revenue: Number(r.revenue) || 0,
            lastYearRevenue: r.last_year_revenue != null ? Number(r.last_year_revenue) : undefined,
            yoyRate: r.yoy_rate != null ? Number(r.yoy_rate) : undefined,
            momRate: r.mom_rate != null ? Number(r.mom_rate) : undefined,
            isAllTimeHigh: r.is_all_time_high != null ? Number(r.is_all_time_high) : 0,
          }));
        }

        let valuation: LakehouseFullPayload['valuation'] = undefined;
        if (data.valuation && typeof data.valuation === 'object') {
          valuation = {
            pe: data.valuation.pe != null ? Number(data.valuation.pe) : null,
            pb: data.valuation.pb != null ? Number(data.valuation.pb) : null,
            dividendYield:
              data.valuation.dividend_yield != null
                ? Number(data.valuation.dividend_yield)
                : (data.valuation.dividendYield != null ? Number(data.valuation.dividendYield) : null),
            asOfDate: data.valuation.date ?? data.valuation.asOfDate ?? undefined,
            history: Array.isArray(data.valuation.history)
              ? data.valuation.history.map((h: any) => ({
                  pe: h.pe != null ? Number(h.pe) : null,
                  pb: h.pb != null ? Number(h.pb) : null,
                  dividendYield: h.dividend_yield != null ? Number(h.dividend_yield) : null,
                  date: h.date,
                }))
              : [],
          };
        }

        // Spec 0239 T06: 融合 us_fundamentals_daily (美股估值 / 13F 籌碼 / 美股 ETF 淨值與費用率)
        let us13fData: LakehouseFullPayload['us13fData'] = undefined;
        let etfMeta: LakehouseFullPayload['etfMeta'] = undefined;
        const usFund = data.usFundamentals;
        if (usFund && typeof usFund === 'object') {
          const ufPe = usFund.pe != null ? Number(usFund.pe) : null;
          const ufFwdPe = usFund.forward_pe != null ? Number(usFund.forward_pe) : (usFund.forwardPe != null ? Number(usFund.forwardPe) : null);
          const ufPb = usFund.pb != null ? Number(usFund.pb) : null;
          const ufPs = usFund.ps_ratio != null ? Number(usFund.ps_ratio) : (usFund.psRatio != null ? Number(usFund.psRatio) : null);
          const ufDy = usFund.dividend_yield != null ? Number(usFund.dividend_yield) : (usFund.dividendYield != null ? Number(usFund.dividendYield) : null);
          if (ufPe != null || ufFwdPe != null || ufPb != null || ufPs != null || ufDy != null) {
            valuation = {
              ...(valuation || {}),
              pe: valuation?.pe ?? ufPe,
              forwardPe: ufFwdPe,
              pb: valuation?.pb ?? ufPb,
              psRatio: ufPs,
              dividendYield: valuation?.dividendYield ?? ufDy,
              asOfDate: valuation?.asOfDate ?? usFund.date ?? undefined,
              history: valuation?.history || [],
            };
          }

          const instRatio = usFund.institutional_ratio != null ? Number(usFund.institutional_ratio) : undefined;
          const insiderRatio = usFund.insider_ratio != null ? Number(usFund.insider_ratio) : undefined;
          const shortFloatRatio = usFund.short_float_ratio != null ? Number(usFund.short_float_ratio) : undefined;
          const publicFloatRatio = usFund.public_float_ratio != null ? Number(usFund.public_float_ratio) : undefined;
          if (instRatio !== undefined || insiderRatio !== undefined || shortFloatRatio !== undefined) {
            us13fData = {
              institutionalRatio: instRatio,
              insiderRatio,
              shortFloatRatio,
              publicFloatRatio,
              isSqueezeRisk: shortFloatRatio !== undefined && shortFloatRatio > 10,
              asOfQuarterText: usFund.date ? `SEC 13F / FINRA (${usFund.date})` : 'SEC 13F / FINRA 放空結算',
            };
          }

          const aumB = usFund.etf_aum_billion != null ? Number(usFund.etf_aum_billion) : undefined;
          const expR = usFund.etf_expense_ratio != null ? Number(usFund.etf_expense_ratio) : undefined;
          if (aumB !== undefined || expR !== undefined) {
            etfMeta = { aumBillion: aumB, expenseRatio: expR };
          }
        }

        let etfNav: LakehouseFullPayload['etfNav'] = undefined;
        if (data.etfNav && typeof data.etfNav === 'object') {
          const rawClose = data.etfNav.closePrice ?? data.etfNav.close_price;
          const rawNav = data.etfNav.nav;
          const rawRatio = data.etfNav.premiumDiscountRatio ?? data.etfNav.premium_discount_ratio;
          const rawUnits = data.etfNav.issuedUnits ?? data.etfNav.issued_units;
          const rawUnitChange = data.etfNav.unitChange ?? data.etfNav.unit_change;
          const rawAum = data.etfNav.aumBillion ?? data.etfNav.aum_billion;
          etfNav = {
            date: data.etfNav.date,
            closePrice: rawClose != null ? Number(rawClose) : undefined,
            nav: rawNav != null ? Number(rawNav) : undefined,
            premiumDiscountRatio: rawRatio != null ? Number(rawRatio) : undefined,
            issuedUnits: rawUnits != null ? Number(rawUnits) : undefined,
            unitChange: rawUnitChange != null ? Number(rawUnitChange) : undefined,
            aumBillion: rawAum != null ? Number(rawAum) : undefined,
          };
        } else if (usFund && (usFund.etf_nav_price != null || usFund.etf_premium_discount_ratio != null)) {
          etfNav = {
            date: usFund.date || new Date().toISOString().slice(0, 10),
            nav: usFund.etf_nav_price != null ? Number(usFund.etf_nav_price) : undefined,
            premiumDiscountRatio:
              usFund.etf_premium_discount_ratio != null
                ? Number(usFund.etf_premium_discount_ratio)
                : undefined,
          };
        }

        let etfNavHistory: LakehouseFullPayload['etfNavHistory'] = undefined;
        if (Array.isArray(data.etfNavHistory) && data.etfNavHistory.length > 0) {
          etfNavHistory = data.etfNavHistory.map((item: any) => ({
            date: String(item.date || ''),
            nav: item.nav != null ? Number(item.nav) : undefined,
            closePrice: (item.closePrice ?? item.close_price) != null ? Number(item.closePrice ?? item.close_price) : undefined,
            premiumDiscountRatio:
              (item.premiumDiscountRatio ?? item.premium_discount_ratio) != null
                ? Number(item.premiumDiscountRatio ?? item.premium_discount_ratio)
                : undefined,
          }));
        }

        // Spec 0241 T04: 合流台股湖倉實時 AUM (etf_daily_nav.aum_billion) 與 etf_meta 費用率
        const twAumFromNav =
          etfNav?.aumBillion != null && Number.isFinite(etfNav.aumBillion) && etfNav.aumBillion > 0
            ? etfNav.aumBillion
            : undefined;
        const rawTwMeta = data.etfMeta && typeof data.etfMeta === 'object' ? data.etfMeta : null;
        const twExpRatio =
          rawTwMeta?.expense_ratio != null && Number.isFinite(Number(rawTwMeta.expense_ratio))
            ? Number(rawTwMeta.expense_ratio)
            : rawTwMeta?.expense_source === 'UNAVAILABLE'
            ? null
            : undefined;
        if (twAumFromNav !== undefined || twExpRatio !== undefined || rawTwMeta) {
          etfMeta = {
            aumBillion: etfMeta?.aumBillion ?? twAumFromNav,
            expenseRatio: etfMeta?.expenseRatio !== undefined ? etfMeta.expenseRatio : twExpRatio,
            trackingIndex: rawTwMeta?.tracking_index ?? undefined,
            issuer: rawTwMeta?.issuer ?? undefined,
          };
        }

        let quarterlyFinancials: LakehouseFullPayload['quarterlyFinancials'] = undefined;
        if (Array.isArray(data.quarterlyFinancials) && data.quarterlyFinancials.length > 0) {
          quarterlyFinancials = data.quarterlyFinancials.map((q: any) => ({
            symbol: q.symbol,
            market: q.market,
            year: Number(q.year),
            quarter: Number(q.quarter),
            periodDate: q.period_date ?? q.periodDate ?? undefined,
            revenue: q.revenue != null ? Number(q.revenue) : null,
            grossProfit: q.gross_profit != null ? Number(q.gross_profit) : (q.grossProfit != null ? Number(q.grossProfit) : null),
            operatingIncome: q.operating_income != null ? Number(q.operating_income) : (q.operatingIncome != null ? Number(q.operatingIncome) : null),
            netIncome: q.net_income != null ? Number(q.net_income) : (q.netIncome != null ? Number(q.netIncome) : null),
            eps: q.eps != null ? Number(q.eps) : null,
          }));
        }

        let corporateActions: LakehouseFullPayload['corporateActions'] = undefined;
        if (Array.isArray(data.corporateActions)) {
          corporateActions = data.corporateActions.map((ca: any) => {
            const rawCash = ca.cashDividendPerShare ?? ca.cash_dividend_per_share;
            const rawStock = ca.stockDividendRatio ?? ca.stock_dividend_ratio;
            return {
              exDate: ca.exDate ?? ca.ex_date,
              paymentDate: ca.paymentDate ?? ca.payment_date ?? undefined,
              cashDividendPerShare: rawCash != null ? Number(rawCash) : undefined,
              stockDividendRatio: rawStock != null ? Number(rawStock) : undefined,
              mandatoryBuybackDate: ca.mandatoryBuybackDate ?? ca.mandatory_buyback_date ?? undefined,
            };
          });
        }

        // 資券與借券餘額有效值向前回退與日增減演算法 (Spec 0200 Ticket 01 / Spec 0237 Ticket 05)
        const extractLatestAndDelta = <T>(
          rows: T[],
          selector: (r: T) => number | undefined
        ): { latest?: number; delta?: number; latestRow?: T } => {
          const valid = rows.filter((r) => selector(r) != null);
          if (valid.length === 0) return {};
          const latestRow = valid[valid.length - 1];
          const latest = selector(latestRow)!;
          const delta = valid.length >= 2 ? latest - selector(valid[valid.length - 2])! : undefined;
          return { latest, delta, latestRow };
        };

        const sortedInst = institutionalRecords
          ? [...institutionalRecords].sort((a, b) => a.date.localeCompare(b.date))
          : [];
        const marginStats = extractLatestAndDelta(sortedInst, (r) => r.marginBalance);
        const shortStats = extractLatestAndDelta(sortedInst, (r) => r.shortBalance);
        const sblStats = extractLatestAndDelta(sortedInst, (r) => r.sblBalance);
        const dayTradeStats = extractLatestAndDelta(sortedInst, (r) => r.dayTradeRate);

          const meta: LakehouseSymbolMeta | undefined =
            data.meta && typeof data.meta === 'object'
              ? {
                  symbol: data.meta.symbol,
                  name: data.meta.name,
                  market: data.meta.market,
                  exchange: data.meta.exchange,
                  type: data.meta.type,
                  status: data.meta.status,
                  industry: data.meta.industry,
                }
              : undefined;

          return {
            meta,
            candles,
            institutionalRecords,
            marginBalance: marginStats.latest,
            marginBalanceChange: marginStats.delta,
            shortBalance: shortStats.latest ?? marginStats.latestRow?.shortBalance,
            shortBalanceChange: shortStats.delta,
            sblBalance: sblStats.latest,
            dayTradeRate: dayTradeStats.latest ?? marginStats.latestRow?.dayTradeRate,
            marginAsOfDate: marginStats.latestRow?.date,
            tdccRecords,
            revenueRecords,
            valuation,
            us13fData,
            etfMeta,
            quarterlyFinancials,
            enrichmentPending: Boolean(data.enrichmentPending),
            pledge: data.pledge || undefined,
            macro: data.macro,
            etfNav,
            etfNavHistory,
            corporateActions,
          };
        }
      }
    } catch (err) {
      // 忽略網路錯誤，繼續嘗試下一別名
    }
  }

  return null;
}


/**
 * 載入指定標的之處置與注意狀態 (Ticket 03)
 */
export async function loadSymbolDispositionStatus(
  symbol: string,
  market: MarketType = 'TW'
): Promise<'NORMAL' | 'ATTENTION' | 'DISPOSITION'> {
  if (market !== 'TW' || !symbol) {
    return 'NORMAL';
  }

  const cleanSym = symbol.replace(/\.(TW|TWO)$/i, '').trim().toUpperCase();

  try {
    const res = await fetch(`/api/market/quote/${encodeURIComponent(cleanSym)}`);
    if (res.ok) {
      const data = await res.json();
      const status = data?.meta?.status;
      if (status === 'DISPOSITION' || status === 'ATTENTION') {
        return status;
      }
    }
  } catch (err) {
    // 網路異常或伺服器無回應時，安全回退 NORMAL
  }

  return 'NORMAL';
}


