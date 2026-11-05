import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HoldingPosition,
  ColorThemeMode,
  MarketType,
  SmartMoneyInputItem,
  SmartMoneyQuadrant,
} from '../types/stock';
import { SmartMoneyBubbleChart } from './SmartMoneyBubbleChart';
import {
  calculateSmartMoneyFlowDynamics,
  getTemporalBubbleFrameData,
  calculateSectorRotation,
  detectActionableSignals,
} from '../engine/smartMoneyEngine';
import {
  fetchTwseInstitutionalReportDetailed,
  fetchRecentTwseReports,
  fetchUsMarketRealData,
  UsRealStockData,
  TwseInstitutionalRow,
  getLatestTradingDateString,
  getRecentTradingDateSequence,
  fetchSmartMoneyLakehouseSnapshot,
} from '../engine/smartMoneyFetcher';
import {
  aggregateMultiDayChips,
  classifyInstitutionalSignal,
  getTopMomentumSymbols,
  isEtfSymbol,
} from '../engine/chipsAggregator';
import {
  Flame,
  ShieldCheck,
  AlertTriangle,
  Snowflake,
  RefreshCw,
  Sparkles,
  PieChart,
} from 'lucide-react';

/**
 * 依據使用者燈號習慣 (ColorThemeMode) 取得籌碼工作區四象限統計卡片樣式
 */
export function getChipsQuadrantCardStyles(colorTheme: ColorThemeMode) {
  const isTaiwan = colorTheme === 'taiwan';
  return {
    breakout: {
      bg: isTaiwan ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
      border: isTaiwan ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
      titleColor: isTaiwan ? '#fca5a5' : '#a7f3d0',
      countColor: isTaiwan ? '#f87171' : '#34d399',
      iconColor: isTaiwan ? '#f87171' : '#34d399',
    },
    accumulation: {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      titleColor: '#fde68a',
      countColor: '#fbbf24',
      iconColor: '#fbbf24',
    },
    distribution: {
      bg: isTaiwan ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
      border: isTaiwan ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
      titleColor: isTaiwan ? '#a7f3d0' : '#fca5a5',
      countColor: isTaiwan ? '#34d399' : '#f87171',
      iconColor: isTaiwan ? '#34d399' : '#f87171',
    },
    liquidation: {
      bg: 'rgba(100, 116, 139, 0.12)',
      border: '1px solid rgba(100, 116, 139, 0.3)',
      titleColor: '#cbd5e1',
      countColor: '#94a3b8',
      iconColor: '#94a3b8',
    },
  };
}

/**
 * 構建單檔標的之時序軌跡流向節點
 * 優先對齊 IndexedDB 本地已沉澱之真實歷史日報，若尚未補齊則優雅降級為係數模擬
 */
export function buildHoldingHistoricalFlows(
  holding: { symbol: string; todaysPnLPercent?: number; currentPrice?: number; market?: MarketType },
  availableDates: string[],
  twseData?: TwseInstitutionalRow,
  baseUsCmf = 0,
  historyReportsMap?: Record<string, Record<string, TwseInstitutionalRow>>
) {
  const cleanSymbol = holding.symbol.replace(/\.(TW|TWO)$/i, '').trim();

  return availableDates.map((d, idx) => {
    const isLatest = idx === availableDates.length - 1;

    if (holding.market === 'US') {
      const cmfVal = isLatest ? baseUsCmf : 0;
      const changeP = isLatest ? (holding.todaysPnLPercent || 0) : 0;
      return {
        date: d,
        changePercent: changeP,
        flowScore: cmfVal,
        netFlowAmount: cmfVal * 1000000 * (holding.currentPrice || 100),
        cmf: cmfVal,
      };
    }

    // 檢查是否有真實歷史日報 (Zero-Mock 湖倉直連，Ticket 05)
    const dayReport = historyReportsMap?.[d];
    const dayItem = dayReport ? (dayReport[cleanSymbol] || dayReport[holding.symbol]) : undefined;

    if (dayItem) {
      return {
        date: d,
        changePercent: isLatest ? (holding.todaysPnLPercent || 0) : 0,
        flowScore: dayItem.totalNetShares / 2500,
        netFlowAmount: dayItem.totalNetShares * 1000 * (holding.currentPrice || 100),
        foreignNetShares: dayItem.foreignNetShares,
        trustNetShares: dayItem.trustNetShares,
        dealerNetShares: dayItem.dealerNetShares,
      };
    }

    // 若為當前最新日且 twseData 存在，直連真實最新日報
    if (isLatest && twseData) {
      return {
        date: d,
        changePercent: holding.todaysPnLPercent || 0,
        flowScore: twseData.totalNetShares / 2500,
        netFlowAmount: (twseData.totalNetShares || 0) * 1000 * (holding.currentPrice || 100),
        foreignNetShares: twseData.foreignNetShares,
        trustNetShares: twseData.trustNetShares,
        dealerNetShares: twseData.dealerNetShares,
      };
    }

    // 歷史無日報時誠實返回 0，絕不使用線性插值偽造軌跡
    return {
      date: d,
      changePercent: 0,
      flowScore: 0,
      netFlowAmount: 0,
      foreignNetShares: undefined,
      trustNetShares: undefined,
      dealerNetShares: undefined,
    };
  });
}

export const US_MARKET_FOCUS_LIST = [
  { symbol: 'NVDA', name: '輝達', pnl: 0, cmf: 0 },
  { symbol: 'AAPL', name: '蘋果', pnl: 0, cmf: 0 },
  { symbol: 'MSFT', name: '微軟', pnl: 0, cmf: 0 },
  { symbol: 'AMZN', name: '亞馬遜', pnl: 0, cmf: 0 },
  { symbol: 'GOOGL', name: 'Alphabet', pnl: 0, cmf: 0 },
  { symbol: 'META', name: 'Meta', pnl: 0, cmf: 0 },
  { symbol: 'TSLA', name: '特斯拉', pnl: 0, cmf: 0 },
  { symbol: 'AVGO', name: '博通', pnl: 0, cmf: 0 },
  { symbol: 'AMD', name: '超微', pnl: 0, cmf: 0 },
  { symbol: 'PLTR', name: 'Palantir', pnl: 0, cmf: 0 },
  { symbol: 'ARM', name: '安謀', pnl: 0, cmf: 0 },
  { symbol: 'QCOM', name: '高通', pnl: 0, cmf: 0 },
  { symbol: 'ASML', name: '艾斯摩爾', pnl: 0, cmf: 0 },
  { symbol: 'TSM', name: '台積電ADR', pnl: 0, cmf: 0 },
  { symbol: 'MU', name: '美光', pnl: 0, cmf: 0 },
  { symbol: 'SMCI', name: '美超微', pnl: 0, cmf: 0 },
  { symbol: 'NFLX', name: '網飛', pnl: 0, cmf: 0 },
  { symbol: 'COST', name: '好市多', pnl: 0, cmf: 0 },
  { symbol: 'BRK.B', name: '波克夏B', pnl: 0, cmf: 0 },
  { symbol: 'JPM', name: '摩根大通', pnl: 0, cmf: 0 },
  { symbol: 'LLY', name: '禮來', pnl: 0, cmf: 0 },
  { symbol: 'NVO', name: '諾和諾德', pnl: 0, cmf: 0 },
  { symbol: 'SPY', name: '標普500 ETF', pnl: 0, cmf: 0 },
  { symbol: 'QQQ', name: '那斯達克 ETF', pnl: 0, cmf: 0 },
  { symbol: 'SOXX', name: '費半 ETF', pnl: 0, cmf: 0 },
];

/**
 * 全市場焦點標的依據市場篩選嚴格過濾與生成
 * 嚴格保證：US 模式 100% 零台股，TW 模式 100% 零美股
 */
