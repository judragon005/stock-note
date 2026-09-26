import React, { useMemo } from 'react';
import { MultiDimensionRadarData } from '../../../types/aiForceDashboard';
import { MoreVertical } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';
import { diagnoseHealthScore } from '../../../constants/aiForceGlossary';

export interface Point {
  x: number;
  y: number;
}

/**
 * 計算正多邊形上特定軸的頂點坐標 (以正上方為 12 點鐘方向 index 0)
 */
export function calculateRadarVertex(
  center: Point,
  radius: number,
  angleIndex: number,
  totalAxes: number = 6
): Point {
  const angle = (angleIndex * 2 * Math.PI) / totalAxes - Math.PI / 2;
  const x = Number((center.x + radius * Math.cos(angle)).toFixed(2));
  const y = Number((center.y + radius * Math.sin(angle)).toFixed(2));
  return { x, y };
}

export interface RadarGridLevel {
  levelPercent: number;
  points: string;
}

/**
 * 產生同心網格多邊形 points
 */
export function buildRadarGridPolygons(
  center: Point,
  maxRadius: number,
  levels: number = 4,
  totalAxes: number = 6
): RadarGridLevel[] {
  const result: RadarGridLevel[] = [];
  for (let i = 1; i <= levels; i++) {
    const levelPercent = (i / levels) * 100;
    const r = (maxRadius * i) / levels;
    const pts: string[] = [];
    for (let a = 0; a < totalAxes; a++) {
      const p = calculateRadarVertex(center, r, a, totalAxes);
      pts.push(`${p.x},${p.y}`);
    }
    result.push({
      levelPercent,
      points: pts.join(' '),
    });
  }
  return result;
}

export interface RadarDataPolygonResult {
  points: string;
  vertices: Point[];
}

/**
 * 依據各軸分數計算資料多邊形座標與 points 字串
 */
export function buildRadarDataPolygon(
  center: Point,
  maxRadius: number,
  values: number[],
  totalAxes: number = 6
): RadarDataPolygonResult {
  const vertices: Point[] = [];
  const pts: string[] = [];

  for (let i = 0; i < totalAxes; i++) {
    const rawVal = values[i] ?? 50;
    const clamped = Math.max(0, Math.min(100, rawVal));
    const r = (maxRadius * clamped) / 100;
    const p = calculateRadarVertex(center, r, i, totalAxes);
    vertices.push(p);
    pts.push(`${p.x},${p.y}`);
  }

  return {
    points: pts.join(' '),
    vertices,
  };
}

export interface GradeBadgeStyle {
  color: string;
  bg: string;
  borderColor: string;
  title: string;
}

/**
 * 依據評級代號 (A/B/C/D) 回傳色彩與定義
 */
export function getGradeBadgeStyle(grade: 'A' | 'B' | 'C' | 'D' | string): GradeBadgeStyle {
  switch (grade) {
    case 'A':
      return {
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgba(16, 185, 129, 0.5)',
        title: '極致優選',
      };
    case 'B':
      return {
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.2)',
        borderColor: 'rgba(56, 189, 248, 0.5)',
        title: '穩健良好',
      };
    case 'D':
      return {
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgba(239, 68, 68, 0.5)',
        title: '警示偏弱',
      };
    case 'C':
    default:
      return {
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.2)',
        borderColor: 'rgba(245, 158, 11, 0.5)',
        title: '中性觀望',
      };
  }
}

export interface MultiDimensionRadarCardProps {
  data: MultiDimensionRadarData;
}

const AXIS_CONFIG = [
  { key: 'institutional', label: '法人', icon: '🏛️' },
  { key: 'trend', label: '趨勢', icon: '📈' },
  { key: 'chips', label: '籌碼', icon: '📊' },
  { key: 'liquidity', label: '流動', icon: '💧' },
  { key: 'volatility', label: '波動', icon: '⚡' },
  { key: 'momentum', label: '動能', icon: '🚀' },
] as const;

