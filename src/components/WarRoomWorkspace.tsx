import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Compass,
  Copy,
  Check,
  Sliders,
  EyeOff,
} from 'lucide-react';
import { MacroQuickCalibrationModal } from './warRoom/MacroQuickCalibrationModal';
import { MacroDualThermometerBar } from './warRoom/MacroDualThermometerBar';
import { PortfolioShieldAndAmmoCard } from './warRoom/PortfolioShieldAndAmmoCard';
import { MacroStrategyPinBar } from './warRoom/MacroStrategyPinBar';
import { HoldingTacticalSignalsCard } from './warRoom/HoldingTacticalSignalsCard';
import { MarketPulseAndCanariesCard } from './warRoom/MarketPulseAndCanariesCard';
import { WarRoomMorningBriefCard } from './warRoom/WarRoomMorningBriefCard';
import { DualMomentumRotationCard } from './warRoom/DualMomentumRotationCard';
import { CatalystCalendarCard } from './warRoom/CatalystCalendarCard';

import { HoldingPosition, LoanRecord, TradeRecord, MarketType } from '../types/stock';
import { TargetAllocationConfig } from '../types/allocation';
import {
  UpcomingCatalyst,
  MarketViewTab,
  MacroHoldingSignalInput,
  MacroPinnedStrategy,
} from '../types/macro';
import {
  generateAiMorningBrief,
  evaluateMacroDualThermometer,
  estimateTsmcExDividendImpactPoints,
  generateMonthlyRevenueDeadlineCatalyst,
  isDoubleColdRegime,
} from '../engine/macroAdvisorEngine';
import {
  DEFAULT_MOMENTUM_UNIVERSES,
} from '../engine/dualMomentumEngine';
import { ReceivableDividend } from '../types/dividend';
import {
  loadMacroPinnedStrategies,
  saveMacroPinnedStrategy,
  removeMacroPinnedStrategy,
  parseMacroLoopbackJson,
  exportMacroPulseHistoryAsCsv,
} from '../utils/macroPulseStorage';
import { copyTextToClipboard } from '../utils/clipboard';

import {
  getAggregatedCatalysts,
  saveCustomCatalyst,
  deleteCustomCatalyst,
  resetCatalystsToDefault,
} from '../utils/catalystStorage';
import { syncExternalCatalystsAsync } from '../engine/catalystSyncService';
import { useWarRoomPortfolioMetrics } from '../hooks/useWarRoomPortfolioMetrics';
import { useWarRoomMacroSync } from '../hooks/useWarRoomMacroSync';
import { calculateBehavioralAuditReport } from '../engine/behavioralAuditEngine';
import {
  assembleWarRoomHoldingSignals,
  buildMorningBriefMarkdownReport,
  buildDualMomentumViewModel,
  toUpcomingDividends,
} from '../utils/warRoomBriefBuilder';

interface WarRoomWorkspaceProps {
  holdings: HoldingPosition[];
  loans: LoanRecord[];
  cashBalanceTwd: number;
  totalNavTwd: number;
  usdToTwdRate: number;
  historicalDailyPrices?: Record<string, Record<string, number>>;
  receivableDividends?: ReceivableDividend[];
  onOpenMarginStressModal: () => void;
  currentMarket?: 'ALL' | 'TW' | 'US';
  onMarketChange?: (market: 'ALL' | 'TW' | 'US') => void;
  pendingSettlementOutflowTwd?: number;
  dcaCommitment7dTwd?: number;
  trades?: TradeRecord[];
  rebalancingConfig?: TargetAllocationConfig;
  privacyMode?: boolean;
  onInspectTechnical?: (symbol: string, market?: MarketType) => void;
  onOpenAiForce?: (symbol: string, market?: MarketType) => void;
  onOpenTradeModal?: (symbol?: string, market?: MarketType) => void;
}

