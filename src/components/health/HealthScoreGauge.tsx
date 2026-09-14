import React from 'react';

interface HealthScoreGaugeProps {
  passed: number;
  total: number;
  passRatio: number;
  size?: number;
  strokeWidth?: number;
}

/**
 * 股票健診圓環評分進度條 (Health Score Gauge - 原生 Glassmorphism 頂級樣式)
 */
export const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({
  passed,
  total,
  passRatio,
  size = 118,
  strokeWidth = 7,
}) => {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedRatio = Math.max(0, Math.min(100, passRatio));
  const strokeDashoffset = circumference - (clampedRatio / 100) * circumference;

  // 依通過率給予金融級鮮明色彩
  const getStrokeColor = (ratio: number) => {
    if (ratio >= 65) return '#38bdf8'; // 科技亮青藍 (高通過率)
    if (ratio >= 45) return '#2dd4bf'; // 藍綠色
    if (ratio >= 20) return '#fb923c'; // 活力琥珀橙
    return '#f87171';                  // 警示珊瑚紅
  };

  const strokeColor = getStrokeColor(clampedRatio);

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
      >
        {/* 底層深色軌道環 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(148, 163, 184, 0.15)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* 動態漸變進度環 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 6px ${strokeColor}44)`,
          }}
        />
      </svg>

      {/* 中心分數與百分比標籤 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
          <span
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: strokeColor,
              letterSpacing: '-0.02em',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {passed}
          </span>
          <span
            style={{
              fontSize: '0.85rem',
              color: 'rgba(148, 163, 184, 0.6)',
              margin: '0 2px',
              fontWeight: 500,
            }}
          >
            /
          </span>
          <span
            style={{
              fontSize: '1.05rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {total}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: strokeColor,
            marginTop: '4px',
            letterSpacing: '-0.01em',
            textShadow: `0 0 8px ${strokeColor}33`,
          }}
        >
          通過 {clampedRatio}% 條件
        </span>
      </div>
    </div>
  );
};
