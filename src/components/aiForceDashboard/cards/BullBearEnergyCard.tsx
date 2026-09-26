import React from 'react';
import type { BullBearEnergyData } from '../../../types/aiForceDashboard';

export interface BullBearEnergyCardProps {
  data?: BullBearEnergyData;
}

/**
 * 輔助計算函式：依據紅 K 與黑 K 成交量計算多空佔比與比值（具備防除零保護）
 */
export function calculateBullBearRatio(
  bullVolume: number,
  bearVolume: number
): { bullPercent: number; bearPercent: number; ratio: number; conclusion: string } {
  if (bullVolume <= 0 && bearVolume <= 0) {
    return {
      bullPercent: 50,
      bearPercent: 50,
      ratio: 1,
      conclusion: '均衡',
    };
  }

  if (bearVolume <= 0 && bullVolume > 0) {
    return {
      bullPercent: 100,
      bearPercent: 0,
      ratio: 99.99,
      conclusion: '極度偏多',
    };
  }

  if (bullVolume <= 0 && bearVolume > 0) {
    return {
      bullPercent: 0,
      bearPercent: 100,
      ratio: 0,
      conclusion: '極度偏空',
    };
  }

  const total = bullVolume + bearVolume;
  const bullPercent = Math.round((bullVolume / total) * 100);
  const bearPercent = 100 - bullPercent;
  const ratio = Math.round((bullVolume / bearVolume) * 100) / 100;

  let conclusion = '均衡';
  if (ratio > 1.05) {
    conclusion = '偏多';
  } else if (ratio < 0.95) {
    conclusion = '偏空';
  }

  return {
    bullPercent,
    bearPercent,
    ratio,
    conclusion,
  };
}

export const BullBearEnergyCard: React.FC<BullBearEnergyCardProps> = ({ data }) => {
  // 兜底預設值
  const bull = data?.bullEnergyPercent ?? 53;
  const bear = data?.bearEnergyPercent ?? 47;
  const ratio = data?.bullBearRatio ?? 1.13;
  const conclusion = data?.bullBearConclusion ?? '偏多';
  const note = data?.noteText ?? '(20日紅K量/黑K量)';

  const isBullDominant = bull >= bear;

  return (
    <div
      data-testid="bull-bear-energy-card"
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
      {/* 標題與圖示 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>⚡</span>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
            10 AI 多空能量儀
          </h3>
        </div>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: isBullDominant ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: isBullDominant ? '#f87171' : '#34d399',
            fontWeight: 600,
            border: `1px solid ${isBullDominant ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          }}
        >
          {conclusion}
        </span>
      </div>

      {/* 多空百分比大字看板 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            多方能量
          </span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444', letterSpacing: '-0.5px' }}>
            {bull}%
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>多空平衡 50%</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            空方能量
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          </span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', letterSpacing: '-0.5px' }}>
            {bear}%
          </span>
        </div>
      </div>

      {/* 雙色雙向橫向能量條 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '14px',
          backgroundColor: '#0f172a',
          borderRadius: '9999px',
          overflow: 'hidden',
          display: 'flex',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* 多方能量條 */}
        <div
          data-testid="bull-bar"
          style={{
            width: `${bull}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)',
            transition: 'width 0.4s ease',
          }}
        />

        {/* 空方能量條 */}
        <div
          data-testid="bear-bar"
          style={{
            width: `${bear}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
            transition: 'width 0.4s ease',
          }}
        />

        {/* 50% 基準線指針 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            width: '2px',
            backgroundColor: '#ffffff',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 6px rgba(255, 255, 255, 0.8)',
            zIndex: 2,
          }}
        />
      </div>

      {/* 底部說明資訊 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#94a3b8',
          marginTop: '2px',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div>
          <span>多空比：</span>
          <strong style={{ color: '#f8fafc', fontWeight: 600 }}>{ratio.toFixed(2)}</strong>
          <span style={{ marginLeft: '4px', color: isBullDominant ? '#f87171' : '#34d399' }}>{conclusion}</span>
        </div>
        <span style={{ color: '#64748b', fontSize: '10px' }}>{note}</span>
      </div>
    </div>
  );
};

export default BullBearEnergyCard;
