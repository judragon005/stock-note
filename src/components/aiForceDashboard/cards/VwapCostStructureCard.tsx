import React, { useMemo } from 'react';
import { VwapCostStructureData, CostBandTimeNode } from '../../../types/aiForceDashboard';
import { DEFAULT_TIME_NODES } from '../../../engine/vwapCostEngine';
import { MoreVertical } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';
import { diagnoseMainForceCost } from '../../../constants/aiForceGlossary';

export interface StackedBandSegment {
  name: string;
  biasLabel: string;
  percentage: number;
  color: string;
  startPct: number;
  endPct: number;
}

/**
 * 計算各成本帶的累計起點與終點百分比 (供 SVG 堆疊或長條切分)
 */
export function calculateStackedBandSegments(
  bands: VwapCostStructureData['bands']
): StackedBandSegment[] {
  if (!bands || bands.length === 0) return [];

  let accumulated = 0;
  return bands.map((b) => {
    const startPct = accumulated;
    const endPct = accumulated + b.percentage;
    accumulated = endPct;
    return {
      ...b,
      startPct,
      endPct,
    };
  });
}

export interface BiasMetricResult {
  text: string;
  isPositive: boolean;
  color: string;
}

/**
 * 格式化強弱指標偏離度字串與色彩 (Spec 0144 對齊照片天藍色冷調)
 */
export function formatBiasMetric(biasPercent: number): BiasMetricResult {
  const isPositive = biasPercent > 0;
  let text = `${biasPercent.toFixed(1)}%`;
  if (isPositive) {
    text = `+${biasPercent.toFixed(1)}%`;
  }
  return {
    text,
    isPositive,
    color: isPositive ? '#38bdf8' : biasPercent < 0 ? '#10b981' : '#fbbf24',
  };
}

export interface LegendItem {
  label: string;
  color: string;
}

export const DEFAULT_LEGEND_BANDS = [
  { name: '倉儲區', biasLabel: '>5%', color: '#f97316' },
  { name: '套牢區', biasLabel: '-2~-5%', color: '#10b981' },
  { name: '主力成本區', biasLabel: '±2%', color: '#38bdf8' },
  { name: '大量成交區', biasLabel: '±2~5%', color: '#1e40af' },
];

/**
 * 格式化右上圖例項目 (Spec 0144 對齊照片)
 */
export function formatLegendItems(bands?: VwapCostStructureData['bands']): LegendItem[] {
  const source = bands && bands.length === 4 ? bands : DEFAULT_LEGEND_BANDS;
  return source.map((b) => ({
    label: `${b.name}(${b.biasLabel.replace(/\s+/g, '')})`,
    color: b.color,
  }));
}

export interface StackedMountainPaths {
  layer1Path: string; // 頂層 倉儲區 (橘黃)
  layer2Path: string; // 第二層 套牢區 (翠綠)
  layer3Path: string; // 第三層 主力成本區 (天藍)
  layer4Path: string; // 底層 大量成交區 (深藍)
}

export interface ChartPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * 依據 4 時點之成本帶數列計算 4 層平滑閉合面積路徑 (Spec 0144)
 */
export function buildStackedMountainPaths(
  nodes: CostBandTimeNode[],
  width: number,
  height: number,
  padding: ChartPadding = { left: 30, right: 10, top: 10, bottom: 25 }
): StackedMountainPaths {
  const n = nodes.length;
  if (n === 0) {
    return { layer1Path: '', layer2Path: '', layer3Path: '', layer4Path: '' };
  }

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const baseY = height - padding.bottom;

  let maxVol = 0;
  nodes.forEach((node) => {
    const sum = node.heavyVol + node.costVol + node.trappedVol + node.inventoryVol;
    if (sum > maxVol) maxVol = sum;
  });
  const maxScale = Math.max(65, maxVol * 1.1);

  const xs: number[] = [];
  const y0s: number[] = [];
  const y1s: number[] = [];
  const y2s: number[] = [];
  const y3s: number[] = [];
  const y4s: number[] = [];

  nodes.forEach((node, i) => {
    const x = padding.left + (n > 1 ? (plotW / (n - 1)) * i : plotW / 2);
    const h1 = (node.heavyVol / maxScale) * plotH;
    const h2 = h1 + (node.costVol / maxScale) * plotH;
    const h3 = h2 + (node.trappedVol / maxScale) * plotH;
    const h4 = h3 + (node.inventoryVol / maxScale) * plotH;

    xs.push(Number(x.toFixed(1)));
    y0s.push(baseY);
    y1s.push(Number((baseY - h1).toFixed(1)));
    y2s.push(Number((baseY - h2).toFixed(1)));
    y3s.push(Number((baseY - h3).toFixed(1)));
    y4s.push(Number((baseY - h4).toFixed(1)));
  });

  const buildBandPath = (topYs: number[], bottomYs: number[]) => {
    let d = `M ${xs[0]},${topYs[0]}`;
    for (let i = 1; i < n; i++) {
      const cx1 = xs[i - 1] + (xs[i] - xs[i - 1]) * 0.5;
      const cy1 = topYs[i - 1];
      const cx2 = xs[i - 1] + (xs[i] - xs[i - 1]) * 0.5;
      const cy2 = topYs[i];
      d += ` C ${cx1},${cy1} ${cx2},${cy2} ${xs[i]},${topYs[i]}`;
    }
    // 連到底部曲線逆行
    d += ` L ${xs[n - 1]},${bottomYs[n - 1]}`;
    for (let i = n - 2; i >= 0; i--) {
      const cx1 = xs[i + 1] - (xs[i + 1] - xs[i]) * 0.5;
      const cy1 = bottomYs[i + 1];
      const cx2 = xs[i + 1] - (xs[i + 1] - xs[i]) * 0.5;
      const cy2 = bottomYs[i];
      d += ` C ${cx1},${cy1} ${cx2},${cy2} ${xs[i]},${bottomYs[i]}`;
    }
    d += ' Z';
    return d;
  };

  return {
    layer4Path: buildBandPath(y1s, y0s),
    layer3Path: buildBandPath(y2s, y1s),
    layer2Path: buildBandPath(y3s, y2s),
    layer1Path: buildBandPath(y4s, y3s),
  };
}

