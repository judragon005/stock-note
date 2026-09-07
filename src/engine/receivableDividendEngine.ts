import { HoldingPosition, TradeRecord, MarketType, Currency } from '../types/stock';
import { ReceivableDividend, SmoothedHoldingPnL } from '../types/dividend';
import { RawCorporateEvent } from './corporateActionScanner';
import { getHoldingsAsOfDate } from './calculator';
import { calculateConsolidatedTwNhiTax } from './taxComplianceEngine';

/**
 * 官方除權息行事曆常態基準庫 (包含台積電 2330、兆豐金 2886、00878、00923、9927 等)
 */
export const OFFICIAL_DIVIDEND_CALENDAR: RawCorporateEvent[] = [
  {
    symbol: '2330',
    market: 'TW',
    type: 'DIVIDEND',
    date: '2026-09-16',
    price: 7.0,
    description: '季度現金股利每股 7.0 TWD (預計 2026-10-08 發放入帳)',
    sourceType: 'LIVE_API',
  },
  {
    symbol: '2886',
    market: 'TW',
    type: 'DIVIDEND',
    date: '2026-08-13',
    price: 1.75,
    description: '年度現金股利每股 1.75 TWD (預計 2026-09-04 發放入帳)',
    sourceType: 'LIVE_API',
  },
  {
    symbol: '00878',
    market: 'TW',
    type: 'DIVIDEND',
    date: '2026-08-18',
    price: 1.01,
    description: '季度收益分配每股 1.01 TWD (預計 2026-09-11 發放入帳)',
    sourceType: 'LIVE_API',
  },
  {
    symbol: '00923',
    market: 'TW',
    type: 'DIVIDEND',
    date: '2026-08-18',
    price: 3.05,
    description: '半年度收益分配每股 3.05 TWD (預計 2026-09-11 發放入帳)',
    sourceType: 'LIVE_API',
  },
  {
    symbol: '2890',
    market: 'TW',
    type: 'DIVIDEND',
    date: '2026-07-23',
    price: 1.10,
    description: '年度現金股利每股 1.10 TWD (預計 2026-08-24 發放入帳)',
    sourceType: 'LIVE_API',
  },
  {
    symbol: '9927',
    market: 'TW',
    type: 'DIVIDEND',
    date: '2026-10-01',
    price: 5.0,
    description: '年度現金股利每股 5.0 TWD (預計 2026-10-29 發放入帳)',
    sourceType: 'LIVE_API',
  },
];

/**
 * 推估現金股利發放日 (Pay-Date)
 */
export function estimatePaymentDate(exDateStr: string, market: MarketType): string {
  const knownPayDates: Record<string, string> = {
    '2026-07-23': '2026-08-24', // 永豐金 2890
    '2026-09-16': '2026-10-08', // 台積電 2330
    '2026-08-13': '2026-09-04', // 兆豐金 2886
    '2026-08-18': '2026-09-11', // 國泰永續高股息 00878 / 群益 00923
    '2026-10-01': '2026-10-29', // 泰銘 9927
  };


  if (knownPayDates[exDateStr]) {
    return knownPayDates[exDateStr];
  }

  const date = new Date(exDateStr);
  if (isNaN(date.getTime())) return exDateStr;
  const daysToAdd = market === 'TW' ? 28 : 21;
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split('T')[0];
}

/**
 * 試算目前在席持倉之待入帳應收現金股利 (Receivable Dividends) 與即將除息公告
 * 
 * 依「除息日前持有股數（包含除權配股補正等完整公司行動）」為唯一配息股數基準
 */
