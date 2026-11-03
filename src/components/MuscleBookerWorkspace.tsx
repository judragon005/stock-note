import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { HoldingPosition, MarketType } from '../types/stock';
import {
  AssetPoolType,
  ScannedStockItem,
  getScopedUniverseSymbols,
  scanMuscleBookerItem,
} from '../engine/muscleBookerEngine';
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
import { MuscleBookerHeader } from './muscleBooker/subcomponents/MuscleBookerHeader';
import { ActionDirectivesHUD } from './muscleBooker/subcomponents/ActionDirectivesHUD';
import { AdHocSpotlightCard } from './muscleBooker/subcomponents/AdHocSpotlightCard';
import { TrafficLightMatrix } from './muscleBooker/subcomponents/TrafficLightMatrix';
import { DarvasQuadrantGrid } from './muscleBooker/subcomponents/DarvasQuadrantGrid';
import { DeductionTelescopeTable } from './muscleBooker/subcomponents/DeductionTelescopeTable';

/**
 * 格式化標的幣別價格字串：美股市場統一標示 US$，台股市場標示 $
 */
export function formatCurrencyPrice(price?: number, market?: 'TW' | 'US'): string {
  if (price === undefined || price === null || isNaN(price)) return '-';
  if (market === 'US') {
    return `US$ ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export interface MuscleBookerWorkspaceProps {
  holdings: HoldingPosition[];
  historicalDailyPrices?: Record<string, Record<string, number>>;
  currentMarket?: 'ALL' | MarketType;
  onOpenOmniInspector?: (symbol: string, market: MarketType) => void;
}

export const MuscleBookerWorkspace: React.FC<MuscleBookerWorkspaceProps> = ({
  holdings,
  historicalDailyPrices: _historicalDailyPrices = {},
  currentMarket = 'ALL',
  onOpenOmniInspector,
}) => {
  const [selectedPool, setSelectedPool] = useState<AssetPoolType>('TOP30_FOCUS');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'BUY' | 'AVOID' | 'SELL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  // 自訂觀察清單狀態 (Watchlist)
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>(() => getMuscleBookerWatchlist());
  const [customInputSymbol, setCustomInputSymbol] = useState('');
  const [customInputError, setCustomInputError] = useState<string | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // 清理無效非正規代碼 (Ticket 10: 消除寫死的魔術字串)
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
  const [isCheckingUniverse, setIsCheckingUniverse] = useState(false);
  const [universeStatusText, setUniverseStatusText] = useState<string>('🟢 官方成分股 (今日已校準)');

  // 每日開市前背景自動校準成分股與存活探針
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

  // 抽取獨立 Hook：管理快取、水合與批次節流更新 (Tickets 11 & 12)
  const { cachedCandlesMap, setCachedCandlesMap, syncState, triggerManualSync } =
    useMuscleBookerSync({
      targetUniverse,
      targetUniverseKey,
      selectedPool,
    });

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

      const scanned = scanMuscleBookerItem(
        raw,
        officialName,
        inferredMarket,
        basePrice,
        res.candles
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

  // 2. 進行肌肉書僮指標全量掃描
  const scannedItems = useMemo<ScannedStockItem[]>(() => {
    return targetUniverse.map((item) => {
      const candles = cachedCandlesMap[item.symbol];

      if (adHocItem && adHocItem.symbol === item.symbol && !adHocItem.isDataPending) {
        return adHocItem;
      }

      const latestCandle = candles && candles.length > 0 ? candles[candles.length - 1] : undefined;
      const effectivePrice = latestCandle?.close ?? item.basePrice ?? 100;

      return scanMuscleBookerItem(
        item.symbol,
        item.name,
        item.market,
        effectivePrice,
        candles,
        {
          isHolding: activeHoldingsMap.has(item.symbol.toUpperCase()),
        }
      );
    });
  }, [targetUniverse, cachedCandlesMap, adHocItem, activeHoldingsMap]);

  // 各類動作清單與核心作戰指令 (置頂風益比最優者)
  const buyItems = useMemo(() => {
    return scannedItems
      .filter((i) => i.actionDecision.action === 'BUY')
      .sort((a, b) => (b.actionDecision.riskRewardRatioValue ?? 0) - (a.actionDecision.riskRewardRatioValue ?? 0));
  }, [scannedItems]);

  const top3BuyItems = useMemo(() => {
    return buyItems
      .filter((i) => (i.actionDecision.riskRewardRatioValue ?? 0) >= 2.0)
      .slice(0, 3);
  }, [buyItems]);

  const avoidItems = useMemo(
    () => scannedItems.filter((i) => i.actionDecision.action === 'AVOID' || i.actionDecision.action === 'HOLD'),
    [scannedItems]
  );

  const sellItems = useMemo(() => scannedItems.filter((i) => i.actionDecision.action === 'SELL'), [scannedItems]);

  const holdingGatedSellItems = useMemo(() => {
    return scannedItems.filter(
      (i) => i.actionDecision.action === 'SELL' && activeHoldingsMap.has(i.symbol.toUpperCase())
    );
  }, [scannedItems, activeHoldingsMap]);

  const top3SellItems = useMemo(() => {
    return holdingGatedSellItems.slice(0, 3);
  }, [holdingGatedSellItems]);

  // 3. 搜尋與動作過濾
  const filteredItems = useMemo(() => {
    let list = scannedItems;
    if (actionFilter === 'BUY') {
      list = list
        .filter((item) => item.actionDecision.action === 'BUY')
        .sort((a, b) => (b.actionDecision.riskRewardRatioValue ?? 0) - (a.actionDecision.riskRewardRatioValue ?? 0));
    } else if (actionFilter === 'AVOID') {
      list = list.filter((item) => item.actionDecision.action === 'AVOID' || item.actionDecision.action === 'HOLD');
    } else if (actionFilter === 'SELL') {
      list = list.filter((item) => item.actionDecision.action === 'SELL');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (item) => item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
      );
    }

    return list;
  }, [scannedItems, actionFilter, searchQuery]);

  const counts = useMemo(
    () => ({
      all: scannedItems.length,
      buy: buyItems.length,
      avoid: avoidItems.length,
      sell: sellItems.length,
    }),
    [scannedItems.length, buyItems.length, avoidItems.length, sellItems.length]
  );

  const handleToggleExpand = useCallback((sym: string) => {
    setExpandedSymbol((prev) => (prev === sym ? null : sym));
  }, []);

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
        customInputSymbol={customInputSymbol}
        customInputError={customInputError}
        isAddingCustom={isAddingCustom}
        onCustomInputChange={setCustomInputSymbol}
        onAddCustomSymbol={handleAddCustomSymbol}
        onToggleWatchlist={handleToggleWatchlist}
        filteredCount={filteredItems.length}
        isAdHocLoading={isAdHocLoading}
        adHocError={adHocError}
        onRunAdHocScan={handleRunAdHocScan}
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

      {/* 🎯 今日核心作戰指令看板 (Ticket 16) */}
      <ActionDirectivesHUD
        top3BuyItems={top3BuyItems}
        top3SellItems={top3SellItems}
        activeHoldingsMap={activeHoldingsMap}
        expandedSymbol={expandedSymbol}
        onToggleExpand={handleToggleExpand}
        onOpenOmniInspector={onOpenOmniInspector}
      />

      {/* 🧭 三色實戰操盤導航儀 */}
      <TrafficLightMatrix
        buyItems={buyItems}
        avoidItems={avoidItems}
        sellItems={sellItems}
        activeHoldingsMap={activeHoldingsMap}
        expandedSymbol={expandedSymbol}
        onToggleExpand={handleToggleExpand}
        onOpenOmniInspector={onOpenOmniInspector}
      />

      {/* ⚡ 四大象限動能看板 */}
      <DarvasQuadrantGrid
        scannedItems={scannedItems}
        activeHoldingsMap={activeHoldingsMap}
        expandedSymbol={expandedSymbol}
        onToggleExpand={handleToggleExpand}
        onOpenOmniInspector={onOpenOmniInspector}
      />

      {/* 📈 均線扣抵望遠鏡清單 */}
      <DeductionTelescopeTable
        filteredItems={filteredItems}
        watchlistSymbols={watchlistSymbols}
        expandedSymbol={expandedSymbol}
        onToggleExpand={handleToggleExpand}
        onToggleWatchlist={handleToggleWatchlist}
      />
    </div>
  );
};
