import React, { useMemo } from 'react';
import { InstitutionalFlowData } from '../../../types/aiForceDashboard';
import { ColorThemeMode } from '../../../types/stock';
import { MoreVertical } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';

export interface DualAxisScales {
  leftMin: number;
  leftMax: number;
  rightMin: number;
  rightMax: number;
  zeroY: number;
}

export interface PaddingConfig {
  top: number;
  bottom: number;
}

/**
 * 計算三大法人雙軸圖表之左右軸極值與左軸零軸 Y 座標
 */
export function calculateDualAxisScales(
  history: InstitutionalFlowData['history'],
  height: number,
  padding: PaddingConfig = { top: 20, bottom: 25 }
): DualAxisScales {
  if (!history || history.length === 0) {
    return {
      leftMin: -1000,
      leftMax: 1000,
      rightMin: 0,
      rightMax: 2000,
      zeroY: height / 2,
    };
  }

  // 1. 左軸：單日外資、投信、自營買賣張數極值
  let leftMin = 0;
  let leftMax = 0;
  history.forEach((h) => {
    leftMin = Math.min(leftMin, h.foreignShares, h.trustShares, h.dealerShares);
    leftMax = Math.max(leftMax, h.foreignShares, h.trustShares, h.dealerShares);
  });

  // 為防止貼頂底，增加 15% 留白
  const leftAbsMax = Math.max(Math.abs(leftMin), Math.abs(leftMax), 100) * 1.15;
  leftMin = -leftAbsMax;
  leftMax = leftAbsMax;

  // 2. 右軸：累計法人張數極值
  let rightMin = Infinity;
  let rightMax = -Infinity;
  history.forEach((h) => {
    if (h.cumulativeTotalShares < rightMin) rightMin = h.cumulativeTotalShares;
    if (h.cumulativeTotalShares > rightMax) rightMax = h.cumulativeTotalShares;
  });

  if (!isFinite(rightMin) || !isFinite(rightMax) || rightMin === rightMax) {
    rightMin = 0;
    rightMax = 2000;
  }
  const rightSpan = rightMax - rightMin || 1;
  rightMin -= rightSpan * 0.1;
  rightMax += rightSpan * 0.1;

  // 3. 左軸零軸 Y 座標
  const usableHeight = height - padding.top - padding.bottom;
  // 零軸正位於中軸 (因為 leftMin = -leftMax)
  const zeroY = Number((padding.top + usableHeight / 2).toFixed(1));

  return {
    leftMin,
    leftMax,
    rightMin,
    rightMax,
    zeroY,
  };
}

/**
 * 將單日買賣張數投影至 SVG Y 座標
 */
export function projectBarToY(
  value: number,
  scales: DualAxisScales,
  height: number,
  padding: PaddingConfig = { top: 20, bottom: 25 }
): number {
  const usableHeight = height - padding.top - padding.bottom;
  const span = scales.leftMax - scales.leftMin || 1;
  const ratio = (value - scales.leftMin) / span;
  return Number((padding.top + usableHeight * (1 - ratio)).toFixed(1));
}

/**
 * 將累計張數投影至 SVG Y 座標
 */
export function projectCumulativeToY(
  value: number,
  scales: DualAxisScales,
  height: number,
  padding: PaddingConfig = { top: 20, bottom: 25 }
): number {
  const usableHeight = height - padding.top - padding.bottom;
  const span = scales.rightMax - scales.rightMin || 1;
  const clamped = Math.max(scales.rightMin, Math.min(scales.rightMax, value));
  const ratio = (clamped - scales.rightMin) / span;
  return Number((padding.top + usableHeight * (1 - ratio)).toFixed(1));
}

export interface FormattedCell {
  text: string;
  color: string;
}

/**
 * 格式化買賣張數儲存格字串與色彩
 */
export function formatSharesCell(shares: number, colorTheme: ColorThemeMode = 'taiwan'): FormattedCell {
  const isTaiwan = colorTheme === 'taiwan';
  const posColor = isTaiwan ? '#ef4444' : '#10b981';
  const negColor = isTaiwan ? '#10b981' : '#ef4444';

  if (shares > 0) {
    return {
      text: `+${shares.toLocaleString()}`,
      color: posColor,
    };
  }
  if (shares < 0) {
    return {
      text: shares.toLocaleString(),
      color: negColor,
    };
  }
  return {
    text: '0',
    color: '#94a3b8',
  };
}

