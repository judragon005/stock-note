import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { HoldingPosition, MarketType } from '../types/stock';
import { DailyCandle } from '../types/indicators';
import {
  AssetPoolType,
  ScannedStockItem,
  getScopedUniverseSymbols,
  scanMuscleBookerItem,
  calculateDefenseBufferMetrics,
  calculateMomentumQuickMetrics,
} from '../engine/muscleBookerEngine';
import { StockInteractionHandlers } from './muscleBooker/types';
import { computeOmniIndicators } from '../engine/omniIndicatorEngine';
import { calculateSMA } from '../engine/technicalIndicatorEngine';
import { backfillSymbolOhlcvAndIndicators } from '../engine/historicalOhlcvBackfill';
import {
  getMuscleBookerWatchlist,
  saveMuscleBookerWatchlist,
  addMuscleBookerWatchlistSymbol,
  removeMuscleBookerWatchlistSymbol,
} from '../utils/storage';
import { resolveOfficialSecurityName } from '../engine/stockNameResolver';
import { inferMarketFromSymbol } from '../engine/priceFetcher';
import { checkAndSyncUniverseDaily } from '../engine/adaptiveUniverseEngine';

// 模組化子組件與 Hooks
import { useMuscleBookerSync } from './muscleBooker/hooks/useMuscleBookerSync';
import {
  MuscleBookerHeader,
  MuscleBookerSortOption,
  MuscleBookerFilterChip,
} from './muscleBooker/subcomponents/MuscleBookerHeader';
import { ActionDirectivesHUD } from './muscleBooker/subcomponents/ActionDirectivesHUD';
import { AdHocSpotlightCard } from './muscleBooker/subcomponents/AdHocSpotlightCard';
import { TrafficLightMatrix } from './muscleBooker/subcomponents/TrafficLightMatrix';
import { DarvasQuadrantGrid } from './muscleBooker/subcomponents/DarvasQuadrantGrid';
import { DeductionTelescopeTable } from './muscleBooker/subcomponents/DeductionTelescopeTable';

// formatStockPrice 集中自 utils/formatters 引用，Workspace 不再作為中介導出 (Spec 0216 / Issue #405)

export type MuscleBookerViewLens = 'ACTIONS' | 'QUADRANTS' | 'TELESCOPE';

export interface MuscleBookerWorkspaceProps {
  holdings: HoldingPosition[];
  historicalDailyPrices?: Record<string, Record<string, number>>;
  currentMarket?: 'ALL' | MarketType;
  onOpenOmniInspector?: (symbol: string, market: MarketType) => void;
  onQuickTrade?: (symbol: string, action: 'BUY' | 'SELL', price?: number) => void;
}

/**
 * 集中解析標的所屬市場、適用大盤多空 Regime 與基準日 K (含 2330 備援 - Issue #409)
 */
export function resolveMarketBenchmarkAndRegime(
  symbol: string,
  market: MarketType,
  cachedCandlesMap: Record<string, DailyCandle[] | undefined>,
  marketRegimeTW: 'BULL' | 'BEAR' | 'NEUTRAL',
  marketRegimeUS: 'BULL' | 'BEAR' | 'NEUTRAL'
): {
  isUS: boolean;
  targetRegime: 'BULL' | 'BEAR' | 'NEUTRAL';
  targetBenchmarkCandles?: DailyCandle[];
} {
  const isUS = market === 'US' || (market as string) === '美股' || !/^[0-9]/.test(symbol);
  const targetRegime = isUS ? marketRegimeUS : marketRegimeTW;
  const targetBenchmarkCandles = isUS
    ? cachedCandlesMap['SPY']
    : (cachedCandlesMap['0050'] || cachedCandlesMap['2330']);
  return { isUS, targetRegime, targetBenchmarkCandles };
}

