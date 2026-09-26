import React from 'react';
import { VolumeProfileData, VolumeProfileBucket } from '../../../types/aiForceDashboard';

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
  const buckets = data.buckets || [];

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
          marginBottom: '14px',
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
            04
          </span>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>
            AI 籌碼熱區圖
          </span>
        </div>

        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
          Volume Profile
        </span>
      </div>

      {/* 5 大價格分佈直方柱條 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flex: 1,
          justifyContent: 'space-around',
        }}
      >
        {buckets.map((b, idx) => {
          const style = getBucketStyle(b.type);
          const widthStr = calculateBarWidthPercent(b.percentage);

          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {/* 上方：標籤、價格區間與百分比 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: style.color,
                      boxShadow: `0 0 6px ${style.color}`,
                    }}
                  />
                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{b.label}</span>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                    ({b.priceMin.toLocaleString()} ~ {b.priceMax.toLocaleString()})
                  </span>
                </div>

                <span
                  style={{
                    color: style.color,
                    fontWeight: 800,
                    fontFamily: 'monospace',
                  }}
                >
                  {b.percentage}%
                </span>
              </div>

              {/* 下方：橫向長條進度條槽 */}
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <div
                  style={{
                    width: widthStr,
                    height: '100%',
                    borderRadius: '4px',
                    background: style.bgGrad,
                    boxShadow: `0 0 8px ${style.color}55`,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部多空結構分析標籤 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '10px',
          padding: '6px 10px',
          borderRadius: '8px',
          background: 'rgba(30, 41, 59, 0.45)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
        }}
      >
        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
          籌碼結構研判
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.78rem' }}>🔥</span>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#38bdf8',
              letterSpacing: '0.04em',
            }}
          >
            {data.bullBearFooterTag || '多空平衡'}
          </span>
        </div>
      </div>
    </div>
  );
};
