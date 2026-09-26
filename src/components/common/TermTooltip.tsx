import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  tooltipSize = { width: 320, height: 260 }
): TermTooltipPlacement {
  // 垂直判斷：若上方空間不足容納浮動卡片（預估 260px），則翻轉至下方
  const vertical: 'top' | 'bottom' = triggerRect.top < tooltipSize.height ? 'bottom' : 'top';

  // 水平判斷：置中時左右各需擴展 width / 2 (約 160px)
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
  const [placement, setPlacement] = useState<TermTooltipPlacement>({ vertical: 'top', horizontal: 'center' });
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 取得字典條目
  const resolvedEntry: GlossaryEntry | undefined = customEntry || (termId ? getGlossaryEntry(termId) : undefined);

  // 計算視窗位置
  const updatePosition = useCallback(() => {
    if (!containerRef.current || typeof window === 'undefined') return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const newPlacement = calculateTooltipPlacement(rect, viewport);
    setPlacement(newPlacement);
  }, []);

  const handleMouseEnter = () => {
    if (!interactive) return;
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setIsOpen(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    updatePosition();
    setIsOpen((prev) => !prev);
  };

  // 點擊外部自動關閉
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
    };
  }, [isOpen]);

  if (!resolvedEntry) {
    // 若找不到詞條，維持原樣渲染，不破壞既有外觀
    return <span style={style} className={className}>{children}</span>;
  }

  // 浮動卡片動態位置樣式
  const getTooltipStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 9999,
      width: '320px',
      maxWidth: '88vw',
      backgroundColor: 'rgba(15, 23, 42, 0.96)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(59, 130, 246, 0.35)',
      boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65), 0 0 16px rgba(59, 130, 246, 0.2)',
      borderRadius: '10px',
      padding: '12px 14px',
      fontSize: '12px',
      lineHeight: '1.5',
      color: '#e2e8f0',
      textAlign: 'left',
      pointerEvents: 'auto',
      animation: 'fadeIn 0.15s ease-out',
    };

    // 垂直方向
    if (placement.vertical === 'top') {
      baseStyle.bottom = 'calc(100% + 8px)';
    } else {
      baseStyle.top = 'calc(100% + 8px)';
    }

    // 水平方向
    if (placement.horizontal === 'center') {
      baseStyle.left = '50%';
      baseStyle.transform = 'translateX(-50%)';
    } else if (placement.horizontal === 'right') {
      baseStyle.right = '0';
    } else {
      baseStyle.left = '0';
    }

    return baseStyle;
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
      role="tooltip"
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

      {isOpen && (
        <div ref={tooltipRef} style={getTooltipStyle()} className="term-tooltip-popup" onClick={(e) => e.stopPropagation()}>
          {/* 標題列 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '6px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '13px', color: '#67e8f9' }}>{resolvedEntry.term}</span>
              {resolvedEntry.enTerm && (
                <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>({resolvedEntry.enTerm})</span>
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
                fontSize: '12px',
                padding: '0 2px',
                lineHeight: 1,
              }}
              title="關閉"
            >
              ✕
            </button>
          </div>

          {/* 1. 白話比喻 */}
          <div style={{ marginBottom: '8px', padding: '6px 8px', backgroundColor: 'rgba(59, 130, 246, 0.08)', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '2px' }}>💡 白話比喻</div>
            <div style={{ color: '#cbd5e1', fontSize: '11px' }}>{resolvedEntry.metaphor}</div>
          </div>

          {/* 2. 指標含義 */}
          <div style={{ marginBottom: '8px', padding: '6px 8px', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', marginBottom: '2px' }}>📊 指標含義</div>
            <div style={{ color: '#94a3b8', fontSize: '11px' }}>{resolvedEntry.meaning}</div>
          </div>

          {/* 3. 買賣操作指引 */}
          <div style={{ marginBottom: dynamicDiagnosis ? '8px' : '0', padding: '6px 8px', backgroundColor: 'rgba(16, 185, 129, 0.06)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>🎯 買賣操作指引（如何決定買賣？）</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', fontWeight: 700, flexShrink: 0 }}>🟢 偏多買訊:</span>
                <span style={{ color: '#d1fae5' }}>{resolvedEntry.buySignal}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                <span style={{ color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>🔴 偏空賣訊:</span>
                <span style={{ color: '#fee2e2' }}>{resolvedEntry.sellSignal}</span>
              </div>
              {resolvedEntry.neutralWarning && (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700, flexShrink: 0 }}>🟡 觀望警戒:</span>
                  <span style={{ color: '#fef3c7' }}>{resolvedEntry.neutralWarning}</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. 當前個股即時診斷 (若有傳入) */}
          {dynamicDiagnosis && (
            <div style={{ padding: '6px 8px', backgroundColor: 'rgba(234, 179, 8, 0.08)', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.35)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#fde047', marginBottom: '2px' }}>⚡ 當前個股即時診斷</div>
              <div style={{ color: '#fef08a', fontSize: '11px', fontWeight: 500 }}>{dynamicDiagnosis}</div>
            </div>
          )}
        </div>
      )}
    </span>
  );
};
