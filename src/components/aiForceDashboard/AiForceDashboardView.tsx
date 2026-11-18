import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Radio, SatelliteDish, ShieldAlert, Target, Zap } from 'lucide-react';
import {
  MarketType,
  HoldingPosition,
  PriceQuote,
  ApiKeysConfig,
  ColorThemeMode,
  LoanRecord,
} from '../../types/stock';
import { AiForceDashboardReport } from '../../types/aiForceDashboard';
import {
  createDefaultAiForceReport,
  generateAiForceReportFromCandles,
  RawInstitutionalRecord,
  GenerateReportOptions,
} from '../../engine/aiForceDashboardEngine';

export type DashboardValuationCombinedData = NonNullable<GenerateReportOptions['valuationData']>;
import { fetchRecentTwseReports } from '../../engine/smartMoneyFetcher';
import { backfillSymbolOhlcvAndIndicators } from '../../engine/historicalOhlcvBackfill';
import { fetchStockQuote } from '../../engine/priceFetcher';
import {
  loadSymbolDispositionStatus,
  loadSymbolFullLakehouseData,
} from '../../engine/marketCacheLoader';
import { logger } from '../../utils/logger';
import { HeaderMarketBar } from './HeaderMarketBar';
import { KLineChartCard } from './cards/KLineChartCard';
import { AiDecisionCoreCard } from './cards/AiDecisionCoreCard';
import { MultiDimensionRadarCard } from './cards/MultiDimensionRadarCard';
import { VolumeProfileCard } from './cards/VolumeProfileCard';
import { RiskSpiderCard } from './cards/RiskSpiderCard';
import { ForecastConeCard } from './cards/ForecastConeCard';
import { VwapCostStructureCard } from './cards/VwapCostStructureCard';
import { InstitutionalFlowCard } from './cards/InstitutionalFlowCard';
import { DayTradeRiskCard } from './cards/DayTradeRiskCard';
import { HealthSummaryCard } from './cards/HealthSummaryCard';
import { DynamicSignalsCard } from './cards/DynamicSignalsCard';
import { AiConfidenceCard } from './cards/AiConfidenceCard';
import { EnergySentimentTwinCard } from './cards/EnergySentimentTwinCard';
import { ValuationMetricsCard } from './cards/ValuationMetricsCard';
import { ChipsSummaryCard } from './cards/ChipsSummaryCard';
import { ForceDistributionCard } from './cards/ForceDistributionCard';
import { BullBearStrengthCard } from './cards/BullBearStrengthCard';
import { MainForceVerdictCard } from './cards/MainForceVerdictCard';
import { TdccDistributionCard } from './cards/TdccDistributionCard';
import { MonthlyRevenueCard } from './cards/MonthlyRevenueCard';
import { HeaderExportBar } from './HeaderExportBar';
import { TaskViewsSwitcher } from './TaskViewsSwitcher';
import { TechnicalAlertsView, KdMaView, MacdView, RawDataView } from './TaskPanels';
import { resolveOfficialSecurityName } from '../../engine/stockNameResolver';
import { EquityDeepDiveModal } from '../equityDeepDive/EquityDeepDiveModal';
import { useMarketCatchupSync } from '../../hooks/useMarketCatchupSync';
import type { AiForceTaskTabKey } from '../../types/aiForceDashboard';
import { WarRoomPromptCard } from './WarRoomPromptCard';
import { createWarRoomPromptDigest } from '../../engine/aiForcePromptAdapter';
import { loadOrFetchFinancialReport } from '../../engine/financialReportService';

export interface SymbolRequestGuard {
  next: () => number;
  isCurrent: (requestId: number) => boolean;
}

/**
 * 建立非同步標的載入競態防護器 (Spec 0237)
 */
export function createSymbolRequestGuard(): SymbolRequestGuard {
  let latestId = 0;
  return {
    next: () => {
      latestId += 1;
      return latestId;
    },
    isCurrent: (requestId: number) => requestId === latestId,
  };
}

