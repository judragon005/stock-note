import React, { useMemo } from 'react';
import { ForecastConeData } from '../../../types/aiForceDashboard';
import { MoreVertical } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';
import { diagnoseForecastCone } from '../../../constants/aiForceGlossary';

export interface Point {
  x: number;
  y: number;
}

export interface PaddingConfig {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ProjectedConeResult {
  upperPoints: Point[];
  medianPoints: Point[];
  lowerPoints: Point[];
  priceRange: { min: number; max: number };
}

/**
 * 將時間節點的 upperPrice, medianPrice, lowerPrice 投影到 SVG 畫布座標
 */
export function projectForecastNodesToPoints(
  nodes: ForecastConeData['timeNodes'],
  width: number,
  height: number,
  padding: PaddingConfig = { left: 35, right: 35, top: 20, bottom: 25 }
): ProjectedConeResult {
  if (!nodes || nodes.length === 0) {
    return {
      upperPoints: [],
      medianPoints: [],
      lowerPoints: [],
      priceRange: { min: 2000, max: 2500 },
    };
  }

  // 1. 找出全域極大極小值
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  nodes.forEach((n) => {
    if (n.lowerPrice < minPrice) minPrice = n.lowerPrice;
    if (n.upperPrice > maxPrice) maxPrice = n.upperPrice;
  });

  if (!isFinite(minPrice) || !isFinite(maxPrice) || minPrice >= maxPrice) {
    const base = isFinite(minPrice) && minPrice > 0 ? minPrice : 2000;
    minPrice = base * 0.95;
    maxPrice = base * 1.05;
  }

  const span = maxPrice - minPrice;
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;

  const maxDay = nodes[nodes.length - 1].dayOffset || 10;

  const projectY = (price: number) => {
    const clamped = Math.max(minPrice, Math.min(maxPrice, price));
    const ratio = (clamped - minPrice) / span;
    return Number((padding.top + usableHeight * (1 - ratio)).toFixed(1));
  };

  const projectX = (day: number) => {
    const ratio = maxDay > 0 ? day / maxDay : 0;
    return Number((padding.left + usableWidth * ratio).toFixed(1));
  };

  const upperPoints = nodes.map((n) => ({ x: projectX(n.dayOffset), y: projectY(n.upperPrice) }));
  const medianPoints = nodes.map((n) => ({ x: projectX(n.dayOffset), y: projectY(n.medianPrice) }));
  const lowerPoints = nodes.map((n) => ({ x: projectX(n.dayOffset), y: projectY(n.lowerPrice) }));

  return {
    upperPoints,
    medianPoints,
    lowerPoints,
    priceRange: { min: minPrice, max: maxPrice },
  };
}

/**
 * 產生平滑折線或貝茲曲線 SVG Path
 */
export function buildForecastCurvePath(points: Point[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let path = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    // 採用三次貝茲平滑過渡
    const prev = points[i - 1];
    const curr = points[i];
    const cx1 = prev.x + (curr.x - prev.x) * 0.5;
    const cy1 = prev.y;
    const cx2 = prev.x + (curr.x - prev.x) * 0.5;
    const cy2 = curr.y;
    path += ` C ${cx1},${cy1} ${cx2},${cy2} ${curr.x},${curr.y}`;
  }
  return path;
}

/**
 * 產生扇形閉合填充區域 Path (upper 順行 ➔ lower 逆行 ➔ Z)
 */
export function buildConeAreaPath(upperPoints: Point[], lowerPoints: Point[]): string {
  if (!upperPoints.length || !lowerPoints.length) return '';

  let path = `M ${upperPoints[0].x},${upperPoints[0].y}`;
  for (let i = 1; i < upperPoints.length; i++) {
    const prev = upperPoints[i - 1];
    const curr = upperPoints[i];
    const cx1 = prev.x + (curr.x - prev.x) * 0.5;
    const cy1 = prev.y;
    const cx2 = prev.x + (curr.x - prev.x) * 0.5;
    const cy2 = curr.y;
    path += ` C ${cx1},${cy1} ${cx2},${cy2} ${curr.x},${curr.y}`;
  }

  // 逆向連回 lowerPoints
  const reversedLower = [...lowerPoints].reverse();
  for (let i = 0; i < reversedLower.length; i++) {
    const p = reversedLower[i];
    if (i === 0) {
      path += ` L ${p.x},${p.y}`;
    } else {
      const prev = reversedLower[i - 1];
      const cx1 = prev.x + (p.x - prev.x) * 0.5;
      const cy1 = prev.y;
      const cx2 = prev.x + (p.x - prev.x) * 0.5;
      const cy2 = p.y;
      path += ` C ${cx1},${cy1} ${cx2},${cy2} ${p.x},${p.y}`;
    }
  }

  path += ' Z';
  return path;
}

export interface SplitConePaths {
  bullAreaPath: string;
  bearAreaPath: string;
}

/**
 * 依據中位數曲線將發散錐拆分為上漲面(紅)與下跌面(綠)兩條獨立閉合路徑 (Spec 0144)
 */
export function buildSplitConePaths(
  upperPoints: Point[],
  medianPoints: Point[],
  lowerPoints: Point[]
): SplitConePaths {
  const bullAreaPath = buildConeAreaPath(upperPoints, medianPoints);
  const bearAreaPath = buildConeAreaPath(medianPoints, lowerPoints);
  return { bullAreaPath, bearAreaPath };
}

export interface YAxisTick {
  price: number;
  y: number;
  label: string;
}

/**
 * 動態計算整數 Y 軸刻度標籤與 Y 座標 (Spec 0144)
 */
export function generateYAxisTicks(
  minPrice: number,
  maxPrice: number,
  height: number,
  padding: PaddingConfig = { left: 35, right: 35, top: 20, bottom: 25 },
  desiredCount: number = 3
): YAxisTick[] {
  if (!isFinite(minPrice) || !isFinite(maxPrice) || minPrice >= maxPrice) {
    return [];
  }
  const span = maxPrice - minPrice;
  const usableHeight = height - padding.top - padding.bottom;

  const rawStep = span / (desiredCount + 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 100)));
  const normalized = rawStep / magnitude;
  let step = magnitude;
  if (normalized >= 5) step = magnitude * 5;
  else if (normalized >= 2) step = magnitude * 2;

  const ticks: YAxisTick[] = [];
  const start = Math.ceil(minPrice / step) * step;
  for (let p = start; p <= maxPrice; p += step) {
    const ratio = (p - minPrice) / span;
    if (ratio >= 0.08 && ratio <= 0.92) {
      const y = Number((padding.top + usableHeight * (1 - ratio)).toFixed(1));
      ticks.push({
        price: p,
        y,
        label: p >= 1000 ? `${p.toLocaleString()}` : `${p}`,
      });
    }
  }

  if (ticks.length < 2) {
    const mid1 = Math.round((minPrice + span * 0.3) / 50) * 50;
    const mid2 = Math.round((minPrice + span * 0.7) / 50) * 50;
    return [
      {
        price: mid1,
        y: Number((padding.top + usableHeight * (1 - (mid1 - minPrice) / span)).toFixed(1)),
        label: mid1.toLocaleString(),
      },
      {
        price: mid2,
        y: Number((padding.top + usableHeight * (1 - (mid2 - minPrice) / span)).toFixed(1)),
        label: mid2.toLocaleString(),
      },
    ];
  }

  return ticks;
}

