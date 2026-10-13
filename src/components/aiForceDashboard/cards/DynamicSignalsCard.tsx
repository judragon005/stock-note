import React from 'react';
import type { DynamicSignalsData } from '../../../types/aiForceDashboard';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
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
    signalText.includes('合買') ||
    signalText.includes('集中') ||
    signalText.includes('低風險')
  ) {
    return { color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', dot: '#10b981' };
  }
  if (
    signalText.includes('高') ||
    signalText.includes('空') ||
    signalText.includes('弱') ||
    signalText.includes('渙散') ||
    signalText.includes('破線') ||
    signalText.includes('破位') ||
    signalText.includes('超跌') ||
    signalText.includes('偏高')
  ) {
    return { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', dot: '#ef4444' };
  }
  return { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', dot: '#f59e0b' };
}

/**
 * 依據結論燈號取得總評判徽章設定
 */
export function getVerdictBadgeConfig(verdictLight?: 'GREEN' | 'YELLOW' | 'RED') {
  switch (verdictLight) {
    case 'GREEN':
      return {
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.2)',
        border: 'rgba(16, 185, 129, 0.4)',
        glow: '0 0 10px #10b981',
        text: '綠燈 (偏多 / 安全)',
      };
    case 'YELLOW':
      return {
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.2)',
        border: 'rgba(245, 158, 11, 0.4)',
        glow: '0 0 10px #f59e0b',
        text: '黃燈 (觀望 / 中性)',
      };
    case 'RED':
    default:
      return {
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.2)',
        border: 'rgba(239, 68, 68, 0.4)',
        glow: '0 0 10px #ef4444',
        text: '紅燈 (偏空 / 高風險)',
      };
  }
}

export const DynamicSignalsCard: React.FC<DynamicSignalsCardProps> = ({ data }) => {
  const trendSignal = data?.trendSignal ?? '偏多偏強';
  const chipSignal = data?.chipSignal ?? '籌碼中性';
  const momentumSignal = data?.momentumSignal ?? '動能偏強';
  const riskSignal = data?.riskSignal ?? '波動風險偏高';

  const verdictLight = data?.verdictLight ?? 'RED';
  const verdictConfig = getVerdictBadgeConfig(verdictLight);
  const verdictLabel = data?.verdictLabel || verdictConfig.text;
  const compositeScore = data?.compositeScore;

  const signalItems = [
    { title: '趨勢：', value: trendSignal, color: getSignalLightColor(trendSignal).color, termId: 'decisionTrend' },
    { title: '籌碼：', value: chipSignal, color: getSignalLightColor(chipSignal).color, termId: 'chipStructure' },
    { title: '動能：', value: momentumSignal, color: getSignalLightColor(momentumSignal).color, termId: 'radarMomentum' },
    { title: '風險：', value: riskSignal, color: getSignalLightColor(riskSignal).color, termId: 'volatilityRisk' },
  ];

  return (
    <div
      data-testid="dynamic-signals-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '14px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(20, 30, 52, 0.82) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
        gap: '8px',
      }}
    >
      {/* 頂部標題與選單 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
            CARD 12
          </span>
          <TermTooltip termId="trafficLight">
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', cursor: 'help' }}>
              AI 主力動態信號判斷
            </span>
          </TermTooltip>
        </div>

        {/* 頂部綜合結論徽章 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            borderRadius: '999px',
            background: verdictConfig.bg,
            border: `1px solid ${verdictConfig.border}`,
            fontSize: '0.72rem',
            fontWeight: 700,
            color: verdictConfig.color,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: verdictConfig.color,
              boxShadow: verdictConfig.glow,
              transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
            }}
          />
          <span>{verdictLabel}</span>
        </div>
      </div>

      {/* 綜合量化進度條 (0~100 分) */}
      {compositeScore !== undefined && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '6px 8px',
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.7rem',
              color: '#94a3b8',
            }}
          >
            <span>多因子綜合量化分</span>
            <span style={{ color: verdictConfig.color, fontWeight: 800 }}>{compositeScore} 分</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '5px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, compositeScore))}%`,
                height: '100%',
                backgroundColor: verdictConfig.color,
                boxShadow: verdictConfig.glow,
                borderRadius: '3px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* 中部四維核心條目 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '6px',
        }}
      >
        {signalItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 8px',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '6px',
              fontSize: '0.72rem',
              border: '1px solid rgba(255, 255, 255, 0.03)',
            }}
          >
            <TermTooltip termId={item.termId}>
              <span style={{ color: '#94a3b8', cursor: 'help' }}>{item.title}</span>
            </TermTooltip>
            <span style={{ color: item.color, fontWeight: 700 }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* 專業層：交易所監理標籤 & 券商融資警戒 */}
      {(data?.regulatoryBadge || data?.brokerMarginAlert) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          {data?.regulatoryBadge && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                fontSize: '0.68rem',
                fontWeight: 700,
              }}
            >
              <AlertTriangle size={11} />
              <span>{data.regulatoryBadge}</span>
            </div>
          )}
          {data?.brokerMarginAlert && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.68rem',
                fontWeight: 700,
              }}
            >
              <ShieldAlert size={11} />
              <span>{data.brokerMarginAlert}</span>
            </div>
          )}
        </div>
      )}

      {/* 決策層：法人 VWAP 偏離 & 關鍵價位 */}
      {(data?.vwapBiasStdText || data?.keySupportPrice || data?.keyPressurePrice) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '5px 8px',
            background: 'rgba(30, 41, 59, 0.45)',
            borderRadius: '6px',
            fontSize: '0.69rem',
            color: '#cbd5e1',
          }}
        >
          {data?.vwapBiasStdText && (
            <div>
              <span style={{ color: '#94a3b8' }}>VWAP: </span>
              <span style={{ fontWeight: 700, color: '#38bdf8' }}>{data.vwapBiasStdText}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            {data?.keySupportPrice !== undefined && (
              <div>
                <span style={{ color: '#94a3b8' }}>防守: </span>
                <span style={{ fontWeight: 700, color: '#34d399' }}>{data.keySupportPrice}</span>
              </div>
            )}
            {data?.keyPressurePrice !== undefined && (
              <div>
                <span style={{ color: '#94a3b8' }}>壓力: </span>
                <span style={{ fontWeight: 700, color: '#f87171' }}>{data.keyPressurePrice}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 白話指引情境解析 (Actionable Advice) */}
      {data?.actionableAdvice && (
        <div
          style={{
            padding: '6px 8px',
            borderRadius: '6px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderLeft: `3px solid ${verdictConfig.color}`,
            fontSize: '0.7rem',
            lineHeight: 1.45,
            color: '#e2e8f0',
          }}
        >
          <div style={{ color: verdictConfig.color, fontWeight: 800, marginBottom: '2px', fontSize: '0.68rem' }}>
            【AI 決策情境解析】
          </div>
          <div>{data.actionableAdvice}</div>
        </div>
      )}

      {/* 底部目前燈號 (完全動態化，廢除硬編碼純紅燈) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.72rem',
          marginTop: 'auto',
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
                backgroundColor: verdictConfig.color,
                boxShadow: verdictConfig.glow,
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
              }}
            />
            <span style={{ color: verdictConfig.color, fontWeight: 800 }}>{verdictLabel}</span>
          </div>
        </TermTooltip>
      </div>
    </div>
  );
};

export default DynamicSignalsCard;
