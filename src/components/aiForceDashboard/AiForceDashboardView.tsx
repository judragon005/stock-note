import React, { useState, useEffect } from 'react';
import { MarketType, HoldingPosition } from '../../types/stock';
import { AiForceDashboardReport } from '../../types/aiForceDashboard';
import { createDefaultAiForceReport } from '../../engine/aiForceDashboardEngine';
import { Sparkles, Activity } from 'lucide-react';

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
  const [report, setReport] = useState<AiForceDashboardReport>(() =>
    createDefaultAiForceReport(initialSymbol, '致茂', initialMarket)
  );

  useEffect(() => {
    if (initialSymbol && initialSymbol !== symbol) {
      setSymbol(initialSymbol);
      setMarket(initialMarket);
      setReport(createDefaultAiForceReport(initialSymbol, '致茂', initialMarket));
    }
  }, [initialSymbol, initialMarket, symbol]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        minHeight: '80vh',
        color: 'var(--text-primary, #ffffff)',
      }}
    >
      {/* 頂部骨架占位 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 58, 138, 0.4) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} color="#60a5fa" />
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
            主力戰情室 (AI Force Decision Dashboard)
          </h2>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#93c5fd',
              border: '1px solid rgba(147, 197, 253, 0.3)',
              fontWeight: 600,
            }}
          >
            {report.symbol} {report.name} ({market})
          </span>
        </div>
      </div>

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
