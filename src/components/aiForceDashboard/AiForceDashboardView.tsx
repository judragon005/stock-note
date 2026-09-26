import React, { useState, useEffect } from 'react';
import { MarketType, HoldingPosition } from '../../types/stock';
import { AiForceDashboardReport } from '../../types/aiForceDashboard';
import {
  createDefaultAiForceReport,
  generateAiForceReportFromCandles,
  RawInstitutionalRecord,
} from '../../engine/aiForceDashboardEngine';
import { fetchRecentTwseReports } from '../../engine/smartMoneyFetcher';
import { backfillSymbolOhlcvAndIndicators } from '../../engine/historicalOhlcvBackfill';
import { fetchStockQuote } from '../../engine/priceFetcher';
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
import { HeaderExportBar } from './HeaderExportBar';
import { TaskViewsSwitcher } from './TaskViewsSwitcher';
import { TechnicalAlertsView, KdMaView, MacdView, RawDataView } from './TaskPanels';
import { resolveOfficialSecurityName } from '../../engine/stockNameResolver';
import type { AiForceTaskTabKey } from '../../types/aiForceDashboard';

export interface AiForceDashboardViewProps {
  initialSymbol?: string;
  initialMarket?: MarketType;
  holdings?: HoldingPosition[];
}

export const AiForceDashboardView: React.FC<AiForceDashboardViewProps> = ({
  initialSymbol = '2360',
  initialMarket = 'TW',
  holdings: _holdings = [],
}) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [market, setMarket] = useState<MarketType>(initialMarket);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AiForceTaskTabKey>('TASK_1_COMPREHENSIVE');
  const [report, setReport] = useState<AiForceDashboardReport>(() =>
    createDefaultAiForceReport(initialSymbol, '致茂', initialMarket)
  );

  const loadDataForSymbol = async (targetSymbol: string, targetMarket: MarketType) => {
    setIsLoading(true);
    setSymbol(targetSymbol);
    setMarket(targetMarket);
    const resolvedName = resolveOfficialSecurityName(targetSymbol, targetMarket) || targetSymbol;

    try {
      // 1. 同步拉取歷史日 K (至少 60~180 根，支援本地 IndexedDB 快取與增量更新)
      const res = await backfillSymbolOhlcvAndIndicators(targetSymbol, targetMarket, false);
      const candles = res?.candles || [];

      // 2. 嘗試抓取即時行情 (若失敗則由最新一根日 K 自適應)
      let quote: any = undefined;
      try {
        quote = await fetchStockQuote(targetSymbol, targetMarket);
      } catch {
        // 即時報價若失敗則安靜降級由日 K 替補
      }

      // 3. 嘗試讀取三大法人籌碼歷史記錄 (台股市場)
      let institutionalRecords: RawInstitutionalRecord[] | undefined = undefined;
      if (targetMarket === 'TW') {
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

      // 4. 以真實數據合成 18 張卡片 Report (含法人籌碼動態連動)
      if (candles.length >= 5) {
        const fullReport = generateAiForceReportFromCandles(
          targetSymbol,
          resolvedName,
          targetMarket,
          candles,
          quote,
          institutionalRecords
        );
        setReport(fullReport);
      } else {
        setReport(createDefaultAiForceReport(targetSymbol, resolvedName, targetMarket));
      }
    } catch (err) {
      logger.warn(`Failed to backfill data for ${targetSymbol}, falling back to default:`, err);
      setReport(createDefaultAiForceReport(targetSymbol, resolvedName, targetMarket));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDataForSymbol(initialSymbol, initialMarket);
  }, [initialSymbol, initialMarket]);

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
      <HeaderExportBar report={report} />

      {/* 依據任務頁籤條件渲染視圖 */}
      {activeTab === 'TASK_1_COMPREHENSIVE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
          {/* Row 1: 01 主K線 (100% 滿版獨立大視野，看盤完全不壓迫) */}
          <div style={{ width: '100%', minWidth: 0 }}>
            <KLineChartCard
              data={report.klineSystem}
              colorTheme={market === 'US' ? 'international' : 'taiwan'}
            />
          </div>

          {/* Row 2: 02 AI決策核心, 03 多維度判讀, 04 籌碼熱區圖, 05 風險雷達圖 (4 卡戰略定調與位階) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(240px, 1.15fr) minmax(200px, 1fr) minmax(200px, 1fr) minmax(200px, 1fr)',
              gap: '12px',
              alignItems: 'stretch',
            }}
          >
            {/* 02 AI 決策核心 */}
            <div style={{ minWidth: 0 }}>
              <AiDecisionCoreCard data={report.decisionCore} />
            </div>

            {/* 03 多維度判讀 */}
            <div style={{ minWidth: 0 }}>
              <MultiDimensionRadarCard data={report.multiDimensionRadar} />
            </div>

            {/* 04 AI 籌碼熱區圖 */}
            <div style={{ minWidth: 0 }}>
              <VolumeProfileCard data={report.volumeProfile} />
            </div>

            {/* 05 風險雷達圖 */}
            <div style={{ minWidth: 0 }}>
              <RiskSpiderCard data={report.riskSpider} />
            </div>
          </div>

          {/* Row 3: 06 累積型預測, 07 成本結構分布, 08 法人行為計量 (3 卡，08 享有 1.8fr 寬幅大空間) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(240px, 1.1fr) minmax(240px, 1.1fr) minmax(380px, 1.8fr)',
              gap: '12px',
              alignItems: 'stretch',
            }}
          >
            {/* 06 累積型 AI 預測路徑圖 */}
            <div style={{ minWidth: 0 }}>
              <ForecastConeCard data={report.forecastCone} />
            </div>

            {/* 07 主力成本結構分布圖 */}
            <div style={{ minWidth: 0 }}>
              <VwapCostStructureCard data={report.vwapCostStructure} />
            </div>

            {/* 08 法人行為計量 */}
            <div style={{ minWidth: 0 }}>
              <InstitutionalFlowCard
                data={report.institutionalFlow}
                colorTheme={market === 'US' ? 'international' : 'taiwan'}
              />
            </div>
          </div>

          {/* Row 4: 09 隔日沖風險, 10 多空能量棒, 11 健康度綜合評估 (3 卡，11 享有 1.6fr 寬幅放 5 環) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(240px, 1fr) minmax(240px, 1fr) minmax(360px, 1.6fr)',
              gap: '12px',
              alignItems: 'stretch',
            }}
          >
            {/* 09 隔日沖風險分析 */}
            <div style={{ minWidth: 0 }}>
              <DayTradeRiskCard data={report.dayTradeRisk} />
            </div>

            {/* 10 AI 多空能量棒 */}
            <div style={{ minWidth: 0 }}>
              <BullBearEnergyCard data={report.bullBearEnergy} />
            </div>

            {/* 11 健康度綜合評估表 */}
            <div style={{ minWidth: 0 }}>
              <HealthSummaryCard data={report.healthSummary} />
            </div>
          </div>

          {/* Row 5: 12 動態信號, 13 台股市場情緒, 14 AI信心, 15 籌碼摘要 (4 卡緊湊型監控) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(200px, 1fr) minmax(220px, 1.1fr) minmax(180px, 0.9fr) minmax(200px, 1fr)',
              gap: '12px',
              alignItems: 'stretch',
            }}
          >
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

            {/* 15 籌碼異動摘要 */}
            <div style={{ minWidth: 0 }}>
              <ChipsSummaryCard data={report.chipsSummary} />
            </div>
          </div>

          {/* Row 6: 16 買賣力分布, 17 多空強度分布, 18 主力追蹤總評判 (3 卡，18 享有 1.8fr 壓軸大面板) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(240px, 1.1fr) minmax(240px, 1.1fr) minmax(400px, 1.8fr)',
              gap: '12px',
              alignItems: 'stretch',
            }}
          >
            {/* 16 買賣力分布圖 */}
            <div style={{ minWidth: 0 }}>
              <ForceDistributionCard data={report.forceDistribution} />
            </div>

            {/* 17 多空強度分布 */}
            <div style={{ minWidth: 0 }}>
              <BullBearStrengthCard data={report.bullBearStrength} />
            </div>

            {/* 18 主力追蹤總評判 (MLP-AI) */}
            <div style={{ minWidth: 0 }}>
              <MainForceVerdictCard data={report.mainForceVerdict} />
            </div>
          </div>
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
    </div>
  );
};
