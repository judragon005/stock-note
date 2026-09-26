import React from 'react';
import type { BullBearEnergyData } from '../../../types/aiForceDashboard';
import { MoreVertical } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';
import { diagnoseBullBearEnergy } from '../../../constants/aiForceGlossary';

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
  const bull = data?.bullEnergyPercent ?? 53;
  const bear = data?.bearEnergyPercent ?? 47;
  const ratio = data?.bullBearRatio ?? 1.13;
  const note = data?.noteText ?? '(20日紅K量/黑K量)';

  return (
    <div
      data-testid="bull-bear-energy-card"
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
            10
          </span>
          <TermTooltip
            termId="bullBearRatio"
            dynamicDiagnosis={diagnoseBullBearEnergy(bull, bear, ratio)}
            showIcon={true}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
              AI 多空能量棒
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

      {/* 主體：多空能量水平對比條 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flex: 1,
          justifyContent: 'center',
          padding: '6px 0',
        }}
      >
        {/* 多方能量 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TermTooltip termId="bullEnergy">
            <span style={{ fontSize: '0.74rem', color: '#cbd5e1', width: '56px', whiteSpace: 'nowrap' }}>
              多方能量
            </span>
          </TermTooltip>
          <div
            style={{
              flex: 1,
              height: '9px',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              borderRadius: '5px',
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                width: `${bull}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                borderRadius: '5px',
                boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: '#34d399',
              width: '36px',
              textAlign: 'right',
            }}
          >
            {bull}%
          </span>
        </div>

        {/* 空方能量 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TermTooltip termId="bearEnergy">
            <span style={{ fontSize: '0.74rem', color: '#cbd5e1', width: '56px', whiteSpace: 'nowrap' }}>
              空方能量
            </span>
          </TermTooltip>
          <div
            style={{
              flex: 1,
              height: '9px',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              borderRadius: '5px',
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                width: `${bear}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #f87171 0%, #ef4444 100%)',
                borderRadius: '5px',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: '#f87171',
              width: '36px',
              textAlign: 'right',
            }}
          >
            {bear}%
          </span>
        </div>
      </div>

      {/* 底部多空比與計算附註 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <TermTooltip termId="bullBearRatio" dynamicDiagnosis={diagnoseBullBearEnergy(bull, bear, ratio)}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>多空比：</span>
          </TermTooltip>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
            {ratio} 倍多
          </span>
        </div>
        <div style={{ fontSize: '0.66rem', color: '#64748b', textAlign: 'right' }}>
          {note}
        </div>
      </div>
    </div>
  );
};

export default BullBearEnergyCard;
