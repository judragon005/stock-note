import React from 'react';
import type { ForceDistributionData } from '../../../types/aiForceDashboard';

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

export const ForceDistributionCard: React.FC<ForceDistributionCardProps> = ({ data }) => {
  const large = data?.largePlayerBuyPercent ?? 65;
  const retailBuy = data?.retailBuyPercent ?? 35;
  const retailSell = data?.retailSellPressurePercent ?? 36;
  const asOf = data?.asOfDateText ?? '法人買進/賣出佔成交量比例，依 20 日平均';

  const radius = 32;
  const { largeStrokeDasharray } = calculateDonutSegments(large, retailBuy, radius);

  const stats = [
    { label: '大戶買盤', value: `${large}%`, color: '#ef4444' },
    { label: '散戶買盤', value: `${retailBuy}%`, color: '#38bdf8' },
    { label: '散戶賣壓', value: `${retailSell}%`, color: '#f59e0b' },
  ];

  return (
    <div
      data-testid="force-distribution-card"
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
      {/* 標題與大戶主導標籤 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🍩</span>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
            16 買賣力分布圖
          </h3>
        </div>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            fontWeight: 600,
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          大戶主導 ({large}%)
        </span>
      </div>

      {/* 主體：左側甜甜圈 + 右側 3 欄數據 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '84px 1fr',
          gap: '12px',
          alignItems: 'center',
          padding: '2px 0',
        }}
      >
        {/* SVG 甜甜圈圖 */}
        <div style={{ position: 'relative', width: '84px', height: '84px' }}>
          <svg width="84" height="84" viewBox="0 0 84 84">
            {/* 散戶買盤底環 */}
            <circle
              cx="42"
              cy="42"
              r={radius}
              fill="transparent"
              stroke="#38bdf8"
              strokeWidth="7"
            />
            {/* 大戶買盤進度弧 */}
            <circle
              cx="42"
              cy="42"
              r={radius}
              fill="transparent"
              stroke="#ef4444"
              strokeWidth="7"
              strokeDasharray={largeStrokeDasharray}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform="rotate(-90 42 42)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444' }}>{large}%</span>
            <span style={{ fontSize: '9px', color: '#94a3b8' }}>大戶佔比</span>
          </div>
        </div>

        {/* 右側 3 欄數據條 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: s.color,
                  }}
                />
                <span style={{ color: '#94a3b8' }}>{s.label}</span>
              </div>
              <strong style={{ color: s.color, fontWeight: 600 }}>{s.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* 底部說明 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          color: '#64748b',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <span>{asOf}</span>
      </div>
    </div>
  );
};

export default ForceDistributionCard;
