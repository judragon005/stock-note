import React, { useMemo } from 'react';
import { VwapCostStructureData } from '../../../types/aiForceDashboard';

export interface StackedBandSegment {
  name: string;
  biasLabel: string;
  percentage: number;
  color: string;
  startPct: number;
  endPct: number;
}

/**
 * 計算各成本帶的累計起點與終點百分比 (供 SVG 堆疊或長條切分)
 */
export function calculateStackedBandSegments(
  bands: VwapCostStructureData['bands']
): StackedBandSegment[] {
  if (!bands || bands.length === 0) return [];

  let accumulated = 0;
  return bands.map((b) => {
    const startPct = accumulated;
    const endPct = accumulated + b.percentage;
    accumulated = endPct;
    return {
      ...b,
      startPct,
      endPct,
    };
  });
}

export interface BiasMetricResult {
  text: string;
  isPositive: boolean;
  color: string;
}

/**
 * 格式化強弱指標偏離度字串與色彩
 */
export function formatBiasMetric(biasPercent: number): BiasMetricResult {
  const isPositive = biasPercent > 0;
  let text = `${biasPercent.toFixed(1)}%`;
  if (isPositive) {
    text = `+${biasPercent.toFixed(1)}%`;
  }
  return {
    text,
    isPositive,
    color: isPositive ? '#ef4444' : biasPercent < 0 ? '#10b981' : '#fbbf24',
  };
}

export interface VwapCostStructureCardProps {
  data: VwapCostStructureData;
}

export const VwapCostStructureCard: React.FC<VwapCostStructureCardProps> = ({ data }) => {
  const bands = data.bands || [];
  const segments = useMemo(() => calculateStackedBandSegments(bands), [bands]);
  const biasMetric = useMemo(() => formatBiasMetric(data.biasPercent ?? 0), [data.biasPercent]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.82) 0%, rgba(20, 30, 52, 0.78) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* 標題列 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.25)',
              color: '#60a5fa',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}
          >
            07
          </span>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>
            主力成本結構分布圖
          </span>
        </div>

        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
          VWAP Cost Structure
        </span>
      </div>

      {/* SVG 面積堆疊波形圖繪製區 */}
      <div style={{ width: '100%', flex: 1, minHeight: '130px', position: 'relative' }}>
        <svg
          viewBox="0 0 320 120"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <defs>
            {segments.map((seg, idx) => (
              <linearGradient key={'g' + idx} id={`vwapGrad-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={seg.color} stopOpacity="0.8" />
                <stop offset="100%" stopColor={seg.color} stopOpacity="0.25" />
              </linearGradient>
            ))}
          </defs>

          {/* 橫向堆疊條 (四階色塊平滑過渡) */}
          {segments.map((seg, idx) => {
            const width = (seg.percentage / 100) * 320;
            const x = (seg.startPct / 100) * 320;
            return (
              <g key={idx}>
                {/* 頂部面積弧形裝飾條 */}
                <rect
                  x={x + 1}
                  y={15}
                  width={Math.max(2, width - 2)}
                  height={80}
                  fill={`url(#vwapGrad-${idx})`}
                  rx="6"
                  stroke={seg.color}
                  strokeWidth="0.8"
                  strokeOpacity="0.5"
                />

                {/* 內部高亮百分比文字 */}
                {seg.percentage >= 10 && (
                  <text
                    x={x + width / 2}
                    y={60}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="13"
                    fontWeight="800"
                    fontFamily="monospace"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                  >
                    {seg.percentage}%
                  </text>
                )}

                {/* 區間偏離標籤 */}
                {seg.percentage >= 12 && (
                  <text
                    x={x + width / 2}
                    y={78}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.8)"
                    fontSize="8.5"
                    fontWeight="600"
                  >
                    {seg.biasLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 四階成本帶圖例清單 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          margin: '8px 0',
        }}
      >
        {segments.map((seg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              fontSize: '0.74rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: seg.color,
                }}
              />
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{seg.name}</span>
            </div>
            <span style={{ color: seg.color, fontWeight: 700, fontFamily: 'monospace' }}>
              {seg.percentage}%
            </span>
          </div>
        ))}
      </div>

      {/* 底部主力平均成本與強弱指標列 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          padding: '6px 10px',
          borderRadius: '8px',
          background: 'rgba(30, 41, 59, 0.55)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>主力平均成本：</span>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: '#38bdf8',
            }}
          >
            {data.mainForceVwap?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>(20日VWAP)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>強弱指標：</span>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: biasMetric.color,
            }}
          >
            {biasMetric.text}
          </span>
        </div>
      </div>
    </div>
  );
};
