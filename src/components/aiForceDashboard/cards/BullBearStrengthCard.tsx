import React from 'react';
import type { BullBearStrengthData } from '../../../types/aiForceDashboard';
import { calculateCircleProgress } from './HealthSummaryCard';

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
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
            fontWeight: 700,
            color: '#f8fafc',
          }}
        >
          {clamped}%
        </div>
      </div>
      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{label}</span>
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
    { label: '多方強度', percent: bull, color: '#ef4444' },
    { label: '空方強度', percent: bear, color: '#10b981' },
    { label: '量能強度', percent: volume, color: '#f59e0b' },
  ];

  return (
    <div
      data-testid="bull-bear-strength-card"
      style={{
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* 標題與信號等級徽章 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🛡️</span>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
            17 多空強度分布
          </h3>
        </div>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: `${tierMeta.color}20`,
            color: tierMeta.color,
            fontWeight: 600,
            border: `1px solid ${tierMeta.color}40`,
          }}
        >
          {tierMeta.label}
        </span>
      </div>

      {/* 3 個圓環進度儀橫排 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 0',
        }}
      >
        {rings.map((r) => (
          <StrengthRing key={r.label} label={r.label} percent={r.percent} color={r.color} />
        ))}
      </div>

      {/* 底部總結 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#94a3b8',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <span>
          信號等級：
          <strong style={{ color: tierMeta.color, marginLeft: '4px' }}>{tierMeta.tier} 級區</strong>
        </span>
        <strong style={{ color: '#f8fafc', fontWeight: 600 }}>綜合評分 {score}</strong>
      </div>
    </div>
  );
};

export default BullBearStrengthCard;
