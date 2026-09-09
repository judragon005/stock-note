import React, { useState } from 'react';
import { MonteCarloPercentileTrack } from '../../types/firePlanning';

interface MonteCarloFanChartProps {
  tracks: MonteCarloPercentileTrack[];
  height?: number;
  initialValue: number;
}

export const MonteCarloFanChart: React.FC<MonteCarloFanChartProps> = ({
  tracks,
  height = 360,
  initialValue,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!tracks || tracks.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: '14px',
        }}
      >
        暫無模擬軌跡
      </div>
    );
  }

  const padding = { top: 30, right: 30, bottom: 40, left: 75 };
  const chartWidth = 800;
  const chartHeight = height;

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...tracks.map((t) => t.p90),
    initialValue * 1.5,
    1_000_000
  );

  const getX = (index: number) => padding.left + (index / (tracks.length - 1)) * innerWidth;
  const getY = (val: number) => padding.top + innerHeight - (Math.max(0, val) / maxVal) * innerHeight;

  // 1. P10~P90 外部多邊形 (淺色陰影)
  const p90Points = tracks.map((t, i) => `${getX(i)},${getY(t.p90)}`).join(' ');
  const p10PointsReversed = [...tracks]
    .reverse()
    .map((t, i) => `${getX(tracks.length - 1 - i)},${getY(t.p10)}`)
    .join(' ');
  const outerFanArea = `M ${p90Points} L ${p10PointsReversed} Z`;

  // 2. P25~P75 內部核心多邊形 (深色陰影)
  const p75Points = tracks.map((t, i) => `${getX(i)},${getY(t.p75)}`).join(' ');
  const p25PointsReversed = [...tracks]
    .reverse()
    .map((t, i) => `${getX(tracks.length - 1 - i)},${getY(t.p25)}`)
    .join(' ');
  const innerFanArea = `M ${p75Points} L ${p25PointsReversed} Z`;

  // 3. P50 中位數實線
  const p50Points = tracks.map((t, i) => `${getX(i)},${getY(t.p50)}`).join(' ');

  const formatTwd = (val: number) => {
    if (val >= 100_000_000) return `${(val / 100_000_000).toFixed(1)}億`;
    if (val >= 10_000) return `${Math.round(val / 10_000)}萬`;
    return val.toLocaleString();
  };

  const hoveredItem = hoverIndex !== null ? tracks[hoverIndex] : null;

  return (
    <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="fanOuterGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="fanInnerGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* 橫向參考格線 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding.top + innerHeight * (1 - ratio);
          const val = maxVal * ratio;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke={i === 0 ? '#ef4444' : 'rgba(51, 65, 85, 0.3)'}
                strokeWidth={i === 0 ? 1.5 : 1}
                strokeDasharray={i === 0 ? undefined : '4,4'}
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                fill={i === 0 ? '#f87171' : '#64748b'}
                fontSize="11"
                textAnchor="end"
                fontFamily="sans-serif"
              >
                {i === 0 ? '破產線 (0)' : `NT$ ${formatTwd(val)}`}
              </text>
            </g>
          );
        })}

        {/* 年份 X 軸標籤 */}
        {tracks
          .filter((_, i) => i % Math.ceil(tracks.length / 6) === 0 || i === tracks.length - 1)
          .map((d, i) => (
            <text
              key={i}
              x={getX(d.year)}
              y={chartHeight - 10}
              fill="#94a3b8"
              fontSize="11"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              第 {d.year} 年
            </text>
          ))}

        {/* 1. P10~P90 外部錐形陰影 */}
        <path d={outerFanArea} fill="url(#fanOuterGradient)" />

        {/* 2. P25~P75 內部核心錐形陰影 */}
        <path d={innerFanArea} fill="url(#fanInnerGradient)" />

        {/* 3. P50 中位數走勢線 (亮紫藍實線) */}
        <polyline
          fill="none"
          stroke="#818cf8"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={p50Points}
        />

        {/* 互動指示線 */}
        {hoverIndex !== null && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={padding.top + innerHeight}
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
            {/* P50 中位數點 */}
            <circle
              cx={getX(hoverIndex)}
              cy={getY(tracks[hoverIndex].p50)}
              r="5"
              fill="#818cf8"
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>
        )}

        {/* 隱形透明覆蓋矩形接收滑鼠移動 */}
        {tracks.map((_, i) => {
          const widthStep = innerWidth / (tracks.length - 1);
          const x = getX(i) - widthStep / 2;
          return (
            <rect
              key={i}
              x={Math.max(padding.left, x)}
              y={padding.top}
              width={widthStep}
              height={innerHeight}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}
      </svg>

      {/* 懸停 Tooltip */}
      {hoveredItem && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '24px',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            fontSize: '12px',
            color: '#e2e8f0',
            pointerEvents: 'none',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ fontWeight: 600, color: '#a5b4fc', marginBottom: '6px' }}>
            🎲 第 {hoveredItem.year} 年退休資產分佈
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ color: '#38bdf8' }}>🌟 P90 (樂觀繁榮):</span>
            <span>NT$ {hoveredItem.p90.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ color: '#818cf8', fontWeight: 600 }}>🎯 P50 (中位數路徑):</span>
            <span style={{ fontWeight: 600, color: '#818cf8' }}>NT$ {hoveredItem.p50.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ color: '#f87171' }}>⚠️ P10 (悲觀極端):</span>
            <span style={{ color: hoveredItem.p10 <= 0 ? '#ef4444' : '#e2e8f0' }}>
              {hoveredItem.p10 <= 0 ? '已破產 (0)' : `NT$ ${hoveredItem.p10.toLocaleString()}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
