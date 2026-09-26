import React from 'react';
import type { BullBearStrengthData } from '../../../types/aiForceDashboard';
import { calculateCircleProgress } from './HealthSummaryCard';
import { MoreVertical } from 'lucide-react';

export interface BullBearStrengthCardProps {
  data?: BullBearStrengthData;
}

/**
 * 依據綜合評分判定 1~5 級信號階層
 */
export function calculateSignalTier(compositeScore: number): { tier: number; label: string; color: string } {
  if (compositeScore >= 80) {
    return { tier: 1, label: '1 級區 (超強勢)', color: '#ef4444' };
  }
  if (compositeScore >= 65) {
    return { tier: 2, label: '2 級區 (強勢偏多)', color: '#f87171' };
  }
  if (compositeScore >= 50) {
    return { tier: 3, label: '3 級區 (均衡震盪)', color: '#fbbf24' };
  }
  if (compositeScore >= 35) {
    return { tier: 4, label: '4 級區 (弱勢偏空)', color: '#34d399' };
  }
  return { tier: 5, label: '5 級區 (極弱空頭)', color: '#10b981' };
}

interface StrengthRingProps {
  label: string;
  percent: number;
  color: string;
}

const StrengthRing: React.FC<StrengthRingProps> = ({ label, percent, color }) => {
  const radius = 22;
  const { circumference, strokeDashoffset, clamped } = calculateCircleProgress(percent, radius);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
      <div style={{ position: 'relative', width: '56px', height: '56px' }}>
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="5"
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 28 28)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 800,
            fontFamily: 'monospace',
            color: '#f8fafc',
          }}
        >
          {clamped}%
        </div>
      </div>
      <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>{label}</span>
    </div>
  );
};

export const BullBearStrengthCard: React.FC<BullBearStrengthCardProps> = ({ data }) => {
  const bull = data?.bullStrengthPercent ?? 58;
  const bear = data?.bearStrengthPercent ?? 42;
  const volume = data?.volumeStrengthPercent ?? 53;
  const score = data?.compositeScore ?? 70;

  const tierMeta = calculateSignalTier(score);

  const rings = [
    { label: '多方強度', percent: bull, color: '#f87171' },
    { label: '空方強度', percent: bear, color: '#38bdf8' },
    { label: '量能強度', percent: volume, color: '#10b981' },
  ];

  return (
    <div
      data-testid="bull-bear-strength-card"
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
      {/* 頂部標題與選單 */}
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
              padding: '2px 6px',
              borderRadius: '5px',
              background: 'rgba(59, 130, 246, 0.25)',
              color: '#60a5fa',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}
          >
            17
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
            多空強度分布
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

      {/* 3 個圓環進度儀橫排 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          flex: 1,
          padding: '10px 0',
        }}
      >
        {rings.map((r) => (
          <StrengthRing key={r.label} label={r.label} percent={r.percent} color={r.color} />
        ))}
      </div>

      {/* 底部信號等級說明 (對齊照片) */}
      <div
        style={{
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.68rem',
          textAlign: 'center',
          color: '#94a3b8',
        }}
      >
        信號等級：<strong style={{ color: tierMeta.color }}>{tierMeta.tier} 級區</strong>
        <span style={{ color: '#64748b', marginLeft: '4px' }}>(1級最強 ~ 5級最弱，依綜合評分 {score})</span>
      </div>
    </div>
  );
};

export default BullBearStrengthCard;