export interface VwapCostStructureCardProps {
  data: VwapCostStructureData;
}

export const VwapCostStructureCard: React.FC<VwapCostStructureCardProps> = ({ data }) => {
  const biasMetric = useMemo(() => formatBiasMetric(data.biasPercent ?? 7.5), [data.biasPercent]);
  const legendItems = useMemo(() => formatLegendItems(data.bands), [data.bands]);

  const timeNodes = data.timeNodes && data.timeNodes.length >= 4 ? data.timeNodes : DEFAULT_TIME_NODES;

  const width = 340;
  const height = 130;
  const padding: ChartPadding = { left: 30, right: 10, top: 10, bottom: 25 };

  const mountainPaths = useMemo(
    () => buildStackedMountainPaths(timeNodes, width, height, padding),
    [timeNodes]
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
      {/* 頂部標題與右上選單 (校正繁體字「分佈圖」) */}
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
            07
          </span>
          <TermTooltip
            termId="vwap20"
            showIcon={true}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
              主力成本結構分佈圖
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

      {/* SVG 多層次波形面積堆疊圖繪製區 (Area Chart) */}
      <div style={{ width: '100%', flex: 1, minHeight: '145px', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="areaGrad3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="areaGrad4" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e40af" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* 左側 Y 軸刻度 */}
          <text x="5" y="20" fill="#64748b" fontSize="8" fontFamily="monospace">60k</text>
          <text x="5" y="50" fill="#64748b" fontSize="8" fontFamily="monospace">40k</text>
          <text x="5" y="80" fill="#64748b" fontSize="8" fontFamily="monospace">20k</text>
          <text x="10" y="108" fill="#64748b" fontSize="8" fontFamily="monospace">0k</text>

          {/* 動態多峰平滑山峰面積圖 (Spec 0144) */}
          {mountainPaths.layer4Path && (
            <path d={mountainPaths.layer4Path} fill="url(#areaGrad4)" />
          )}
          {mountainPaths.layer3Path && (
            <path d={mountainPaths.layer3Path} fill="url(#areaGrad3)" />
          )}
          {mountainPaths.layer2Path && (
            <path d={mountainPaths.layer2Path} fill="url(#areaGrad2)" />
          )}
          {mountainPaths.layer1Path && (
            <path d={mountainPaths.layer1Path} fill="url(#areaGrad1)" />
          )}

          {/* 右上方浮動圖例 (對齊照片) */}
          <g transform="translate(230, 8)">
            {legendItems.map((item, idx) => (
              <g key={idx} transform={`translate(0, ${idx * 11})`}>
                <rect x="0" y="0" width="6" height="6" fill={item.color} rx="1" />
                <text x="9" y="5.5" fill="#cbd5e1" fontSize="6.5">
                  {item.label}
                </text>
              </g>
            ))}
          </g>

          {/* 底部 X 軸時間刻度 (動態對齊 4 時點) */}
          {timeNodes.map((n, idx) => {
            const x = padding.left + (timeNodes.length > 1 ? ((width - padding.left - padding.right) / (timeNodes.length - 1)) * idx : 50);
            return (
              <text
                key={'xdate-' + idx}
                x={x}
                y={height - 8}
                textAnchor="middle"
                fill="#64748b"
                fontSize="7.5"
                fontFamily="monospace"
              >
                {n.dateLabel}
              </text>
            );
          })}
        </svg>
      </div>

      {/* 底部主力平均成本與強弱指標 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '4px',
          padding: '6px 10px',
          borderRadius: '8px',
          background: 'rgba(30, 41, 59, 0.45)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TermTooltip
            termId="vwap20"
            dynamicDiagnosis={diagnoseMainForceCost(1240, data.mainForceAvgCost ?? data.mainForceVwap ?? 2131)}
          >
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>主力平均成本：</span>
          </TermTooltip>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: '#38bdf8',
            }}
          >
            {(data.mainForceAvgCost ?? data.mainForceVwap ?? 2131).toLocaleString()}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            ({data.referenceVwapLabel || '20日VWAP'})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <TermTooltip termId="annualDrift">
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>強弱指標：</span>
          </TermTooltip>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: biasMetric.color,
            }}
          >
            {biasMetric.text}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VwapCostStructureCard;
