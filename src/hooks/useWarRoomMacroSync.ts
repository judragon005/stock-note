import { useState, useEffect, useCallback } from 'react';
import type { DailyCandle } from '../types/indicators';
import type { MacroIndicatorSnapshot } from '../types/macro';
import type { HoldingPosition } from '../types/stock';
import { DEFAULT_MOMENTUM_UNIVERSES } from '../engine/dualMomentumEngine';
import { ensureKeyPoolHydrated, buildMacroSyncKeyHeaders } from '../engine/smartKeyRotator';
import {
  getLatestMacroPulseRecord,
  loadMacroPulseHistory,
  saveMacroPulseRecord,
  mergeMacroSnapshot,
  MacroPulseHistoryRecord,
} from '../utils/macroPulseStorage';
import { DEFAULT_WAR_ROOM_MACRO_SNAPSHOT } from '../utils/warRoomBriefBuilder';

async function fetchMultiHorizonBreadth(): Promise<MacroIndicatorSnapshot['multiHorizonBreadth'] | undefined> {
  try {
    const bRes = await fetch('/api/market/breadth', { headers: { Accept: 'application/json' } });
    if (!bRes.ok) return undefined;
    const bJson = await bRes.json();
    const bData = bJson?.data || bJson;
    if (!bData || typeof bData !== 'object') return undefined;
    return {
      tw: bData.tw,
      us: bData.us,
      twMarginDeleveraging: bData.twMarginDeleveraging,
    };
  } catch {
    return undefined;
  }
}

