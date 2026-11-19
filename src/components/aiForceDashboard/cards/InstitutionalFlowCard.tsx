import React, { useMemo } from 'react';
import { InstitutionalFlowData } from '../../../types/aiForceDashboard';
import { ColorThemeMode, MarketType } from '../../../types/stock';
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
 * 精簡日期格式為 MM/DD (Ticket 06: 防止 5 欄明細表格溢出擠壓)
 */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split(/[-/]/);
  if (parts.length >= 3) {
    return `${parts[1]}/${parts[2]}`;
  }
  return dateStr;
}

/**
 * 取得近 N 日明細資料切片 (Spec 0174: 升級為近 5 日全寬明細清單)
 *
 * @template T 泛型陣列元素型別
 * @param {T[]} history 原始依時間排序之歷史明細陣列
 * @param {number} [count=5] 取出最近的日數，預設為 5 日
 * @returns {T[]} 截取出的最近 N 筆資料切片；若傳入空陣列或無效資料則回傳空陣列
 */
export function getRecentDaysSlice<T>(history: T[], count = 5): T[] {
  if (!history || history.length === 0) return [];
  return history.slice(-count);
}

/**
 * 依據歷史計算近 20 日與近 5 日總結 (Zero-Mock: 空陣列絕不回傳 -64張 / +1,621張)
 */
export function computeInstitutionalSummaries(history: InstitutionalFlowData['history']): {
  summary5Days: string;
  summary20Days: string;
} {
  if (!history || history.length === 0) {
    return {
      summary5Days: '資料待補 (0張)',
      summary20Days: '資料待補 (20日0張)',
    };
  }

  const recent5 = history.slice(-5);
  let sum5 = 0;
  recent5.forEach((h) => {
    sum5 += h.foreignShares + h.trustShares + h.dealerShares;
  });

  const sum20 = history[history.length - 1]?.cumulativeTotalShares ?? sum5;

  const stance5 = sum5 > 0 ? '偏多' : sum5 < 0 ? '偏空' : '持平';
  const stance20 = sum20 > 0 ? '多頭' : sum20 < 0 ? '空頭' : '持平';

  const s5Str = sum5 > 0 ? `+${sum5.toLocaleString()}` : sum5.toLocaleString();
  const s20Str = sum20 > 0 ? `+${sum20.toLocaleString()}` : sum20.toLocaleString();

  return {
    summary5Days: `${stance5} (${s5Str}張)`,
    summary20Days: `${stance20} (20日${s20Str}張)`,
  };
}

export interface InstitutionalBarLayout {
  centers: number[];
  step: number;
  barW: number;
  gap: number;
  groupWidth: number;
  isDense: boolean;
}

/**
 * 統一三大法人直方柱群組與累計折線之 X 軸中心點，並動態縮放柱寬防止 39~60 日重疊
 */
export function computeInstitutionalBarLayout(
  count: number,
  chartWidth: number = 340,
  padX: number = 15
): InstitutionalBarLayout {
  if (count <= 0) {
    return { centers: [], step: 0, barW: 0, gap: 0, groupWidth: 0, isDense: false };
  }
  const usableWidth = chartWidth - padX * 2;
  const step = usableWidth / count;
  const isDense = count > 60;
  const gap = step < 10 ? 0.35 : 0.8;
  const barW = isDense
    ? Math.max(1, Math.min(4, step * 0.8))
    : Math.max(0.9, Math.min(6, (step * 0.78 - gap * 2) / 3));
  const groupWidth = isDense ? barW : barW * 3 + gap * 2;
  const centers = Array.from({ length: count }, (_, i) =>
    Number((padX + i * step + step / 2).toFixed(2))
  );
  return { centers, step, barW, gap, groupWidth, isDense };
}

export interface InstitutionalFlowCardProps {
  data: InstitutionalFlowData;
  colorTheme?: ColorThemeMode;
  market?: MarketType;
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

  const barLayout = useMemo(
    () => computeInstitutionalBarLayout(history.length, chartWidth, 15),
    [history.length, chartWidth]
  );

