import React, { useMemo } from 'react';
import { ForecastConeData } from '../../../types/aiForceDashboard';

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

export interface ForecastConeCardProps {
  data: ForecastConeData;
}

export const ForecastConeCard: React.FC<ForecastConeCardProps> = ({ data }) => {
  const width = 340;
  const height = 180;
  const padding: PaddingConfig = { left: 35, right: 35, top: 20, bottom: 25 };

  const { upperPoints, medianPoints, lowerPoints } = useMemo(
    () => projectForecastNodesToPoints(data.timeNodes, width, height, padding),
    [data.timeNodes]
  );

  const upperPath = useMemo(() => buildForecastCurvePath(upperPoints), [upperPoints]);
  const medianPath = useMemo(() => buildForecastCurvePath(medianPoints), [medianPoints]);
  const lowerPath = useMemo(() => buildForecastCurvePath(lowerPoints), [lowerPoints]);
  const coneAreaPath = useMemo(
    () => buildConeAreaPath(upperPoints, lowerPoints),
    [upperPoints, lowerPoints]
  );

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
      {/* 標題與情境機率摘要列 */}
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
              padding: '2px 7px',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.25)',
              color: '#60a5fa',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}
          >
            06
          </span>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>
            累積型 AI 預測路徑圖
          </span>
        </div>

        {/* 三大多空機率徽章 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem' }}>
          <span style={{ color: '#ef4444', fontWeight: 700 }}>
            漲 {data.bullishProb}%
          </span>
          <span style={{ color: '#fbbf24', fontWeight: 700 }}>
            盤 {data.rangeProb}%
          </span>
          <span style={{ color: '#10b981', fontWeight: 700 }}>
            跌 {data.bearishProb}%
          </span>
        </div>
      </div>

      {/* SVG 預測錐繪製區 */}
      <div style={{ width: '100%', flex: 1, minHeight: '190px', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="coneGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.12" />
            </linearGradient>
          </defs>

          {/* 背景參考格線 */}
          <line
            x1={padding.left}
            y1={height / 2}
            x2={width - padding.right}
            y2={height / 2}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeDasharray="3 3"
          />

          {/* 扇形半透明填充 */}
          {coneAreaPath && (
            <path
              d={coneAreaPath}
              fill="url(#coneGrad)"
              stroke="none"
              style={{ filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.2))' }}
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

          {/* 節點圓點與價格文字標註 */}
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
            const x = upperPoints[idx]?.x ?? padding.left;
            return (
              <text
                key={'t' + idx}
                x={x}
                y={height - 5}
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
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>主力方向機率：</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8' }}>
            多頭 {data.mainForceDirectionProb}%
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>年化漂移：</span>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: data.annualizedDriftPercent >= 0 ? '#ef4444' : '#10b981',
            }}
          >
            {data.annualizedDriftPercent >= 0 ? `+${data.annualizedDriftPercent}%` : `${data.annualizedDriftPercent}%`}
          </span>
        </div>
      </div>
    </div>
  );
};
