import React, { useState } from 'react';
import { HoldingPosition, ColorThemeMode, LoanRecord } from '../types/stock';
import { PieChart, LayoutGrid, BarChart2, Scale } from 'lucide-react';
import { TreemapChart } from './TreemapChart';
import { RebalancingView } from './RebalancingView';

export interface AllocationChartProps {
  holdings: HoldingPosition[];
  usdToTwdRate: number;
  cashBalanceTwd?: number;
  totalDebtTwd?: number;
  loans?: LoanRecord[];
  colorTheme?: ColorThemeMode;
}

const COLOR_PALETTE = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899',
  '#06b6d4', '#14b8a6', '#6366f1', '#f97316', '#84cc16'
];

// 計算借貸槓桿負債比 LTV (%)
export const calculateLtvPercent = (totalDebt: number, totalAssets: number): number => {
  if (totalAssets <= 0 || totalDebt <= 0) return 0;
  return (totalDebt / totalAssets) * 100;
};

// 格式化 LTV 膠囊文字
export const formatLtvBadgeText = (ltvPercent: number): string => {
  return `負債比 LTV ${ltvPercent.toFixed(1)}%`;
};

export const AllocationChart: React.FC<AllocationChartProps> = ({
  holdings,
  usdToTwdRate,
  cashBalanceTwd = 0,
  totalDebtTwd = 0,
  loans = [],
  colorTheme = 'taiwan',
}) => {
  const [viewMode, setViewMode] = useState<'treemap' | 'bars' | 'rebalance'>('treemap');
  const activeHoldings = holdings.filter(h => h.shares > 0);

  // 折算為 TWD 計算各檔標的總市值
  const items = activeHoldings.map(h => {
    const rate = h.currency === 'USD' ? usdToTwdRate : 1;
    const valueInTwd = h.marketValue * rate;
    return {
      symbol: h.symbol,
      name: h.name,
      market: h.market,
      currency: h.currency,
      valueInTwd,
    };
  });

  const validCash = Math.max(0, cashBalanceTwd);
  const totalStockValueInTwd = items.reduce((sum, i) => sum + i.valueInTwd, 0);
  const totalAssetsInTwd = totalStockValueInTwd + validCash;

  // 計算有效總借款額與 LTV 負債比
  const aggregatedLoanPrincipal = loans.reduce((sum, l) => sum + (l.principal || 0), 0);
  const validDebt = Math.max(0, totalDebtTwd > 0 ? totalDebtTwd : aggregatedLoanPrincipal);
  const ltvPercent = calculateLtvPercent(validDebt, totalAssetsInTwd);

  // 計算台股 vs 美股 vs 現金比例 (以總資產為分母)
  const twValue = items.filter(i => i.market === 'TW').reduce((sum, i) => sum + i.valueInTwd, 0);
  const usValue = items.filter(i => i.market === 'US').reduce((sum, i) => sum + i.valueInTwd, 0);

  const twPercent = totalAssetsInTwd > 0 ? (twValue / totalAssetsInTwd) * 100 : 0;
  const usPercent = totalAssetsInTwd > 0 ? (usValue / totalAssetsInTwd) * 100 : 0;
  const cashPercent = totalAssetsInTwd > 0 ? (validCash / totalAssetsInTwd) * 100 : 0;

  // 權重清單項目 (含現金部位與借款部位)
  const allListItems = [...items];
  if (validCash > 0) {
    allListItems.push({
      symbol: '💵 現金',
      name: 'Cash / 活存與備用金',
      market: 'TW' as const,
      currency: 'TWD',
      valueInTwd: validCash,
    });
  }
  if (validDebt > 0) {
    allListItems.push({
      symbol: '🏦 借貸負債',
      name: 'Loans / 質押與借貸總負債',
      market: 'TW' as const,
      currency: 'TWD',
      valueInTwd: validDebt,
    });
  }

  // 排序前大持股與資產
  const sortedItems = [...allListItems].sort((a, b) => b.valueInTwd - a.valueInTwd);

  if (activeHoldings.length === 0 && validCash <= 0 && validDebt <= 0) return null;

  return (
    <div
      className="glass-card"
      style={{
        padding: '20px 24px',
        marginBottom: '20px',
        border: '1px solid rgba(51, 65, 85, 0.4)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 16, 30, 0.7) 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(139, 92, 246, 0.35)',
            }}
          >
            <PieChart size={18} color="#c084fc" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              資產配置與持倉分佈
            </h2>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              即時權重佔比 · 多市場暴露 · 再平衡模擬
            </p>
          </div>
        </div>

        {/* 視圖切換按鈕與比例 HUD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(19, 29, 49, 0.8)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              onClick={() => setViewMode('treemap')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'treemap'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'transparent',
                color: viewMode === 'treemap' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                boxShadow: viewMode === 'treemap' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
              }}
            >
              <LayoutGrid size={13} />
              樹狀圖 (Treemap)
            </button>
            <button
              onClick={() => setViewMode('bars')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'bars'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'transparent',
                color: viewMode === 'bars' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                boxShadow: viewMode === 'bars' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
              }}
            >
              <BarChart2 size={13} />
              權重清單
            </button>
            <button
              onClick={() => setViewMode('rebalance')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'rebalance'
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                  : 'transparent',
                color: viewMode === 'rebalance' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                boxShadow: viewMode === 'rebalance' ? '0 2px 8px rgba(139, 92, 246, 0.3)' : 'none',
              }}
            >
              <Scale size={13} />
              ⚖️ 目標配置與再平衡
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.76rem',
              flexWrap: 'wrap',
              background: 'rgba(19, 29, 49, 0.6)',
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <span style={{ color: '#60a5fa', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }} />
              台股 {twPercent.toFixed(1)}%
            </span>
            <span style={{ color: '#c084fc', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6' }} />
              美股 {usPercent.toFixed(1)}%
            </span>
            {validCash > 0 && (
              <span style={{ color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                現金 {cashPercent.toFixed(1)}%
              </span>
            )}
            {validDebt > 0 && (
              <span
                style={{
                  color: '#fbbf24',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                }}
                title={`借貸總負債 NT$ ${Math.round(validDebt).toLocaleString()}`}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                {formatLtvBadgeText(ltvPercent)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 三段式市場配置進度條 (非再平衡模式時顯示) */}
      {viewMode !== 'rebalance' && (
        <div
          style={{
            height: '8px',
            background: 'rgba(19, 29, 49, 0.8)',
            borderRadius: '4px',
            overflow: 'hidden',
            display: 'flex',
            marginBottom: '18px',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              width: `${twPercent}%`,
              background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            title={`台股 ${twPercent.toFixed(1)}%`}
          />
          <div
            style={{
              width: `${usPercent}%`,
              background: 'linear-gradient(90deg, #7c3aed 0%, #8b5cf6 100%)',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            title={`美股 ${usPercent.toFixed(1)}%`}
          />
          {validCash > 0 && (
            <div
              style={{
                width: `${cashPercent}%`,
                background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              title={`現金 ${cashPercent.toFixed(1)}%`}
            />
          )}
        </div>
      )}

      {/* 視圖內容 */}
      {viewMode === 'treemap' ? (
        <TreemapChart
          holdings={activeHoldings}
          usdToTwdRate={usdToTwdRate}
          cashBalanceTwd={validCash}
          totalDebtTwd={validDebt}
          loans={loans}
          colorTheme={colorTheme}
        />
      ) : viewMode === 'bars' ? (
        /* 個股與資產分佈長條與佔比 */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px',
          }}
        >
          {sortedItems.map((item, idx) => {
            const percent = totalAssetsInTwd > 0 ? (item.valueInTwd / totalAssetsInTwd) * 100 : 0;
            const isCash = item.symbol === '💵 現金';
            const isDebt = item.symbol === '🏦 借貸負債';
            const color = isDebt ? '#f59e0b' : isCash ? '#10b981' : COLOR_PALETTE[idx % COLOR_PALETTE.length];

            return (
              <div
                key={item.symbol}
                style={{
                  background: 'rgba(19, 29, 49, 0.5)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: isDebt
                    ? '1px solid rgba(245, 158, 11, 0.4)'
                    : isCash
                    ? '1px solid rgba(16, 185, 129, 0.35)'
                    : '1px solid var(--border-color)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span className="mono" style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>{item.symbol}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {item.name}
                    </span>
                  </div>
                  <span className="mono" style={{ fontWeight: 700, color: color, fontSize: '0.85rem' }}>
                    {percent.toFixed(1)}%
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ height: '4px', background: 'rgba(51, 65, 85, 0.4)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${percent}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ⚖️ 目標配置與再平衡工作台 */
        <RebalancingView
          holdings={activeHoldings}
          usdToTwdRate={usdToTwdRate}
          cashBalanceTwd={cashBalanceTwd}
          colorTheme={colorTheme}
        />
      )}
    </div>
  );
};
