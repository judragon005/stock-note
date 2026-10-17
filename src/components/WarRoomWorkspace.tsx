import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Copy,
  Check,
  Activity,
  Flame,
  Zap,
  Download,
  RefreshCw,
  History,
  Plus,
  Trash2,
  X,
  Thermometer,
  Layers,
  Globe2,
  AlertTriangle,
} from 'lucide-react';

import { HoldingPosition, LoanRecord } from '../types/stock';
import {
  MacroIndicatorSnapshot,
  UpcomingCatalyst,
  CatalystCategory,
  CatalystImpact,
  MarketViewTab,
  TimelineHorizon,
} from '../types/macro';
import {
  calculatePortfolioMacroShield,
  generateAiMorningBrief,
  calculateMacroThermometer,
  groupCatalystsByTimeline,
  generateMonthlyRevenueDeadlineCatalyst,
} from '../engine/macroAdvisorEngine';
import {
  evaluateDualMomentum,
  DEFAULT_MOMENTUM_UNIVERSES,
} from '../engine/dualMomentumEngine';
import { DailyCandle } from '../types/indicators';
import { ReceivableDividend } from '../types/dividend';
import { scanMuscleBookerItem } from '../engine/muscleBookerEngine';
import { MacroHoldingSignalInput, UpcomingDividendInput } from '../types/macro';
import {
  loadMacroPulseHistory,
  saveMacroPulseRecord,
  getLatestMacroPulseRecord,
  exportMacroPulseHistoryAsCsv,
  generateSampleHistoricalMacroData,
  isSameDayCacheValid,
  MacroPulseHistoryRecord,
} from '../utils/macroPulseStorage';
import { copyTextToClipboard } from '../utils/clipboard';

import {
  getAggregatedCatalysts,
  saveCustomCatalyst,
  deleteCustomCatalyst,
  resetCatalystsToDefault,
} from '../utils/catalystStorage';
import { syncExternalCatalystsAsync } from '../engine/catalystSyncService';


interface WarRoomWorkspaceProps {
  holdings: HoldingPosition[];
  loans: LoanRecord[];
  cashBalanceTwd: number;
  totalNavTwd: number;
  usdToTwdRate: number;
  historicalDailyPrices?: Record<string, Record<string, number>>;
  receivableDividends?: ReceivableDividend[];
  onOpenMarginStressModal: () => void;
}

// 預設/基底宏觀數據
const DEFAULT_MACRO_SNAPSHOT: MacroIndicatorSnapshot = {
  date: new Date().toISOString().split('T')[0],
  us10y: 3.85,
  us2y: 3.98,
  yieldSpread: -0.13,
  isYieldInverted: true,
  vix: 19.4,
  vixLevel: 'NORMAL',
  fearAndGreedIndex: 48,
  fearAndGreedLevel: 'NEUTRAL',
  goldPrice: 2515.2,
  oilPrice: 73.8,
  dxy: 101.4,
  usdToTwd: 32.15,
  usM2GrowthYoY: 2.3,
  twM2GrowthYoY: 5.6,
  creditSpreadOAS: 3.5,
  cdsInsuranceIndex: 65,
  cdsRiskLevel: 'LOW',
  twFuturesNetOi: -15000,
  twMarginMaintenance: 165.2,
  twFuturesRiskLevel: 'NEUTRAL',
  twMarginRiskLevel: 'SAFE',
  updatedAt: Date.now(),
};





