import React, { useState } from 'react';
import { HoldingPosition, ColorThemeMode } from '../types/stock';
import { PieChart, LayoutGrid, BarChart2, Scale } from 'lucide-react';
import { TreemapChart } from './TreemapChart';
import { RebalancingView } from './RebalancingView';

interface AllocationChartProps {
  holdings: HoldingPosition[];
  usdToTwdRate: number;
  cashBalanceTwd?: number;
  colorTheme?: ColorThemeMode;
}

const COLOR_PALETTE = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899',
  '#06b6d4', '#14b8a6', '#6366f1', '#f97316', '#84cc16'
];

export const AllocationChart: React.FC<AllocationChartProps> = ({
  holdings,
  usdToTwdRate,
  cashBalanceTwd = 0,
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

  // 計算台股 vs 美股 vs 現金比例 (以總資產為分母)
  const twValue = items.filter(i => i.market === 'TW').reduce((sum, i) => sum + i.valueInTwd, 0);
  const usValue = items.filter(i => i.market === 'US').reduce((sum, i) => sum + i.valueInTwd, 0);

  const twPercent = totalAssetsInTwd > 0 ? (twValue / totalAssetsInTwd) * 100 : 0;
  const usPercent = totalAssetsInTwd > 0 ? (usValue / totalAssetsInTwd) * 100 : 0;
  const cashPercent = totalAssetsInTwd > 0 ? (validCash / totalAssetsInTwd) * 100 : 0;

  // 權重清單項目 (含現金部位)
  const allListItems = [...items];
  if (validCash > 0) {
    allListItems.push({
      symbol: '💵 現金',
      name: 'Cash / 活存與備用金',
      market: 'TW' as const, // 標籤兼容
      currency: 'TWD',
      valueInTwd: validCash,
    });
  }

  // 排序前大持股與資產
  const sortedItems = [...allListItems].sort((a, b) => b.valueInTwd - a.valueInTwd);

  if (activeHoldings.length === 0 && validCash <= 0) return null;

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PieChart size={20} color="#8b5cf6" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>資產配置與持倉分佈</h2>
        </div>

        {/* 視圖切換按鈕 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setViewMode('treemap')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'treemap' ? 'var(--primary-color)' : 'transparent',
                color: viewMode === 'treemap' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              <LayoutGrid size={14} />
              樹狀圖 (Treemap)
            </button>
            <button
              onClick={() => setViewMode('bars')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'bars' ? 'var(--primary-color)' : 'transparent',
                color: viewMode === 'bars' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              <BarChart2 size={14} />
              權重清單
            </button>
            <button
              onClick={() => setViewMode('rebalance')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'rebalance' ? '#8b5cf6' : 'transparent',
                color: viewMode === 'rebalance' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              <Scale size={14} />
              ⚖️ 目標配置與再平衡
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>🇹🇼 台股 {twPercent.toFixed(1)}%</span>
            <span style={{ color: '#a78bfa', fontWeight: 600 }}>🇺🇸 美股 {usPercent.toFixed(1)}%</span>
            {validCash > 0 && (
              <span style={{ color: '#34d399', fontWeight: 600 }}>💵 現金 {cashPercent.toFixed(1)}%</span>
            )}
          </div>
        </div>
      </div>

      {/* 三段式市場配置進度條 (非再平衡模式時顯示) */}
      {viewMode !== 'rebalance' && (
        <div style={{
          height: '8px',
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: '4px',
          overflow: 'hidden',
          display: 'flex',
          marginBottom: '20px'
        }}>
          <div style={{ width: `${twPercent}%`, background: '#3b82f6', transition: 'width 0.4s ease' }} title={`台股 ${twPercent.toFixed(1)}%`} />
          <div style={{ width: `${usPercent}%`, background: '#8b5cf6', transition: 'width 0.4s ease' }} title={`美股 ${usPercent.toFixed(1)}%`} />
          {validCash > 0 && (
            <div style={{ width: `${cashPercent}%`, background: '#10b981', transition: 'width 0.4s ease' }} title={`現金 ${cashPercent.toFixed(1)}%`} />
          )}
        </div>
      )}

      {/* 視圖內容 */}
      {viewMode === 'treemap' ? (
        <TreemapChart
          holdings={activeHoldings}
          usdToTwdRate={usdToTwdRate}
          cashBalanceTwd={validCash}
          colorTheme={colorTheme}
        />
      ) : viewMode === 'bars' ? (
        /* 個股與資產分佈長條與佔比 */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px'
        }}>
          {sortedItems.map((item, idx) => {
            const percent = totalAssetsInTwd > 0 ? (item.valueInTwd / totalAssetsInTwd) * 100 : 0;
            const isCash = item.symbol === '💵 現金';
            const color = isCash ? '#10b981' : COLOR_PALETTE[idx % COLOR_PALETTE.length];

            return (
              <div
                key={item.symbol}
                style={{
                  background: 'rgba(30, 41, 59, 0.4)',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: isCash ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                    <span className="mono" style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>{item.symbol}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.name}</span>
                  </div>
                  <span className="mono" style={{ fontWeight: 700, color: color, fontSize: '0.85rem' }}>
                    {percent.toFixed(1)}%
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ height: '4px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '2px', overflow: 'hidden' }}>
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
