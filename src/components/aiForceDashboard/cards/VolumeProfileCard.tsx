import React, { useMemo } from 'react';
import { VolumeProfileData, VolumeProfileBucket } from '../../../types/aiForceDashboard';
import { MoreVertical } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';

export interface BucketStyle {
  color: string;
  bgGrad: string;
  borderColor: string;
}

/**
 * 依據成交量區間類型回傳視覺樣式
 */
export function getBucketStyle(type: VolumeProfileBucket['type']): BucketStyle {
  switch (type) {
    case 'resistance':
      return {
        color: '#ef4444',
        bgGrad: 'linear-gradient(90deg, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.75) 100%)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
      };
    case 'heavy':
      return {
        color: '#f59e0b',
        bgGrad: 'linear-gradient(90deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.75) 100%)',
        borderColor: 'rgba(245, 158, 11, 0.4)',
      };
    case 'dense':
      return {
        color: '#38bdf8',
        bgGrad: 'linear-gradient(90deg, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0.75) 100%)',
        borderColor: 'rgba(56, 189, 248, 0.4)',
      };
    case 'flat':
      return {
        color: '#94a3b8',
        bgGrad: 'linear-gradient(90deg, rgba(148, 163, 184, 0.25) 0%, rgba(148, 163, 184, 0.75) 100%)',
        borderColor: 'rgba(148, 163, 184, 0.4)',
      };
    case 'support':
    default:
      return {
        color: '#10b981',
        bgGrad: 'linear-gradient(90deg, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.75) 100%)',
        borderColor: 'rgba(16, 185, 129, 0.4)',
      };
  }
}

/**
 * 計算長條寬度百分比
 */
export function calculateBarWidthPercent(percentage: number): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  return `${clamped}%`;
}

export const GHOST_GRID_STYLE = {
  border: '1px solid rgba(255, 255, 255, 0.05)',
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
};

/**
 * 依據價位桶百分比識別 POC (大量成交峰) 與籌碼真空帶 (成交量最低區)
 */
export function identifyPocAndVacuum(buckets: VolumeProfileBucket[]): {
  pocBucketIndex: number;
  vacuumBucketIndex: number;
} {
  if (!buckets || buckets.length === 0) return { pocBucketIndex: -1, vacuumBucketIndex: -1 };
  let maxIdx = 0;
  let minIdx = 0;
  for (let i = 1; i < buckets.length; i++) {
    if (buckets[i].percentage > buckets[maxIdx].percentage) maxIdx = i;
    if (buckets[i].percentage < buckets[minIdx].percentage) minIdx = i;
  }
  return { pocBucketIndex: maxIdx, vacuumBucketIndex: minIdx };
}

/**
 * 計算最新現價在熱區圖縱軸上的 Y 軸相對比例與格式化現價文字
 */
export function calculateCurrentPricePointer(
  priceTicks: number[],
  currentPrice?: number,
  currentPriceYRatio?: number
): {
  ratio: number;
  displayPrice: string;
} {
  if (currentPriceYRatio != null && isFinite(currentPriceYRatio)) {
    const ratio = Math.max(0, Math.min(1, currentPriceYRatio));
    const displayPrice = currentPrice != null ? String(currentPrice) : '';
    return { ratio, displayPrice };
  }

  const maxP = priceTicks[0] ?? 2400;
  const minP = priceTicks[priceTicks.length - 1] ?? 1600;
  const span = Math.max(0.01, maxP - minP);
  const price = currentPrice ?? (maxP + minP) / 2;
  const ratio = Math.max(0, Math.min(1, (maxP - price) / span));
  return {
    ratio,
    displayPrice: String(price),
  };
}

export interface VolumeProfileCardProps {
  data: VolumeProfileData;
}

