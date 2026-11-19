import React, { useMemo } from 'react';
import { MonthlyRevenueData } from '../../../types/aiForceDashboard';
import { ColorThemeMode, MarketType } from '../../../types/stock';
import { BarChart3, TrendingUp, Sparkles, Coins, Award } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';

/**
 * 計算長條圖高度 (等比縮放，至少 2px 留底防隱形)
 */
export function calculateRevenueBarHeight(
  revenue: number,
  maxRevenue: number,
  maxHeight: number = 100
): number {
  if (!revenue || revenue <= 0 || !maxRevenue || maxRevenue <= 0) return 2;
  const ratio = Math.min(1, Math.max(0, revenue / maxRevenue));
  return Number(Math.max(2, ratio * maxHeight).toFixed(1));
}

/**
 * 自適應營收 Tooltip 數值格式化（支援美股 $B/$M 與台股小型股萬元/億元）
 */
export function formatRevenueTooltipValue(
  revenue: number,
  opts?: { isQuarterly?: boolean; currency?: 'TWD' | 'USD' }
): string {
  if (!Number.isFinite(revenue) || revenue <= 0) return '--';
  if (opts?.currency === 'USD' || opts?.isQuarterly) {
    if (revenue >= 1_000_000_000) return `$${(revenue / 1_000_000_000).toFixed(2)}B`;
    if (revenue >= 1_000_000) return `$${(revenue / 1_000_000).toFixed(1)}M`;
    return `$${revenue.toLocaleString()}`;
  }
  const yi = revenue / 100_000;
  if (yi >= 0.1) {
    return `${yi.toFixed(1)} 億元`;
  }
  const wan = Math.round(revenue / 10);
  return `${wan.toLocaleString()} 萬元`;
}

export interface FormattedEtfMetrics {
  aumText: string;
  yieldText: string;
  beneficiariesText: string;
}

/**
 * 格式化 ETF 資產規模、殖利率與受益人數，支援美股 USD 億美元 ($B) 與台股億元
 */
export function formatEtfMetrics(
  etfData?: MonthlyRevenueData['etfData'] | null,
  opts?: { currency?: 'TWD' | 'USD'; market?: MarketType }
): FormattedEtfMetrics {
  const isUs = opts?.currency === 'USD' || opts?.market === 'US';
  return {
    aumText:
      etfData?.aumBillion != null
        ? isUs
          ? `${etfData.aumBillion} 億美元 ($${etfData.aumBillion}B)`
          : `${etfData.aumBillion} 億元`
        : '--',
    yieldText: etfData?.dividendYield != null ? `${etfData.dividendYield}%` : '--',
    beneficiariesText: etfData?.beneficiaries != null ? `${etfData.beneficiaries.toLocaleString()} 人` : '--',
  };
}

interface MonthlyRevenueCardProps {
  data: MonthlyRevenueData;
  colorTheme?: ColorThemeMode;
  market?: MarketType;
}

