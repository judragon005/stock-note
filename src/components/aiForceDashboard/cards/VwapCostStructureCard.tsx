import React, { useMemo } from 'react';
import { VwapCostStructureData } from '../../../types/aiForceDashboard';
import { MoreVertical } from 'lucide-react';

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
  const bands = data.bands || [
    { name: '倉儲成本', biasLabel: '>5%', percentage: 38, color: '#f97316' },
    { name: '買平成本', biasLabel: '-2~5%', percentage: 32, color: '#10b981' },
    { name: '主力成本區', biasLabel: '±2%', percentage: 18, color: '#38bdf8' },
    { name: '大量成交區', biasLabel: '±2-5%', percentage: 12, color: '#0284c7' },
  ];
  const biasMetric = useMemo(() => formatBiasMetric(data.biasPercent ?? 7.5), [data.biasPercent]);

  const legendItems = useMemo(
    () =>
      bands.map((b) => ({
        label: `${b.name} (${b.biasLabel})`,
        color: b.color,
      })),
    [bands]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '14px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.82) 0%, rgba(20, 30, 52, 0.78) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* 頂部標題與右上選單 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '5px',
              background: 'rgba(59, 130, 246, 0.25)',
              color: '#60a5fa',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}
          >
            07
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
            主力成本結構分布圖
          </span>
        </div>

        <button
          type="button"
          aria-label="選項"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <MoreVertical size={14} />
        </button>
      </div>

      {/* SVG 多層次波形面積堆疊圖繪製區 (Area Chart) */}
      <div style={{ width: '100%', flex: 1, minHeight: '145px', position: 'relative' }}>
        <svg
          viewBox="0 0 340 130"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="areaGrad3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="areaGrad4" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* 左側 Y 軸刻度 */}
          <text x="5" y="20" fill="#64748b" fontSize="8" fontFamily="monospace">60k</text>
          <text x="5" y="50" fill="#64748b" fontSize="8" fontFamily="monospace">40k</text>
          <text x="5" y="80" fill="#64748b" fontSize="8" fontFamily="monospace">20k</text>
          <text x="10" y="110" fill="#64748b" fontSize="8" fontFamily="monospace">0k</text>

          {/* 內部波形面積圖 */}
          <g transform="translate(30, 10)">
            {/* 底層 Layer 4 (深藍大量成交) */}
            <path
              d="M 0,95 Q 60,85 120,70 T 240,60 T 300,95 L 300,100 L 0,100 Z"
              fill="url(#areaGrad4)"
            />
            {/* Layer 3 (天藍主力成本) */}
            <path
              d="M 0,80 Q 55,65 110,50 T 230,45 T 300,75 L 300,95 L 0,95 Z"
              fill="url(#areaGrad3)"
            />
            {/* Layer 2 (翠綠買平成本) */}
            <path
              d="M 0,60 Q 60,40 120,30 T 220,35 T 300,55 L 300,75 L 0,75 Z"
              fill="url(#areaGrad2)"
            />
            {/* Layer 1 (橘黃倉儲成本高峰) */}
            <path
              d="M 0,45 Q 60,15 115,10 T 210,25 T 300,45 L 300,55 L 0,55 Z"
              fill="url(#areaGrad1)"
            />
          </g>

          {/* 右上方浮動圖例 (對齊照片) */}
          <g transform="translate(230, 12)">
            {legendItems.map((item, idx) => (
              <g key={idx} transform={`translate(0, ${idx * 11})`}>
                <rect x="0" y="0" width="6" height="6" fill={item.color} rx="1" />
                <text x="9" y="5.5" fill="#cbd5e1" fontSize="6.5">
                  {item.label}
                </text>
              </g>
            ))}
          </g>

          {/* 底部 X 軸時間刻度 */}
          <text x="35" y="125" fill="#64748b" fontSize="7.5" fontFamily="monospace">06/20</text>
          <text x="110" y="125" fill="#64748b" fontSize="7.5" fontFamily="monospace">07/20</text>
          <text x="190" y="125" fill="#64748b" fontSize="7.5" fontFamily="monospace">08/10</text>
          <text x="270" y="125" fill="#64748b" fontSize="7.5" fontFamily="monospace">08/31</text>
        </svg>
      </div>

      {/* 底部主力平均成本與強弱指標 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '4px',
          padding: '6px 10px',
          borderRadius: '8px',
          background: 'rgba(30, 41, 59, 0.45)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>主力平均成本：</span>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: '#38bdf8',
            }}
          >
            {(data.mainForceAvgCost ?? data.mainForceVwap ?? 2131).toLocaleString()}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            ({data.referenceVwapLabel || '20日VWAP'})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

export default VwapCostStructureCard;
