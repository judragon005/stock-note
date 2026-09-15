import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, Clock, Database, X } from 'lucide-react';
import { MarketCacheSummary, loadMarketCacheSummary } from '../engine/marketCacheLoader';

export const MarketSyncStatusBadge: React.FC = () => {
  const [twSummary, setTwSummary] = useState<MarketCacheSummary | null>(null);
  const [usSummary, setUsSummary] = useState<MarketCacheSummary | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const [tw, us] = await Promise.all([
        loadMarketCacheSummary('TW'),
        loadMarketCacheSummary('US'),
      ]);
      setTwSummary(tw);
      setUsSummary(us);
    } catch {
      // 忽略載入錯誤
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '未同步';
    const d = new Date(timestamp);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:opacity-90 shadow-sm border border-[var(--border-color)] bg-[var(--bg-card)]/80 backdrop-blur-sm"
        title="點擊查看全市場每日定時同步狀態與稽核報告"
      >
        <Database className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[var(--text-muted)]">盤後快取:</span>
        {twSummary ? (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            台股 {formatTime(twSummary.updatedAt)} ({twSummary.totalSymbols}檔)
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">台股等待排程</span>
        )}
        <span className="text-[var(--text-muted)] opacity-40">|</span>
        {usSummary ? (
          <span className="inline-flex items-center gap-1 text-sky-400">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            美股 {formatTime(usSummary.updatedAt)} ({usSummary.totalSymbols}檔)
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">美股等待排程</span>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-[var(--text-main)]">
                  全市場每日盤後定時同步狀態 (Spec 0132)
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* 台股狀態卡片 */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> 台灣市場 (TWSE / TPEx)
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    每日 16:00 定時同步
                  </span>
                </div>
                {twSummary ? (
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                    <div>資料日期: <span className="text-[var(--text-main)] font-medium">{twSummary.date}</span></div>
                    <div>同步時間: <span className="text-[var(--text-main)] font-medium">{new Date(twSummary.updatedAt).toLocaleTimeString()}</span></div>
                    <div>涵蓋標的: <span className="text-[var(--text-main)] font-medium">{twSummary.totalSymbols} 檔 (全市場)</span></div>
                    <div>同步耗時: <span className="text-[var(--text-main)] font-medium">{(twSummary.durationMs / 1000).toFixed(1)} 秒</span></div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">尚未偵測到今日台股盤後快取，系統將於 16:00 自動執行。</p>
                )}
              </div>

              {/* 美股狀態卡片 */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sky-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> 美國市場 (NYSE / NASDAQ)
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    每日 08:00 定時同步
                  </span>
                </div>
                {usSummary ? (
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                    <div>資料日期: <span className="text-[var(--text-main)] font-medium">{usSummary.date}</span></div>
                    <div>同步時間: <span className="text-[var(--text-main)] font-medium">{new Date(usSummary.updatedAt).toLocaleTimeString()}</span></div>
                    <div>涵蓋標的: <span className="text-[var(--text-main)] font-medium">{usSummary.totalSymbols} 檔 (核心優先)</span></div>
                    <div>同步耗時: <span className="text-[var(--text-main)] font-medium">{(usSummary.durationMs / 1000).toFixed(1)} 秒</span></div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">尚未偵測到今日美股盤後快取，系統將於 08:00 自動執行。</p>
                )}
              </div>

              {/* 操作與手動指令提示 */}
              <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] space-y-1.5">
                <div className="font-medium text-[var(--text-main)] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Windows 排程自動化提示
                </div>
                <p>已配置 Windows 工作排程器，每日 16:00 與 08:00 於背景靜默自動抓取。如需立即手動補跑更新，可執行：</p>
                <div className="font-mono bg-[var(--bg-secondary)] p-2 rounded text-[var(--text-main)] select-all">
                  node scripts/market-sync/sync-tw-market.cjs
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={fetchStatus}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] text-[var(--text-main)] transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                重新整理狀態
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