export const VolumeProfileCard: React.FC<VolumeProfileCardProps> = ({ data }) => {
  const buckets = data.buckets || [
    { label: '壓力區', percentage: 4, type: 'resistance', priceMin: 2350, priceMax: 2490 },
    { label: '大量成交區', percentage: 17, type: 'heavy', priceMin: 2200, priceMax: 2350 },
    { label: '密集成交區', percentage: 9, type: 'dense', priceMin: 2050, priceMax: 2200 },
    { label: '慣平區', percentage: 9, type: 'flat', priceMin: 1950, priceMax: 2050 },
    { label: '支撐區', percentage: 87, type: 'support', priceMin: 1730, priceMax: 1950 },
  ];

  // 自適應價格刻度 (優先使用 engine 計算出的 priceTicks，否則由 buckets 高低價推算)
  const priceTicks = useMemo(() => {
    if (data.priceTicks && data.priceTicks.length === 5) {
      return data.priceTicks;
    }
    const maxP = buckets[0]?.priceMax ?? 2400;
    const minP = buckets[buckets.length - 1]?.priceMin ?? 1600;
    const step = (maxP - minP) / 4;
    return [
      Math.round(maxP),
      Math.round(maxP - step),
      Math.round(maxP - step * 2),
      Math.round(maxP - step * 3),
      Math.round(minP),
    ];
  }, [data.priceTicks, buckets]);

  // 熱力欄位數據（優先使用 engine 動態計算的 4 欄週期熱力，否則回退）
  const heatmapColumns = useMemo(() => {
    if (data.heatmapColumns && data.heatmapColumns.length === 4) {
      return data.heatmapColumns;
    }
    return [
      {
        id: 'col-1',
        label: '近5日',
        cells: ['#1e293b', '#1e3a8a', '#2563eb', '#0284c7', '#06b6d4', '#10b981', '#047857', '#1e3a8a', '#0f172a'],
      },
      {
        id: 'col-2',
        label: '近10日',
        cells: ['#1e293b', '#1d4ed8', '#0284c7', '#10b981', '#84cc16', '#06b6d4', '#0369a1', '#1e3a8a', '#0f172a'],
      },
      {
        id: 'col-3',
        label: '近20日',
        cells: ['#1e3a8a', '#2563eb', '#0284c7', '#06b6d4', '#10b981', '#047857', '#0284c7', '#1d4ed8', '#1e293b'],
      },
      {
        id: 'col-4',
        label: '近60日',
        cells: ['#0f172a', '#1e3a8a', '#0369a1', '#0284c7', '#06b6d4', '#047857', '#10b981', '#1e3a8a', '#0f172a'],
      },
    ];
  }, [data.heatmapColumns]);

  // 識別大量成交峰 (POC) 與籌碼真空帶 (Ticket 05)
  const { pocBucketIndex, vacuumBucketIndex } = useMemo(
    () => identifyPocAndVacuum(buckets),
    [buckets]
  );

  // 計算現價水平指針線比例 (Ticket 05)
  const pricePointer = useMemo(
    () => calculateCurrentPricePointer(priceTicks, data.currentPrice, data.currentPriceYRatio),
    [priceTicks, data.currentPrice, data.currentPriceYRatio]
  );

  return (
    <div
      data-testid="volume-profile-card"
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
      {/* 頂部標題與右上選單 */}
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
            04
          </span>
          <TermTooltip termId="volumeHeavy" showIcon={true}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>
              AI 籌碼熱區圖
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

      {/* 主繪圖區：左側 Y 軸刻度 + 垂直熱力長條圖 + 右側色塊圖例 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: '10px',
          alignItems: 'stretch',
          flex: 1,
          minHeight: '250px',
        }}
      >
        {/* 1. Y 軸價格刻度 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            fontSize: '0.68rem',
            color: '#64748b',
            fontFamily: 'monospace',
            textAlign: 'right',
            paddingRight: '4px',
            paddingTop: '2px',
            paddingBottom: '2px',
          }}
        >
          {priceTicks.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>

        {/* 2. 垂直熱力色階柱列 (Heatmap Grid + Ghost Grid + 現價指示線) */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            gap: '5px',
            height: '100%',
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '6px',
            padding: '4px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            alignItems: 'stretch',
          }}
        >
          {/* 最新收盤價水平指針線 (Ticket 05) */}
          {pricePointer && (
            <div
              data-testid="current-price-indicator"
              style={{
                position: 'absolute',
                top: `${(pricePointer.ratio * 100).toFixed(1)}%`,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.3) 0%, #f59e0b 50%, #fbbf24 100%)',
                boxShadow: '0 0 8px rgba(245, 158, 11, 0.85)',
                pointerEvents: 'none',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.95)',
                  color: '#0f172a',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '3px',
                  transform: 'translateY(-50%)',
                  marginRight: '2px',
                  fontFamily: 'monospace',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap',
                }}
              >
                現價 {pricePointer.displayPrice}
              </span>
            </div>
          )}

          {heatmapColumns.map((col) => (
            <div
              key={col.id}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              {col.cells.map((c, i) => {
                const isDim = !c || c === '#0f172a' || c === 'transparent';
                return (
                  <div
                    key={i}
                    data-testid="heatmap-cell"
                    style={{
                      flex: 1,
                      backgroundColor: isDim ? GHOST_GRID_STYLE.backgroundColor : c,
                      border: GHOST_GRID_STYLE.border,
                      opacity: isDim ? 0.6 : 0.92,
                      borderRadius: '2px',
                      transition: 'all 0.2s',
                      boxShadow: !isDim ? `inset 0 0 4px ${c}33` : 'none',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* 3. 右側價格區間百分比圖例 (Vertical Legend + 大量峰/真空帶標籤) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            fontSize: '0.72rem',
            gap: '2px',
            minWidth: '85px',
            whiteSpace: 'nowrap',
            paddingTop: '2px',
            paddingBottom: '2px',
          }}
        >
          {buckets.map((b, idx) => {
            const style = getBucketStyle(b.type);
            const termMap: Record<VolumeProfileBucket['type'], string> = {
              resistance: 'volumeResistance',
              heavy: 'volumeHeavy',
              dense: 'volumeDense',
              flat: 'volumeBreakeven',
              support: 'volumeSupport',
            };
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '2px',
                      backgroundColor: style.color,
                      boxShadow: `0 0 6px ${style.color}66`,
                      flexShrink: 0,
                    }}
                  />
                  <TermTooltip termId={termMap[b.type]}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>{b.label}</span>
                  </TermTooltip>
                  {idx === pocBucketIndex && (
                    <span
                      style={{
                        fontSize: '0.58rem',
                        padding: '1px 3px',
                        borderRadius: '3px',
                        background: 'rgba(245, 158, 11, 0.25)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        fontWeight: 800,
                        marginLeft: '2px',
                        lineHeight: 1,
                      }}
                      title="POC 大量成交峰"
                    >
                      大量峰
                    </span>
                  )}
                  {idx === vacuumBucketIndex && (
                    <span
                      style={{
                        fontSize: '0.58rem',
                        padding: '1px 3px',
                        borderRadius: '3px',
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        fontWeight: 800,
                        marginLeft: '2px',
                        lineHeight: 1,
                      }}
                      title="籌碼真空帶"
                    >
                      真空帶
                    </span>
                  )}
                </div>
                <span
                  style={{
                    color: style.color,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    paddingLeft: '13px',
                  }}
                >
                  {b.percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部時間軸標籤 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          gap: '8px',
          paddingLeft: '32px',
          marginTop: '6px',
          fontSize: '0.66rem',
          color: '#64748b',
          fontFamily: 'monospace',
        }}
      >
        <span>近5日</span>
        <span>近10日</span>
        <span>近20日</span>
        <span>近60日</span>
      </div>
    </div>
  );
};

export default VolumeProfileCard;
