import React, { useState } from 'react';
import { HoldingPosition } from '../types/stock';
import { Edit2, Check, Layers } from 'lucide-react';

interface HoldingsTableProps {
  holdings: HoldingPosition[];
  onUpdatePrice: (symbol: string, price: number) => void;
  onQuickTrade: (symbol: string, type: 'BUY' | 'SELL') => void;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  holdings,
  onUpdatePrice,
  onQuickTrade,
}) => {
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');

  // 僅顯示仍有持股的標的（股數 > 0）
  const activeHoldings = holdings.filter((h) => h.shares > 0);

  const startEditPrice = (symbol: string, currentPrice: number) => {
    setEditingSymbol(symbol);
    setPriceInput(currentPrice.toString());
  };

  const savePrice = (symbol: string) => {
    const val = parseFloat(priceInput);
    if (!isNaN(val) && val >= 0) {
      onUpdatePrice(symbol, val);
    }
    setEditingSymbol(null);
  };

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={20} color="#10b981" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>當前持倉庫存與未實現損益</h2>
        </div>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          共 {activeHoldings.length} 檔持股
        </span>
      </div>

      {activeHoldings.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--text-muted)',
          fontSize: '0.875rem'
        }}>
          目前無任何持股庫存。點擊右上角「新增交易」開始紀錄！
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>標的代碼 / 名稱</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>市場 / 幣別</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>持有股數</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>平均成本</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>最新參考市價</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>持倉總成本</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>當前市值</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>未實現損益 / 報酬率</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>累計股息 / YoC</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {activeHoldings.map((item) => {
                const isGain = item.unrealizedPnL >= 0;
                const isUS = item.currency === 'USD';
                const decimals = isUS ? 2 : (item.avgCost < 50 ? 2 : 1);
                const currencyPrefix = isUS ? '$' : 'NT$';

                return (
                  <tr
                    key={item.symbol}
                    style={{
                      borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
                      transition: 'background 0.15s ease'
                    }}
                    className="holding-row"
                  >
                    {/* 標的 */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="mono" style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
                          {item.symbol}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {item.name}
                      </div>
                    </td>

                    {/* 市場/幣別 */}
                    <td style={{ padding: '14px' }}>
                      <span className={`badge ${item.market === 'TW' ? 'badge-tw' : 'badge-us'}`}>
                        {item.market === 'TW' ? '🇹🇼 台股' : '🇺🇸 美股'} ({item.currency})
                      </span>
                    </td>

                    {/* 股數 */}
                    <td className="mono" style={{ padding: '14px', textAlign: 'right', fontWeight: 600 }}>
                      {item.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })} 股
                    </td>

                    {/* 平均成本 */}
                    <td className="mono" style={{ padding: '14px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {item.avgCost.toFixed(decimals)}
                    </td>

                    {/* 最新參考市價（支援編輯） */}
                    <td className="mono" style={{ padding: '14px', textAlign: 'right' }}>
                      {editingSymbol === item.symbol ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="number"
                            step="0.01"
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            style={{
                              width: '80px',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              background: '#090d16',
                              border: '1px solid #10b981',
                              color: '#fff',
                              fontSize: '0.8rem',
                              textAlign: 'right'
                            }}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && savePrice(item.symbol)}
                          />
                          <button
                            onClick={() => savePrice(item.symbol)}
                            className="btn btn-sm btn-primary"
                            style={{ padding: '3px 6px' }}
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditPrice(item.symbol, item.currentPrice)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(30, 41, 59, 0.4)'
                          }}
                          title="點擊修改最新現價"
                        >
                          <span style={{ fontWeight: 600, color: '#ffffff' }}>{item.currentPrice.toFixed(decimals)}</span>
                          <Edit2 size={12} color="var(--text-muted)" />
                        </div>
                      )}
                    </td>

                    {/* 總成本 */}
                    <td className="mono" style={{ padding: '14px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {Math.round(item.totalCostBasis).toLocaleString('en-US')}
                    </td>

                    {/* 當前市值 */}
                    <td className="mono" style={{ padding: '14px', textAlign: 'right', fontWeight: 600, color: '#ffffff' }}>
                      {Math.round(item.marketValue).toLocaleString('en-US')}
                    </td>

                    {/* 未實現損益與報酬率 */}
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div className="mono" style={{
                        fontWeight: 700,
                        color: isGain ? 'var(--gain-color)' : 'var(--loss-color)',
                        fontSize: '0.9rem'
                      }}>
                        {isGain ? '+' : ''}{Math.round(item.unrealizedPnL).toLocaleString('en-US')}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: isGain ? 'var(--gain-color)' : 'var(--loss-color)',
                        marginTop: '2px'
                      }}>
                        {isGain ? '▲' : '▼'} {Math.abs(item.unrealizedPnLPercent).toFixed(2)}%
                      </div>
                    </td>

                    {/* 累計股息與成本殖利率 YoC */}
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div className="mono" style={{ fontWeight: 600, color: item.totalDividends > 0 ? '#fbbf24' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {currencyPrefix} {Math.round(item.totalDividends).toLocaleString('en-US')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: item.totalDividends > 0 ? '#fbbf24' : 'var(--text-muted)', marginTop: '2px' }}>
                        YoC: {item.yieldOnCostPercent > 0 ? `${item.yieldOnCostPercent.toFixed(2)}%` : '-'}
                      </div>
                    </td>

                    {/* 快速加碼 / 平倉操作 */}
                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            padding: '4px 8px',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}
                          onClick={() => onQuickTrade(item.symbol, 'BUY')}
                          title="買進加碼"
                        >
                          加碼
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(244, 63, 94, 0.15)',
                            color: '#f43f5e',
                            padding: '4px 8px',
                            border: '1px solid rgba(244, 63, 94, 0.3)'
                          }}
                          onClick={() => onQuickTrade(item.symbol, 'SELL')}
                          title="賣出平倉"
                        >
                          賣出
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
