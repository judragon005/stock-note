import React, { useState, useEffect } from 'react';
import { MarketType, HoldingPosition, PriceQuote } from '../../types/stock';
import { AiForceDashboardReport } from '../../types/aiForceDashboard';
import {
  createDefaultAiForceReport,
  generateAiForceReportFromCandles,
  RawInstitutionalRecord,
} from '../../engine/aiForceDashboardEngine';
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
import { BullBearEnergyCard } from './cards/BullBearEnergyCard';
import { HealthSummaryCard } from './cards/HealthSummaryCard';
import { DynamicSignalsCard } from './cards/DynamicSignalsCard';
import { MarketSentimentCard } from './cards/MarketSentimentCard';
import { AiConfidenceCard } from './cards/AiConfidenceCard';
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

export interface AiForceDashboardViewProps {
  initialSymbol?: string;
  initialMarket?: MarketType;
  holdings?: HoldingPosition[];
  initialReport?: AiForceDashboardReport;
}

export const AiForceDashboardView: React.FC<AiForceDashboardViewProps> = ({
  initialSymbol = '0050',
  initialMarket = 'TW',
  holdings: _holdings = [],
  initialReport,
}) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [market, setMarket] = useState<MarketType>(initialMarket);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AiForceTaskTabKey>('TASK_1_COMPREHENSIVE');
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
  const [report, setReport] = useState<AiForceDashboardReport>(
    () =>
      initialReport ||
      createDefaultAiForceReport(
        initialSymbol,
        resolveOfficialSecurityName(initialSymbol, initialMarket) || '元大台灣50',
        initialMarket
      )
  );

  const loadDataForSymbol = async (targetSymbol: string, targetMarket: MarketType) => {
    setIsLoading(true);
    setSymbol(targetSymbol);
    setMarket(targetMarket);
    const resolvedName = resolveOfficialSecurityName(targetSymbol, targetMarket) || targetSymbol;
    let quote:
      | (PriceQuote & { open?: number; high?: number; low?: number; volume?: number })
      | null
      | undefined = undefined;

    try {
      let candles: any[] = [];
      let institutionalRecords: RawInstitutionalRecord[] | undefined = undefined;
      let marginData:
        | { marginBalance?: number; shortBalance?: number; dayTradeRate?: number }
        | undefined = undefined;
      let tdccRecords: any[] | undefined = undefined;
      let revenueRecords: any[] | undefined = undefined;

      // 1. Layer 1: 優先嘗試從本地 SQLite 數據湖倉直讀歷史日 K、籌碼、集保與月營收 (Spec 0169)
      try {
        const lakehouseData = await loadSymbolFullLakehouseData(targetSymbol, targetMarket);
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
            lakehouseData.shortBalance !== undefined
          ) {
            marginData = {
              marginBalance: lakehouseData.marginBalance,
              shortBalance: lakehouseData.shortBalance,
              dayTradeRate: lakehouseData.dayTradeRate,
            };
          }
        }
      } catch (err) {
        logger.warn(`Lakehouse load failed for ${targetSymbol}, falling back to hybrid pipeline:`, err);
      }

      // 若湖倉無數據，降級走常規拉取管線 (Layer 2~3)
      if (candles.length === 0) {
        const res = await backfillSymbolOhlcvAndIndicators(targetSymbol, targetMarket, false);
        candles = res?.candles || [];
      }

      // 2. 嘗試抓取即時行情 (若失敗則由最新一根日 K 自適應)
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

      // 4. 取得注意與處置狀態 (Ticket 04)
      let resolvedStatusTag: 'NORMAL' | 'ATTENTION' | 'DISPOSITION' = 'NORMAL';
      if (targetMarket === 'TW') {
        try {
          resolvedStatusTag = await loadSymbolDispositionStatus(targetSymbol, targetMarket);
        } catch {
          resolvedStatusTag = 'NORMAL';
        }
      }

      // 5. 以真實數據合成 18 張卡片 Report (含法人籌碼動態連動，>= 1 根即可進行最後已知日 K 定錨)
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
          fallback.marketBar.dataSourceText = `⚠️ 查無此台股標的代碼 (${targetSymbol})，請確認代碼是否輸入正確（如 00403A、2330）`;
        }
        setReport(fallback);
      }
    } catch (err) {
      logger.warn(`Failed to backfill data for ${targetSymbol}, falling back to default:`, err);
      setReport(createDefaultAiForceReport(targetSymbol, resolvedName, targetMarket, quote?.price));
    } finally {
      setIsLoading(false);
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
        colorTheme={market === 'US' ? 'international' : 'taiwan'}
      />

      {/* 資料來源說明與 5 大量化匯出工具列 (照片第 2 列) */}
      <HeaderExportBar
        report={report}
        sourcesText={report.marketBar?.dataSourceText}
        rangeText={report.marketBar?.dataRangeText}
        onOpenDeepDive={() => setIsDeepDiveOpen(true)}
      />

      {/* 依據任務頁籤條件渲染視圖 */}
      {activeTab === 'TASK_1_COMPREHENSIVE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
          {/* Layer 1: 全盤態勢與趨勢主圖 (100% 滿版獨立大視野，看盤完全不壓迫) */}
          <div data-layer="1-kline" style={{ width: '100%', minWidth: 0 }}>
            <KLineChartCard
              data={report.klineSystem}
              colorTheme={market === 'US' ? 'international' : 'taiwan'}
            />
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
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.75) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                textAlign: 'center',
                gap: '16px',
                margin: '12px 0',
              }}
            >
              <div style={{ fontSize: '3rem' }}>🛰️</div>
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
                  }}
                >
                  {isLoading ? '📡 數據回補中...' : '📡 嘗試在線即時回補 250 日數據'}
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
                    colorTheme={market === 'US' ? 'international' : 'taiwan'}
                  />
                </div>

                {/* 19 TDCC 集保千張大戶趨勢 (近 10 週持股比變動) */}
                <div style={{ minWidth: 0, height: '100%' }}>
                  <TdccDistributionCard
                    data={report.tdccDistribution}
                    colorTheme={market === 'US' ? 'international' : 'taiwan'}
                  />
                </div>

                {/* 20 月營收與成長走勢 (近 12 個月營收 YoY 柱圖，含 ETF 自適應) */}
                <div style={{ minWidth: 0, height: '100%' }}>
                  <MonthlyRevenueCard
                    data={report.monthlyRevenue}
                    colorTheme={market === 'US' ? 'international' : 'taiwan'}
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

              {/* Layer 6: 短線能量、市場情緒與風控指標 (5 卡整齊矩陣) */}
              <div
                data-layer="6-energy-sentiment"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px',
                  alignItems: 'stretch',
                }}
              >
                {/* 10 AI 多空能量棒 */}
                <div style={{ minWidth: 0 }}>
                  <BullBearEnergyCard data={report.bullBearEnergy} />
                </div>

                {/* 11 健康度綜合評估表 */}
                <div style={{ minWidth: 0 }}>
                  <HealthSummaryCard data={report.healthSummary} />
                </div>

                {/* 12 AI 主力動態信號判斷 */}
                <div style={{ minWidth: 0 }}>
                  <DynamicSignalsCard data={report.dynamicSignals} />
                </div>

                {/* 13 台股市場合情緒儀表板 */}
                <div style={{ minWidth: 0 }}>
                  <MarketSentimentCard data={report.marketSentiment} />
                </div>

                {/* 14 AI 信心維度 */}
                <div style={{ minWidth: 0 }}>
                  <AiConfidenceCard data={report.aiConfidence} />
                </div>
              </div>

              {/* Layer 7: 籌碼收斂與終極作戰指令 (壓軸決策區，3 欄佈局) */}
              <div
                data-layer="7-verdict-command"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '12px',
                  alignItems: 'stretch',
                }}
              >
                {/* 欄 1: 15 籌碼異動摘要 + 09 隔日沖風險 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <ChipsSummaryCard data={report.chipsSummary} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <DayTradeRiskCard data={report.dayTradeRisk} />
                  </div>
                </div>

                {/* 欄 2: 16 買賣力分布 (68px) + 17 多空強度 (68px) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <ForceDistributionCard data={report.forceDistribution} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <BullBearStrengthCard data={report.bullBearStrength} />
                  </div>
                </div>

                {/* 欄 3: 18 主力追蹤總評判 (MLP-AI 作戰命令與操盤指南) */}
                <div style={{ minWidth: 0, height: '100%' }}>
                  <MainForceVerdictCard data={report.mainForceVerdict} />
                </div>
              </div>
            </>
          )}
    </div>
  )}

      {/* 任務二：技術警示報告 */}
      {activeTab === 'TASK_2_TECHNICAL_ALERTS' && <TechnicalAlertsView report={report} />}

      {/* 任務三：KD + MA 圖表 */}
      {activeTab === 'TASK_3_KD_MA' && <KdMaView report={report} />}

      {/* 任務四：MACD 圖表 */}
      {activeTab === 'TASK_4_MACD' && <MacdView report={report} />}

      {/* 任務五：原始資料表 */}
      {activeTab === 'TASK_5_RAW_DATA' && <RawDataView report={report} />}

      {/* 底部 5 大任務視圖切換器 (Ticket 31) */}
      <div style={{ marginTop: '8px', position: 'sticky', bottom: '12px', zIndex: 20 }}>
        <TaskViewsSwitcher activeTab={activeTab} onChangeTab={setActiveTab} />
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
          quote: {
            price: report.marketBar?.currentPrice || 0,
            change: report.marketBar?.change || 0,
            changePercent: report.marketBar?.changePercent || 0,
          },
          statusTag: report.marketBar?.marketStatusTag || 'NORMAL',
        }}
      />
    </div>
  );
};
