import React from 'react';
import type { ForceDistributionData } from '../../../types/aiForceDashboard';
import { MoreVertical } from 'lucide-react';

export interface ForceDistributionCardProps {
  data?: ForceDistributionData;
}

/**
 * 計算甜甜圈圓環的圓周與 strokeDasharray
 */
export function calculateDonutSegments(
  largePercent: number,
  retailPercent: number,
  radius = 32
) {
  const circumference = 2 * Math.PI * radius;
  const largeClamped = Math.max(0, Math.min(100, largePercent));
  const largeDash = (largeClamped / 100) * circumference;
  const retailClamped = Math.max(0, Math.min(100, retailPercent));
  const retailDash = (retailClamped / 100) * circumference;

  return {
    circumference: Math.round(circumference * 100) / 100,
    largeStrokeDasharray: `${Math.round(largeDash * 100) / 100} ${Math.round(circumference * 100) / 100}`,
    retailStrokeDasharray: `${Math.round(retailDash * 100) / 100} ${Math.round(circumference * 100) / 100}`,
  };
}

interface SingleRingProps {
  label: string;
  percent: number;
  color: string;
}

const SingleRing: React.FC<SingleRingProps> = ({ label, percent, color }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const strokeDashoffset = circumference * (1 - clamped / 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
      <div style={{ position: 'relative', width: '64px', height: '64px' }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="5"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
            style={{
              transition: 'stroke-dashoffset 0.6s ease',
              filter: `drop-shadow(0 0 6px ${color}66)`,
            }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 800,
            fontFamily: 'monospace',
            color: '#f8fafc',
          }}
        >
          {clamped}%
        </div>
      </div>
      <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#cbd5e1' }}>
        {label}
      </span>
    </div>
  );
};

export const ForceDistributionCard: React.FC<ForceDistributionCardProps> = ({ data }) => {
  const large = data?.largePlayerBuyPercent ?? 65;
  const retailBuy = data?.retailBuyPercent ?? 35;
  const retailSell = data?.retailSellPressurePercent ?? 36;
  const asOf = data?.asOfDateText ?? '資料時間：2026-09-18 (法人買進/賣出佔成交量比例，近 20 日平均)';

  return (
    <div
      data-testid="force-distribution-card"
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
            16
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
            買賣力分布圖
          </span>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            | 法人 vs 散戶
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

      {/* 主體：3 個並排獨立環形圓環 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          flex: 1,
          padding: '12px 0',
        }}
      >
        <SingleRing label="大戶買盤" percent={large} color="#f97316" />
        <SingleRing label="散戶買盤" percent={retailBuy} color="#fbbf24" />
        <SingleRing label="散戶賣盤" percent={retailSell} color="#10b981" />
      </div>

      {/* 底部時間與資料說明 */}
      <div
        style={{
          fontSize: '0.68rem',
          color: '#64748b',
          textAlign: 'center',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {asOf.startsWith('資料時間') ? asOf : `資料時間：${asOf}`}
      </div>
    </div>
  );
};

export default ForceDistributionCard;
