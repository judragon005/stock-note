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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 頂部 Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white tracking-wide">
                {resolveDisplayTitle(symbol, companyName)}
              </h2>
              <span className="text-xs text-slate-400">
                三層漸進式架構：0秒戰報 ➔ 8季趨勢矩陣 ➔ 深度鑑識排雷
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
              title="強制刷新財報數據"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="關閉視窗 (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 內容主滾動區 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {loading && !report ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Activity className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-sm font-medium text-slate-300">
                穿透式財報鑑識引擎解析中...
              </p>
              <span className="text-xs text-slate-500">
                正在調度 16 項核心科目、計算三率、杜邦拆解與逆向鑑識規則
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-400" />
              <div className="text-sm font-semibold text-rose-300">{error}</div>
              <button
                onClick={() => loadData(true)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                重試連線
              </button>
            </div>
          ) : report ? (
            <>
              {/* Layer 1: 0 秒核心決策與四大指示燈 */}
              <FinancialHeroLayer report={report} />

              {/* Layer 2: 近 8 季趨勢、現金流階梯與杜邦分析 */}
              <FinancialTrendsLayer
                records={filterHistoricalRecordsByQuarter(report.historicalRecords, 8)}
                duPont={report.duPont}
              />

              {/* Layer 3: 「市場沒說什麼」深度鑑識與會計師審查 */}
              <FinancialForensicDeepAuditLayer report={report} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
