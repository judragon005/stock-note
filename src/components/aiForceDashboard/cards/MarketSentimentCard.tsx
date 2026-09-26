import React from 'react';
import type { MarketSentimentData } from '../../../types/aiForceDashboard';
import { calculateGaugeNeedleAngle } from '../../../engine/marketSentimentEngine';
import { MoreVertical } from 'lucide-react';

export interface MarketSentimentCardProps {
  data?: MarketSentimentData;
}

/**
 * 依據情緒狀態與指數輸出色彩與中文標籤
 */
export function getSentimentBadgeMeta(
  state: 'FEAR' | 'NEUTRAL' | 'GREED',
  index: number
): { label: string; color: string; bg: string; border: string } {
  if (state === 'FEAR' || index <= 35) {
    return {
      label: `恐慌 (${index})`,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.15)',
      border: 'rgba(56, 189, 248, 0.3)',
    };
  }
  if (state === 'GREED' || index >= 65) {
    return {
      label: `貪婪 (${index})`,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.3)',
    };
  }
  return {
    label: `中性 (${index})`,
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.3)',
  };
}

export const MarketSentimentCard: React.FC<MarketSentimentCardProps> = ({ data }) => {
  const index = data?.overallSentimentIndex ?? 50;
  const retail = data?.retailSentimentPercent ?? 59;
  const institutional = data?.institutionalSentimentPercent ?? 55;
  const mainForce = data?.mainForceSentimentPercent ?? 58;

  const needleAngle = calculateGaugeNeedleAngle(index);

  const participantBars = [
    { label: '散戶情緒', percent: retail, color: '#f59e0b' },
    { label: '法人情緒', percent: institutional, color: '#38bdf8' },
    { label: '主力情緒', percent: mainForce, color: '#ec4899' },
  ];

  return (
    <div
      data-testid="market-sentiment-card"
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
      {/* 頂部標題與選單 */}
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
            13
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
            台股市場情緒儀表板
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

      {/* 主體：左側半圓彩虹儀表 + 右側參與者情緒水平條 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '110px 1fr',
          gap: '12px',
          alignItems: 'center',
          flex: 1,
        }}
      >
        {/* 左側半圓指針儀表 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100px', height: '58px', position: 'relative' }}>
            <svg width="100" height="58" viewBox="0 0 100 58">
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="35%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="75%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              {/* 弧形軌道 */}
              <path
                d="M 12 50 A 38 38 0 0 1 88 50"
                fill="none"
                stroke="url(#gaugeGrad)"
                strokeWidth="7"
                strokeLinecap="round"
              />
              {/* 刻度點 50 */}
              <circle cx="50" cy="12" r="1.5" fill="#ffffff" opacity="0.6" />
              {/* 中心圓軸 */}
              <circle cx="50" cy="50" r="5" fill="#f8fafc" />
              {/* 指針 */}
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="18"
                stroke="#f8fafc"
                strokeWidth="2.5"
                strokeLinecap="round"
                transform={`rotate(${needleAngle} 50 50)`}
                style={{ transition: 'transform 0.6s ease' }}
              />
            </svg>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '2px', fontWeight: 600 }}>
            市場情緒：<span style={{ color: '#fbbf24', fontWeight: 800 }}>中性</span>
          </span>
        </div>

        {/* 右側 3 條水平情緒條 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {participantBars.map((bar) => (
            <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: '#94a3b8' }}>{bar.label}：</span>
                <span style={{ color: '#f8fafc', fontWeight: 700, fontFamily: 'monospace' }}>
                  {bar.percent}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '5px',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div
                  style={{
                    width: `${bar.percent}%`,
                    height: '100%',
                    backgroundColor: bar.color,
                    borderRadius: '3px',
                    boxShadow: `0 0 6px ${bar.color}66`,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketSentimentCard;