export interface AiForceDashboardViewProps {
  initialSymbol?: string;
  initialMarket?: MarketType;
  holdings?: HoldingPosition[];
  initialReport?: AiForceDashboardReport;
  apiKeys?: ApiKeysConfig;
  colorTheme?: ColorThemeMode;
  loanRecords?: LoanRecord[];
}

export const AiForceDashboardView: React.FC<AiForceDashboardViewProps> = ({
  initialSymbol = '0050',
  initialMarket = 'TW',
  holdings: _holdings = [],
  initialReport,
  apiKeys,
  colorTheme,
  loanRecords = [],
}) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [market, setMarket] = useState<MarketType>(initialMarket);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AiForceTaskTabKey>('TASK_1_COMPREHENSIVE');
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
  const [macroMaintenanceRatio, setMacroMaintenanceRatio] = useState<number | undefined>(undefined);
  const requestGuardRef = useRef(createSymbolRequestGuard());
  const [report, setReport] = useState<AiForceDashboardReport>(
    () =>
      initialReport ||
      createDefaultAiForceReport(
        initialSymbol,
        resolveOfficialSecurityName(initialSymbol, initialMarket) || '元大台灣50',
        initialMarket
      )
  );

  const resolvedColorTheme: ColorThemeMode =
    colorTheme ?? (market === 'US' ? 'international' : 'taiwan');

  const userAvgCost = useMemo(() => {
    const matched = _holdings.filter(
      (h) => h.symbol.toUpperCase() === symbol.toUpperCase() && h.shares > 0
    );
    const totalShares = matched.reduce((sum, h) => sum + h.shares, 0);
    if (totalShares <= 0) return undefined;
    return matched.reduce((sum, h) => sum + h.avgCost * h.shares, 0) / totalShares;
  }, [_holdings, symbol]);

  // ⚡ 戰情室專屬高濃度提示詞特徵模型 (Spec 0181 / Ticket 16)
  const warRoomDigest = useMemo(() => {
    return createWarRoomPromptDigest(report, _holdings);
  }, [report, _holdings]);

  const loadDataForSymbol = async (targetSymbol: string, targetMarket: MarketType) => {
    const requestId = requestGuardRef.current.next();
    setIsLoading(true);
    setSymbol(targetSymbol);
    setMarket(targetMarket);
    setMacroMaintenanceRatio(undefined);
    const resolvedName = resolveOfficialSecurityName(targetSymbol, targetMarket) || targetSymbol;
    setReport(createDefaultAiForceReport(targetSymbol, resolvedName, targetMarket));
    let quote:
      | (PriceQuote & { open?: number; high?: number; low?: number; volume?: number })
      | null
      | undefined = undefined;

    try {
      let candles: any[] = [];
      let institutionalRecords: RawInstitutionalRecord[] | undefined = undefined;
      let marginData: GenerateReportOptions['marginData'] = undefined;
      let tdccRecords: any[] | undefined = undefined;
      let revenueRecords: any[] | undefined = undefined;
      let quarterlyValuationData: DashboardValuationCombinedData | undefined = undefined;
      let macroData: any = undefined;
      let pledgeData: GenerateReportOptions['pledge'] = undefined;
      let etfNavData: GenerateReportOptions['etfNav'] = undefined;
      let corporateActionsData: GenerateReportOptions['corporateActions'] = undefined;

      // 1. Layer 1: 優先嘗試從本地 SQLite 數據湖倉直讀歷史日 K、籌碼、集保與月營收 (Spec 0169 & Spec 0197)
      try {
        const lakehouseData = await loadSymbolFullLakehouseData(targetSymbol, targetMarket);
        if (!requestGuardRef.current.isCurrent(requestId)) return;
        if (lakehouseData && lakehouseData.candles.length >= 1) {
          candles = lakehouseData.candles;
          if (lakehouseData.institutionalRecords && lakehouseData.institutionalRecords.length > 0) {
            institutionalRecords = lakehouseData.institutionalRecords;
          }
          if (lakehouseData.tdccRecords && lakehouseData.tdccRecords.length > 0) {
            tdccRecords = lakehouseData.tdccRecords;
          }
          if (lakehouseData.revenueRecords && lakehouseData.revenueRecords.length > 0) {
            revenueRecords = lakehouseData.revenueRecords;
          }
          if (
            lakehouseData.marginBalance !== undefined ||
            lakehouseData.shortBalance !== undefined ||
            lakehouseData.dayTradeRate !== undefined ||
            lakehouseData.sblBalance !== undefined ||
            lakehouseData.marginBalanceChange !== undefined ||
            lakehouseData.shortBalanceChange !== undefined
          ) {
            marginData = {
              marginBalance: lakehouseData.marginBalance,
              shortBalance: lakehouseData.shortBalance,
              dayTradeRate: lakehouseData.dayTradeRate,
              sblBalance: lakehouseData.sblBalance,
              marginBalanceChange: lakehouseData.marginBalanceChange,
              shortBalanceChange: lakehouseData.shortBalanceChange,
            };
          }
          if (lakehouseData.valuation) {
            quarterlyValuationData = {
              pe: lakehouseData.valuation.pe,
              pb: lakehouseData.valuation.pb,
              dividendYield: lakehouseData.valuation.dividendYield,
              history: lakehouseData.valuation.history,
            };
          }
          if (lakehouseData.macro) {
            macroData = lakehouseData.macro;
            const rawMaint = lakehouseData.macro.tw_margin_maintenance_ratio;
            if (typeof rawMaint === 'number' && !isNaN(rawMaint) && rawMaint > 0) {
              setMacroMaintenanceRatio(rawMaint);
            }
          }
          if (lakehouseData.pledge) {
            pledgeData = lakehouseData.pledge;
          }
          if (lakehouseData.etfNav) {
            etfNavData = lakehouseData.etfNav;
          }
          if (lakehouseData.corporateActions && lakehouseData.corporateActions.length > 0) {
            corporateActionsData = lakehouseData.corporateActions;
          }
        }
      } catch (err) {
        logger.warn(`Lakehouse load failed for ${targetSymbol}, falling back to hybrid pipeline:`, err);
      }

      if (!requestGuardRef.current.isCurrent(requestId)) return;

      // 若湖倉無數據，降級走常規拉取管線 (Layer 2~3)
      if (candles.length === 0) {
        const res = await backfillSymbolOhlcvAndIndicators(targetSymbol, targetMarket, false);
        if (!requestGuardRef.current.isCurrent(requestId)) return;
        candles = res?.candles || [];
      }

      // ⚡ 階段一：若日 K 在庫 (>= 1 根)，0.3 秒立即首屏渲染，結束等待 (Spec 0197 Ticket 03)
      if (candles.length >= 1) {
        const firstPaintReport = generateAiForceReportFromCandles(
          targetSymbol,
          resolvedName,
          targetMarket,
          candles,
          undefined,
          institutionalRecords,
          undefined,
          {
            statusTag: 'NORMAL',
            currency: targetMarket === 'US' ? 'USD' : 'TWD',
            volumeUnit: targetMarket === 'US' ? '股' : '張',
            marginData,
            tdccRecords,
            revenueRecords,
            valuationData: quarterlyValuationData,
            macroData,
            pledge: pledgeData,
            etfNav: etfNavData,
            corporateActions: corporateActionsData,
          }
        );
        firstPaintReport.marketBar.dataSourceText = `本地盤後歷史資料庫 (共 ${candles.length} 日 K)`;
        if (!requestGuardRef.current.isCurrent(requestId)) return;
        setReport(firstPaintReport);
        setIsLoading(false);
      }

      // ⚡ 階段二：背景非同步增量增強（即時報價、處置狀態與單季財報）
      // 2. 嘗試抓取即時行情 (非阻塞背景執行)
      let resolvedStatusTag: 'NORMAL' | 'ATTENTION' | 'DISPOSITION' = 'NORMAL';
      try {
        quote = await fetchStockQuote(targetSymbol, targetMarket);
      } catch {
        // 即時報價若失敗則安靜降級由日 K 替補
      }

      // 3. 若尚未取得法人籌碼且為台股市場，嘗試從網路拉取三大法人籌碼歷史記錄
      if (!institutionalRecords && targetMarket === 'TW') {
        try {
          const reports = await fetchRecentTwseReports(20);
          if (reports && reports.length > 0) {
            const cleanSym = targetSymbol.replace(/\.(TW|TWO)$/i, '').trim();
            const extracted: RawInstitutionalRecord[] = [];
            for (const r of reports) {
              const row = r.data[cleanSym] || r.data[targetSymbol];
              if (row) {
                const formattedDate =
                  r.date.length === 8
                    ? `${r.date.substring(0, 4)}-${r.date.substring(4, 6)}-${r.date.substring(6, 8)}`
                    : r.date;
                extracted.push({
                  date: formattedDate,
                  foreignShares: row.foreignNetShares,
                  trustShares: row.trustNetShares,
                  dealerShares: row.dealerNetShares,
                });
              }
            }
            if (extracted.length > 0) {
              institutionalRecords = extracted;
            }
          }
        } catch {
          // 籌碼查詢靜默容錯降級
        }
      }

      // 4. 取得注意與處置狀態
      if (targetMarket === 'TW') {
        try {
          resolvedStatusTag = await loadSymbolDispositionStatus(targetSymbol, targetMarket);
        } catch {
          resolvedStatusTag = 'NORMAL';
        }
      }

      // 4.5 嘗試載入單季財報 EPS/毛利 (Spec 0196 & Spec 0197)
      try {
        const forensic = await loadOrFetchFinancialReport(targetSymbol, targetMarket, resolvedName, {
          fmpApiKey: apiKeys?.fmpApiKey,
          finmindToken: apiKeys?.finmindToken,
        });
        if (!requestGuardRef.current.isCurrent(requestId)) return;
        if (forensic && Array.isArray(forensic.historicalRecords) && forensic.historicalRecords.length > 0) {
          const sorted = [...forensic.historicalRecords].sort((a, b) => (b.year * 10 + b.quarter) - (a.year * 10 + a.quarter));
          const latestQ = sorted[0];
          if (latestQ && latestQ.income) {
            const rev = typeof latestQ.income.revenue === 'number' ? latestQ.income.revenue : 0;
            const grossProfit = typeof latestQ.income.grossProfit === 'number' ? latestQ.income.grossProfit : undefined;
            const operatingIncome = typeof latestQ.income.operatingIncome === 'number' ? latestQ.income.operatingIncome : undefined;

            const grossMargin = rev > 0 && grossProfit !== undefined
              ? Number(((grossProfit / rev) * 100).toFixed(2))
              : undefined;
            const operatingMargin = rev > 0 && operatingIncome !== undefined
              ? Number(((operatingIncome / rev) * 100).toFixed(2))
              : undefined;

            quarterlyValuationData = {
              ...(quarterlyValuationData || {}),
              eps: typeof latestQ.income.eps === 'number' ? latestQ.income.eps : null,
              quarterName: latestQ.year && latestQ.quarter ? `${latestQ.year}Q${latestQ.quarter}` : undefined,
              grossMargin,
              operatingMargin,
            };
          }
        }
      } catch (err) {
        logger.warn(`[AiForceDashboard] 載入 ${targetSymbol} 歷史單季財報時發生非致命異常，優雅降級:`, err);
      }

      if (!requestGuardRef.current.isCurrent(requestId)) return;

      // 5. 背景增量補強後二次渲染
      if (candles.length >= 1) {
        const fullReport = generateAiForceReportFromCandles(
          targetSymbol,
          resolvedName,
          targetMarket,
          candles,
          quote || undefined,
          institutionalRecords,
          undefined,
          {
            statusTag: resolvedStatusTag,
            currency: targetMarket === 'US' ? 'USD' : 'TWD',
            volumeUnit: targetMarket === 'US' ? '股' : '張',
            marginData,
            tdccRecords,
            revenueRecords,
            valuationData: quarterlyValuationData,
            macroData,
            pledge: pledgeData,
            etfNav: etfNavData,
            corporateActions: corporateActionsData,
          }
        );
        if (!quote && targetMarket === 'TW') {
          fullReport.marketBar.dataSourceText = `本地盤後歷史資料庫 (共 ${candles.length} 日 K)`;
        }
        setReport(fullReport);
      } else {
        const fallback = createDefaultAiForceReport(targetSymbol, resolvedName, targetMarket, quote?.price);
        fallback.marketBar.marketStatusTag = resolvedStatusTag;
        if (quote) {
          fallback.marketBar.currentPrice = quote.price;
          if (quote.change !== undefined) fallback.marketBar.change = quote.change;
          if (quote.changePercent !== undefined) fallback.marketBar.changePercent = quote.changePercent;
          if (quote.open !== undefined) fallback.marketBar.openPrice = quote.open;
          if (quote.high !== undefined) fallback.marketBar.highPrice = quote.high;
          if (quote.low !== undefined) fallback.marketBar.lowPrice = quote.low;
          if (quote.volume !== undefined) fallback.marketBar.volumeShares = quote.volume;
        } else if (resolvedName === targetSymbol) {
          fallback.marketBar.dataSourceText = `查無此台股標的代碼 (${targetSymbol})，請確認代碼是否輸入正確（如 00403A、2330）`;
        }
        setReport(fallback);
      }
    } catch (err) {
      logger.warn(`Failed to backfill data for ${targetSymbol}, falling back to default:`, err);
      if (requestGuardRef.current.isCurrent(requestId)) {
        setReport(createDefaultAiForceReport(targetSymbol, resolvedName, targetMarket, quote?.price));
      }
    } finally {
      if (requestGuardRef.current.isCurrent(requestId)) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDataForSymbol(initialSymbol, initialMarket);
  }, [initialSymbol, initialMarket]);

  const handleMarketCatchupCompleted = React.useCallback(() => {
    loadDataForSymbol(symbol, market);
  }, [symbol, market]);

  useMarketCatchupSync({
    onSyncCompleted: handleMarketCatchupCompleted,
  });

  const handleAnalyze = (newSymbol: string, newMarket: MarketType) => {
    loadDataForSymbol(newSymbol, newMarket);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%',
        minHeight: '80vh',
        color: 'var(--text-primary, #ffffff)',
      }}
    >
      {/* 頂部即時行情總覽、系統狀態與標的輸入 Bar (照片第 1 列) */}
      <HeaderMarketBar
        data={report.marketBar}
        currentSymbol={symbol}
        currentName={report.name}
        isLoading={isLoading}
        onAnalyze={handleAnalyze}
        colorTheme={resolvedColorTheme}
        holdings={_holdings}
        vwapCost={report.vwapCostStructure?.mainForceVwap}
      />

      {/* 資料來源說明與 5 大量化匯出工具列 (照片第 2 列) */}
      <HeaderExportBar
        report={report}
        sourcesText={report.marketBar?.dataSourceText}
        rangeText={report.marketBar?.dataRangeText}
        onOpenDeepDive={() => setIsDeepDiveOpen(true)}
      />

      {/* 頂部 5 大任務視圖切換器 (Obsidian De-Slop: 置頂於匯出列下方) */}
      <TaskViewsSwitcher activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* 依據任務頁籤條件渲染視圖 */}
      {activeTab === 'TASK_1_COMPREHENSIVE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
          {/* ZONE 01: 價格結構與主力總判 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 2px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#94a3b8',
            }}
          >
            <span>ZONE 01 // 價格結構與主力總判</span>
          </div>

          {/* Layer 1: 全盤態勢與趨勢主圖 (100% 滿版獨立大視野，看盤完全不壓迫) */}
          <div data-layer="1-kline" style={{ width: '100%', minWidth: 0 }}>
            <KLineChartCard
              data={report.klineSystem}
              colorTheme={resolvedColorTheme}
              {...(userAvgCost !== undefined ? { userAvgCost } : {})}
            />
          </div>

          {/* 首屏決策摘要帶 (Executive Tactical Verdict Strip) */}
          <div
            data-testid="executive-verdict-strip"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: '#0B101B',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 360px', minWidth: 0 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(56, 189, 248, 0.14)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                }}
              >
                <Zap size={13} />
                <span>{report.mainForceVerdict.primaryVerb}</span>
              </span>
              <span style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                {report.decisionCore.xaiExplanation || report.mainForceVerdict.fullVerdictText}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', flexShrink: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f87171' }}>
                <ShieldAlert size={13} />
                <span>停損防線</span>
                <strong style={{ color: '#f8fafc' }}>
                  {report.mainForceVerdict.stopLossPrice !== undefined
                    ? report.mainForceVerdict.stopLossPrice.toFixed(2)
                    : '-'}
                </strong>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#34d399' }}>
                <Target size={13} />
                <span>停利目標</span>
                <strong style={{ color: '#f8fafc' }}>
                  {report.mainForceVerdict.takeProfitPrice !== undefined
                    ? report.mainForceVerdict.takeProfitPrice.toFixed(2)
                    : '-'}
                </strong>
              </span>
            </div>
          </div>

          {/* 若處於無真實資料待命狀態 (report.isDataPending)，展示高質感毛玻璃空狀態引導面板 (Ticket 07 / Spec 0162) */}
          {report.isDataPending ? (
            <div
              data-testid="ai-force-empty-state-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                background: '#0B101B',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                textAlign: 'center',
                gap: '16px',
                margin: '12px 0',
              }}
            >
              <div style={{ color: '#38bdf8' }}>
                <SatelliteDish size={42} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                查無此標的真實數據（{symbol}）
              </div>
              <div style={{ fontSize: '0.88rem', color: '#94a3b8', maxWidth: '520px', lineHeight: 1.6 }}>
                系統嚴格秉持 <b>Zero-Mock Policy</b>（杜絕任何捏造之假價格與假 K 棒），標的【{symbol}】目前在本地歷史數據湖倉中尚無足夠之 250 日真實日 K 或籌碼資料。您可以點擊下方按鈕嘗試在線連線回補，或切換至已收錄的核心個股。
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
                <button
                  type="button"
                  data-testid="btn-online-backfill"
                  disabled={isLoading}
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      const res = await backfillSymbolOhlcvAndIndicators(symbol, market, true);
                      if (res && res.candles.length >= 1) {
                        await loadDataForSymbol(symbol, market);
                      }
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Radio size={14} />
                  <span>{isLoading ? '數據回補中...' : '嘗試在線即時回補 250 日數據'}</span>
                </button>
                <button
                  type="button"
                  data-testid="btn-quick-switch-0050"
                  onClick={() => handleAnalyze('0050', 'TW')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  切換至 0050
                </button>
                <button
                  type="button"
                  data-testid="btn-quick-switch-2330"
                  onClick={() => handleAnalyze('2330', 'TW')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  切換至 2330
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ZONE 02: AI 多維量化雷達與價格位階 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 2px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: '#94a3b8',
                }}
              >
                <span>ZONE 02 // AI 多維量化雷達與價格位階</span>
              </div>

              {/* Layer 2: AI 核心定調與雙雷達全景 (Half Width: 1 欄 2 卡，大視野展開，寬度均 >= 480px / minmax(440px, 1fr)) */}
              <div
                data-layer="2-radars"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
                  gap: '12px',
                  alignItems: 'stretch',
                }}
              >
                {/* 03 多維度判讀 (6 維體質大雷達) */}
                <div style={{ minWidth: 0 }}>
                  <MultiDimensionRadarCard data={report.multiDimensionRadar} />
                </div>

                {/* 05 風險雷達圖 (5 維風控大蛛網) */}
                <div style={{ minWidth: 0 }}>
                  <RiskSpiderCard data={report.riskSpider} />
                </div>
              </div>

              {/* Layer 3: 價格位階與籌碼戰場 (Half Width: 1 欄 2 卡) */}
              <div
                data-layer="3-position-chips"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
                  gap: '12px',
                  alignItems: 'stretch',
                }}
              >
                {/* 02 AI 決策核心 (訊號儀表盤) */}
                <div style={{ minWidth: 0 }}>
                  <AiDecisionCoreCard data={report.decisionCore} />
                </div>

                {/* 04 AI 籌碼熱區圖 (動態量價與現價指針) */}
                <div style={{ minWidth: 0 }}>
                  <VolumeProfileCard data={report.volumeProfile} />
                </div>
              </div>

              {/* ZONE 03: 籌碼大數據與估值動能 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 2px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: '#94a3b8',
                }}
              >
                <span>ZONE 03 // 籌碼大數據與估值動能</span>
              </div>

              {/* Layer 4: 主力籌碼與基本面大數據 (3 卡寬幅戰區，5 欄表格無擠壓) */}
              <div
                data-layer="4-big-data"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                  gap: '12px',
                  alignItems: 'stretch',
                }}
              >
                {/* 08 法人行為計量 */}
                <div style={{ minWidth: 0, height: '100%' }}>
                  <InstitutionalFlowCard
                    data={report.institutionalFlow}
                    colorTheme={resolvedColorTheme}
                  />
                </div>

                {/* 19 TDCC 集保千張大戶趨勢 (近 10 週持股比變動) */}
                <div style={{ minWidth: 0, height: '100%' }}>
                  <TdccDistributionCard
                    key={symbol}
                    data={report.tdccDistribution}
                    colorTheme={resolvedColorTheme}
                  />
                </div>

                {/* 20 月營收與成長走勢 (近 12 個月營收 YoY 柱圖，含 ETF 自適應) */}
                <div style={{ minWidth: 0, height: '100%' }}>
                  <MonthlyRevenueCard
                    data={report.monthlyRevenue}
                    colorTheme={resolvedColorTheme}
                  />
                </div>
              </div>

              {/* Layer 5: 預測路徑與成本結構 (Half Width: 1 欄 2 卡) */}
              <div
                data-layer="5-path-cost"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
                  gap: '12px',
                  alignItems: 'stretch',
                }}
              >
                {/* 06 累積型 AI 預測路徑圖 (Cone) */}
                <div style={{ minWidth: 0 }}>
                  <ForecastConeCard data={report.forecastCone} />
                </div>

                {/* 07 主力成本結構分布圖 (VWAP) */}
                <div style={{ minWidth: 0 }}>
                  <VwapCostStructureCard data={report.vwapCostStructure} />
                </div>
              </div>

              {/* Layer 6: AI 多空 × 市場情緒雙子容器、主力動態信號、估值矩陣、AI 信心維度 (Spec 0199: 升級至 minHeight 315px 自適應拉伸) */}
              <div
                data-layer="6-energy-sentiment"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
                  gap: '12px',
                  alignItems: 'stretch',
                  minHeight: '315px',
                }}
              >
                {/* 欄 1: 10 + 13 AI 多空 × 市場情緒雙子容器 */}
                <div style={{ minWidth: 0, height: '100%', minHeight: '315px', display: 'flex', flexDirection: 'column' }}>
                  <EnergySentimentTwinCard
                    bullBearData={report.bullBearEnergy}
                    sentimentData={report.marketSentiment}
                    market={market}
                  />
                </div>

                {/* 欄 2: 12 AI 主力動態信號判斷 */}
                <div style={{ minWidth: 0, height: '100%', minHeight: '315px', display: 'flex', flexDirection: 'column' }}>
                  <DynamicSignalsCard data={report.dynamicSignals} />
                </div>

                {/* 欄 3: 21 估值與殖利率量化矩陣 */}
                <div style={{ minWidth: 0, height: '100%', minHeight: '315px', display: 'flex', flexDirection: 'column' }}>
                  <ValuationMetricsCard data={report.valuationMetrics} market={market} />
                </div>

                {/* 欄 4: 14 AI 信心維度 */}
                <div style={{ minWidth: 0, height: '100%', minHeight: '315px', display: 'flex', flexDirection: 'column' }}>
                  <AiConfidenceCard data={report.aiConfidence} />
                </div>
              </div>

              {/* ZONE 04: 風險控管與主力終極定調 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 2px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: '#94a3b8',
                }}
              >
                <span>ZONE 04 // 風險控管與主力終極定調</span>
              </div>

              {/* Layer 7: 籌碼收斂與體質定調 (Spec 0211: 雙欄自適應對稱矩陣，左 15+09，右 11+16+17) */}
              <div
                data-layer="7-chips-health-matrix"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
                  gap: '12px',
                  alignItems: 'stretch',
                }}
              >
                {/* 欄 1: 15 籌碼異動摘要 + 09 隔日沖風險 (微觀籌碼動向與短線防護) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, height: '100%' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <ChipsSummaryCard data={report.chipsSummary} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <DayTradeRiskCard data={report.dayTradeRisk} />
                  </div>
                </div>

                {/* 欄 2: 11 健康度綜合評估表 + 16 買賣力分布 + 17 多空強度 (結構健康度與多空籌碼對抗，圓環徹底舒展) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, height: '100%' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <HealthSummaryCard data={report.healthSummary} />
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '8px',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <ForceDistributionCard data={report.forceDistribution} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <BullBearStrengthCard data={report.bullBearStrength} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Layer 8: 18 主力追蹤總評判 (Spec 0211: 100% 滿版旗艦作戰指令列，如同 Card 01 頂部獨立大視野) */}
              <div
                data-layer="8-main-force-verdict-deck"
                style={{
                  width: '100%',
                  minWidth: 0,
                }}
              >
                <MainForceVerdictCard data={report.mainForceVerdict} />
              </div>
            </>
          )}
        </div>
      )}

      {/* 任務二：技術警示報告 */}
      {activeTab === 'TASK_2_TECHNICAL_ALERTS' && (
        <TechnicalAlertsView
          report={report}
          holdings={_holdings}
          loanRecords={loanRecords}
          macroMaintenanceRatio={macroMaintenanceRatio}
        />
      )}

      {/* 任務三：KD + MA 圖表 */}
      {activeTab === 'TASK_3_KD_MA' && <KdMaView report={report} />}

      {/* 任務四：MACD 圖表 */}
      {activeTab === 'TASK_4_MACD' && <MacdView report={report} />}

      {/* 任務五：原始資料表 */}
      {activeTab === 'TASK_5_RAW_DATA' && <RawDataView report={report} />}

      {/* ⚡ 全域外聯 AI 戰情提示詞中樞 (Spec 0181 / Issue #243 / Spec 0182) */}
      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
        <WarRoomPromptCard
          digest={warRoomDigest}
          isLoading={isLoading}
          isDataPending={report.isDataPending}
        />
      </div>

      {/* 7 步深度投研與決策閉環 Modal (Debt #0037 / Spec 0173) */}
      <EquityDeepDiveModal
        isOpen={isDeepDiveOpen}
        onClose={() => setIsDeepDiveOpen(false)}
        symbol={symbol}
        market={market}
        name={report.name || symbol}
        reportContext={report}
        holdings={_holdings}
        input={{
          symbol,
          name: report.name || symbol,
          market,
          candles: report.klineSystem.candles,
          institutionalRecords: report.institutionalFlow.history,
          boxFloorPrice: report.klineSystem.keyLevels.supportLevel,
          boxCeilingPrice: report.klineSystem.keyLevels.highResistance,
          quote: {
            price: report.marketBar?.currentPrice || 0,
            change: report.marketBar?.change || 0,
            changePercent: report.marketBar?.changePercent || 0,
            pe: report.valuationMetrics?.pe ?? undefined,
            pb: report.valuationMetrics?.pb ?? undefined,
            dividendYield: report.valuationMetrics?.dividendYield ?? undefined,
          },
          statusTag: report.marketBar?.marketStatusTag || 'NORMAL',
          sblBalance: report.dayTradeRisk?.sblBalance,
          apiKeys,
        }}
      />
    </div>
  );
};
