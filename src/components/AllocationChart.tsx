import React, { useState } from 'react';
import { HoldingPosition, ColorThemeMode } from '../types/stock';
import { PieChart, LayoutGrid, BarChart2 } from 'lucide-react';
import { TreemapChart } from './TreemapChart';

interface AllocationChartProps {
  holdings: HoldingPosition[];
  usdToTwdRate: number;
  colorTheme?: ColorThemeMode;
}

const COLOR_PALETTE = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899',
  '#06b6d4', '#14b8a6', '#6366f1', '#f97316', '#84cc16'
];

export const AllocationChart: React.FC<AllocationChartProps> = ({
  holdings,
  usdToTwdRate,
  colorTheme = 'taiwan',
}) => {
  const [viewMode, setViewMode] = useState<'treemap' | 'bars'>('treemap');
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

  const totalValueInTwd = items.reduce((sum, i) => sum + i.valueInTwd, 0);

  // 計算台股 vs 美股比例
  const twValue = items.filter(i => i.market === 'TW').reduce((sum, i) => sum + i.valueInTwd, 0);
  const usValue = items.filter(i => i.market === 'US').reduce((sum, i) => sum + i.valueInTwd, 0);

  const twPercent = totalValueInTwd > 0 ? (twValue / totalValueInTwd) * 100 : 0;
  const usPercent = totalValueInTwd > 0 ? (usValue / totalValueInTwd) * 100 : 0;

  // 排序前 8 大持股
  const sortedItems = [...items].sort((a, b) => b.valueInTwd - a.valueInTwd);

  if (activeHoldings.length === 0) return null;

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PieChart size={20} color="#8b5cf6" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>資產配置與持倉分佈</h2>
        </div>

        {/* 視圖切換按鈕 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>🇹🇼 台股 {twPercent.toFixed(1)}%</span>
            <span style={{ color: '#a78bfa', fontWeight: 600 }}>🇺🇸 美股 {usPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* 雙市場配置進度條 */}
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
      </div>

      {/* 視圖內容 */}
      {viewMode === 'treemap' ? (
        <TreemapChart
          holdings={activeHoldings}
          usdToTwdRate={usdToTwdRate}
          colorTheme={colorTheme}
        />
      ) : (
        /* 個股持倉分佈長條與佔比 */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px'
        }}>
          {sortedItems.map((item, idx) => {
            const percent = totalValueInTwd > 0 ? (item.valueInTwd / totalValueInTwd) * 100 : 0;
            const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];

            return (
              <div
                key={item.symbol}
                style={{
                  background: 'rgba(30, 41, 59, 0.4)',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
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
      )}
    </div>
  );
};