export const WarRoomWorkspace: React.FC<WarRoomWorkspaceProps> = ({
  holdings,
  loans,
  cashBalanceTwd,
  totalNavTwd,
  usdToTwdRate,
  historicalDailyPrices = {},
  receivableDividends = [],
  onOpenMarginStressModal,
}) => {
  const [copiedLlm, setCopiedLlm] = useState(false);
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>('global_macro');

  // 市場四柱在地持久化狀態
  const [macroSnapshot, setMacroSnapshot] = useState<MacroIndicatorSnapshot>(() => {
    generateSampleHistoricalMacroData();
    const latest = getLatestMacroPulseRecord();
    return latest || DEFAULT_MACRO_SNAPSHOT;
  });
  const [showHistoryTable, setShowHistoryTable] = useState(false);
  const [macroHistoryList, setMacroHistoryList] = useState<MacroPulseHistoryRecord[]>(() => loadMacroPulseHistory());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleExportCsv = () => {
    const csv = exportMacroPulseHistoryAsCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `macro_pulse_history_${macroSnapshot.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefreshPulse = () => {
    setIsRefreshing(true);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const isCachedToday = isSameDayCacheValid(macroSnapshot.updatedAt, Date.now());

    const updated: MacroIndicatorSnapshot = {
      ...macroSnapshot,
      date: dateStr,
      updatedAt: Date.now(),
      goldPrice: Math.round((macroSnapshot.goldPrice + (isCachedToday ? 0.2 : (Math.random() - 0.5) * 4)) * 10) / 10,
      oilPrice: Math.round((macroSnapshot.oilPrice + (isCachedToday ? 0.1 : (Math.random() - 0.5) * 0.8)) * 10) / 10,
      vix: Math.round((macroSnapshot.vix + (isCachedToday ? 0 : (Math.random() - 0.5) * 0.4)) * 10) / 10,
    };
    saveMacroPulseRecord(updated, true);
    setMacroSnapshot(updated);
    setMacroHistoryList(loadMacroPulseHistory());
    setTimeout(() => setIsRefreshing(false), 500);
  };


  // 0. 持股技術訊號萃取 (嚴格鎖定在倉標的 shares > 0，杜絕已閉倉標的干擾晨報)
  const holdingSignals = useMemo<MacroHoldingSignalInput[]>(() => {
    return holdings
      .filter((h) => h.shares > 0)
      .map((h) => {
      const localDailyMap = historicalDailyPrices[h.symbol];
      let candles: DailyCandle[] | undefined = undefined;
      if (localDailyMap && Object.keys(localDailyMap).length >= 5) {
        const sortedDates = Object.keys(localDailyMap).sort();
        candles = sortedDates.slice(-30).map((d) => {
          const c = localDailyMap[d];
          return { date: d, open: c, high: c * 1.01, low: c * 0.99, close: c, volume: 10000 };
        });
      }
      const scanned = scanMuscleBookerItem(
        h.symbol,
        h.name,
        h.market,
        h.currentPrice || 100,
        candles
      );
      return {
        symbol: h.symbol,
        name: h.name,
        action: scanned.actionDecision.action,
        stopLossPrice: scanned.actionDecision.stopLossPrice,
        targetPrice: scanned.actionDecision.targetPrice,
      };
    });
  }, [holdings, historicalDailyPrices]);

  // 0.1 待收股息進度轉換
  const upcomingDividends = useMemo<UpcomingDividendInput[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTime = new Date(`${today}T00:00:00`).getTime();
    return receivableDividends
      .map((r) => {
        const payTime = new Date(`${r.payDate}T00:00:00`).getTime();
        const diffDays = Math.round((payTime - todayTime) / (1000 * 60 * 60 * 24));
        return {
          symbol: r.symbol,
          amount: r.estimatedNetDividendInTWD || r.estimatedGrossDividend || 0,
          payDate: r.payDate,
          daysLeft: diffDays,
        };
      })
      .filter((d) => d.daysLeft >= 0);
  }, [receivableDividends]);

  // 1. 計算個人防護盾
  const shield = useMemo(() => {
    let totalDebt = 0;
    let totalCollateral = 0;
    const pledgedLoans = loans.filter((l) => l.principal > 0 && l.loanType === 'PLEDGE');
    for (const l of pledgedLoans) {
      const debtTwd = l.currency === 'USD' ? l.principal * usdToTwdRate : l.principal;
      totalDebt += debtTwd;
      if (l.pledgedCollateral) {
        for (const col of l.pledgedCollateral) {
          const h = holdings.find((item) => item.symbol === col.symbol);
          if (h) {
            const fx = h.currency === 'USD' ? usdToTwdRate : 1;
            totalCollateral += col.shares * (h.currentPrice || 0) * fx;
          }
        }
      }
    }

    const usStockUSD = holdings
      .filter((h) => h.market === 'US' || h.currency === 'USD')
      .reduce((acc, h) => acc + (h.currentPrice || h.avgCost || 0) * (h.shares || 0), 0);


    return calculatePortfolioMacroShield({
      navTWD: totalNavTwd,
      cashTWD: cashBalanceTwd,
      totalLoanDebtTWD: totalDebt,
      collateralValueTWD: totalCollateral,
      maxDriftPercent: 2.8,
      usStockValueUSD: usStockUSD,
    });
  }, [holdings, loans, cashBalanceTwd, totalNavTwd, usdToTwdRate]);

  // --- 0193 旗艦戰情室 2.0 狀態 ---
  const [marketView, setMarketView] = useState<MarketViewTab>('GLOBAL');
  const [activeStressDrop, setActiveStressDrop] = useState<-10 | -20 | -30>(-10);
  const [timelineHorizon, setTimelineHorizon] = useState<TimelineHorizon | 'ALL'>('ALL');
  const [copiedBrief, setCopiedBrief] = useState(false);

  // 宏觀水溫計試算 (0~100 分與三秒作戰姿態)
  const macroThermometer = useMemo(() => {
    return calculateMacroThermometer(macroSnapshot);
  }, [macroSnapshot]);

  // 催化劑日曆狀態管理
  const [catalystFilter, setCatalystFilter] = useState<string>('ALL');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [remoteCatalysts, setRemoteCatalysts] = useState<Omit<UpcomingCatalyst, 'daysLeft'>[]>([]);
  const [catalystRefreshKey, setCatalystRefreshKey] = useState(0);

  // 新增自訂事件表單狀態
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomDate, setNewCustomDate] = useState(macroSnapshot.date);
  const [newCustomCategory, setNewCustomCategory] = useState<CatalystCategory>('CUSTOM');
  const [newCustomImpact, setNewCustomImpact] = useState<CatalystImpact>('MEDIUM');
  const [newCustomDesc, setNewCustomDesc] = useState('');


  // 背景自動嘗試同步外部免費端點
  useEffect(() => {
    let isMounted = true;
    syncExternalCatalystsAsync().then((list) => {
      if (isMounted && list.length > 0) {
        setRemoteCatalysts(list);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveCustomCatalyst = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomName.trim() || !newCustomDate) return;
    saveCustomCatalyst({
      name: newCustomName.trim(),
      date: newCustomDate,
      category: newCustomCategory,
      impact: newCustomImpact,
      description: newCustomDesc.trim() || '使用者自訂重要財經日程。',
    });
    setNewCustomName('');
    setNewCustomDesc('');
    setIsCustomModalOpen(false);
    setCatalystRefreshKey((k) => k + 1);
  };

  const handleDeleteCustomCatalyst = (id: string) => {
    deleteCustomCatalyst(id);
    setCatalystRefreshKey((k) => k + 1);
  };

  const handleResetCatalysts = () => {
    if (window.confirm('確定要清除所有自訂催化劑事件並恢復官方預設日曆嗎？')) {
      resetCatalystsToDefault();
      setRemoteCatalysts([]);
      setCatalystRefreshKey((k) => k + 1);
    }
  };

  // 2. 財經事件倒數 (四階梯多源聚合 + 每月 10 號營收截止倒數)
  const catalysts = useMemo(() => {
    const list = getAggregatedCatalysts({
      asOfDate: macroSnapshot.date,
      receivableDividends,
      remoteCatalysts,
    });
    // 自動注入每月 10 號營收截止倒數催化劑
    const revenueDeadlineEvent = generateMonthlyRevenueDeadlineCatalyst(macroSnapshot.date);
    if (!list.some((c) => c.id === revenueDeadlineEvent.id)) {
      list.push(revenueDeadlineEvent);
      list.sort((a, b) => a.daysLeft - b.daysLeft);
    }
    return list;
  }, [macroSnapshot.date, receivableDividends, remoteCatalysts, catalystRefreshKey]);

  // 三段時序分組 (用於徽章計數與統計)
  const groupedCatalysts = useMemo(() => {
    return groupCatalystsByTimeline(catalysts);
  }, [catalysts]);

  // 分類、市場視角與時序雷達多維度篩選
  const filteredCatalysts = useMemo(() => {
    let result = catalysts;
    // 依市場視角過濾
    if (marketView === 'TW') {
      result = result.filter((c) => c.targetMarket === 'TW' || c.targetMarket === 'ALL' || !c.targetMarket);
    } else if (marketView === 'US') {
      result = result.filter((c) => c.targetMarket === 'US' || c.targetMarket === 'ALL' || !c.targetMarket);
    }

    // 依類別過濾
    if (catalystFilter === 'INFLATION_EMPLOYMENT') {
      result = result.filter((c) => c.category === 'INFLATION' || c.category === 'EMPLOYMENT');
    } else if (catalystFilter !== 'ALL') {
      result = result.filter((c) => c.category === catalystFilter);
    }

    // 依時序雷達過濾 (今日/7日/30日)
    if (timelineHorizon === 'TODAY') {
      result = result.filter((c) => c.daysLeft === 0);
    } else if (timelineHorizon === 'WEEK') {
      result = result.filter((c) => c.daysLeft >= 1 && c.daysLeft <= 7);
    } else if (timelineHorizon === 'MONTH') {
      result = result.filter((c) => c.daysLeft >= 8 && c.daysLeft <= 30);
    }

    return result;
  }, [catalysts, catalystFilter, marketView, timelineHorizon]);


  // 3. 生成 AI 作戰方針 (依據本地持久化宏觀數據 + 個人防護盾 + 持股動態 + 股息入帳全量診斷)
  const morningBrief = useMemo(() => {
    return generateAiMorningBrief({
      macro: macroSnapshot,
      shield,
      catalysts,
      holdingSignals,
      upcomingDividends,
    });
  }, [macroSnapshot, shield, catalysts, holdingSignals, upcomingDividends]);


  // 4. 雙重動能輪動信號
  const selectedUniverse = useMemo(() => {
    return (
      DEFAULT_MOMENTUM_UNIVERSES.find((u) => u.id === selectedUniverseId) ||
      DEFAULT_MOMENTUM_UNIVERSES[0]
    );
  }, [selectedUniverseId]);

  const momentumSignal = useMemo(() => {
    const quotesMap: Record<string, DailyCandle[]> = {};
    if (historicalDailyPrices && Object.keys(historicalDailyPrices).length > 0) {
      for (const [sym, dateMap] of Object.entries(historicalDailyPrices)) {
        if (!dateMap) continue;
        const sortedDates = Object.keys(dateMap).sort();
        quotesMap[sym] = sortedDates.map((d) => ({
          date: d,
          open: dateMap[d],
          high: dateMap[d],
          low: dateMap[d],
          close: dateMap[d],
          volume: 10000,
        }));
      }
    }
    return evaluateDualMomentum({
      universeConfig: selectedUniverse,
      quotesMap,
      riskFreeRateAnnualized: 0.04,
    });
  }, [selectedUniverse, historicalDailyPrices]);


  // 5. 距當月底倒數天數 (雙動能月結調倉檢視日)
  const daysUntilMonthEnd = useMemo(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(0, lastDayOfMonth - now.getDate());
  }, []);

  // 6. 檢查在庫標的是否與當前資產池有交集
  const currentUniverseSymbols = useMemo(() => {
    const u = DEFAULT_MOMENTUM_UNIVERSES.find((item) => item.id === selectedUniverseId);
    return new Set(u?.symbols.map((s) => s.symbol) || []);
  }, [selectedUniverseId]);

  const holdingMatchingAsset = useMemo(() => {
    return holdings.find((h) => currentUniverseSymbols.has(h.symbol) || currentUniverseSymbols.has(`${h.symbol}.TW`));
  }, [holdings, currentUniverseSymbols]);


  const handleCopyLlmJson = async () => {
    const ok = await copyTextToClipboard(morningBrief.llmPayloadJson);
    if (ok) {
      setCopiedLlm(true);
      setTimeout(() => setCopiedLlm(false), 2000);
    }
  };

  const handleCopyMorningBriefReport = async () => {
    const stanceLabel =
      macroThermometer.stance === 'AGGRESSIVE'
        ? '進攻・積極擴張'
        : macroThermometer.stance === 'DEFENSIVE'
        ? '防禦・現金為王'
        : '平衡・區間操作';

    const report = [
      `# 🏦 宏觀戰情室每日晨會簡報 (${macroSnapshot.date})`,
      `> 作戰定調：${morningBrief.headline} (${morningBrief.tone})`,
      '',
      `## 🌡️ 宏觀水溫計：${macroThermometer.score} 分【${stanceLabel}】`,
      `- 建議股票總倉位上限：${macroThermometer.suggestedEquityAllocationPercent}%`,
      `- 決策推論：${macroThermometer.rationale.join('；')}`,
      '',
      `## 🛡️ 個人在險與風控 (1-Day 95% VaR)`,
      `- 帳戶總淨值：NT$ ${Math.round(shield.totalNavTWD).toLocaleString()}`,
      `- 單日 95% 最大在險價值 (VaR)：NT$ ${(shield.valueAtRisk95TWD || 0).toLocaleString()} (佔總淨值 ${shield.varRatioPercent || 0}%)`,
      `- 美股匯率敏感度 (FX Delta)：NT$ ${(shield.fxDeltaTWD || 0).toLocaleString()} / 每升值 1 元`,
      `- 質押維持率：${shield.hasLoans ? `${shield.marginMaintenanceRatio}% (${shield.marginStatus})` : '零負債安全'}`,
      '',
      `## 🎯 今日執行要點`,
      ...morningBrief.actionPoints.map((p, idx) => `${idx + 1}. ${p}`),
      '',
      `## 🌐 台美關鍵金絲雀`,
      `- 美債 10Y/2Y：${macroSnapshot.us10y}% / ${macroSnapshot.us2y}% (利差 ${macroSnapshot.yieldSpread}% ${macroSnapshot.isYieldInverted ? '倒掛' : '正常'})`,
      `- VIX 恐慌指數：${macroSnapshot.vix} (${macroSnapshot.vixLevel})`,
      `- 高收益債利差 (OAS)：${macroSnapshot.creditSpreadOAS ?? 3.5}% | CDS 指數：${macroSnapshot.cdsInsuranceIndex ?? 65} (${macroSnapshot.cdsRiskLevel ?? 'LOW'})`,
      `- 外資台指期未平倉：${(macroSnapshot.twFuturesNetOi ?? 0).toLocaleString()} 口 | 全市場融資維持率：${macroSnapshot.twMarginMaintenance ?? 165.2}%`,
    ].join('\n');

    const ok = await copyTextToClipboard(report);
    if (ok) {
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 2000);
    }
  };


  return (
    <div className="warroom-container animate-fade-in">
      {/* 頂部戰情室標題與狀態 */}
      <div className="card" style={{ padding: '20px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <Compass size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                法人旗艦級宏觀戰情室 2.0
              </h1>
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--gain-color)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <span className="pulse-dot-green" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                雙軌即時監控
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              台美專屬指針 × 0~100 宏觀水溫計 × 1-Day 95% 在險價值 × 3階急速壓力測試
            </p>
          </div>
        </div>

        {/* 頂部切換與操作區 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* 台美雙軌切換按鈕組 */}
          <div style={{ display: 'inline-flex', background: 'rgba(30, 41, 59, 0.8)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setMarketView('GLOBAL')}
              className={`btn btn-sm ${marketView === 'GLOBAL' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Globe2 size={13} />
              🌐 全球綜觀
            </button>
            <button
              onClick={() => setMarketView('TW')}
              className={`btn btn-sm ${marketView === 'TW' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              🇹🇼 台股視角
            </button>
            <button
              onClick={() => setMarketView('US')}
              className={`btn btn-sm ${marketView === 'US' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              🇺🇸 美股視角
            </button>
          </div>

          {/* 複製按鈕組 */}
          <button
            onClick={handleCopyMorningBriefReport}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.78rem' }}
            title="一鍵複製繁體中文晨會每日作戰報告"
          >
            {copiedBrief ? <Check size={14} /> : <Copy size={14} />}
            {copiedBrief ? '已複製晨會簡報' : '📋 複製晨會簡報'}
          </button>

          <button
            onClick={handleCopyLlmJson}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.78rem' }}
            title="複製結構化 Prompt JSON 供外部 LLM 使用"
          >
            {copiedLlm ? <Check size={14} style={{ color: 'var(--gain-color)' }} /> : <Copy size={14} />}
            {copiedLlm ? '已複製 JSON' : 'LLM Payload'}
          </button>
        </div>
      </div>

      {/* 🌡️ 宏觀水溫計與作戰姿態卡片 (Macro Thermometer) */}
      <div className="card" style={{ padding: '20px 24px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', borderRadius: 'var(--radius-md)' }}>
              <Thermometer size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  宏觀綜合水溫計 (Macro Thermometer)
                </span>
                <span
                  className="badge"
                  style={{
                    fontWeight: 800,
                    padding: '3px 8px',
                    fontSize: '0.78rem',
                    background:
                      macroThermometer.stance === 'AGGRESSIVE'
                        ? 'rgba(34, 197, 94, 0.2)'
                        : macroThermometer.stance === 'DEFENSIVE'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(245, 158, 11, 0.2)',
                    color:
                      macroThermometer.stance === 'AGGRESSIVE'
                        ? '#4ade80'
                        : macroThermometer.stance === 'DEFENSIVE'
                        ? '#f87171'
                        : '#fbbf24',
                    border: `1px solid ${
                      macroThermometer.stance === 'AGGRESSIVE'
                        ? 'rgba(34, 197, 94, 0.4)'
                        : macroThermometer.stance === 'DEFENSIVE'
                        ? 'rgba(239, 68, 68, 0.4)'
                        : 'rgba(245, 158, 11, 0.4)'
                    }`,
                  }}
                >
                  {macroThermometer.stance === 'AGGRESSIVE'
                    ? '【進攻・積極擴張】'
                    : macroThermometer.stance === 'DEFENSIVE'
                    ? '【防禦・現金為王】'
                    : '【平衡・區間操作】'}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                基於長短債利差、恐慌情緒、高收益信用利差、外資期貨空單與融資維持率綜合量化合成
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>水溫得分</div>
              <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: macroThermometer.score >= 70 ? '#4ade80' : macroThermometer.score <= 40 ? '#f87171' : '#fbbf24', lineHeight: 1 }}>
                {macroThermometer.score} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>

            <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: '18px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>建議股票總倉位上限</div>
              <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1 }}>
                {macroThermometer.suggestedEquityAllocationPercent}%
              </div>
            </div>
          </div>
        </div>

        {/* 水溫條進度 */}
        <div style={{ width: '100%', height: '8px', background: 'rgba(30, 41, 59, 0.8)', borderRadius: '999px', overflow: 'hidden', marginBottom: '12px' }}>
          <div
            style={{
              width: `${macroThermometer.score}%`,
              height: '100%',
              background:
                macroThermometer.score >= 70
                  ? 'linear-gradient(90deg, #10b981 0%, #22c55e 100%)'
                  : macroThermometer.score <= 40
                  ? 'linear-gradient(90deg, #ef4444 0%, #f97316 100%)'
                  : 'linear-gradient(90deg, #eab308 0%, #f59e0b 100%)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* 推論清單 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {macroThermometer.rationale.map((r, idx) => (
            <span
              key={idx}
              className="badge"
              style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(30, 41, 59, 0.6)', color: 'var(--text-secondary)', border: '1px solid rgba(51, 65, 85, 0.5)' }}
            >
              • {r}
            </span>
          ))}
        </div>
      </div>


      {/* 🤖 AI 智慧每日作戰方針 (AI Morning Brief) */}
      <div className="warroom-hero-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge" style={{ background: 'var(--accent-amber)', color: '#0f172a', fontWeight: 800, padding: '4px 10px' }}>
              <Zap size={14} />
              AI 晨報作戰方針
            </span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fef08a' }}>
              {morningBrief.headline}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopyMorningBriefReport}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: copiedBrief ? 'rgba(34, 197, 94, 0.2)' : 'rgba(30, 41, 59, 0.7)',
                borderColor: copiedBrief ? 'var(--accent-green)' : 'rgba(51, 65, 85, 0.6)',
                color: copiedBrief ? '#4ade80' : 'var(--text-primary)',
                transition: 'all 0.2s ease',
              }}
              title="一鍵複製 Markdown 格式繁體中文晨會作戰簡報"
            >
              {copiedBrief ? <Check size={14} /> : <Copy size={14} />}
              {copiedBrief ? '已複製簡報！' : '📋 複製晨會簡報'}
            </button>
            <button
              type="button"
              onClick={handleCopyLlmJson}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: copiedLlm ? 'rgba(34, 197, 94, 0.2)' : 'rgba(30, 41, 59, 0.7)',
                borderColor: copiedLlm ? 'var(--accent-green)' : 'rgba(51, 65, 85, 0.6)',
                color: copiedLlm ? '#4ade80' : 'var(--text-primary)',
                transition: 'all 0.2s ease',
              }}
              title="複製結構化 Prompt Payload 供外部 LLM 使用"
            >
              {copiedLlm ? <Check size={14} /> : <Zap size={14} />}
              {copiedLlm ? '已複製 Payload！' : '🤖 LLM 提示詞'}
            </button>
            <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              基準日：{DEFAULT_MACRO_SNAPSHOT.date}
            </span>
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: '18px', lineHeight: 1.6, fontSize: '0.92rem' }}>
          💡 <strong style={{ color: '#ffffff' }}>核心方針：</strong>
          {morningBrief.summary}
        </div>

        <div className="warroom-grid-2" style={{ marginBottom: '18px' }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} />
              宏觀環境診斷
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {morningBrief.macroDiagnosis}
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} />
              個人防護盾體質診斷
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {morningBrief.shieldDiagnosis}
            </p>
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            📋 今日客觀紀律執行清單 (個人化多因子事件驅動)：
          </h4>
          <div className="warroom-grid-3">
            {morningBrief.actionPoints.map((point, idx) => {
              const isSell = point.includes('破線停損') || point.includes('停損');
              const isBuy = point.includes('動能突破') || point.includes('突破');
              const isCatalyst = point.includes('催化劑倒數');
              const isDividend = point.includes('股息活水');

              let borderColor = 'rgba(51, 65, 85, 0.4)';
              let bg = 'rgba(15, 23, 42, 0.6)';
              let badgeBg = 'rgba(245, 158, 11, 0.2)';
              let badgeColor = 'var(--accent-amber)';

              if (isSell) {
                borderColor = 'rgba(239, 68, 68, 0.45)';
                bg = 'rgba(239, 68, 68, 0.08)';
                badgeBg = 'rgba(239, 68, 68, 0.25)';
                badgeColor = '#f87171';
              } else if (isBuy) {
                borderColor = 'rgba(34, 197, 94, 0.45)';
                bg = 'rgba(34, 197, 94, 0.08)';
                badgeBg = 'rgba(34, 197, 94, 0.25)';
                badgeColor = '#4ade80';
              } else if (isCatalyst) {
                borderColor = 'rgba(6, 182, 212, 0.45)';
                bg = 'rgba(6, 182, 212, 0.08)';
                badgeBg = 'rgba(6, 182, 212, 0.25)';
                badgeColor = '#38bdf8';
              } else if (isDividend) {
                borderColor = 'rgba(245, 158, 11, 0.45)';
                bg = 'rgba(245, 158, 11, 0.08)';
                badgeBg = 'rgba(245, 158, 11, 0.25)';
                badgeColor = '#fbbf24';
              }

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: bg,
                    border: `1px solid ${borderColor}`,
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      width: '20px',
                      height: '20px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: badgeBg,
                      color: badgeColor,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ color: isSell ? '#fecaca' : isBuy ? '#dcfce7' : undefined }}>{point}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🛡️ 個人在險價值與 3 階急速黑天鵝壓力測試 (VaR & Stress Testing - Ticket 10) */}
      <div className="card" style={{ padding: '20px 24px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderRadius: 'var(--radius-md)' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                個人在險價值 (1-Day 95% VaR) 與急速壓力測試
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                機構級風控模型：年化 18% 波動度在險損失推估與台幣升貶敏感度
              </span>
            </div>
          </div>

          {/* 3 階壓力切換按鈕 */}
          <div style={{ display: 'inline-flex', background: 'rgba(30, 41, 59, 0.8)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveStressDrop(-10)}
              className={`btn btn-sm ${activeStressDrop === -10 ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
            >
              -10% 震盪
            </button>
            <button
              onClick={() => setActiveStressDrop(-20)}
              className={`btn btn-sm ${activeStressDrop === -20 ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
            >
              -20% 回檔
            </button>
            <button
              onClick={() => setActiveStressDrop(-30)}
              className={`btn btn-sm ${activeStressDrop === -30 ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
            >
              -30% 崩盤
            </button>
          </div>
        </div>

        {/* 核心風控指標網格 */}
        <div className="warroom-grid-3" style={{ marginBottom: '16px' }}>
          {/* 1-Day 95% VaR */}
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              單日 95% 在險價值 (1-Day 95% VaR)
            </div>
            <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f87171' }}>
              NT$ {(shield.valueAtRisk95TWD || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              佔整戶總淨值約 <span className="mono" style={{ color: 'var(--text-primary)' }}>{shield.varRatioPercent || 0}%</span> (95% 信心水準下單日最大損失)
            </div>
          </div>

          {/* 美股匯率敏感度 (FX Delta) */}
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              美股部位匯率敏感度 (FX Delta)
            </div>
            <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8' }}>
              ± NT$ {(shield.fxDeltaTWD || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              台幣每升值 1 元，美股持倉實質匯損金額
            </div>
          </div>

          {/* 質押維持率現況 */}
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              質押借款現況與維持率
            </div>
            <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: shield.hasLoans ? (shield.marginMaintenanceRatio < 130 ? '#ef4444' : shield.marginMaintenanceRatio < 166 ? '#f59e0b' : '#22c55e') : '#22c55e' }}>
              {shield.hasLoans ? `${shield.marginMaintenanceRatio}%` : '無負債借款'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              狀態：
              <span
                style={{
                  fontWeight: 700,
                  color:
                    shield.marginStatus === 'SAFE' || shield.marginStatus === 'NO_LOAN'
                      ? '#4ade80'
                      : shield.marginStatus === 'WARNING'
                      ? '#fbbf24'
                      : '#f87171',
                }}
              >
                {shield.marginStatus === 'SAFE'
                  ? '安全無虞 (>=166%)'
                  : shield.marginStatus === 'NO_LOAN'
                  ? '整戶零負債・安全無虞'
                  : shield.marginStatus === 'WARNING'
                  ? '警戒水位 (130%~166%)'
                  : '追繳斷頭紅線 (<130%)'}
              </span>
            </div>
          </div>
        </div>

        {/* 壓力測試情境預估結果展示 */}
        {(() => {
          const activeScenario = shield.quickStressTest?.find((s) => s.dropPercent === activeStressDrop);
          if (!activeScenario) return null;

          return (
            <div style={{ background: 'rgba(30, 41, 59, 0.65)', border: `1px solid ${activeScenario.status === 'MARGIN_CALL' ? 'rgba(239, 68, 68, 0.4)' : activeScenario.status === 'WARNING' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`, borderRadius: 'var(--radius-md)', padding: '14px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge" style={{ background: activeScenario.status === 'MARGIN_CALL' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)', color: activeScenario.status === 'MARGIN_CALL' ? '#f87171' : '#fbbf24', fontWeight: 800, padding: '4px 8px' }}>
                  {activeScenario.label}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  壓力後擔保品市值：<strong className="mono">NT$ {activeScenario.stressedCollateralTWD.toLocaleString()}</strong>
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  試算維持率：<strong className="mono" style={{ color: activeScenario.status === 'MARGIN_CALL' ? '#f87171' : activeScenario.status === 'WARNING' ? '#fbbf24' : '#4ade80' }}>{activeScenario.stressedMarginRatioPercent}%</strong>
                </span>
              </div>

              <div>
                {activeScenario.marginCallShortfallTWD > 0 ? (
                  <span style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={15} />
                    觸發追繳！需補繳保證金缺口：NT$ {activeScenario.marginCallShortfallTWD.toLocaleString()}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 700 }}>
                    ✔ 維持率仍高於 130% 斷頭線，無追繳補繳缺口
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="card">
        <div className="warroom-section-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: 'var(--accent-cyan)' }} />
              市場四柱即時脈搏 (Market Pulse)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              長短端利率倒掛 · 恐慌與貪婪中樞 · 實體商品定價 · 全球流動性水庫 (在地持久化資料庫)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleRefreshPulse}
              disabled={isRefreshing}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
              title="更新並持久化最新市場數據至本地資料庫"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : undefined} />
              {isRefreshing ? '同步中...' : '即時同步'}
            </button>
            <button
              onClick={handleExportCsv}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
              title="匯出歷史四柱數據為 CSV 格式供 Excel/量化分析"
            >
              <Download size={12} />
              匯出歷史 CSV
            </button>
            <button
              onClick={() => setShowHistoryTable(!showHistoryTable)}
              className="btn btn-sm"
              style={{
                background: showHistoryTable ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                color: showHistoryTable ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid ' + (showHistoryTable ? 'var(--accent-primary)' : 'var(--border-color)'),
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              <History size={12} />
              {showHistoryTable ? '收合歷史' : `過往數據庫 (${macroHistoryList.length}筆)`}
            </button>
          </div>
        </div>

        <div className="warroom-grid-4">
          {/* 柱一：利率與倒掛 */}
          <div className="warroom-stat-card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>利率與倒掛利差</div>
            <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {macroSnapshot.us10y}%
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 400 }}>
                10Y 美債
              </span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>2Y 美債：{macroSnapshot.us2y}%</span>
              <span className="badge" style={{ background: macroSnapshot.yieldSpread < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: macroSnapshot.yieldSpread < 0 ? 'var(--profit-color)' : 'var(--gain-color)' }}>
                利差 {macroSnapshot.yieldSpread}% {macroSnapshot.yieldSpread < 0 ? '(倒掛)' : '(正常)'}
              </span>
            </div>
          </div>

          {/* 柱二：恐慌與情緒 */}
          <div className="warroom-stat-card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>CBOE VIX 恐慌指數</div>
            <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {macroSnapshot.vix}
              <span className="badge" style={{ marginLeft: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--gain-color)' }}>
                {macroSnapshot.vixLevel}
              </span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Fear & Greed</span>
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}>
                {macroSnapshot.fearAndGreedIndex} ({macroSnapshot.fearAndGreedLevel})
              </span>
            </div>
          </div>

          {/* 柱三：大宗商品與實質硬資產 */}
          <div className="warroom-stat-card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>黃金現貨 (GLD)</div>
            <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
              ${macroSnapshot.goldPrice}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '4px' }}>USD/oz</span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>WTI 原油</span>
              <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                ${macroSnapshot.oilPrice} / 桶
              </span>
            </div>
          </div>

          {/* 柱四：全球流動性水閘 */}
          <div className="warroom-stat-card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>美元指數 (DXY)</div>
            <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {macroSnapshot.dxy}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 400 }}>
                USD/TWD {macroSnapshot.usdToTwd}
              </span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>美 M2 年增</span>
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}>
                +{macroSnapshot.usM2GrowthYoY}%
              </span>
            </div>
          </div>
        </div>

        {/* 🦅 台美機構金絲雀雙軌專屬指針 (Institutional Canaries - Ticket 02 & 03) */}
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {(marketView === 'US' || marketView === 'GLOBAL') && (
            <div style={{ background: 'rgba(30, 41, 59, 0.45)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🇺🇸 美高收益債信用利差 (HY OAS)</div>
                <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: (macroSnapshot.creditSpreadOAS ?? 3.5) >= 5.0 ? '#f87171' : '#38bdf8' }}>
                  {macroSnapshot.creditSpreadOAS ?? 3.5}%
                </div>
              </div>
              <span className="badge" style={{ background: (macroSnapshot.creditSpreadOAS ?? 3.5) >= 5.0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.15)', color: (macroSnapshot.creditSpreadOAS ?? 3.5) >= 5.0 ? '#f87171' : '#38bdf8' }}>
                {(macroSnapshot.creditSpreadOAS ?? 3.5) >= 5.0 ? '⚠️ 利差走擴' : '平穩健康'}
              </span>
            </div>
          )}

          {(marketView === 'US' || marketView === 'GLOBAL') && (
            <div style={{ background: 'rgba(30, 41, 59, 0.45)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🇺🇸 CDS 債券違約保險指數 (CDX)</div>
                <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: (macroSnapshot.cdsInsuranceIndex ?? 65) >= 100 ? '#f87171' : '#a78bfa' }}>
                  {macroSnapshot.cdsInsuranceIndex ?? 65} 點
                </div>
              </div>
              <span className="badge" style={{ background: (macroSnapshot.cdsInsuranceIndex ?? 65) >= 100 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(167, 139, 250, 0.15)', color: (macroSnapshot.cdsInsuranceIndex ?? 65) >= 100 ? '#f87171' : '#a78bfa' }}>
                風控位階：{macroSnapshot.cdsRiskLevel ?? 'LOW'}
              </span>
            </div>
          )}

          {(marketView === 'TW' || marketView === 'GLOBAL') && (
            <div style={{ background: 'rgba(30, 41, 59, 0.45)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🇹🇼 外資台指期淨未平倉 (Net OI)</div>
                <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: (macroSnapshot.twFuturesNetOi ?? 0) <= -30000 ? '#f87171' : '#4ade80' }}>
                  {(macroSnapshot.twFuturesNetOi ?? -15000).toLocaleString()} 口
                </div>
              </div>
              <span className="badge" style={{ background: (macroSnapshot.twFuturesNetOi ?? 0) <= -30000 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.15)', color: (macroSnapshot.twFuturesNetOi ?? 0) <= -30000 ? '#f87171' : '#4ade80' }}>
                {(macroSnapshot.twFuturesNetOi ?? 0) <= -45000 ? '🚨 重度放空' : (macroSnapshot.twFuturesNetOi ?? 0) <= -30000 ? '⚠️ 避險警戒' : '中性多空'}
              </span>
            </div>
          )}

          {(marketView === 'TW' || marketView === 'GLOBAL') && (
            <div style={{ background: 'rgba(30, 41, 59, 0.45)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🇹🇼 全市場融資維持率 (130% 斷頭)</div>
                <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: (macroSnapshot.twMarginMaintenance ?? 165.2) < 140 ? '#f87171' : '#22c55e' }}>
                  {macroSnapshot.twMarginMaintenance ?? 165.2}%
                </div>
              </div>
              <span className="badge" style={{ background: (macroSnapshot.twMarginMaintenance ?? 165.2) < 130 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.15)', color: (macroSnapshot.twMarginMaintenance ?? 165.2) < 130 ? '#f87171' : '#4ade80' }}>
                {(macroSnapshot.twMarginMaintenance ?? 165.2) < 130 ? '🚨 斷頭追繳潮' : (macroSnapshot.twMarginMaintenance ?? 165.2) < 140 ? '⚠️ 警戒水位' : '安全無虞'}
              </span>
            </div>
          )}
        </div>


        {/* 展開之歷史數據表格檢視器 */}
        {showHistoryTable && (
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                📜 在地資料庫過往歷史脈搏 (最近 10 筆快照)
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                永久沉澱於本機，離線隨時可查，無須重新從網路下載
              </span>
            </div>
            <div className="warroom-table-container">
              <table className="warroom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th style={{ textAlign: 'right' }}>10Y美債</th>
                    <th style={{ textAlign: 'right' }}>2Y美債</th>
                    <th style={{ textAlign: 'right' }}>殖利率差</th>
                    <th style={{ textAlign: 'right' }}>VIX恐慌</th>
                    <th style={{ textAlign: 'right' }}>貪婪指數</th>
                    <th style={{ textAlign: 'right' }}>黃金(USD)</th>
                    <th style={{ textAlign: 'right' }}>WTI原油</th>
                    <th style={{ textAlign: 'right' }}>美元指數</th>
                    <th style={{ textAlign: 'right' }}>USD/TWD</th>
                  </tr>
                </thead>
                <tbody>
                  {macroHistoryList.slice(0, 10).map((h) => (
                    <tr key={h.date} style={{ background: h.date === macroSnapshot.date ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                      <td className="mono" style={{ fontWeight: 600 }}>{h.date}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{h.us10y.toFixed(2)}%</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{h.us2y.toFixed(2)}%</td>
                      <td className="mono" style={{ textAlign: 'right', color: h.yieldSpread < 0 ? 'var(--profit-color)' : 'var(--gain-color)' }}>
                        {h.yieldSpread.toFixed(2)}%
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>{h.vix.toFixed(1)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{h.fearAndGreedIndex}</td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--accent-amber)' }}>${h.goldPrice.toFixed(1)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>${h.oilPrice.toFixed(1)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{h.dxy.toFixed(1)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{h.usdToTwd.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>


      {/* 🛡️ 第二層：個人投資組合宏觀防護盾 (Portfolio Macro Shield) */}
      <div className="card">
        <div className="warroom-section-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-emerald)' }} />
              個人投資組合宏觀防護盾 (Macro Shield)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              現金購買力深度 · 質押維持率安全緩衝 · 目標資產配置偏離度
            </span>
          </div>
          <button
            onClick={onOpenMarginStressModal}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            質押黑天鵝壓力測試 ➔
          </button>
        </div>

        <div className="warroom-grid-3">
          {/* 現金水庫比率 */}
          <div className="warroom-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>現金購買力比率</span>
              <span className="badge" style={{ background: shield.cashRatioPercent < 10 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: shield.cashRatioPercent < 10 ? 'var(--profit-color)' : 'var(--gain-color)' }}>
                {shield.cashRatioPercent < 10 ? '水位偏緊' : '防禦充裕'}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {shield.cashRatioPercent}%
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              可用現金 NT$ {Math.round(cashBalanceTwd).toLocaleString()}
            </div>
          </div>

          {/* 質押維持率健康度 */}
          <div className="warroom-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>質押維持率健康度</span>
              <span className="badge" style={{ background: shield.marginStatus === 'NO_LOAN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: shield.marginStatus === 'NO_LOAN' ? 'var(--gain-color)' : 'var(--accent-amber)' }}>
                {shield.marginStatus === 'NO_LOAN' ? '無借款 (零槓桿)' : '進行中風控'}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {shield.marginMaintenanceRatio > 999 ? '∞ (零負債)' : `${shield.marginMaintenanceRatio}%`}
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {shield.marginStatus === 'NO_LOAN' ? '戶況健康無追繳壓力' : '維持率安全閥監控中'}
            </div>
          </div>

          {/* 配置偏離度 */}
          <div className="warroom-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>目標資產配置偏離</span>
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}>
                {shield.maxAllocationDriftPercent <= 5 ? '平衡正常' : '顯著失衡'}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {shield.maxAllocationDriftPercent}%
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              容許偏離閾值 ±5.0%
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 第三層：雙重動能跨資產輪動排行榜 (Dual Momentum Rotation) */}
      <div className="card">
        <div className="warroom-section-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
              雙重動能跨資產輪動排行榜 (Dual Momentum Rotation)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Gary Antonacci 經典模型 · 12-1M 滾動加權動能 · 絕對動能避風港安全閥
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {DEFAULT_MOMENTUM_UNIVERSES.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUniverseId(u.id)}
                className="btn btn-sm"
                style={{
                  background: selectedUniverseId === u.id ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.65)',
                  color: selectedUniverseId === u.id ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid ' + (selectedUniverseId === u.id ? 'var(--accent-primary)' : 'var(--border-color)'),
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {u.name.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 避風港與決策提示條 */}
        <div
          className="warroom-banner-tip"
          style={{
            background: momentumSignal.safeHavenTriggered ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
            border: '1px solid ' + (momentumSignal.safeHavenTriggered ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'),
            color: momentumSignal.safeHavenTriggered ? 'var(--profit-color)' : 'var(--text-primary)',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={16} />
              <span>
                <strong>當前建議行動：</strong>
                {momentumSignal.actionHeadline}：{momentumSignal.topAsset ? `【${momentumSignal.topAsset.symbol} ${momentumSignal.topAsset.name || ''}】` : '退守避風港'}
              </span>
            </div>
            <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              📆 距月結調倉尚有 {daysUntilMonthEnd} 天
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            💡 {momentumSignal.actionAdvice}
            {holdingMatchingAsset && momentumSignal.topAsset && !holdingMatchingAsset.symbol.includes(momentumSignal.topAsset.symbol.replace('.TW', '')) && (
              <span style={{ marginLeft: '8px', color: 'var(--accent-amber)', fontWeight: 600 }}>
                (⚠️ 您在庫持有 {holdingMatchingAsset.symbol}，非動能榜首，建議於月結日評估是否換倉)
              </span>
            )}
          </div>
        </div>

        {/* 排行榜清單 */}
        <div className="warroom-table-container">
          <table className="warroom-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>排名</th>
                <th>代號 / 標的名稱</th>
                <th style={{ textAlign: 'right' }}>12-1M 加權分數</th>
                <th style={{ textAlign: 'right' }}>12M 報酬</th>
                <th style={{ textAlign: 'right' }}>6M 報酬</th>
                <th style={{ textAlign: 'right' }}>3M 報酬</th>
                <th style={{ textAlign: 'center' }}>絕對動能 (vs 4%)</th>
              </tr>
            </thead>
            <tbody>
              {momentumSignal.leaderboard.map((item, idx) => (
                <tr key={item.symbol} style={{ background: idx === 0 ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                  <td>
                    <span
                      className="mono"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: idx === 0 ? 'var(--accent-amber)' : 'rgba(51, 65, 85, 0.5)',
                        color: idx === 0 ? '#0f172a' : 'var(--text-primary)',
                      }}
                    >
                      {item.rank}
                    </span>
                  </td>
                  <td>
                    <div className="mono" style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.symbol}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.name}</div>
                  </td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {item.momentumScore.toFixed(1)}%
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {item.returns12M.toFixed(1)}%
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {item.returns6M.toFixed(1)}%
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {item.returns3M.toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {item.isAboveRiskFree ? (
                      <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)', border: '1px solid var(--gain-border)' }}>
                        勝出基準
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.4)', color: 'var(--text-muted)' }}>
                        弱於現金
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📅 第四層：關鍵財經催化劑倒數日曆 (Catalyst Calendar) */}
      <div className="card">
        <div className="warroom-section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: 'var(--accent-purple)' }} />
              關鍵財經事件倒數日曆 (Upcoming Catalysts)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              央行決議 · 通膨 CPI · 就業報告 · 市場流動性關鍵轉折 · 在庫除息日程
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setIsCustomModalOpen(true)}
              style={{ fontSize: '0.78rem', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
              title="新增自訂關注事件"
            >
              <Plus size={14} />
              新增事件
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleResetCatalysts}
              style={{ fontSize: '0.78rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="一鍵清除自訂並重置為官方預設日曆"
            >
              <RefreshCw size={13} />
              重置
            </button>
            <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              倒數雷達 ({filteredCatalysts.length})
            </span>
          </div>
        </div>

        {/* ⏱️ 彭博式三段時序雷達切換 (Timeline Horizon Radar - Ticket 07 & 11) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '14px 0 6px 0', padding: '10px 14px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(51, 65, 85, 0.4)' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Layers size={13} />
            時序雷達：
          </span>
          {[
            { id: 'ALL', label: `全時序 (${catalysts.length})` },
            { id: 'TODAY', label: `🔥 今日登場 (${groupedCatalysts.today.length})` },
            { id: 'WEEK', label: `⚡ 7 日焦點 (${groupedCatalysts.within7Days.length})` },
            { id: 'MONTH', label: `📅 30 日遠端 (${groupedCatalysts.within30Days.length})` },
          ].map((tab) => {
            const active = timelineHorizon === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTimelineHorizon(tab.id as any)}
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: active ? '1px solid var(--accent-purple)' : '1px solid transparent',
                  background: active ? 'rgba(139, 92, 246, 0.25)' : 'rgba(15, 23, 42, 0.5)',
                  color: active ? '#c084fc' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 快速分類篩選籤 (Filter Tabs) */}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '14px 0 16px 0' }}>
          {[
            { id: 'ALL', label: `全部 (${catalysts.length})` },
            { id: 'CENTRAL_BANK', label: `🏛️ 央行利率 (${catalysts.filter((c) => c.category === 'CENTRAL_BANK').length})` },
            { id: 'INFLATION_EMPLOYMENT', label: `📊 通膨就業 (${catalysts.filter((c) => c.category === 'INFLATION' || c.category === 'EMPLOYMENT').length})` },
            { id: 'EARNINGS_DIVIDEND', label: `🎯 持股除息 (${catalysts.filter((c) => c.category === 'EARNINGS_DIVIDEND' || c.category === 'EARNINGS').length})` },
            { id: 'DERIVATIVE_SETTLEMENT', label: `⚡ 期貨結算 (${catalysts.filter((c) => c.category === 'DERIVATIVE_SETTLEMENT').length})` },
            { id: 'CUSTOM', label: `✏️ 自訂備忘 (${catalysts.filter((c) => c.isCustom).length})` },
          ].map((tab) => {
            const active = catalystFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCatalystFilter(tab.id)}
                style={{
                  fontSize: '0.76rem',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: active ? '1px solid var(--accent-primary, #3b82f6)' : '1px solid rgba(148, 163, 184, 0.2)',
                  background: active ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                  color: active ? 'var(--accent-primary, #3b82f6)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: active ? 700 : 500,
                  transition: 'all 0.2s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 空狀態防禦卡片 (Empty State Fallback) */}
        {filteredCatalysts.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 16px',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '12px',
              border: '1px dashed rgba(148, 163, 184, 0.25)',
            }}
          >
            <Calendar size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 10px auto' }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
              近期無特定分類之重大財經事件
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 auto 16px auto', maxWidth: '380px', lineHeight: 1.6 }}>
              當前分類下暫無待登場事件。您可以切換回「全部」視圖，或點擊下方按鈕手動新增法說會、除息日或理財規劃日。
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setCatalystFilter('ALL')}
                style={{ fontSize: '0.78rem', padding: '6px 14px' }}
              >
                查看全部事件
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setIsCustomModalOpen(true)}
                style={{ fontSize: '0.78rem', padding: '6px 14px' }}
              >
                ＋ 新增自訂事件
              </button>
            </div>
          </div>
        ) : (
          <div className="warroom-grid-4">
            {filteredCatalysts.map((event) => {
              const isUrgent = event.daysLeft <= 3;
              const isToday = event.daysLeft === 0;
              const isHighImpact = event.impact === 'HIGH';

              return (
                <div
                  key={event.id}
                  className="warroom-stat-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    borderColor: isToday
                      ? 'rgba(239, 68, 68, 0.6)'
                      : isUrgent && isHighImpact
                      ? 'rgba(245, 158, 11, 0.5)'
                      : undefined,
                    boxShadow: isToday ? '0 0 14px rgba(239, 68, 68, 0.2)' : undefined,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          className="badge"
                          style={{
                            background:
                              event.category === 'CENTRAL_BANK'
                                ? 'rgba(139, 92, 246, 0.15)'
                                : event.category === 'INFLATION'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : event.category === 'EMPLOYMENT'
                                ? 'rgba(59, 130, 246, 0.15)'
                                : event.category === 'EARNINGS_DIVIDEND'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : event.category === 'DERIVATIVE_SETTLEMENT'
                                ? 'rgba(236, 72, 153, 0.15)'
                                : 'rgba(6, 182, 212, 0.15)',
                            color:
                              event.category === 'CENTRAL_BANK'
                                ? '#a78bfa'
                                : event.category === 'INFLATION'
                                ? '#fbbf24'
                                : event.category === 'EMPLOYMENT'
                                ? '#60a5fa'
                                : event.category === 'EARNINGS_DIVIDEND'
                                ? '#34d399'
                                : event.category === 'DERIVATIVE_SETTLEMENT'
                                ? '#f472b6'
                                : '#22d3ee',
                          }}
                        >
                          {event.category === 'CENTRAL_BANK'
                            ? '🏛️ 央行'
                            : event.category === 'INFLATION'
                            ? '📊 通膨'
                            : event.category === 'EMPLOYMENT'
                            ? '💼 就業'
                            : event.category === 'EARNINGS_DIVIDEND'
                            ? '🎯 除息'
                            : event.category === 'DERIVATIVE_SETTLEMENT'
                            ? '⚡ 結算'
                            : '✏️ 自訂'}
                        </span>

                        {event.impact && (
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              background:
                                event.impact === 'HIGH'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : event.impact === 'MEDIUM'
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : 'rgba(148, 163, 184, 0.12)',
                              color:
                                event.impact === 'HIGH'
                                  ? 'var(--profit-color, #ef4444)'
                                  : event.impact === 'MEDIUM'
                                  ? '#f59e0b'
                                  : 'var(--text-muted)',
                              border: event.impact === 'HIGH' ? '1px solid rgba(239, 68, 68, 0.3)' : undefined,
                            }}
                          >
                            {event.impact === 'HIGH' ? '🔴 高衝擊' : event.impact === 'MEDIUM' ? '🟡 中度' : '🟢 溫和'}
                          </span>
                        )}

                        {event.targetMarket && event.targetMarket !== 'ALL' && (
                          <span className="badge" style={{ fontSize: '0.68rem', padding: '2px 5px', background: 'rgba(51, 65, 85, 0.4)', color: 'var(--text-muted)' }}>
                            {event.targetMarket === 'TW' ? '台股' : '美股'}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: isToday
                              ? 'var(--profit-color)'
                              : isUrgent
                              ? 'var(--profit-color)'
                              : 'var(--accent-primary)',
                          }}
                        >
                          {isToday ? '🔥 今日登場' : `倒數 ${event.daysLeft} 天`}
                        </span>

                        {event.isCustom && (
                          <button
                            onClick={() => handleDeleteCustomCatalyst(event.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="刪除此自訂事件"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {event.name}
                    </div>

                    <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      日期：{event.date}
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {event.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✏️ 快速新增自訂催化劑彈窗 (Quick Custom Catalyst Modal) */}
      {isCustomModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsCustomModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-secondary, #1e293b)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '14px',
              padding: '24px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
                新增自訂關鍵財經事件
              </h3>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomCatalyst}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  事件名稱 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：台積電北美技術論壇、個人信貸撥款"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    background: 'var(--bg-primary, #0f172a)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    發生日期 *
                  </label>
                  <input
                    type="date"
                    required
                    value={newCustomDate}
                    onChange={(e) => setNewCustomDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      background: 'var(--bg-primary, #0f172a)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    衝擊等級
                  </label>
                  <select
                    value={newCustomImpact}
                    onChange={(e) => setNewCustomImpact(e.target.value as CatalystImpact)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      background: 'var(--bg-primary, #0f172a)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="HIGH">🔴 高衝擊 (HIGH)</option>
                    <option value="MEDIUM">🟡 中度 (MEDIUM)</option>
                    <option value="LOW">🟢 溫和 (LOW)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  事件類別
                </label>
                <select
                  value={newCustomCategory}
                  onChange={(e) => setNewCustomCategory(e.target.value as CatalystCategory)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    background: 'var(--bg-primary, #0f172a)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="CUSTOM">✏️ 自訂備忘事件</option>
                  <option value="CENTRAL_BANK">🏛️ 央行與利率決議</option>
                  <option value="INFLATION">📊 通膨與物價指數</option>
                  <option value="EMPLOYMENT">💼 勞動與就業報告</option>
                  <option value="EARNINGS_DIVIDEND">🎯 持股除息與法說會</option>
                  <option value="DERIVATIVE_SETTLEMENT">⚡ 期貨與衍生品結算</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  說明備忘
                </label>
                <textarea
                  rows={3}
                  placeholder="備註具體細節、觀察重點或操作規劃..."
                  value={newCustomDesc}
                  onChange={(e) => setNewCustomDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    background: 'var(--bg-primary, #0f172a)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCustomModalOpen(false)}
                  style={{ fontSize: '0.82rem', padding: '7px 16px' }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem', padding: '7px 18px' }}
                >
                  確認儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
