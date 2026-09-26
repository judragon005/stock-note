import React, { useState, useEffect } from 'react';
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
import { resolveOfficialSecurityName } from '../../engine/stockNameResolver';

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
  const [report, setReport] = useState<AiForceDashboardReport>(() =>
    createDefaultAiForceReport(initialSymbol, '致茂', initialMarket)
  );

  useEffect(() => {
    if (initialSymbol && initialSymbol !== symbol) {
      setSymbol(initialSymbol);
      setMarket(initialMarket);
      const name = resolveOfficialSecurityName(initialSymbol, initialMarket) || '致茂';
      setReport(createDefaultAiForceReport(initialSymbol, name, initialMarket));
    }
  }, [initialSymbol, initialMarket, symbol]);

  const handleAnalyze = (newSymbol: string, newMarket: MarketType) => {
    setIsLoading(true);
    setSymbol(newSymbol);
    setMarket(newMarket);
    const resolvedName = resolveOfficialSecurityName(newSymbol, newMarket) || newSymbol;
    setReport(createDefaultAiForceReport(newSymbol, resolvedName, newMarket));
    setTimeout(() => {
      setIsLoading(false);
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

      {/* 頂部標的搜尋輸入框與資料來源說明列 */}
      <HeaderQueryBar
        currentSymbol={symbol}
        currentName={report.name}
        currentMarket={market}
        isLoading={isLoading}
        onAnalyze={handleAnalyze}
      />

      {/* 核心網格佈局 (Bento Grid) */}
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

        {/* Row 3: 法人行為計量、隔日沖風險、多空能量儀 */}
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
      </div>
    </div>
  );
};
