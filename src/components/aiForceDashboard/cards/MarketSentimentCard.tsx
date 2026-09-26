import React from 'react';
import type { MarketSentimentData } from '../../../types/aiForceDashboard';
import { calculateGaugeNeedleAngle } from '../../../engine/marketSentimentEngine';

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
  const state = data?.sentimentState ?? 'NEUTRAL';
  const retail = data?.retailSentimentPercent ?? 59;
  const institutional = data?.institutionalSentimentPercent ?? 55;
  const mainForce = data?.mainForceSentimentPercent ?? 58;

  const badgeMeta = getSentimentBadgeMeta(state, index);
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
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* 標題與狀態標籤 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🧭</span>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
            13 台股市場合情緒儀表板
          </h3>
        </div>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: badgeMeta.bg,
            color: badgeMeta.color,
            fontWeight: 600,
            border: `1px solid ${badgeMeta.border}`,
          }}
        >
          {badgeMeta.label}
        </span>
      </div>

      {/* 主體：左側半圓指針速度計 + 右側三類參與者情緒水平條 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr',
          gap: '12px',
          alignItems: 'center',
          padding: '4px 0',
        }}
      >
        {/* 左側 SVG 半圓速度計 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg width="120" height="66" viewBox="0 0 120 66">
            <defs>
              <linearGradient id="sentimentGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            {/* 底軌 */}
            <path
              d="M 15 58 A 45 45 0 0 1 105 58"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="7"
              strokeLinecap="round"
            />
            {/* 彩色漸層弧 */}
            <path
              d="M 15 58 A 45 45 0 0 1 105 58"
              fill="none"
              stroke="url(#sentimentGaugeGrad)"
              strokeWidth="7"
              strokeLinecap="round"
            />
            {/* 刻度文字 */}
            <text x="12" y="65" fill="#64748b" fontSize="8" textAnchor="start">
              恐慌
            </text>
            <text x="60" y="16" fill="#64748b" fontSize="8" textAnchor="middle">
              50
            </text>
            <text x="108" y="65" fill="#64748b" fontSize="8" textAnchor="end">
              貪婪
            </text>
            {/* 旋轉指針 */}
            <g transform={`rotate(${needleAngle} 60 58)`} style={{ transition: 'transform 0.5s ease' }}>
              <line x1="60" y1="58" x2="60" y2="24" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="60" cy="58" r="4" fill="#ffffff" />
            </g>
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 700, color: badgeMeta.color, marginTop: '2px' }}>
            {index}
          </span>
        </div>

        {/* 右側 3 類參與者情緒進度條 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {participantBars.map((bar) => (
            <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span style={{ color: '#94a3b8' }}>{bar.label}</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>{bar.percent}%</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#0f172a',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${bar.percent}%`,
                    height: '100%',
                    backgroundColor: bar.color,
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部說明 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#94a3b8',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <span>綜合市場動態情緒指標</span>
        <strong style={{ color: badgeMeta.color, fontWeight: 600 }}>{badgeMeta.label}</strong>
      </div>
    </div>
  );
};

export default MarketSentimentCard;
