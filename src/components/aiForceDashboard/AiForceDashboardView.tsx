import React, { useState, useEffect, useRef } from 'react';
import { MarketType, HoldingPosition } from '../../types/stock';
import { AiForceDashboardReport } from '../../types/aiForceDashboard';
import { createDefaultAiForceReport } from '../../engine/aiForceDashboardEngine';
import { HeaderMarketBar } from './HeaderMarketBar';
import { HeaderQueryBar } from './HeaderQueryBar';
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
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (analyzeTimerRef.current) {
        clearTimeout(analyzeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (initialSymbol && initialSymbol !== symbol) {
      setSymbol(initialSymbol);
      setMarket(initialMarket);
      const name = resolveOfficialSecurityName(initialSymbol, initialMarket) || '致茂';
      setReport(createDefaultAiForceReport(initialSymbol, name, initialMarket));
    }
  }, [initialSymbol, initialMarket, symbol]);

  const handleAnalyze = (newSymbol: string, newMarket: MarketType) => {
    if (analyzeTimerRef.current) {
      clearTimeout(analyzeTimerRef.current);
    }
    setIsLoading(true);
    setSymbol(newSymbol);
    setMarket(newMarket);
    const resolvedName = resolveOfficialSecurityName(newSymbol, newMarket) || newSymbol;
    setReport(createDefaultAiForceReport(newSymbol, resolvedName, newMarket));
    analyzeTimerRef.current = setTimeout(() => {
      setIsLoading(false);
      analyzeTimerRef.current = null;
    }, 250);
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
      {/* 頂部即時行情總覽與系統狀態 Bar */}
      <HeaderMarketBar data={report.marketBar} colorTheme={market === 'US' ? 'international' : 'taiwan'} />

      {/* 5 大量化工具與報告匯出工具列 (Ticket 32) */}
      <HeaderExportBar report={report} />

      {/* 頂部標的搜尋輸入框與資料來源說明列 */}
      <HeaderQueryBar
        currentSymbol={symbol}
        currentName={report.name}
        currentMarket={market}
        isLoading={isLoading}
        onAnalyze={handleAnalyze}
      />

      {/* 依據任務頁籤條件渲染視圖 */}
      {activeTab === 'TASK_1_COMPREHENSIVE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
          {/* Row 1: 主 K 線、決策核心、多維度雷達 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(450px, 2fr) minmax(280px, 1.1fr) minmax(280px, 1fr)',
              gap: '14px',
              alignItems: 'stretch',
            }}
          >
            {/* 01 主 K 線 */}
            <div>
              <KLineChartCard
                data={report.klineSystem}
                colorTheme={market === 'US' ? 'international' : 'taiwan'}
              />
            </div>

            {/* 02 AI 決策核心 (Ticket 06) */}
            <div>
              <AiDecisionCoreCard data={report.decisionCore} />
            </div>

            {/* 03 多維度判讀 (Ticket 07) */}
            <div>
              <MultiDimensionRadarCard data={report.multiDimensionRadar} />
            </div>
          </div>

          {/* Row 2: 籌碼熱區、風險蛛網、預測路徑等 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '14px',
              alignItems: 'stretch',
            }}
          >
            {/* 04 AI 籌碼熱區圖 (Ticket 09) */}
            <div>
              <VolumeProfileCard data={report.volumeProfile} />
            </div>

            {/* 05 風險雷達圖 (Ticket 11) */}
            <div>
              <RiskSpiderCard data={report.riskSpider} />
            </div>

            {/* 06 累積型 AI 預測路徑圖 (Ticket 13) */}
            <div>
              <ForecastConeCard data={report.forecastCone} />
            </div>

            {/* 07 主力成本結構分布圖 (Ticket 15) */}
            <div>
              <VwapCostStructureCard data={report.vwapCostStructure} />
            </div>
          </div>

          {/* Row 3: 法人行為計量、隔日沖風險 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(500px, 1.8fr) minmax(320px, 1fr)',
              gap: '14px',
              alignItems: 'stretch',
            }}
          >
            {/* 08 法人行為計量 (Ticket 16 & 17) */}
            <div>
              <InstitutionalFlowCard
                data={report.institutionalFlow}
                colorTheme={market === 'US' ? 'international' : 'taiwan'}
              />
            </div>

            {/* 09 隔日沖風險分析 (Ticket 19) */}
            <div>
              <DayTradeRiskCard data={report.dayTradeRisk} />
            </div>
          </div>

          {/* Row 4: 多空能量儀、健康度評估表、動態信號判斷、市場情緒儀表板 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px',
              alignItems: 'stretch',
            }}
          >
            {/* 10 AI 多空能量儀 (Ticket 20) */}
            <div>
              <BullBearEnergyCard data={report.bullBearEnergy} />
            </div>

            {/* 11 健康度綜合評估表 (Ticket 21) */}
            <div>
              <HealthSummaryCard data={report.healthSummary} />
            </div>

            {/* 12 AI 主力動態信號判斷 (Ticket 22) */}
            <div>
              <DynamicSignalsCard data={report.dynamicSignals} />
            </div>

            {/* 13 台股市場合情緒儀表板 (Ticket 24) */}
            <div>
              <MarketSentimentCard data={report.marketSentiment} />
            </div>
          </div>

          {/* Row 5: AI 信心維度、籌碼具體摘要、買賣力分布、多空強度分布 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px',
              alignItems: 'stretch',
            }}
          >
            {/* 14 AI 信心維度 (Ticket 25) */}
            <div>
              <AiConfidenceCard data={report.aiConfidence} />
            </div>

            {/* 15 籌碼具體摘要 (Ticket 26) */}
            <div>
              <ChipsSummaryCard data={report.chipsSummary} />
            </div>

            {/* 16 買賣力分布圖 (Ticket 27) */}
            <div>
              <ForceDistributionCard data={report.forceDistribution} />
            </div>

            {/* 17 多空強度分布 (Ticket 28) */}
            <div>
              <BullBearStrengthCard data={report.bullBearStrength} />
            </div>
          </div>

          {/* Row 6: 18 主力追蹤總評判 (MLP-AI) (Ticket 30) */}
          <div>
            <MainForceVerdictCard data={report.mainForceVerdict} />
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