  // 累計折線 points (與柱群組中心點 1:1 對齊)
  const cumulativePoints = useMemo(() => {
    if (history.length <= 1) return '';
    return history
      .map((h, i) => {
        const x = barLayout.centers[i] ?? 15;
        const y = projectCumulativeToY(h.cumulativeTotalShares, scales, chartHeight, padding);
        return `${x},${y}`;
      })
      .join(' ');
  }, [history, barLayout, scales, chartHeight]);

  const isTaiwan = colorTheme === 'taiwan';
  const posColor = isTaiwan ? '#ef4444' : '#10b981';
  const negColor = isTaiwan ? '#10b981' : '#ef4444';
  const posBg = isTaiwan ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
  const negBg = isTaiwan ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  const neutralBg = 'rgba(148, 163, 184, 0.15)';

  const summary20Text = data.cumulative20DaysSummary || summaries.summary20Days;
  const summary5Text = data.recent5DaysSummary || summaries.summary5Days;
  const getSummaryBadgeStyle = (txt: string) => {
    if (history.length === 0) return { bg: neutralBg, color: '#94a3b8' };
    if (txt.includes('多')) return { bg: posBg, color: posColor };
    if (txt.includes('空')) return { bg: negBg, color: negColor };
    return { bg: neutralBg, color: '#94a3b8' };
  };
  const s20Style = getSummaryBadgeStyle(summary20Text);
  const s5Style = getSummaryBadgeStyle(summary5Text);