export const MuscleBookerWorkspace: React.FC<MuscleBookerWorkspaceProps> = ({
  holdings,
  historicalDailyPrices: _historicalDailyPrices = {},
  currentMarket = 'ALL',
  onOpenOmniInspector,
  onQuickTrade: externalQuickTrade,
}) => {
  const [selectedPool, setSelectedPool] = useState<AssetPoolType>('TOP30_FOCUS');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'BUY' | 'AVOID' | 'SELL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  // Ticket 05: Apple 風格分段視圖狀態
  const [viewLens, setViewLens] = useState<MuscleBookerViewLens>('ACTIONS');

  // Ticket 08: 多維排序與實戰快篩狀態
  const [sortBy, setSortBy] = useState<MuscleBookerSortOption>('RR_DESC');
  const [activeFilterChip, setActiveFilterChip] = useState<MuscleBookerFilterChip>('ALL');

  // 自訂觀察清單狀態 (Watchlist)
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>(() => getMuscleBookerWatchlist());
  const [customInputSymbol, setCustomInputSymbol] = useState('');
  const [customInputError, setCustomInputError] = useState<string | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // 清理無效非正規代碼
  useEffect(() => {
    const cleaned = watchlistSymbols.filter((s) => s && /^[0-9A-Z.-]{1,10}$/i.test(s.trim()));
    if (cleaned.length !== watchlistSymbols.length) {
      setWatchlistSymbols(cleaned);
      saveMuscleBookerWatchlist(cleaned);
    }
  }, [watchlistSymbols]);

  // 任意代碼即搜即算 (Ad-hoc Scan) 狀態
  const [isAdHocLoading, setIsAdHocLoading] = useState(false);
  const [adHocError, setAdHocError] = useState<string | null>(null);
  const [adHocItem, setAdHocItem] = useState<ScannedStockItem | null>(null);

  // 成分股動態校準與 Toast 提示狀態
  const [universeSyncToast, setUniverseSyncToast] = useState<{
    message: string;
    type: 'info' | 'success' | 'warn';
  } | null>(null);
  const [universeStatusText, setUniverseStatusText] = useState('🟢 官方成分股 (基準)');
  const [isCheckingUniverse, setIsCheckingUniverse] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const runDailyUniverseCheck = async () => {
      try {
        const res = await checkAndSyncUniverseDaily();
        if (isCancelled) return;
        if (res.hasChanges) {
          setUniverseSyncToast({
            message: res.summaryMessage,
            type: 'info',
          });
          setUniverseStatusText(`🔔 已校準 (${res.replacedSymbols.length} 檔遞補)`);
          setTimeout(() => {
            if (!isCancelled) setUniverseSyncToast(null);
          }, 7000);
        } else {
          setUniverseStatusText(
            res.summaryMessage.includes('非交易日')
              ? '📅 非交易日 (維持基準)'
              : '🟢 官方成分股 (今日已校準)'
          );
        }
      } catch (err) {
        console.warn('Failed to perform daily universe check:', err);
      }
    };
    runDailyUniverseCheck();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 0. 依當前市場過濾持股
  const marketScopedHoldings = useMemo(() => {
    if (currentMarket === 'US') {
      return holdings.filter((h) => h.market === 'US' || h.currency === 'USD');
    }
    if (currentMarket === 'TW') {
      return holdings.filter((h) => h.market === 'TW' || h.currency === 'TWD');
    }
    return holdings;
  }, [holdings, currentMarket]);

  // 在倉持股 (shares > 0)
  const activeHoldings = useMemo(() => {
    return marketScopedHoldings.filter((h) => h.shares > 0);
  }, [marketScopedHoldings]);

  // 歷史閉倉 (shares === 0)
  const closedHoldings = useMemo(() => {
    return marketScopedHoldings.filter(
      (h) => h.shares === 0 && (h.realizedPnL !== 0 || (h.totalDividends || 0) > 0 || (h.originalBuyShares || 0) > 0)
    );
  }, [marketScopedHoldings]);

  // 1. 產生掃描標的清單
  const targetUniverse = useMemo(() => {
    if (selectedPool === 'HOLDINGS' || selectedPool === 'HOLDINGS_ACTIVE') {
      return activeHoldings.map((h) => ({
        symbol: h.symbol,
        name: h.name,
        market: h.market,
        basePrice: h.currentPrice || 100,
      }));
    }
    if (selectedPool === 'HOLDINGS_CLOSED') {
      return closedHoldings.map((h) => ({
        symbol: h.symbol,
        name: h.name,
        market: h.market,
        basePrice: h.currentPrice || 100,
      }));
    }
    if (selectedPool === 'CUSTOM_WATCHLIST') {
      return watchlistSymbols.map((sym) => {
        const market = inferMarketFromSymbol(sym);
        const name = resolveOfficialSecurityName(sym, sym);
        const holding = holdings.find((h) => h.symbol.toUpperCase() === sym);
        return {
          symbol: sym,
          name,
          market,
          basePrice: holding?.currentPrice || 100,
        };
      });
    }
    return getScopedUniverseSymbols(currentMarket, selectedPool);
  }, [selectedPool, activeHoldings, closedHoldings, watchlistSymbols, holdings, currentMarket]);

  const targetUniverseKey = useMemo(() => {
    return targetUniverse.map((u) => `${u.symbol}_${u.market}`).join(',');
  }, [targetUniverse]);

  // 抽取獨立 Hook：管理快取、水合與批次節流更新
  const { cachedCandlesMap, setCachedCandlesMap, syncState, triggerManualSync } =
    useMuscleBookerSync({
      targetUniverse,
      targetUniverseKey,
      selectedPool,
    });

  // Ticket 07 & Issue #399 & Issue #407: 雙市場大盤體系判定 (台股 0050 vs 美股 SPY 獨立判定，消除自選混合池 Regime 錯配)
  const computeRegime = (benchmarkSymbol: string, mkt: 'TW' | 'US'): 'BULL' | 'BEAR' | 'NEUTRAL' => {
    const candles = cachedCandlesMap[benchmarkSymbol] || (mkt === 'TW' ? cachedCandlesMap['2330'] : undefined);
    if (!candles || candles.length < 20) return 'NEUTRAL';

    try {
      const omni = computeOmniIndicators({
        symbol: benchmarkSymbol,
        name: benchmarkSymbol,
        market: mkt,
        candles,
        currentPrice: candles[candles.length - 1].close,
      });
      if (omni.confluence.marketRegime === 'TRENDING_BEAR') return 'BEAR';
      if (omni.confluence.marketRegime === 'TRENDING_BULL') return 'BULL';
    } catch {
      // 容錯防禦
    }

    const closes = candles.map((c) => c.close);
    const ma20 = calculateSMA(closes, 20);
    const currentClose = closes[closes.length - 1];
    const ma20Prev = closes.length >= 25 ? calculateSMA(closes.slice(0, -5), 20) : ma20;

    if (ma20 !== undefined) {
      if (currentClose < ma20 && (ma20Prev !== undefined && ma20 < ma20Prev)) {
        return 'BEAR';
      }
      if (currentClose > ma20 && (ma20Prev !== undefined && ma20 > ma20Prev)) {
        return 'BULL';
      }
    }
    return 'NEUTRAL';
  };

  const marketRegimeTW = useMemo(() => computeRegime('0050', 'TW'), [cachedCandlesMap]);
  const marketRegimeUS = useMemo(() => computeRegime('SPY', 'US'), [cachedCandlesMap]);

  // 手動觸發成分股校準與存活探針檢驗
  const handleManualCheckUniverse = async () => {
    setIsCheckingUniverse(true);
    try {
      const res = await checkAndSyncUniverseDaily({ force: true });
      setUniverseSyncToast({
        message: res.summaryMessage,
        type: res.hasChanges ? 'info' : 'success',
      });
      if (res.hasChanges) {
        setUniverseStatusText(`🔔 已校準 (${res.replacedSymbols.length} 檔遞補)`);
      } else {
        setUniverseStatusText('🟢 官方成分股 (已完成最新檢驗)');
      }
      setTimeout(() => setUniverseSyncToast(null), 6000);
    } catch (err: any) {
      setUniverseSyncToast({
        message: `檢查失敗：${err?.message || '外部網路逾時'}`,
        type: 'warn',
      });
      setTimeout(() => setUniverseSyncToast(null), 5000);
    } finally {
      setIsCheckingUniverse(false);
    }
  };

  // 執行即時外部診斷 (Ad-hoc Scan)
  const handleRunAdHocScan = async (symbolToQuery?: string) => {
    const raw = (symbolToQuery ?? searchQuery).trim().toUpperCase();
    if (!raw) return;
    setIsAdHocLoading(true);
    setAdHocError(null);

    try {
      const inferredMarket: MarketType = inferMarketFromSymbol(raw);
      const res = await backfillSymbolOhlcvAndIndicators(raw, inferredMarket, false);

      if (!res.candles || res.candles.length === 0) {
        setAdHocError(`查無標的「${raw}」歷史行情，請確認代碼是否正確。`);
        setIsAdHocLoading(false);
        return;
      }

      setCachedCandlesMap((prev) => ({ ...prev, [raw]: res.candles }));

      const officialName = resolveOfficialSecurityName(raw, raw);
      const latestCandle = res.candles[res.candles.length - 1];
      const basePrice = latestCandle?.close || 100;

      const { targetRegime, targetBenchmarkCandles } = resolveMarketBenchmarkAndRegime(
        raw,
        inferredMarket,
        cachedCandlesMap,
        marketRegimeTW,
        marketRegimeUS
      );

      const scanned = scanMuscleBookerItem(
        raw,
        officialName,
        inferredMarket,
        basePrice,
        res.candles,
        {
          marketRegime: targetRegime,
          benchmarkCandles: targetBenchmarkCandles,
        }
      );

      setAdHocItem(scanned);
    } catch (err: any) {
      setAdHocError(`診斷失敗：${err?.message || '外部行情網路異常'}`);
    } finally {
      setIsAdHocLoading(false);
    }
  };

  // 切換自選股觀察清單狀態 (釘選 / 取消釘選)
  const handleToggleWatchlist = (symbol: string) => {
    const clean = symbol.trim().toUpperCase();
    if (watchlistSymbols.includes(clean)) {
      const updated = removeMuscleBookerWatchlistSymbol(clean);
      setWatchlistSymbols(updated);
    } else {
      const updated = addMuscleBookerWatchlistSymbol(clean);
      setWatchlistSymbols(updated);
    }
  };

  // 手動新增自訂股票代碼至觀察清單
  const handleAddCustomSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInputSymbol.trim().toUpperCase();
    if (!clean) return;
    if (!/^[0-9A-Z.-]{1,10}$/i.test(clean)) {
      setCustomInputError(`股票代碼「${clean}」格式不符合規範。`);
      return;
    }
    if (watchlistSymbols.includes(clean)) {
      setCustomInputError(`股票代碼「${clean}」已存在於觀察清單中。`);
      return;
    }

    setCustomInputError(null);
    setIsAddingCustom(true);

    try {
      const inferredMarket: MarketType = inferMarketFromSymbol(clean);
      const res = await backfillSymbolOhlcvAndIndicators(clean, inferredMarket, false);

      if (!res.candles || res.candles.length === 0) {
        setCustomInputError(`查無股票代碼「${clean}」之歷史日 K 線，無法加入觀察名單。`);
        return;
      }

      const updated = addMuscleBookerWatchlistSymbol(clean);
      setWatchlistSymbols(updated);
      setCachedCandlesMap((prev) => ({ ...prev, [clean]: res.candles }));
      setCustomInputSymbol('');
    } catch {
      setCustomInputError(`查無股票代碼「${clean}」，無法加入觀察名單。`);
    } finally {
      setIsAddingCustom(false);
    }
  };

  // 在庫持股快速比對 Map
  const activeHoldingsMap = useMemo(() => {
    return new Map(activeHoldings.map((h) => [h.symbol.toUpperCase(), h]));
  }, [activeHoldings]);

  // Ticket 04: 增量掃描快取 Map (2,280 檔掃描時間從 350ms 降至 2ms)
  const scannedItemsMapRef = useRef<
    Map<
      string,
      {
        candlesRef: DailyCandle[] | undefined;
        isHolding: boolean;
        marketRegime?: 'BULL' | 'BEAR' | 'NEUTRAL';
        benchmarkCandlesRef?: DailyCandle[];
        isForensicDangerous?: boolean;
        scanned: ScannedStockItem;
      }
    >
  >(new Map());

  // 2. 進行肌肉書僮指標全量掃描 (結合增量快取)
  const scannedItems = useMemo<ScannedStockItem[]>(() => {
    const cache = scannedItemsMapRef.current;
    return targetUniverse.map((item) => {
      const candles = cachedCandlesMap[item.symbol];

      if (adHocItem && adHocItem.symbol === item.symbol && !adHocItem.isDataPending) {
        return adHocItem;
      }

      const { targetRegime, targetBenchmarkCandles } = resolveMarketBenchmarkAndRegime(
        item.symbol,
        item.market,
        cachedCandlesMap,
        marketRegimeTW,
        marketRegimeUS
      );

      const holding = activeHoldingsMap.get(item.symbol.toUpperCase());
      const isHolding = !!holding;
      const isForensicDangerous = !!(
        holding?.signals?.some(
          (s) => (s.tone === 'BEARISH' || s.tone === 'WARNING') && (s.label.includes('鑑識') || s.label.includes('異常') || s.label.includes('警報'))
        )
      );

      const cachedEntry = cache.get(item.symbol);
      if (
        cachedEntry &&
        cachedEntry.candlesRef === candles &&
        cachedEntry.isHolding === isHolding &&
        cachedEntry.marketRegime === targetRegime &&
        cachedEntry.benchmarkCandlesRef === targetBenchmarkCandles &&
        cachedEntry.isForensicDangerous === isForensicDangerous
      ) {
        return cachedEntry.scanned;
      }

      const latestCandle = candles && candles.length > 0 ? candles[candles.length - 1] : undefined;
      const effectivePrice = latestCandle?.close ?? item.basePrice ?? 100;

      const scanned = scanMuscleBookerItem(
        item.symbol,
        item.name,
        item.market,
        effectivePrice,
        candles,
        {
          isHolding,
          marketRegime: targetRegime,
          benchmarkCandles: targetBenchmarkCandles,
          isForensicDangerous,
        }
      );

      cache.set(item.symbol, {
        candlesRef: candles,
        isHolding,
        marketRegime: targetRegime,
        benchmarkCandlesRef: targetBenchmarkCandles,
        isForensicDangerous,
        scanned,
      });

      return scanned;
    });
  }, [targetUniverse, cachedCandlesMap, adHocItem, activeHoldingsMap, marketRegimeTW, marketRegimeUS]);

  // 頂部常駐作戰指令：全域風益比 >= 2.0 最佳買進標的 (不受局部快篩影響)
  const top3BuyItems = useMemo(() => {
    return scannedItems
      .filter((i) => i.actionDecision.action === 'BUY')
      .sort((a, b) => (b.actionDecision.riskRewardRatioValue ?? 0) - (a.actionDecision.riskRewardRatioValue ?? 0))
      .filter((i) => (i.actionDecision.riskRewardRatioValue ?? 0) >= 2.0)
      .slice(0, 3);
  }, [scannedItems]);

  // Ticket 07 & Issue #399 & Issue #403: 在倉持股停損與瀕臨破防雙重過濾 (已破防或緩衝 <= 1.5%，統一收斂至 calculateDefenseBufferMetrics，建立單次預算快取)
  const criticalHoldingAlerts = useMemo(() => {
    const criticalList: { item: ScannedStockItem; bufferPercent: number }[] = [];
    for (const item of scannedItems) {
      if (!activeHoldingsMap.has(item.symbol.toUpperCase())) continue;
      const metrics = calculateDefenseBufferMetrics(item);
      if (metrics.isCritical) {
        criticalList.push({ item, bufferPercent: metrics.bufferPercent });
      }
    }
    return criticalList
      .sort((a, b) => a.bufferPercent - b.bufferPercent)
      .slice(0, 3)
      .map((entry) => entry.item);
  }, [scannedItems, activeHoldingsMap]);

  // 輔助計算量比與漲跌幅 (統一複用 calculateMomentumQuickMetrics 與 calculateDefenseBufferMetrics - Issue #405 DRY)
  const getItemMetrics = useCallback((item: ScannedStockItem) => {
    const quick = calculateMomentumQuickMetrics(item.candles, item.currentPrice);
    const defMetrics = calculateDefenseBufferMetrics(item);

    return {
      volRatio: quick.volRatio ?? 1.0,
      changePct: quick.priceChangePercent ?? 0,
      bufferPercent: defMetrics.bufferPercent,
      isBroken: defMetrics.isBroken,
      isCritical: defMetrics.isCritical,
    };
  }, []);

  // 3. 搜尋、實戰快篩與動態多維排序
  const filteredItems = useMemo(() => {
    let list = scannedItems;

    // A. 動作篩選
    if (actionFilter === 'BUY') {
      list = list.filter((item) => item.actionDecision.action === 'BUY');
    } else if (actionFilter === 'AVOID') {
      list = list.filter((item) => item.actionDecision.action === 'AVOID' || item.actionDecision.action === 'HOLD');
    } else if (actionFilter === 'SELL') {
      list = list.filter((item) => item.actionDecision.action === 'SELL');
    }

    // B. 關鍵字搜尋
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (item) => item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
      );
    }

    // C. 實戰快篩膠囊 (Ticket 08 & Issue #399)
    if (activeFilterChip !== 'ALL') {
      list = list.filter((item) => {
        const { volRatio, isCritical } = getItemMetrics(item);
        if (activeFilterChip === 'EXPLOSIVE_VOL') return volRatio >= 1.5;
        if (activeFilterChip === 'SQUEEZE') return item.isBollingerSqueeze;
        if (activeFilterChip === 'HIGH_RR') return (item.actionDecision.riskRewardRatioValue ?? 0) >= 2.5;
        if (activeFilterChip === 'HOLDINGS') return activeHoldingsMap.has(item.symbol.toUpperCase());
        if (activeFilterChip === 'CRITICAL_BUFFER') return isCritical;
        return true;
      });
    }

    // D. 多維動態排序 (Ticket 08 & Issue #399) - O(N) 預算快取比較器
    const metricsMap = new Map<string, ReturnType<typeof getItemMetrics>>();
    for (const item of list) {
      metricsMap.set(item.symbol, getItemMetrics(item));
    }

    const sorted = [...list];
    if (sortBy === 'RR_DESC') {
      sorted.sort(
        (a, b) =>
          (b.actionDecision.riskRewardRatioValue ?? 0) - (a.actionDecision.riskRewardRatioValue ?? 0)
      );
    } else if (sortBy === 'VOL_RATIO_DESC') {
      sorted.sort((a, b) => (metricsMap.get(b.symbol)?.volRatio ?? 1) - (metricsMap.get(a.symbol)?.volRatio ?? 1));
    } else if (sortBy === 'BUFFER_ASC') {
      sorted.sort((a, b) => (metricsMap.get(a.symbol)?.bufferPercent ?? 999) - (metricsMap.get(b.symbol)?.bufferPercent ?? 999));
    } else if (sortBy === 'CHANGE_DESC') {
      sorted.sort((a, b) => (metricsMap.get(b.symbol)?.changePct ?? 0) - (metricsMap.get(a.symbol)?.changePct ?? 0));
    }

    return sorted;
  }, [scannedItems, actionFilter, searchQuery, activeFilterChip, sortBy, getItemMetrics, activeHoldingsMap]);

  // Issue #399: 操盤導航 (TrafficLightMatrix) 同步連動 filteredItems
  const buyItems = useMemo(
    () => filteredItems.filter((i) => i.actionDecision.action === 'BUY'),
    [filteredItems]
  );

  const avoidItems = useMemo(
    () => filteredItems.filter((i) => i.actionDecision.action === 'AVOID' || i.actionDecision.action === 'HOLD'),
    [filteredItems]
  );

  const sellItems = useMemo(
    () => filteredItems.filter((i) => i.actionDecision.action === 'SELL'),
    [filteredItems]
  );

  const counts = useMemo(
    () => ({
      all: scannedItems.length,
      buy: scannedItems.filter((i) => i.actionDecision.action === 'BUY').length,
      avoid: scannedItems.filter((i) => i.actionDecision.action === 'AVOID' || i.actionDecision.action === 'HOLD').length,
      sell: scannedItems.filter((i) => i.actionDecision.action === 'SELL').length,
    }),
    [scannedItems]
  );

  const handleToggleExpand = useCallback((sym: string) => {
    setExpandedSymbol((prev) => (prev === sym ? null : sym));
  }, []);

  // 一鍵下單處理 (直通外部或日誌反饋)
  const handleQuickTrade = useCallback(
    (symbol: string, action: 'BUY' | 'SELL', price?: number) => {
      if (externalQuickTrade) {
        externalQuickTrade(symbol, action, price);
      } else {
        console.info(`[MuscleBooker QuickTrade] 快速下單跳轉: ${symbol} ${action} @ ${price}`);
      }
    },
    [externalQuickTrade]
  );

  // 打包互動回調 (消滅 Data Clumps 資料泥塊 - Issue #405)
  const interactionHandlers = useMemo<StockInteractionHandlers>(() => ({
    expandedSymbol,
    onToggleExpand: handleToggleExpand,
    onOpenOmniInspector,
    onToggleWatchlist: handleToggleWatchlist,
    onQuickTrade: handleQuickTrade,
  }), [expandedSymbol, handleToggleExpand, onOpenOmniInspector, handleToggleWatchlist, handleQuickTrade]);

  return (
    <div className="warroom-container animate-fade-in" style={{ padding: '20px' }}>
      {/* 頂部 Header、資產池、搜尋框與狀態列 */}
      <MuscleBookerHeader
        universeSyncToast={universeSyncToast}
        universeStatusText={universeStatusText}
        isCheckingUniverse={isCheckingUniverse}
        onManualCheckUniverse={handleManualCheckUniverse}
        selectedPool={selectedPool}
        onSelectPool={setSelectedPool}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        syncState={syncState}
        onTriggerManualSync={triggerManualSync}
        actionFilter={actionFilter}
        onActionFilterChange={setActionFilter}
        counts={counts}
        watchlistSymbols={watchlistSymbols}
        onToggleWatchlist={handleToggleWatchlist}
        filteredCount={filteredItems.length}
        watchlistControl={{
          customInputSymbol,
          customInputError,
          isAddingCustom,
          onCustomInputChange: setCustomInputSymbol,
          onAddCustomSymbol: handleAddCustomSymbol,
        }}
        adHocControl={{
          isAdHocLoading,
          adHocError,
          onRunAdHocScan: handleRunAdHocScan,
        }}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        activeFilterChip={activeFilterChip}
        onFilterChipChange={setActiveFilterChip}
      />

      {/* 即時外部診斷高光置頂卡 */}
      {adHocItem && (
        <AdHocSpotlightCard
          adHocItem={adHocItem}
          watchlistSymbols={watchlistSymbols}
          onToggleWatchlist={handleToggleWatchlist}
          onOpenOmniInspector={onOpenOmniInspector}
          onClose={() => setAdHocItem(null)}
        />
      )}

      {/* 🎯 今日核心作戰指令看板 (常駐頂部) */}
      <ActionDirectivesHUD
        top3BuyItems={top3BuyItems}
        top3SellItems={criticalHoldingAlerts}
        activeHoldingsMap={activeHoldingsMap}
        watchlistSymbols={watchlistSymbols}
        handlers={interactionHandlers}
      />

      {/* 🌟 Apple 風格分段視圖控制器 (Segmented Tabs - Ticket 05) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '8px 0 24px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '4px',
            borderRadius: '12px',
            background: 'rgba(30, 41, 59, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            gap: '4px',
          }}
        >
          {[
            { key: 'ACTIONS', label: '🚦 操盤導航', count: filteredItems.length },
            { key: 'QUADRANTS', label: '⚡ 動能看板', count: filteredItems.length },
            { key: 'TELESCOPE', label: '📈 扣抵望遠鏡', count: filteredItems.length },
          ].map((tab) => {
            const isActive = viewLens === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setViewLens(tab.key as MuscleBookerViewLens)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '9px',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 800 : 500,
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  background: isActive
                    ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
                    : 'transparent',
                  boxShadow: isActive ? '0 2px 10px rgba(37, 99, 235, 0.45)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 按需條件渲染視圖 (消滅 130,000 DOM 節點過載) */}
      {viewLens === 'ACTIONS' && (
        <TrafficLightMatrix
          buyItems={buyItems}
          avoidItems={avoidItems}
          sellItems={sellItems}
          activeHoldingsMap={activeHoldingsMap}
          watchlistSymbols={watchlistSymbols}
          handlers={interactionHandlers}
        />
      )}

      {viewLens === 'QUADRANTS' && (
        <DarvasQuadrantGrid
          scannedItems={filteredItems}
          activeHoldingsMap={activeHoldingsMap}
          watchlistSymbols={watchlistSymbols}
          handlers={interactionHandlers}
        />
      )}

      {viewLens === 'TELESCOPE' && (
        <DeductionTelescopeTable
          filteredItems={filteredItems}
          watchlistSymbols={watchlistSymbols}
          expandedSymbol={expandedSymbol}
          onToggleExpand={handleToggleExpand}
          onToggleWatchlist={handleToggleWatchlist}
          onQuickTrade={handleQuickTrade}
        />
      )}
    </div>
  );
};
