import React from 'react';
import { HoldingActionDirective, HoldingSignal, SignalTone } from '../../types/signal';
import { Tooltip } from './Tooltip';
import { Sparkles } from 'lucide-react';

/**
 * 取得膠囊色彩樣式
 */
export function getSignalCapsuleStyle(tone: SignalTone): {
  color: string;
  background: string;
  borderColor: string;
} {
  switch (tone) {
    case 'BULLISH':
      return {
        color: '#34d399',
        background: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
      };
    case 'BEARISH':
      return {
        color: '#f87171',
        background: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.35)',
      };
    case 'WARNING':
      return {
        color: '#fbbf24',
        background: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
      };
    case 'NEUTRAL':
    default:
      return {
        color: '#818cf8',
        background: 'rgba(99, 102, 241, 0.15)',
        borderColor: 'rgba(99, 102, 241, 0.35)',
      };
  }
}

/**
 * 排序訊號：依據權重絕對值與重要性排序
 */
export function sortHoldingSignals(signals: HoldingSignal[]): HoldingSignal[] {
  return [...signals].sort((a, b) => {
    const absA = Math.abs(a.weight);
    const absB = Math.abs(b.weight);
    if (absB !== absA) {
      return absB - absA;
    }
    // 同權重時 WARNING 優先
    if (a.tone === 'WARNING' && b.tone !== 'WARNING') return -1;
    if (b.tone === 'WARNING' && a.tone !== 'WARNING') return 1;
    return 0;
  });
}

/**
 * 格式化 Tooltip 說明文字
 */
export function formatSignalTooltip(signal: HoldingSignal): string {
  if (signal.description) {
    return signal.description;
  }
  return `${signal.label} (權重: ${signal.weight > 0 ? '+' : ''}${signal.weight})`;
}

interface HoldingSignalCapsulesProps {
  signals?: HoldingSignal[];
  directive?: HoldingActionDirective;
  showDirectiveBadge?: boolean;
  maxCapsules?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const HoldingSignalCapsules: React.FC<HoldingSignalCapsulesProps> = ({
  signals = [],
  directive,
  showDirectiveBadge = true,
  maxCapsules = 8,
  className = '',
  style = {},
}) => {
  if (!signals || signals.length === 0) {
    return null;
  }

  const sortedSignals = sortHoldingSignals(signals).slice(0, maxCapsules);

  // 定調顏色
  let headlineColor = '#94a3b8';
  let headlineBg = 'rgba(148, 163, 184, 0.15)';
  let headlineBorder = 'rgba(148, 163, 184, 0.3)';

  if (directive) {
    if (directive.sentiment === 'STRONG_BUY' || directive.sentiment === 'ACCUMULATE') {
      headlineColor = '#34d399';
      headlineBg = 'rgba(16, 185, 129, 0.18)';
      headlineBorder = 'rgba(16, 185, 129, 0.45)';
    } else if (directive.sentiment === 'STOP_LOSS_EXIT' || directive.sentiment === 'TRIM') {
      headlineColor = '#f87171';
      headlineBg = 'rgba(239, 68, 68, 0.18)';
      headlineBorder = 'rgba(239, 68, 68, 0.45)';
    } else if (directive.headline.includes('留意') || directive.headline.includes('超跌')) {
      headlineColor = '#fbbf24';
      headlineBg = 'rgba(245, 158, 11, 0.18)';
      headlineBorder = 'rgba(245, 158, 11, 0.45)';
    }
  }

  return (
    <div
      className={`holding-signals-container ${className}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '4px',
        marginTop: '3px',
        ...style,
      }}
    >
      {/* 智慧操作建議四字定調徽章 */}
      {showDirectiveBadge && directive && (
        <Tooltip
          position="top"
          align="left"
          content={
            <div style={{ padding: '2px 0', minWidth: '220px', maxWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '4px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, color: headlineColor, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={12} /> {directive.headline}
                </span>
                <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                  量化評分: {directive.score > 0 ? `+${directive.score}` : directive.score}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#f1f5f9', lineHeight: 1.45, marginBottom: '6px' }}>
                {directive.advice}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                💡 紀律指引：基於日線 MA/KD/MACD 多空專家矩陣量化評估
              </div>
            </div>
          }
        >
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '4px',
              background: headlineBg,
              color: headlineColor,
              border: `1px solid ${headlineBorder}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            <Sparkles size={10} />
            {directive.headline}
          </span>
        </Tooltip>
      )}

      {/* 各維度警示膠囊標籤 */}
      {sortedSignals.map((sig) => {
        const capsuleStyle = getSignalCapsuleStyle(sig.tone);
        const tooltipText = formatSignalTooltip(sig);

        return (
          <Tooltip key={sig.id} position="top" align="left" content={tooltipText}>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 500,
                padding: '1px 5px',
                borderRadius: '3px',
                background: capsuleStyle.background,
                color: capsuleStyle.color,
                border: `1px solid ${capsuleStyle.borderColor}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                cursor: 'default',
              }}
            >
              {sig.label}
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
};