export const MonthlyRevenueCard: React.FC<MonthlyRevenueCardProps> = ({
  data,
  colorTheme = 'taiwan',
  market,
}) => {
  const isEtf = data.isEtf;
  const isQuarterly = Boolean(data.isQuarterly);
  const isUs = Boolean(data.isUsMarket || data.currency === 'USD' || market === 'US');
  const history = data.history || [];

  const isTaiwan = colorTheme === 'taiwan';
  const posColor = isTaiwan ? '#ef4444' : '#10b981';
  const posText = isTaiwan ? '#f87171' : '#34d399';
  const posBg = isTaiwan ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
  const posBorder = isTaiwan ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)';
  const negColor = isTaiwan ? '#10b981' : '#ef4444';
  const negText = isTaiwan ? '#34d399' : '#f87171';
  const negBg = isTaiwan ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  const negBorder = isTaiwan ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';

  const maxRevenue = useMemo(() => {
    if (history.length === 0) return 1;
    return Math.max(...history.map((h) => h.revenue), 1);
  }, [history]);

  const badgeColor = useMemo(() => {
    const b = data.growthBadge || '';
    if (b.includes('雙增') || b.includes('新高') || b.includes('強勁') || b.includes('成長') || b.includes('穩健')) {
      return { bg: posBg, text: posText, border: posBorder };
    }
    if (b.includes('衰退') || b.includes('年減')) {
      return { bg: negBg, text: negText, border: negBorder };
    }
    return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
  }, [data.growthBadge, posBg, posText, posBorder, negBg, negText, negBorder]);

  const etfMetrics = useMemo(
    () => formatEtfMetrics(data.etfData, { currency: data.currency, market: isUs ? 'US' : 'TW' }),
    [data.etfData, data.currency, isUs]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
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
          flexWrap: 'wrap',
          gap: '8px',
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
              letterSpacing: '0.5px',
            }}
          >
            20
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: '0.98rem',
              fontWeight: 700,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isEtf ? <Coins size={16} color="#34d399" /> : <BarChart3 size={16} color="#34d399" />}
            <TermTooltip termId={isEtf ? 'etf' : 'revenue'}>
              {isEtf
                ? 'ETF 資產規模與收益分配'
                : isQuarterly
                ? '美股季度營收與成長走勢 (10-Q/10-K)'
                : '月營收與成長趨勢'}
            </TermTooltip>
          </h3>
        </div>

        {/* 成長評估徽章 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            borderRadius: '999px',
            background: badgeColor.bg,
            border: `1px solid ${badgeColor.border}`,
            color: badgeColor.text,
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          {data.growthBadge.includes('新高') ? (
            <Award size={13} />
          ) : (
            <TrendingUp size={13} />
          )}
          <span>{data.growthBadge}</span>
        </div>
      </div>

      {/* 分支 1：ETF 空狀態防禦 (絕不落入個股月營收分支) */}
      {isEtf && (data.isEmpty || !data.etfData) ? (
        <div
          data-testid="etf-empty-state"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 12px',
            color: '#94a3b8',
            textAlign: 'center',
            gap: '8px',
          }}
        >
          <Coins size={32} opacity={0.3} />
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#cbd5e1' }}>
            ETF 規模與配息資料待補
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {data.emptyMessage || data.asOfDateText || 'ETF 配息與受益人資料累積中'}
          </div>
        </div>
      ) : isEtf && data.etfData ? (
        /* 分支 2：ETF 自適應視圖：規模、殖利率與配息河流 */
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>ETF 資產規模</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
                {etfMetrics.aumText}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>平均年化殖利率</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                {etfMetrics.yieldText}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {isUs ? '計價幣別' : '總受益人人數'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                {isUs && data.etfData.beneficiaries == null ? 'USD 美元' : etfMetrics.beneficiariesText}
              </div>
            </div>
          </div>

          {/* 近四季配息金額與殖利率河流 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
              近四季配息紀錄與年化殖利率 {isUs ? '(USD)' : '(TWD)'}
            </div>
            {data.etfData.quarterlyDividends.length === 0 ? (
              <div
                data-testid="etf-dividend-empty-hint"
                style={{
                  padding: '14px 12px',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.45)',
                  border: '1px dashed rgba(148, 163, 184, 0.25)',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  color: '#94a3b8',
                }}
              >
                近四季尚無現金配息紀錄（或屬不配息累積型 ETF）
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {data.etfData.quarterlyDividends.map((q) => (
                  <div
                    key={q.quarter}
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      padding: '8px 6px',
                      borderRadius: '6px',
                      border: '1px solid rgba(56, 189, 248, 0.15)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{q.quarter}</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', margin: '2px 0' }}>
                      ${q.amount.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
                      {q.yieldRate}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '8px',
              fontSize: '0.75rem',
              color: '#94a3b8',
            }}
          >
            <span>智慧自適應：ETF 指數型基金視圖</span>
            <span>{data.asOfDateText}</span>
          </div>
        </>
      ) : data.isEmpty || history.length === 0 ? (
        /* 分支 3：個股營收空狀態防禦 */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 12px',
            color: '#94a3b8',
            textAlign: 'center',
            gap: '8px',
          }}
        >
          <BarChart3 size={32} opacity={0.3} />
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#cbd5e1' }}>
            {data.emptyMessage || '營收數據累積中'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {data.asOfDateText || '每月 10 日前公布前月營收'}
          </div>
        </div>
      ) : (
        /* 分支 4：個股月營收 / 美股季營收長條圖視圖 */
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {isQuarterly ? '最新季度營收' : '單月最新營收'}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                {data.latestRevenueText || '--'}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>營收年增率 YoY</div>
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: (data.latestYoyRate ?? 0) >= 0 ? posText : negText,
                }}
              >
                {data.latestYoyRate !== undefined
                  ? `${data.latestYoyRate >= 0 ? '+' : ''}${data.latestYoyRate.toFixed(1)}%`
                  : '--'}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {isQuarterly ? '連續雙增季數' : '連續雙增月數'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24' }}>
                {data.growthStreakMonths
                  ? `${data.growthStreakMonths} ${isQuarterly ? '季' : '個月'}`
                  : `0 ${isQuarterly ? '季' : '個月'}`}
              </div>
            </div>
          </div>

          {/* 營收長條圖 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              gap: '4px',
              padding: '6px 0',
              minHeight: '115px',
              height: '125px',
            }}
          >
            {history.map((h) => {
              const barHeight = calculateRevenueBarHeight(h.revenue, maxRevenue, 95);
              const isPositive = (h.yoyRate ?? 0) >= 0;
              const barColor = isPositive ? posColor : negColor;
              const tooltipRev = formatRevenueTooltipValue(h.revenue, {
                isQuarterly,
                currency: isUs ? 'USD' : 'TWD',
              });
              const xLabel =
                isQuarterly && h.yearMonth.includes('Q')
                  ? h.yearMonth.replace(/^20/, '')
                  : h.yearMonth.substring(5);

              return (
                <div
                  key={h.yearMonth}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    height: '115px',
                    justifyContent: 'flex-end',
                  }}
                  title={`${h.yearMonth}: 營收 ${tooltipRev} | YoY: ${h.yoyRate ?? '--'}%`}
                >
                  {/* ATH 創高標註星星 */}
                  {h.isAllTimeHigh && (
                    <Sparkles size={11} color="#f59e0b" style={{ marginBottom: '-2px' }} />
                  )}

                  {/* 營收長條 */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '22px',
                      height: `${barHeight}px`,
                      background: barColor,
                      borderRadius: '3px 3px 0 0',
                      opacity: 0.85,
                      transition: 'height 0.3s ease',
                    }}
                  />

                  {/* 月份或季度標籤 */}
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {xLabel}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 底部圖例與基準日說明 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '0.75rem',
              color: '#94a3b8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: posColor }} />
                YoY 正成長
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: negColor }} />
                YoY 衰退
              </span>
            </div>
            <span>{data.asOfDateText}</span>
          </div>
        </>
      )}
    </div>
  );
};
