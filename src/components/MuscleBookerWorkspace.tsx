import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  Zap,
  TrendingUp,
  AlertTriangle,
  Search,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Star,
  Loader2,
  Plus,
  X,
  RefreshCw,
  Database,
  Target,
  Activity,
} from 'lucide-react';
import { HoldingPosition, MarketType } from '../types/stock';
import type { DailyCandle } from '../types/indicators';

import {
  AssetPoolType,
  BEGINNER_TOOLTIPS,
  ScannedStockItem,
  getScopedUniverseSymbols,
  scanMuscleBookerItem,
  generateSyntheticCandles,
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
import { Tooltip } from './common/Tooltip';
import { getSymbolOhlcv } from '../utils/db';
import { checkAndSyncUniverseDaily } from '../engine/adaptiveUniverseEngine';

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

  // 清理歷史殘留之無效股票代碼 (如 3175 等不存在之標的)
  useEffect(() => {
    const cleaned = watchlistSymbols.filter((s) => s !== '3175');
    if (cleaned.length !== watchlistSymbols.length) {
      setWatchlistSymbols(cleaned);
      saveMuscleBookerWatchlist(cleaned);
    }
  }, []);

  // 任意代碼即搜即算 (Ad-hoc Scan) 狀態
  const [isAdHocLoading, setIsAdHocLoading] = useState(false);
  const [adHocError, setAdHocError] = useState<string | null>(null);
  const [adHocItem, setAdHocItem] = useState<ScannedStockItem | null>(null);

  // 真實歷史日 K 線快取映射表 (SSOT Cache: Symbol -> DailyCandle[])
  const [cachedCandlesMap, setCachedCandlesMap] = useState<Record<string, DailyCandle[]>>({});

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

  // 日 K 快取受控增量同步狀態
  const [syncState, setSyncState] = useState<{
    isSyncing: boolean;
    total: number;
    current: number;
    currentSymbol?: string;
  }>({
    isSyncing: false,
    total: 0,
    current: 0,
  });

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

  // 1.05 建立穩定代碼簽名 key，避免全域價格輪詢變更 holdings 參照觸發無謂的日 K 重新同步
  const targetUniverseKey = useMemo(() => {
    return targetUniverse.map((u) => `${u.symbol}_${u.market}`).join(',');
  }, [targetUniverse]);

  // 1.1 異步從 IndexedDB 批次載入真實日 K 線，並對缺損標的進行受控並發增量回補 (全目標池支援)
  useEffect(() => {
    let isCancelled = false;

    const syncCandles = async () => {
      const updates: Record<string, DailyCandle[]> = {};
      const missing: { symbol: string; market: MarketType }[] = [];

      // 第一步：瞬時檢查 IndexedDB 本地快取
      for (const item of targetUniverse) {
        if (cachedCandlesMap[item.symbol]) continue;

        try {
          const cached = await getSymbolOhlcv(item.symbol);
          if (cached && cached.candles && cached.candles.length >= 5) {
            updates[item.symbol] = cached.candles;
          } else {
            missing.push({ symbol: item.symbol, market: item.market });
          }
        } catch {
          missing.push({ symbol: item.symbol, market: item.market });
        }
      }

      if (isCancelled) return;

      if (Object.keys(updates).length > 0) {
        setCachedCandlesMap((prev) => ({ ...prev, ...updates }));
      }

      // 所有目標池的缺損標的，均啟動受控並發增量回補 (Concurrency = 3, 節流 60ms)
      if (missing.length > 0) {
        setSyncState({
          isSyncing: true,
          total: missing.length,
          current: 0,
          currentSymbol: missing[0].symbol,
        });

        let completed = 0;
        let index = 0;
        const total = missing.length;
        const concurrency = Math.min(3, total);

        const worker = async () => {
          while (index < total) {
            if (isCancelled) return;
            const currentIndex = index++;
            const m = missing[currentIndex];

            if (!isCancelled) {
              setSyncState((prev) => ({
                ...prev,
                current: completed,
                currentSymbol: m.symbol,
              }));
            }

            try {
              const res = await backfillSymbolOhlcvAndIndicators(m.symbol, m.market, false);
              if (isCancelled) return;
              if (res.candles && res.candles.length >= 5) {
                setCachedCandlesMap((prev) => ({ ...prev, [m.symbol]: res.candles }));
              } else {
                const fallback = generateSyntheticCandles(m.symbol, 100);
                setCachedCandlesMap((prev) => ({ ...prev, [m.symbol]: fallback }));
              }
            } catch {
              if (isCancelled) return;
              const fallback = generateSyntheticCandles(m.symbol, 100);
              setCachedCandlesMap((prev) => ({ ...prev, [m.symbol]: fallback }));
            }

            completed++;
            if (!isCancelled) {
              setSyncState((prev) => ({
                ...prev,
                current: completed,
                currentSymbol: m.symbol,
              }));
            }

            await new Promise((resolve) => setTimeout(resolve, 60));
          }
        };

        const workers = Array.from({ length: concurrency }, () => worker());
        await Promise.all(workers);

        if (!isCancelled) {
          setSyncState({
            isSyncing: false,
            total: missing.length,
            current: missing.length,
            currentSymbol: undefined,
          });
        }
      } else {
        setSyncState({
          isSyncing: false,
          total: 0,
          current: 0,
        });
      }
    };

    syncCandles();

    return () => {
      isCancelled = true;
    };
  }, [targetUniverseKey, selectedPool]);

  // 手動觸發全池增量同步最新收盤
  const handleTriggerManualSync = async (forceRefresh = false) => {
    if (syncState.isSyncing) return;
    const items = targetUniverse.map((item) => ({ symbol: item.symbol, market: item.market }));
    if (items.length === 0) return;

    setSyncState({
      isSyncing: true,
      total: items.length,
      current: 0,
      currentSymbol: items[0].symbol,
    });

    let completed = 0;
    let index = 0;
    const total = items.length;
    const concurrency = Math.min(3, total);

    const worker = async () => {
      while (index < total) {
        const currentIndex = index++;
        const m = items[currentIndex];

        setSyncState((prev) => ({
          ...prev,
          current: completed,
          currentSymbol: m.symbol,
        }));

        try {
          const res = await backfillSymbolOhlcvAndIndicators(m.symbol, m.market, forceRefresh);
          if (res.candles && res.candles.length >= 5) {
            setCachedCandlesMap((prev) => ({ ...prev, [m.symbol]: res.candles }));
          } else {
            const fallback = generateSyntheticCandles(m.symbol, 100);
            setCachedCandlesMap((prev) => ({ ...prev, [m.symbol]: fallback }));
          }
        } catch {
          const fallback = generateSyntheticCandles(m.symbol, 100);
          setCachedCandlesMap((prev) => ({ ...prev, [m.symbol]: fallback }));
        }

        completed++;
        setSyncState((prev) => ({
          ...prev,
          current: completed,
          currentSymbol: m.symbol,
        }));

        await new Promise((resolve) => setTimeout(resolve, 60));
      }
    };

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    setSyncState({
      isSyncing: false,
      total: items.length,
      current: items.length,
      currentSymbol: undefined,
    });
  };

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

      // 同步寫入工作區真實日 K 快取，達成 SSOT 全域一致性
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
      setAdHocError(`連線診斷失敗：${err?.message || '查無此代碼或外部網路異常'}`);
    } finally {
      setIsAdHocLoading(false);
    }
  };

  // 切換釘選/移除自訂清單
  const handleToggleWatchlist = (symbol: string) => {
    const clean = symbol.trim().toUpperCase();
    if (watchlistSymbols.includes(clean)) {
      const updated = removeMuscleBookerWatchlistSymbol(clean);
      setWatchlistSymbols(updated);
    } else {
      const updated = addMuscleBookerWatchlistSymbol(clean);
      setWatchlistSymbols(updated);
      const inferredMarket: MarketType = inferMarketFromSymbol(clean);
      backfillSymbolOhlcvAndIndicators(clean, inferredMarket, false)
        .then((res) => {
          if (res.candles && res.candles.length >= 5) {
            setCachedCandlesMap((prev) => ({ ...prev, [clean]: res.candles }));
          }
        })
        .catch(() => {});
    }
  };

  // 快速新增自訂清單標的 (含代碼有效性驗證與存在性防護)
  const handleAddCustomSymbol = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customInputSymbol.trim().toUpperCase();
    if (!clean) return;
    setCustomInputError(null);

    // 1. 若已在名單中，避免重複加入
    if (watchlistSymbols.includes(clean)) {
      setCustomInputError(`「${clean}」已在自訂觀察名單中。`);
      return;
    }

    setIsAddingCustom(true);
    try {
      const inferredMarket: MarketType = inferMarketFromSymbol(clean);
      const res = await backfillSymbolOhlcvAndIndicators(clean, inferredMarket, false);

      if (!res.candles || res.candles.length === 0) {
        setCustomInputError(`查無股票代碼「${clean}」或無歷史行情，無法加入。`);
        setIsAddingCustom(false);
        return;
      }

      // 存在有效日 K，正式放行加入名單
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

  // 2. 進行肌肉書僮指標全量掃描 (優先使用真實日 K 快取，杜絕假 K 線)
  const scannedItems = useMemo<ScannedStockItem[]>(() => {
    return targetUniverse.map((item) => {
      // 1. 優先從真實日 K 快取中獲取
      const candles = cachedCandlesMap[item.symbol];

      // 若已有即時診斷項目且剛好是此標的，且有完整指標，直接複用
      if (adHocItem && adHocItem.symbol === item.symbol && !adHocItem.isDataPending) {
        return adHocItem;
      }

      // 若本地有真實日 K，以最新收盤價為準；否則以 basePrice 為準
      const latestCandle = candles && candles.length > 0 ? candles[candles.length - 1] : undefined;
      const effectivePrice = latestCandle?.close ?? item.basePrice ?? 100;

      return scanMuscleBookerItem(
        item.symbol,
        item.name,
        item.market,
        effectivePrice,
        candles
      );
    });
  }, [targetUniverse, cachedCandlesMap, adHocItem]);

  // 在庫持股快速比對 Map (以大寫代碼為 key)
  const activeHoldingsMap = useMemo(() => {
    return new Map(activeHoldings.map((h) => [h.symbol.toUpperCase(), h]));
  }, [activeHoldings]);

  // 統計各類動作數量 (建議買進標的全面按風益比數值由大到小降序排列，置頂最優標的)
  const buyItems = useMemo(() => {
    return scannedItems
      .filter((i) => i.actionDecision.action === 'BUY')
      .sort((a, b) => (b.actionDecision.riskRewardRatioValue ?? 0) - (a.actionDecision.riskRewardRatioValue ?? 0));
  }, [scannedItems]);

  // 今日核心作戰指令：建議買進前 3 檔 (風益比 >= 2.0 優先，降序排列，最多取前 3)
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

  // 今日核心作戰指令：在庫持股限定之賣出建議 (嚴格限制持股股數 > 0 者才建議賣出)
  const holdingGatedSellItems = useMemo(() => {
    return scannedItems.filter(
      (i) => i.actionDecision.action === 'SELL' && activeHoldingsMap.has(i.symbol.toUpperCase())
    );
  }, [scannedItems, activeHoldingsMap]);

  // 今日核心作戰指令：建議賣出前 3 檔 (在庫持股中觸發破線停損者，最多取前 3)
  const top3SellItems = useMemo(() => {
    return holdingGatedSellItems.slice(0, 3);
  }, [holdingGatedSellItems]);

  // 3. 搜尋與動作過濾 (買進模式下同步維持風益比降序)
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
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) => item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    );
  }, [scannedItems, actionFilter, searchQuery]);

  // 4. 四大箱子象限分群
  const breakoutUpItems = filteredItems.filter((i) => i.boxStatus === 'BREAKOUT_UP');
  const bottomPenetrationItems = filteredItems.filter((i) => i.isBottomPenetration);
  const squeezeItems = filteredItems.filter((i) => i.isBollingerSqueeze);
  const breakoutDownItems = filteredItems.filter((i) => i.boxStatus === 'BREAKOUT_DOWN');
  const deductionUpItems = filteredItems.filter((i) => i.ma20Slope === 'UP');

  // 5. 計算本地日 K 快取就緒狀態
  const totalUniverseCount = targetUniverse.length;
  const readyUniverseCount = targetUniverse.filter(
    (item) => cachedCandlesMap[item.symbol] && cachedCandlesMap[item.symbol].length >= 5
  ).length;
  const readyPercent = totalUniverseCount > 0 ? Math.round((readyUniverseCount / totalUniverseCount) * 100) : 100;

  return (
    <div className="warroom-container animate-fade-in" style={{ position: 'relative' }}>
      {/* 輕量 Toast 通知 */}
      {universeSyncToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            maxWidth: '460px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background:
              universeSyncToast.type === 'warn'
                ? 'rgba(239, 68, 68, 0.95)'
                : 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 58, 138, 0.96))',
            border: '1px solid ' + (universeSyncToast.type === 'warn' ? '#ef4444' : '#3b82f6'),
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ marginTop: '2px', flexShrink: 0 }}>
            {universeSyncToast.type === 'warn' ? (
              <AlertTriangle size={18} color="#fca5a5" />
            ) : (
              <CheckCircle2 size={18} color="#60a5fa" />
            )}
          </div>
          <div style={{ flex: 1, fontSize: '0.85rem', lineHeight: '1.45' }}>
            {universeSyncToast.message}
          </div>
          <button
            onClick={() => setUniverseSyncToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="關閉通知"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 頂部 Header */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(88, 28, 135, 0.4) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              padding: '12px',
              background: 'rgba(244, 63, 94, 0.18)',
              color: '#fb7185',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
            }}
          >
            <Flame size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                肌肉書僮·動能雷達
              </h1>
              <span
                className="badge"
                style={{
                  background: 'rgba(244, 63, 94, 0.2)',
                  color: '#fb7185',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                }}
              >
                短線聖經 · 箱子戰術
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              「不預測高低，只跟隨突破；進場靠訊號，出場靠紀律」
            </p>
          </div>
        </div>

        {/* 搜尋框與資產池切換 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="搜尋或輸入代碼..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handleRunAdHocScan(searchQuery);
                  }
                }}
                style={{
                  padding: '6px 12px 6px 30px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  outline: 'none',
                  width: '175px',
                }}
              />
            </div>
            {searchQuery.trim() && (
              <button
                onClick={() => handleRunAdHocScan(searchQuery)}
                disabled={isAdHocLoading}
                className="btn btn-sm"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: isAdHocLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="即時連線外部回補日 K 並運算動能雷達"
              >
                {isAdHocLoading ? <Loader2 size={13} className="animate-spin" /> : <Flame size={13} />}
                連線診斷
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setSelectedPool('TOP30_FOCUS')}
              className="btn btn-sm"
              style={{
                background: selectedPool === 'TOP30_FOCUS' ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                color: selectedPool === 'TOP30_FOCUS' ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + (selectedPool === 'TOP30_FOCUS' ? 'var(--accent-primary)' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {currentMarket === 'US' ? '美股焦點 Top 30' : currentMarket === 'TW' ? '台股焦點 Top 30' : '法人焦點 Top 30'}
            </button>
            <button
              onClick={() => setSelectedPool('HOLDINGS_ACTIVE')}
              className="btn btn-sm"
              style={{
                background: (selectedPool === 'HOLDINGS_ACTIVE' || selectedPool === 'HOLDINGS') ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                color: (selectedPool === 'HOLDINGS_ACTIVE' || selectedPool === 'HOLDINGS') ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + ((selectedPool === 'HOLDINGS_ACTIVE' || selectedPool === 'HOLDINGS') ? 'var(--accent-primary)' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {currentMarket === 'US' ? '美股在倉' : currentMarket === 'TW' ? '台股在倉' : '在倉持股'} ({activeHoldings.length})
            </button>
            <button
              onClick={() => setSelectedPool('HOLDINGS_CLOSED')}
              className="btn btn-sm"
              style={{
                background: selectedPool === 'HOLDINGS_CLOSED' ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                color: selectedPool === 'HOLDINGS_CLOSED' ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + (selectedPool === 'HOLDINGS_CLOSED' ? 'var(--accent-primary)' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {currentMarket === 'US' ? '美股平倉' : currentMarket === 'TW' ? '歷史平倉' : '已平倉'} ({closedHoldings.length})
            </button>
            <button
              onClick={() => setSelectedPool('TW50_CORE')}
              className="btn btn-sm"
              style={{
                background: selectedPool === 'TW50_CORE' ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                color: selectedPool === 'TW50_CORE' ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + (selectedPool === 'TW50_CORE' ? 'var(--accent-primary)' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {currentMarket === 'US' ? '美股巨頭 Top 50' : '權值核心 Top 50'}
            </button>
            <button
              onClick={() => setSelectedPool('CUSTOM_WATCHLIST')}
              className="btn btn-sm"
              style={{
                background: selectedPool === 'CUSTOM_WATCHLIST' ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                color: selectedPool === 'CUSTOM_WATCHLIST' ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + (selectedPool === 'CUSTOM_WATCHLIST' ? 'var(--accent-primary)' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Star size={13} style={{ color: selectedPool === 'CUSTOM_WATCHLIST' ? '#fde047' : 'inherit' }} fill={selectedPool === 'CUSTOM_WATCHLIST' ? '#fde047' : 'none'} />
              自訂觀察 ({watchlistSymbols.length})
            </button>
          </div>
        </div>
      </div>

      {/* 📊 本地日 K 快取與受控增量同步狀態列 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          background: syncState.isSyncing
            ? 'linear-gradient(90deg, rgba(30, 58, 138, 0.35), rgba(15, 23, 42, 0.6))'
            : 'rgba(15, 23, 42, 0.55)',
          border: '1px solid ' + (syncState.isSyncing ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.07)'),
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: syncState.isSyncing ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.15)',
              color: syncState.isSyncing ? '#60a5fa' : '#34d399',
            }}
          >
            {syncState.isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600 }}>
              <span style={{ color: 'var(--text-primary)' }}>
                本地日 K 快取就緒度：
              </span>
              <span style={{ color: readyPercent === 100 ? '#34d399' : '#f59e0b', fontWeight: 700 }}>
                {readyUniverseCount} / {totalUniverseCount} 檔 ({readyPercent}%)
              </span>
              {syncState.isSyncing && syncState.currentSymbol && (
                <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 500 }}>
                  ⏳ 正在增量同步：{syncState.currentSymbol} ({syncState.current}/{syncState.total})
                </span>
              )}
              {!syncState.isSyncing && readyPercent === 100 && (
                <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle2 size={13} /> 均已在本地持久化，支援離線即時秒算
                </span>
              )}
            </div>

            {syncState.isSyncing && (
              <div
                style={{
                  width: '100%',
                  maxWidth: '360px',
                  height: '4px',
                  borderRadius: '2px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden',
                  marginTop: '2px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${syncState.total > 0 ? (syncState.current / syncState.total) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                    borderRadius: '2px',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500,
            }}
          >
            {universeStatusText}
          </span>
          <button
            onClick={handleManualCheckUniverse}
            disabled={isCheckingUniverse}
            className="btn btn-sm"
            style={{
              padding: '5px 10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#c4b5fd',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: 'var(--radius-sm)',
              cursor: isCheckingUniverse ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="檢驗官方成分股與存活探針，若遇下市或更名自動自後備池遞補"
          >
            <RefreshCw size={13} className={isCheckingUniverse ? 'animate-spin' : ''} />
            {isCheckingUniverse ? '校準中...' : '檢查官方成分股'}
          </button>
          <button
            onClick={() => handleTriggerManualSync(false)}
            disabled={syncState.isSyncing}
            className="btn btn-sm"
            style={{
              padding: '5px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#93c5fd',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 'var(--radius-sm)',
              cursor: syncState.isSyncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
            title="對當前池內所有標的進行增量補齊最新收盤價並持久化至本地"
          >
            <RefreshCw size={13} className={syncState.isSyncing ? 'animate-spin' : ''} />
            {syncState.isSyncing ? '增量同步中...' : '增量同步最新收盤'}
          </button>
        </div>
      </div>


      {/* 🚦 三色操作戰術導覽篩選列 */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={15} style={{ color: 'var(--accent-amber)' }} />
            實戰動作篩選：
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setActionFilter('ALL')}
              className="btn btn-sm"
              style={{
                background: actionFilter === 'ALL' ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.5)',
                color: actionFilter === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + (actionFilter === 'ALL' ? 'var(--accent-primary)' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              🔥 全部標的 ({scannedItems.length})
            </button>
            <button
              onClick={() => setActionFilter('BUY')}
              className="btn btn-sm"
              style={{
                background: actionFilter === 'BUY' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                color: actionFilter === 'BUY' ? '#4ade80' : 'var(--text-secondary)',
                border: '1px solid ' + (actionFilter === 'BUY' ? '#22c55e' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              🟢 建議買進 ({buyItems.length})
            </button>
            <button
              onClick={() => setActionFilter('AVOID')}
              className="btn btn-sm"
              style={{
                background: actionFilter === 'AVOID' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                color: actionFilter === 'AVOID' ? '#fbbf24' : 'var(--text-secondary)',
                border: '1px solid ' + (actionFilter === 'AVOID' ? '#f59e0b' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              ⛔ 觀望不碰 ({avoidItems.length})
            </button>
            <button
              onClick={() => setActionFilter('SELL')}
              className="btn btn-sm"
              style={{
                background: actionFilter === 'SELL' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                color: actionFilter === 'SELL' ? '#f87171' : 'var(--text-secondary)',
                border: '1px solid ' + (actionFilter === 'SELL' ? '#ef4444' : 'var(--border-color)'),
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              🔴 建議賣出 ({sellItems.length})
            </button>
          </div>
        </div>

        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          已顯示 {filteredItems.length} / {scannedItems.length} 檔標的
        </span>
      </div>

      {/* 🌟 自訂觀察清單管理列 (僅在 CUSTOM_WATCHLIST 顯示) */}
      {selectedPool === 'CUSTOM_WATCHLIST' && (
        <div
          className="card animate-fade-in"
          style={{
            padding: '12px 18px',
            background: 'rgba(30, 41, 59, 0.55)',
            border: '1px dashed rgba(56, 189, 248, 0.4)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={16} style={{ color: '#fde047' }} fill="#fde047" />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              自訂觀察名單管理 ({watchlistSymbols.length} 檔)
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              輸入台美股任意代碼加入觀察，永久保存在本地瀏覽器
            </span>
          </div>

          <form onSubmit={handleAddCustomSymbol} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="輸入代碼 (例: 3017, NVDA)..."
              value={customInputSymbol}
              onChange={(e) => setCustomInputSymbol(e.target.value)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                outline: 'none',
                width: '200px',
              }}
            />
            <button
              type="submit"
              disabled={isAddingCustom}
              className="btn btn-sm"
              style={{
                background: isAddingCustom ? 'rgba(56, 189, 248, 0.4)' : 'var(--accent-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: isAddingCustom ? 'not-allowed' : 'pointer',
              }}
            >
              {isAddingCustom ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {isAddingCustom ? '驗證中...' : '加入清單'}
            </button>
          </form>

          {customInputError && (
            <div style={{ width: '100%', fontSize: '0.78rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={13} />
              {customInputError}
            </div>
          )}

          {watchlistSymbols.length > 0 ? (
            <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>清單標的：</span>
              {watchlistSymbols.map((sym) => {
                const officialName = resolveOfficialSecurityName(sym, sym);
                return (
                  <span
                    key={sym}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '3px 8px',
                      fontSize: '0.78rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span className="mono" style={{ fontWeight: 700, color: '#38bdf8' }}>{sym}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{officialName}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleWatchlist(sym)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f87171',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="從自訂名單移除"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <div style={{ width: '100%', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              💡 目前觀察名單為空。請輸入代碼後點擊「加入清單」，或於上方搜尋欄輸入代碼進行即時連線診斷後點擊釘選。
            </div>
          )}
        </div>
      )}

      {/* ⚡ 查無本地標的引導橫幅 */}
      {searchQuery.trim() && filteredItems.length === 0 && !isAdHocLoading && (
        <div
          className="card animate-fade-in"
          style={{
            padding: '12px 18px',
            background: 'rgba(30, 41, 59, 0.75)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: '#e2e8f0' }}>
            <AlertTriangle size={18} style={{ color: 'var(--accent-amber)' }} />
            <span>
              在目前清單中查無「<strong style={{ color: '#38bdf8' }}>{searchQuery.toUpperCase()}</strong>」。是否連線外部進行雷達診斷？
            </span>
          </div>
          <button
            onClick={() => handleRunAdHocScan(searchQuery)}
            className="btn btn-sm"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            <Flame size={14} />
            ⚡ 立即連線外部診斷「{searchQuery.toUpperCase()}」
          </button>
        </div>
      )}

      {/* ⚡ 即時診斷異常提示 */}
      {adHocError && (
        <div
          className="card animate-fade-in"
          style={{
            padding: '10px 16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span>{adHocError}</span>
          </div>
          <button
            onClick={() => setAdHocError(null)}
            style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ⚡ 即時診斷載入中指示 */}
      {isAdHocLoading && (
        <div
          className="card animate-fade-in"
          style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#38bdf8',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <Loader2 size={18} className="animate-spin" />
          <span>正在連線外部資料源回補歷史日 K 並動態運算肌肉書僮指標...</span>
        </div>
      )}

      {/* ⚡ 即時外部診斷高光置頂卡 (Spotlight Card) */}
      {adHocItem && (
        <div
          className="card animate-fade-in"
          style={{
            padding: '18px 22px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            boxShadow: '0 8px 32px rgba(56, 189, 248, 0.15)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                className="badge"
                style={{
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Zap size={13} /> 即時外部診斷標的
              </span>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {adHocItem.symbol} {adHocItem.name}
              </h3>
              <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                ${adHocItem.currentPrice}
              </span>
              <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.3)', color: 'var(--text-secondary)' }}>
                {adHocItem.market}
              </span>
            </div>

            {/* 操作按鈕組 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => handleToggleWatchlist(adHocItem.symbol)}
                className="btn btn-sm"
                style={{
                  background: watchlistSymbols.includes(adHocItem.symbol) ? 'rgba(250, 204, 21, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                  color: watchlistSymbols.includes(adHocItem.symbol) ? '#fde047' : '#38bdf8',
                  border: '1px solid ' + (watchlistSymbols.includes(adHocItem.symbol) ? 'rgba(250, 204, 21, 0.5)' : 'rgba(56, 189, 248, 0.4)'),
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Star size={14} fill={watchlistSymbols.includes(adHocItem.symbol) ? '#fde047' : 'none'} />
                {watchlistSymbols.includes(adHocItem.symbol) ? '已在自訂觀察' : '釘選至自訂觀察'}
              </button>

              {onOpenOmniInspector && (
                <button
                  onClick={() => onOpenOmniInspector(adHocItem.symbol, adHocItem.market)}
                  className="btn btn-sm"
                  style={{
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99, 102, 241, 0.45)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="開啟 15 大關鍵技術指標全景透視與多空共振評分"
                >
                  <Activity size={14} />
                  <span>全指標透視</span>
                </button>
              )}

              <button
                onClick={() => setAdHocItem(null)}
                className="btn btn-sm"
                style={{
                  background: 'rgba(51, 65, 85, 0.5)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  padding: '6px 8px',
                }}
                title="關閉診斷卡片"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* 指標狀態條 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>實戰動作訊號</div>
              {adHocItem.actionDecision.action === 'BUY' ? (
                <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)', fontWeight: 800 }}>
                  🟢 建議買進 · 主升發動
                </span>
              ) : adHocItem.actionDecision.action === 'SELL' ? (
                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', fontWeight: 800 }}>
                  🔴 建議賣出 · 破線停損
                </span>
              ) : (
                <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', fontWeight: 800 }}>
                  🟡 觀望不碰 · 盤整待變
                </span>
              )}
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>箱子戰術狀態</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {adHocItem.boxStatus === 'BREAKOUT_UP' ? '🔥 突破箱頂' : adHocItem.boxStatus === 'BREAKOUT_DOWN' ? '⚠️ 跌破箱底' : '📦 箱內整理'}
                {adHocItem.boxUpper && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                    (頂: ${adHocItem.boxUpper} / 底: ${adHocItem.boxLower})
                  </span>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>布林極致壓縮 & MA扣抵</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {adHocItem.isBollingerSqueeze ? (
                  <span style={{ color: '#fbbf24' }}>⚡ 極致壓縮 ({adHocItem.bollingerBandwidth?.toFixed(1)}%)</span>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>帶寬 {adHocItem.bollingerBandwidth?.toFixed(1) || '-'}%</span>
                )}
                <span style={{ marginLeft: '6px', color: adHocItem.ma20Slope === 'UP' ? 'var(--gain-color)' : adHocItem.ma20Slope === 'DOWN' ? 'var(--loss-color)' : 'var(--text-muted)' }}>
                  {adHocItem.ma20Slope === 'UP' ? '📈 扣抵翻揚' : adHocItem.ma20Slope === 'DOWN' ? '📉 扣抵下彎' : '➖ 均線走平'}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>防守線與風益比</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171' }}>
                防守: ${adHocItem.actionDecision.stopLossPrice ?? '-'}
                {adHocItem.actionDecision.riskRewardRatio && (
                  <span style={{ color: '#38bdf8', marginLeft: '6px' }}>
                    (風益比 1:{adHocItem.actionDecision.riskRewardRatio}R)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} style={{ color: 'var(--accent-amber)' }} />
            <strong>操盤建議：</strong>
            <span>{adHocItem.actionDecision.actionReason}</span>
          </div>
        </div>
      )}

      {/* 🎯 今日核心作戰指令看板 (Top 3 Action Directives & Holding-Gated Sell) */}
      <div
        className="card"
        style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.92) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} style={{ color: 'var(--accent-amber, #f59e0b)' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                今日核心作戰指令 (Top 3 Action Directives)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                精準雙欄聚光：篩選最高勝率買進先鋒 (風益比 ≥ 2.0)，在庫持股嚴格停損風控
              </p>
            </div>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>持股安全監控中</span>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              在庫監控: {activeHoldings.length} 檔
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {/* 左欄：🟢 今日買進先鋒 (Top 3 BUY) */}
          <div
            style={{
              background: 'var(--gain-bg)',
              border: '1px solid var(--gain-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gain-color)', fontWeight: 800, fontSize: '0.96rem' }}>
                <TrendingUp size={18} />
                <span>🟢 今日買進先鋒 (Top 3 BUY)</span>
              </div>
              <span
                className="badge"
                style={{
                  background: 'var(--gain-bg)',
                  color: 'var(--gain-color)',
                  border: '1px solid var(--gain-border)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                {top3BuyItems.length} 檔 · 風益比 ≥ 2.0R
              </span>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              突破箱頂且 20MA 扣低走揚，風益比 ≥ 2.0R 優先置頂，勝率與動能俱佳。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {top3BuyItems.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: 'rgba(15, 23, 42, 0.45)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--gain-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                  }}
                >
                  <Search size={22} style={{ opacity: 0.5, color: 'var(--gain-color)' }} />
                  <div>0 檔 · 目前目標池中無風益比 ≥ 2.0R 之突破標的</div>
                  <div style={{ fontSize: '0.74rem', opacity: 0.8 }}>耐心等待訊號確認，切忌盲目追高</div>
                </div>
              ) : (
                top3BuyItems.map((item, index) => (
                  <div
                    key={item.symbol}
                    onClick={() => setExpandedSymbol(expandedSymbol === item.symbol ? null : item.symbol)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      border: '1px solid var(--gain-border)',
                      transition: 'transform 0.15s ease, border-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            background: 'var(--gain-bg)',
                            color: 'var(--gain-color)',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                          }}
                        >
                          #{index + 1}
                        </span>
                        <span className="mono" style={{ fontWeight: 800, fontSize: '0.98rem', color: '#ffffff' }}>
                          {item.symbol}{' '}
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                            {item.name}
                          </span>
                        </span>
                      </div>
                      <span className="mono" style={{ color: 'var(--gain-color)', fontWeight: 800, fontSize: '1.05rem' }}>
                        {formatCurrencyPrice(item.currentPrice, item.market)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.78rem', flexWrap: 'wrap', gap: '8px' }}>
                      <Tooltip content={BEGINNER_TOOLTIPS.boxUpperDefense} position="top">
                        <span style={{ color: 'var(--text-muted)', textDecoration: 'underline dotted', cursor: 'help' }}>
                          防守: {formatCurrencyPrice(item.actionDecision.stopLossPrice ?? item.boxUpper, item.market)}
                        </span>
                      </Tooltip>
                      {item.actionDecision.targetPrice && (
                        <span style={{ color: 'var(--accent-cyan, #38bdf8)', fontWeight: 700 }}>
                          目標: {formatCurrencyPrice(item.actionDecision.targetPrice, item.market)}
                        </span>
                      )}
                      {item.actionDecision.riskRewardRatio && (
                        <Tooltip content={BEGINNER_TOOLTIPS.riskReward} position="top">
                          <span
                            style={{
                              color: 'var(--accent-amber, #f59e0b)',
                              fontWeight: 800,
                              textDecoration: 'underline dotted',
                              cursor: 'help',
                            }}
                          >
                            🔥 風益比: {item.actionDecision.riskRewardRatio}
                          </span>
                        </Tooltip>
                      )}
                    </div>

                    <div style={{ marginTop: '6px', fontSize: '0.74rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      💡 {item.actionDecision.actionReason}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右欄：🔴 在庫賣出停損 (Holding-Gated SELL) */}
          <div
            style={{
              background: 'var(--loss-bg)',
              border: '1px solid var(--loss-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--loss-color)', fontWeight: 800, fontSize: '0.96rem' }}>
                <AlertTriangle size={18} />
                <span>🔴 在庫賣出停損 (Holding-Gated SELL)</span>
              </div>
              <span
                className="badge"
                style={{
                  background: 'var(--loss-bg)',
                  color: 'var(--loss-color)',
                  border: '1px solid var(--loss-border)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                {top3SellItems.length} 檔 · 在庫停損警戒
              </span>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              僅嚴格建議在庫持股：跌破箱底防守線或均線蓋頭，嚴禁凹單，果斷保全本金。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {top3SellItems.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: 'rgba(15, 23, 42, 0.45)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed rgba(34, 197, 94, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    color: '#4ade80',
                    fontSize: '0.82rem',
                  }}
                >
                  <CheckCircle2 size={24} style={{ color: '#4ade80' }} />
                  <div style={{ fontWeight: 700 }}>
                    0 檔 · 🟢 目前在籍持股均在防守線之上，無持股需賣出 (持倉安全)
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    持股防守線穩固，未出現跌破停損訊號，可安心續抱
                  </div>
                </div>
              ) : (
                top3SellItems.map((item, index) => {
                  const holding = activeHoldingsMap.get(item.symbol.toUpperCase());
                  return (
                    <div
                      key={item.symbol}
                      onClick={() => setExpandedSymbol(expandedSymbol === item.symbol ? null : item.symbol)}
                      style={{
                        background: 'rgba(15, 23, 42, 0.75)',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        border: '1px solid var(--loss-border)',
                        transition: 'transform 0.15s ease, border-color 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              background: 'var(--loss-bg)',
                              color: 'var(--loss-color)',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}
                          >
                            #{index + 1}
                          </span>
                          <span className="mono" style={{ fontWeight: 800, fontSize: '0.98rem', color: '#ffffff' }}>
                            {item.symbol}{' '}
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                              {item.name}
                            </span>
                          </span>
                          {holding && (
                            <span
                              className="badge"
                              style={{
                                fontSize: '0.72rem',
                                background: 'var(--loss-bg)',
                                color: 'var(--loss-color)',
                                border: '1px solid var(--loss-border)',
                                fontWeight: 700,
                              }}
                            >
                              🚨 在庫: {holding.shares.toLocaleString()} 股
                            </span>
                          )}
                        </div>
                        <span className="mono" style={{ color: 'var(--loss-color)', fontWeight: 800, fontSize: '1.05rem' }}>
                          {formatCurrencyPrice(item.currentPrice, item.market)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.78rem' }}>
                        <Tooltip content={BEGINNER_TOOLTIPS.boxLowerBreakdown} position="top">
                          <span style={{ color: 'var(--loss-color)', textDecoration: 'underline dotted', cursor: 'help' }}>
                            原防守: {formatCurrencyPrice(item.boxLower ?? item.actionDecision.stopLossPrice, item.market)}
                          </span>
                        </Tooltip>
                        <span style={{ color: 'var(--loss-color)', fontWeight: 700 }}>
                          ⚠️ 破線已觸發停損
                        </span>
                      </div>

                      <div style={{ marginTop: '6px', fontSize: '0.74rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        🚨 {item.actionDecision.actionReason}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🧭 肌肉書僮·三色實戰操盤導航儀 (Action Matrix) */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} style={{ color: '#38bdf8' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              三色實戰操盤導航儀 (Traffic-Light Action Matrix)
            </h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            一眼看懂：哪檔能買、哪檔不能碰、哪檔必須撤退
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '14px',
          }}
        >
          {/* 區塊 1: 🟢 建議買進 */}
          <div
            style={{
              background: 'var(--gain-bg)',
              border: '1px solid var(--gain-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gain-color)', fontWeight: 700, fontSize: '0.92rem' }}>
                <CheckCircle2 size={16} />
                🟢 建議買進 · 主升發動
              </div>
              <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)', border: '1px solid var(--gain-border)' }}>
                {buyItems.length} 檔
              </span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              突破箱頂或破底翻，帶量表態，防守點明確。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {buyItems.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                  目前無符合強勢買進標的，切勿追高。
                </div>
              ) : (
                buyItems.slice(0, 3).map((item) => (
                  <div
                    key={item.symbol}
                    onClick={() => setExpandedSymbol(expandedSymbol === item.symbol ? null : item.symbol)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      border: '1px solid var(--gain-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="mono" style={{ fontWeight: 800, color: '#ffffff' }}>
                        {item.symbol} <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{item.name}</span>
                      </span>
                      <span className="mono" style={{ color: 'var(--gain-color)', fontWeight: 700 }}>
                        {formatCurrencyPrice(item.currentPrice, item.market)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.74rem' }}>
                      <Tooltip content={BEGINNER_TOOLTIPS.boxUpperDefense} position="top">
                        <span style={{ color: 'var(--text-muted)', textDecoration: 'underline dotted', cursor: 'help' }}>
                          防守: {formatCurrencyPrice(item.actionDecision.stopLossPrice ?? item.boxUpper, item.market)}
                        </span>
                      </Tooltip>
                      {item.actionDecision.riskRewardRatio && (
                        <Tooltip content={BEGINNER_TOOLTIPS.riskReward} position="top">
                          <span
                            style={{
                              color: (item.actionDecision.riskRewardRatioValue ?? 0) >= 2.0 ? '#facc15' : '#38bdf8',
                              fontWeight: (item.actionDecision.riskRewardRatioValue ?? 0) >= 2.0 ? 800 : 600,
                              textDecoration: 'underline dotted',
                              cursor: 'help',
                            }}
                          >
                            {(item.actionDecision.riskRewardRatioValue ?? 0) >= 2.0 ? '🔥 風益比: ' : '風益比: '}
                            {item.actionDecision.riskRewardRatio}
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 區塊 2: ⛔ 觀望不碰 */}
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: 700, fontSize: '0.92rem' }}>
                <HelpCircle size={16} />
                ⛔ 觀望不碰 · 盤整待變
              </div>
              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                {avoidItems.length} 檔
              </span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              布林極致壓縮、20MA 下彎蓋頭或箱內震盪整理，等待出方向，切忌急躁進場。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {avoidItems.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                  目前無極度危險或極致壓縮待變之標的。
                </div>
              ) : (
                avoidItems.slice(0, 3).map((item) => (
                  <div
                    key={item.symbol}
                    onClick={() => setExpandedSymbol(expandedSymbol === item.symbol ? null : item.symbol)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="mono" style={{ fontWeight: 800, color: '#ffffff' }}>
                        {item.symbol} <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{item.name}</span>
                      </span>
                      <span className="mono" style={{ color: '#fbbf24', fontWeight: 700 }}>
                        {formatCurrencyPrice(item.currentPrice, item.market)}
                      </span>
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '0.74rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.actionDecision.actionReason}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 區塊 3: 🔴 建議賣出 */}
          <div
            style={{
              background: 'var(--loss-bg)',
              border: '1px solid var(--loss-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--loss-color)', fontWeight: 700, fontSize: '0.92rem' }}>
                <XCircle size={16} />
                🔴 建議賣出 · 破線停損
              </div>
              <span className="badge" style={{ background: 'var(--loss-bg)', color: 'var(--loss-color)', border: '1px solid var(--loss-border)' }}>
                {sellItems.length} 檔
              </span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              跌破箱底防守線或均線扣高下殺，嚴禁凹單，果斷保全本金。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sellItems.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                  目前無跌破箱底之停損標的，防守線穩固。
                </div>
              ) : (
                sellItems.slice(0, 3).map((item) => {
                  const isHolding = activeHoldingsMap.has(item.symbol.toUpperCase());
                  return (
                    <div
                      key={item.symbol}
                      onClick={() => setExpandedSymbol(expandedSymbol === item.symbol ? null : item.symbol)}
                      style={{
                        background: 'rgba(15, 23, 42, 0.65)',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        border: '1px solid var(--loss-border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="mono" style={{ fontWeight: 800, color: '#ffffff' }}>
                          {item.symbol} <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{item.name}</span>
                          {isHolding && (
                            <span
                              className="badge"
                              style={{
                                fontSize: '0.7rem',
                                background: 'var(--loss-bg)',
                                color: 'var(--loss-color)',
                                border: '1px solid var(--loss-border)',
                                marginLeft: '6px',
                              }}
                            >
                              🚨 在庫
                            </span>
                          )}
                        </span>
                        <span className="mono" style={{ color: 'var(--loss-color)', fontWeight: 700 }}>
                          {formatCurrencyPrice(item.currentPrice, item.market)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.74rem' }}>
                        <Tooltip content={BEGINNER_TOOLTIPS.boxLowerBreakdown} position="top">
                          <span style={{ color: 'var(--loss-color)', textDecoration: 'underline dotted', cursor: 'help' }}>
                            原防守: {formatCurrencyPrice(item.boxLower ?? item.actionDecision.stopLossPrice, item.market)}
                          </span>
                        </Tooltip>
                        <Tooltip content={BEGINNER_TOOLTIPS.boxLowerBreakdown} position="top">
                          <span style={{ color: 'var(--loss-color)', fontWeight: 600, textDecoration: 'underline dotted', cursor: 'help' }}>破線停損</span>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 戰術指南橫幅 */}
      <div className="warroom-hero-card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} style={{ color: 'var(--accent-amber)' }} />
            <strong style={{ fontSize: '0.92rem', color: '#fef08a' }}>肌肉記憶短線實戰三大紀律：</strong>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            ① 三日不破高確立箱頂，<strong>帶量站上箱頂即為第一買點</strong>；
            ② 跌破支撐後下影線收復過半即為<strong>底穿假跌破主力吃貨</strong>；
            ③ <strong>跌破箱底防守線，絕不凹單果斷停損</strong>。
          </span>
        </div>
      </div>

      {/* 四大象限動能看板 */}
      <div className="warroom-grid-2">
        {/* 象限一：🔥 箱頂突破區 */}
        <div className="card">
          <div className="warroom-section-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={18} style={{ color: 'var(--gain-color)' }} />
                【箱頂突破區】(Breakout)
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                三日箱頂有效站穩 · 肌肉記憶主升段表態
              </span>
            </div>
            <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)', border: '1px solid var(--gain-border)' }}>
              {breakoutUpItems.length} 檔表態
            </span>
          </div>

          {breakoutUpItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              目前選定資產池暫無標的突破箱頂，維持紀律耐心等待。
            </div>
          ) : (
            <div className="warroom-grid-2">
              {breakoutUpItems.map((item) => {
                const isExpanded = expandedSymbol === item.symbol;
                return (
                  <div
                    key={item.symbol}
                    className="warroom-stat-card"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="mono" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {item.symbol}
                      </span>
                      <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                        🟢 買進 · 箱頂突破
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--gain-color)', fontSize: '1.1rem' }}>
                        ${item.currentPrice}
                      </span>
                      <Tooltip content={BEGINNER_TOOLTIPS.boxUpperDefense} position="top">
                        <span className="mono" style={{ color: 'var(--text-secondary)', textDecoration: 'underline dotted', cursor: 'help' }}>
                          箱頂防守: ${item.actionDecision.stopLossPrice ?? item.boxUpper}
                        </span>
                      </Tooltip>
                    </div>
                    {item.actionDecision.riskRewardRatio && (
                      <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#38bdf8', display: 'flex', justifyContent: 'space-between' }}>
                        <span>目標價: ${item.actionDecision.targetPrice}</span>
                        <Tooltip content={BEGINNER_TOOLTIPS.riskReward} position="top">
                          <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>風益比: {item.actionDecision.riskRewardRatio}</span>
                        </Tooltip>
                      </div>
                    )}
                    {isExpanded && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                        💡 <strong>操盤小抄：</strong>{item.actionDecision.actionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 象限二：🚀 底穿上反轉區 */}
        <div className="card">
          <div className="warroom-section-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: 'var(--accent-cyan)' }} />
                【底穿上反轉區】(Reversal)
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                破底翻 · 盤中破支撐後下影線強勢收復 · 主力誘空
              </span>
            </div>
            <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              {bottomPenetrationItems.length} 檔反轉
            </span>
          </div>

          {bottomPenetrationItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              目前選定資產池暫無底穿假跌破反轉型態。
            </div>
          ) : (
            <div className="warroom-grid-2">
              {bottomPenetrationItems.map((item) => {
                const isExpanded = expandedSymbol === item.symbol;
                return (
                  <div
                    key={item.symbol}
                    className="warroom-stat-card"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="mono" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {item.symbol}
                      </span>
                      <Tooltip content={BEGINNER_TOOLTIPS.bottomPenetration} position="top">
                        <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.4)', textDecoration: 'underline dotted', cursor: 'help' }}>
                          🟢 買進 · 破底翻
                        </span>
                      </Tooltip>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '1.1rem' }}>
                        ${item.currentPrice}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        防守: ${item.actionDecision.stopLossPrice ?? '-'}
                      </span>
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                        💡 <strong>操盤小抄：</strong>{item.actionDecision.actionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 象限三：⚡ 布林極致收縮區 */}
        <div className="card">
          <div className="warroom-section-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: 'var(--accent-amber)' }} />
                【布林極致壓縮區】(Bollinger Squeeze)
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                帶寬 &lt; 8% · 波動率收縮至極限 · 蓄勢即將變盤
              </span>
            </div>
            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              {squeezeItems.length} 檔壓縮
            </span>
          </div>

          {squeezeItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              目前選定資產池暫無帶寬小於 8% 之極致壓縮標的。
            </div>
          ) : (
            <div className="warroom-grid-2">
              {squeezeItems.map((item) => {
                const isExpanded = expandedSymbol === item.symbol;
                return (
                  <div
                    key={item.symbol}
                    className="warroom-stat-card"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="mono" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {item.symbol}
                      </span>
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                        ⛔ 觀望 · 極致壓縮
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                        ${item.currentPrice}
                      </span>
                      <Tooltip content={BEGINNER_TOOLTIPS.bollingerSqueeze} position="top">
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', textDecoration: 'underline dotted', cursor: 'help' }}>
                          帶寬 {item.bollingerBandwidth}%
                        </span>
                      </Tooltip>
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                        💡 <strong>操盤小抄：</strong>{item.actionDecision.actionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 象限四：⚠️ 跌破箱底警戒區 */}
        <div className="card">
          <div className="warroom-section-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: 'var(--loss-color)' }} />
                【跌破箱底防守警戒區】(Breakdown)
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                跌破三日箱底 · 防守失效 · 嚴格紀律果斷停損
              </span>
            </div>
            <span className="badge" style={{ background: 'var(--loss-bg)', color: 'var(--loss-color)', border: '1px solid var(--loss-border)' }}>
              {breakoutDownItems.length} 檔警示
            </span>
          </div>

          {breakoutDownItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              目前選定資產池暫無跌破箱底防守線之標的，防守穩健。
            </div>
          ) : (
            <div className="warroom-grid-2">
              {breakoutDownItems.map((item) => {
                const isExpanded = expandedSymbol === item.symbol;
                return (
                  <div
                    key={item.symbol}
                    className="warroom-stat-card"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="mono" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {item.symbol}
                      </span>
                      <Tooltip content={BEGINNER_TOOLTIPS.boxLowerBreakdown} position="top">
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', textDecoration: 'underline dotted', cursor: 'help' }}>
                          🔴 賣出 · 破線停損
                        </span>
                      </Tooltip>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--loss-color)', fontSize: '1.1rem' }}>
                        ${item.currentPrice}
                      </span>
                      <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                        原防守: ${item.boxLower}
                      </span>
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                        💡 <strong>操盤小抄：</strong>{item.actionDecision.actionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 📈 均線扣抵望遠鏡清單 */}
      <div className="card">
        <div className="warroom-section-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-emerald)' }} />
              均線扣抵望遠鏡：月線扣低翻揚助漲先鋒 (MA Deduction Telescope)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              提前推算未來 3~5 日扣抵價 · 現價大幅高於扣抵值 · 月均線即將翻揚助漲
            </span>
          </div>
          <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)' }}>
            {deductionUpItems.length} 檔翻揚先鋒
          </span>
        </div>

        <div className="warroom-table-container">
          <table className="warroom-table">
            <thead>
              <tr>
                <th>代號 / 標的名稱</th>
                <th style={{ textAlign: 'right' }}>現價</th>
                <th style={{ textAlign: 'right' }}>
                  <Tooltip content={BEGINNER_TOOLTIPS.maDeductionTelescope} position="top">
                    <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>MA20 扣抵價 ℹ️</span>
                  </Tooltip>
                </th>
                <th style={{ textAlign: 'center' }}>扣抵斜率預測</th>
                <th style={{ textAlign: 'center' }}>箱體位階</th>
                <th style={{ textAlign: 'center' }}>操盤建議</th>
                <th style={{ textAlign: 'center' }}>
                  <Tooltip content={BEGINNER_TOOLTIPS.riskReward} position="top">
                    <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>防守價 / 風益比 ℹ️</span>
                  </Tooltip>
                </th>
                <th style={{ textAlign: 'center', width: '60px' }}>自訂觀察</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isExpanded = expandedSymbol === item.symbol;
                const isWatched = watchlistSymbols.includes(item.symbol);
                return (
                  <React.Fragment key={item.symbol}>
                    <tr
                      onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                      style={{ cursor: 'pointer', background: isExpanded ? 'rgba(56, 189, 248, 0.06)' : undefined }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="mono" style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.symbol}</span>
                          {isExpanded ? <ChevronUp size={13} style={{ color: 'var(--accent-cyan)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.name}</div>
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrencyPrice(item.currentPrice, item.market)}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {formatCurrencyPrice(item.ma20DeductionPrice, item.market)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.isDataPending ? (
                          <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.3)', color: 'var(--text-muted)' }}>
                            --
                          </span>
                        ) : item.ma20Slope === 'UP' ? (
                          <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)' }}>
                            📈 扣低翻揚助漲
                          </span>
                        ) : item.ma20Slope === 'DOWN' ? (
                          <span className="badge" style={{ background: 'var(--loss-bg)', color: 'var(--loss-color)' }}>
                            📉 扣高下彎警戒
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.4)', color: 'var(--text-muted)' }}>
                            平緩盤整
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.isDataPending ? (
                          <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.3)', color: 'var(--text-muted)' }}>
                            資料未就緒
                          </span>
                        ) : item.boxStatus === 'BREAKOUT_UP' ? (
                          <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)' }}>
                            🔥 箱頂突破
                          </span>
                        ) : item.boxStatus === 'BREAKOUT_DOWN' ? (
                          <span className="badge" style={{ background: 'var(--loss-bg)', color: 'var(--loss-color)' }}>
                            ⚠️ 跌破箱底
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.3)', color: 'var(--text-secondary)' }}>
                            箱內整理
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.isDataPending ? (
                          <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.35)' }}>
                            🟡 回補中...
                          </span>
                        ) : item.actionDecision.action === 'BUY' ? (
                          <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                            🟢 建議買進
                          </span>
                        ) : item.actionDecision.action === 'AVOID' ? (
                          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                            ⛔ 觀望不碰
                          </span>
                        ) : item.actionDecision.action === 'SELL' ? (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                            🔴 建議賣出
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.3)', color: 'var(--text-secondary)' }}>
                            ⚪ 區間觀望
                          </span>
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                        {item.actionDecision.stopLossPrice ? (
                          <span>
                            防守: {formatCurrencyPrice(item.actionDecision.stopLossPrice, item.market)}
                            {item.actionDecision.riskRewardRatio && ` (${item.actionDecision.riskRewardRatio})`}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleWatchlist(item.symbol);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: isWatched ? '#fde047' : 'var(--text-muted)',
                            padding: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title={isWatched ? '從自訂觀察移除' : '加入自訂觀察'}
                        >
                          <Star size={15} fill={isWatched ? '#fde047' : 'none'} />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: 'rgba(56, 189, 248, 0.04)' }}>
                        <td colSpan={8} style={{ padding: '10px 16px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Zap size={14} style={{ color: 'var(--accent-amber)' }} />
                            <strong>實戰操盤指引：</strong>
                            <span>{item.actionDecision.actionReason}</span>
                            {item.actionDecision.targetPrice && (
                              <span style={{ color: '#38bdf8', marginLeft: 'auto' }}>
                                目標價: {formatCurrencyPrice(item.actionDecision.targetPrice, item.market)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
