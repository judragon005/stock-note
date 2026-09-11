import React, { useState, useEffect, useMemo } from 'react';
import {
  HoldingPosition,
  ColorThemeMode,
  MarketType,
  SmartMoneyInputItem,
} from '../types/stock';
import { SmartMoneyBubbleChart } from './SmartMoneyBubbleChart';
import {
  calculateSmartMoneyFlowDynamics,
  computeChaikinMoneyFlow,
  getTemporalBubbleFrameData,
} from '../engine/smartMoneyEngine';
import {
  fetchTwseInstitutionalReportDetailed,
  fetchRecentTwseReports,
  TwseInstitutionalRow,
  getLatestTradingDateString,
  getRecentTradingDateSequence,
} from '../engine/smartMoneyFetcher';
import {
  aggregateMultiDayChips,
  classifyInstitutionalSignal,
  getTopMomentumSymbols,
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
  const baseFlow = twseData ? twseData.totalNetShares / 2500 : 0;

  return availableDates.map((d, idx) => {
    const factor = (idx + 1) / availableDates.length;
    const changeP = (holding.todaysPnLPercent || 0) * factor + (idx % 2 === 0 ? 0.3 : -0.2);

    if (holding.market === 'US') {
      const stepCmf = Math.round(baseUsCmf * factor * 100) / 100;
      const usNetFlow = stepCmf * 1000000 * (holding.currentPrice || 100);
      return {
        date: d,
        changePercent: Math.round(changeP * 100) / 100,
        flowScore: stepCmf,
        netFlowAmount: usNetFlow,
        cmf: stepCmf,
      };
    }

    // 檢查是否有真實歷史日報 (本地化存儲時間換空間)
    const dayReport = historyReportsMap?.[d];
    const dayItem = dayReport ? (dayReport[cleanSymbol] || dayReport[holding.symbol]) : undefined;

    if (dayItem) {
      const dayScore = dayItem.totalNetShares / 2500;
      return {
        date: d,
        changePercent: Math.round(changeP * 100) / 100,
        flowScore: Math.round(dayScore * 100) / 100,
        netFlowAmount: dayItem.totalNetShares * 1000 * (holding.currentPrice || 100),
        foreignNetShares: dayItem.foreignNetShares,
        trustNetShares: dayItem.trustNetShares,
        dealerNetShares: dayItem.dealerNetShares,
      };
    }

    // 優雅降級模擬
    const fNet = twseData ? Math.round(twseData.foreignNetShares * factor) : undefined;
    const tNet = twseData ? Math.round(twseData.trustNetShares * factor) : undefined;
    const dNet = twseData ? Math.round(twseData.dealerNetShares * factor) : undefined;
    return {
      date: d,
      changePercent: Math.round(changeP * 100) / 100,
      flowScore: Math.round(baseFlow * factor * 100) / 100,
      netFlowAmount: (twseData?.totalNetShares || 0) * 1000 * (holding.currentPrice || 100) * factor,
      foreignNetShares: fNet,
      trustNetShares: tNet,
      dealerNetShares: dNet,
    };
  });
}

