import React from 'react';
import { PortfolioSummary, MarketType, AccountingView, PositionFilter, ClosedPositionsSummary, FrictionSummary } from '../types/stock';
import { XirrResult } from '../engine/xirrCalculator';
import { PortfolioExposureMetrics } from '../types/exposure';
import { InterestIncomeSummary } from '../engine/cashLedgerEngine';
import { Wallet, ArrowUpRight, ArrowDownRight, Award, Coins, Target, TrendingUp, TrendingDown, Eye } from 'lucide-react';

interface SummaryCardsProps {
  summary: PortfolioSummary;
  currentMarket: 'ALL' | MarketType;
  accountingView?: AccountingView;
  positionFilter?: PositionFilter;
  closedSummary?: ClosedPositionsSummary;
  frictionSummary?: FrictionSummary;
  portfolioXirr?: XirrResult;
  onInspectPortfolioXirr?: () => void;
  exposureMetrics?: PortfolioExposureMetrics;
  onOpenMarginStressModal?: () => void;
  interestIncomeSummary?: InterestIncomeSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  currentMarket,
  accountingView = 'BROKER',
  positionFilter = 'ACTIVE',
  closedSummary,
  frictionSummary,
  portfolioXirr,
  onInspectPortfolioXirr,
  exposureMetrics,
  onOpenMarginStressModal,
  interestIncomeSummary,
}) => {
  const isTW = currentMarket === 'TW';
  const isUS = currentMarket === 'US';
  const isALL = currentMarket === 'ALL';

  const currencySymbol = isUS ? 'USD $' : 'NT$';
  const isBroker = accountingView === 'BROKER';

  const slice = isTW ? summary.twd : isUS ? summary.usd : summary.combinedTWD;

  const grossMarketValue = slice.grossMarketValue ?? slice.marketValue;
  const netMarketValue = slice.netMarketValue ?? slice.marketValue;
  const estimatedTaxFee = (slice.estimatedSellTax || 0) + (slice.estimatedSellFee || 0);

  const displayMarketValue = isBroker ? netMarketValue : grossMarketValue;
  const totalCost = slice.totalCost;
  const unrealizedPnL = slice.unrealizedPnL;
  const unrealizedPnLPercent = slice.unrealizedPnLPercent;
  const totalReturnPnL = slice.totalReturnPnL ?? (unrealizedPnL + slice.totalDividends + slice.realizedPnL);
  const totalReturnPercent = slice.totalReturnPercent ?? (totalCost > 0 ? (totalReturnPnL / totalCost) * 100 : 0);
  const realizedPnL = slice.realizedPnL;
  const totalDividends = slice.totalDividends;
  const totalCapitalReturned = slice.totalCapitalReturned || 0;
  const totalTWDividendTax = frictionSummary?.totalTWDividendTax ?? 0;
  const totalUSDividendTax = frictionSummary?.totalUSDividendTax ?? 0;
  const todayPnL = slice.todayPnL ?? 0;
  const todayPnLPercent = slice.todayPnLPercent ?? 0;
  const isTodayGain = todayPnL >= 0;

  const isGain = (isBroker ? unrealizedPnL : totalReturnPnL) >= 0;
  const isRealizedGain = realizedPnL >= 0;

  const formatNumber = (num: number, decimals: number = isUS ? 2 : 0) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // 當前為「已平倉 (CLOSED)」模式時的專屬戰績卡片
  if (positionFilter === 'CLOSED') {
    const closedPnL = closedSummary ? closedSummary.totalRealizedPnL : slice.realizedPnL;
    const closedDivs = closedSummary ? closedSummary.totalDividends : slice.totalDividends;
    const isClosedGain = closedPnL >= 0;
    const winRate = closedSummary ? closedSummary.winRatePercent : 0;
    const tradesCount = closedSummary ? closedSummary.totalTradesCount : 0;
    const winCount = closedSummary ? closedSummary.winningTradesCount : 0;
    const loseCount = closedSummary ? closedSummary.losingTradesCount : 0;

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* 1. 已實現總獲利/虧損 */}
        <div
          className="glass-card"
          style={{
            padding: '18px 20px',
            borderLeft: `4px solid ${isClosedGain ? 'var(--gain-color)' : 'var(--loss-color)'}`,
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 16, 30, 0.7) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                已平倉總實現損益 {isALL && '(折合台幣)'}
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: isClosedGain ? 'var(--gain-bg)' : 'var(--loss-bg)',
                  color: isClosedGain ? 'var(--gain-color)' : 'var(--loss-color)',
                  fontWeight: 600,
                  border: `1px solid ${isClosedGain ? 'var(--gain-border)' : 'var(--loss-border)'}`,
                }}
              >
                已清倉結算
              </span>
            </div>
            <div
              style={{
                background: isClosedGain ? 'var(--gain-bg)' : 'var(--loss-bg)',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={18} color={isClosedGain ? 'var(--gain-color)' : 'var(--loss-color)'} />
            </div>
          </div>
          <div
            className="mono"
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: isClosedGain ? 'var(--gain-color)' : 'var(--loss-color)',
              lineHeight: 1.2,
            }}
          >
            {isClosedGain ? '+' : ''}{currencySymbol} {formatNumber(closedPnL)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            共結清 {tradesCount} 檔歷史標的之淨損益
          </div>
        </div>

        {/* 2. 交易勝率儀表板 */}
        <div
          className="glass-card"
          style={{
            padding: '18px 20px',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 16, 30, 0.7) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              勝率與戰績統計
            </span>
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Target size={18} color="#60a5fa" />
            </div>
          </div>
          <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#60a5fa', lineHeight: 1.2 }}>
            {winRate.toFixed(1)}% <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>勝率</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', gap: '8px' }}>
            <span style={{ color: 'var(--gain-color)', fontWeight: 600 }}>🟢 獲利 {winCount} 檔</span>
            <span style={{ color: 'var(--loss-color)', fontWeight: 600 }}>🔴 虧損 {loseCount} 檔</span>
          </div>
        </div>

        {/* 3. 最大獲利 / 虧損標的 */}
        <div
          className="glass-card"
          style={{
            padding: '18px 20px',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 16, 30, 0.7) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              代表戰役 (贏家 / 輸家)
            </span>
            <div
              style={{
                background: 'rgba(139, 92, 246, 0.15)',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={18} color="#a78bfa" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem' }}>
            {closedSummary?.bestWinner ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gain-color)' }}>
                <span style={{ fontWeight: 600 }}>🏆 {closedSummary.bestWinner.symbol} {closedSummary.bestWinner.name}</span>
                <span className="mono">+{currencySymbol}{formatNumber(closedSummary.bestWinner.pnl)}</span>
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>無獲利標的</span>
            )}
            {closedSummary?.worstLoser && closedSummary.worstLoser.pnl < 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--loss-color)', fontSize: '0.8rem' }}>
                <span>📉 {closedSummary.worstLoser.symbol} {closedSummary.worstLoser.name}</span>
                <span className="mono">{currencySymbol}{formatNumber(closedSummary.worstLoser.pnl)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* 4. 歷史落袋股息與利息 */}
        <div
          className="glass-card"
          style={{
            padding: '18px 20px',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 16, 30, 0.7) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              已落袋被動收益 (股息與利息)
            </span>
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Coins size={18} color="#fbbf24" />
            </div>
          </div>
          <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1.2 }}>
            {currencySymbol} {formatNumber(closedDivs + (interestIncomeSummary?.totalInterestAmount ?? 0))}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            已平倉標的現金股利與各項已入帳利息
          </div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
            {interestIncomeSummary?.interestItems && interestIncomeSummary.interestItems.map((item) => (
              <span
                key={item.id}
                style={{
                  fontSize: '0.66rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(6, 182, 212, 0.15)',
                  color: '#22d3ee',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  fontWeight: 600,
                }}
                title={`已入帳利息項目: ${item.name}`}
              >
                💵 {item.name} +{item.currency === 'USD' ? '$' : 'NT$'}{formatNumber(item.amount, item.currency === 'USD' ? 2 : 0)} {item.currency}
              </span>
            ))}
            {(isTW || isALL) && totalTWDividendTax > 0 && (
              <span style={{ fontSize: '0.66rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                健保 -NT${Math.round(totalTWDividendTax).toLocaleString()}
              </span>
            )}
            {(isUS || isALL) && totalUSDividendTax > 0 && (
              <span style={{ fontSize: '0.66rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                美股預扣 30% -${totalUSDividendTax.toLocaleString()} USD
              </span>
            )}
          </div>
        </div>

        {/* 5. 賽後紀律覆盤指標 */}
        <div
          className="glass-card"
          style={{
            padding: '18px 20px',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 16, 30, 0.7) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              🎯 交易紀律覆盤統計
            </span>
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Target size={18} color="#10b981" />
            </div>
          </div>
          {closedSummary?.disciplineSummary && closedSummary.disciplineSummary.totalReviewedTrades > 0 ? (
            <>
              <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', lineHeight: 1.2 }}>
                {closedSummary.disciplineSummary.disciplineRatePercent.toFixed(1)}%{' '}
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  遵守率 ({closedSummary.disciplineSummary.followedPlanTradesCount}/{closedSummary.disciplineSummary.totalReviewedTrades})
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⭐ 平均評分 {closedSummary.disciplineSummary.averageDisciplineScore} / 5.0</span>
              </div>
              {closedSummary.disciplineSummary.topMistakes.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {closedSummary.disciplineSummary.topMistakes.slice(0, 2).map((m) => (
                    <span
                      key={m.mistake}
                      style={{
                        fontSize: '0.65rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      ⚠️ {m.mistake === 'CHASE_HIGH' ? '追高' : m.mistake === 'HOLD_LOSER' ? '凹單' : m.mistake === 'PREMATURE_PROFIT' ? '過早止盈' : m.mistake === 'EMOTIONAL_SIZE' ? '情緒重押' : '無計畫'} ({m.count}次)
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>尚未填寫覆盤</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                展開下方已平倉標的即可填寫賽後覆盤與檢討
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 「持倉中 (ACTIVE)」與「全部總覽 (ALL)」模式
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '20px',
      }}
    >
      {/* 1. 總資產市值 */}
      <div
        className="glass-card"
        style={{
          padding: '18px 20px',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 16, 30, 0.75) 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {isBroker ? '庫存總市值 (含稅淨現值)' : '總資產市值 (毛市值)'} {isALL && '(折合台幣)'}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                padding: '1px 6px',
                borderRadius: '4px',
                background: isBroker ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: isBroker ? '#60a5fa' : '#34d399',
                border: isBroker ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
                fontWeight: 600,
              }}
            >
              {isBroker ? '券商口徑' : '總報酬口徑'}
            </span>
          </div>
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wallet size={18} color="#60a5fa" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
            {currencySymbol} {formatNumber(displayMarketValue)}
          </div>
          {todayPnL !== 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 7px',
                borderRadius: '6px',
                background: isTodayGain ? 'var(--gain-bg)' : 'var(--loss-bg)',
                color: isTodayGain ? 'var(--gain-color)' : 'var(--loss-color)',
                border: `1px solid ${isTodayGain ? 'var(--gain-border)' : 'var(--loss-border)'}`,
                fontSize: '0.76rem',
                fontWeight: 700,
              }}
              title="今日開盤以來的持股市值總變動金額與百分比"
            >
              <span>今日 {isTodayGain ? '▲' : '▼'} {isTodayGain ? '+' : ''}{currencySymbol} {formatNumber(todayPnL)} ({isTodayGain ? '+' : ''}{todayPnLPercent.toFixed(2)}%)</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div>
            {isBroker
              ? `牌面毛市值: ${currencySymbol} ${formatNumber(grossMarketValue)} (預估賣出稅費: -${currencySymbol} ${formatNumber(estimatedTaxFee)})`
              : `預估清算淨值: ${currencySymbol} ${formatNumber(netMarketValue)} (預估稅費: ${currencySymbol} ${formatNumber(estimatedTaxFee)})`}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            總付出成本基準：{currencySymbol} {formatNumber(totalCost)}
          </div>
        </div>

        {/* 整戶總曝險與淨槓桿率 (Net Leverage) 指標條 */}
        {exposureMetrics && (
          <div
            style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px dashed rgba(51, 65, 85, 0.4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.74rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>淨槓桿:</span>
              <span
                className="mono"
                style={{ fontWeight: 800, color: exposureMetrics.netLeverage > 1.3 ? '#f59e0b' : '#38bdf8' }}
                title={`計算式: (股票現值 $${Math.round(exposureMetrics.totalStockValueTWD).toLocaleString()} - 現金 $${Math.round(exposureMetrics.totalAvailableCashTWD).toLocaleString()}) / 淨資產 NAV $${Math.round(exposureMetrics.navTWD).toLocaleString()}`}
              >
                {exposureMetrics.netLeverage.toFixed(2)}x
              </span>
              <span
                style={{
                  fontSize: '0.64rem',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: '1px solid',
                }}
                className={exposureMetrics.riskInfo.badgeColor}
                title={exposureMetrics.riskInfo.description}
              >
                {exposureMetrics.riskTier === 'CONSERVATIVE' ? '穩健無槓桿' : exposureMetrics.riskTier === 'MODERATE' ? '溫和槓桿' : exposureMetrics.riskTier === 'ELEVATED' ? '積極擴張' : '極度危險'}
              </span>
            </div>

            {onOpenMarginStressModal && (
              <button
                onClick={onOpenMarginStressModal}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  borderRadius: '5px',
                  padding: '2px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="開啟質押維持率極端壓力測試模擬器，試算大盤暴跌斷頭安全邊際與追繳補足現金"
              >
                <TrendingDown size={11} /> 壓力模擬
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. 未實現損益 / 總投資損益 */}
      <div
        className="glass-card"
        style={{
          padding: '18px 20px',
          borderLeft: `4px solid ${isGain ? 'var(--gain-color)' : 'var(--loss-color)'}`,
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 16, 30, 0.75) 100%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {isBroker ? '損益試算 (券商含稅)' : '投資總報酬 (加計股息)'}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                padding: '1px 6px',
                borderRadius: '4px',
                background: isGain ? 'var(--gain-bg)' : 'var(--loss-bg)',
                color: isGain ? 'var(--gain-color)' : 'var(--loss-color)',
                border: `1px solid ${isGain ? 'var(--gain-border)' : 'var(--loss-border)'}`,
                fontWeight: 600,
              }}
            >
              {isBroker ? '不含息·含稅' : 'Total Return'}
            </span>
          </div>
          <div
            style={{
              background: isGain ? 'var(--gain-bg)' : 'var(--loss-bg)',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isGain ? <ArrowUpRight size={18} color="var(--gain-color)" /> : <ArrowDownRight size={18} color="var(--loss-color)" />}
          </div>
        </div>
        <div
          className="mono"
          style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: isGain ? 'var(--gain-color)' : 'var(--loss-color)',
            lineHeight: 1.2,
          }}
        >
          {isGain ? '+' : ''}{currencySymbol} {formatNumber(isBroker ? unrealizedPnL : totalReturnPnL)}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: isGain ? 'var(--gain-color)' : 'var(--loss-color)',
            marginTop: '6px',
          }}
        >
          <span>{isGain ? '▲' : '▼'} {Math.abs(isBroker ? unrealizedPnLPercent : totalReturnPercent).toFixed(2)}%</span>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            {isBroker
              ? `未扣稅損益: ${currencySymbol} ${formatNumber(grossMarketValue - totalCost)}`
              : `未實現價差: ${unrealizedPnL >= 0 ? '+' : ''}${currencySymbol} ${formatNumber(unrealizedPnL)} (${unrealizedPnLPercent.toFixed(2)}%)`}
          </span>
        </div>

        {portfolioXirr && portfolioXirr.totalInflow > 0 && (
          <div
            style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px dashed rgba(51, 65, 85, 0.4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.74rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {portfolioXirr.isAnnualized ? '年化 XIRR:' : '累計 XIRR:'}
              </span>
              <span
                className="mono"
                style={{
                  fontWeight: 800,
                  color: portfolioXirr.ratePercent >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
                }}
              >
                {portfolioXirr.ratePercent >= 0 ? '+' : ''}{portfolioXirr.ratePercent.toFixed(2)}%
              </span>
            </div>

            {onInspectPortfolioXirr && (
              <button
                onClick={onInspectPortfolioXirr}
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  borderRadius: '5px',
                  padding: '2px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="點擊透視整戶所有歷史現金流與折現權重明細"
              >
                <Eye size={11} /> 透視金流
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. 已實現損益 */}
      <div
        className="glass-card"
        style={{
          padding: '18px 20px',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 16, 30, 0.75) 100%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            累計已實現損益 (已出場)
          </span>
          <div
            style={{
              background: isRealizedGain ? 'var(--gain-bg)' : 'var(--loss-bg)',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={18} color={isRealizedGain ? 'var(--gain-color)' : 'var(--loss-color)'} />
          </div>
        </div>
        <div
          className="mono"
          style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: isRealizedGain ? 'var(--gain-color)' : 'var(--loss-color)',
            lineHeight: 1.2,
          }}
        >
          {isRealizedGain ? '+' : ''}{currencySymbol} {formatNumber(realizedPnL)}
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          歷史平倉沖銷獲利與虧損累計
        </div>
      </div>

      {/* 4. 累計股息與各項利息收益 */}
      <div
        className="glass-card"
        style={{
          padding: '18px 20px',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 16, 30, 0.75) 100%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            累計被動收益 (股息與利息)
          </span>
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Coins size={18} color="#fbbf24" />
          </div>
        </div>
        <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1.2 }}>
          {currencySymbol} {formatNumber(totalDividends + (interestIncomeSummary?.totalInterestAmount ?? 0))}
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>累積已領取現金配息與各項利息</span>
        </div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
          {/* 各項利息收入獨立膠囊 */}
          {interestIncomeSummary?.interestItems && interestIncomeSummary.interestItems.map((item) => (
            <span
              key={item.id}
              style={{
                fontSize: '0.66rem',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#22d3ee',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                fontWeight: 600,
              }}
              title={`已入帳利息項目: ${item.name}`}
            >
              💵 {item.name} +{item.currency === 'USD' ? '$' : 'NT$'}{formatNumber(item.amount, item.currency === 'USD' ? 2 : 0)} {item.currency}
            </span>
          ))}

          {/* 減資退款膠囊 */}
          {totalCapitalReturned > 0 && (
            <span style={{ fontSize: '0.66rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(251, 146, 60, 0.15)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.35)', fontWeight: 600 }}>
              減資退款 +{currencySymbol}{formatNumber(totalCapitalReturned)}
            </span>
          )}

          {/* 健保補充保費膠囊 */}
          {(isTW || isALL) && totalTWDividendTax > 0 && (
            <span style={{ fontSize: '0.66rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.35)' }}>
              健保 -NT${Math.round(totalTWDividendTax).toLocaleString()}
            </span>
          )}

          {/* 美股股票股息 30% 預扣稅膠囊 */}
          {(isUS || isALL) && totalUSDividendTax > 0 && (
            <span
              style={{ fontSize: '0.66rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.35)' }}
              title={`美股股息預扣稅: -$${totalUSDividendTax.toLocaleString()} USD`}
            >
              美股股息預扣 -${totalUSDividendTax.toLocaleString()} USD
            </span>
          )}

          {/* 美元現金利息預扣稅膠囊 */}
          {(isUS || isALL) && (interestIncomeSummary?.totalInterestTaxUSD ?? 0) > 0 && (
            <span
              style={{ fontSize: '0.66rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.35)' }}
              title={`現金利息預扣稅: -$${interestIncomeSummary!.totalInterestTaxUSD.toLocaleString()} USD`}
            >
              利息預扣 -${interestIncomeSummary!.totalInterestTaxUSD.toLocaleString()} USD
            </span>
          )}

          {/* 台幣利息預扣稅膠囊 */}
          {(isTW || isALL) && (interestIncomeSummary?.totalInterestTaxTWD ?? 0) > 0 && (
            <span
              style={{ fontSize: '0.66rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.35)' }}
              title={`台幣利息扣繳稅: -NT$${interestIncomeSummary!.totalInterestTaxTWD.toLocaleString()}`}
            >
              利息扣繳 -NT${interestIncomeSummary!.totalInterestTaxTWD.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
