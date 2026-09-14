import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { HealthCheckCategoryResult } from '../../types/stockHealth';
import { HealthScoreGauge } from './HealthScoreGauge';

interface HealthCardProps {
  result: HealthCheckCategoryResult;
  onOpenReport: (result: HealthCheckCategoryResult) => void;
}

/**
 * 單一健診維度卡片 (Health Card - 原生 Glassmorphism 頂級樣式)
 */
export const HealthCard: React.FC<HealthCardProps> = ({ result, onOpenReport }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="glass-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '22px 26px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        background: isHovered
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.85) 100%)'
          : 'var(--bg-card)',
        border: `1px solid ${isHovered ? 'var(--border-hover)' : 'var(--border-color)'}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: isHovered
          ? '0 12px 36px -4px rgba(0, 0, 0, 0.45), 0 0 20px rgba(56, 189, 248, 0.08)'
          : 'var(--shadow-card)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* 左側：標題、智能評語與報告入口 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            fontSize: '1.18rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {result.title}
        </h3>

        <p
          style={{
            fontSize: '0.88rem',
            lineHeight: 1.65,
            color: 'var(--text-secondary)',
            margin: '0 0 16px 0',
            maxWidth: '680px',
          }}
        >
          {result.summaryText}
        </p>

        <div>
          <button
            type="button"
            onClick={() => onOpenReport(result)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px 0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#38bdf8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#7dd3fc';
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#38bdf8';
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            查看完整健診細節
            <ChevronRight size={16} style={{ transform: 'translateY(1px)' }} />
          </button>
        </div>
      </div>

      {/* 右側：固定寬高之圓環評分儀表盤 */}
      <div style={{ flexShrink: 0, paddingLeft: '8px' }}>
        <HealthScoreGauge
          passed={result.passedItems}
          total={result.totalItems}
          passRatio={result.passRatio}
          size={118}
          strokeWidth={7}
        />
      </div>
    </div>
  );
};
