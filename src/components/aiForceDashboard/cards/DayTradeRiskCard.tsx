import React, { useMemo } from 'react';
import { DayTradeRiskData } from '../../../types/aiForceDashboard';

export interface ProgressBarStyle {
  color: string;
  bgGrad: string;
  width: string;
}

/**
 * 依據風險百分比回傳進度條色彩與寬度
 */
export function getProgressBarStyle(percentage: number): ProgressBarStyle {
  const clamped = Math.max(0, Math.min(100, percentage));
  let color = '#10b981';
  let bgGrad = 'linear-gradient(90deg, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.9) 100%)';

  if (clamped >= 60) {
    color = '#ef4444';
    bgGrad = 'linear-gradient(90deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.9) 100%)';
  } else if (clamped >= 40) {
    color = '#f59e0b';
    bgGrad = 'linear-gradient(90deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.9) 100%)';
  }

  return {
    color,
    bgGrad,
    width: `${clamped}%`,
  };
}

export interface DayTradeRiskBadgeStyle {
  label: string;
  color: string;
  bg: string;
  border: string;
}

/**
 * 依據風險等級回傳徽章樣式
 */
export function getDayTradeRiskBadge(level: DayTradeRiskData['riskLevel']): DayTradeRiskBadgeStyle {
  switch (level) {
    case 'HIGH':
      return {
        label: '高',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.2)',
        border: 'rgba(239, 68, 68, 0.5)',
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

import { MoreVertical } from 'lucide-react';

export interface DayTradeRiskCardProps {
  data: DayTradeRiskData;
}

export const DayTradeRiskCard: React.FC<DayTradeRiskCardProps> = ({ data }) => {
  const items = useMemo(() => [
    { label: '主力賣出異常', value: data.abnormalSelling ?? 49, icon: '🚨' },
    { label: '籌碼過手率', value: data.turnoverRate ?? 57, icon: '🔄' },
    { label: '沖銷比例', value: data.dayTradeRatio ?? 53, icon: '⚡' },
    { label: '隔日回檔風險', value: data.pullbackRisk ?? 45, icon: '📉' },
    { label: '日內波動率', value: data.intradayVolatility ?? 62, icon: '🌊' },
  ], [data]);

  const riskBadge = useMemo(() => getDayTradeRiskBadge(data.riskLevel || 'MEDIUM'), [data.riskLevel]);

  const avgIndex = useMemo(() => {
    const sum = items.reduce((acc, cur) => acc + cur.value, 0);
    return Math.round(sum / items.length);
  }, [items]);

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
            09
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
            隔日沖風險分析
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

      {/* 5 條水平彩色進度條 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '11px',
          flex: 1,
          justifyContent: 'space-around',
        }}
      >
        {items.map((item, idx) => {
          const style = getProgressBarStyle(item.value);

          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem' }}>{item.icon}</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{item.label}</span>
                </div>
                <span
                  style={{
                    color: style.color,
                    fontWeight: 800,
                    fontFamily: 'monospace',
                  }}
                >
                  {item.value}%
                </span>
              </div>

              {/* 進度條背景槽與進度 */}
              <div
                style={{
                  width: '100%',
                  height: '7px',
                  borderRadius: '4px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <div
                  style={{
                    width: style.width,
                    height: '100%',
                    borderRadius: '4px',
                    background: style.bgGrad,
                    boxShadow: item.value >= 60 ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部風險等級與指數徽章列 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          padding: '6px 10px',
          borderRadius: '8px',
          background: 'rgba(30, 41, 59, 0.55)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>隔日沖風險等級：</span>
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
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>風險指數：</span>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: riskBadge.color,
            }}
          >
            {avgIndex}%
          </span>
        </div>
      </div>
    </div>
  );
};
