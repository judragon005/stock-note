import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, Clock, Database, X, ChevronRight } from 'lucide-react';
import { ModalShell } from './common/ModalShell';
import {
  MarketSyncStatusResponse,
  LAKEHOUSE_SYNCED_EVENT,
  fetchMarketSyncStatus,
} from '../hooks/useMarketCatchupSync';

export { fetchMarketSyncStatus };

/**
 * 輕量摘要相容介面（向後相容舊測試呼叫，不依賴靜態 JSON 市場快取載入器）
 */
export interface LegacySyncSummaryLike {
  date: string;
  updatedAt: number;
  totalSymbols: number;
  durationMs?: number;
}

/**
 * Spec 0135: 彈窗視窗防溢出與包含塊隔離樣式定義
 */
export const MODAL_VIEWPORT_STYLES = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    overflowY: 'auto' as const,
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    maxHeight: 'min(90vh, 620px)',
    overflowY: 'auto' as const,
    margin: 'auto',
    borderRadius: '16px',
    border: '1px solid rgba(51, 65, 85, 0.6)',
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(10, 16, 30, 0.95) 100%)',
    padding: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '18px',
  },
};

/**
 * 向後相容格式化同步晶片懸浮說明文案 (Spec 0135)
 */
export const formatSyncBadgeTooltip = (
  twSummary: LegacySyncSummaryLike | null,
  usSummary: LegacySyncSummaryLike | null
): string => {
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const twTime = formatTime(twSummary?.updatedAt);
  const usTime = formatTime(usSummary?.updatedAt);

  return `全市場每日盤後排程快取 (Spec 0132)\n台股 (16:00)：${twSummary ? `已同步 (${twSummary.date} ${twTime}, ${twSummary.totalSymbols}檔)` : '等待排程'}\n美股 (08:00)：${usSummary ? `已同步 (${usSummary.date} ${usTime}, ${usSummary.totalSymbols}檔)` : '等待排程'}\n點擊查看完整稽核報告與排程設定`;
};

/**
 * Spec 0246 Ticket 07: 以 SQLite 單一同步遙測事實來源格式化徽章懸浮文案
 */
export const formatSqliteSyncBadgeTooltip = (
  syncStatus: MarketSyncStatusResponse | null
): string => {
  if (!syncStatus) {
    return 'SQLite 湖倉同步狀態：等待連線至本地湖倉 API (/api/market/sync-status)\n點擊查看排程管理設定';
  }
  const tw = syncStatus.tw;
  const us = syncStatus.us;
  const twGapLabel =
    typeof tw.gapCount === 'number' && tw.gapCount > 0
      ? `（缺 ${tw.gapCount} 日待補）`
      : tw.isStale
      ? '（待同步）'
      : '（零缺口）';
  const twCountLabel = tw.symbolCount ? `, ${tw.symbolCount}檔` : '';
  const usCountLabel = us.symbolCount ? `, ${us.symbolCount}檔` : '';
  const catchupBanner = syncStatus.isCatchingUp ? '\n⚡ 背景缺口追趕同步進行中...' : '';

  return `SQLite 湖倉同步狀態 (Spec 0246 SSOT)\n台股：${tw.latestDate ? `${tw.latestDate}${twCountLabel} ${twGapLabel}` : '尚無資料（待補齊）'}\n美股：${us.latestDate ? `${us.latestDate}${usCountLabel}${us.isStale ? '（待同步）' : '（最新）'}` : '尚無資料（待補齊）'}${catchupBanner}\n點擊查看四軌同步狀態與排程管理`;
};

interface MarketSyncStatusBadgeProps {
  onNavigateToSettings?: () => void;
}

