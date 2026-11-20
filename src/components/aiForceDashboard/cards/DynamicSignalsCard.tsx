import React from 'react';
import type { DynamicSignalsData } from '../../../types/aiForceDashboard';
import type { ColorThemeMode, MarketType } from '../../../types/stock';
import { OBSIDIAN_CARD_CONTAINER } from '../../../constants/designTokens';
import { TermTooltip } from '../../common/TermTooltip';
import { DynamicSignalsScoreBar } from './dynamicSignals/DynamicSignalsScoreBar';
import { DynamicSignalsRegulatoryLayer } from './dynamicSignals/DynamicSignalsRegulatoryLayer';
import { DynamicSignalsTacticalAdvice } from './dynamicSignals/DynamicSignalsTacticalAdvice';

export interface DynamicSignalsCardProps {
  data?: DynamicSignalsData;
  colorTheme?: ColorThemeMode;
  market?: MarketType;
}

const VERDICT_BADGE_MAP = {
  GREEN: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.4)', glow: '0 0 10px #10b981', text: '綠燈 (偏多 / 安全)' },
  YELLOW: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', glow: '0 0 10px #f59e0b', text: '黃燈 (觀望 / 中性)' },
  RED: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.4)', glow: '0 0 10px #ef4444', text: '紅燈 (偏空 / 高風險)' },
} as const;

/**
 * 依據信號關鍵字映射信號顏色 (優先攔截分歧/中性/震盪為黃色，可控/低風險為綠色)
 */
export function getSignalLightColor(signalText: string): { color: string; bg: string; dot: string } {
  if (/分歧|中性|震盪|觀望/.test(signalText)) {
    return { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', dot: '#f59e0b' };
  }
  if (/強|多|偏強|合買|集中|低風險|可控|安全/.test(signalText)) {
    return { color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', dot: '#10b981' };
  }
  if (/高|空|弱|渙散|破線|破位|超跌|偏高|警戒/.test(signalText)) {
    return { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', dot: '#ef4444' };
  }
  return { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', dot: '#f59e0b' };
}

/**
 * 依據結論燈號取得總評判徽章設定
 */
export function getVerdictBadgeConfig(verdictLight?: 'GREEN' | 'YELLOW' | 'RED') {
  return VERDICT_BADGE_MAP[verdictLight ?? 'RED'] ?? VERDICT_BADGE_MAP.RED;
}

export const DynamicSignalsCard: React.FC<DynamicSignalsCardProps> = ({ data }) => {
  const trendSignal = data?.trendSignal ?? '偏多偏強';
  const chipSignal = data?.chipSignal ?? '籌碼中性';
  const momentumSignal = data?.momentumSignal ?? '動能偏強';
  const riskSignal = data?.riskSignal ?? '波動風險偏高';

  const verdictConfig = getVerdictBadgeConfig(data?.verdictLight ?? 'RED');
  const verdictLabel = data?.verdictLabel || verdictConfig.text;

  const signalItems = [
    { title: '趨勢：', value: trendSignal, color: getSignalLightColor(trendSignal).color, termId: 'decisionTrend' },
    { title: '籌碼：', value: chipSignal, color: getSignalLightColor(chipSignal).color, termId: 'chipStructure' },
    { title: '動能：', value: momentumSignal, color: getSignalLightColor(momentumSignal).color, termId: 'radarMomentum' },
    { title: '風險：', value: riskSignal, color: getSignalLightColor(riskSignal).color, termId: 'volatilityRisk' },
  ];

  const dotStyle: React.CSSProperties = {
    borderRadius: '50%',
    backgroundColor: verdictConfig.color,
    boxShadow: verdictConfig.glow,
    transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
  };

  return (
    <div
      data-testid="dynamic-signals-card"
      style={{
        ...OBSIDIAN_CARD_CONTAINER,
        display: 'flex', flexDirection: 'column', height: '100%', padding: '14px', gap: '8px',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '2px 6px', borderRadius: '5px', background: 'rgba(30, 41, 59, 0.9)', color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 800,
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

        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '999px',
            background: verdictConfig.bg, border: `1px solid ${verdictConfig.border}`, fontSize: '0.75rem', fontWeight: 700, color: verdictConfig.color,
          }}
        >
          <span style={{ ...dotStyle, width: '6px', height: '6px' }} />
          <span>{verdictLabel}</span>
        </div>
      </div>

      {data?.compositeScore !== undefined && (
        <DynamicSignalsScoreBar compositeScore={data.compositeScore} color={verdictConfig.color} glow={verdictConfig.glow} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
        {signalItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px',
              background: 'rgba(15, 23, 42, 0.4)', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.03)',
            }}
          >
            <TermTooltip termId={item.termId}>
              <span style={{ color: '#94a3b8', cursor: 'help' }}>{item.title}</span>
            </TermTooltip>
            <span style={{ color: item.color, fontWeight: 700 }}>{item.value}</span>
          </div>
        ))}
      </div>

      <DynamicSignalsRegulatoryLayer regulatoryBadge={data?.regulatoryBadge} brokerMarginAlert={data?.brokerMarginAlert} />

      <DynamicSignalsTacticalAdvice
        vwapBiasStdText={data?.vwapBiasStdText}
        keySupportPrice={data?.keySupportPrice}
        keyPressurePrice={data?.keyPressurePrice}
        actionableAdvice={data?.actionableAdvice}
        verdictColor={verdictConfig.color}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.75rem', marginTop: 'auto' }}>
        <TermTooltip termId="trafficLight">
          <span style={{ color: '#94a3b8', cursor: 'help' }}>目前燈號：</span>
        </TermTooltip>
        <TermTooltip termId="trafficLight">
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'help' }}>
            <span style={{ ...dotStyle, width: '7px', height: '7px' }} />
            <span style={{ color: verdictConfig.color, fontWeight: 800 }}>{verdictLabel}</span>
          </div>
        </TermTooltip>
      </div>
    </div>
  );
};

export default DynamicSignalsCard;
