import React from 'react';
import type { HealthSummaryData } from '../../../types/aiForceDashboard';
import type { ColorThemeMode, MarketType } from '../../../types/stock';
import { TermTooltip } from '../../common/TermTooltip';
import { diagnoseHealthScore } from '../../../constants/aiForceGlossary';

export interface HealthSummaryCardProps {
  data?: HealthSummaryData;
  colorTheme?: ColorThemeMode;
  market?: MarketType;
}

/**
 * 輔助計算圓形進度環之周長與 offset (防禦 NaN / Infinity)
 */
export function calculateCircleProgress(percent: number, radius = 22) {
  const safePct = Number.isFinite(percent) ? percent : 0;
  const clamped = Math.max(0, Math.min(100, safePct));
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
    Math.max(0, Math.min(100, 100 - data.liquidityRisk)),
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

export const DONUT_GAUGE_CONFIG = {
  size: 76,
  radius: 30,
  strokeWidth: 6,
  percentFontSize: '15px',
  labelFontSize: '0.75rem',
};

interface GaugeItemProps {
  label: string;
  percent: number;
  color: string;
  termId?: string;
  subHint?: string;
}

const SingleGauge: React.FC<GaugeItemProps> = ({ label, percent, color, termId, subHint }) => {
  const { size, radius, strokeWidth, percentFontSize, labelFontSize } = DONUT_GAUGE_CONFIG;
  const { circumference, strokeDashoffset, clamped } = calculateCircleProgress(percent, radius);
  const centerCoord = size / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: '1 1 68px', minWidth: '64px' }}>
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* 背景軌道 */}
          <circle
            cx={centerCoord}
            cy={centerCoord}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
          />
          {/* 進度環 */}
          <circle
            cx={centerCoord}
            cy={centerCoord}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${centerCoord} ${centerCoord})`}
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
            fontSize: percentFontSize,
            fontWeight: 800,
            fontFamily: 'monospace',
            color: '#f8fafc',
            letterSpacing: '-0.3px',
          }}
        >
          {clamped}%
        </div>
      </div>
      <TermTooltip termId={termId}>
        <span style={{ fontSize: labelFontSize, color: '#e2e8f0', whiteSpace: 'nowrap', fontWeight: 700, letterSpacing: '0.2px' }}>
          {label}
        </span>
      </TermTooltip>
      {subHint && (
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
          ({subHint})
        </span>
      )}
    </div>
  );
};

export const HealthSummaryCard: React.FC<HealthSummaryCardProps> = ({ data, market }) => {
  const isUs = market === 'US';
  const safeNum = (v?: number, fallback: number = 50) => (Number.isFinite(v) ? (v as number) : fallback);
  const chipHealth = safeNum(data?.chipHealth, 55);
  const technicalStructure = safeNum(data?.technicalStructure, 80);
  const capitalMomentum = safeNum(data?.capitalMomentum, 58);
  const liquidityRisk = safeNum(data?.liquidityRisk, 5);
  const institutionalSupport = safeNum(data?.institutionalSupport, 50);

  const calculated = calculateOverallHealthScore({
    chipHealth,
    technicalStructure,
    capitalMomentum,
    liquidityRisk,
    institutionalSupport,
  });

  const ratingText = data?.overallRatingLabel ?? calculated.ratingLabel;

  const gauges: GaugeItemProps[] = [
    { label: isUs ? '籌碼結構' : '籌碼健康度', percent: chipHealth, color: '#38bdf8', termId: 'chipsHealth' },
    { label: '技術結構度', percent: technicalStructure, color: '#10b981', termId: 'techHealth' },
    { label: '資金動能度', percent: capitalMomentum, color: '#f59e0b', termId: 'momentumHealth' },
    { label: '流動性風險', percent: liquidityRisk, color: '#ec4899', termId: 'volatilityRisk', subHint: '越低越佳' },
    { label: isUs ? '機構支撐' : '法人支撐度', percent: institutionalSupport, color: '#8b5cf6', termId: 'instSupport' },
  ];

  return (
    <div
      data-testid="health-summary-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '10px 12px',
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
              fontSize: '0.75rem',
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
      </div>

      {/* 5 環橫向排列容器 (支援窄欄彈性換行) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '4px',
          flex: 1,
          padding: '6px 0',
        }}
      >
        {gauges.map((g) => (
          <SingleGauge
            key={g.label}
            label={g.label}
            percent={g.percent}
            color={g.color}
            termId={g.termId}
            subHint={g.subHint}
          />
        ))}
      </div>

      {/* 底部總評文字 */}
      <div
        style={{
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.75rem',
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

