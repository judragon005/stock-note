import React, { useId } from 'react';
import type { MarketSentimentData } from '../../../types/aiForceDashboard';
import type { ColorThemeMode, MarketType } from '../../../types/stock';
import { calculateGaugeNeedleAngle } from '../../../engine/marketSentimentEngine';
import { TermTooltip } from '../../common/TermTooltip';

export interface MarketSentimentCardProps {
  data?: MarketSentimentData;
  colorTheme?: ColorThemeMode;
  market?: MarketType;
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

export const MarketSentimentCard: React.FC<MarketSentimentCardProps> = ({
  data,
  market,
  colorTheme = 'taiwan',
}) => {
  const uid = useId().replace(/:/g, '');
  const gaugeGradId = `gaugeGrad-${uid}`;
  const isUs = market
    ? market === 'US'
    : Boolean(data?.isUsMarket || (data?.usMacroData && !data?.twMacroData));
  const usMacro = data?.usMacroData;

  const isTaiwan = colorTheme === 'taiwan';
  const bullText = isTaiwan ? '#ef4444' : '#10b981';
  const bearText = isTaiwan ? '#10b981' : '#ef4444';

  const rawIndex = isUs
    ? (usMacro?.cnnScore ?? data?.overallSentimentIndex ?? 50)
    : (data?.overallSentimentIndex ?? 50);
  const index = Number.isFinite(rawIndex) ? rawIndex : 50;

  const clampPct = (v?: number, fallback: number = 50) =>
    Math.max(0, Math.min(100, Number.isFinite(v) ? (v as number) : fallback));

  const retail = clampPct(data?.retailSentimentPercent, 50);
  const institutional = clampPct(data?.institutionalSentimentPercent, 50);
  const mainForce = clampPct(data?.mainForceSentimentPercent, 50);

  const needleAngle = calculateGaugeNeedleAngle(index);
  const badgeMeta = getSentimentBadgeMeta(data?.sentimentState || 'NEUTRAL', index);

  const participantBars = [
    { label: '散戶情緒', percent: retail, color: '#f59e0b', termId: 'retailSentiment' },
    { label: '法人情緒', percent: institutional, color: '#38bdf8', termId: 'instSentiment' },
    { label: '主力情緒', percent: mainForce, color: '#ec4899', termId: 'mainSentiment' },
  ];

  const cnnLabel = usMacro?.cnnStateText || usMacro?.cnnRatingText;
  const vixVal = usMacro?.vixValue ?? usMacro?.vix;
  const yieldVal = usMacro?.us10yYield ?? usMacro?.tenYearTreasury;

  const usMacroRows = usMacro
    ? [
        { label: 'CNN 恐懼貪婪', value: `${usMacro.cnnScore ?? 50} 分`, color: badgeMeta.color },
        {
          label: 'VIX 恐慌指數',
          value: vixVal !== undefined && Number.isFinite(vixVal) ? vixVal.toFixed(1) : '--',
          color: (vixVal ?? 0) > 20 ? '#ef4444' : '#38bdf8',
        },
        {
          label: '10Y 美債殖利率',
          value: yieldVal !== undefined && Number.isFinite(yieldVal) ? `${yieldVal.toFixed(2)}%` : '--',
          color: '#f59e0b',
        },
      ]
    : [];

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
              fontSize: '0.75rem',
              fontWeight: 800,
            }}
          >
            13
          </span>
          <TermTooltip termId="marketSentiment">
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', cursor: 'help' }}>
              {isUs ? '美股宏觀情緒 (CNN Fear & Greed / VIX)' : '台股市場情緒儀表板'}
            </span>
          </TermTooltip>
        </div>
      </div>

      {/* 主體：左側半圓彩虹儀表 + 右側參與者情緒水平條或美股宏觀數據 */}
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
                <linearGradient id={gaugeGradId} x1="0%" y1="0%" x2="100%" y2="0%">
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
                stroke={`url(#${gaugeGradId})`}
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
          <TermTooltip termId="marketSentiment">
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px', fontWeight: 600, cursor: 'help' }}>
              市場情緒：<span style={{ color: badgeMeta.color, fontWeight: 800 }}>{isUs && cnnLabel ? cnnLabel : badgeMeta.label}</span>
            </span>
          </TermTooltip>
        </div>

        {/* 右側：美股宏觀數據行 或 台股 3 條水平情緒條 */}
        {isUs ? (
          usMacro ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {usMacroRows.map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(15, 23, 42, 0.55)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <span style={{ color: '#94a3b8' }}>{row.label}</span>
                  <span style={{ color: row.color, fontWeight: 800, fontFamily: 'monospace' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              data-testid="us-macro-empty-state"
              style={{
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px dashed rgba(148, 163, 184, 0.25)',
                fontSize: '0.75rem',
                color: '#94a3b8',
                textAlign: 'center',
              }}
            >
              美股宏觀情緒指標 (CNN / VIX / 10Y) 同步中
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {participantBars.map((bar) => (
              <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <TermTooltip termId={bar.termId}>
                    <span style={{ color: '#94a3b8', cursor: 'help' }}>{bar.label}：</span>
                  </TermTooltip>
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
        )}
      </div>

      {/* 台股期權衍生品指標列 */}
      {!isUs &&
        (data?.twMacroData?.putCallRatio != null ||
          data?.twMacroData?.foreignFuturesOi != null ||
          data?.twMacroData?.trustFuturesOi != null) && (
          <div
            data-testid="tw-macro-derivatives"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: '0.75rem',
              color: '#94a3b8',
            }}
          >
            {data?.twMacroData?.putCallRatio != null && (
              <span>
                P/C 比:{' '}
                <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>
                  {data.twMacroData.putCallRatio.toFixed(1)}%
                </strong>
              </span>
            )}
            {data?.twMacroData?.foreignFuturesOi != null && (
              <span>
                外資期貨未平倉:{' '}
                <strong
                  style={{
                    color: data.twMacroData.foreignFuturesOi >= 0 ? bullText : bearText,
                    fontFamily: 'monospace',
                  }}
                >
                  {data.twMacroData.foreignFuturesOi > 0 ? '+' : ''}
                  {data.twMacroData.foreignFuturesOi.toLocaleString()} 口
                </strong>
              </span>
            )}
            {data?.twMacroData?.trustFuturesOi != null && (
              <span>
                投信期貨未平倉:{' '}
                <strong
                  style={{
                    color: data.twMacroData.trustFuturesOi >= 0 ? bullText : bearText,
                    fontFamily: 'monospace',
                  }}
                >
                  {data.twMacroData.trustFuturesOi > 0 ? '+' : ''}
                  {data.twMacroData.trustFuturesOi.toLocaleString()} 口
                </strong>
              </span>
            )}
            {data?.twMacroData?.asOfDateText && (
              <span>{data.twMacroData.asOfDateText}</span>
            )}
          </div>
        )}
    </div>
  );
};

export default MarketSentimentCard;