/**
 * 依據歷史計算近 20 日與近 5 日總結
 */
export function computeInstitutionalSummaries(history: InstitutionalFlowData['history']): {
  summary5Days: string;
  summary20Days: string;
} {
  if (!history || history.length === 0) {
    return {
      summary5Days: '偏空 (-64張)',
      summary20Days: '多頭 (20日+1,621張)',
    };
  }

  const recent5 = history.slice(-5);
  let sum5 = 0;
  recent5.forEach((h) => {
    sum5 += h.foreignShares + h.trustShares + h.dealerShares;
  });

  const sum20 = history[history.length - 1]?.cumulativeTotalShares ?? sum5;

  const stance5 = sum5 >= 0 ? '偏多' : '偏空';
  const stance20 = sum20 >= 0 ? '多頭' : '空頭';

  const s5Str = sum5 >= 0 ? `+${sum5.toLocaleString()}` : sum5.toLocaleString();
  const s20Str = sum20 >= 0 ? `+${sum20.toLocaleString()}` : sum20.toLocaleString();

  return {
    summary5Days: `${stance5} (${s5Str}張)`,
    summary20Days: `${stance20} (20日${s20Str}張)`,
  };
}

export interface InstitutionalFlowCardProps {
  data: InstitutionalFlowData;
  colorTheme?: ColorThemeMode;
}

