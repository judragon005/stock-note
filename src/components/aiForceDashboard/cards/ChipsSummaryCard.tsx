import React from 'react';
import type { ChipsSummaryData } from '../../../types/aiForceDashboard';
import { MoreVertical } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';

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
  const conclusionBadge = data?.conclusionBadge ?? '偏空觀望';
  const note = data?.verdictNote ?? '2026-09-18 短線偏空 | 借貸風險可控';
  const sparklineHistory = data?.sparklineHistory ?? [100, 250, 180, 420, 310, 520, 480, 620, 590, 600];

  const width = 80;
  const height = 45;
  const { pathD, areaD, isUp } = normalizeSparklinePoints(sparklineHistory, width, height);
  const sparkColor = isUp ? '#38bdf8' : '#ef4444';

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
    { label: '外資', value: foreign, termId: 'foreignFlow' },
    { label: '投信', value: trust, termId: 'trustFlow' },
    { label: '自營商', value: dealer, termId: 'dealerFlow' },
    { label: '三大法人', value: total, isMajor: true, termId: 'totalInstFlow' },
  ];

  return (
    <div
      data-testid="chips-summary-card"
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
            15
          </span>
          <TermTooltip termId="totalInstFlow">
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', cursor: 'help' }}>
              籌碼異動摘要
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

      {/* 主體：左側法人買賣張數明細 + 右側 Sparkline 微型走勢圖 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '10px',
          alignItems: 'center',
          flex: 1,
        }}
      >
        {/* 左側數值清單 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {chipItems.map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.74rem',
              }}
            >
              <TermTooltip termId={item.termId}>
                <span style={{ color: item.isMajor ? '#e2e8f0' : '#94a3b8', fontWeight: item.isMajor ? 700 : 500, cursor: 'help' }}>
                  {item.label}
                </span>
              </TermTooltip>
              <span
                style={{
                  color: getShareColor(item.value),
                  fontWeight: 800,
                  fontFamily: 'monospace',
                }}
              >
                {formatShares(item.value)}
              </span>
            </div>
          ))}
        </div>

        {/* 右側 Sparkline 走勢圖與 Y 軸刻度 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: `${width}px`, height: `${height}px`, position: 'relative' }}>
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
              <defs>
                <linearGradient id="chipsSparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {areaD && <path d={areaD} fill="url(#chipsSparkGrad)" />}
              {pathD && <path d={pathD} fill="none" stroke={sparkColor} strokeWidth="1.8" />}
            </svg>
          </div>
          {/* Y 軸刻度 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: `${height}px`,
              fontSize: '0.58rem',
              color: '#64748b',
              fontFamily: 'monospace',
            }}
          >
            <span>2300</span>
            <span>1300</span>
          </div>
        </div>
      </div>

      {/* 底部摘要結論 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.68rem',
        }}
      >
        <span style={{ color: '#94a3b8' }}>{note}</span>
        <TermTooltip termId="totalInstFlow">
          <span style={{ color: '#f87171', fontWeight: 800, cursor: 'help' }}>
            結論：{conclusionBadge}
          </span>
        </TermTooltip>
      </div>
    </div>
  );
};

export default ChipsSummaryCard;