export function filterMarketFocusList(
  marketFilter: 'ALL' | MarketType,
  twseChipsMap: Record<string, TwseInstitutionalRow>,
  holdings: HoldingPosition[] = [],
  availableDates: string[] = ['T'],
  historyReportsMap?: Record<string, Record<string, TwseInstitutionalRow>>,
  usRealDataMap?: Record<string, UsRealStockData>,
  includeEtf = false,
  chipsHorizon: 1 | 3 | 5 = 1,
  usdToTwdRate = 32
): SmartMoneyInputItem[] {
  const usSourceList = includeEtf
    ? US_MARKET_FOCUS_LIST
    : US_MARKET_FOCUS_LIST.filter((u) => !['SPY', 'QQQ', 'SOXX'].includes(u.symbol));

  if (marketFilter === 'US') {
    // 100% 純美股全市場焦點 (優先對齊 Yahoo Finance 真實日 K 與 20D CMF)
    return usSourceList.map((usItem) => {
      const realUs = usRealDataMap?.[usItem.symbol];
      const matchingHolding = holdings.find(
        (h) => !h.isClosed && h.shares > 0 && h.symbol.trim().toUpperCase() === usItem.symbol
      );
      const curPrice = realUs ? realUs.currentPrice : matchingHolding?.currentPrice || 0;
      let pnl = realUs ? realUs.changePercent : 0;
      if (chipsHorizon > 1 && realUs?.candles && realUs.candles.length >= chipsHorizon + 1) {
        const baseCandle = realUs.candles[realUs.candles.length - 1 - chipsHorizon];
        if (baseCandle?.close && curPrice) {
          pnl = Math.round(((curPrice - baseCandle.close) / baseCandle.close) * 10000) / 100;
        }
      }
      const prevClose = realUs ? realUs.previousClose : (curPrice && pnl ? Math.round((curPrice / (1 + pnl / 100)) * 100) / 100 : curPrice);
      const volume = realUs ? realUs.volume : 0;
      const candles =
        realUs?.candles && realUs.candles.length >= 20 ? realUs.candles : undefined;

      const histFlows =
        realUs?.historicalDailyFlows && realUs.historicalDailyFlows.length > 0
          ? realUs.historicalDailyFlows
          : availableDates.map((d) => ({
              date: d,
              changePercent: 0,
              flowScore: 0,
              cmf: 0,
              netFlowAmount: 0,
            }));

      return {
        symbol: usItem.symbol,
        name: usItem.name,
        market: 'US' as MarketType,
        currentPrice: curPrice || 1,
        previousClose: prevClose || 1,
        changePercent: pnl,
        holdingValueTwd: matchingHolding ? matchingHolding.grossMarketValue * usdToTwdRate : undefined,
        isHolding: Boolean(matchingHolding),
        avgCost: matchingHolding?.avgCost,
        unrealizedPnLPercent: matchingHolding?.unrealizedPnLPercent,
        intent: matchingHolding?.intent,
        volume,
        candles,
        historicalDailyFlows: histFlows,
      };
    });
  }

  // 台股全市場焦點 Top 30 (預設排除 ETF 造市干擾，可由 includeEtf 開關切換)
  const candidateRows = includeEtf
    ? Object.values(twseChipsMap)
    : Object.values(twseChipsMap).filter((r) => !isEtfSymbol(r.symbol));

  const topSymbols = candidateRows
    .sort(
      (a, b) =>
        Math.abs((b.foreignNetShares || 0) + (b.trustNetShares || 0) + (b.dealerNetShares || 0)) -
        Math.abs(a.totalNetShares)
    )
    .slice(0, marketFilter === 'ALL' ? 20 : 30);

  const twItems: SmartMoneyInputItem[] = topSymbols.map((item) => {
    const matchingHolding = holdings.find(
      (h) => !h.isClosed && h.shares > 0 && h.symbol.replace(/\.(TW|TWO)$/i, '').trim() === item.symbol
    );
    const realPrice = item.close || matchingHolding?.currentPrice || 1;
    let changeP = matchingHolding?.todaysPnLPercent;

    if (chipsHorizon > 1) {
      const targetIdx = Math.max(0, availableDates.length - 1 - chipsHorizon);
      const baseDate = availableDates.length > 1 ? availableDates[targetIdx] : null;
      const baseDayItem = baseDate && historyReportsMap ? historyReportsMap[baseDate]?.[item.symbol] : null;
      if (baseDayItem?.close && realPrice) {
        changeP = Math.round(((realPrice - baseDayItem.close) / baseDayItem.close) * 1000) / 10;
      } else if (changeP === undefined) {
        changeP = 0;
      }
    } else if (changeP === undefined) {
      const prevDate = availableDates.length >= 2 ? availableDates[availableDates.length - 2] : null;
      const prevDayItem = prevDate && historyReportsMap ? historyReportsMap[prevDate]?.[item.symbol] : null;
      if (prevDayItem?.close && item.close) {
        changeP = Math.round(((item.close - prevDayItem.close) / prevDayItem.close) * 1000) / 10;
      } else {
        changeP = 0;
      }
    }
    const histFlows = buildHoldingHistoricalFlows(
      {
        symbol: item.symbol,
        todaysPnLPercent: changeP,
        currentPrice: realPrice,
        market: 'TW',
      },
      availableDates,
      item,
      0,
      historyReportsMap
    );

    const volLots = item.volumeLots || Math.abs(item.totalNetShares) * 1.5;
    const trustRatio =
      item.trustToVolumeRatio ??
      (volLots > 0 ? Math.round((item.trustNetShares / volLots) * 1000) / 10 : 0);

    return {
      symbol: item.symbol,
      name: item.name,
      market: 'TW' as MarketType,
      currentPrice: realPrice,
      previousClose: realPrice - changeP,
      changePercent: Math.round(changeP * 100) / 100,
      volume: volLots * 1000,
      holdingValueTwd: matchingHolding?.grossMarketValue,
      isHolding: Boolean(matchingHolding),
      avgCost: matchingHolding?.avgCost,
      unrealizedPnLPercent: matchingHolding?.unrealizedPnLPercent,
      intent: matchingHolding?.intent,
      trustToVolumeRatio: trustRatio,
      trustStreak: item.trustStreak,
      foreignStreak: item.foreignStreak,
      netFlowAmountTwd: item.netFlowAmountTwd ?? item.totalNetShares * 1000 * realPrice,
      foreignBuyShares: item.foreignBuyShares,
      foreignSellShares: item.foreignSellShares,
      trustBuyShares: item.trustBuyShares,
      trustSellShares: item.trustSellShares,
      dealerBuyShares: item.dealerNetShares > 0 ? item.dealerNetShares : 0,
      dealerSellShares: item.dealerNetShares < 0 ? Math.abs(item.dealerNetShares) : 0,
      historicalDailyFlows: histFlows,
    };
  });

  if (marketFilter === 'ALL') {
    // ALL 模式混合前 10 檔美股巨頭 (優先採用真實日 K 與 CMF)
    const usMix: SmartMoneyInputItem[] = usSourceList.slice(0, 10).map((usItem) => {
      const realUs = usRealDataMap?.[usItem.symbol];
      const matchingHolding = holdings.find(
        (h) => !h.isClosed && h.shares > 0 && h.symbol.trim().toUpperCase() === usItem.symbol
      );
      const curPrice = realUs ? realUs.currentPrice : matchingHolding?.currentPrice || 1;
      let pnl = realUs ? realUs.changePercent : usItem.pnl;
      if (chipsHorizon > 1 && realUs?.candles && realUs.candles.length >= chipsHorizon + 1) {
        const baseCandle = realUs.candles[realUs.candles.length - 1 - chipsHorizon];
        if (baseCandle?.close && curPrice) {
          pnl = Math.round(((curPrice - baseCandle.close) / baseCandle.close) * 10000) / 100;
        }
      }
      return {
        symbol: usItem.symbol,
        name: usItem.name,
        market: 'US' as MarketType,
        currentPrice: curPrice,
        previousClose: realUs ? realUs.previousClose : curPrice - pnl,
        changePercent: pnl,
        holdingValueTwd: matchingHolding ? matchingHolding.grossMarketValue * usdToTwdRate : undefined,
        isHolding: Boolean(matchingHolding),
        avgCost: matchingHolding?.avgCost,
        unrealizedPnLPercent: matchingHolding?.unrealizedPnLPercent,
        intent: matchingHolding?.intent,
        volume: realUs ? realUs.volume : 2000000,
        candles: realUs?.candles && realUs.candles.length >= 20 ? realUs.candles : undefined,
        historicalDailyFlows: realUs?.historicalDailyFlows,
      };
    });
    return [...twItems, ...usMix];
  }

  // 純台股 (TW) 模式：100% 絕對無任何美股
  return twItems;
}

