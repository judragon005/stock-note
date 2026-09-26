import React, { useMemo } from 'react';
import { VolumeProfileData, VolumeProfileBucket } from '../../../types/aiForceDashboard';
import { MoreVertical } from 'lucide-react';

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

  // 垂直價格刻度
  const priceTicks = [2400, 2200, 2000, 1800, 1600];

  // 熱力欄位數據（模擬照片中的多列垂直熱力長條，由上而下各層價格階梯色階）
  const heatmapColumns = useMemo(() => {
    return [
      {
        id: 'col-1',
        cells: [
          '#1e293b',
          '#1e3a8a',
          '#2563eb',
          '#0284c7',
          '#06b6d4',
          '#10b981',
          '#047857',
          '#1e3a8a',
          '#0f172a',
        ],
      },
      {
        id: 'col-2',
        cells: [
          '#1e293b',
          '#1d4ed8',
          '#0284c7',
          '#10b981',
          '#84cc16',
          '#06b6d4',
          '#0369a1',
          '#1e3a8a',
          '#0f172a',
        ],
      },
      {
        id: 'col-3',
        cells: [
          '#1e3a8a',
          '#2563eb',
          '#0284c7',
          '#06b6d4',
          '#10b981',
          '#047857',
          '#0284c7',
          '#1d4ed8',
          '#1e293b',
        ],
      },
      {
        id: 'col-4',
        cells: [
          '#0f172a',
          '#1e3a8a',
          '#0369a1',
          '#0284c7',
          '#06b6d4',
          '#047857',
          '#10b981',
          '#1e3a8a',
          '#0f172a',
        ],
      },
    ];
  }, []);

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
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>
            AI 籌碼熱區圖
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

      {/* 主繪圖區：左側 Y 軸刻度 + 垂直熱力長條圖 + 右側色塊圖例 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: '10px',
          alignItems: 'center',
          flex: 1,
          minHeight: '230px',
        }}
      >
        {/* 1. Y 軸價格刻度 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '190px',
            fontSize: '0.68rem',
            color: '#64748b',
            fontFamily: 'monospace',
            textAlign: 'right',
            paddingRight: '4px',
          }}
        >
          {priceTicks.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>

        {/* 2. 垂直熱力色階柱列 (Heatmap Grid) */}
        <div
          style={{
            display: 'flex',
            gap: '5px',
            height: '190px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '6px',
            padding: '4px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            alignItems: 'stretch',
          }}
        >
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
              {col.cells.map((c, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: c,
                    opacity: 0.88,
                    borderRadius: '1px',
                    transition: 'opacity 0.2s',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* 3. 右側價格區間百分比圖例 (Vertical Legend) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            height: '190px',
            fontSize: '0.72rem',
            gap: '4px',
          }}
        >
          {buckets.map((b, idx) => {
            const style = getBucketStyle(b.type);
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
                    }}
                  />
                  <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>{b.label}</span>
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