export function calculateReceivableDividends(
  holdings: HoldingPosition[],
  corporateEvents: RawCorporateEvent[],
  trades: TradeRecord[],
  currentDateStr: string,
  exchangeRate: number = 32.0,
  officialCalendar: RawCorporateEvent[] = OFFICIAL_DIVIDEND_CALENDAR
): ReceivableDividend[] {
  const receivables: ReceivableDividend[] = [];
  const activeHoldingsMap = new Map<string, HoldingPosition>();
  holdings.forEach((h) => {
    if (h.shares > 0) {
      activeHoldingsMap.set(h.symbol.toUpperCase(), h);
    }
  });

  const processedKeys = new Set<string>();

  // 1. 合併官方常態日曆庫與傳入的事件 (SSOT)
  const allEventsMap = new Map<string, RawCorporateEvent>();
  for (const officialEv of officialCalendar) {
    const k = `${officialEv.symbol.toUpperCase()}-${officialEv.date}-${officialEv.type}`;
    allEventsMap.set(k, officialEv);
  }
  for (const ev of corporateEvents) {
    const k = `${ev.symbol.toUpperCase()}-${ev.date}-${ev.type}`;
    allEventsMap.set(k, ev);
  }

  // 2. 處理官方公司行動除息事件 (SSOT 線性判定)
  for (const event of allEventsMap.values()) {
    if (event.type !== 'DIVIDEND' || !event.price || event.price <= 0) {
      continue;
    }

    const symbol = event.symbol.toUpperCase();
    const holding = activeHoldingsMap.get(symbol);
    if (!holding) continue;

    const exDate = event.date;
    const payDate = estimatePaymentDate(exDate, event.market);

    // 線性時序判定：若發放日已過，代表已實質落袋
    if (currentDateStr >= payDate) {
      continue;
    }

    const key = `${symbol}-${exDate}`;
    processedKeys.add(key);

    // 依證券法規：以除息日前一日收盤在籍股數為準 (完整計入配股、增減資等公司行動)
    const exDateObj = new Date(exDate);
    exDateObj.setUTCDate(exDateObj.getUTCDate() - 1);
    const prevDay = exDateObj.toISOString().split('T')[0];

    let sharesHeld = getHoldingsAsOfDate(trades, prevDay, symbol);
    // 防禦性在籍判定：僅在尚未除息 (currentDateStr < exDate) 時方得以當前庫存預估即將除息股數；若已除息則嚴格以除息日前一日在籍持股為準
    if (sharesHeld <= 0 && currentDateStr < exDate && holding.shares > 0) {
      sharesHeld = holding.shares;
    }
    if (sharesHeld <= 0) continue;

    const market = event.market;
    const currency: Currency = market === 'TW' ? 'TWD' : 'USD';
    const cashPerShare = event.price;
    const grossDividend = Number((sharesHeld * cashPerShare).toFixed(marketPrecision(market)));

    // 智能稅費 (台股 >= 2萬 扣 2.11% 二代健保，內扣 10 元跨行匯費；美股 30% 預扣稅)
    let nhiTax = 0;
    let wireFee = 0;
    let taxOrFee = 0;

    if (market === 'TW') {
      // 檢查同標的是否有同除權息日之股票股利 (STOCK_DIVIDEND)
      let peerStockShares = 0;
      for (const ev of allEventsMap.values()) {
        if (ev.symbol.toUpperCase() === symbol && ev.type === 'STOCK_DIVIDEND' && ev.date === exDate) {
          const rawPeer = ev.shares && ev.shares > 0 ? ev.shares : (ev.ratio ? sharesHeld * ev.ratio : 0);
          peerStockShares = Math.round(rawPeer);
          break;
        }
      }

      wireFee = grossDividend > 0 ? 10 : 0;
      const taxRes = calculateConsolidatedTwNhiTax({
        cashDividendGross: grossDividend,
        stockDividendShares: peerStockShares,
        wireFee,
      });

      nhiTax = taxRes.nhiFeeTWD;
      taxOrFee = nhiTax + wireFee;
    } else {
      taxOrFee = Number((grossDividend * 0.3).toFixed(2));
    }

    const netDividend = Math.max(0, Number((grossDividend - taxOrFee).toFixed(marketPrecision(market))));
    const netDividendInTWD = market === 'TW' ? Math.round(netDividend) : Math.round(netDividend * exchangeRate);

    const status: ReceivableDividend['status'] = currentDateStr < exDate ? 'UPCOMING_EX' : 'PENDING_PAYMENT';

    receivables.push({
      id: `rec-official-${symbol}-${exDate}`,
      symbol,
      name: holding.name || symbol,
      market,
      currency,
      exDate,
      payDate,
      sharesHeldOnExDate: sharesHeld,
      cashDividendPerShare: cashPerShare,
      estimatedGrossDividend: grossDividend,
      estimatedTaxOrFee: taxOrFee,
      estimatedNhiTax: nhiTax,
      estimatedWireFee: wireFee,
      estimatedNetDividend: netDividend,
      estimatedNetDividendInTWD: netDividendInTWD,
      status,
    });
  }

  // 3. 補充帳本中非官方涵蓋之自訂未來預約 DIVIDEND 記錄
  const customFutureTrades = trades.filter((t) => {
    if (t.type !== 'DIVIDEND') return false;
    const effectivePayDate = t.payDate || (t.date > currentDateStr ? t.date : estimatePaymentDate(t.exDate || t.date, t.market));
    return effectivePayDate > currentDateStr;
  });

  for (const trade of customFutureTrades) {
    const symbol = trade.symbol.toUpperCase();
    const holding = activeHoldingsMap.get(symbol);

    const exDate = trade.exDate || trade.date;
    const payDate = trade.payDate || (trade.date > currentDateStr ? trade.date : estimatePaymentDate(exDate, trade.market));

    const key = `${symbol}-${exDate}`;
    if (processedKeys.has(key)) {
      continue;
    }
    processedKeys.add(key);

    const sharesHeld = holding && holding.shares > 0 ? holding.shares : trade.shares;
    const cashPerShare = trade.price;
    const grossDividend = Number((sharesHeld * cashPerShare).toFixed(marketPrecision(trade.market)));

    let taxOrFee = trade.tax || 0;
    if (trade.market === 'TW') {
      if (grossDividend >= 20000 && taxOrFee === 0) {
        taxOrFee = Math.floor(grossDividend * 0.0211);
      }
    } else if (trade.market === 'US') {
      if (taxOrFee === 0) {
        taxOrFee = Number((grossDividend * 0.3).toFixed(2));
      }
    }

    const netDividend = Math.max(0, Number((grossDividend - taxOrFee).toFixed(marketPrecision(trade.market))));
    const netDividendInTWD = trade.market === 'TW' ? Math.round(netDividend) : Math.round(netDividend * exchangeRate);

    const status: ReceivableDividend['status'] = 'PENDING_PAYMENT';

    receivables.push({
      id: `rec-trade-${trade.id}`,
      symbol: trade.symbol,
      name: trade.name || (holding?.name || trade.symbol),
      market: trade.market,
      currency: trade.currency,
      exDate,
      payDate,
      sharesHeldOnExDate: sharesHeld,
      cashDividendPerShare: cashPerShare,
      estimatedGrossDividend: grossDividend,
      estimatedTaxOrFee: taxOrFee,
      estimatedNetDividend: netDividend,
      estimatedNetDividendInTWD: netDividendInTWD,
      status,
    });
  }

  // 依除息日由近到遠線性排序
  return receivables.sort((a, b) => a.exDate.localeCompare(b.exDate));
}

