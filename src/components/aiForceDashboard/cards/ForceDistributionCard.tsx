import React from 'react';
import { resolveDirectionalPalette } from '../../../constants/designTokens';
import type { ForceDistributionData } from '../../../types/aiForceDashboard';
import type { ColorThemeMode, MarketType } from '../../../types/stock';
import { TermTooltip } from '../../common/TermTooltip';

export interface ForceDistributionCardProps {
  data?: ForceDistributionData;
  colorTheme?: ColorThemeMode;
  market?: MarketType;
}

/**
 * 計算甜甜圈圓環的圓周與 strokeDasharray (防禦 NaN / Infinity)
 */
export function calculateDonutSegments(
  largePercent: number,
  retailPercent: number,
  radius = 32
) {
  const safeLarge = Number.isFinite(largePercent) ? largePercent : 0;
  const safeRetail = Number.isFinite(retailPercent) ? retailPercent : 0;
  const circumference = 2 * Math.PI * radius;
  const largeClamped = Math.max(0, Math.min(100, safeLarge));
  const largeDash = (largeClamped / 100) * circumference;
  const retailClamped = Math.max(0, Math.min(100, safeRetail));
  const retailDash = (retailClamped / 100) * circumference;

  return {
    circumference: Math.round(circumference * 100) / 100,
    largeStrokeDasharray: `${Math.round(largeDash * 100) / 100} ${Math.round(circumference * 100) / 100}`,
    retailStrokeDasharray: `${Math.round(retailDash * 100) / 100} ${Math.round(circumference * 100) / 100}`,
  };
}

export const FORCE_DISTRIBUTION_RING_CONFIG = {
  size: 68,
  radius: 26,
  fontSize: 14,
};

interface SingleRingProps {
  label: string;
  percent: number;
  color: string;
  termId?: string;
}

const SingleRing: React.FC<SingleRingProps> = ({ label, percent, color, termId }) => {
  const { size, radius, fontSize } = FORCE_DISTRIBUTION_RING_CONFIG;
  const half = size / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Number.isFinite(percent) ? percent : 0;
  const clamped = Math.max(0, Math.min(100, safePct));
  const strokeDashoffset = circumference * (1 - clamped / 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: '1 1 68px', minWidth: '64px' }}>
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={half}
            cy={half}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="5"
          />
          <circle
            cx={half}
            cy={half}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${half} ${half})`}
            style={{
              transition: 'stroke-dashoffset 0.6s ease',
              filter: `drop-shadow(0 0 6px ${color}66)`,
            }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${fontSize}px`,
            fontWeight: 800,
            fontFamily: 'monospace',
            color: '#f8fafc',
          }}
        >
          {clamped}%
        </div>
      </div>
      <TermTooltip termId={termId}>
        <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#cbd5e1', cursor: 'help', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </TermTooltip>
    </div>
  );
};

export const ForceDistributionCard: React.FC<ForceDistributionCardProps> = ({
  data,
  colorTheme,
  market,
}) => {
  const isUs = Boolean(market === 'US' || data?.isUsMarket);
  const effectiveTheme: ColorThemeMode = colorTheme ?? (isUs ? 'international' : 'taiwan');
  const isTaiwan = effectiveTheme === 'taiwan';
  const buyColor = isTaiwan ? '#f97316' : '#10b981';
  const { downColor: sellColor } = resolveDirectionalPalette(effectiveTheme);

  const isEmpty =
    !data ||
    (data.largePlayerBuyPercent === undefined &&
      data.retailBuyPercent === undefined &&
      data.retailSellPressurePercent === undefined);

  const large = data?.largePlayerBuyPercent ?? 0;
  const retailBuy = data?.retailBuyPercent ?? 0;
  const retailSell = data?.retailSellPressurePercent ?? 0;
  const asOf = data?.asOfDateText ?? '暫無買賣力分布資料';

  return (
    <div
      data-testid="force-distribution-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '10px 12px',
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
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '5px',
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 800,
            }}
          >
            16
          </span>
          <TermTooltip termId="bigBuyerFlow">
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', cursor: 'help' }}>
              買賣力分布圖
            </span>
          </TermTooltip>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            | {isUs ? '美股機構動能 vs 散戶追價' : '法人 vs 散戶'}
          </span>
        </div>
      </div>

      {/* 主體：空狀態或 3 個並排獨立環形圓環 */}
      {isEmpty ? (
        <div
          data-testid="force-distribution-empty-state"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            color: '#94a3b8',
            fontSize: '0.78rem',
            textAlign: 'center',
          }}
        >
          暫無買賣力分布樣本，待成交量價回補後自動計算
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: '6px',
            flex: 1,
            padding: '12px 0',
          }}
        >
          <SingleRing label={isUs ? '機構買盤' : '大戶買盤'} percent={large} color={buyColor} termId="bigBuyerFlow" />
          <SingleRing label="散戶買盤" percent={retailBuy} color="#fbbf24" termId="retailBuyerFlow" />
          <SingleRing label="散戶賣盤" percent={retailSell} color={sellColor} termId="retailSellerFlow" />
        </div>
      )}

      {/* 底部時間與資料說明 */}
      <div
        style={{
          fontSize: '0.75rem',
          color: '#94a3b8',
          textAlign: 'center',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {asOf.startsWith('資料時間') || asOf.startsWith('暫無') ? asOf : `資料時間：${asOf}`}
      </div>
    </div>
  );
};

export default ForceDistributionCard;
