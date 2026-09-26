import React, { useMemo } from 'react';
import { RiskSpiderData } from '../../../types/aiForceDashboard';

export interface Point {
  x: number;
  y: number;
}

/**
 * 計算五角蛛網頂點坐標 (正上方為 index 0)
 */
export function calculateFiveAxisVertex(
  center: Point,
  radius: number,
  angleIndex: number,
  totalAxes: number = 5
): Point {
  const angle = (angleIndex * 2 * Math.PI) / totalAxes - Math.PI / 2;
  const x = Number((center.x + radius * Math.cos(angle)).toFixed(2));
  const y = Number((center.y + radius * Math.sin(angle)).toFixed(2));
  return { x, y };
}

export interface GridPolygonLevel {
  levelPercent: number;
  points: string;
}

/**
 * 產生五邊形同心網格 points
 */
export function buildPentagonGridPolygons(
  center: Point,
  maxRadius: number,
  levels: number = 4,
  totalAxes: number = 5
): GridPolygonLevel[] {
  const result: GridPolygonLevel[] = [];
  for (let i = 1; i <= levels; i++) {
    const levelPercent = (i / levels) * 100;
    const r = (maxRadius * i) / levels;
    const pts: string[] = [];
    for (let a = 0; a < totalAxes; a++) {
      const p = calculateFiveAxisVertex(center, r, a, totalAxes);
      pts.push(`${p.x},${p.y}`);
    }
    result.push({
      levelPercent,
      points: pts.join(' '),
    });
  }
  return result;
}

export interface RiskLevelBadgeStyle {
  label: string;
  color: string;
  bg: string;
  border: string;
}

/**
 * 依據主力風險等級取得徽章樣式
 */
export function getRiskLevelBadge(level: RiskSpiderData['mainForceRiskLevel']): RiskLevelBadgeStyle {
  switch (level) {
    case 'HIGH':
      return {
        label: '高',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.2)',
        border: 'rgba(239, 68, 68, 0.5)',
      };
    case 'MEDIUM_HIGH':
      return {
        label: '中高',
        color: '#f97316',
        bg: 'rgba(249, 115, 22, 0.2)',
        border: 'rgba(249, 115, 22, 0.5)',
      };
    case 'MEDIUM':
      return {
        label: '中',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.2)',
        border: 'rgba(245, 158, 11, 0.5)',
      };
    case 'LOW':
    default:
      return {
        label: '低',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.2)',
        border: 'rgba(16, 185, 129, 0.5)',
      };
  }
}

export interface RiskSpiderCardProps {
  data: RiskSpiderData;
}

const FIVE_AXIS_CONFIG = [
  { key: 'volatilityRisk', label: '波動', icon: '⚡' },
  { key: 'liquidityRisk', label: '流動', icon: '💧' },
  { key: 'chipRisk', label: '籌碼', icon: '📊' },
  { key: 'institutionalRisk', label: '法人', icon: '🏛️' },
  { key: 'trendRisk', label: '趨勢', icon: '📈' },
] as const;

import { MoreVertical } from 'lucide-react';

export const RiskSpiderCard: React.FC<RiskSpiderCardProps> = ({ data }) => {
  const center: Point = { x: 160, y: 120 };
  const maxRadius = 76;

  const scoreValues = useMemo(() => {
    return [
      data.volatilityRisk ?? 50,
      data.liquidityRisk ?? 30,
      data.chipRisk ?? 48,
      data.institutionalRisk ?? 55,
      data.trendRisk ?? 45,
    ];
  }, [data]);

  const gridPolygons = useMemo(
    () => buildPentagonGridPolygons(center, maxRadius, 4, 5),
    [center, maxRadius]
  );

  // 計算風險多邊形
  const dataPolygon = useMemo(() => {
    const vertices: Point[] = [];
    const pts: string[] = [];
    for (let i = 0; i < 5; i++) {
      const raw = scoreValues[i];
      const clamped = Math.max(0, Math.min(100, raw));
      const r = (maxRadius * clamped) / 100;
      const p = calculateFiveAxisVertex(center, r, i, 5);
      vertices.push(p);
      pts.push(`${p.x},${p.y}`);
    }
    return { points: pts.join(' '), vertices };
  }, [center, maxRadius, scoreValues]);

  // 放射線末端
  const radialAxes = useMemo(() => {
    return Array.from({ length: 5 }, (_, idx) => calculateFiveAxisVertex(center, maxRadius, idx, 5));
  }, [center, maxRadius]);

  // 文字標籤坐標
  const labelPositions = useMemo(() => {
    return FIVE_AXIS_CONFIG.map((cfg, idx) => {
      const pos = calculateFiveAxisVertex(center, maxRadius + 22, idx, 5);
      return {
        ...cfg,
        x: pos.x,
        y: pos.y,
        score: scoreValues[idx],
      };
    });
  }, [center, maxRadius, scoreValues]);

  const riskBadge = getRiskLevelBadge(data.mainForceRiskLevel || 'MEDIUM');

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
      {/* 標題列 */}
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
            05
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
            風險雷達圖
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

      {/* SVG 五角蛛網圖繪製區 */}
      <div style={{ width: '100%', flex: 1, minHeight: '220px', position: 'relative' }}>
        <svg
          viewBox="0 0 320 250"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="riskFillGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.15" />
            </radialGradient>
          </defs>

          {/* 同心背景五邊形網格 */}
          {gridPolygons.map((g, idx) => (
            <polygon
              key={idx}
              points={g.points}
              fill={idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'none'}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
              strokeDasharray={idx < 3 ? '2 2' : 'none'}
            />
          ))}

          {/* 5 條中心放射軸線 */}
          {radialAxes.map((axis, idx) => (
            <line
              key={idx}
              x1={center.x}
              y1={center.y}
              x2={axis.x}
              y2={axis.y}
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
            />
          ))}

          {/* 風險資料多邊形 */}
          <polygon
            points={dataPolygon.points}
            fill="url(#riskFillGrad)"
            stroke="#ef4444"
            strokeWidth="2"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.35))',
              transition: 'all 0.4s ease',
            }}
          />

          {/* 頂點圓點 */}
          {dataPolygon.vertices.map((v, idx) => (
            <circle
              key={idx}
              cx={v.x}
              cy={v.y}
              r="3.5"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          ))}

          {/* 外圍文字標籤 */}
          {labelPositions.map((lbl, idx) => (
            <g key={idx}>
              <text
                x={lbl.x}
                y={lbl.y - 4}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="10"
                fontWeight="600"
              >
                {lbl.icon} {lbl.label}
              </text>
              <text
                x={lbl.x}
                y={lbl.y + 8}
                textAnchor="middle"
                fill="#ef4444"
                fontSize="9.5"
                fontWeight="800"
                fontFamily="monospace"
              >
                {lbl.score}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* 底部主力風險狀態列 */}
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
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>主力風險等級：</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '5px',
              background: riskBadge.bg,
              color: riskBadge.color,
              border: `1px solid ${riskBadge.border}`,
              fontSize: '0.74rem',
              fontWeight: 800,
            }}
          >
            {riskBadge.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>主力風險指數：</span>
          <span
            style={{
              color: riskBadge.color,
              fontSize: '0.82rem',
              fontWeight: 800,
              fontFamily: 'monospace',
            }}
          >
            {data.mainForceRiskIndex ?? 60}%
          </span>
        </div>
      </div>
    </div>
  );
};
