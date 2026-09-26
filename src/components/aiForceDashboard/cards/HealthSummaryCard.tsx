import React from 'react';
import type { HealthSummaryData } from '../../../types/aiForceDashboard';

export interface HealthSummaryCardProps {
  data?: HealthSummaryData;
}

/**
 * 輔助計算圓形進度環之周長與 offset
 */
export function calculateCircleProgress(percent: number, radius = 22) {
  const clamped = Math.max(0, Math.min(100, percent));
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clamped / 100);
  return {
    clamped,
    circumference: Math.round(circumference * 100) / 100,
    strokeDashoffset: Math.round(strokeDashoffset * 100) / 100,
  };
}

/**
 * 計算 5 項指標之平均綜合健康評分
 */
export function calculateOverallHealthScore(data: {
  chipHealth: number;
  technicalStructure: number;
  capitalMomentum: number;
  liquidityRisk: number;
  institutionalSupport: number;
}): { averageScore: number; ratingLabel: string } {
  const values = [
    data.chipHealth,
    data.technicalStructure,
    data.capitalMomentum,
    data.liquidityRisk,
    data.institutionalSupport,
  ];
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const averageScore = Math.round(sum / values.length);

  let ratingLabel = '普通 (平均 50 分)';
  if (averageScore >= 75) {
    ratingLabel = `優良 (平均 ${averageScore} 分)`;
  } else if (averageScore >= 60) {
    ratingLabel = `良好 (平均 ${averageScore} 分)`;
  } else if (averageScore >= 45) {
    ratingLabel = `普通 (平均 ${averageScore} 分)`;
  } else {
    ratingLabel = `偏弱 (平均 ${averageScore} 分)`;
  }

  return { averageScore, ratingLabel };
}

interface GaugeItemProps {
  label: string;
  percent: number;
  color: string;
}

const SingleGauge: React.FC<GaugeItemProps> = ({ label, percent, color }) => {
  const radius = 20;
  const { circumference, strokeDashoffset, clamped } = calculateCircleProgress(percent, radius);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: '52px', height: '52px' }}>
        <svg width="52" height="52" viewBox="0 0 52 52">
          {/* 背景軌道 */}
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="4"
          />
          {/* 進度環 */}
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 26 26)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* 中心文字 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#f8fafc',
          }}
        >
          {clamped}%
        </div>
      </div>
      <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
};

export const HealthSummaryCard: React.FC<HealthSummaryCardProps> = ({ data }) => {
  const chipHealth = data?.chipHealth ?? 55;
  const technicalStructure = data?.technicalStructure ?? 80;
  const capitalMomentum = data?.capitalMomentum ?? 58;
  const liquidityRisk = data?.liquidityRisk ?? 5;
  const institutionalSupport = data?.institutionalSupport ?? 50;

  const calculated = calculateOverallHealthScore({
    chipHealth,
    technicalStructure,
    capitalMomentum,
    liquidityRisk,
    institutionalSupport,
  });

  const ratingText = data?.overallRatingLabel ?? calculated.ratingLabel;

  const gauges = [
    { label: '籌碼健康', percent: chipHealth, color: '#38bdf8' },
    { label: '技術結構', percent: technicalStructure, color: '#10b981' },
    { label: '資金動能', percent: capitalMomentum, color: '#f59e0b' },
    { label: '流動風險', percent: liquidityRisk, color: '#ec4899' },
    { label: '法人支撐', percent: institutionalSupport, color: '#8b5cf6' },
  ];

  return (
    <div
      data-testid="health-summary-card"
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
      {/* 頂部標題與總評標籤 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🛡️</span>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
            11 健康度綜合評估表
          </h3>
        </div>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            fontWeight: 600,
            border: '1px solid rgba(56, 189, 248, 0.3)',
          }}
        >
          {ratingText}
        </span>
      </div>

      {/* 5 環橫向排列容器 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 0',
        }}
      >
        {gauges.map((g) => (
          <SingleGauge key={g.label} label={g.label} percent={g.percent} color={g.color} />
        ))}
      </div>

      {/* 底部總結說明列 */}
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
        <span>多維量化健康度綜合評分</span>
        <strong style={{ color: '#38bdf8', fontWeight: 600 }}>{ratingText}</strong>
      </div>
    </div>
  );
};

export default HealthSummaryCard;