export const InstitutionalFlowCard: React.FC<InstitutionalFlowCardProps> = ({
  data,
  colorTheme = 'taiwan',
}) => {
  const history = data.history || [];
  const recentDays = data.recentDaysTable || [];

  const chartWidth = 340;
  const chartHeight = 170;
  const padding = { top: 20, bottom: 25 };

  const scales = useMemo(
    () => calculateDualAxisScales(history, chartHeight, padding),
    [history, chartHeight]
  );

  const summaries = useMemo(
    () => computeInstitutionalSummaries(history),
    [history]
  );

  // 累計折線 points
  const cumulativePoints = useMemo(() => {
    if (history.length === 0) return '';
    const usableWidth = chartWidth - 30;
    const step = usableWidth / Math.max(1, history.length - 1);
    return history
      .map((h, i) => {
        const x = Number((15 + i * step).toFixed(1));
        const y = projectCumulativeToY(h.cumulativeTotalShares, scales, chartHeight, padding);
        return `${x},${y}`;
      })
      .join(' ');
  }, [history, scales, chartHeight]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.82) 0%, rgba(20, 30, 52, 0.78) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* 標題與三大法人圖例 */}
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
              background: 'rgba(59, 130, 246, 0.25)',
              color: '#60a5fa',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}
          >
            08
          </span>
          <TermTooltip termId="totalInstFlow" showIcon={true}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
              法人行為計量
            </span>
          </TermTooltip>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            | 三大法人買賣超 (張)
          </span>
        </div>

        {/* 圖例與選單 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem' }}>
          <TermTooltip termId="foreignFlow">
            <span style={{ color: '#38bdf8' }}>■ 外資</span>
          </TermTooltip>
          <TermTooltip termId="trustFlow">
            <span style={{ color: '#f59e0b' }}>■ 投信</span>
          </TermTooltip>
          <TermTooltip termId="dealerFlow">
            <span style={{ color: '#34d399' }}>■ 自營</span>
          </TermTooltip>
          <TermTooltip termId="totalInstFlow">
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>— 累計折線</span>
          </TermTooltip>
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
      </div>

      {/* 主體區：左側雙軸 SVG 圖表 + 右側近 3 日明細表格 (防碰撞分欄) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(200px, 1fr)',
          gap: '14px',
          flex: 1,
          alignItems: 'center',
          minWidth: 0,
        }}
      >
        {/* 左側雙軸 SVG 圖表 (Ticket 16) */}
        <div style={{ width: '100%', minHeight: '160px', position: 'relative', minWidth: 0 }}>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            style={{ width: '100%', height: '100%', display: 'block' }}
            preserveAspectRatio="none"
          >
            {/* 零軸基準線 */}
            <line
              x1={10}
              y1={scales.zeroY}
              x2={chartWidth - 10}
              y2={scales.zeroY}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="1"
            />

            {/* 每日直方柱 (外資、投信、自營) */}
            {history.map((h, i) => {
              const usableWidth = chartWidth - 30;
              const step = usableWidth / Math.max(1, history.length);
              const groupX = 15 + i * step;
              const barW = Math.max(2, (step - 4) / 3);

              // 外資
              const yF = projectBarToY(h.foreignShares, scales, chartHeight, padding);
              const topF = Math.min(yF, scales.zeroY);
              const heightF = Math.max(1, Math.abs(yF - scales.zeroY));

              // 投信
              const yT = projectBarToY(h.trustShares, scales, chartHeight, padding);
              const topT = Math.min(yT, scales.zeroY);
              const heightT = Math.max(1, Math.abs(yT - scales.zeroY));

              // 自營
              const yD = projectBarToY(h.dealerShares, scales, chartHeight, padding);
              const topD = Math.min(yD, scales.zeroY);
              const heightD = Math.max(1, Math.abs(yD - scales.zeroY));

              return (
                <g key={i}>
                  <rect x={groupX} y={topF} width={barW} height={heightF} fill="#38bdf8" rx="0.5" />
                  <rect x={groupX + barW + 1} y={topT} width={barW} height={heightT} fill="#f59e0b" rx="0.5" />
                  <rect x={groupX + (barW + 1) * 2} y={topD} width={barW} height={heightD} fill="#34d399" rx="0.5" />
                </g>
              );
            })}

            {/* 右軸累計折線 */}
            {cumulativePoints && (
              <polyline
                points={cumulativePoints}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))' }}
              />
            )}
          </svg>
        </div>

        {/* 右側近 3 日明細表格 (Ticket 17) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflowX: 'auto',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            paddingLeft: '10px',
            minWidth: 0,
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.73rem',
              fontFamily: 'monospace',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                <th style={{ padding: '4px', textAlign: 'left' }}>日期</th>
                <th style={{ padding: '4px', textAlign: 'right' }}>外資</th>
                <th style={{ padding: '4px', textAlign: 'right' }}>投信</th>
                <th style={{ padding: '4px', textAlign: 'right' }}>自營</th>
                <th style={{ padding: '4px', textAlign: 'right' }}>合計</th>
              </tr>
            </thead>
            <tbody>
              {recentDays.slice(-3).map((row, idx) => {
                const fF = formatSharesCell(row.foreignShares, colorTheme);
                const fT = formatSharesCell(row.trustShares, colorTheme);
                const fD = formatSharesCell(row.dealerShares, colorTheme);
                const fTotal = formatSharesCell(row.totalShares, colorTheme);

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '4px', color: '#cbd5e1' }}>{row.date}</td>
                    <td style={{ padding: '4px', textAlign: 'right', color: fF.color }}>{fF.text}</td>
                    <td style={{ padding: '4px', textAlign: 'right', color: fT.color }}>{fT.text}</td>
                    <td style={{ padding: '4px', textAlign: 'right', color: fD.color }}>{fD.text}</td>
                    <td style={{ padding: '4px', textAlign: 'right', color: fTotal.color, fontWeight: 700 }}>
                      {fTotal.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 底部總結標籤列 (Ticket 17) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '10px',
          padding: '6px 10px',
          borderRadius: '8px',
          background: 'rgba(30, 41, 59, 0.45)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TermTooltip termId="totalInstFlow">
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>累積買賣超：</span>
          </TermTooltip>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '5px',
              background: summaries.summary20Days.includes('多') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: summaries.summary20Days.includes('多') ? '#ef4444' : '#10b981',
              fontSize: '0.74rem',
              fontWeight: 800,
            }}
          >
            {data.cumulative20DaysSummary || summaries.summary20Days}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TermTooltip termId="totalInstFlow">
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>近5日買賣超：</span>
          </TermTooltip>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '5px',
              background: summaries.summary5Days.includes('多') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: summaries.summary5Days.includes('多') ? '#ef4444' : '#10b981',
              fontSize: '0.74rem',
              fontWeight: 800,
            }}
          >
            {data.recent5DaysSummary || summaries.summary5Days}
          </span>
        </div>
      </div>
    </div>
  );
};
