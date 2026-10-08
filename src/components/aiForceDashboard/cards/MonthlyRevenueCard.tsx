import React, { useMemo } from 'react';
import { MonthlyRevenueData } from '../../../types/aiForceDashboard';
import { ColorThemeMode } from '../../../types/stock';
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

interface MonthlyRevenueCardProps {
  data: MonthlyRevenueData;
  colorTheme?: ColorThemeMode;
}

export const MonthlyRevenueCard: React.FC<MonthlyRevenueCardProps> = ({
  data,
  colorTheme: _colorTheme = 'taiwan',
}) => {
  const isEtf = data.isEtf;
  const history = data.history || [];

  const maxRevenue = useMemo(() => {
    if (history.length === 0) return 1;
    return Math.max(...history.map((h) => h.revenue), 1);
  }, [history]);

  const badgeColor = useMemo(() => {
    if (data.growthBadge.includes('雙增') || data.growthBadge.includes('新高') || data.growthBadge.includes('強勁')) {
      return { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', border: 'rgba(16, 185, 129, 0.4)' };
    }
    if (data.growthBadge.includes('衰退') || data.growthBadge.includes('年減')) {
      return { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', border: 'rgba(239, 68, 68, 0.4)' };
    }
    return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
  }, [data.growthBadge]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(20, 32, 54, 0.8) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
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
              background: 'rgba(16, 185, 129, 0.25)',
              color: '#34d399',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
            }}
          >
            CARD 20
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
              {isEtf ? 'ETF 資產規模與收益分配' : '月營收與成長趨勢'}
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

      {/* 空狀態防禦 */}
      {data.isEmpty && !isEtf ? (
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
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {data.asOfDateText || '每月 10 日前公布前月營收'}
          </div>
        </div>
      ) : isEtf && data.etfData ? (
        /* ETF 自適應視圖：規模、殖利率與配息河流 */
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
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ETF 資產規模</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399' }}>
                {data.etfData.aumBillion} 億元
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
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>平均年化殖利率</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>
                {data.etfData.dividendYield}%
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
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>總受益人人數</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                {data.etfData.beneficiaries.toLocaleString()} 人
              </div>
            </div>
          </div>

          {/* 近四季配息金額與殖利率河流 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
              近四季配息紀錄與年化殖利率
            </div>
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
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{q.quarter}</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', margin: '2px 0' }}>
                    ${q.amount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>
                    {q.yieldRate}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '8px',
              fontSize: '0.72rem',
              color: '#64748b',
            }}
          >
            <span>智慧自適應：ETF 指數型基金視圖</span>
            <span>{data.asOfDateText}</span>
          </div>
        </>
      ) : (
        /* 個股月營收長條圖視圖 */
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
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>單月最新營收</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399' }}>
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
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>營收年增率 YoY</div>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: (data.latestYoyRate ?? 0) >= 0 ? '#34d399' : '#f87171',
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
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>連續雙增月數</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24' }}>
                {data.growthStreakMonths ? `${data.growthStreakMonths} 個月` : '0 個月'}
              </div>
            </div>
          </div>

          {/* 12 個月單月營收長條圖 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              gap: '4px',
              padding: '6px 0',
              minHeight: '110px',
            }}
          >
            {history.map((h) => {
              const barHeight = calculateRevenueBarHeight(h.revenue, maxRevenue, 95);
              const isPositive = (h.yoyRate ?? 0) >= 0;
              const barColor = isPositive ? '#10b981' : '#ef4444';

              return (
                <div
                  key={h.yearMonth}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                  title={`${h.yearMonth}: 營收 ${(h.revenue / 100000).toFixed(1)} 億 | YoY: ${h.yoyRate ?? '--'}%`}
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

                  {/* 月份標籤 (如 "09") */}
                  <div style={{ fontSize: '0.65rem', color: '#64748b', transform: 'scale(0.9)' }}>
                    {h.yearMonth.substring(5)}
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
              fontSize: '0.72rem',
              color: '#64748b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} />
                YoY 正成長
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ef4444' }} />
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
