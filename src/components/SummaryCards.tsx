import React from 'react';
import { PortfolioSummary, MarketType } from '../types/stock';
import { Wallet, ArrowUpRight, ArrowDownRight, Award, Coins } from 'lucide-react';

interface SummaryCardsProps {
  summary: PortfolioSummary;
  currentMarket: 'ALL' | MarketType;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, currentMarket }) => {
  const isTW = currentMarket === 'TW';
  const isUS = currentMarket === 'US';
  const isALL = currentMarket === 'ALL';

  const currencySymbol = isUS ? 'USD $' : 'NT$';

  let marketValue = 0;
  let totalCost = 0;
  let unrealizedPnL = 0;
  let unrealizedPnLPercent = 0;
  let realizedPnL = 0;
  let totalDividends = 0;
  let totalCapitalReturned = 0;

  if (isTW) {
    marketValue = summary.twd.marketValue;
    totalCost = summary.twd.totalCost;
    unrealizedPnL = summary.twd.unrealizedPnL;
    unrealizedPnLPercent = summary.twd.unrealizedPnLPercent;
    realizedPnL = summary.twd.realizedPnL;
    totalDividends = summary.twd.totalDividends;
    totalCapitalReturned = summary.twd.totalCapitalReturned || 0;
  } else if (isUS) {
    marketValue = summary.usd.marketValue;
    totalCost = summary.usd.totalCost;
    unrealizedPnL = summary.usd.unrealizedPnL;
    unrealizedPnLPercent = summary.usd.unrealizedPnLPercent;
    realizedPnL = summary.usd.realizedPnL;
    totalDividends = summary.usd.totalDividends;
    totalCapitalReturned = summary.usd.totalCapitalReturned || 0;
  } else {
    marketValue = summary.combinedTWD.marketValue;
    totalCost = summary.combinedTWD.totalCost;
    unrealizedPnL = summary.combinedTWD.unrealizedPnL;
    unrealizedPnLPercent = summary.combinedTWD.unrealizedPnLPercent;
    realizedPnL = summary.combinedTWD.realizedPnL;
    totalDividends = summary.combinedTWD.totalDividends;
    totalCapitalReturned = summary.combinedTWD.totalCapitalReturned || 0;
  }

  const isGain = unrealizedPnL >= 0;
  const isRealizedGain = realizedPnL >= 0;

  const formatNumber = (num: number, decimals: number = isUS ? 2 : 0) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {/* 1. 總資產市值 */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            總資產市值 {isALL && '(折合台幣)'}
          </span>
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wallet size={18} color="#60a5fa" />
          </div>
        </div>
        <div className="mono" style={{ fontSize: '1.625rem', fontWeight: 700, color: '#ffffff' }}>
          {currencySymbol} {formatNumber(marketValue)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          持有成本基準：{currencySymbol} {formatNumber(totalCost)}
        </div>
      </div>

      {/* 2. 未實現損益 */}
      <div
        className="glass-card"
        style={{
          padding: '20px',
          borderLeft: `4px solid ${isGain ? 'var(--gain-color)' : 'var(--loss-color)'}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            未實現損益 (浮動報酬)
          </span>
          <div
            style={{
              background: isGain ? 'var(--gain-bg)' : 'var(--loss-bg)',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isGain ? <ArrowUpRight size={20} color="var(--gain-color)" /> : <ArrowDownRight size={20} color="var(--loss-color)" />}
          </div>
        </div>
        <div
          className="mono"
          style={{
            fontSize: '1.625rem',
            fontWeight: 700,
            color: isGain ? 'var(--gain-color)' : 'var(--loss-color)',
          }}
        >
          {isGain ? '+' : ''}{currencySymbol} {formatNumber(unrealizedPnL)}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: isGain ? 'var(--gain-color)' : 'var(--loss-color)',
            marginTop: '6px',
          }}
        >
          <span>{isGain ? '▲' : '▼'} {Math.abs(unrealizedPnLPercent).toFixed(2)}%</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>未平倉報酬率</span>
        </div>
      </div>

      {/* 3. 已實現損益 */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            累計已實現損益 (已出場)
          </span>
          <div
            style={{
              background: isRealizedGain ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={18} color={isRealizedGain ? '#10b981' : '#f43f5e'} />
          </div>
        </div>
        <div
          className="mono"
          style={{
            fontSize: '1.625rem',
            fontWeight: 700,
            color: isRealizedGain ? 'var(--gain-color)' : 'var(--loss-color)',
          }}
        >
          {isRealizedGain ? '+' : ''}{currencySymbol} {formatNumber(realizedPnL)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          歷史平倉沖銷獲利與虧損累計
        </div>
      </div>

      {/* 4. 累計股息收益與資本返還 */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            累計股息收益 (被動收入)
          </span>
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Coins size={18} color="#fbbf24" />
          </div>
        </div>
        <div className="mono" style={{ fontSize: '1.625rem', fontWeight: 700, color: '#fbbf24' }}>
          {currencySymbol} {formatNumber(totalDividends)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>累積已領取現金配息</span>
          {totalCapitalReturned > 0 && (
            <span style={{ color: '#fb923c', fontWeight: 600 }}>
              減資退款 +{currencySymbol}{formatNumber(totalCapitalReturned)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
