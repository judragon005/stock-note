import React from 'react';
import type { BullBearEnergyData, MarketSentimentData } from '../../../types/aiForceDashboard';
import type { ColorThemeMode, MarketType } from '../../../types/stock';
import { Zap, ShieldAlert, Award, Compass, TrendingUp, TrendingDown } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';
import { resolveDirectionalPalette } from '../../../constants/designTokens';

export interface EnergySentimentTwinCardProps {
  bullBearData?: BullBearEnergyData;
  sentimentData?: MarketSentimentData;
  market?: MarketType;
  colorTheme?: ColorThemeMode;
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
  market,
  colorTheme,
}) => {
  const isUs = market
    ? market === 'US'
    : Boolean(
        sentimentData?.isUsMarket ||
          (sentimentData?.usMacroData && !sentimentData?.twMacroData)
      );
  const palette = resolveDirectionalPalette(colorTheme, isUs ? 'US' : 'TW');
  const bullText = palette.upLightColor;
  const bearText = palette.downLightColor;
  const bullGrad = palette.upGradient;
  const bearGrad = palette.downGradient;

  const usMacro = sentimentData?.usMacroData;

  const rawMarketScore = isUs
    ? (usMacro?.cnnScore ?? sentimentData?.overallSentimentIndex ?? 50)
    : (sentimentData?.overallSentimentIndex ?? 50);
  const marketScore = Number.isFinite(rawMarketScore) ? rawMarketScore : 50;

  const rawRatio = bullBearData?.bullBearRatio;
  const ratio = Number.isFinite(rawRatio) ? (rawRatio as number) : 1.0;
  const resonance = calculateAlphaResonance(ratio, marketScore);

  const rawBull = bullBearData?.bullEnergyPercent ?? bullBearData?.bullPercent;
  const rawBear = bullBearData?.bearEnergyPercent ?? bullBearData?.bearPercent;
  const safeBull = Number.isFinite(rawBull) ? Math.max(0, rawBull as number) : 50;
  const safeBear = Number.isFinite(rawBear) ? Math.max(0, rawBear as number) : 50;
  const totalPct = safeBull + safeBear;
  const bullPercent = totalPct > 0 ? Math.round((safeBull / totalPct) * 100) : 50;
  const bearPercent = 100 - bullPercent;

  const conclusionText = bullBearData?.bullBearConclusion || bullBearData?.conclusion || '均衡';

  const cnnLabel = usMacro?.cnnRatingText || usMacro?.cnnStateText || 'Neutral';
  const cnnColor = marketScore <= 35 ? '#f87171' : marketScore >= 65 ? '#34d399' : '#38bdf8';
  const vixVal = usMacro?.vix ?? usMacro?.vixValue;
  const vixText = vixVal !== undefined && Number.isFinite(vixVal) ? vixVal.toFixed(1) : '--';
  const yieldVal = usMacro?.tenYearTreasury ?? usMacro?.us10yYield;
  const yieldText = yieldVal !== undefined && Number.isFinite(yieldVal) ? `${yieldVal.toFixed(2)}%` : '--';

  return (
    <div
      data-testid="energy-sentiment-twin-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        boxSizing: 'border-box',
        padding: '12px 14px',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 15, 28, 0.92) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* 頂部標題 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              padding: '2px 5px',
              borderRadius: '4px',
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
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
            fontSize: '0.75rem',
            fontWeight: 700,
            color: ratio >= 1.05 ? bullText : ratio <= 0.95 ? bearText : '#fbbf24',
          }}
        >
          {conclusionText}
        </span>
      </div>

      {/* 上半段：Card 10 AI 多空能量條 */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.5)',
          padding: '8px 10px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            marginBottom: '6px',
          }}
        >
          <span style={{ color: bullText, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <TrendingUp size={11} /> 多頭 {bullPercent}%
          </span>
          <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}>
            多空比 {ratio.toFixed(2)}
          </span>
          <span style={{ color: bearText, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
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
              background: bullGrad,
              transition: 'width 0.3s ease',
            }}
          />
          <div
            style={{
              width: `${bearPercent}%`,
              background: bearGrad,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* 中段：Alpha 共振仲裁標籤 */}
      <div
        data-testid="alpha-resonance-badge"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          padding: '6px 10px',
          borderRadius: '999px',
          background: resonance.bg,
          border: `1px solid ${resonance.border}`,
          color: resonance.color,
          fontSize: '0.75rem',
          fontWeight: 800,
          boxShadow: `0 0 10px ${resonance.bg}`,
          marginBottom: '8px',
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

      {/* 下半段：Card 13 市場情緒概況 */}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>美股宏觀情緒</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: cnnColor }}>
                  CNN {cnnLabel} ({marketScore})
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  VIX: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{vixText}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  10Y: <span style={{ color: '#34d399', fontWeight: 700 }}>{yieldText}</span>
                </div>
              </div>
            </div>
            {usMacro?.asOfDateText && (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
                基準日: {usMacro.asOfDateText}
              </div>
            )}
          </div>
        ) : (
          /* 台股市場情緒指標 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>台股市場情緒</div>
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
              <div style={{ display: 'flex', gap: '6px', fontSize: '0.75rem' }}>
                <span style={{ color: '#f59e0b' }}>散 {sentimentData?.retailSentimentPercent ?? 50}%</span>
                <span style={{ color: '#38bdf8' }}>法 {sentimentData?.institutionalSentimentPercent ?? 50}%</span>
                <span style={{ color: '#ec4899' }}>主 {sentimentData?.mainForceSentimentPercent ?? 50}%</span>
              </div>
            </div>
            {(sentimentData?.twMacroData?.putCallRatio != null ||
              sentimentData?.twMacroData?.foreignFuturesOi != null ||
              sentimentData?.twMacroData?.trustFuturesOi != null) && (
              <div
                data-testid="tw-macro-derivatives"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingTop: '3px',
                }}
              >
                {sentimentData?.twMacroData?.putCallRatio != null && (
                  <span>
                    P/C 比:{' '}
                    <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>
                      {sentimentData.twMacroData.putCallRatio.toFixed(1)}%
                    </strong>
                  </span>
                )}
                {sentimentData?.twMacroData?.foreignFuturesOi != null && (
                  <span>
                    外資期貨未平倉:{' '}
                    <strong
                      style={{
                        color: sentimentData.twMacroData.foreignFuturesOi >= 0 ? bullText : bearText,
                        fontFamily: 'monospace',
                      }}
                    >
                      {sentimentData.twMacroData.foreignFuturesOi > 0 ? '+' : ''}
                      {sentimentData.twMacroData.foreignFuturesOi.toLocaleString()} 口
                    </strong>
                  </span>
                )}
                {sentimentData?.twMacroData?.trustFuturesOi != null && (
                  <span>
                    投信期貨未平倉:{' '}
                    <strong
                      style={{
                        color: sentimentData.twMacroData.trustFuturesOi >= 0 ? bullText : bearText,
                        fontFamily: 'monospace',
                      }}
                    >
                      {sentimentData.twMacroData.trustFuturesOi > 0 ? '+' : ''}
                      {sentimentData.twMacroData.trustFuturesOi.toLocaleString()} 口
                    </strong>
                  </span>
                )}
                {sentimentData?.twMacroData?.asOfDateText && (
                  <span style={{ marginLeft: 'auto' }}>
                    {sentimentData.twMacroData.asOfDateText}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnergySentimentTwinCard;
