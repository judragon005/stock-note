import React, { useMemo } from 'react';
import { DayTradeRiskData } from '../../../types/aiForceDashboard';
import { ColorThemeMode, MarketType } from '../../../types/stock';
import { AlertOctagon, RefreshCw, Zap, TrendingDown, Activity } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';
import { diagnoseDayTradeRisk } from '../../../constants/aiForceGlossary';

export interface ProgressBarStyle {
  color: string;
  bgGrad: string;
  width: string;
}

/**
 * 依據風險百分比回傳進度條色彩與寬度
 */
export function getProgressBarStyle(percentage: number): ProgressBarStyle {
  const clamped = Math.max(0, Math.min(100, percentage));
  let color = '#10b981';
  let bgGrad = 'linear-gradient(90deg, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.9) 100%)';

  if (clamped >= 60) {
    color = '#ef4444';
    bgGrad = 'linear-gradient(90deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.9) 100%)';
  } else if (clamped >= 40) {
    color = '#f59e0b';
    bgGrad = 'linear-gradient(90deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.9) 100%)';
  }

  return {
    color,
    bgGrad,
    width: `${clamped}%`,
  };
}

export interface DayTradeRiskBadgeStyle {
  label: string;
  color: string;
  bg: string;
  border: string;
}

/**
 * 依據風險等級回傳徽章樣式
 */
export function getDayTradeRiskBadge(level: DayTradeRiskData['riskLevel']): DayTradeRiskBadgeStyle {
  switch (level) {
    case 'HIGH':
      return {
        label: '高',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.2)',
        border: 'rgba(239, 68, 68, 0.5)',
      };
    case 'MEDIUM':
      return {
        label: '中',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.2)',
        border: 'rgba(245, 158, 11, 0.5)',
      };
    case 'LOW':
    default:
      return {
        label: '低',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.2)',
        border: 'rgba(16, 185, 129, 0.5)',
      };
  }
}



export interface DayTradeRiskCardProps {
  data: DayTradeRiskData;
  colorTheme?: ColorThemeMode;
  market?: MarketType;
}

export interface DayTradeRiskMetricItem {
  label: string;
  value: number;
  icon: string;
  termId?: string;
}

export function getDayTradeRiskItems(
  data?: Partial<DayTradeRiskData> | null,
  isUs: boolean = false
): DayTradeRiskMetricItem[] {
  if (isUs) {
    return [
      { label: '大單賣壓異常', value: data?.abnormalSelling ?? 49, icon: 'alert', termId: 'radarVolatility' },
      { label: '日內換手活躍度', value: data?.turnoverRate ?? 57, icon: 'refresh', termId: 'turnoverRate' },
      { label: 'RVOL 量能放大度', value: data?.dayTradeRatio ?? 53, icon: 'zap', termId: 'rvol' },
      { label: '次日回檔風險', value: data?.pullbackRisk ?? 45, icon: 'trending-down', termId: 'pullbackRisk' },
      { label: 'ATR 日內波動度', value: data?.intradayVolatility ?? 62, icon: 'activity', termId: 'intradayVolatility' },
    ];
  }
  return [
    { label: '主力賣出異常', value: data?.abnormalSelling ?? 49, icon: 'alert', termId: 'radarVolatility' },
    { label: '籌碼換手率', value: data?.turnoverRate ?? 57, icon: 'refresh', termId: 'turnoverRate' },
    { label: '沖銷比例', value: data?.dayTradeRatio ?? 53, icon: 'zap', termId: 'dayTradeRatio' },
    { label: '隔日回檔風險', value: data?.pullbackRisk ?? 45, icon: 'trending-down', termId: 'pullbackRisk' },
    { label: '日內波動率', value: data?.intradayVolatility ?? 62, icon: 'activity', termId: 'intradayVolatility' },
  ];
}

export interface DayTradeExtraMetrics {
  sblText: string | null;
  marginChangeText: string | null;
}

/**
 * 格式化借券賣出餘額與融資餘額增減顯示文案
 */
export function formatDayTradeExtraMetrics(data?: Partial<DayTradeRiskData> | null): DayTradeExtraMetrics {
  const sblText = data?.sblBalance != null ? `${data.sblBalance.toLocaleString()} 張` : null;
  const marginChangeText =
    data?.marginBalanceChange != null
      ? `${data.marginBalanceChange > 0 ? '+' : ''}${data.marginBalanceChange.toLocaleString()} 張`
      : null;
  return { sblText, marginChangeText };
}

function renderDayTradeIcon(iconKey: string): React.ReactNode {
  switch (iconKey) {
    case 'alert':
      return <AlertOctagon size={13} strokeWidth={1.5} color="#94a3b8" />;
    case 'refresh':
      return <RefreshCw size={13} strokeWidth={1.5} color="#94a3b8" />;
    case 'zap':
      return <Zap size={13} strokeWidth={1.5} color="#94a3b8" />;
    case 'trending-down':
      return <TrendingDown size={13} strokeWidth={1.5} color="#94a3b8" />;
    case 'activity':
    default:
      return <Activity size={13} strokeWidth={1.5} color="#94a3b8" />;
  }
}

