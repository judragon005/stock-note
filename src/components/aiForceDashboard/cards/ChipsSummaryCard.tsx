import React from 'react';
import type { ChipsSummaryData } from '../../../types/aiForceDashboard';

export interface ChipsSummaryCardProps {
  data?: ChipsSummaryData;
}

/**
 * 將數列歸一化轉換為 SVG 折線路徑 (Sparkline)
 */
export function normalizeSparklinePoints(
  points: number[],
  width = 90,
  height = 30
): { pathD: string; areaD: string; isUp: boolean } {
  if (!points || points.length === 0) {
    return { pathD: '', areaD: '', isUp: true };
  }
  if (points.length === 1) {
    return {
      pathD: `M 0 ${height / 2} L ${width} ${height / 2}`,
      areaD: `M 0 ${height / 2} L ${width} ${height / 2} L ${width} ${height} L 0 ${height} Z`,
      isUp: true,
    };
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = Math.round(i * stepX * 10) / 10;
    const y = Math.round((height - ((p - min) / range) * (height - 6) - 3) * 10) / 10;
    return `${x},${y}`;
  });

  const pathD = `M ${coords.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
  const isUp = points[points.length - 1] >= points[0];

  return { pathD, areaD, isUp };
}

export const ChipsSummaryCard: React.FC<ChipsSummaryCardProps> = ({ data }) => {
  const foreign = data?.foreignNetShares ?? -166;
  const trust = data?.trustNetShares ?? 89;
  const dealer = data?.dealerNetShares ?? 82;
  const total = data?.threeInstitutionsTotal ?? 5;
  const badge = data?.conclusionBadge ?? '偏空震盪';
  const note = data?.verdictNote ?? '短線偏空 | 追價風險可控';
  const sparklineHistory = data?.sparklineHistory ?? [100, 250, 180, 420, 310, 520, 480, 620, 590, 600];

  const { pathD, areaD, isUp } = normalizeSparklinePoints(sparklineHistory, 96, 36);
  const sparkColor = isUp ? '#ef4444' : '#10b981';

  const formatShares = (val: number) => {
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toLocaleString()} 張`;
  };

  const getShareColor = (val: number) => {
    if (val > 0) return '#ef4444';
    if (val < 0) return '#10b981';
    return '#94a3b8';
  };

  const chipItems = [
    { label: '外資', value: foreign },
    { label: '投信', value: trust },
    { label: '自營商', value: dealer },
    { label: '三大法人', value: total, isMajor: true },
  ];

  return (
    <div
      data-testid="chips-summary-card"
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
      {/* 標題與短評徽章 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>📊</span>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
            15 籌碼具體摘要
          </h3>
        </div>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: badge.includes('多') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: badge.includes('多') ? '#f87171' : '#34d399',
            fontWeight: 600,
            border: `1px solid ${badge.includes('多') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          }}
        >
          {badge}
        </span>
      </div>

      {/* 四大籌碼與 Sparkline 微圖 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr) 96px',
          gap: '8px',
          alignItems: 'center',
          padding: '2px 0',
        }}
      >
        {chipItems.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              padding: '6px 8px',
              borderRadius: '8px',
              border: item.isMajor ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.04)',
            }}
          >
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>{item.label}</span>
            <span
              style={{
                fontSize: item.isMajor ? '13px' : '12px',
                fontWeight: item.isMajor ? 700 : 600,
                color: getShareColor(item.value),
                marginTop: '2px',
              }}
            >
              {formatShares(item.value)}
            </span>
          </div>
        ))}

        {/* Sparkline 迷你走勢圖 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg width="96" height="36" viewBox="0 0 96 36">
            <defs>
              <linearGradient id="chipsSparklineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={sparkColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={sparkColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {areaD && <path d={areaD} fill="url(#chipsSparklineGrad)" />}
            {pathD && <path d={pathD} fill="none" stroke={sparkColor} strokeWidth="1.8" strokeLinecap="round" />}
          </svg>
          <span style={{ fontSize: '9px', color: '#64748b' }}>近10日籌碼走勢</span>
        </div>
      </div>

      {/* 底部短評說明 */}
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
        <span style={{ color: '#cbd5e1' }}>{note}</span>
        <strong style={{ color: getShareColor(total), fontWeight: 600 }}>合計 {formatShares(total)}</strong>
      </div>
    </div>
  );
};

export default ChipsSummaryCard;
