import React from 'react';
import type { ValuationMetricsData } from '../../../types/aiForceDashboard';
import type { MarketType } from '../../../types/stock';
import { Calculator, AlertTriangle, ShieldCheck, TrendingDown } from 'lucide-react';
import { TermTooltip } from '../../common/TermTooltip';

export interface ValuationMetricsCardProps {
  data?: ValuationMetricsData;
  market?: MarketType;
}

export const ValuationMetricsCard: React.FC<ValuationMetricsCardProps> = ({
  data,
  market = 'TW',
}) => {
  const isDataEmpty = Boolean(!data || data.isEmpty);

  const getTierMeta = () => {
    const tier = data?.valuationTier;
    if (tier === 'UNDERVALUED') {
      return {
        label: data?.valuationTierText || '低估便宜',
        color: '#34d399',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.3)',
      };
    }
    if (tier === 'OVERVALUED') {
      return {
        label: data?.valuationTierText || '高估偏貴',
        color: '#f87171',
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.3)',
      };
    }
    return {
      label: data?.valuationTierText || '合理估值區間',
      color: '#fbbf24',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.3)',
    };
  };

  const tierMeta = getTierMeta();

  return (
    <div
      data-testid="valuation-metrics-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '14px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(20, 30, 52, 0.8) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(139, 92, 246, 0.25)',
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
              background: 'rgba(139, 92, 246, 0.25)',
              color: '#a78bfa',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}
          >
            21
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: '0.88rem',
              fontWeight: 800,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Calculator size={15} color="#a78bfa" />
            <TermTooltip termId="valuationMetrics">估值與殖利率量化矩陣</TermTooltip>
          </h3>
        </div>

        {/* 估值位階徽章 */}
        {!isDataEmpty && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: tierMeta.bg,
              border: `1px solid ${tierMeta.border}`,
              color: tierMeta.color,
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
          >
            {data?.valuationTier === 'UNDERVALUED' ? (
              <ShieldCheck size={12} />
            ) : data?.valuationTier === 'OVERVALUED' ? (
              <AlertTriangle size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            <span>{tierMeta.label}</span>
          </div>
        )}
      </div>

      {/* 空狀態或內容 */}
      {isDataEmpty || !data ? (
        <div
          data-testid="valuation-empty-state"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            color: '#94a3b8',
            textAlign: 'center',
            gap: '8px',
          }}
        >
          <Calculator size={28} opacity={0.3} />
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>尚無估值數據</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {data?.asOfDateText || '等待財務報表或即時價格合流'}
          </div>
        </div>
      ) : (
        (() => {
          const current = data;
          const isEtf = Boolean(current.isEtf);
          const isLoss = Boolean(
            current.isLossMaking ||
            (current.pe !== undefined && current.pe < 0) ||
            (current.psRatio !== undefined && current.pe === undefined)
          );
          const isUs = Boolean(market === 'US' || current.isUsMarket);

          return (
            <>
              {/* 三宮格估值指標 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                {/* 狀態四：ETF 模式 */}
                {isEtf ? (
                  <>
                    {/* 格 1: 即時折溢價率 */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(139, 92, 246, 0.15)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>折溢價率</span>
                        {current.etfPremiumDiscountRate !== undefined && current.etfPremiumDiscountRate > 0.5 && (
                          <span style={{ fontSize: '0.6rem', color: '#f87171', fontWeight: 800 }}>溢價警戒</span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '1.02rem',
                          fontWeight: 800,
                          color:
                            current.etfPremiumDiscountRate !== undefined && current.etfPremiumDiscountRate > 0.5
                              ? '#f87171'
                              : '#c084fc',
                          fontFamily: 'monospace',
                        }}
                      >
                        {current.etfPremiumDiscountRate !== undefined
                          ? `${current.etfPremiumDiscountRate > 0 ? '+' : ''}${current.etfPremiumDiscountRate.toFixed(2)}%`
                          : '--'}
                      </div>
                    </div>

                    {/* 格 2: 總費用率 */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.15)',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>總費用率</div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
                        {current.etfExpenseRatio !== undefined ? `${current.etfExpenseRatio.toFixed(2)}%` : '--'}
                      </div>
                    </div>

                    {/* 格 3: 年化配息率 */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>年化配息率</div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
                        {current.dividendYield !== undefined ? `${current.dividendYield.toFixed(2)}%` : '--'}
                      </div>
                    </div>
                  </>
                ) : isLoss ? (
                  /* 狀態三：虧損轉機股模式 */
                  <>
                    {/* 格 1: 市銷率 (PS) */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>市銷率 (PS)</span>
                        <span style={{ fontSize: '0.6rem', color: '#fbbf24', fontWeight: 700 }}>虧損轉機</span>
                      </div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace' }}>
                        {current.psRatio !== undefined ? current.psRatio.toFixed(2) : '--'}
                      </div>
                    </div>

                    {/* 格 2: 股價淨值比 PB */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.15)',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>股價淨值比 (PB)</div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
                        {current.pb !== undefined ? current.pb.toFixed(2) : '--'}
                      </div>
                    </div>

                    {/* 格 3: 年化現金殖利率 */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>年化現金殖利率</div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
                        {current.dividendYield !== undefined && current.dividendYield > 0
                          ? `${current.dividendYield.toFixed(2)}%`
                          : '--'}
                      </div>
                    </div>
                  </>
                ) : isUs ? (
                  /* 狀態二：美股個股模式 */
                  <>
                    {/* 格 1: 本益比 (Forward PE 優先或 PE) */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(139, 92, 246, 0.15)',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {current.forwardPe !== undefined ? 'Forward PE' : '本益比 (PE)'}
                      </div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#c084fc', fontFamily: 'monospace' }}>
                        {(current.forwardPe ?? current.pe) !== undefined
                          ? (current.forwardPe ?? current.pe)!.toFixed(2)
                          : '--'}
                      </div>
                    </div>

                    {/* 格 2: 股價淨值比 PB */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.15)',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>股價淨值比 (PB)</div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
                        {current.pb !== undefined ? current.pb.toFixed(2) : '--'}
                      </div>
                    </div>

                    {/* 格 3: 扣除 30% IRS 稅後殖利率 */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>年化殖利率</span>
                        <span style={{ fontSize: '0.6rem', color: '#a78bfa', fontWeight: 700 }}>30% 稅後</span>
                      </div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
                        {current.netDividendYieldUs !== undefined
                          ? `${current.netDividendYieldUs.toFixed(2)}%`
                          : current.dividendYield !== undefined
                            ? `${(current.dividendYield * 0.7).toFixed(2)}%`
                            : '--'}
                      </div>
                    </div>
                  </>
                ) : (
                  /* 狀態一：台股個股標準模式 */
                  <>
                    {/* 格 1: 本益比 PE */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(139, 92, 246, 0.15)',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>本益比 (PE)</div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#c084fc', fontFamily: 'monospace' }}>
                        {current.pe !== undefined ? current.pe.toFixed(2) : '--'}
                      </div>
                    </div>

                    {/* 格 2: 股價淨值比 PB */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.15)',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>股價淨值比 (PB)</div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
                        {current.pb !== undefined ? current.pb.toFixed(2) : '--'}
                      </div>
                    </div>

                    {/* 格 3: 年化現金殖利率 */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>年化現金殖利率</div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
                        {current.dividendYield !== undefined ? `${current.dividendYield.toFixed(2)}%` : '--'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 機構級自身歷史倍數區間 (Spec 0199 Ticket 04) */}
              {(current.peMin !== undefined || current.pbMin !== undefined) && (
                <div
                  data-testid="valuation-institutional-band"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(30, 41, 59, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: '0.68rem',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ color: '#94a3b8' }}>
                    {current.peMin !== undefined ? '自身 PE 區間' : '自身 PB 區間'}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', fontFamily: 'monospace' }}>
                    <span style={{ color: '#34d399' }}>
                      {current.peMin !== undefined ? `${current.peMin}x` : `${current.pbMin}x`}{' '}
                      <span style={{ fontSize: '0.62rem', color: '#64748b' }}>低</span>
                    </span>
                    <span style={{ color: '#64748b' }}>—</span>
                    <span style={{ color: '#fbbf24' }}>
                      {current.peMedian !== undefined ? `${current.peMedian}x` : `${current.pbMedian}x`}{' '}
                      <span style={{ fontSize: '0.62rem', color: '#64748b' }}>中</span>
                    </span>
                    <span style={{ color: '#64748b' }}>—</span>
                    <span style={{ color: '#f87171' }}>
                      {current.peMax !== undefined ? `${current.peMax}x` : `${current.pbMax}x`}{' '}
                      <span style={{ fontSize: '0.62rem', color: '#64748b' }}>高</span>
                    </span>
                  </div>
                </div>
              )}

              {/* 歷史估值三段位階條 */}
              <div
                data-testid="valuation-tier-bar"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '4px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8' }}>
                  <span>歷史位階</span>
                  <span style={{ color: tierMeta.color, fontWeight: 700 }}>{tierMeta.label}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    height: '8px',
                    width: '100%',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    background: 'rgba(30, 41, 59, 0.8)',
                    gap: '2px',
                  }}
                >
                  <div
                    style={{
                      width: '33%',
                      background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                      opacity: current.valuationTier === 'UNDERVALUED' ? 1 : 0.4,
                    }}
                    title="低估便宜"
                  />
                  <div
                    style={{
                      width: '34%',
                      background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
                      opacity: current.valuationTier === 'FAIR' ? 1 : 0.4,
                    }}
                    title="合理估值"
                  />
                  <div
                    style={{
                      width: '33%',
                      background: 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
                      opacity: current.valuationTier === 'OVERVALUED' ? 1 : 0.4,
                    }}
                    title="高估偏貴"
                  />
                </div>
              </div>

              {/* 最新單季獲利基石 (EPS / 毛利率 / 營利率，Spec 0199 Ticket 04) */}
              {(current.latestQuarterEps !== undefined || current.grossMargin !== undefined) && (
                <div
                  data-testid="valuation-quarterly-financials"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    borderRadius: '6px',
                    background: 'rgba(15, 23, 42, 0.55)',
                    border: '1px solid rgba(139, 92, 246, 0.18)',
                    fontSize: '0.68rem',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ color: '#a78bfa', fontWeight: 700 }}>
                    {current.latestQuarterName ? `${current.latestQuarterName} 季報` : '最新單季獲利'}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {current.latestQuarterEps !== undefined && (
                      <span style={{ color: '#f8fafc' }}>
                        EPS: <strong style={{ color: current.latestQuarterEps >= 0 ? '#38bdf8' : '#f87171' }}>{current.latestQuarterEps}</strong>元
                      </span>
                    )}
                    {current.grossMargin !== undefined && (
                      <span style={{ color: '#cbd5e1' }}>
                        毛利: <strong style={{ color: '#34d399' }}>{current.grossMargin}%</strong>
                      </span>
                    )}
                    {current.operatingMargin !== undefined && (
                      <span style={{ color: '#94a3b8' }}>
                        營利: <strong>{current.operatingMargin}%</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 底部基準日與提示 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '0.68rem',
                  color: '#64748b',
                  marginTop: 'auto',
                }}
              >
                <span>
                  {isEtf ? 'ETF 淨值定錨 (etf_daily_nav)' : isUs ? '美股即時估值' : '台股即時動態價差定錨'}
                </span>
                <span>{current.asOfDateText ? `基準日: ${current.asOfDateText}` : ''}</span>
              </div>
            </>
          );
        })()
      )}
    </div>
  );
};

export default ValuationMetricsCard;
