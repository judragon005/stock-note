import React, { useMemo } from 'react';
import { TdccDistributionData } from '../../../types/aiForceDashboard';
import { ColorThemeMode } from '../../../types/stock';
import { Users, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';

export interface TdccScales {
  leftMin: number;
  leftMax: number;
  rightMin: number;
  rightMax: number;
}

export interface TdccPaddingConfig {
  top: number;
  bottom: number;
}

/**
 * 計算 TDCC 雙軸極值 (左軸千張大戶 %，右軸股東人數)
 */
export function calculateTdccScales(
  history: TdccDistributionData['history'] = [],
  _height: number = 180,
  _padding: TdccPaddingConfig = { top: 20, bottom: 25 }
): TdccScales {
  if (!history || history.length === 0) {
    return {
      leftMin: 0,
      leftMax: 100,
      rightMin: 0,
      rightMax: 1000000,
    };
  }

  let minRatio = Infinity;
  let maxRatio = -Infinity;
  let minHolders = Infinity;
  let maxHolders = -Infinity;

  history.forEach((h) => {
    if (h.over1000Ratio < minRatio) minRatio = h.over1000Ratio;
    if (h.over1000Ratio > maxRatio) maxRatio = h.over1000Ratio;
    if (h.totalShareholders < minHolders) minHolders = h.totalShareholders;
    if (h.totalShareholders > maxHolders) maxHolders = h.totalShareholders;
  });

  const ratioSpan = maxRatio - minRatio || 1;
  const holdersSpan = maxHolders - minHolders || 100;

  return {
    leftMin: Number((minRatio - ratioSpan * 0.15).toFixed(2)),
    leftMax: Number((maxRatio + ratioSpan * 0.15).toFixed(2)),
    rightMin: Math.max(0, Math.floor(minHolders - holdersSpan * 0.15)),
    rightMax: Math.ceil(maxHolders + holdersSpan * 0.15),
  };
}

/**
 * 投影千張大戶比例至 SVG Y 座標 (左軸)
 */
export function projectTdccRatioToY(
  ratio: number,
  scales: TdccScales,
  height: number = 180,
  padding: TdccPaddingConfig = { top: 20, bottom: 25 }
): number {
  const usable = height - padding.top - padding.bottom;
  const span = scales.leftMax - scales.leftMin || 1;
  const norm = (ratio - scales.leftMin) / span;
  return Number((padding.top + usable * (1 - norm)).toFixed(1));
}

/**
 * 投影總股東人數至 SVG Y 座標 (右軸長條高度基準)
 */
export function projectTdccShareholdersToY(
  holders: number,
  scales: TdccScales,
  height: number = 180,
  padding: TdccPaddingConfig = { top: 20, bottom: 25 }
): number {
  const usable = height - padding.top - padding.bottom;
  const span = scales.rightMax - scales.rightMin || 1;
  const norm = (holders - scales.rightMin) / span;
  return Number((padding.top + usable * (1 - norm)).toFixed(1));
}

interface TdccDistributionCardProps {
  data: TdccDistributionData;
  colorTheme?: ColorThemeMode;
}

export const TdccDistributionCard: React.FC<TdccDistributionCardProps> = ({
  data,
  colorTheme: _colorTheme = 'taiwan',
}) => {
  const history = data.history || [];
  const chartWidth = 340;
  const chartHeight = 170;
  const padding = { top: 20, bottom: 25 };

  const scales = useMemo(
    () => calculateTdccScales(history, chartHeight, padding),
    [history, chartHeight]
  );

  const ratioLinePoints = useMemo(() => {
    if (history.length === 0) return '';
    const usableWidth = chartWidth - 40;
    const step = usableWidth / Math.max(1, history.length - 1);
    return history
      .map((h, i) => {
        const x = Number((20 + i * step).toFixed(1));
        const y = projectTdccRatioToY(h.over1000Ratio, scales, chartHeight, padding);
        return `${x},${y}`;
      })
      .join(' ');
  }, [history, scales, chartHeight]);

  const badgeColor = useMemo(() => {
    if (data.concentrationBadge.includes('高度集中') || data.concentrationBadge.includes('增持')) {
      return { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', border: 'rgba(16, 185, 129, 0.4)' };
    }
    if (data.concentrationBadge.includes('警戒') || data.concentrationBadge.includes('調節')) {
      return { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', border: 'rgba(239, 68, 68, 0.4)' };
    }
    return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
  }, [data.concentrationBadge]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(24, 33, 56, 0.8) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* 標題列 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '5px',
              background: 'rgba(139, 92, 246, 0.25)',
              color: '#a78bfa',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
            }}
          >
            CARD 19
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: '0.98rem',
              fontWeight: 700,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Users size={16} color="#a78bfa" />
            <TermTooltip termId="tdccDistribution">TDCC 集保千張大戶趨勢</TermTooltip>
          </h3>
        </div>

        {/* 狀態徽章 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            borderRadius: '999px',
            background: badgeColor.bg,
            border: `1px solid ${badgeColor.border}`,
            color: badgeColor.text,
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          {data.concentrationBadge.includes('高度集中') ? (
            <ShieldCheck size={13} />
          ) : data.concentrationBadge.includes('警戒') ? (
            <AlertTriangle size={13} />
          ) : (
            <TrendingUp size={13} />
          )}
          <span>{data.concentrationBadge}</span>
        </div>
      </div>

      {/* 空狀態防禦 */}
      {data.isEmpty ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 12px',
            color: '#94a3b8',
            textAlign: 'center',
            gap: '8px',
          }}
        >
          <Users size={32} opacity={0.3} />
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#cbd5e1' }}>
            {data.emptyMessage || '尚無集保分散資料'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {data.asOfDateText || '集保每週五收盤後更新'}
          </div>
        </div>
      ) : (
        <>
          {/* 指標概覽卡片 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(139, 92, 246, 0.15)',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>千張大戶持股比</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#c084fc' }}>
                {data.latestOver1000Ratio !== undefined ? `${data.latestOver1000Ratio.toFixed(2)}%` : '--'}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.15)',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>近 4 週大戶變動</div>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: (data.change4WeeksRatio ?? 0) >= 0 ? '#34d399' : '#f87171',
                }}
              >
                {data.change4WeeksRatio !== undefined
                  ? `${data.change4WeeksRatio >= 0 ? '+' : ''}${data.change4WeeksRatio.toFixed(2)}%`
                  : '--'}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.15)',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>總股東人數</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                {data.latestShareholders !== undefined
                  ? data.latestShareholders.toLocaleString()
                  : '--'}
              </div>
            </div>
          </div>

          {/* 雙軸 SVG 趨勢圖 */}
          <div style={{ flex: 1, position: 'relative', minHeight: '130px' }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="holderBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.08" />
                </linearGradient>
              </defs>

              {/* 背景網格線 */}
              <line
                x1="20"
                y1={padding.top}
                x2={chartWidth - 20}
                y2={padding.top}
                stroke="rgba(148, 163, 184, 0.12)"
                strokeDasharray="3 3"
              />
              <line
                x1="20"
                y1={chartHeight - padding.bottom}
                x2={chartWidth - 20}
                y2={chartHeight - padding.bottom}
                stroke="rgba(148, 163, 184, 0.12)"
              />

              {/* 右軸：總股東人數柱狀圖 */}
              {history.map((h, i) => {
                const usableWidth = chartWidth - 40;
                const step = usableWidth / Math.max(1, history.length - 1);
                const xCenter = 20 + i * step;
                const barWidth = Math.min(18, Math.max(8, step * 0.45));
                const yTop = projectTdccShareholdersToY(h.totalShareholders, scales, chartHeight, padding);
                const yBase = chartHeight - padding.bottom;
                const barHeight = Math.max(2, yBase - yTop);

                return (
                  <g key={`bar-${h.date}`}>
                    <rect
                      x={xCenter - barWidth / 2}
                      y={yTop}
                      width={barWidth}
                      height={barHeight}
                      fill="url(#holderBarGrad)"
                      rx="2"
                    />
                    {/* 日期標籤 */}
                    <text
                      x={xCenter}
                      y={chartHeight - 8}
                      fontSize="9"
                      fill="#64748b"
                      textAnchor="middle"
                    >
                      {h.date.substring(5)}
                    </text>
                  </g>
                );
              })}

              {/* 左軸：千張大戶持股比折線 */}
              {ratioLinePoints && (
                <polyline
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={ratioLinePoints}
                />
              )}

              {/* 折線資料節點圓點 */}
              {history.map((h, i) => {
                const usableWidth = chartWidth - 40;
                const step = usableWidth / Math.max(1, history.length - 1);
                const x = 20 + i * step;
                const y = projectTdccRatioToY(h.over1000Ratio, scales, chartHeight, padding);

                return (
                  <circle
                    key={`node-${h.date}`}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="#a855f7"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>

          {/* 底部圖例與基準日說明 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '0.72rem',
              color: '#64748b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c084fc' }} />
                千張大戶比 (%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#38bdf8' }} />
                總股東人數
              </span>
            </div>
            <span>{data.asOfDateText}</span>
          </div>
        </>
      )}
    </div>
  );
};
