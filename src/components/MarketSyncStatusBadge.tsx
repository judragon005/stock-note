import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, CheckCircle2, Clock, Database, X, ChevronRight } from 'lucide-react';
import { MarketCacheSummary, loadMarketCacheSummary } from '../engine/marketCacheLoader';

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
 * 格式化同步晶片懸浮說明文案
 */
export const formatSyncBadgeTooltip = (
  twSummary: MarketCacheSummary | null,
  usSummary: MarketCacheSummary | null
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

interface MarketSyncStatusBadgeProps {
  onNavigateToSettings?: () => void;
}

export const MarketSyncStatusBadge: React.FC<MarketSyncStatusBadgeProps> = ({
  onNavigateToSettings,
}) => {
  const [twSummary, setTwSummary] = useState<MarketCacheSummary | null>(null);
  const [usSummary, setUsSummary] = useState<MarketCacheSummary | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const twTime = formatTime(twSummary?.updatedAt);
  const usTime = formatTime(usSummary?.updatedAt);

  const tooltipText = formatSyncBadgeTooltip(twSummary, usSummary);

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
        <Database size={12} color="#38bdf8" />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>盤後:</span>

        {twSummary ? (
          <span style={{ color: '#34d399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
            🇹🇼 {twTime}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', opacity: 0.7 }}>🇹🇼 待排程</span>
        )}

        <span style={{ color: 'var(--border-color)', opacity: 0.6 }}>|</span>

        {usSummary ? (
          <span style={{ color: '#38bdf8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#38bdf8' }} />
            🇺🇸 {usTime}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', opacity: 0.7 }}>🇺🇸 待排程</span>
        )}
      </div>

      {showModal && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={MODAL_VIEWPORT_STYLES.overlay}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={MODAL_VIEWPORT_STYLES.card}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(51, 65, 85, 0.4)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="#10b981" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  全市場每日盤後排程同步狀態 (Spec 0132)
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
                  <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    每日 16:00 定時排程
                  </span>
                </div>
                {twSummary ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <div>資料日期: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{twSummary.date}</span></div>
                    <div>同步時間: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{new Date(twSummary.updatedAt).toLocaleTimeString()}</span></div>
                    <div>涵蓋標的: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{twSummary.totalSymbols} 檔 (全市場整包)</span></div>
                    <div>執行耗時: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{(twSummary.durationMs / 1000).toFixed(1)} 秒</span></div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    尚未偵測到今日台股快取。已註冊排程將於每日 16:00 自動在背景執行。
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
                    每日 08:00 定時排程
                  </span>
                </div>
                {usSummary ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <div>資料日期: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{usSummary.date}</span></div>
                    <div>同步時間: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{new Date(usSummary.updatedAt).toLocaleTimeString()}</span></div>
                    <div>涵蓋標的: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{usSummary.totalSymbols} 檔 (核心優先)</span></div>
                    <div>執行耗時: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{(usSummary.durationMs / 1000).toFixed(1)} 秒</span></div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    尚未偵測到今日美股快取。已註冊排程將於每日 08:00 自動在背景執行。
                  </p>
                )}
              </div>

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
                  <span>管理或卸載 Windows 背景排程？</span>
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
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
