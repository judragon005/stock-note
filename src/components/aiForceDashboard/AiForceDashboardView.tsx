import React, { useState, useEffect } from 'react';
import { MarketType, HoldingPosition } from '../../types/stock';
import { AiForceDashboardReport } from '../../types/aiForceDashboard';
import { createDefaultAiForceReport } from '../../engine/aiForceDashboardEngine';
import { HeaderMarketBar } from './HeaderMarketBar';
import { HeaderQueryBar } from './HeaderQueryBar';
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

      {/* 內容區骨架 */}
      <div
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '14px',
          border: '1px dashed rgba(59, 130, 246, 0.25)',
          color: 'var(--text-secondary, #94a3b8)',
        }}
      >
        <Activity size={36} color="#3b82f6" style={{ marginBottom: '12px', opacity: 0.8 }} />
        <h3 style={{ margin: '0 0 8px 0', color: '#f1f5f9', fontSize: '1.05rem' }}>
          AI 主力行為判讀與量化決策系統
        </h3>
        <p style={{ margin: 0, fontSize: '0.85rem' }}>
          資料契約與工作區框架就緒，即將透過原子化票券依序渲染 18 大卡片與全景視覺。
        </p>
      </div>
    </div>
  );
};
