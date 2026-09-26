import React from 'react';
import type { DynamicSignalsData } from '../../../types/aiForceDashboard';

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
  const riskSignal = data?.riskSignal ?? '波動高特偏高';
  const verdictLight = data?.verdictLight ?? 'RED';
  const verdictLabel = data?.verdictLabel ?? '紅燈 (高風險)';

  const verdictConfig = getVerdictBadgeConfig(verdictLight);

  const signalItems = [
    { title: '趨勢維度', value: trendSignal },
    { title: '籌碼維度', value: chipSignal },
    { title: '動能維度', value: momentumSignal },
    { title: '風險維度', value: riskSignal },
  ];

  return (
    <div
      data-testid="dynamic-signals-card"
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
      {/* 頂部標題與主判定燈號 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🚥</span>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
            12 AI 主力動態信號判斷
          </h3>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '9999px',
            backgroundColor: verdictConfig.bg,
            border: `1px solid ${verdictConfig.border}`,
            boxShadow: verdictConfig.glow,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: verdictConfig.color,
              boxShadow: `0 0 8px ${verdictConfig.color}`,
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: 700, color: verdictConfig.color }}>
            {verdictLabel}
          </span>
        </div>
      </div>

      {/* 4 大信號維度清單 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          padding: '4px 0',
        }}
      >
        {signalItems.map((item) => {
          const colorMeta = getSignalLightColor(item.value);
          return (
            <div
              key={item.title}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: colorMeta.dot,
                    boxShadow: `0 0 6px ${colorMeta.dot}`,
                  }}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.title}</span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: colorMeta.color,
                }}
              >
                {item.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* 底部總評判橫幅 */}
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
        <span>
          結論：
          <strong style={{ color: verdictConfig.color, marginLeft: '4px' }}>{verdictLabel}</strong>
        </span>
        <span style={{ color: '#64748b', fontSize: '10px' }}>4 維信號動態交叉比對</span>
      </div>
    </div>
  );
};

export default DynamicSignalsCard;