  // Ticket 04 (Spec 0169): 美股標的獨立微觀量價動能視圖 (徹底根除外資/投信/自營商假數據)
  if (data.isUsMarket || data.usMicrostructure) {
    const micro = data.usMicrostructure || {
      score: 50,
      sentimentLabel: '動能中性',
      mfi: 50,
      obvTrend: 'FLAT',
      volumeRatio: 1.0,
      note: '美股無三大法人日報，已切換為機構量價評分',
    };

    const scoreColor =
      micro.score >= 65 ? '#34d399' : micro.score <= 40 ? '#f87171' : '#38bdf8';

    return (
      <div
        data-testid="us-institutional-flow-card"
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '12px',
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
              08
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
              美股微觀量價動能 (Microstructure)
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              | 機構量價評分
            </span>
          </div>

          <span
            style={{
              padding: '3px 8px',
              borderRadius: '999px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: scoreColor,
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {micro.sentimentLabel}
          </span>
        </div>

        {/* 3 大指標卡片 */}
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
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>機構量價評分</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: scoreColor }}>
              {micro.score} 分
            </div>
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.2)',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>資金流量 MFI</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
              {micro.mfi}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>5D/20D 量能比</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
              {micro.volumeRatio}x
            </div>
          </div>
        </div>

        {/* OBV 能量潮態勢 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            gap: '4px',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>能量潮態勢 (OBV Trend)</span>
            <span style={{ color: micro.obvTrend === 'UP' ? '#34d399' : micro.obvTrend === 'DOWN' ? '#f87171' : '#94a3b8', fontWeight: 700 }}>
              {micro.obvTrend === 'UP' ? '資金主動進駐 (累積偏多)' : micro.obvTrend === 'DOWN' ? '資金逢高調節 (承壓)' : '多空動能平衡'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {micro.note}
          </div>
        </div>

        {/* 腳註 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
            fontSize: '0.75rem',
            color: '#94a3b8',
          }}
        >
          <span>量能單位: 股 | 計價: USD</span>
          <span>{data.asOfDateText ? `基準日: ${data.asOfDateText}` : '美股交易日'}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 15, 28, 0.92) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(0, 0, 0, 0.35)',
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
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
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
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            | 三大法人買賣超 (張)
          </span>
        </div>

        {/* 圖例 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
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
        </div>
      </div>

      {/* 主體區：空狀態或上下結構 */}
      {history.length === 0 ? (
        <div
          data-testid="inst-flow-empty-state"
          style={{
            flex: 1,
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.45)',
            borderRadius: '10px',
            border: '1px dashed rgba(148, 163, 184, 0.25)',
            color: '#94a3b8',
            fontSize: '0.8rem',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontWeight: 700, color: '#cbd5e1' }}>尚無三大法人買賣超日報數據</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>待證交所/櫃買中心法人日報同步後自動更新雙軸圖與近5日明細</span>
        </div>
      ) : (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* 上方雙軸 SVG 圖表 */}
        <div style={{ width: '100%', minHeight: '140px', position: 'relative', minWidth: 0 }}>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            style={{ width: '100%', height: '100%', display: 'block' }}
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

            {/* 每日直方柱 (與折線共用 center X 座標，動態柱寬永不重疊) */}
            {history.map((h, i) => {
              const centerX = barLayout.centers[i] ?? 15;
              const { barW, gap, groupWidth, isDense } = barLayout;

              if (isDense) {
                const totalNet = h.foreignShares + h.trustShares + h.dealerShares;
                const yNet = projectBarToY(totalNet, scales, chartHeight, padding);
                const topNet = Math.min(yNet, scales.zeroY);
                const heightNet = Math.max(1, Math.abs(yNet - scales.zeroY));
                const isBull = totalNet >= 0;
                const barColor = isBull ? posColor : negColor;

                return (
                  <g key={i}>
                    <rect
                      x={centerX - barW / 2}
                      y={topNet}
                      width={barW}
                      height={heightNet}
                      fill={barColor}
                      opacity="0.85"
                      rx="0.3"
                    />
                  </g>
                );
              }

              const startX = centerX - groupWidth / 2;

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
                  <rect x={startX} y={topF} width={barW} height={heightF} fill="#38bdf8" rx="0.5" />
                  <rect x={startX + barW + gap} y={topT} width={barW} height={heightT} fill="#f59e0b" rx="0.5" />
                  <rect x={startX + (barW + gap) * 2} y={topD} width={barW} height={heightD} fill="#34d399" rx="0.5" />
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

            {/* 單筆資料時顯示累計圓點 */}
            {history.length === 1 && (
              <circle
                data-testid="inst-cumulative-single-dot"
                cx={barLayout.centers[0]}
                cy={projectCumulativeToY(history[0].cumulativeTotalShares, scales, chartHeight, padding)}
                r="4"
                fill="#fbbf24"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            )}
          </svg>
        </div>

        {/* 下方近 5 日明細表格 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'auto',
            background: 'rgba(15, 23, 42, 0.55)',
            borderRadius: '8px',
            padding: '6px 8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            minWidth: 0,
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.80rem',
              fontFamily: 'monospace',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                <th style={{ padding: '3px 6px', textAlign: 'left', whiteSpace: 'nowrap' }}>日期</th>
                <th style={{ padding: '3px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>外資</th>
                <th style={{ padding: '3px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>投信</th>
                <th style={{ padding: '3px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>自營</th>
                <th style={{ padding: '3px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>合計</th>
              </tr>
            </thead>
            <tbody>
              {getRecentDaysSlice(recentDays, 5).map((row, idx) => {
                const fF = formatSharesCell(row.foreignShares, colorTheme);
                const fT = formatSharesCell(row.trustShares, colorTheme);
                const fD = formatSharesCell(row.dealerShares, colorTheme);
                const fTotal = formatSharesCell(row.totalShares, colorTheme);

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '3px 6px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>{formatShortDate(row.date)}</td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', color: fF.color, whiteSpace: 'nowrap' }}>{fF.text}</td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', color: fT.color, whiteSpace: 'nowrap' }}>{fT.text}</td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', color: fD.color, whiteSpace: 'nowrap' }}>{fD.text}</td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', color: fTotal.color, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {fTotal.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}


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
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>累積買賣超：</span>
          </TermTooltip>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '5px',
              background: s20Style.bg,
              color: s20Style.color,
              fontSize: '0.75rem',
              fontWeight: 800,
            }}
          >
            {summary20Text}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TermTooltip termId="totalInstFlow">
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>近5日買賣超：</span>
          </TermTooltip>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '5px',
              background: s5Style.bg,
              color: s5Style.color,
              fontSize: '0.75rem',
              fontWeight: 800,
            }}
          >
            {summary5Text}
          </span>
        </div>

        {data.history && data.history.length > 0 && (
          <span
            data-testid="inst-flow-as-of-date"
            style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 'auto' }}
          >
            基準日: {data.history[data.history.length - 1].date}
          </span>
        )}
      </div>
    </div>
  );
};