export const MarketSyncStatusBadge: React.FC<MarketSyncStatusBadgeProps> = ({
  onNavigateToSettings,
}) => {
  const [syncStatus, setSyncStatus] = useState<MarketSyncStatusResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchMarketSyncStatus();
      setSyncStatus(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    if (typeof window === 'undefined') return;
    const handleSynced = () => {
      void fetchStatus();
    };
    window.addEventListener(LAKEHOUSE_SYNCED_EVENT, handleSynced);
    return () => window.removeEventListener(LAKEHOUSE_SYNCED_EVENT, handleSynced);
  }, [fetchStatus]);

  // 鍵盤 Escape 快捷關閉防禦
  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const formatShortDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    return dateStr.length >= 10 ? dateStr.slice(5) : dateStr;
  };

  const twShort = formatShortDate(syncStatus?.tw?.latestDate);
  const usShort = formatShortDate(syncStatus?.us?.latestDate);
  const twGapCount = syncStatus?.tw?.gapCount ?? 0;
  const isCatchingUp = Boolean(syncStatus?.isCatchingUp);
  const tooltipText = formatSqliteSyncBadgeTooltip(syncStatus);

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={tooltipText}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: isHovered ? 'rgba(30, 41, 59, 0.85)' : 'rgba(19, 29, 49, 0.7)',
          padding: '5px 10px',
          borderRadius: '8px',
          border: isHovered ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-color)',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          userSelect: 'none',
        }}
      >
        <Database size={12} color={isCatchingUp ? '#fbbf24' : '#38bdf8'} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
          {isCatchingUp ? '追趕中:' : '湖倉:'}
        </span>

        {twShort ? (
          <span
            style={{
              color: twGapCount > 0 || syncStatus?.tw?.isStale ? '#fbbf24' : '#34d399',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: twGapCount > 0 || syncStatus?.tw?.isStale ? '#f59e0b' : '#10b981',
              }}
            />
            🇹🇼 {twShort}
            {twGapCount > 0 ? ` (缺${twGapCount})` : ''}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', opacity: 0.7 }}>🇹🇼 待連線</span>
        )}

        <span style={{ color: 'var(--border-color)', opacity: 0.6 }}>|</span>

        {usShort ? (
          <span
            style={{
              color: syncStatus?.us?.isStale ? '#fbbf24' : '#38bdf8',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: syncStatus?.us?.isStale ? '#f59e0b' : '#38bdf8',
              }}
            />
            🇺🇸 {usShort}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', opacity: 0.7 }}>🇺🇸 待連線</span>
        )}
      </div>

      <ModalShell
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="520px"
        padding="24px"
        ariaLabel="SQLite 湖倉單一同步遙測狀態"
        contentStyle={MODAL_VIEWPORT_STYLES.card}
      >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(51, 65, 85, 0.4)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="#10b981" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  SQLite 湖倉單一同步遙測狀態 (Spec 0246)
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
              {/* 台股卡片 */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(19, 29, 49, 0.6)',
                  border: '1px solid rgba(51, 65, 85, 0.4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={15} /> 🇹🇼 台股市場 (TWSE / TPEx)
                  </span>
                  <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: twGapCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: twGapCount > 0 ? '#fbbf24' : '#34d399', border: `1px solid ${twGapCount > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` }}>
                    {twGapCount > 0 ? `近 30 日缺 ${twGapCount} 日` : '零缺口同步'}
                  </span>
                </div>
                {syncStatus?.tw?.latestDate ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <div>最新在庫: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{syncStatus.tw.latestDate}</span></div>
                    <div>應結算日: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{syncStatus.tw.anchorDate}</span></div>
                    <div>涵蓋標的: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{(syncStatus.tw.symbolCount ?? 0).toLocaleString()} 檔</span></div>
                    <div>狀態: <span style={{ color: syncStatus.tw.isStale ? '#fbbf24' : '#34d399', fontWeight: 600 }}>{syncStatus.tw.isStale ? '需補齊' : '已最新'}</span></div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    尚未連線至本地 SQLite 湖倉 API 或尚無台股資料。
                  </p>
                )}
              </div>

              {/* 美股卡片 */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(19, 29, 49, 0.6)',
                  border: '1px solid rgba(51, 65, 85, 0.4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={15} /> 🇺🇸 美股市場 (NYSE / NASDAQ)
                  </span>
                  <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    美東 17:00 獨立結算
                  </span>
                </div>
                {syncStatus?.us?.latestDate ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <div>最新在庫: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{syncStatus.us.latestDate}</span></div>
                    <div>應結算日: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{syncStatus.us.anchorDate}</span></div>
                    <div>涵蓋標的: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{(syncStatus.us.symbolCount ?? 0).toLocaleString()} 檔</span></div>
                    <div>狀態: <span style={{ color: syncStatus.us.isStale ? '#fbbf24' : '#38bdf8', fontWeight: 600 }}>{syncStatus.us.isStale ? '待同步' : '已最新'}</span></div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    尚未連線至本地 SQLite 湖倉 API 或尚無美股資料。
                  </p>
                )}
              </div>

              {/* 週期指標摘要（集保與月營收） */}
              {syncStatus?.weekly && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.55)',
                    border: '1px solid rgba(51, 65, 85, 0.45)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <div>TDCC 集保: <span style={{ color: syncStatus.weekly.tdccIsStale ? '#fbbf24' : '#f8fafc', fontWeight: 600 }}>{syncStatus.weekly.tdccLatestDate || '待補齊'}</span></div>
                  <div>月營收基準: <span style={{ color: syncStatus.weekly.revenueIsStale ? '#fbbf24' : '#f8fafc', fontWeight: 600 }}>{syncStatus.weekly.revenueLatestMonth || '待補齊'}</span></div>
                </div>
              )}

              {/* 前往設定中心管理提示 */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px dashed rgba(51, 65, 85, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <Clock size={13} color="#f59e0b" />
                  <span>管理背景自動補缺與 NAS／Windows 排程？</span>
                </div>
                {onNavigateToSettings && (
                  <button
                    onClick={() => {
                      setShowModal(false);
                      onNavigateToSettings();
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    前往設定中心 <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
              <button
                onClick={fetchStatus}
                disabled={isLoading}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(19, 29, 49, 0.8)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={12} className={isLoading ? 'spin-animation' : ''} />
                重新整理狀態
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                完成
              </button>
            </div>
      </ModalShell>
    </>
  );
};