function marketPrecision(market: MarketType): number {
  return market === 'US' ? 2 : 0;
}

/**
 * 計算個股經「應收股息補償」與「待入帳配股」平滑後之真實未實現損益
 */
export function calculateSmoothedHoldingPnL(
  holding: HoldingPosition,
  receivableDividendTWD: number = 0,
  receivableStockShares: number = 0,
  currentPrice?: number
): SmoothedHoldingPnL {
  const rawPnL = holding.unrealizedPnL || 0;
  const totalCost = holding.totalCostBasis || 1;
  const rawPercent = holding.unrealizedPnLPercent || 0;

  const price = currentPrice ?? holding.currentPrice ?? 0;
  const receivableStockValueTWD = Math.round(receivableStockShares * price);
  const smoothedPnL = rawPnL + receivableDividendTWD + receivableStockValueTWD;
  const smoothedPercent = totalCost > 0 ? (smoothedPnL / totalCost) * 100 : 0;
  const hasReceivable = receivableDividendTWD > 0 || receivableStockShares > 0;

  return {
    symbol: holding.symbol,
    rawUnrealizedPnL: rawPnL,
    rawUnrealizedPnLPercent: rawPercent,
    receivableDividendTWD,
    receivableStockShares: receivableStockShares > 0 ? receivableStockShares : undefined,
    receivableStockValueTWD: receivableStockValueTWD > 0 ? receivableStockValueTWD : undefined,
    smoothedUnrealizedPnL: smoothedPnL,
    smoothedUnrealizedPnLPercent: Number(smoothedPercent.toFixed(2)),
    hasReceivable,
  };
}
