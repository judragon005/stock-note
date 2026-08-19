import React, { useState } from 'react';
import { TradeRecord } from '../types/stock';
import { History, Trash2, Search, Tag } from 'lucide-react';

interface TradeHistoryTableProps {
  trades: TradeRecord[];
  onDeleteTrade: (id: string) => void;
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({ trades, onDeleteTrade }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'DIVIDEND'>('ALL');

  const filteredTrades = [...trades]
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.createdAt - a.createdAt;
    })
    .filter((t) => {
      const matchSearch =
        t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.name && t.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (t.note && t.note.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchType = typeFilter === 'ALL' || t.type === typeFilter;
      return matchSearch && matchType;
    });

  return (
    <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={20} color="#3b82f6" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>交易明細歷程</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>({filteredTrades.length} 筆)</span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(30, 41, 59, 0.6)',
            padding: '4px 10px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="搜尋代碼、名稱或標籤..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.8rem',
                outline: 'none',
                width: '140px'
              }}
            />
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['ALL', 'BUY', 'SELL', 'DIVIDEND'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: typeFilter === t ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.4)',
                  color: typeFilter === t ? '#60a5fa' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: typeFilter === t ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                {t === 'ALL' ? '全部' : t === 'BUY' ? '買進' : t === 'SELL' ? '賣出' : '配息'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredTrades.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '30px 20px',
          color: 'var(--text-muted)',
          fontSize: '0.875rem'
        }}>
          未找到符合條件的交易紀錄。
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>交易日期</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>類別</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>標的代碼 / 名稱</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>成交股數</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>成交單價</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>交易手續費</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>證交稅 / 扣繳</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>結算總額</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>策略標籤 / 備註</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>刪除</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((t) => {
                const isBuy = t.type === 'BUY';
                const isSell = t.type === 'SELL';
                const isUS = t.currency === 'USD';
                const decimals = isUS ? 2 : (t.price < 50 ? 2 : 1);

                // 計算結算總額
                let totalAmount = 0;
                if (isBuy) {
                  totalAmount = (t.shares * t.price) + (t.fee || 0) + (t.tax || 0);
                } else if (isSell) {
                  totalAmount = (t.shares * t.price) - (t.fee || 0) - (t.tax || 0);
                } else {
                  totalAmount = (t.shares > 0 && t.price > 0) ? (t.shares * t.price) - (t.tax || 0) - (t.fee || 0) : (t.fee || 0);
                }

                return (
                  <tr
                    key={t.id}
                    style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.2)' }}
                  >
                    {/* 日期 */}
                    <td className="mono" style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                      {t.date}
                    </td>

                    {/* 類別 */}
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge ${isBuy ? 'badge-buy' : isSell ? 'badge-sell' : 'badge-dividend'}`}>
                        {isBuy ? '買進' : isSell ? '賣出' : '股息'}
                      </span>
                    </td>

                    {/* 代碼與名稱 */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>
                          {t.symbol}
                        </span>
                        <span className={`badge ${t.market === 'TW' ? 'badge-tw' : 'badge-us'}`} style={{ padding: '2px 4px', fontSize: '0.65rem' }}>
                          {t.market}
                        </span>
                      </div>
                      {t.name && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.name}</div>
                      )}
                    </td>

                    {/* 成交股數 */}
                    <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                      {t.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                    </td>

                    {/* 成交單價 */}
                    <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {t.currency} {t.price.toFixed(decimals)}
                    </td>

                    {/* 手續費 */}
                    <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                      {t.fee > 0 ? t.fee.toFixed(isUS ? 2 : 0) : '-'}
                    </td>

                    {/* 稅費 */}
                    <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                      {t.tax > 0 ? t.tax.toFixed(isUS ? 2 : 0) : '-'}
                    </td>

                    {/* 結算總額 */}
                    <td className="mono" style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: isBuy ? 'var(--loss-color)' : isSell ? 'var(--gain-color)' : '#fbbf24'
                    }}>
                      {isBuy ? '-' : '+'}{t.currency} {Math.round(totalAmount).toLocaleString('en-US')}
                    </td>

                    {/* 標籤與備註 */}
                    <td style={{ padding: '10px 12px', maxWidth: '200px' }}>
                      {t.tags && t.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '2px' }}>
                          {t.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                background: 'rgba(51, 65, 85, 0.4)',
                                color: '#94a3b8',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.65rem'
                              }}
                            >
                              <Tag size={10} /> {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {t.note && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.note}
                        </div>
                      )}
                    </td>

                    {/* 刪除按鈕 */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          if (confirm(`確定要刪除 ${t.date} ${t.symbol} 的 ${t.type} 交易紀錄嗎？`)) {
                            onDeleteTrade(t.id);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--loss-color)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                        title="刪除此筆交易"
                      >
                        <Trash2 size={14} />
                      </button>
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
