import React, { useMemo, useId } from 'react';
import { resolveDirectionalPalette } from '../../../constants/designTokens';
import { VwapCostStructureData, CostBandTimeNode } from '../../../types/aiForceDashboard';
import { ColorThemeMode, MarketType } from '../../../types/stock';
import { TermTooltip } from '../../common/TermTooltip';
import { diagnoseMainForceCost } from '../../../constants/aiForceGlossary';

/**
 * 解析當前基準股價，優先取 currentPrice，其次 mainForceAvgCost / mainForceVwap
 */
export function resolveVwapCurrentPrice(data: Partial<VwapCostStructureData>): number {
  return data.currentPrice ?? data.mainForceAvgCost ?? data.mainForceVwap ?? 0;
}

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
 * 格式化強弱指標偏離度字串與色彩 (支援 colorTheme 台股紅漲綠跌 / 國際綠漲紅跌)
 */
export function formatBiasMetric(
  biasPercent: number,
  colorTheme: ColorThemeMode = 'taiwan'
): BiasMetricResult {
  const isPositive = biasPercent > 0;
  const isNegative = biasPercent < 0;
  const { upColor: posColor, downColor: negColor } = resolveDirectionalPalette(colorTheme);
  let text = `${biasPercent.toFixed(1)}%`;
  if (isPositive) {
    text = `+${biasPercent.toFixed(1)}%`;
  }
  return {
    text,
    isPositive,
    color: isPositive ? posColor : isNegative ? negColor : '#fbbf24',
  };
}

export interface LegendItem {
  label: string;
  color: string;
  percentage?: number;
}

export const DEFAULT_LEGEND_BANDS: Array<{
  name: string;
  biasLabel: string;
  color: string;
  percentage?: number;
}> = [
  { name: '突破區', biasLabel: '>+5%', color: '#2563eb' },
  { name: '大量成交區', biasLabel: '+2~+5%', color: '#f97316' },
  { name: '主力成本區', biasLabel: '±2%', color: '#10b981' },
  { name: '套牢區', biasLabel: '<-2%', color: '#38bdf8' },
];

/**
 * 格式化圖例項目 (Spec 0239 T13: 100% 對齊 vwapCostEngine 四層名稱、色碼與百分比)
 */
