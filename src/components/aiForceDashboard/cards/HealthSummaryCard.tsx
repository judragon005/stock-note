import React from 'react';
import type { HealthSummaryData } from '../../../types/aiForceDashboard';
import { MoreVertical } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';
import { diagnoseHealthScore } from '../../../constants/aiForceGlossary';

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
  termId?: string;
}

const SingleGauge: React.FC<GaugeItemProps> = ({ label, percent, color, termId }) => {
  const radius = 21;
  const { circumference, strokeDashoffset, clamped } = calculateCircleProgress(percent, radius);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
      <div style={{ position: 'relative', width: '54px', height: '54px' }}>
        <svg width="54" height="54" viewBox="0 0 54 54">
          {/* 背景軌道 */}
          <circle
            cx="27"
            cy="27"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="4"
          />
          {/* 進度環 */}
          <circle
            cx="27"
            cy="27"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 27 27)"
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
            fontSize: '12px',
            fontWeight: 800,
            fontFamily: 'monospace',
            color: '#f8fafc',
          }}
        >
          {clamped}%
        </div>
      </div>
      <TermTooltip termId={termId}>
        <span style={{ fontSize: '0.72rem', color: '#cbd5e1', whiteSpace: 'nowrap', fontWeight: 600 }}>{label}</span>
      </TermTooltip>
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
    { label: '籌碼健康度', percent: chipHealth, color: '#38bdf8', termId: 'chipsHealth' },
    { label: '技術結構度', percent: technicalStructure, color: '#10b981', termId: 'techHealth' },
    { label: '資金動能度', percent: capitalMomentum, color: '#f59e0b', termId: 'momentumHealth' },
    { label: '波動風險度', percent: liquidityRisk, color: '#ec4899', termId: 'volatilityRisk' },
    { label: '法人支撐度', percent: institutionalSupport, color: '#8b5cf6', termId: 'instSupport' },
  ];

  return (
    <div
      data-testid="health-summary-card"
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
            11
          </span>
          <TermTooltip termId="healthScore">
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', cursor: 'help' }}>
              健康度綜合評估表
            </span>
          </TermTooltip>
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

      {/* 5 環橫向排列容器 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2px',
          flex: 1,
          padding: '6px 0',
        }}
      >
        {gauges.map((g) => (
          <SingleGauge key={g.label} label={g.label} percent={g.percent} color={g.color} termId={g.termId} />
        ))}
      </div>

      {/* 底部總評文字 */}
      <div
        style={{
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.7rem',
          textAlign: 'center',
          color: '#cbd5e1',
        }}
      >
        <TermTooltip termId="healthScore" dynamicDiagnosis={diagnoseHealthScore(calculated.averageScore)}>
          <span>
            總評：<span style={{ color: '#fbbf24', fontWeight: 700, cursor: 'help' }}>{ratingText}</span>
          </span>
        </TermTooltip>
      </div>
    </div>
  );
};

export default HealthSummaryCard;

