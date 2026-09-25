import React, { useState } from 'react';
import { MarketType } from '../../types/stock';
import { resolveOfficialSecurityName } from '../../engine/stockNameResolver';
import { Search, Play, RefreshCw, Database } from 'lucide-react';

/**
 * 清理並正規化股票代號輸入
 */
export function cleanSymbolInput(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .toUpperCase()
    .replace(/\.(TW|TWO)$/i, '');
}

/**
 * 依據代號特徵推斷市場別 (TW vs US)
 */
export function inferMarketType(symbol: string): MarketType {
  const clean = cleanSymbolInput(symbol);
  // 純數字代表台股 (上市或上櫃)
  if (/^\d+$/.test(clean)) {
    return 'TW';
  }
  return 'US';
}

export interface DataProvenanceConfig {
  sources: string[];
  startDate: string;
  endDate: string;
  totalTradingDays: number;
  institutionalDays: number;
}

/**
 * 組合資料來源與時間區間標籤字串
 */
export function buildDataProvenanceText(config: DataProvenanceConfig): {
  sourcesText: string;
  rangeText: string;
} {
  const sourcesText = `資料來源：${config.sources.join(' | ')}`;
  const rangeText = `區間 ${config.startDate} ~ ${config.endDate}，共 ${config.totalTradingDays} 個交易日，法人資料 ${config.institutionalDays} 日`;
  return { sourcesText, rangeText };
}

export interface HeaderQueryBarProps {
  currentSymbol: string;
  currentName?: string;
  currentMarket?: MarketType;
  isLoading?: boolean;
  onAnalyze: (symbol: string, market: MarketType) => void;
  provenanceConfig?: DataProvenanceConfig;
}

export const HeaderQueryBar: React.FC<HeaderQueryBarProps> = ({
  currentSymbol,
  currentName,
  currentMarket,
  isLoading = false,
  onAnalyze,
  provenanceConfig = {
    sources: ['日 K TWSE', '法人 TWSE', '融資券 FinMind'],
    startDate: '2026-05-04',
    endDate: '2026-09-18',
    totalTradingDays: 98,
    institutionalDays: 20,
  },
}) => {
  const [inputVal, setInputVal] = useState(currentSymbol);

  const clean = cleanSymbolInput(inputVal);
  const inferredMarket = currentMarket || inferMarketType(clean);
  const resolvedName =
    currentName || resolveOfficialSecurityName(clean, inferredMarket) || clean;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clean) return;
    onAnalyze(clean, inferredMarket);
  };

  const provenance = buildDataProvenanceText(provenanceConfig);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '10px 16px',
        background: 'rgba(15, 23, 42, 0.7)',
        borderRadius: '12px',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* 搜尋輸入與分析動作區 */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={16}
            color="#94a3b8"
            style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }}
          />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="代號 (如 2360)"
            style={{
              width: '130px',
              padding: '6px 10px 6px 32px',
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              background: 'rgba(30, 41, 59, 0.8)',
              color: '#ffffff',
              fontSize: '0.92rem',
              fontWeight: 700,
              outline: 'none',
              letterSpacing: '0.5px',
            }}
          />
        </div>

        {/* 股票名稱標籤 */}
        <div
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#93c5fd',
            fontSize: '0.92rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {resolvedName}
        </div>

        {/* 分析按鈕 */}
        <button
          type="submit"
          disabled={isLoading || !clean}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            background: isLoading
              ? 'rgba(59, 130, 246, 0.4)'
              : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          {isLoading ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Play size={14} fill="#ffffff" />
          )}
          <span>分析</span>
        </button>
      </form>

      {/* 右側：資料來源與區間說明標籤 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          fontSize: '0.78rem',
          color: '#94a3b8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={13} color="#60a5fa" />
          <span style={{ color: '#cbd5e1' }}>{provenance.sourcesText}</span>
        </div>
        <span style={{ opacity: 0.4 }}>|</span>
        <span style={{ color: '#94a3b8' }}>{provenance.rangeText}</span>
      </div>
    </div>
  );
};
