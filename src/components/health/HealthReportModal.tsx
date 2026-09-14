import React, { useEffect } from 'react';
import { X, Check } from 'lucide-react';
import type { HealthCheckCategoryResult } from '../../types/stockHealth';

interface HealthReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: HealthCheckCategoryResult | null;
  symbol: string;
  stockName?: string;
}

/**
 * 完整健診報告穿透彈窗 (Health Report Forensic Modal - 原生 Glassmorphism 頂級樣式)
 */
export const HealthReportModal: React.FC<HealthReportModalProps> = ({
  isOpen,
  onClose,
  result,
  symbol,
  stockName,
}) => {
  // 監聽 ESC 鍵關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !result) return null;

  const displayName = stockName && stockName !== symbol ? `${stockName} (${symbol})` : symbol;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(8, 12, 20, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '680px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 1px 1px rgba(255, 255, 255, 0.08) inset',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(15, 23, 42, 0.7)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              {result.title}完整報告
            </h2>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              {displayName}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            aria-label="關閉"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '22px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* 綜合說明引言卡片 */}
          <div
            style={{
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              lineHeight: 1.65,
              background: 'rgba(15, 23, 42, 0.65)',
              padding: '16px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(51, 65, 85, 0.5)',
            }}
          >
            {result.description} <strong>{displayName}</strong> 在這 {result.totalItems} 個指標中，
            {result.passedItems > 0 ? (
              <span>
                通過了其中的 <strong style={{ color: '#38bdf8' }}>{result.passedItems}</strong> 個
                ( <strong style={{ color: '#38bdf8' }}>{result.passRatio}%</strong> ) 條件。
              </span>
            ) : (
              <span>只通過了其中 0 個 ( 0% ) 條件。</span>
            )}
            {' '}{result.summaryText}
          </div>

          {/* 細項指標清單 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {result.items.map((item) => {
              const isPassed = item.passed;
              const isExempted = item.exempted;

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(30, 41, 59, 0.45)',
                    border: '1px solid var(--border-color)',
                    gap: '16px',
                  }}
                >
                  {/* 左側狀態標籤與指標標題 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                    {/* 狀態徽章膠囊 */}
                    <div style={{ flexShrink: 0, width: '74px' }}>
                      {isExempted ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-xs)',
                            background: 'rgba(100, 116, 139, 0.15)',
                            color: 'var(--text-muted)',
                            border: '1px solid rgba(100, 116, 139, 0.25)',
                          }}
                        >
                          – 豁免
                        </span>
                      ) : isPassed ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-xs)',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                          }}
                        >
                          <Check size={14} strokeWidth={2.5} /> 通過
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-xs)',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                          }}
                        >
                          <X size={14} strokeWidth={2.5} /> 沒過
                        </span>
                      )}
                    </div>

                    {/* 指標名稱與細節說明 */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          lineHeight: 1.4,
                        }}
                      >
                        {item.name}
                      </div>
                      {item.detailExplanation && (
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            marginTop: '2px',
                            lineHeight: 1.4,
                          }}
                        >
                          {item.detailExplanation}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右側門檻資訊 */}
                  {item.thresholdDesc && (
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        textAlign: 'right',
                        flexShrink: 0,
                      }}
                    >
                      {item.thresholdDesc}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '14px 24px',
            background: 'rgba(15, 23, 42, 0.8)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              backgroundColor: 'rgba(51, 65, 85, 0.5)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(71, 85, 105, 0.7)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.5)')}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
