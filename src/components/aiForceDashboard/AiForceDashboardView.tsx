import React, { useState, useEffect } from 'react';
import { MarketType, HoldingPosition } from '../../types/stock';
import { AiForceDashboardReport } from '../../types/aiForceDashboard';
import { createDefaultAiForceReport } from '../../engine/aiForceDashboardEngine';
import { HeaderMarketBar } from './HeaderMarketBar';
import { HeaderQueryBar } from './HeaderQueryBar';
import { KLineChartCard } from './cards/KLineChartCard';
import { resolveOfficialSecurityName } from '../../engine/stockNameResolver';
import { Activity } from 'lucide-react';

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
        {/* Row 1: 主 K 線與決策卡片 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(450px, 1.8fr) minmax(280px, 1.2fr)',
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

          {/* 右側決策核心占位 (供 Ticket 06~11 依序替換) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '14px',
              border: '1px dashed rgba(59, 130, 246, 0.2)',
              padding: '20px',
              color: '#64748b',
              fontSize: '0.85rem',
              textAlign: 'center',
            }}
          >
            <Activity size={28} color="#3b82f6" style={{ marginBottom: '8px', opacity: 0.6 }} />
            <span>AI 決策核心、多維度雷達、籌碼熱區與風險蛛網</span>
            <span style={{ fontSize: '0.72rem', color: '#475569', marginTop: '4px' }}>
              即將由 Ticket 05 ~ 11 依序掛載
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
