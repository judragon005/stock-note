import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Activity,
} from 'lucide-react';
import type { MarketType } from '../../types/stock';
import type {
  FinancialForensicReport,
  QuarterlyFinancialRecord,
} from '../../types/financialForensic';
import { loadOrFetchFinancialReport } from '../../engine/financialReportService';
import { FinancialHeroLayer } from './FinancialHeroLayer';
import { FinancialTrendsLayer } from './FinancialTrendsLayer';
import { FinancialForensicDeepAuditLayer } from './FinancialForensicDeepAuditLayer';
import { FinancialSkeletonLayer } from './FinancialSkeletonLayer';
import { logger } from '../../utils/logger';

export function resolveDisplayTitle(symbol: string, companyName?: string): string {
  if (companyName && companyName !== symbol) {
    return `${symbol} ${companyName} 穿透式財報戰情室`;
  }
  return `${symbol} 穿透式財報戰情室`;
}

export function filterHistoricalRecordsByQuarter(
  records: QuarterlyFinancialRecord[],
  limit = 8
): QuarterlyFinancialRecord[] {
  if (!records || records.length === 0) return [];
  // 由遠至近排序 (舊 -> 新)
  const sorted = [...records].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.quarter - b.quarter;
  });
  return sorted.slice(-limit);
}

interface FinancialForensicModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  market?: MarketType;
  companyName?: string;
  fmpApiKey?: string;
  finmindToken?: string;
}

export const FinancialForensicModal: React.FC<FinancialForensicModalProps> = ({
  isOpen,
  onClose,
  symbol,
  market = 'TW',
  companyName = symbol,
  fmpApiKey,
  finmindToken,
}) => {
  const [report, setReport] = useState<FinancialForensicReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (forceRefresh = false) => {
      const cleanSymbol = symbol.trim().toUpperCase();
      if (!cleanSymbol) return;

      setLoading(true);
      setError(null);
      try {
        const res = await loadOrFetchFinancialReport(
          cleanSymbol,
          market,
          companyName,
          { forceRefresh, fmpApiKey, finmindToken }
        );
        setReport(res);
      } catch (err: any) {
        logger.error('[FinancialForensicModal] Failed to load financial report:', err);
        setError(err?.message || '載入財報資料失敗，請稍後重試');
      } finally {
        setLoading(false);
      }
    },
    [symbol, market, companyName, fmpApiKey, finmindToken]
  );

  useEffect(() => {
    if (isOpen && symbol) {
      loadData(false);
    }
  }, [isOpen, symbol, loadData]);

  // ESC 鍵關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1080px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-card, #0f172a)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          color: 'var(--text-primary, #ffffff)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes modalFadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        {/* 頂部 Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileSpreadsheet style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '0.02em',
                  margin: 0,
                }}
              >
                {resolveDisplayTitle(symbol, companyName)}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                三層漸進式架構：0秒戰報 ➔ 8季趨勢矩陣 ➔ 深度鑑識排雷
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => loadData(true)}
              disabled={loading}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(51, 65, 85, 0.5)',
                border: '1px solid rgba(100, 116, 139, 0.4)',
                color: '#cbd5e1',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s ease',
              }}
              title="強制刷新財報數據"
            >
              <RefreshCw
                style={{
                  width: '14px',
                  height: '14px',
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                  color: loading ? '#818cf8' : 'inherit',
                }}
              />
              <span>{loading ? '分析中...' : '重新整理'}</span>
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(51, 65, 85, 0.4)',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              title="關閉視窗 (ESC)"
            >
              <X style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>

        {/* 內容主滾動區 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                animation: 'fadeIn 0.2s ease-in-out',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  fontSize: '0.8rem',
                  color: '#a5b4fc',
                }}
              >
                <Activity
                  style={{
                    width: '16px',
                    height: '16px',
                    animation: 'spin 1.5s linear infinite',
                    color: '#818cf8',
                  }}
                />
                <span>正在從權威資料源原子性同步並驗證財報三表，完備後即刻點亮...</span>
              </div>
              <FinancialSkeletonLayer />
            </div>
          ) : error ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                textAlign: 'center',
                gap: '14px',
              }}
            >
              <AlertCircle style={{ width: '40px', height: '40px', color: '#fb7185' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fda4af' }}>{error}</div>
              <button
                onClick={() => loadData(true)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(51, 65, 85, 0.7)',
                  border: '1px solid rgba(100, 116, 139, 0.5)',
                  color: '#f1f5f9',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                重試連線
              </button>
            </div>
          ) : report ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                animation: 'modalFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* Layer 1: 0 秒核心決策與四大指示燈 */}
              <FinancialHeroLayer report={report} />

              {/* Layer 2: 近 8 季趨勢、現金流階梯與杜邦分析 */}
              <FinancialTrendsLayer
                records={filterHistoricalRecordsByQuarter(report.historicalRecords, 8)}
                duPont={report.duPont}
              />

              {/* Layer 3: 「市場沒說什麼」深度鑑識與會計師審查 */}
              <FinancialForensicDeepAuditLayer report={report} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