export const US_MARKET_FOCUS_LIST = [
  { symbol: 'NVDA', name: '輝達', pnl: 3.2, cmf: 0.65 },
  { symbol: 'AAPL', name: '蘋果', pnl: 1.1, cmf: 0.35 },
  { symbol: 'MSFT', name: '微軟', pnl: 0.8, cmf: 0.28 },
  { symbol: 'AMZN', name: '亞馬遜', pnl: -0.6, cmf: 0.42 },
  { symbol: 'GOOGL', name: 'Alphabet', pnl: 1.5, cmf: 0.30 },
  { symbol: 'META', name: 'Meta', pnl: 2.4, cmf: 0.55 },
  { symbol: 'TSLA', name: '特斯拉', pnl: -2.8, cmf: -0.45 },
  { symbol: 'AVGO', name: '博通', pnl: 2.1, cmf: 0.48 },
  { symbol: 'AMD', name: '超微', pnl: 1.8, cmf: -0.32 },
  { symbol: 'PLTR', name: 'Palantir', pnl: 4.2, cmf: 0.72 },
  { symbol: 'ARM', name: '安謀', pnl: -1.2, cmf: 0.25 },
  { symbol: 'QCOM', name: '高通', pnl: 0.5, cmf: -0.22 },
  { symbol: 'ASML', name: '艾斯摩爾', pnl: -1.8, cmf: 0.38 },
  { symbol: 'TSM', name: '台積電ADR', pnl: 3.5, cmf: 0.68 },
  { symbol: 'MU', name: '美光', pnl: -2.1, cmf: -0.40 },
  { symbol: 'SMCI', name: '美超微', pnl: 5.1, cmf: 0.52 },
  { symbol: 'NFLX', name: '網飛', pnl: 1.2, cmf: 0.18 },
  { symbol: 'COST', name: '好市多', pnl: 0.4, cmf: 0.22 },
  { symbol: 'BRK.B', name: '波克夏B', pnl: 0.2, cmf: 0.15 },
  { symbol: 'JPM', name: '摩根大通', pnl: -0.8, cmf: 0.30 },
  { symbol: 'LLY', name: '禮來', pnl: 1.9, cmf: 0.45 },
  { symbol: 'NVO', name: '諾和諾德', pnl: -1.5, cmf: -0.35 },
  { symbol: 'SPY', name: '標普500 ETF', pnl: 0.6, cmf: 0.25 },
  { symbol: 'QQQ', name: '那斯達克 ETF', pnl: 1.1, cmf: 0.40 },
  { symbol: 'SOXX', name: '費半 ETF', pnl: 2.2, cmf: 0.58 },
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
  historyReportsMap?: Record<string, Record<string, TwseInstitutionalRow>>
): SmartMoneyInputItem[] {
  if (marketFilter === 'US') {
    // 100% 純美股全市場焦點 Top 25 (絕對無任何台股)
    return US_MARKET_FOCUS_LIST.map((usItem, idx) => {
      const histFlows = availableDates.map((d, dIdx) => {
        const factor = (dIdx + 1) / availableDates.length;
        const curCmf = Math.round(usItem.cmf * factor * 100) / 100;
        return {
          date: d,
          changePercent: Math.round(usItem.pnl * factor * 100) / 100,
          flowScore: curCmf,
          cmf: curCmf,
          netFlowAmount: usItem.cmf * 50000000 * factor,
        };
      });

      const candles = Array.from({ length: 20 }).map((_, cIdx) => {
        const step = 100 * (1 + (usItem.pnl / 100) * ((cIdx + 1) / 20));
        const isBull = usItem.cmf >= 0;
        const high = step * 1.015;
        const low = step * 0.985;
        const close = isBull ? step * 1.012 : step * 0.988;
        return {
          date: `2026-08-${String(cIdx + 1).padStart(2, '0')}`,
          open: step,
          high,
          low,
          close,
          volume: 2000000 + idx * 100000,
        };
      });

      return {
        symbol: usItem.symbol,
        name: usItem.name,
        market: 'US' as MarketType,
        currentPrice: 100,
        previousClose: 100 - usItem.pnl,
        changePercent: usItem.pnl,
        holdingValueTwd: 500000,
        volume: 2000000,
        candles,
        historicalDailyFlows: histFlows,
      };
    });
  }

  // 台股全市場焦點 Top 30
  const topSymbols = Object.values(twseChipsMap)
    .sort((a, b) => Math.abs(b.totalNetShares) - Math.abs(a.totalNetShares))
    .slice(0, marketFilter === 'ALL' ? 20 : 30);

  const twItems: SmartMoneyInputItem[] = topSymbols.map((item, idx) => {
    const matchingHolding = holdings.find((h) => h.symbol.replace(/\.(TW|TWO)$/i, '').trim() === item.symbol);
    let changeP = matchingHolding?.todaysPnLPercent;

    if (changeP === undefined) {
      const isDivergent = idx % 4 === 1;
      const baseMagnitude = 0.8 + ((Math.abs(item.totalNetShares) % 35) / 10);
      if (item.totalNetShares > 0) {
        changeP = isDivergent ? -baseMagnitude : baseMagnitude;
      } else {
        changeP = isDivergent ? baseMagnitude : -baseMagnitude;
      }
    }

    const estPrice = matchingHolding?.currentPrice || 100;
    const histFlows = buildHoldingHistoricalFlows(
      {
        symbol: item.symbol,
        todaysPnLPercent: changeP,
        currentPrice: estPrice,
        market: 'TW',
      },
      availableDates,
      item,
      0,
      historyReportsMap
    );

    return {
      symbol: item.symbol,
      name: item.name,
      market: 'TW' as MarketType,
      currentPrice: estPrice,
      previousClose: estPrice - changeP,
      changePercent: Math.round(changeP * 100) / 100,
      volume: Math.abs(item.totalNetShares) * 1.5,
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
    // ALL 模式混合前 10 檔美股巨頭
    const usMix: SmartMoneyInputItem[] = US_MARKET_FOCUS_LIST.slice(0, 10).map((usItem) => ({
      symbol: usItem.symbol,
      name: usItem.name,
      market: 'US' as MarketType,
      currentPrice: 100,
      previousClose: 100 - usItem.pnl,
      changePercent: usItem.pnl,
      holdingValueTwd: 400000,
      volume: 2000000,
      candles: Array.from({ length: 20 }).map((_, cIdx) => ({
        date: `2026-08-${String(cIdx + 1).padStart(2, '0')}`,
        open: 100,
        high: 101.5,
        low: 98.5,
        close: usItem.cmf >= 0 ? 101.2 : 98.8,
        volume: 2000000,
      })),
    }));
    return [...twItems, ...usMix];
  }

  // 純台股 (TW) 模式：100% 絕對無任何美股
  return twItems;
}

export interface ChipsWorkspaceProps {
  holdings: HoldingPosition[];
  colorTheme: ColorThemeMode;
  usdToTwdRate: number;
  market?: 'ALL' | MarketType;
  onMarketChange?: (market: 'ALL' | MarketType) => void;
}

export const ChipsWorkspace: React.FC<ChipsWorkspaceProps> = ({
  holdings,
  colorTheme,
  usdToTwdRate,
  market,
  onMarketChange,
}) => {
  const [viewMode, setViewMode] = useState<'PORTFOLIO' | 'MARKET'>('PORTFOLIO');
  const [internalMarketFilter, setInternalMarketFilter] = useState<'ALL' | MarketType>(market || 'ALL');

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
  // Spec 0119: 動能時間窗選擇器狀態 (1D / 3D / 5D)
  const [chipsHorizon, setChipsHorizon] = useState<1 | 3 | 5>(1);
  const [isDecisionBoardExpanded, setIsDecisionBoardExpanded] = useState<boolean>(true);

  // 支援 5 個連續真實交易日供時序回放 (Spec 0117 Ticket 02)
  const availableDates = useMemo(() => {
    return getRecentTradingDateSequence(reportDate, 5);
  }, [reportDate]);

  // Spec 0119 Ticket 04: 依動能週期加總計算活動中的三大法人買賣超
  const activeChipsMap = useMemo(() => {
    if (chipsHorizon === 1) return twseChipsMap;
    return aggregateMultiDayChips(historyReportsMap, availableDates, chipsHorizon);
  }, [chipsHorizon, twseChipsMap, historyReportsMap, availableDates]);

  // 初次掛載或點擊重整時抓取官方籌碼 (支援 forceRefresh 略過殘缺快取)
  const loadChipsData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const detailed = await fetchTwseInstitutionalReportDetailed(undefined, undefined, 5, forceRefresh);
      setTwseChipsMap(detailed.data);
      setReportDate(detailed.reportDate);
      setIsLiveToday(detailed.isLiveToday);
      setFallbackReason(detailed.fallbackReason);
      setTotalSymbols(detailed.totalSymbols);
      setCurrentDateIndex(4); // 預設指向最新 (5 個交易日的最後一日)
    } catch {
      // 容錯靜默處理
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChipsData();
  }, []);

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

  // 依視圖模式與市場篩選產生 Input Items (採用累計週期 activeChipsMap)
  const smartMoneyItems = useMemo<SmartMoneyInputItem[]>(() => {
    if (viewMode === 'PORTFOLIO') {
      // 1. 在庫持倉模式
      return holdings
        .filter((h) => !h.isClosed && h.shares > 0)
        .filter((h) => marketFilter === 'ALL' || h.market === marketFilter)
        .map((h) => {
          const cleanSymbol = h.symbol.replace(/\.(TW|TWO)$/i, '').trim();
          const twseData = activeChipsMap[cleanSymbol] || activeChipsMap[h.symbol];

          // 估算持倉價值 (TWD)
          const valTwd = h.market === 'US' ? h.grossMarketValue * usdToTwdRate : h.grossMarketValue;

          // 為美股生成具備實質量價結構之 20 日日 K 棒 (以計算標準 CMF 資金流)
          let usCandles: { date: string; open: number; high: number; low: number; close: number; volume: number }[] | undefined;
          let baseUsCmf = 0;
          if (h.market === 'US') {
            const pnlP = h.todaysPnLPercent || 0;
            usCandles = Array.from({ length: 20 }).map((_, cIdx) => {
              const stepP = (h.currentPrice || 100) * (1 + (pnlP / 100) * (cIdx % 2 === 0 ? 0.3 : -0.2));
              const high = stepP * (1 + 0.015);
              const low = stepP * (1 - 0.015);
              // 收盤價偏向：上漲時靠近 High (吸籌)，下跌時靠近 Low (出貨)
              const close = pnlP >= 0 ? stepP * (1 + 0.01) : stepP * (1 - 0.01);
              const open = (high + low) / 2;
              return {
                date: `2026-08-${String(cIdx + 1).padStart(2, '0')}`,
                open,
                high,
                low,
                close,
                volume: 1500000 + (cIdx % 5) * 300000,
              };
            });
            baseUsCmf = computeChaikinMoneyFlow(usCandles, 20);
          }

          // 生成歷史時序位移點 (優先對齊 IndexedDB 本地已沉澱之真實日報)
          const histFlows = buildHoldingHistoricalFlows(
            h,
            availableDates,
            twseData,
            baseUsCmf,
            historyReportsMap
          );

          return {
            symbol: h.symbol,
            name: h.name || h.symbol,
            market: h.market,
            currentPrice: h.currentPrice,
            previousClose: h.currentPrice - (h.todaysChange || 0),
            changePercent: h.todaysPnLPercent || 0,
            holdingValueTwd: valTwd,
            volume: 100000,
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
      // 2. 全市場法人與機構焦點模式 (由 filterMarketFocusList 統一嚴格處理市場純度，使用 activeChipsMap 累計週期)
      return filterMarketFocusList(
        marketFilter,
        activeChipsMap,
        holdings,
        availableDates,
        historyReportsMap
      );
    }
  }, [holdings, activeChipsMap, viewMode, marketFilter, usdToTwdRate, availableDates, historyReportsMap]);

  // Spec 0119 Ticket 04: 動態計算當前週期的決策排行榜 (可以買 vs 一定要閃)
  const momentumSignals = useMemo(() => {
    return getTopMomentumSymbols(activeChipsMap, 4);
  }, [activeChipsMap]);

  // 透過量化引擎計算四象限模型
  const analysisResult = useMemo(() => {
    return calculateSmartMoneyFlowDynamics(smartMoneyItems);
  }, [smartMoneyItems]);

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

          {/* 籌碼資料狀態徽章 (Spec 0117 / Spec 0119 優雅降級誠實揭露) */}
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
                ? `臺灣證交所與櫃買中心今日 ${reportDate} 盤後三大法人已完整公布與同步`
                : `盤中尚未公布今日日報 (預計 15:30 公布)，目前顯示 ${reportDate} 已結算完整籌碼`
            }
          >
            <span>
              {isLiveToday
                ? `🟢 已同步：${reportDate.substring(4, 6)}/${reportDate.substring(6, 8)} 盤後 (共 ${totalSymbols} 檔)`
                : fallbackReason === 'INCOMPLETE_DATA'
                ? `🟡 盤後結算中：暫呈 ${reportDate.substring(4, 6)}/${reportDate.substring(6, 8)} 完整日報 (${totalSymbols} 檔)`
                : `🕒 盤中模式：顯示 ${reportDate.substring(4, 6)}/${reportDate.substring(6, 8)} 盤後 (${totalSymbols} 檔)`}
            </span>
          </div>

          <button
            onClick={() => loadChipsData(true)}
            disabled={isLoading}
            title={`點擊強制更新並同步臺灣證交所與櫃買中心三大法人籌碼日報 (本地已沉澱 ${Object.keys(historyReportsMap).length} 個交易日)`}
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
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? '同步中...' : '同步盤後籌碼'}</span>
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
                style={{
                  background: cardStyles.breakout.bg,
                  border: cardStyles.breakout.border,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
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
                style={{
                  background: cardStyles.accumulation.bg,
                  border: cardStyles.accumulation.border,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
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
                style={{
                  background: cardStyles.distribution.bg,
                  border: cardStyles.distribution.border,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
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
                style={{
                  background: cardStyles.liquidation.bg,
                  border: cardStyles.liquidation.border,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
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
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
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
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.78rem',
                          padding: '5px 8px',
                          background: 'rgba(15, 23, 42, 0.5)',
                          borderRadius: '6px',
                        }}
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
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
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
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.78rem',
                          padding: '5px 8px',
                          background: 'rgba(15, 23, 42, 0.5)',
                          borderRadius: '6px',
                        }}
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

      {/* 核心泡泡圖元件 */}
      <SmartMoneyBubbleChart
        bubbles={analysisResult.bubbles}
        colorTheme={colorTheme}
        availableDates={availableDates}
        currentDateIndex={currentDateIndex}
        onDateChange={setCurrentDateIndex}
        summaryText={analysisResult.summaryText}
        overallSentiment={analysisResult.overallSentiment}
      />
    </div>
  );
};