export const MultiDimensionRadarCard: React.FC<MultiDimensionRadarCardProps> = ({ data }) => {
  const center: Point = { x: 160, y: 135 };
  const maxRadius = 88;

  const scoreValues = useMemo(() => {
    return [
      data.dimensions.institutional ?? 50,
      data.dimensions.trend ?? 50,
      data.dimensions.chips ?? 50,
      data.dimensions.liquidity ?? 50,
      data.dimensions.volatility ?? 50,
      data.dimensions.momentum ?? 50,
    ];
  }, [data.dimensions]);

  const gridPolygons = useMemo(
    () => buildRadarGridPolygons(center, maxRadius, 4, 6),
    [center, maxRadius]
  );

  const dataPolygon = useMemo(
    () => buildRadarDataPolygon(center, maxRadius, scoreValues, 6),
    [center, maxRadius, scoreValues]
  );

  const gradeStyle = getGradeBadgeStyle(data.overallGrade || 'C');

  // 計算 6 條從中心放射出的軸線末端
  const radialAxes = useMemo(() => {
    return AXIS_CONFIG.map((_, idx) => calculateRadarVertex(center, maxRadius, idx, 6));
  }, [center, maxRadius]);

  // 計算文字標籤位置 (比 maxRadius 再稍遠一點)
  const labelPositions = useMemo(() => {
    return AXIS_CONFIG.map((cfg, idx) => {
      const pos = calculateRadarVertex(center, maxRadius + 24, idx, 6);
      return {
        ...cfg,
        x: pos.x,
        y: pos.y,
        score: scoreValues[idx],
      };
    });
  }, [center, maxRadius, scoreValues]);

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
            03
          </span>
          <TermTooltip
            termId="radarInstitutional"
            dynamicDiagnosis={diagnoseHealthScore(data.overallScore ?? 56)}
            showIcon={true}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
              多維度判讀
            </span>
          </TermTooltip>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TermTooltip termId="chipsHealth" dynamicDiagnosis={diagnoseHealthScore(data.overallScore ?? 56)}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              綜合評分：<span style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>{data.overallScore ?? 56} / 100</span>
            </span>
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

      {/* SVG 六角蛛網繪圖區 */}
      <div style={{ width: '100%', flex: 1, minHeight: '220px', position: 'relative' }}>
        <svg
          viewBox="0 0 320 270"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.15" />
            </radialGradient>
          </defs>

          {/* 同心背景六邊形網格 */}
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

          {/* 6 條中心放射軸線 */}
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

          {/* 雷達資料填充多邊形 */}
          <polygon
            points={dataPolygon.points}
            fill="url(#radarFillGrad)"
            stroke="#38bdf8"
            strokeWidth="2"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.35))',
              transition: 'all 0.4s ease',
            }}
          />

          {/* 各頂點微光圓點 */}
          {dataPolygon.vertices.map((v, idx) => (
            <circle
              key={idx}
              cx={v.x}
              cy={v.y}
              r="3.5"
              fill="#38bdf8"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          ))}

          {/* 中心評級微型環 (對齊照片：大字 C + 56/100) */}
          <circle cx={center.x} cy={center.y} r="22" fill="rgba(15, 23, 42, 0.9)" stroke={gradeStyle.borderColor} strokeWidth="1.5" />
          <text
            x={center.x}
            y={center.y - 1}
            textAnchor="middle"
            fill={gradeStyle.color}
            fontSize="14"
            fontWeight="900"
            fontFamily="monospace"
          >
            {data.overallGrade || 'C'}
          </text>
          <text
            x={center.x}
            y={center.y + 12}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="8"
            fontWeight="700"
            fontFamily="monospace"
          >
            {data.overallScore ?? 56}/100
          </text>

          {/* 外圍 6 個維度標籤與分數 */}
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
                {lbl.label}
              </text>
              <text
                x={lbl.x}
                y={lbl.y + 8}
                textAnchor="middle"
                fill="#38bdf8"
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

      {/* 底部總評等級與總評分數 (對齊照片) */}
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
          fontSize: '0.74rem',
        }}
      >
        <span style={{ color: '#cbd5e1' }}>
          評級等級：<span style={{ color: gradeStyle.color, fontWeight: 800 }}>{data.overallGrade || 'C'} 級</span>
        </span>
        <span style={{ color: '#cbd5e1' }}>
          評級分數：<span style={{ color: '#38bdf8', fontWeight: 800, fontFamily: 'monospace' }}>{data.overallScore ?? 56} / 100</span>
        </span>
      </div>
    </div>
  );
};

export default MultiDimensionRadarCard;

