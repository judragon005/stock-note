import React from 'react';
import type { BullBearEnergyData, MarketSentimentData } from '../../../types/aiForceDashboard';
import type { MarketType } from '../../../types/stock';
import { Zap, ShieldAlert, Award, Compass, TrendingUp, TrendingDown } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';

export interface EnergySentimentTwinCardProps {
  bullBearData?: BullBearEnergyData;
  sentimentData?: MarketSentimentData;
  market?: MarketType;
}

export type AlphaResonanceType =
  | 'ALPHA_LEADER' // 逆勢抗跌 (Alpha 領頭羊)
  | 'DIVERGENCE_RISK' // 拉指數出個股 (主力背離)
  | 'BULL_RESONANCE' // 順風主升 (共振多頭)
  | 'BEAR_DOWNTREND' // 弱勢沉淪 (泥沙俱下)
  | 'NEUTRAL_BALANCED'; // 震盪平衡 (靜待表態)

export interface AlphaResonanceResult {
  type: AlphaResonanceType;
  label: string;
  color: string;
  bg: string;
  border: string;
}

/**
 * Alpha 共振仲裁演算法：
 * 依據個股多空力道比值 (bullBearRatio) 與大盤情緒指數 (marketScore)，
 * 判定個股相對於市場大環境的共振關係。
 */
export function calculateAlphaResonance(
  bullBearRatio: number,
  marketScore: number
): AlphaResonanceResult {
  const isStockBull = bullBearRatio >= 1.15;
  const isStockBear = bullBearRatio <= 0.88;

  const isMarketFear = marketScore <= 35;
  const isMarketGreed = marketScore >= 65;

  if (isStockBull && isMarketFear) {
    return {
      type: 'ALPHA_LEADER',
      label: '逆勢抗跌 (Alpha 領頭羊)',
      color: '#34d399',
      bg: 'rgba(16, 185, 129, 0.18)',
      border: 'rgba(16, 185, 129, 0.35)',
    };
  }

  if (isStockBear && isMarketGreed) {
    return {
      type: 'DIVERGENCE_RISK',
      label: '拉指數出個股 (主力背離)',
      color: '#fb923c',
      bg: 'rgba(249, 115, 22, 0.18)',
      border: 'rgba(249, 115, 22, 0.35)',
    };
  }

  if (isStockBull && isMarketGreed) {
    return {
      type: 'BULL_RESONANCE',
      label: '順風主升 (共振多頭)',
      color: '#c084fc',
      bg: 'rgba(168, 85, 247, 0.18)',
      border: 'rgba(168, 85, 247, 0.35)',
    };
  }

  if (isStockBear && isMarketFear) {
    return {
      type: 'BEAR_DOWNTREND',
      label: '弱勢沉淪 (泥沙俱下)',
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.18)',
      border: 'rgba(56, 189, 248, 0.35)',
    };
  }

  return {
    type: 'NEUTRAL_BALANCED',
    label: '震盪平衡 (靜待表態)',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.18)',
    border: 'rgba(245, 158, 11, 0.35)',
  };
}

