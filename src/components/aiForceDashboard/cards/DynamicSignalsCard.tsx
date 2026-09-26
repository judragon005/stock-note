import React from 'react';
import type { DynamicSignalsData } from '../../../types/aiForceDashboard';
import { MoreVertical } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';

export interface DynamicSignalsCardProps {
  data?: DynamicSignalsData;
}

/**
 * 依據信號關鍵字映射信號顏色
 */
export function getSignalLightColor(signalText: string): { color: string; bg: string; dot: string } {
  if (
    signalText.includes('強') ||
    signalText.includes('多') ||
    signalText.includes('偏強') ||
    signalText.includes('低風險')
  ) {
    return { color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', dot: '#10b981' };
  }
  if (
    signalText.includes('高') ||
    signalText.includes('空') ||
    signalText.includes('弱') ||
    signalText.includes('偏高')
  ) {
    return { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', dot: '#ef4444' };
  }
  return { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', dot: '#f59e0b' };
}

/**
 * 依據結論燈號取得總評判徽章設定
 */
export function getVerdictBadgeConfig(verdictLight: 'GREEN' | 'YELLOW' | 'RED') {
  switch (verdictLight) {
    case 'RED':
      return {
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.2)',
        border: 'rgba(239, 68, 68, 0.4)',
        glow: '0 0 10px rgba(239, 68, 68, 0.5)',
        text: '高風險 / 偏空',
      };
    case 'YELLOW':
      return {
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.2)',
        border: 'rgba(245, 158, 11, 0.4)',
        glow: '0 0 10px rgba(245, 158, 11, 0.5)',
        text: '中度風險 / 觀望',
      };
    case 'GREEN':
    default:
      return {
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.2)',
        border: 'rgba(16, 185, 129, 0.4)',
        glow: '0 0 10px rgba(16, 185, 129, 0.5)',
        text: '低風險 / 偏多',
      };
  }
}

export const DynamicSignalsCard: React.FC<DynamicSignalsCardProps> = ({ data }) => {
  const trendSignal = data?.trendSignal ?? '偏多偏強';
  const chipSignal = data?.chipSignal ?? '籌碼中性';
  const momentumSignal = data?.momentumSignal ?? '動能偏強';
  const riskSignal = data?.riskSignal ?? '波動風險偏高';
  const verdictLabel = data?.verdictLabel ?? '紅燈 (高風險)';

  const signalItems = [
    { title: '趨勢：', value: trendSignal, color: '#f87171', termId: 'decisionTrend' },
    { title: '籌碼：', value: chipSignal, color: '#fbbf24', termId: 'chipStructure' },
    { title: '動能：', value: momentumSignal, color: '#f87171', termId: 'radarMomentum' },
    { title: '風險：', value: riskSignal, color: '#f87171', termId: 'volatilityRisk' },
    { title: '燈號：', value: verdictLabel, color: '#ef4444', termId: 'trafficLight' },
  ];

  return (
    <div
      data-testid="dynamic-signals-card"
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
            12
          </span>
          <TermTooltip termId="trafficLight">
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', cursor: 'help' }}>
              AI 主力動態信號判斷
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

      {/* 條目清單 (對齊照片) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flex: 1,
          justifyContent: 'space-around',
        }}
      >
        {signalItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem',
            }}
          >
            <TermTooltip termId={item.termId}>
              <span style={{ color: '#94a3b8', cursor: 'help' }}>{item.title}</span>
            </TermTooltip>
            <span
              style={{
                color: item.color,
                fontWeight: 700,
              }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* 底部目前燈號標註 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.72rem',
        }}
      >
        <TermTooltip termId="trafficLight">
          <span style={{ color: '#94a3b8', cursor: 'help' }}>目前燈號：</span>
        </TermTooltip>
        <TermTooltip termId="trafficLight">
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'help' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                boxShadow: '0 0 8px #ef4444',
              }}
            />
            <span style={{ color: '#ef4444', fontWeight: 800 }}>紅燈</span>
          </div>
        </TermTooltip>
      </div>
    </div>
  );
};

export default DynamicSignalsCard;
