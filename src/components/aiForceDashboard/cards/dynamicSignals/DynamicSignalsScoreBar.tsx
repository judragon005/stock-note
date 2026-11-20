import React from 'react';

export interface DynamicSignalsScoreBarProps {
  compositeScore: number;
  color: string;
  glow: string;
}

/**
 * Card 12 多因子綜合量化進度條 (0~100 分) (Spec 0241 T05 / Debt 0049)
 */
export const DynamicSignalsScoreBar: React.FC<DynamicSignalsScoreBarProps> = ({
  compositeScore,
  color,
  glow,
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '6px 8px',
      background: 'rgba(15, 23, 42, 0.5)',
      borderRadius: '6px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: '#94a3b8',
      }}
    >
      <span>多因子綜合量化分</span>
      <span style={{ color, fontWeight: 800 }}>{compositeScore} 分</span>
    </div>
    <div
      style={{
        width: '100%',
        height: '5px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '3px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, compositeScore))}%`,
          height: '100%',
          backgroundColor: color,
          boxShadow: glow,
          borderRadius: '3px',
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  </div>
);
