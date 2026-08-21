import React from 'react';
import { PortfolioSummary, MarketType, AccountingView } from '../types/stock';
import { Wallet, ArrowUpRight, ArrowDownRight, Award, Coins } from 'lucide-react';

interface SummaryCardsProps {
  summary: PortfolioSummary;
  currentMarket: 'ALL' | MarketType;
  accountingView?: AccountingView;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  currentMarket,
  accountingView = 'BROKER',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {isBroker ? '庫存總市值 (含稅淨現值)' : '總資產市值 (毛市值)'} {isALL && '(折合台幣)'}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                padding: '1px 6px',
                borderRadius: '4px',
                background: isBroker ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: isBroker ? '#60a5fa' : '#34d399',
                fontWeight: 600,
              }}
            >
              {isBroker ? '券商口徑' : '總報酬口徑'}
            </span>
          </div>
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
          {currencySymbol} {formatNumber(displayMarketValue)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div>
            {isBroker
              ? `牌面毛市值: ${currencySymbol} ${formatNumber(grossMarketValue)} (預估賣出稅費: -${currencySymbol} ${formatNumber(estimatedTaxFee)})`
              : `預估清算淨值: ${currencySymbol} ${formatNumber(netMarketValue)} (預估稅費: ${currencySymbol} ${formatNumber(estimatedTaxFee)})`}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            總付出成本基準：{currencySymbol} {formatNumber(totalCost)}
          </div>
        </div>
      </div>

      {/* 2. 未實現損益 / 總投資損益 */}
      <div
        className="glass-card"
        style={{
          padding: '20px',
          borderLeft: `4px solid ${isGain ? 'var(--gain-color)' : 'var(--loss-color)'}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {isBroker ? '損益試算 (券商含稅)' : '投資總報酬 (加計股息)'}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                padding: '1px 6px',
                borderRadius: '4px',
                background: isGain ? 'var(--gain-bg)' : 'var(--loss-bg)',
                color: isGain ? 'var(--gain-color)' : 'var(--loss-color)',
                fontWeight: 600,
              }}
            >
              {isBroker ? '不含息·含稅' : 'Total Return'}
            </span>
          </div>
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
          {isGain ? '+' : ''}{currencySymbol} {formatNumber(isBroker ? unrealizedPnL : totalReturnPnL)}
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
          <span>{isGain ? '▲' : '▼'} {Math.abs(isBroker ? unrealizedPnLPercent : totalReturnPercent).toFixed(2)}%</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            {isBroker
              ? `未扣稅損益: ${currencySymbol} ${formatNumber(grossMarketValue - totalCost)}`
              : `未實現價差: ${isGain ? '+' : ''}${currencySymbol} ${formatNumber(unrealizedPnL)} (${unrealizedPnLPercent.toFixed(2)}%)`}
          </span>
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
