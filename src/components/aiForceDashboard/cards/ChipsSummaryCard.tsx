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
  width = 160,
  height = 50
): { pathD: string; areaD: string; isUp: boolean; zeroY?: number } {
  if (!points || points.length === 0) {
    return { pathD: '', areaD: '', isUp: true };
  }
  if (points.length === 1) {
    return {
      pathD: `M 0 ${height / 2} L ${width} ${height / 2}`,
      areaD: `M 0 ${height / 2} L ${width} ${height / 2} L ${width} ${height} L 0 ${height} Z`,
      isUp: true,
      zeroY: height / 2,
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

  let zeroY: number | undefined = undefined;
  if (min <= 0 && max >= 0) {
    zeroY = Math.round((height - ((0 - min) / range) * (height - 6) - 3) * 10) / 10;
  }

  return { pathD, areaD, isUp, zeroY };
}

export const ChipsSummaryCard: React.FC<ChipsSummaryCardProps> = ({ data }) => {
  const foreign = data?.foreignNetShares ?? 0;
  const trust = data?.trustNetShares ?? 0;
  const dealer = data?.dealerNetShares ?? 0;
  const total = data?.threeInstitutionsTotal ?? (foreign + trust + dealer);
  const conclusionBadge = data?.conclusionBadge ?? '待命觀望';
  const note = data?.verdictNote ?? '尚無籌碼數據';
  const sparklineHistory = data?.sparklineHistory ?? [];

  const width = 160;
  const height = 50;
  const { pathD, areaD, isUp, zeroY } = normalizeSparklinePoints(sparklineHistory, width, height);
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

  if (data?.isUsMarket) {
    const micro = data.usMicroMetrics;
    const hasMicroMetrics = Boolean(micro);

    const usItems = micro
      ? [
          { label: 'RVOL 相對均量', value: micro.rvol !== undefined ? `${micro.rvol.toFixed(2)}x` : '--', color: (micro.rvol ?? 0) >= 1.2 ? '#ef4444' : '#94a3b8' },
          { label: 'VWAP 偏離', value: micro.vwapBiasPct !== undefined ? `${micro.vwapBiasPct >= 0 ? '+' : ''}${micro.vwapBiasPct.toFixed(2)}%` : '--', color: (micro.vwapBiasPct ?? 0) >= 0 ? '#ef4444' : '#10b981' },
          { label: 'MFI 機構量能', value: micro.mfiScore !== undefined ? `${micro.mfiScore.toFixed(0)}分` : '--', color: (micro.mfiScore ?? 0) >= 60 ? '#c084fc' : '#94a3b8' },
          { label: 'ATR 日振幅', value: micro.atrValue !== undefined ? `$${micro.atrValue.toFixed(2)}` : '--', color: '#38bdf8' },
        ]
      : [];

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
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
              美股微觀量價摘要
            </span>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#38bdf8',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(56, 189, 248, 0.15)',
            }}
          >
            {micro?.conclusionLabel || data?.conclusionBadge || '美股量價評分'}
          </span>
        </div>

        {hasMicroMetrics ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              alignItems: 'center',
              flex: 1,
              minWidth: 0,
            }}
          >
            {/* 左側美股微觀量價清單 (50%) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              {usItems.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.74rem',
                    minWidth: 0,
                  }}
                >
                  <span style={{ color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                  <span
                    style={{
                      color: item.color,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* 右側 Sparkline 寬幅走勢圖 (50%) */}
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: isUp ? '#38bdf8' : '#f87171',
                    background: isUp ? 'rgba(56, 189, 248, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {micro?.conclusionLabel || conclusionBadge}
                </span>
              </div>

              <div style={{ width: '100%', height: `${height}px`, position: 'relative' }}>
                <svg
                  width="100%"
                  height={height}
                  viewBox={`0 0 ${width} ${height}`}
                  preserveAspectRatio="none"
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="usChipsSparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={sparkColor} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={sparkColor} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {zeroY !== undefined && (
                    <line
                      data-testid="chips-zero-axis"
                      x1="0"
                      y1={zeroY}
                      x2={width}
                      y2={zeroY}
                      stroke="rgba(148, 163, 184, 0.35)"
                      strokeDasharray="3 3"
                    />
                  )}
                  {areaD && <path d={areaD} fill="url(#usChipsSparkGrad)" />}
                  {pathD && <path d={pathD} fill="none" stroke={sparkColor} strokeWidth="1.8" />}
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '8px',
              color: '#94a3b8',
              fontSize: '0.78rem',
            }}
          >
            <div>{data?.usMicroNote || '美股無三大法人日報，已切換為機構量價評分'}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              量能單位: 股 | 計價幣別: USD
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '0.68rem',
            color: '#64748b',
          }}
        >
          <span>{note}</span>
          <span>{data?.asOfDateText ? `基準日: ${data.asOfDateText}` : ''}</span>
        </div>
      </div>
    );
  }

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

      {/* 主體：等寬 50%:50% (左側法人買賣張數明細 + 右側寬幅 Sparkline 走勢圖) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* 左側數值清單 (50%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
          {chipItems.map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.74rem',
                minWidth: 0,
              }}
            >
              <TermTooltip termId={item.termId}>
                <span style={{ color: item.isMajor ? '#e2e8f0' : '#94a3b8', fontWeight: item.isMajor ? 700 : 500, cursor: 'help', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </TermTooltip>
              <span
                style={{
                  color: getShareColor(item.value),
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatShares(item.value)}
              </span>
            </div>
          ))}
        </div>

        {/* 右側 Sparkline 寬幅走勢圖與 0 軸分水嶺 (50%) */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, gap: '2px' }}>
          {/* 頂部動態結論標籤 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: isUp ? '#38bdf8' : '#f87171',
                background: isUp ? 'rgba(56, 189, 248, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              {conclusionBadge}
            </span>
          </div>

          <div style={{ width: '100%', height: `${height}px`, position: 'relative' }}>
            <svg
              width="100%"
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="chipsSparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* 0 軸水平分水嶺基準線 */}
              {zeroY !== undefined && (
                <line
                  data-testid="chips-zero-axis"
                  x1="0"
                  y1={zeroY}
                  x2={width}
                  y2={zeroY}
                  stroke="rgba(148, 163, 184, 0.35)"
                  strokeDasharray="3 3"
                />
              )}
              {areaD && <path d={areaD} fill="url(#chipsSparkGrad)" />}
              {pathD && <path d={pathD} fill="none" stroke={sparkColor} strokeWidth="1.8" />}
            </svg>
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
