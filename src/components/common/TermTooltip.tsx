import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GlossaryEntry, getGlossaryEntry } from '../../constants/aiForceGlossary';

export interface TermTooltipPlacement {
  vertical: 'top' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
}

/**
 * 純函式：計算浮動視窗的最佳防邊界溢出位置 (Anti-Overflow & Smart Flip)
 */
export function calculateTooltipPlacement(
  triggerRect: { left: number; top: number; right: number; bottom: number; width: number; height: number },
  viewport: { width: number; height: number },
  tooltipSize = { width: 500, height: 380 }
): TermTooltipPlacement {
  // 垂直判斷：若上方空間不足容納浮動卡片（預估 380px），則翻轉至下方
  const vertical: 'top' | 'bottom' = triggerRect.top < tooltipSize.height ? 'bottom' : 'top';

  // 水平判斷：置中時左右各需擴展 width / 2 (約 250px)
  const halfWidth = tooltipSize.width / 2;
  const centerX = triggerRect.left + triggerRect.width / 2;

  let horizontal: 'left' | 'center' | 'right' = 'center';
  if (centerX + halfWidth > viewport.width - 20) {
    horizontal = 'right';
  } else if (centerX - halfWidth < 20) {
    horizontal = 'left';
  }

  return { vertical, horizontal };
}

