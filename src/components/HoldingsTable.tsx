import React, { useState } from 'react';
import { HoldingPosition, TradeRecord, PriceQuote, MarketType } from '../types/stock';
import { Edit2, Check, Layers, ChevronDown, ChevronRight, Calendar, Lock, Unlock, RefreshCw } from 'lucide-react';

interface HoldingsTableProps {
  holdings: HoldingPosition[];
  trades?: TradeRecord[];
  quotes?: Record<string, PriceQuote>;
  lockedSymbols?: string[];
  onUpdatePrice: (symbol: string, price: number) => void;
  onToggleLock?: (symbol: string) => void;
  onRefreshSymbol?: (symbol: string, market: MarketType) => void;
  onQuickTrade: (symbol: string, type: 'BUY' | 'SELL') => void;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  holdings,
  trades = [],
  quotes = {},
  lockedSymbols = [],
  onUpdatePrice,
  onToggleLock,
  onRefreshSymbol,
  onQuickTrade,
}) => {
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

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

  const toggleExpand = (symbol: string) => {
    setExpandedSymbol((prev) => (prev === symbol ? null : symbol));
  };

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={20} color="#10b981" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>當前持倉庫存與未實現損益</h2>
        </div>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          共 {activeHoldings.length} 檔持股 · 點擊項目可展開股權歷程時間軸
        </span>
      </div>

      {activeHoldings.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
          }}
        >
          目前無任何持股庫存。點擊右上角「新增交易」開始紀錄！
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 14px', fontWeight: 600, width: '32px' }}></th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>標的代碼 / 名稱</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>市場 / 幣別</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>持有股數</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>平均成本</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>最新參考市價</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>持倉成本基準</th>
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
                const decimals = isUS ? 2 : item.avgCost < 50 ? 2 : 1;
                const currencyPrefix = isUS ? '$' : 'NT$';
                const isExpanded = expandedSymbol === item.symbol;

                // 取得該標的所有歷史交易與事件
                const stockTrades = trades
                  .filter((t) => t.symbol.toUpperCase() === item.symbol.toUpperCase())
                  .sort((a, b) => (b.date !== a.date ? b.date.localeCompare(a.date) : b.createdAt - a.createdAt));

                const hasCorporateActions =
                  (item.totalStockDividendsShares && item.totalStockDividendsShares > 0) ||
                  (item.totalCapitalReturned && item.totalCapitalReturned > 0) ||
                  stockTrades.some(
                    (t) =>
                      t.type === 'STOCK_DIVIDEND' ||
                      t.type === 'STOCK_SPLIT' ||
                      t.type === 'CAPITAL_REDUCTION' ||
                      t.type === 'CAPITAL_INCREASE'
                  );

                return (
                  <React.Fragment key={item.symbol}>
                    <tr
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid rgba(51, 65, 85, 0.3)',
                        transition: 'background 0.15s ease',
                        background: isExpanded ? 'rgba(30, 41, 59, 0.4)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      className="holding-row"
                      onClick={() => toggleExpand(item.symbol)}
                    >
                      {/* Expand Toggle Chevron */}
                      <td style={{ padding: '14px 6px 14px 14px', textAlign: 'center' }}>
                        {isExpanded ? (
                          <ChevronDown size={16} color="#60a5fa" />
                        ) : (
                          <ChevronRight size={16} color="var(--text-muted)" />
                        )}
                      </td>

                      {/* 標的 */}
                      <td style={{ padding: '14px 14px 14px 6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="mono" style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
                            {item.symbol}
                          </span>
                          {hasCorporateActions && (
                            <span
                              className="badge badge-stock-div"
                              style={{ padding: '1px 5px', fontSize: '0.65rem' }}
                              title="此標的曾發生除權配股、減資或分割事件"
                            >
                              ⚡ 公司行動
                            </span>
                          )}
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
                        <div>{item.shares.toLocaleString('en-US', { maximumFractionDigits: item.market === 'TW' ? 0 : 4 })} 股</div>
                        {item.totalStockDividendsShares && item.totalStockDividendsShares > 0 ? (
                          <div style={{ fontSize: '0.7rem', color: '#c084fc' }}>
                            含配股 +{item.totalStockDividendsShares.toLocaleString('en-US', { maximumFractionDigits: item.market === 'TW' ? 0 : 4 })} 股
                          </div>
                        ) : null}
                        {item.originalBuyShares && item.originalBuyShares > 0 && item.originalBuyShares !== item.shares && (
                          <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                            原買入 {item.originalBuyShares.toLocaleString('en-US', { maximumFractionDigits: item.market === 'TW' ? 0 : 4 })} 股
                          </div>
                        )}
                      </td>

                      {/* 平均成本 */}
                      <td className="mono" style={{ padding: '14px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        <div>{item.avgCost.toFixed(decimals)}</div>
                        {item.totalCapitalReturned && item.totalCapitalReturned > 0 ? (
                          <div style={{ fontSize: '0.7rem', color: '#fb923c' }}>已扣減資退款</div>
                        ) : null}
                      </td>

                      {/* 最新參考市價（支援編輯、狀態徽章、當日漲跌與鎖定切換） */}
                      <td
                        className="mono"
                        style={{ padding: '14px', textAlign: 'right' }}
                        onClick={(e) => e.stopPropagation()}
                      >
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
                                textAlign: 'right',
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
                        ) : (() => {
                          const isLocked = lockedSymbols.some((s) => s.trim().toUpperCase() === item.symbol.trim().toUpperCase());
                          const quote = quotes[item.symbol];
                          const hasDailyChange = quote && typeof quote.change === 'number' && typeof quote.changePercent === 'number';

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <div
                                  onClick={() => startEditPrice(item.symbol, item.currentPrice)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(30, 41, 59, 0.4)',
                                  }}
                                  title="點擊修改最新現價"
                                >
                                  <span style={{ fontWeight: 600, color: '#ffffff' }}>
                                    {item.currentPrice.toFixed(decimals)}
                                  </span>
                                  <Edit2 size={12} color="var(--text-muted)" />
                                </div>

                                {/* 鎖定/解鎖切換 */}
                                {onToggleLock && (
                                  <button
                                    onClick={() => onToggleLock(item.symbol)}
                                    style={{
                                      background: isLocked ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                      border: isLocked ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                                      borderRadius: '4px',
                                      padding: '2px 4px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                    }}
                                    title={isLocked ? '目前為自訂鎖定價格（點擊解鎖以恢復全自動更新）' : '點擊鎖定自訂價格（避免被自動輪詢覆蓋）'}
                                  >
                                    {isLocked ? <Lock size={12} color="#60a5fa" /> : <Unlock size={12} color="var(--text-muted)" />}
                                  </button>
                                )}

                                {/* 單檔刷新按鈕 */}
                                {onRefreshSymbol && (
                                  <button
                                    onClick={() => onRefreshSymbol(item.symbol, item.market)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '2px 4px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                    }}
                                    title="手動刷新此標的最新市場報價"
                                  >
                                    <RefreshCw size={11} color="var(--text-muted)" />
                                  </button>
                                )}
                              </div>

                              {/* 狀態徽章與當日漲跌 */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem' }}>
                                {isLocked ? (
                                  <span className="badge badge-locked" style={{ padding: '0px 4px', fontSize: '0.62rem' }}>
                                    🔒 鎖定
                                  </span>
                                ) : quote?.status === 'DELAYED' || quote?.status === 'REALTIME' ? (
                                  <span className="badge badge-realtime" style={{ padding: '0px 4px', fontSize: '0.62rem' }}>
                                    🟢 即時
                                  </span>
                                ) : quote?.status === 'PREVIOUS_CLOSE' ? (
                                  <span className="badge badge-prevclose" style={{ padding: '0px 4px', fontSize: '0.62rem' }}>
                                    🟡 昨收
                                  </span>
                                ) : quote?.status === 'CACHED' ? (
                                  <span className="badge badge-cached" style={{ padding: '0px 4px', fontSize: '0.62rem' }}>
                                    ⚠️ 快取
                                  </span>
                                ) : null}

                                {hasDailyChange && (
                                  <span
                                    style={{
                                      color: quote.change! >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
                                      fontWeight: 600,
                                    }}
                                    title={`昨日收盤價: ${quote.previousClose?.toFixed(decimals)}`}
                                  >
                                    {quote.change! >= 0 ? '+' : ''}{quote.change!.toFixed(decimals)} ({quote.changePercent! >= 0 ? '+' : ''}{quote.changePercent!.toFixed(2)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 總成本 */}
                      <td className="mono" style={{ padding: '14px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        <div>{Math.round(item.totalCostBasis).toLocaleString('en-US')}</div>
                        {item.totalCapitalReturned && item.totalCapitalReturned > 0 ? (
                          <div style={{ fontSize: '0.7rem', color: '#fb923c' }}>
                            退還 -{currencyPrefix}{Math.round(item.totalCapitalReturned).toLocaleString()}
                          </div>
                        ) : null}
                      </td>

                      {/* 當前市值 */}
                      <td className="mono" style={{ padding: '14px', textAlign: 'right', fontWeight: 600, color: '#ffffff' }}>
                        {Math.round(item.marketValue).toLocaleString('en-US')}
                      </td>

                      {/* 未實現損益與報酬率 */}
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div
                          className="mono"
                          style={{
                            fontWeight: 700,
                            color: isGain ? 'var(--gain-color)' : 'var(--loss-color)',
                            fontSize: '0.9rem',
                          }}
                        >
                          {isGain ? '+' : ''}
                          {Math.round(item.unrealizedPnL).toLocaleString('en-US')}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isGain ? 'var(--gain-color)' : 'var(--loss-color)',
                            marginTop: '2px',
                          }}
                        >
                          {isGain ? '▲' : '▼'} {Math.abs(item.unrealizedPnLPercent).toFixed(2)}%
                        </div>
                      </td>

                      {/* 累計股息與成本殖利率 YoC */}
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div
                          className="mono"
                          style={{
                            fontWeight: 600,
                            color: item.totalDividends > 0 ? '#fbbf24' : 'var(--text-muted)',
                            fontSize: '0.85rem',
                          }}
                        >
                          {currencyPrefix} {Math.round(item.totalDividends).toLocaleString('en-US')}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: item.totalDividends > 0 ? '#fbbf24' : 'var(--text-muted)',
                            marginTop: '2px',
                          }}
                        >
                          YoC: {item.yieldOnCostPercent > 0 ? `${item.yieldOnCostPercent.toFixed(2)}%` : '-'}
                        </div>
                      </td>

                      {/* 快速加碼 / 平倉操作 */}
                      <td style={{ padding: '14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            className="btn btn-sm"
                            style={{
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              padding: '4px 8px',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
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
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                            }}
                            onClick={() => onQuickTrade(item.symbol, 'SELL')}
                            title="賣出平倉"
                          >
                            賣出
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* 展開之歷史股權歷程時間軸 */}
                    {isExpanded && (
                      <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid rgba(51, 65, 85, 0.3)' }}>
                        <td colSpan={11} style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <Calendar size={14} color="#60a5fa" />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#60a5fa' }}>
                              【{item.symbol} {item.name}】完整交易與公司行動歷史時間軸 ({stockTrades.length} 筆)
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                            {stockTrades.map((st) => (
                              <div
                                key={st.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  background: 'rgba(30, 41, 59, 0.4)',
                                  fontSize: '0.775rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span className="mono" style={{ color: 'var(--text-muted)' }}>
                                    {st.date}
                                  </span>
                                  <span
                                    className={`badge ${
                                      st.type === 'BUY'
                                        ? 'badge-buy'
                                        : st.type === 'SELL'
                                        ? 'badge-sell'
                                        : st.type === 'DIVIDEND'
                                        ? 'badge-dividend'
                                        : st.type === 'STOCK_DIVIDEND'
                                        ? 'badge-stock-div'
                                        : st.type === 'STOCK_SPLIT'
                                        ? 'badge-split'
                                        : 'badge-reduction'
                                    }`}
                                    style={{ padding: '1px 5px', fontSize: '0.65rem' }}
                                  >
                                    {st.type === 'BUY'
                                      ? '買進'
                                      : st.type === 'SELL'
                                      ? '賣出'
                                      : st.type === 'DIVIDEND'
                                      ? '現金股利'
                                      : st.type === 'STOCK_DIVIDEND'
                                      ? '除權配股'
                                      : st.type === 'STOCK_SPLIT'
                                      ? '股票分割'
                                      : st.type === 'CAPITAL_REDUCTION'
                                      ? '減資退款'
                                      : '現金增資'}
                                  </span>
                                  <span>
                                    {st.type === 'STOCK_DIVIDEND' && `配股 +${st.shares} 股`}
                                    {st.type === 'STOCK_SPLIT' && `1 拆 ${st.ratio} 比例分割`}
                                    {st.type === 'CAPITAL_REDUCTION' && `減 ${st.shares} 股 (退還 ${st.cashAmount || 0} 元)`}
                                    {st.type === 'DIVIDEND' && `配發股息 ${st.cashAmount || st.price * st.shares || 0} 元`}
                                    {(st.type === 'BUY' || st.type === 'SELL' || st.type === 'CAPITAL_INCREASE') &&
                                      `${st.shares} 股 @ ${st.currency} ${st.price}`}
                                  </span>
                                </div>
                                <div style={{ color: 'var(--text-muted)' }}>{st.note || '-'}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