export interface MainForceDirectionStyle {
  color: string;
  label: string;
}

/**
 * 取得主力方向機率色彩與標籤 (Spec 0144 對齊照片)
 */
export function getMainForceDirectionStyle(
  directionProb: number,
  bullishProb?: number,
  bearishProb?: number
): MainForceDirectionStyle {
  const isBull = (bullishProb ?? directionProb) >= (bearishProb ?? 50);
  return {
    color: isBull ? '#ef4444' : '#10b981',
    label: isBull ? '多頭' : '空頭',
  };
}

export interface ForecastConeCardProps {
  data: ForecastConeData;
}

const CONE_WIDTH = 340;
const CONE_HEIGHT = 180;
const CONE_PADDING: PaddingConfig = { left: 35, right: 35, top: 20, bottom: 25 };

export const ForecastConeCard: React.FC<ForecastConeCardProps> = ({ data }) => {
  const { upperPoints, medianPoints, lowerPoints, priceRange } = useMemo(
    () => projectForecastNodesToPoints(data.timeNodes, CONE_WIDTH, CONE_HEIGHT, CONE_PADDING),
    [data.timeNodes]
  );

  const upperPath = useMemo(() => buildForecastCurvePath(upperPoints), [upperPoints]);
  const medianPath = useMemo(() => buildForecastCurvePath(medianPoints), [medianPoints]);
  const lowerPath = useMemo(() => buildForecastCurvePath(lowerPoints), [lowerPoints]);

  const { bullAreaPath, bearAreaPath } = useMemo(
    () => buildSplitConePaths(upperPoints, medianPoints, lowerPoints),
    [upperPoints, medianPoints, lowerPoints]
  );

  const yAxisTicks = useMemo(
    () => generateYAxisTicks(priceRange.min, priceRange.max, CONE_HEIGHT, CONE_PADDING),
    [priceRange.min, priceRange.max]
  );

  const directionStyle = useMemo(
    () => getMainForceDirectionStyle(data.mainForceDirectionProb, data.bullishProb, data.bearishProb),
    [data.mainForceDirectionProb, data.bullishProb, data.bearishProb]
  );

  return (
    <div
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
      {/* 標題與選單列 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
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
            06
          </span>
          <TermTooltip
            termId="forecastUp"
            dynamicDiagnosis={diagnoseForecastCone(data.bullishProb ?? 48, data.bearishProb ?? 44)}
            showIcon={true}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
              累積型 AI 預測路徑圖
            </span>
          </TermTooltip>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
            | 依 60 日報酬統計推估
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

      {/* 圖例說明列 (對齊照片) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.68rem',
          marginBottom: '6px',
        }}
      >
        <TermTooltip termId="forecastUp">
          <span style={{ color: '#ef4444', fontWeight: 600 }}>■ 紅色：上漲機率 {data.bullishProb}%</span>
        </TermTooltip>
        <TermTooltip termId="forecastRange">
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>■ 黃色：震盪機率 {data.rangeProb}%</span>
        </TermTooltip>
        <TermTooltip termId="forecastDown">
          <span style={{ color: '#10b981', fontWeight: 600 }}>■ 綠色：下跌機率 {data.bearishProb}%</span>
        </TermTooltip>
      </div>

      {/* SVG 預測錐繪製區 */}
      <div style={{ width: '100%', flex: 1, minHeight: '180px', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${CONE_WIDTH} ${CONE_HEIGHT}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <defs>
            {/* 上漲扇形紅色漸層 (對齊照片) */}
            <linearGradient id="bullConeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
            </linearGradient>
            {/* 下跌扇形翠綠漸層 (對齊照片) */}
            <linearGradient id="bearConeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Y 軸橫向參考格線與左側價位刻度 (Spec 0144 對齊照片) */}
          {yAxisTicks.map((tick, idx) => (
            <g key={'ytick-' + idx}>
              <text
                x={CONE_PADDING.left - 5}
                y={tick.y + 3}
                textAnchor="end"
                fill="#64748b"
                fontSize="8"
                fontFamily="monospace"
              >
                {tick.label}
              </text>
              <line
                x1={CONE_PADDING.left}
                y1={tick.y}
                x2={CONE_WIDTH - CONE_PADDING.right}
                y2={tick.y}
                stroke="rgba(255, 255, 255, 0.07)"
                strokeDasharray="3 3"
              />
            </g>
          ))}

          {/* 雙色扇形半透明填充 (Spec 0144 對齊照片紅/綠分區) */}
          {bullAreaPath && (
            <path
              d={bullAreaPath}
              fill="url(#bullConeGrad)"
              stroke="none"
              style={{ filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.2))' }}
            />
          )}
          {bearAreaPath && (
            <path
              d={bearAreaPath}
              fill="url(#bearConeGrad)"
              stroke="none"
              style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.2))' }}
            />
          )}

          {/* 三條軌道曲線 */}
          {upperPath && <path d={upperPath} fill="none" stroke="#ef4444" strokeWidth="1.8" />}
          {medianPath && (
            <path
              d={medianPath}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          )}
          {lowerPath && <path d={lowerPath} fill="none" stroke="#10b981" strokeWidth="1.8" />}

          {/* 節點圓點標註 */}
          {upperPoints.map((p, idx) => (
            <circle key={'u' + idx} cx={p.x} cy={p.y} r="3" fill="#ef4444" stroke="#fff" strokeWidth="1" />
          ))}
          {lowerPoints.map((p, idx) => (
            <circle key={'l' + idx} cx={p.x} cy={p.y} r="3" fill="#10b981" stroke="#fff" strokeWidth="1" />
          ))}
          {medianPoints.map((p, idx) => (
            <circle key={'m' + idx} cx={p.x} cy={p.y} r="2.5" fill="#fbbf24" />
          ))}

          {/* 底部時間刻度標籤 */}
          {data.timeNodes.map((n, idx) => {
            const x = upperPoints[idx]?.x ?? CONE_PADDING.left;
            return (
              <text
                key={'t' + idx}
                x={x}
                y={CONE_HEIGHT - 5}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="sans-serif"
              >
                {n.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* 底部主力方向機率與漂移指標 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '6px',
          padding: '6px 10px',
          borderRadius: '8px',
          background: 'rgba(30, 41, 59, 0.45)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TermTooltip termId="forecastUp" dynamicDiagnosis={diagnoseForecastCone(data.bullishProb ?? 48, data.bearishProb ?? 44)}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>主力方向機率：</span>
          </TermTooltip>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: directionStyle.color,
            }}
          >
            {directionStyle.label} {data.mainForceDirectionProb}%
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <TermTooltip termId="annualDrift">
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>強弱指標：</span>
          </TermTooltip>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: data.annualizedDriftPercent >= 0 ? '#ef4444' : '#10b981',
            }}
          >
            {data.annualizedDriftPercent >= 0 ? `+${data.annualizedDriftPercent}%` : `${data.annualizedDriftPercent}%`} (年化漂移)
          </span>
        </div>
      </div>
    </div>
  );
};