export const DayTradeRiskCard: React.FC<DayTradeRiskCardProps> = ({ data, market }) => {
  const isUs = Boolean(market === 'US' || data?.isUsMarket);
  const items = useMemo(() => getDayTradeRiskItems(data, isUs), [data, isUs]);

  const riskBadge = useMemo(() => getDayTradeRiskBadge(data.riskLevel || 'MEDIUM'), [data.riskLevel]);

  const avgIndex = useMemo(() => {
    const sum = items.reduce((acc, cur) => acc + cur.value, 0);
    return Math.round(sum / items.length);
  }, [items]);

  const displayRiskIndex = Number.isFinite(data.riskIndex) ? (data.riskIndex as number) : avgIndex;

  const extraMetrics = useMemo(() => (isUs ? { sblText: null, marginChangeText: null } : formatDayTradeExtraMetrics(data)), [data, isUs]);
  const marginChangeVal = data.marginBalanceChange ?? 0;
  const marginChangeColor =
    marginChangeVal > 0 ? '#ef4444' : marginChangeVal < 0 ? '#10b981' : '#94a3b8';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '14px',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 15, 28, 0.92) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* 標題列 */}
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
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 800,
            }}
          >
            09
          </span>
          <TermTooltip
            termId="dayTradeRisk"
            dynamicDiagnosis={diagnoseDayTradeRisk(displayRiskIndex, data.dayTradeRatio)}
            showIcon={true}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
              {isUs ? '美股日內波動與換手風險' : '隔日沖風險分析'}
            </span>
          </TermTooltip>
        </div>
      </div>

      {/* 5 條水平彩色進度條 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '11px',
          flex: 1,
          justifyContent: 'space-around',
        }}
      >
        {items.map((item, idx) => {
          const style = getProgressBarStyle(item.value);

          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>{renderDayTradeIcon(item.icon)}</span>
                  <TermTooltip termId={item.termId}>
                    <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{item.label}</span>
                  </TermTooltip>
                </div>
                <span
                  style={{
                    color: style.color,
                    fontWeight: 800,
                    fontFamily: 'monospace',
                  }}
                >
                  {item.value}%
                </span>
              </div>

              {/* 進度條背景槽與進度 */}
              <div
                style={{
                  width: '100%',
                  height: '7px',
                  borderRadius: '4px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <div
                  style={{
                    width: style.width,
                    height: '100%',
                    borderRadius: '4px',
                    background: style.bgGrad,
                    boxShadow: item.value >= 60 ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部風險等級與指數徽章列 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          padding: '6px 10px',
          borderRadius: '8px',
          background: 'rgba(30, 41, 59, 0.55)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TermTooltip
            termId="dayTradeRisk"
            dynamicDiagnosis={diagnoseDayTradeRisk(displayRiskIndex, data.dayTradeRatio)}
          >
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {isUs ? '日內波動風險等級：' : '隔日沖風險等級：'}
            </span>
          </TermTooltip>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '5px',
              background: riskBadge.bg,
              color: riskBadge.color,
              border: `1px solid ${riskBadge.border}`,
              fontSize: '0.75rem',
              fontWeight: 800,
            }}
          >
            {riskBadge.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <TermTooltip
            termId="dayTradeRisk"
            dynamicDiagnosis={diagnoseDayTradeRisk(displayRiskIndex, data.dayTradeRatio)}
          >
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>風險指數：</span>
          </TermTooltip>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: riskBadge.color,
            }}
          >
            {displayRiskIndex}%
          </span>
        </div>

        {!isUs && data.shortMarginRatio != null && Number.isFinite(data.shortMarginRatio) && (
          <div
            data-testid="margin-ratio-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              paddingLeft: '8px',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>券資比：</span>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                fontFamily: 'monospace',
                color: data.shortMarginRatio >= 30 ? '#f59e0b' : '#38bdf8',
              }}
            >
              {data.shortMarginRatio}%
            </span>
          </div>
        )}
      </div>

      {/* 美股專屬微觀波動列 (ATR% / RVOL / Short Float %) */}
      {isUs &&
        (data.atrPercent != null || data.rvol != null || data.shortFloatRatio != null) && (
          <div
            data-testid="us-daytrade-extra-metrics"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '6px',
              padding: '5px 10px',
              borderRadius: '6px',
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.75rem',
              gap: '8px',
            }}
          >
            {data.atrPercent != null && (
              <span>
                ATR%:{' '}
                <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>
                  {data.atrPercent.toFixed(2)}%
                </strong>
              </span>
            )}
            {data.rvol != null && (
              <span>
                RVOL:{' '}
                <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                  {data.rvol.toFixed(2)}x
                </strong>
              </span>
            )}
            {data.shortFloatRatio != null && (
              <span>
                Short Float:{' '}
                <strong style={{ color: data.shortFloatRatio > 10 ? '#f87171' : '#f8fafc', fontFamily: 'monospace' }}>
                  {data.shortFloatRatio}%
                </strong>
              </span>
            )}
          </div>
        )}

      {/* 台股借券賣出餘額與融資增減 (Real Data) */}
      {!isUs && (extraMetrics.sblText !== null || extraMetrics.marginChangeText !== null) && (
        <div
          data-testid="daytrade-extra-metrics"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '6px',
            padding: '5px 10px',
            borderRadius: '6px',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '0.75rem',
            gap: '8px',
          }}
        >
          {extraMetrics.sblText !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#94a3b8' }}>借券賣出餘額：</span>
              <span style={{ color: '#f8fafc', fontWeight: 700, fontFamily: 'monospace' }}>
                {extraMetrics.sblText}
              </span>
            </div>
          )}
          {extraMetrics.marginChangeText !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#94a3b8' }}>融資增減：</span>
              <span
                style={{
                  color: marginChangeColor,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
              >
                {extraMetrics.marginChangeText}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