export const EnergySentimentTwinCard: React.FC<EnergySentimentTwinCardProps> = ({
  bullBearData,
  sentimentData,
  market = 'TW',
}) => {
  const isUs = Boolean(market === 'US' || sentimentData?.isUsMarket || sentimentData?.usMacroData);
  const usMacro = sentimentData?.usMacroData;

  const marketScore = isUs
    ? (usMacro?.cnnScore ?? sentimentData?.overallSentimentIndex ?? 50)
    : (sentimentData?.overallSentimentIndex ?? 50);

  const ratio = bullBearData?.bullBearRatio ?? 1.0;
  const resonance = calculateAlphaResonance(ratio, marketScore);

  const bullPercent = bullBearData?.bullEnergyPercent ?? bullBearData?.bullPercent ?? 50;
  const bearPercent = bullBearData?.bearEnergyPercent ?? bullBearData?.bearPercent ?? 50;
  const conclusionText = bullBearData?.bullBearConclusion || bullBearData?.conclusion || '均衡';

  return (
    <div
      data-testid="energy-sentiment-twin-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        padding: '12px 14px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(20, 30, 52, 0.82) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* 頂部標題 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              padding: '2px 5px',
              borderRadius: '4px',
              background: 'rgba(139, 92, 246, 0.25)',
              color: '#a78bfa',
              fontSize: '0.68rem',
              fontWeight: 800,
            }}
          >
            10 · 13
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: '0.84rem',
              fontWeight: 800,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Zap size={14} color="#a78bfa" />
            <TermTooltip termId="energySentimentTwin">AI多空 × 市場情緒</TermTooltip>
          </h3>
        </div>

        {/* 右上角多空結論小徽章 */}
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: ratio >= 1.05 ? '#f87171' : ratio <= 0.95 ? '#34d399' : '#fbbf24',
          }}
        >
          {conclusionText}
        </span>
      </div>

      {/* 上半段：Card 10 AI 多空能量條 (約 72px) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.5)',
          padding: '6px 8px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.68rem',
            marginBottom: '4px',
          }}
        >
          <span style={{ color: '#f87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <TrendingUp size={11} /> 多頭 {bullPercent}%
          </span>
          <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}>
            多空比 {ratio.toFixed(2)}
          </span>
          <span style={{ color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
            空頭 {bearPercent}% <TrendingDown size={11} />
          </span>
        </div>

        {/* 雙色能量條 */}
        <div
          style={{
            display: 'flex',
            height: '7px',
            width: '100%',
            borderRadius: '999px',
            overflow: 'hidden',
            background: 'rgba(30, 41, 59, 0.8)',
          }}
        >
          <div
            style={{
              width: `${bullPercent}%`,
              background: 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
              transition: 'width 0.3s ease',
            }}
          />
          <div
            style={{
              width: `${bearPercent}%`,
              background: 'linear-gradient(90deg, #34d399 0%, #10b981 100%)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* 中段：Alpha 共振仲裁標籤 (約 26px) */}
      <div
        data-testid="alpha-resonance-badge"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          padding: '3px 8px',
          borderRadius: '999px',
          background: resonance.bg,
          border: `1px solid ${resonance.border}`,
          color: resonance.color,
          fontSize: '0.72rem',
          fontWeight: 800,
          boxShadow: `0 0 10px ${resonance.bg}`,
        }}
      >
        {resonance.type === 'ALPHA_LEADER' ? (
          <Award size={13} />
        ) : resonance.type === 'DIVERGENCE_RISK' ? (
          <ShieldAlert size={13} />
        ) : (
          <Compass size={13} />
        )}
        <span>{resonance.label}</span>
      </div>

      {/* 下半段：Card 13 市場情緒概況 (約 72px) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.5)',
          padding: '6px 8px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {isUs ? (
          /* 美股宏觀情緒指標 */
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>美股宏觀情緒</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8' }}>
                CNN {usMacro?.cnnRatingText || 'Neutral'} ({marketScore})
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                VIX: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{usMacro?.vix ?? '--'}</span>
              </div>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                10Y: <span style={{ color: '#34d399', fontWeight: 700 }}>{usMacro?.tenYearTreasury ? `${usMacro.tenYearTreasury}%` : '--'}</span>
              </div>
            </div>
          </div>
        ) : (
          /* 台股市場合情緒指標 */
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>台股市場合情緒</div>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: marketScore >= 60 ? '#ef4444' : marketScore <= 40 ? '#38bdf8' : '#fbbf24',
                }}
              >
                {sentimentData?.sentimentState === 'FEAR'
                  ? '恐慌'
                  : sentimentData?.sentimentState === 'GREED'
                    ? '貪婪'
                    : '中性'}{' '}
                ({marketScore})
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', fontSize: '0.62rem' }}>
              <span style={{ color: '#f59e0b' }}>散 {sentimentData?.retailSentimentPercent ?? 50}%</span>
              <span style={{ color: '#38bdf8' }}>法 {sentimentData?.institutionalSentimentPercent ?? 50}%</span>
              <span style={{ color: '#ec4899' }}>主 {sentimentData?.mainForceSentimentPercent ?? 50}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnergySentimentTwinCard;