function mapSnapshotRowToInstitutional(sym: string, name: string, raw: any): TwseInstitutionalRow {
  const volLots = raw.volumeLots || 0;
  const trustRatio = volLots > 0 ? Math.round((raw.trustNet / volLots) * 1000) / 10 : 0;
  return {
    symbol: sym,
    name: name || sym,
    foreignBuyShares: raw.foreignNet > 0 ? raw.foreignNet : 0,
    foreignSellShares: raw.foreignNet < 0 ? Math.abs(raw.foreignNet) : 0,
    foreignNetShares: raw.foreignNet,
    trustBuyShares: raw.trustNet > 0 ? raw.trustNet : 0,
    trustSellShares: raw.trustNet < 0 ? Math.abs(raw.trustNet) : 0,
    trustNetShares: raw.trustNet,
    dealerNetShares: raw.dealerNet,
    totalNetShares: raw.totalNetShares,
    volumeLots: raw.volumeLots,
    close: raw.close,
    trustToVolumeRatio: trustRatio,
    netFlowAmountTwd: raw.totalNetShares * 1000 * (raw.close || 0),
  };
}

export interface ChipsWorkspaceProps {
  holdings: HoldingPosition[];
  colorTheme: ColorThemeMode;
  usdToTwdRate: number;
  market?: 'ALL' | MarketType;
  onMarketChange?: (market: 'ALL' | MarketType) => void;
  onOpenOmniInspector?: (symbol: string, market: MarketType) => void;
  onOpenAiForce?: (symbol: string, market: MarketType) => void;
  onOpenDeepDive?: (symbol: string, market: MarketType, name?: string) => void;
  onQuickTrade?: (symbol: string, market: MarketType) => void;
}