export interface TermTooltipProps {
  termId?: string;
  entry?: GlossaryEntry;
  dynamicDiagnosis?: string;
  customDiagnosis?: string; // 相容別名
  children: React.ReactNode;
  showIcon?: boolean;
  underline?: boolean;
  interactive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const TOOLTIP_POPUP_CONFIG = {
  maxHeight: '580px',
  overflowY: 'auto' as const,
  overscrollBehavior: 'contain' as const,
  width: '500px',
};

export const TermTooltip: React.FC<TermTooltipProps> = ({
  termId,
  entry: customEntry,
  dynamicDiagnosis: propDynamic,
  customDiagnosis,
  children,
  showIcon = false,
  underline = true,
  interactive = true,
  style,
  className = '',
}) => {
  const dynamicDiagnosis = propDynamic ?? customDiagnosis;
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 取得字典條目
  const resolvedEntry: GlossaryEntry | undefined = customEntry || (termId ? getGlossaryEntry(termId) : undefined);

  // 計算視窗螢幕絕對位置 (Portal Fixed Positioning)
  const updatePosition = useCallback(() => {
    if (!containerRef.current || typeof window === 'undefined') return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const tooltipSize = { width: 500, height: 380 };
    const newPlacement = calculateTooltipPlacement(rect, viewport, tooltipSize);

    let left = rect.left;
    if (newPlacement.horizontal === 'center') {
      left = rect.left + rect.width / 2 - tooltipSize.width / 2;
    } else if (newPlacement.horizontal === 'right') {
      left = rect.right - tooltipSize.width;
    }
    // 水平視窗安全邊界限制 (12px 留白)
    left = Math.max(12, Math.min(viewport.width - tooltipSize.width - 12, left));

    let top = rect.bottom + 8;
    if (newPlacement.vertical === 'top') {
      top = rect.top - tooltipSize.height - 8;
      if (top < 12) {
        top = rect.bottom + 8; // 若向上仍超出則回退下方
      }
    }

    setCoords({ top, left });
  }, []);

  const handleMouseEnter = () => {
    if (!interactive) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    // Spec 0174: 80ms 懸浮防抖，避免滑鼠快速劃過時大卡片閃爍遮擋
    enterTimerRef.current = setTimeout(() => {
      updatePosition();
      setIsOpen(true);
    }, 80);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    updatePosition();
    setIsOpen((prev) => !prev);
  };

  // 點擊外部與 ESC 快捷鍵關閉
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        tooltipRef.current && !tooltipRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  }, [isOpen]);

  if (!resolvedEntry) {
    // 若找不到詞條，維持原樣渲染，不破壞既有外觀
    return <span style={style} className={className}>{children}</span>;
  }

  // 浮動卡片動態位置樣式 (Portal Fixed)
  const getTooltipStyle = (): React.CSSProperties => {
    return {
      position: 'fixed',
      top: `${coords.top}px`,
      left: `${coords.left}px`,
      zIndex: 999999,
      width: TOOLTIP_POPUP_CONFIG.width,
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: TOOLTIP_POPUP_CONFIG.maxHeight,
      overflowY: TOOLTIP_POPUP_CONFIG.overflowY,
      overscrollBehavior: TOOLTIP_POPUP_CONFIG.overscrollBehavior,
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(59, 130, 246, 0.4) rgba(15, 23, 42, 0.6)',
      backgroundColor: 'rgba(15, 23, 42, 0.98)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(59, 130, 246, 0.45)',
      boxShadow: '0 24px 48px rgba(0, 0, 0, 0.85), 0 0 24px rgba(59, 130, 246, 0.3)',
      borderRadius: '12px',
      padding: '16px 18px',
      fontSize: '13px',
      lineHeight: '1.65',
      color: '#e2e8f0',
      textAlign: 'left',
      pointerEvents: 'auto',
      animation: 'fadeIn 0.15s ease-out',
    };
  };

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        cursor: interactive ? 'help' : 'default',
        borderBottom: underline ? '1px dashed rgba(255, 255, 255, 0.35)' : 'none',
        ...style,
      }}
      className={`term-tooltip-trigger ${className}`}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
    >
      {children}
      {showIcon && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#60a5fa',
            fontSize: '10px',
            fontWeight: 700,
            marginLeft: '4px',
            verticalAlign: 'middle',
          }}
          title="新手解說與買賣指引"
        >
          i
        </span>
      )}

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          aria-live="polite"
          style={getTooltipStyle()}
          className="term-tooltip-popup"
          onMouseEnter={() => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
          }}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 標題列 (Spec 0174: 16px 加粗青色大標) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '16px', color: '#67e8f9' }}>{resolvedEntry.term}</span>
              {resolvedEntry.enTerm && (
                <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>({resolvedEntry.enTerm})</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '15px',
                padding: '2px 6px',
                lineHeight: 1,
                borderRadius: '4px',
              }}
              title="關閉"
            >
              ✕
            </button>
          </div>

          {/* 1. 白話比喻 (Spec 0174: 13px，行高 1.65，寬敞呈現) */}
          <div style={{ marginBottom: '10px', padding: '10px 12px', backgroundColor: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#93c5fd', marginBottom: '4px' }}>💡 白話比喻</div>
            <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.65' }}>{resolvedEntry.metaphor}</div>
          </div>

          {/* 2. 指標含義 (Spec 0174: 12.5px) */}
          <div style={{ marginBottom: '10px', padding: '10px 12px', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>📊 指標含義</div>
            <div style={{ color: '#94a3b8', fontSize: '12.5px', lineHeight: '1.6' }}>{resolvedEntry.meaning}</div>
          </div>

          {/* 3. 買賣操作指引 (Spec 0174: 12.5px 獨立徽章對比) */}
          <div style={{ marginBottom: dynamicDiagnosis ? '10px' : '0', padding: '10px 12px', backgroundColor: 'rgba(16, 185, 129, 0.06)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', marginBottom: '6px' }}>🎯 買賣操作指引（如何決定買賣？）</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', fontWeight: 700, flexShrink: 0 }}>🟢 偏多買訊:</span>
                <span style={{ color: '#d1fae5', lineHeight: '1.5' }}>{resolvedEntry.buySignal}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <span style={{ color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>🔴 偏空賣訊:</span>
                <span style={{ color: '#fee2e2', lineHeight: '1.5' }}>{resolvedEntry.sellSignal}</span>
              </div>
              {resolvedEntry.neutralWarning && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700, flexShrink: 0 }}>🟡 觀望警戒:</span>
                  <span style={{ color: '#fef3c7', lineHeight: '1.5' }}>{resolvedEntry.neutralWarning}</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. 當前個股即時診斷 (若有傳入，Spec 0174: 13px，金黃高亮卡 0 截斷) */}
          {dynamicDiagnosis && (
            <div style={{ padding: '10px 12px', backgroundColor: 'rgba(234, 179, 8, 0.08)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.4)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fde047', marginBottom: '4px' }}>⚡ 當前個股即時診斷</div>
              <div style={{ color: '#fef08a', fontSize: '13px', fontWeight: 500, lineHeight: '1.6' }}>{dynamicDiagnosis}</div>
            </div>
          )}
        </div>,
        document.body
      )}
    </span>
  );
};