export const WarRoomWorkspace: React.FC<WarRoomWorkspaceProps> = ({
  holdings,
  loans,
  cashBalanceTwd,
  totalNavTwd,
  usdToTwdRate,
  historicalDailyPrices = {},
  receivableDividends = [],
  onOpenMarginStressModal,
  currentMarket,
  onMarketChange,
  pendingSettlementOutflowTwd = 0,
  dcaCommitment7dTwd = 0,
  trades = [],
  rebalancingConfig,
  privacyMode = false,
  onInspectTechnical,
  onOpenAiForce,
  onOpenTradeModal,
}) => {
  const [copiedLlm, setCopiedLlm] = useState(false);
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>('global_macro');

  const {
    macroSnapshot,
    macroHistoryList,
    isRefreshing,
    lakehouseCandlesMap,
    syncMacroPulseFromBackend,
    applyCalibratedSnapshot,
  } = useWarRoomMacroSync({
    usdToTwdRate,
    selectedUniverseId,
    holdings,
    historicalDailyPrices,
  });

  const [pinnedStrategies, setPinnedStrategies] = useState<MacroPinnedStrategy[]>(() =>
    loadMacroPinnedStrategies()
  );

  // 同步外部 Header currentMarket (ALL / TW / US) 與戰情室視角 (GLOBAL / TW / US)
  const [marketView, setMarketView] = useState<MarketViewTab>(() => {
    if (currentMarket === 'TW') return 'TW';
    if (currentMarket === 'US') return 'US';
    return 'GLOBAL';
  });

  useEffect(() => {
    if (currentMarket === 'TW' && marketView !== 'TW') {
      setMarketView('TW');
    } else if (currentMarket === 'US' && marketView !== 'US') {
      setMarketView('US');
    } else if (currentMarket === 'ALL' && marketView !== 'GLOBAL') {
      setMarketView('GLOBAL');
    }
  }, [currentMarket]);

  const handleMarketTabChange = useCallback(
    (tab: MarketViewTab) => {
      setMarketView(tab);
      if (onMarketChange) {
        onMarketChange(tab === 'GLOBAL' ? 'ALL' : tab);
      }
    },
    [onMarketChange]
  );

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
    void syncMacroPulseFromBackend(true);
  };

  // 0. 持股技術訊號萃取 (委派至純函式 assembleWarRoomHoldingSignals)
  const holdingSignals = useMemo<MacroHoldingSignalInput[]>(() => {
    return assembleWarRoomHoldingSignals({
      holdings,
      historicalDailyPrices,
      lakehouseCandlesMap,
      totalNavTwd,
      usdToTwdRate,
      asOfDate: macroSnapshot.date,
    });
  }, [holdings, historicalDailyPrices, lakehouseCandlesMap, totalNavTwd, usdToTwdRate, macroSnapshot.date]);

  // 0.1 待收股息進度轉換
  const upcomingDividends = useMemo(
    () => toUpcomingDividends(receivableDividends),
    [receivableDividends]
  );

  // 1. 跨模組整合：ETF 穿透曝險 + 個人防護盾 3.0 與自由彈藥 (Spec 0220 / 技術債 0055: 狀態抽取 Hook)
  const { lookThroughReport, shield } = useWarRoomPortfolioMetrics({
    holdings,
    loans,
    cashBalanceTwd,
    totalNavTwd,
    usdToTwdRate,
    pendingSettlementOutflowTwd,
    dcaCommitment7dTwd,
    rebalancingConfig,
    vix: macroSnapshot.vix,
  });

  // --- 0193 / 0209 旗艦戰情室 3.0 狀態 ---
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [copiedPrivacyBrief, setCopiedPrivacyBrief] = useState(false);

  // --- 0204 快速校準 Modal 狀態 ---
  const [isCalibrateModalOpen, setIsCalibrateModalOpen] = useState(false);

  // Spec 0209 雙溫度計 SSOT (移除舊版單軌 macroThermometer)
  const dualThermometer = useMemo(() => {
    return evaluateMacroDualThermometer(macroSnapshot);
  }, [macroSnapshot]);

  // 個人化行為心理覆盤：當大盤/費半 20MA 正乖離 > +5% 過熱時提醒歷史追高勝率
  const fomoChasingWarning = useMemo(() => {
    const isOverheated =
      (macroSnapshot.soxBias20Ma ?? 0) > 5 ||
      (macroSnapshot.taiexBias20Ma ?? 0) > 5 ||
      dualThermometer.tacticalSwing.signal === 'OVERHEATED_TRIM';
    if (!isOverheated || !trades || trades.length === 0) return null;
    try {
      const report = calculateBehavioralAuditReport(trades, holdings, totalNavTwd || 1000000);
      const winRate = report.fomo.chasingHighWinRate;
      return `🧘 行為金融煞車提醒：當前大盤/費半 20MA 正乖離過熱，您過往於高正乖離追高進場之歷史勝率為 ${winRate.toFixed(1)}%，建議嚴守箱頂不盲目追價。`;
    } catch {
      return null;
    }
  }, [macroSnapshot.soxBias20Ma, macroSnapshot.taiexBias20Ma, dualThermometer.tacticalSwing.signal, trades, holdings, totalNavTwd]);

  // 催化劑日曆狀態管理
  const [remoteCatalysts, setRemoteCatalysts] = useState<Omit<UpcomingCatalyst, 'daysLeft'>[]>([]);
  const [catalystRefreshKey, setCatalystRefreshKey] = useState(0);

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

  const handleAddCustomCatalyst = (input: Parameters<typeof saveCustomCatalyst>[0]) => {
    saveCustomCatalyst(input);
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

  // 2. 財經事件倒數 (四階梯多源聚合 + 每月 10 號營收截止倒數 + 台積電法說會/NVDA財報)
  const catalysts = useMemo(() => {
    const list = getAggregatedCatalysts({
      asOfDate: macroSnapshot.date,
      receivableDividends,
      remoteCatalysts,
    });
    const revenueDeadlineEvent = generateMonthlyRevenueDeadlineCatalyst(macroSnapshot.date);
    if (!list.some((c) => c.id === revenueDeadlineEvent.id)) {
      list.push(revenueDeadlineEvent);
      list.sort((a, b) => a.daysLeft - b.daysLeft);
    }
    return list;
  }, [macroSnapshot.date, receivableDividends, remoteCatalysts, catalystRefreshKey]);

  // 估算台積電除息對加權指數之蒸發點數 (即使未持有 2330，催化劑有台積電除息亦主動預警)
  const exDividendImpactPoints = useMemo(() => {
    return estimateTsmcExDividendImpactPoints({
      receivableDividends,
      catalysts,
      taiexCurrentIndex: macroSnapshot.taiexIndex,
    });
  }, [receivableDividends, catalysts, macroSnapshot.taiexIndex]);

  // 3. 生成 AI 作戰方針
  const morningBrief = useMemo(() => {
    return generateAiMorningBrief({
      macro: macroSnapshot,
      shield,
      catalysts,
      holdingSignals,
      upcomingDividends,
    });
  }, [macroSnapshot, shield, catalysts, holdingSignals, upcomingDividends]);

  // 依 marketView 自動推薦切換對應雙動能資產池（支援手動切換覆寫）
  useEffect(() => {
    if (marketView === 'TW') setSelectedUniverseId('tw_dividend_etf');
    else if (marketView === 'US') setSelectedUniverseId('us_sector_rotation');
    else setSelectedUniverseId('global_macro');
  }, [marketView]);

  // 4. 雙重動能輪動信號 (委派至純函式 buildDualMomentumViewModel)
  const { effectiveRiskFreeRate, momentumSignal, holdingMatchingSymbol, holdingWeightMap } = useMemo(
    () =>
      buildDualMomentumViewModel({
        selectedUniverseId,
        us3m: macroSnapshot.us3m,
        lakehouseCandlesMap,
        historicalDailyPrices,
        receivableDividends,
        asOfDate: macroSnapshot.date,
        holdings,
        holdingSignals,
      }),
    [
      selectedUniverseId,
      macroSnapshot.us3m,
      macroSnapshot.date,
      lakehouseCandlesMap,
      historicalDailyPrices,
      receivableDividends,
      holdings,
      holdingSignals,
    ]
  );

  const daysUntilMonthEnd = useMemo(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(0, lastDayOfMonth - now.getDate());
  }, []);

  const handleCopyLlmJson = async () => {
    const ok = await copyTextToClipboard(morningBrief.llmPayloadJson);
    if (ok) {
      setCopiedLlm(true);
      setTimeout(() => setCopiedLlm(false), 2000);
    }
  };

  const handleOpenCalibrateModal = () => {
    setIsCalibrateModalOpen(true);
  };

  const handlePasteAndPinStrategy = useCallback(
    (rawText: string): boolean => {
      const parsed = parseMacroLoopbackJson(rawText);
      if (!parsed || typeof parsed.recommendedEquityCapPercent !== 'number') return false;
      const updated = saveMacroPinnedStrategy({
        aiModel: parsed.aiModel || 'External AI',
        recommendedEquityCapPercent: parsed.recommendedEquityCapPercent,
        soxSupportLevel: parsed.soxSupportLevel,
        taiexSupportLevel: parsed.taiexSupportLevel,
        tacticalSummary: parsed.tacticalSummary || '外部 AI 戰略建議',
      });
      setPinnedStrategies(updated);
      return true;
    },
    []
  );

  const handleRemovePinnedStrategy = useCallback((id: string) => {
    const updated = removeMacroPinnedStrategy(id);
    setPinnedStrategies(updated);
  }, []);

  const handleCopyMorningBriefReport = async (isMasked = false) => {
    const report = buildMorningBriefMarkdownReport({
      macroSnapshot,
      dualThermometer,
      morningBrief,
      shield,
      holdingSignals,
      isMasked,
    });
    const ok = await copyTextToClipboard(report);
    if (ok) {
      if (isMasked) {
        setCopiedPrivacyBrief(true);
        setTimeout(() => setCopiedPrivacyBrief(false), 2000);
      } else {
        setCopiedBrief(true);
        setTimeout(() => setCopiedBrief(false), 2000);
      }
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
                法人旗艦級宏觀戰情室 3.5
              </h1>
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--gain-color)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <span className="pulse-dot-green" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                跨市費半傳導 × 雙溫度計
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              費城半導體 (^SOX) × 台積電 ADR 溢折價 × 台股騰落廣度 × 真·自由子彈與 ETF 穿透風控
            </p>
          </div>
        </div>

        {/* 頂部操作區（視角切換統一收斂至下方 MacroDualThermometerBar，避免雙重渲染） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenCalibrateModal}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.78rem' }}
            title="快速手動校準美債、VIX、費半、台積電 ADR、外資空單與融資維持率"
          >
            <Sliders size={14} />
            ✏️ 數據校準
          </button>

          <button
            onClick={() => handleCopyMorningBriefReport(false)}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.78rem' }}
            title="一鍵複製繁體中文晨會每日作戰報告 (含 Data Seal 與持股矩陣)"
          >
            {copiedBrief ? <Check size={14} /> : <Copy size={14} />}
            {copiedBrief ? '已複製簡報' : '📋 複製簡報'}
          </button>

          <button
            onClick={() => handleCopyMorningBriefReport(true)}
            className="btn btn-ghost btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
            }}
            title="隱私遮蔽總淨值與金額，僅保留權重%與損益%，安心複製給外部 AI"
          >
            {copiedPrivacyBrief ? <Check size={14} style={{ color: 'var(--gain-color)' }} /> : <EyeOff size={14} />}
            {copiedPrivacyBrief ? '已複製脫敏版' : '🔒 脫敏複製'}
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

      {/* 🌡️ 第一層：雙溫度計（長線總經配置 × 短線波段戰術）與台美費半跨市傳導四聯卡 (Ticket 04, 05, 06) */}
      <MacroDualThermometerBar
        macroSnapshot={macroSnapshot}
        dualThermometer={dualThermometer}
        activeMarketTab={marketView}
        onMarketTabChange={handleMarketTabChange}
        exDividendImpactPoints={exDividendImpactPoints}
      />

      {/* 📌 外部 AI 智囊團宏觀戰略釘選列 (Macro Strategy Loopback Pin - Ticket 10, Spec 0235 Ticket 06) */}
      <MacroStrategyPinBar
        pins={pinnedStrategies}
        onPasteAndPin={handlePasteAndPinStrategy}
        onRemovePin={handleRemovePinnedStrategy}
        currentSoxIndex={macroSnapshot.soxIndex}
        currentTaiexIndex={macroSnapshot.taiexIndex}
        currentEquityPercent={
          shield.totalNavTWD > 0
            ? Math.round((lookThroughReport.totalPortfolioNAV / shield.totalNavTWD) * 1000) / 10
            : 0
        }
        totalNavTwd={shield.totalNavTWD}
        privacyMode={privacyMode}
      />

      {/* 🛡️ 個人部位防禦護欄、真·自由子彈與 ETF 穿透曝險 (Ticket 07 & 08, Spec 0235 Ticket 03 整併版) */}
      <PortfolioShieldAndAmmoCard
        shield={shield}
        privacyMode={privacyMode}
        currentUsdToTwdRate={usdToTwdRate}
        isDoubleCold={isDoubleColdRegime(dualThermometer.strategicRegime.score, dualThermometer.tacticalSwing.score)}
        lookThroughReport={lookThroughReport}
        onOpenMarginStressModal={onOpenMarginStressModal}
        recommendedEquityCapPercent={dualThermometer.strategicRegime.recommendedEquityCapPercent}
        pinnedEquityCapPercent={pinnedStrategies[0]?.recommendedEquityCapPercent}
        currentEquityPercent={
          shield.totalNavTWD > 0
            ? Math.round((lookThroughReport.totalPortfolioNAV / shield.totalNavTWD) * 1000) / 10
            : 0
        }
      />

      {/* 🎯 在倉持股波段戰術雷達與一鍵執行閉環 (Ticket 09) */}
      <HoldingTacticalSignalsCard
        signals={holdingSignals}
        fomoChasingWarning={fomoChasingWarning}
        activeMarketTab={marketView}
        onResetMarketTab={() => handleMarketTabChange('GLOBAL')}
        onInspectTechnical={
          onInspectTechnical
            ? (sym) => {
              const matched = holdings.find((h) => h.symbol === sym);
              onInspectTechnical(sym, matched?.market || 'TW');
            }
            : undefined
        }
        onOpenAiForce={
          onOpenAiForce
            ? (sym) => {
              const matched = holdings.find((h) => h.symbol === sym);
              onOpenAiForce(sym, matched?.market || 'TW');
            }
            : undefined
        }
        onOpenTradeModal={
          onOpenTradeModal
            ? (sym, mkt) => {
              onOpenTradeModal(sym, mkt || 'TW');
            }
            : undefined
        }
        privacyMode={privacyMode}
      />

      {/* 🤖 AI 智慧每日作戰方針 (Spec 0235 Ticket 06 緊湊型互動晨報) */}
      <WarRoomMorningBriefCard
        morningBrief={morningBrief}
        asOfDate={macroSnapshot.date}
        holdingSymbols={holdings.filter((h) => h.shares > 0).map((h) => ({ symbol: h.symbol, market: h.market || 'TW' }))}
        onInspectTechnical={onInspectTechnical}
        onOpenTradeModal={onOpenTradeModal}
        privacyMode={privacyMode}
      />

      {/* 市場四柱即時脈搏與機構金絲雀 (Spec 0235 Ticket 04) */}
      <MarketPulseAndCanariesCard
        macroSnapshot={macroSnapshot}
        marketView={marketView}
        historyList={macroHistoryList}
        isRefreshing={isRefreshing}
        onRefreshPulse={handleRefreshPulse}
        onExportCsv={handleExportCsv}
      />

      {/* 🚀 第三層：雙重動能跨資產輪動排行榜 (Spec 0235 Ticket 07) */}
      <DualMomentumRotationCard
        universes={DEFAULT_MOMENTUM_UNIVERSES}
        selectedUniverseId={selectedUniverseId}
        onSelectUniverse={setSelectedUniverseId}
        momentumSignal={momentumSignal}
        asOfDate={macroSnapshot.date || new Date().toISOString().split('T')[0]}
        daysUntilMonthEnd={daysUntilMonthEnd}
        effectiveRiskFreeRate={effectiveRiskFreeRate}
        holdingMatchingSymbol={holdingMatchingSymbol}
        holdingWeightMap={holdingWeightMap}
        onInspectTechnical={onInspectTechnical}
        onOpenTradeModal={onOpenTradeModal}
      />

      {/* 📅 第四層：關鍵財經催化劑倒數日曆 (Spec 0235 Ticket 08) */}
      <CatalystCalendarCard
        catalysts={catalysts}
        marketView={marketView}
        onAddCustom={handleAddCustomCatalyst}
        onDeleteCustom={handleDeleteCustomCatalyst}
        onResetDefaults={handleResetCatalysts}
        onInspectTechnical={onInspectTechnical}
      />

      {/* ✏️ 快速數據校準 Modal */}
      <MacroQuickCalibrationModal
        isOpen={isCalibrateModalOpen}
        onClose={() => setIsCalibrateModalOpen(false)}
        macroSnapshot={macroSnapshot}
        onSave={applyCalibratedSnapshot}
      />
    </div>
  );
};