export const ChipsWorkspace: React.FC<ChipsWorkspaceProps> = ({
  holdings,
  colorTheme,
  usdToTwdRate,
  market,
  onMarketChange,
  onOpenOmniInspector,
  onOpenAiForce,
  onOpenDeepDive,
  onQuickTrade,
}) => {
  const activeHoldingsCount = holdings.filter((h) => !h.isClosed && h.shares > 0).length;
  const [viewMode, setViewMode] = useState<'PORTFOLIO' | 'MARKET'>(
    activeHoldingsCount > 0 ? 'PORTFOLIO' : 'MARKET'
  );
  const [internalMarketFilter, setInternalMarketFilter] = useState<'ALL' | MarketType>(market || 'ALL');
  const [includeEtf, setIncludeEtf] = useState<boolean>(false);
  const [lakehouseDates, setLakehouseDates] = useState<string[]>([]);

  useEffect(() => {
    if (activeHoldingsCount === 0 && viewMode === 'PORTFOLIO') {
      setViewMode('MARKET');
    }
  }, [activeHoldingsCount, viewMode]);

  useEffect(() => {
    if (market) {
      setInternalMarketFilter(market);
    }
  }, [market]);

  const marketFilter = market ?? internalMarketFilter;

  const handleSetMarketFilter = (m: 'ALL' | MarketType) => {
    setInternalMarketFilter(m);
    onMarketChange?.(m);
  };
  const [isLoading, setIsLoading] = useState(false);
  const [twseChipsMap, setTwseChipsMap] = useState<Record<string, TwseInstitutionalRow>>({});
  const [reportDate, setReportDate] = useState<string>(getLatestTradingDateString());
  const [isLiveToday, setIsLiveToday] = useState<boolean>(false);
  const [fallbackReason, setFallbackReason] = useState<'INCOMPLETE_DATA' | 'MARKET_NOT_READY' | undefined>(undefined);
  const [totalSymbols, setTotalSymbols] = useState<number>(0);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [historyReportsMap, setHistoryReportsMap] = useState<Record<string, Record<string, TwseInstitutionalRow>>>({});
  const [isHydratingHistory, setIsHydratingHistory] = useState<boolean>(false);
  // Spec 0120 Ticket 03: 美股真實 20D OHLCV 與 CMF 入庫映射
  const [usRealDataMap, setUsRealDataMap] = useState<Record<string, UsRealStockData>>({});
  const [isUsSyncing, setIsUsSyncing] = useState<boolean>(false);
  // Spec 0119: 動能時間窗選擇器狀態 (1D / 3D / 5D)
  const [chipsHorizon, setChipsHorizon] = useState<1 | 3 | 5>(1);
  const [quadrantFilter, setQuadrantFilter] = useState<SmartMoneyQuadrant | 'ALL'>('ALL');
  const [spotlightSymbol, setSpotlightSymbol] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableSortField, setTableSortField] = useState<string>('totalNetShares');
  const [tableSortAsc, setTableSortAsc] = useState<boolean>(false);
  const [isDecisionBoardExpanded, setIsDecisionBoardExpanded] = useState<boolean>(true);
  const [flowDimension, setFlowDimension] = useState<'AMOUNT' | 'RATIO' | 'SHARES'>('AMOUNT');
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  // 支援 5 個連續真實交易日供時序回放 (優先採用湖倉真實交易日序列，防範國定假日時序錯位)
  const availableDates = useMemo(() => {
    if (lakehouseDates.length > 0) return lakehouseDates;
    return getRecentTradingDateSequence(reportDate, 5);
  }, [lakehouseDates, reportDate]);

  // Spec 0119 Ticket 04: 依動能週期加總計算活動中的三大法人買賣超 (1D 亦透過 aggregateMultiDayChips 計算 Streak 與投量比)
  const activeChipsMap = useMemo(() => {
    if (Object.keys(historyReportsMap).length > 0) {
      return aggregateMultiDayChips(historyReportsMap, availableDates, chipsHorizon);
    }
    if (chipsHorizon === 1) return twseChipsMap;
    return aggregateMultiDayChips(historyReportsMap, availableDates, chipsHorizon);
  }, [chipsHorizon, twseChipsMap, historyReportsMap, availableDates]);

  // 初次掛載或點擊重整時抓取官方籌碼 (支援 forceRefresh 略過殘缺快取)
  const loadChipsData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      // 三級瀑布流第一級：優先嘗試本機 SQLite 湖倉快照端點 (Spec 0217 / Ticket 01 & 05)
      if (!forceRefresh) {
        try {
          const snapshot = await fetchSmartMoneyLakehouseSnapshot('TW', 5);
          if (snapshot && snapshot.success && snapshot.items && Object.keys(snapshot.items).length > 0) {
            const chipsMap: Record<string, TwseInstitutionalRow> = {};
            const histMap: Record<string, Record<string, TwseInstitutionalRow>> = {};

            for (const [sym, itm] of Object.entries(snapshot.items) as [string, any][]) {
              chipsMap[sym] = mapSnapshotRowToInstitutional(sym, itm.name, itm);

              if (itm.history && itm.history.length > 0) {
                for (const h of itm.history) {
                  if (!histMap[h.date]) histMap[h.date] = {};
                  histMap[h.date][sym] = mapSnapshotRowToInstitutional(sym, itm.name, h);
                }
              }
            }

            setTwseChipsMap(chipsMap);
            setHistoryReportsMap(histMap);
            if (snapshot.availableDates && snapshot.availableDates.length > 0) {
              const ascDates = [...snapshot.availableDates].sort();
              setLakehouseDates(ascDates);
              setReportDate(snapshot.availableDates[0].replace(/-/g, ''));
              setCurrentDateIndex(ascDates.length - 1);
            }
            setIsLiveToday(true);
            setTotalSymbols(Object.keys(chipsMap).length);
            return;
          }
        } catch {
          // 湖倉不可用時平滑降級進入第二/三級
        }
      }

      // 降級第二/三級：線上 TWSE/TPEx 日報或 IndexedDB 歷史快取
      const detailed = await fetchTwseInstitutionalReportDetailed(undefined, undefined, 5, forceRefresh);
      setTwseChipsMap(detailed.data);
      setReportDate(detailed.reportDate);
      setIsLiveToday(detailed.isLiveToday);
      setFallbackReason(detailed.fallbackReason);
      setTotalSymbols(detailed.totalSymbols);
      setCurrentDateIndex(4);
    } catch {
      // 容錯靜默處理
    } finally {
      setIsLoading(false);
    }
  };

  // 異步抓取並入庫美股持倉與全市場 Top 25 真實日 K 與 CMF (Spec 0120 Ticket 03)
  const loadUsData = useCallback(async (forceRefresh = false) => {
    setIsUsSyncing(true);
    try {
      const usHoldingSymbols = holdings
        .filter((h) => !h.isClosed && h.shares > 0 && h.market === 'US')
        .map((h) => h.symbol);
      const focusSymbols = US_MARKET_FOCUS_LIST.map((item) => item.symbol);
      const targetSymbols = Array.from(new Set([...usHoldingSymbols, ...focusSymbols]));

      const realMap = await fetchUsMarketRealData(targetSymbols, undefined, forceRefresh);
      setUsRealDataMap((prev) => ({ ...prev, ...realMap }));
    } catch {
      // 容錯靜默處理
    } finally {
      setIsUsSyncing(false);
    }
  }, [holdings]);

  useEffect(() => {
    loadChipsData();
    loadUsData();
  }, [loadUsData]);

  // 背景非同步增量補齊最近交易日日報至本地 IndexedDB (用時間換空間)
  useEffect(() => {
    let isMounted = true;
    const hydrateHistory = async () => {
      setIsHydratingHistory(true);
      try {
        const reports = await fetchRecentTwseReports(5);
        if (isMounted && reports && reports.length > 0) {
          const map: Record<string, Record<string, TwseInstitutionalRow>> = {};
          reports.forEach((r) => {
            map[r.date] = r.data;
          });
          setHistoryReportsMap((prev) => ({ ...prev, ...map }));
        }
      } catch {
        // 背景靜默容錯
      } finally {
        if (isMounted) setIsHydratingHistory(false);
      }
    };

    hydrateHistory();
    return () => {
      isMounted = false;
    };
  }, [reportDate]);

  // 依視圖模式與市場篩選產生 Input Items (採用累計週期 activeChipsMap 與真實美股日 K)
  const smartMoneyItems = useMemo<SmartMoneyInputItem[]>(() => {
    if (viewMode === 'PORTFOLIO') {
      // 在庫持倉模式預設呈現 100% 全部持倉（含 10 檔台股 ETF 與美股 VT，Ticket 07）
      const scopedHoldings = holdings
        .filter((h) => !h.isClosed && h.shares > 0)
        .filter((h) => marketFilter === 'ALL' || h.market === marketFilter);

      const totalPortfolioTwd = Math.max(
        scopedHoldings.reduce(
          (acc, h) => acc + (h.market === 'US' ? h.grossMarketValue * usdToTwdRate : h.grossMarketValue),
          0
        ),
        1
      );

      // 1. 在庫持倉模式
      return scopedHoldings.map((h) => {
        const cleanSymbol = h.symbol.replace(/\.(TW|TWO)$/i, '').trim();
        const twseData = activeChipsMap[cleanSymbol] || activeChipsMap[h.symbol];

        // 估算持倉價值 (TWD) 與部位權重
        const valTwd = h.market === 'US' ? h.grossMarketValue * usdToTwdRate : h.grossMarketValue;
        const weightPct = Math.round((valTwd / totalPortfolioTwd) * 1000) / 10;

        // 美股優先採用真實 20D OHLCV 與 CMF (Spec 0120 Ticket 03: 徹底移除合成模擬)
        let usCandles: { date: string; open: number; high: number; low: number; close: number; volume: number }[] | undefined;
        let baseUsCmf = 0;
        if (h.market === 'US') {
          const cleanSym = h.symbol.trim().toUpperCase();
          const realUs = usRealDataMap[cleanSym];
          if (realUs && realUs.candles && realUs.candles.length >= 20) {
            usCandles = realUs.candles;
            baseUsCmf = realUs.cmf;
          } else {
            baseUsCmf = 0;
          }
        }

        // 生成歷史時序位移點 (優先對齊 IndexedDB 本地已沉澱之真實日報)
        const histFlows = buildHoldingHistoricalFlows(
          h,
          availableDates,
          twseData,
          baseUsCmf,
          historyReportsMap
        );

        const volLots = twseData?.volumeLots || 0;
        const trustRatio =
          twseData?.trustToVolumeRatio ??
          (volLots > 0 && twseData ? Math.round((twseData.trustNetShares / volLots) * 1000) / 10 : undefined);

        let changePercent = h.todaysPnLPercent || 0;
        if (chipsHorizon > 1) {
          if (h.market === 'US' && usCandles && usCandles.length >= chipsHorizon + 1) {
            const baseCandle = usCandles[usCandles.length - 1 - chipsHorizon];
            if (baseCandle?.close && h.currentPrice) {
              changePercent = Math.round(((h.currentPrice - baseCandle.close) / baseCandle.close) * 10000) / 100;
            }
          } else if (h.market === 'TW') {
            const targetIdx = Math.max(0, availableDates.length - 1 - chipsHorizon);
            const baseDate = availableDates.length > 1 ? availableDates[targetIdx] : null;
            const baseDayItem =
              baseDate && historyReportsMap
                ? historyReportsMap[baseDate]?.[cleanSymbol] || historyReportsMap[baseDate]?.[h.symbol]
                : null;
            if (baseDayItem?.close && h.currentPrice) {
              changePercent = Math.round(((h.currentPrice - baseDayItem.close) / baseDayItem.close) * 1000) / 10;
            }
          }
        }

        return {
          symbol: h.symbol,
          name: h.name || h.symbol,
          market: h.market,
          currentPrice: h.currentPrice,
          previousClose: h.currentPrice - (h.todaysChange || 0),
          changePercent,
          holdingValueTwd: valTwd,
          isHolding: true,
          avgCost: h.avgCost,
          unrealizedPnLPercent: h.unrealizedPnLPercent,
          portfolioWeightPercent: weightPct,
          intent: h.intent,
          trustToVolumeRatio: trustRatio,
          trustStreak: twseData?.trustStreak,
          foreignStreak: twseData?.foreignStreak,
          netFlowAmountTwd: twseData?.netFlowAmountTwd,
          volume: volLots > 0 ? volLots * 1000 : h.shares,
          foreignBuyShares: twseData?.foreignBuyShares,
          foreignSellShares: twseData?.foreignSellShares,
          trustBuyShares: twseData?.trustBuyShares,
          trustSellShares: twseData?.trustSellShares,
          dealerBuyShares: twseData?.dealerNetShares && twseData.dealerNetShares > 0 ? twseData.dealerNetShares : 0,
          dealerSellShares: twseData?.dealerNetShares && twseData.dealerNetShares < 0 ? Math.abs(twseData.dealerNetShares) : 0,
          candles: usCandles,
          historicalDailyFlows: histFlows,
        };
      });
    } else {
      // 2. 全市場法人與機構焦點模式 (由 filterMarketFocusList 統一嚴格處理市場純度，使用 activeChipsMap 與 usRealDataMap)
      return filterMarketFocusList(
        marketFilter,
        activeChipsMap,
        holdings,
        availableDates,
        historyReportsMap,
        usRealDataMap,
        includeEtf,
        chipsHorizon,
        usdToTwdRate
      );
    }
  }, [holdings, activeChipsMap, viewMode, marketFilter, usdToTwdRate, availableDates, historyReportsMap, usRealDataMap, includeEtf, chipsHorizon]);

  // Spec 0119 Ticket 04: 動態計算當前週期的決策排行榜 (可以買 vs 一定要閃)
  const cardStyles = getChipsQuadrantCardStyles(colorTheme);
  const upColor = colorTheme === 'taiwan' ? '#f87171' : '#34d399';
  const downColor = colorTheme === 'taiwan' ? '#34d399' : '#f87171';

  const momentumSignals = useMemo(() => {
    return getTopMomentumSymbols(activeChipsMap, 4, { excludeEtf: !includeEtf, market: marketFilter === 'US' ? 'US' : 'TW' });
  }, [activeChipsMap, includeEtf, marketFilter]);

  // 透過量化引擎計算四象限模型 (支援維度切換與持倉特化 Ticket 08)
  const analysisResult = useMemo(() => {
    return calculateSmartMoneyFlowDynamics(smartMoneyItems, {
      isPortfolioMode: viewMode === 'PORTFOLIO',
      flowDimension,
    });
  }, [smartMoneyItems, viewMode, flowDimension]);

  // 產業資金輪動聚合 (Ticket 09 / Spec 0218)
  const sectorRotation = useMemo(() => {
    return calculateSectorRotation(smartMoneyItems);
  }, [smartMoneyItems]);
  // 依象限與產業輪動過濾泡泡 (Ticket 07 & 09 / Spec 0218)
  const displayBubbles = useMemo(() => {
    let list = analysisResult.bubbles;
    if (quadrantFilter !== 'ALL') {
      list = list.filter((b) => b.quadrant === quadrantFilter);
    }
    if (selectedIndustry) {
      list = list.filter((b) => (b as any).industry === selectedIndustry);
    }
    return list;
  }, [analysisResult.bubbles, quadrantFilter, selectedIndustry]);


  // 依據當前選取的時序日期 (currentDateIndex) 動態重新統計當前影格之四象限檔數，杜絕 T-4 切換時數字凍結
  const currentFrameCounts = useMemo(() => {
    if (!analysisResult.bubbles || analysisResult.bubbles.length === 0) {
      return { breakoutCount: 0, accumulationCount: 0, distributionCount: 0, liquidationCount: 0 };
    }
    const currentDate = availableDates[currentDateIndex] || availableDates[availableDates.length - 1];

    let breakoutCount = 0;
    let accumulationCount = 0;
    let distributionCount = 0;
    let liquidationCount = 0;

    for (const b of analysisResult.bubbles) {
      const frameData = getTemporalBubbleFrameData(b, currentDateIndex, currentDate);
      switch (frameData.quadrant) {
        case 'BREAKOUT':
          breakoutCount++;
          break;
        case 'ACCUMULATION':
          accumulationCount++;
          break;
        case 'DISTRIBUTION':
          distributionCount++;
          break;
        case 'LIQUIDATION':
        default:
          liquidationCount++;
          break;
      }
    }

    return {
      breakoutCount,
      accumulationCount,
      distributionCount,
      liquidationCount,
    };
  }, [analysisResult.bubbles, currentDateIndex, availableDates]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 頂部操作工具列 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.65)',
          padding: '12px 18px',
          borderRadius: '14px',
          border: '1px solid rgba(51, 65, 85, 0.4)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* 左側：視圖切換器 (在庫持倉 vs 全市場焦點) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setViewMode('PORTFOLIO')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: viewMode === 'PORTFOLIO' ? '1px solid #3b82f6' : '1px solid transparent',
              background: viewMode === 'PORTFOLIO' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              color: viewMode === 'PORTFOLIO' ? '#93c5fd' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <PieChart size={15} />
            <span>我的在庫持倉 ({holdings.filter((h) => !h.isClosed && h.shares > 0).length})</span>
          </button>

          <button
            onClick={() => setViewMode('MARKET')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: viewMode === 'MARKET' ? '1px solid #8b5cf6' : '1px solid transparent',
              background: viewMode === 'MARKET' ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
              color: viewMode === 'MARKET' ? '#c4b5fd' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Sparkles size={15} />
            <span>全市場法人焦點 Top 30</span>
          </button>
        </div>

        {/* 右側：市場篩選與重新同步按鈕 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(30, 41, 59, 0.6)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid rgba(51, 65, 85, 0.3)',
            }}
          >
            {(['ALL', 'TW', 'US'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleSetMarketFilter(m)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: marketFilter === m ? '#3b82f6' : 'transparent',
                  color: marketFilter === m ? '#ffffff' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'ALL' ? '全部' : m === 'TW' ? '台股' : '美股'}
              </button>
            ))}
          </div>

          {/* ETF 造市過濾開關 (Ticket 04 / Spec 0217) */}
          <button
            onClick={() => setIncludeEtf(!includeEtf)}
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              border: includeEtf ? '1px solid #f59e0b' : '1px solid rgba(51, 65, 85, 0.5)',
              background: includeEtf ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.6)',
              color: includeEtf ? '#fcd34d' : '#94a3b8',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title="預設排除 ETF 造市套利巨量干擾；點擊切換是否納入 ETF"
          >
            {includeEtf ? '✓ 含 ETF' : '不含 ETF (預設)'}
          </button>

          {/* 動能時間窗選擇器 (1日 / 3日 / 5日) (Spec 0119 Ticket 03) */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(30, 41, 59, 0.7)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid rgba(51, 65, 85, 0.6)',
              gap: '2px',
            }}
            title="切換動能時間窗：加總法人近 1 日 / 3 日 / 5 日累計買賣超，過濾單日隔日沖雜訊"
          >
            {([1, 3, 5] as const).map((days) => (
              <button
                key={days}
                onClick={() => setChipsHorizon(days)}
                style={{
                  padding: '4px 9px',
                  borderRadius: '7px',
                  border: 'none',
                  background: chipsHorizon === days ? 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)' : 'transparent',
                  color: chipsHorizon === days ? '#ffffff' : '#94a3b8',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {days === 1 ? '1日 (當日)' : days === 3 ? '3日 (短波段)' : '5日 (週籌碼)'}
              </button>
            ))}
          </div>

          {/* Y 軸維度選擇器 (金額 / 投量比 / 張數) (Ticket 08 / Spec 0218) */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(30, 41, 59, 0.7)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid rgba(51, 65, 85, 0.6)',
              gap: '2px',
            }}
            title="切換星圖 Y 軸衡量維度：以真金白銀【買賣超金額】、【投量比】或【張數】展開縱軸"
          >
            {[
              { id: 'AMOUNT', label: '💰 金額榜' },
              { id: 'RATIO', label: '🎯 投量比' },
              { id: 'SHARES', label: '📊 張數榜' },
            ].map((dim) => (
              <button
                key={dim.id}
                onClick={() => setFlowDimension(dim.id as any)}
                style={{
                  padding: '4px 9px',
                  borderRadius: '7px',
                  border: 'none',
                  background: flowDimension === dim.id ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                  color: flowDimension === dim.id ? '#ffffff' : '#94a3b8',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {dim.label}
              </button>
            ))}
          </div>

          {/* 台股籌碼資料狀態徽章 (Spec 0117 / Spec 0119 / Spec 0120 雙市場 HUD) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '8px',
              background: isLiveToday ? 'rgba(16, 185, 129, 0.15)' : fallbackReason === 'INCOMPLETE_DATA' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.15)',
              border: isLiveToday ? '1px solid rgba(16, 185, 129, 0.35)' : fallbackReason === 'INCOMPLETE_DATA' ? '1px solid rgba(234, 179, 8, 0.5)' : '1px solid rgba(234, 179, 8, 0.35)',
              color: isLiveToday ? '#6ee7b7' : '#fde047',
              fontSize: '0.74rem',
              fontWeight: 600,
            }}
            title={
              fallbackReason === 'INCOMPLETE_DATA'
                ? `今日盤後證交所 API 數據未完整 (檔數過少或全0張)，系統已自動優雅降級呈現 ${reportDate} 完整已結算日報`
                : isLiveToday
                ? `臺灣證交所與櫃買中心今日 ${reportDate} 盤後三大法人已完整公布與同步 (上市 + 上櫃雙軌原子合流)`
                : `盤中尚未公布今日日報 (預計 15:30 公布)，目前顯示 ${reportDate} 已結算完整籌碼`
            }
          >
            <span>
              {isLiveToday
                ? `🟢 台股已同步：${reportDate.substring(4, 6)}/${reportDate.substring(6, 8)} 盤後 (共 ${totalSymbols} 檔)`
                : fallbackReason === 'INCOMPLETE_DATA'
                ? `🟡 盤後結算中：暫呈 ${reportDate.substring(4, 6)}/${reportDate.substring(6, 8)} 完整日報 (${totalSymbols} 檔)`
                : `🕒 盤中模式：顯示 ${reportDate.substring(4, 6)}/${reportDate.substring(6, 8)} 盤後 (${totalSymbols} 檔)`}
            </span>
          </div>

          {/* 美股真實日 K 與 CMF 健康度徽章 (Spec 0120 Ticket 03, Ticket 04) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '8px',
              background: Object.keys(usRealDataMap).length > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(234, 179, 8, 0.15)',
              border: Object.keys(usRealDataMap).length > 0 ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(234, 179, 8, 0.35)',
              color: Object.keys(usRealDataMap).length > 0 ? '#93c5fd' : '#fde047',
              fontSize: '0.74rem',
              fontWeight: 600,
            }}
            title="美股聰明錢全面接入 Yahoo Finance 官方真實 20D OHLCV 與標準 CMF 佳慶資金流向指標"
          >
            <span>
              {isUsSyncing
                ? '⏳ 美股同步中...'
                : Object.keys(usRealDataMap).length > 0
                ? `🟢 美股已同步：真實 20D CMF (${Object.keys(usRealDataMap).length} 檔已入庫)`
                : '🟡 美股準備中'}
            </span>
          </div>

          <button
            onClick={() => {
              loadChipsData(true);
              loadUsData(true);
            }}
            disabled={isLoading || isUsSyncing}
            title={`點擊強制全量重新校驗並同步台美雙市場籌碼日報與真實日 K (本地已沉澱 ${Object.keys(historyReportsMap).length} 個交易日)`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: 'rgba(51, 65, 85, 0.4)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              color: '#cbd5e1',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: (isLoading || isUsSyncing) ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={13} className={(isLoading || isUsSyncing) ? 'animate-spin' : ''} />
            <span>{(isLoading || isUsSyncing) ? '雙市場同步中...' : '雙市場全量重新同步'}</span>
          </button>
          {isHydratingHistory && (
            <span style={{ fontSize: '0.72rem', color: '#93c5fd' }}>⏳ 補足歷史中...</span>
          )}
        </div>
      </div>

      {/* 四象限診斷摘要微型卡片 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {/* 頂部象限統計指標卡 (依據使用者選擇習慣燈號顏色顯示) */}
        {(() => {
          const cardStyles = getChipsQuadrantCardStyles(colorTheme);
          return (
            <>
              <div
                onClick={() => setQuadrantFilter(quadrantFilter === 'BREAKOUT' ? 'ALL' : 'BREAKOUT')}
                style={{
                  background: cardStyles.breakout.bg,
                  border: quadrantFilter === 'BREAKOUT' ? '2px solid #ef4444' : cardStyles.breakout.border,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transform: quadrantFilter === 'BREAKOUT' ? 'scale(1.02)' : 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: quadrantFilter === 'BREAKOUT' ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none',
                }}
                title="點擊篩選：僅展示主力抬轎區標的"
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: cardStyles.breakout.titleColor, fontWeight: 600 }}>🔥 主力抬轎區</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: cardStyles.breakout.countColor, marginTop: '2px' }}>
                    {currentFrameCounts.breakoutCount} <span style={{ fontSize: '0.75rem' }}>檔</span>
                  </div>
                </div>
                <Flame size={24} color={cardStyles.breakout.iconColor} opacity={0.8} />
              </div>

              <div
                onClick={() => setQuadrantFilter(quadrantFilter === 'ACCUMULATION' ? 'ALL' : 'ACCUMULATION')}
                style={{
                  background: cardStyles.accumulation.bg,
                  border: quadrantFilter === 'ACCUMULATION' ? '2px solid #f59e0b' : cardStyles.accumulation.border,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transform: quadrantFilter === 'ACCUMULATION' ? 'scale(1.02)' : 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: quadrantFilter === 'ACCUMULATION' ? '0 0 15px rgba(245, 158, 11, 0.4)' : 'none',
                }}
                title="點擊篩選：僅展示逢低撿便宜區標的"
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: cardStyles.accumulation.titleColor, fontWeight: 600 }}>🛡️ 逢低撿便宜區</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: cardStyles.accumulation.countColor, marginTop: '2px' }}>
                    {currentFrameCounts.accumulationCount} <span style={{ fontSize: '0.75rem' }}>檔</span>
                  </div>
                </div>
                <ShieldCheck size={24} color={cardStyles.accumulation.iconColor} opacity={0.8} />
              </div>

              <div
                onClick={() => setQuadrantFilter(quadrantFilter === 'DISTRIBUTION' ? 'ALL' : 'DISTRIBUTION')}
                style={{
                  background: cardStyles.distribution.bg,
                  border: quadrantFilter === 'DISTRIBUTION' ? '2px solid #10b981' : cardStyles.distribution.border,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transform: quadrantFilter === 'DISTRIBUTION' ? 'scale(1.02)' : 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: quadrantFilter === 'DISTRIBUTION' ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none',
                }}
                title="點擊篩選：僅展示割韭菜警戒區標的"
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: cardStyles.distribution.titleColor, fontWeight: 600 }}>⚠️ 割韭菜警戒區</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: cardStyles.distribution.countColor, marginTop: '2px' }}>
                    {currentFrameCounts.distributionCount} <span style={{ fontSize: '0.75rem' }}>檔</span>
                  </div>
                </div>
                <AlertTriangle size={24} color={cardStyles.distribution.iconColor} opacity={0.8} />
              </div>

              <div
                onClick={() => setQuadrantFilter(quadrantFilter === 'LIQUIDATION' ? 'ALL' : 'LIQUIDATION')}
                style={{
                  background: cardStyles.liquidation.bg,
                  border: quadrantFilter === 'LIQUIDATION' ? '2px solid #94a3b8' : cardStyles.liquidation.border,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transform: quadrantFilter === 'LIQUIDATION' ? 'scale(1.02)' : 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: quadrantFilter === 'LIQUIDATION' ? '0 0 15px rgba(148, 163, 184, 0.4)' : 'none',
                }}
                title="點擊篩選：僅展示冷凍提款區標的"
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: cardStyles.liquidation.titleColor, fontWeight: 600 }}>❄️ 冷凍提款區</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: cardStyles.liquidation.countColor, marginTop: '2px' }}>
                    {currentFrameCounts.liquidationCount} <span style={{ fontSize: '0.75rem' }}>檔</span>
                  </div>
                </div>
                <Snowflake size={24} color={cardStyles.liquidation.iconColor} opacity={0.8} />
              </div>
            </>
          );
        })()}
      </div>

      {/* 聰明錢動態決策快報看板 (Spec 0119 Ticket 04: 一眼秒懂熱門、可以買是誰、要閃是誰) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(51, 65, 85, 0.6)',
          borderRadius: '14px',
          padding: '14px 16px',
        }}
      >
        <div
          onClick={() => setIsDecisionBoardExpanded(!isDecisionBoardExpanded)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem' }}>🧭</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>
              聰明錢動態決策快報 ({chipsHorizon === 1 ? '今日即時' : `近 ${chipsHorizon} 日累計`})
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(51, 65, 85, 0.5)', padding: '2px 8px', borderRadius: '6px' }}>
              3秒看懂資金流向
            </span>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600 }}>
            {isDecisionBoardExpanded ? '收合 ▲' : '展開盤勢解讀 ▼'}
          </span>
        </div>

        {isDecisionBoardExpanded && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(51, 65, 85, 0.4)',
            }}
          >
            {/* 1. 法人聯手搶買榜 (可以買) */}
            <div
              style={{
                background: cardStyles.breakout.bg,
                border: cardStyles.breakout.border,
                borderRadius: '10px',
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px' }}>
                <Flame size={15} /> 🟢 法人聯手搶買榜 (推升力道強 · 可多方留意)
              </div>
              {momentumSignals.buyList.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>當前週期未見明顯雙法人共買標的</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {momentumSignals.buyList.map((item) => {
                    const sig = classifyInstitutionalSignal(item);
                    return (
                      <div
                        key={item.symbol}
                        onClick={() => setSpotlightSymbol(item.symbol)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.78rem',
                          padding: '5px 8px',
                          background: spotlightSymbol === item.symbol ? 'rgba(59, 130, 246, 0.3)' : 'rgba(15, 23, 42, 0.5)',
                          border: spotlightSymbol === item.symbol ? '1px solid #3b82f6' : '1px solid transparent',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="點擊於星圖中高亮定位此泡泡"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="mono" style={{ fontWeight: 700, color: '#f8fafc' }}>{item.symbol}</span>
                          <span style={{ color: '#cbd5e1' }}>{item.name}</span>
                          <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: sig.badgeBg, color: sig.color }}>
                            {sig.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>外資+{item.foreignNetShares.toLocaleString()}</span>
                          <span style={{ fontSize: '0.7rem', color: '#93c5fd' }}>投信+{item.trustNetShares.toLocaleString()}</span>
                          <span className="mono" style={{ fontWeight: 800, color: '#34d399' }}>+{item.totalNetShares.toLocaleString()}張</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. 主力大舉提款榜 (一定要閃) */}
            <div
              style={{
                background: cardStyles.distribution.bg,
                border: cardStyles.distribution.border,
                borderRadius: '10px',
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px' }}>
                <AlertTriangle size={15} /> 🔴 主力大舉提款榜 (提款出逃 · 嚴防接刀)
              </div>
              {momentumSignals.dumpList.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>當前週期未見主力大幅倒貨標的</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {momentumSignals.dumpList.map((item) => {
                    const sig = classifyInstitutionalSignal(item);
                    return (
                      <div
                        key={item.symbol}
                        onClick={() => setSpotlightSymbol(item.symbol)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.78rem',
                          padding: '5px 8px',
                          background: spotlightSymbol === item.symbol ? 'rgba(239, 68, 68, 0.3)' : 'rgba(15, 23, 42, 0.5)',
                          border: spotlightSymbol === item.symbol ? '1px solid #ef4444' : '1px solid transparent',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="點擊於星圖中高亮定位此泡泡"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="mono" style={{ fontWeight: 700, color: '#f8fafc' }}>{item.symbol}</span>
                          <span style={{ color: '#cbd5e1' }}>{item.name}</span>
                          <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: sig.badgeBg, color: sig.color }}>
                            {sig.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#fca5a5' }}>外資{item.foreignNetShares.toLocaleString()}</span>
                          <span style={{ fontSize: '0.7rem', color: '#fdba74' }}>投信{item.trustNetShares.toLocaleString()}</span>
                          <span className="mono" style={{ fontWeight: 800, color: '#ef4444' }}>{item.totalNetShares.toLocaleString()}張</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 聰明錢淨流入 Top 5 vs 淨流出 Top 3 產業資金輪動橫條 (Ticket 09 / Spec 0218) */}
      {(sectorRotation.topInflows.length > 0 || sectorRotation.topOutflows.length > 0) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(51, 65, 85, 0.45)',
          }}
        >
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>
            🌊 產業資金輪動：
          </span>
          {sectorRotation.topInflows.map((sec) => (
            <button
              key={sec.industry}
              onClick={() => setSelectedIndustry(selectedIndustry === sec.industry ? null : sec.industry)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: selectedIndustry === sec.industry ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.25)',
                background: selectedIndustry === sec.industry ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.12)',
                color: '#fca5a5',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={`${sec.industry}三大法人淨買入 ${(sec.netAmount / 100000000).toFixed(1)} 億元，點擊過濾`}
            >
              <span>🔥 {sec.industry}</span>
              <span className="mono">+{(sec.netAmount / 100000000).toFixed(1)}億</span>
            </button>
          ))}
          {sectorRotation.topOutflows.map((sec) => (
            <button
              key={sec.industry}
              onClick={() => setSelectedIndustry(selectedIndustry === sec.industry ? null : sec.industry)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: selectedIndustry === sec.industry ? '1px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.25)',
                background: selectedIndustry === sec.industry ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.12)',
                color: '#93c5fd',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={`${sec.industry}三大法人淨賣出 ${Math.abs(sec.netAmount / 100000000).toFixed(1)} 億元，點擊過濾`}
            >
              <span>💧 {sec.industry}</span>
              <span className="mono">{(sec.netAmount / 100000000).toFixed(1)}億</span>
            </button>
          ))}
          {selectedIndustry && (
            <button
              onClick={() => setSelectedIndustry(null)}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: 'rgba(51, 65, 85, 0.4)',
                color: '#cbd5e1',
                fontSize: '0.7rem',
                cursor: 'pointer',
              }}
            >
              ✕ 重置過濾
            </button>
          )}
        </div>
      )}

      {/* 核心泡泡圖元件 */}
      <SmartMoneyBubbleChart
        bubbles={displayBubbles}
        focusedSymbol={spotlightSymbol}
        chipsHorizon={chipsHorizon}
        onOpenOmniInspector={onOpenOmniInspector}
        onOpenAiForce={onOpenAiForce}
        onOpenDeepDive={onOpenDeepDive}
        onQuickTrade={onQuickTrade}
        colorTheme={colorTheme}
        availableDates={availableDates}
        currentDateIndex={currentDateIndex}
        onDateChange={setCurrentDateIndex}
        summaryText={analysisResult.summaryText}
        overallSentiment={analysisResult.overallSentiment}
      />

      {/* 實戰籌碼與部位作戰明細表 (Ticket 07 & 08 / Spec 0217) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(51, 65, 85, 0.5)',
          borderRadius: '16px',
          padding: '18px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
              📊 實戰籌碼與部位作戰明細表
            </span>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(51, 65, 85, 0.6)', color: '#cbd5e1' }}>
              共 {displayBubbles.length} 檔標的
            </span>
            {quadrantFilter !== 'ALL' && (
              <button
                onClick={() => setQuadrantFilter('ALL')}
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  cursor: 'pointer',
                }}
              >
                ✕ 清除象限過濾
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="搜尋代號或名稱..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(71, 85, 105, 0.6)',
                borderRadius: '8px',
                padding: '6px 12px',
                color: '#f8fafc',
                fontSize: '0.8rem',
                outline: 'none',
                width: '180px',
              }}
            />
          </div>
        </div>

        {/* 明細數據表格 */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.8)', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>標的</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>象限狀態</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>躍遷轉折</th>
                <th onClick={() => { setTableSortField('changePercent'); setTableSortAsc(!tableSortAsc); }} style={{ padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }}>漲跌幅 ↕</th>
                <th onClick={() => { setTableSortField('foreignNetShares'); setTableSortAsc(!tableSortAsc); }} style={{ padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }}>外資買賣 ↕</th>
                <th onClick={() => { setTableSortField('trustNetShares'); setTableSortAsc(!tableSortAsc); }} style={{ padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }}>投信買賣 ↕</th>
                <th onClick={() => { setTableSortField('trustToVolumeRatio'); setTableSortAsc(!tableSortAsc); }} style={{ padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }}>投量比 ↕</th>
                <th onClick={() => { setTableSortField('totalNetShares'); setTableSortAsc(!tableSortAsc); }} style={{ padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }}>三大法人合計 ↕</th>
                <th onClick={() => { setTableSortField('unrealizedPnLPercent'); setTableSortAsc(!tableSortAsc); }} style={{ padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }}>未實現損益 ↕</th>
                <th style={{ padding: '8px 10px', fontWeight: 700 }}>快速行動</th>
              </tr>
            </thead>
            <tbody>
              {displayBubbles
                .filter((b) => {
                  if (!tableSearch) return true;
                  const q = tableSearch.toLowerCase();
                  return b.symbol.toLowerCase().includes(q) || b.name.toLowerCase().includes(q);
                })
                .sort((a, b) => {
                  let valA = 0;
                  let valB = 0;
                  if (tableSortField === 'changePercent') { valA = a.changePercent; valB = b.changePercent; }
                  else if (tableSortField === 'foreignNetShares') { valA = a.foreignNetShares || 0; valB = b.foreignNetShares || 0; }
                  else if (tableSortField === 'trustNetShares') { valA = a.trustNetShares || 0; valB = b.trustNetShares || 0; }
                  else if (tableSortField === 'trustToVolumeRatio') { valA = a.trustToVolumeRatio || 0; valB = b.trustToVolumeRatio || 0; }
                  else if (tableSortField === 'unrealizedPnLPercent') { valA = a.unrealizedPnLPercent ?? -999; valB = b.unrealizedPnLPercent ?? -999; }
                  else {
                    valA = (a.foreignNetShares || 0) + (a.trustNetShares || 0) + (a.dealerNetShares || 0);
                    valB = (b.foreignNetShares || 0) + (b.trustNetShares || 0) + (b.dealerNetShares || 0);
                  }
                  return tableSortAsc ? valA - valB : valB - valA;
                })
                .map((b) => {
                  const isSpotlight = spotlightSymbol === b.symbol;
                  const totalShares = (b.foreignNetShares || 0) + (b.trustNetShares || 0) + (b.dealerNetShares || 0);
                  return (
                    <tr
                      key={b.symbol}
                      onClick={() => setSpotlightSymbol(spotlightSymbol === b.symbol ? null : b.symbol)}
                      style={{
                        borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
                        cursor: 'pointer',
                        background: isSpotlight ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '9px 10px', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#f8fafc' }}>{b.name}</span>
                          <span className="mono" style={{ color: '#94a3b8', fontSize: '0.72rem' }}>({b.symbol})</span>
                          {b.isHolding && (
                            <span style={{ color: '#facc15', fontSize: '0.75rem', fontWeight: 900 }}>★</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ fontSize: '0.74rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(51, 65, 85, 0.5)', color: '#cbd5e1' }}>
                          {b.quadrantLabel}
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        {(() => {
                          const sigs = detectActionableSignals(
                            {
                              changePercent: b.changePercent,
                              totalNetShares: (b.foreignNetShares || 0) + (b.trustNetShares || 0) + (b.dealerNetShares || 0),
                              netFlowAmount: b.netFlowAmount,
                              foreignBuyShares: b.foreignNetShares && b.foreignNetShares > 0 ? b.foreignNetShares : 0,
                              foreignSellShares: b.foreignNetShares && b.foreignNetShares < 0 ? Math.abs(b.foreignNetShares) : 0,
                              trustBuyShares: b.trustNetShares && b.trustNetShares > 0 ? b.trustNetShares : 0,
                              trustSellShares: b.trustNetShares && b.trustNetShares < 0 ? Math.abs(b.trustNetShares) : 0,
                            },
                            { trustStreak: b.trustStreak, foreignStreak: b.foreignStreak }
                          );
                          const primarySig = sigs.length > 0 ? sigs[0] : null;

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {b.crossoverLabel && b.crossoverLabel !== '穩態延續' && (
                                <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.15)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                                  {b.crossoverLabel}
                                </span>
                              )}
                              {primarySig ? (
                                <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', background: primarySig.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: primarySig.severity === 'HIGH' ? '#fca5a5' : '#6ee7b7' }} title={primarySig.detail}>
                                  {primarySig.label}
                                </span>
                              ) : (!b.crossoverLabel || b.crossoverLabel === '穩態延續') ? (
                                <span style={{ color: '#64748b', fontSize: '0.72rem' }}>—</span>
                              ) : null}
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: b.changePercent >= 0 ? upColor : downColor }}>
                        {b.changePercent >= 0 ? '+' : ''}{b.changePercent.toFixed(1)}%
                      </td>
                      {b.market === 'US' ? (
                        <>
                          <td style={{ padding: '9px 10px', color: (b.cmf || 0) >= 0 ? upColor : downColor, fontWeight: 700 }}>
                            {b.cmf !== undefined ? `CMF ${b.cmf >= 0 ? '+' : ''}${b.cmf.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '9px 10px', color: '#64748b' }}>—</td>
                          <td style={{ padding: '9px 10px', color: '#64748b' }}>—</td>
                          <td style={{ padding: '9px 10px', color: '#cbd5e1', fontWeight: 600 }}>
                            {b.volume ? `${(b.volume).toLocaleString()}股` : '—'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '9px 10px', color: (b.foreignNetShares || 0) >= 0 ? upColor : downColor }}>
                            {b.foreignNetShares !== undefined
                              ? `${b.foreignNetShares >= 0 ? '+' : ''}${b.foreignNetShares.toLocaleString()}張${b.foreignStreak ? ` (${b.foreignStreak > 0 ? `連買${b.foreignStreak}` : `連賣${Math.abs(b.foreignStreak)}`})` : ''}`
                              : '—'}
                          </td>
                          <td style={{ padding: '9px 10px', color: (b.trustNetShares || 0) >= 0 ? upColor : downColor }}>
                            {b.trustNetShares !== undefined
                              ? `${b.trustNetShares >= 0 ? '+' : ''}${b.trustNetShares.toLocaleString()}張${b.trustStreak ? ` (${b.trustStreak > 0 ? `連買${b.trustStreak}` : `連賣${Math.abs(b.trustStreak)}`})` : ''}`
                              : '—'}
                          </td>
                          <td style={{ padding: '9px 10px', fontWeight: 700, color: (b.trustToVolumeRatio || 0) >= 5 ? '#f59e0b' : '#cbd5e1' }}>
                            {b.trustToVolumeRatio !== undefined ? `${b.trustToVolumeRatio.toFixed(1)}%` : '—'}
                          </td>
                          <td style={{ padding: '9px 10px', fontWeight: 800, color: totalShares >= 0 ? upColor : downColor }}>
                            {totalShares >= 0 ? '+' : ''}{totalShares.toLocaleString()}張
                          </td>
                        </>
                      )}
                      <td style={{ padding: '9px 10px', fontWeight: 700 }}>
                        {b.unrealizedPnLPercent !== undefined ? (
                          <span style={{ color: b.unrealizedPnLPercent >= 0 ? upColor : downColor }}>
                            {b.unrealizedPnLPercent >= 0 ? '+' : ''}{b.unrealizedPnLPercent.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>未持有</span>
                        )}
                      </td>
                      <td style={{ padding: '9px 10px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {onOpenOmniInspector && (
                            <button
                              onClick={() => onOpenOmniInspector(b.symbol, b.market)}
                              style={{ padding: '3px 6px', fontSize: '0.68rem', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#93c5fd', cursor: 'pointer' }}
                            >
                              K線
                            </button>
                          )}
                          {onOpenDeepDive && (
                            <button
                              onClick={() => onOpenDeepDive(b.symbol, b.market, b.name)}
                              style={{ padding: '3px 6px', fontSize: '0.68rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fde68a', cursor: 'pointer' }}
                            >
                              深研
                            </button>
                          )}
                          {onOpenAiForce && (
                            <button
                              onClick={() => onOpenAiForce(b.symbol, b.market)}
                              style={{ padding: '3px 6px', fontSize: '0.68rem', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.4)', color: '#c4b5fd', cursor: 'pointer' }}
                            >
                              主力
                            </button>
                          )}
                          {onQuickTrade && (
                            <button
                              onClick={() => onQuickTrade(b.symbol, b.market)}
                              style={{ padding: '3px 6px', fontSize: '0.68rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#6ee7b7', cursor: 'pointer' }}
                            >
                              下單
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