export function formatLegendItems(bands?: VwapCostStructureData['bands']): LegendItem[] {
  const source = bands && bands.length === 4 ? bands : DEFAULT_LEGEND_BANDS;
  return source.map((b) => ({
    label: `${b.name}(${b.biasLabel.replace(/\s+/g, '')})`,
    color: b.color,
    percentage: 'percentage' in b ? b.percentage : undefined,
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
  colorTheme?: ColorThemeMode;
  market?: MarketType;
}

export const VwapCostStructureCard: React.FC<VwapCostStructureCardProps> = ({
  data,
  colorTheme = 'taiwan',
  market,
}) => {
  const uid = useId().replace(/:/g, '');
  const grad1Id = `areaGrad1-${uid}`;
  const grad2Id = `areaGrad2-${uid}`;
  const grad3Id = `areaGrad3-${uid}`;
  const grad4Id = `areaGrad4-${uid}`;

  const vwapCost = data.mainForceAvgCost ?? data.mainForceVwap ?? 0;
  const timeNodes = data.timeNodes && data.timeNodes.length > 0 ? data.timeNodes : [];
  const isEmpty = timeNodes.length === 0 || vwapCost <= 0;

  const biasMetric = useMemo(
    () => formatBiasMetric(data.biasPercent ?? 0, colorTheme),
    [data.biasPercent, colorTheme]
  );
  const legendItems = useMemo(() => formatLegendItems(data.bands), [data.bands]);

  const width = 340;
  const height = 130;
  const padding: ChartPadding = { left: 34, right: 10, top: 10, bottom: 25 };

  const mountainPaths = useMemo(
    () => buildStackedMountainPaths(timeNodes, width, height, padding),
    [timeNodes]
  );

  const formattedVwapPrice =
    market === 'US'
      ? `$${vwapCost.toFixed(2)}`
      : vwapCost.toLocaleString();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '14px',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 15, 28, 0.92) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* 頂部標題 */}
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
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
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
      </div>

      {isEmpty ? (
        <div
          data-testid="vwap-empty-state"
          style={{
            flex: 1,
            minHeight: '185px',
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
          <span style={{ fontWeight: 700, color: '#cbd5e1' }}>主力成本結構數據待計算</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>需累積至少 5 個交易日量價資料方可建構 20D VWAP 成本分佈</span>
        </div>
      ) : (
        <>
          {/* 獨立非遮擋圖例橫列 (含各層百分比) */}
          <div
            data-testid="vwap-legend-bar"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '4px 8px',
              padding: '4px 8px',
              marginBottom: '4px',
              borderRadius: '6px',
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.75rem',
            }}
          >
            {legendItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '4px',
                  color: '#cbd5e1',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
                  <span>{item.label}</span>
                </div>
                {item.percentage !== undefined && (
                  <span style={{ color: item.color, fontWeight: 700, fontFamily: 'monospace' }}>
                    {item.percentage}%
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* SVG 多層次波形面積堆疊圖繪製區 (Area Chart) */}
          <div style={{ width: '100%', flex: 1, minHeight: '150px', position: 'relative' }}>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id={grad1Id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#1e40af" stopOpacity="0.45" />
                </linearGradient>
                <linearGradient id={grad2Id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.45" />
                </linearGradient>
                <linearGradient id={grad3Id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.45" />
                </linearGradient>
                <linearGradient id={grad4Id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#c2410c" stopOpacity="0.45" />
                </linearGradient>
              </defs>

              {/* 左側 Y 軸真實累計比例刻度 (100% / 50% / 0%) */}
              <text x="2" y="20" fill="#94a3b8" fontSize="12" fontFamily="monospace">100%</text>
              <text x="6" y="64" fill="#94a3b8" fontSize="12" fontFamily="monospace">50%</text>
              <text x="10" y="108" fill="#94a3b8" fontSize="12" fontFamily="monospace">0%</text>

              {/* 動態多峰平滑山峰面積圖 */}
              {mountainPaths.layer4Path && (
                <path d={mountainPaths.layer4Path} fill={`url(#${grad4Id})`} />
              )}
              {mountainPaths.layer3Path && (
                <path d={mountainPaths.layer3Path} fill={`url(#${grad3Id})`} />
              )}
              {mountainPaths.layer2Path && (
                <path d={mountainPaths.layer2Path} fill={`url(#${grad2Id})`} />
              )}
              {mountainPaths.layer1Path && (
                <path d={mountainPaths.layer1Path} fill={`url(#${grad1Id})`} />
              )}

              {/* 底部 X 軸時間刻度 */}
              {timeNodes.map((n, idx) => {
                const x = padding.left + (timeNodes.length > 1 ? ((width - padding.left - padding.right) / (timeNodes.length - 1)) * idx : 50);
                return (
                  <text
                    key={'xdate-' + idx}
                    x={x}
                    y={height - 6}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="12"
                    fontFamily="monospace"
                  >
                    {n.dateLabel}
                  </text>
                );
              })}
            </svg>
          </div>
        </>
      )}

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
            dynamicDiagnosis={
              !isEmpty
                ? diagnoseMainForceCost(
                    resolveVwapCurrentPrice(data),
                    vwapCost,
                    market === 'US' ? 'USD' : 'TWD'
                  )
                : undefined
            }
          >
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>主力平均成本：</span>
          </TermTooltip>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: isEmpty ? '#94a3b8' : '#38bdf8',
            }}
          >
            {isEmpty ? '--' : formattedVwapPrice}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            ({data.referenceVwapLabel || '20日VWAP'})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <TermTooltip termId="annualDrift">
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>強弱指標：</span>
          </TermTooltip>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: isEmpty ? '#94a3b8' : biasMetric.color,
            }}
          >
            {isEmpty ? '--' : biasMetric.text}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VwapCostStructureCard;