export function useWarRoomMacroSync(params: {
  usdToTwdRate: number;
  selectedUniverseId: string;
  holdings: HoldingPosition[];
  historicalDailyPrices: Record<string, Record<string, number>>;
}) {
  const { usdToTwdRate, selectedUniverseId, holdings, historicalDailyPrices } = params;

  const [macroSnapshot, setMacroSnapshot] = useState<MacroIndicatorSnapshot>(() => {
    const latest = getLatestMacroPulseRecord();
    if (latest) {
      return {
        ...DEFAULT_WAR_ROOM_MACRO_SNAPSHOT,
        ...latest,
        goldPrice: latest.goldPrice && latest.goldPrice > 500 ? latest.goldPrice : 3350.0,
        usdToTwd: usdToTwdRate > 0 ? usdToTwdRate : latest.usdToTwd || 32.15,
      };
    }
    return {
      ...DEFAULT_WAR_ROOM_MACRO_SNAPSHOT,
      usdToTwd: usdToTwdRate > 0 ? usdToTwdRate : DEFAULT_WAR_ROOM_MACRO_SNAPSHOT.usdToTwd,
    };
  });

  const [macroHistoryList, setMacroHistoryList] = useState<MacroPulseHistoryRecord[]>(() =>
    loadMacroPulseHistory()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lakehouseCandlesMap, setLakehouseCandlesMap] = useState<Record<string, DailyCandle[]>>({});

  const syncMacroPulseFromBackend = useCallback(
    async (forceRefresh: boolean) => {
      if (typeof fetch !== 'function') return;
      setIsRefreshing(true);
      try {
        await ensureKeyPoolHydrated();
        const keyHeaders = buildMacroSyncKeyHeaders();
        const endpoint = forceRefresh ? '/api/market/macro?refresh=1' : '/api/market/macro';
        const [res, breadthData] = await Promise.all([
          fetch(endpoint, { headers: { Accept: 'application/json', ...keyHeaders } }),
          fetchMultiHorizonBreadth(),
        ]);
        if (res.ok) {
          const payload = await res.json();
          const remote = payload?.data || payload?.snapshot;
          if (remote && typeof remote === 'object') {
            const sanitizedRemote = mergeMacroSnapshot(macroSnapshot, remote);
            const merged: MacroIndicatorSnapshot = {
              ...sanitizedRemote,
              multiHorizonBreadth: breadthData ?? sanitizedRemote.multiHorizonBreadth,
              date: sanitizedRemote.date || new Date().toISOString().split('T')[0],
              usdToTwd: sanitizedRemote.usdToTwd || (usdToTwdRate > 0 ? usdToTwdRate : macroSnapshot.usdToTwd),
              sourceStatus: remote.sourceStatus || 'LIVE',
              asOfTimestamp: remote.asOfTimestamp || new Date().toISOString(),
              updatedAt: Date.now(),
            };
            saveMacroPulseRecord(merged, true);
            setMacroSnapshot(merged);
            setMacroHistoryList(loadMacroPulseHistory());
          }
        }
      } catch {
        // 離線維持本地快取
      } finally {
        setIsRefreshing(false);
      }
    },
    [macroSnapshot, usdToTwdRate]
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      await ensureKeyPoolHydrated();
      if (!active || typeof fetch !== 'function') return;
      try {
        const keyHeaders = buildMacroSyncKeyHeaders();
        const [res, breadthData] = await Promise.all([
          fetch('/api/market/macro', { headers: { Accept: 'application/json', ...keyHeaders } }),
          fetchMultiHorizonBreadth(),
        ]);
        if (active && res.ok) {
          const payload = await res.json();
          const remote = payload?.data || payload?.snapshot;
          if (remote && typeof remote === 'object') {
            setMacroSnapshot((prev) => {
              const merged: MacroIndicatorSnapshot = {
                ...mergeMacroSnapshot(prev, remote),
                multiHorizonBreadth: breadthData ?? prev.multiHorizonBreadth,
                sourceStatus: remote.sourceStatus || 'LIVE',
                updatedAt: Date.now(),
              };
              saveMacroPulseRecord(merged, true);
              return merged;
            });
            setMacroHistoryList(loadMacroPulseHistory());
          }
        }
      } catch {
        // ignore offline
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (typeof fetch !== 'function') return;
    const u =
      DEFAULT_MOMENTUM_UNIVERSES.find((item) => item.id === selectedUniverseId) ||
      DEFAULT_MOMENTUM_UNIVERSES[0];
    const targetSymbols = Array.from(
      new Set([
        ...u.symbols.map((s) => s.symbol),
        ...holdings.filter((h) => h.shares > 0).map((h) => h.symbol),
      ])
    );

    void (async () => {
      const nextMap: Record<string, DailyCandle[]> = {};
      for (const sym of targetSymbols) {
        const existingDates = historicalDailyPrices[sym]
          ? Object.keys(historicalDailyPrices[sym]).length
          : 0;
        if (existingDates >= 65 || lakehouseCandlesMap[sym]?.length) continue;
        try {
          const res = await fetch(`/api/market/history/${encodeURIComponent(sym)}?limit=260`);
          if (res.ok) {
            const data = await res.json();
            const list = data?.candles || data?.data;
            if (Array.isArray(list) && list.length >= 5) {
              nextMap[sym] = list.map((c: Record<string, unknown>) => ({
                date: String(c.date || ''),
                open: Number(c.open || c.close || 0),
                high: Number(c.high || c.close || 0),
                low: Number(c.low || c.close || 0),
                close: Number(c.close || 0),
                volume: Number(c.volume || 0),
              }));
            }
          }
        } catch {
          // ignore offline
        }
      }
      if (active && Object.keys(nextMap).length > 0) {
        setLakehouseCandlesMap((prev) => ({ ...prev, ...nextMap }));
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedUniverseId, holdings, historicalDailyPrices]);

  const applyCalibratedSnapshot = useCallback((updated: MacroIndicatorSnapshot) => {
    saveMacroPulseRecord(updated, true);
    setMacroSnapshot(updated);
    setMacroHistoryList(loadMacroPulseHistory());
  }, []);

  return {
    macroSnapshot,
    macroHistoryList,
    isRefreshing,
    lakehouseCandlesMap,
    syncMacroPulseFromBackend,
    applyCalibratedSnapshot,
  };
}
