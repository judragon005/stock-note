import React, { useState, useMemo } from 'react';
import { TradeRecord, TradeType } from '../types/stock';
import { History, Trash2, Edit2, Search, Tag, Sparkles, Wrench } from 'lucide-react';

interface TradeHistoryTableProps {
  trades: TradeRecord[];
  totalTradesCount?: number;
  onResetGlobalFilters?: () => void;
  onDeleteTrade: (id: string) => void;
  onRepairTaxAndFee?: () => void;
  onEditTrade?: (trade: TradeRecord) => void;
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({
  trades,
  totalTradesCount,
  onResetGlobalFilters,
  onDeleteTrade,
  onRepairTaxAndFee,
  onEditTrade,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'DIVIDEND' | 'CORPORATE'>('ALL');

  const totalCount = totalTradesCount ?? trades.length;
  const isGlobalFiltered = totalCount > trades.length;

  const needsRepairCount = useMemo(() => {
    return trades.filter((t) => {
      if (t.type !== 'SELL' || (t.market !== 'TW' && t.market) || t.shares <= 0 || t.price <= 0) return false;
      if (t.tax && t.tax > 0) return false;
      const cleanSym = (t.symbol || '').trim().toUpperCase();
      if (cleanSym.endsWith('B')) return false; // 債券型 ETF 0% 免稅屬合法正常狀態
      return true;
    }).length;
  }, [trades]);

  // 從新到舊 (DESC) 時間軸下之同日交易優先序：同日越晚發生的（最新）排在越上方
  const TRADE_TYPE_SAME_DAY_PRIORITY_DESC: Record<string, number> = {
    BUY: 1,                 // 買進 / DRIP 股息再投資 (後發生，最新，排上方)
    SELL: 2,                // 賣出變現 (盤中發生)
    DIVIDEND: 3,            // 現金股利入帳 (盤前/當日先入帳，排下方)
    CAPITAL_INCREASE: 4,
    CAPITAL_REDUCTION: 5,
    STOCK_DIVIDEND: 6,
    STOCK_SPLIT: 7,
    STOCK_MERGER: 8,
    PREFERRED_REDEMPTION: 9,
    SPIN_OFF: 10,
    CB_CONVERSION: 11,
    TENDER_OFFER: 12,
  };

  const filteredTrades = [...trades]
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      // 從新到舊：同日最新發生者 (如 DRIP 買進) 排在上方，先發生者 (如 股息入帳) 排在下方
      const priorityA = TRADE_TYPE_SAME_DAY_PRIORITY_DESC[a.type] || 50;
      const priorityB = TRADE_TYPE_SAME_DAY_PRIORITY_DESC[b.type] || 50;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return b.createdAt - a.createdAt;
    })
    .filter((t) => {
      const matchSearch =
        t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.name && t.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (t.note && t.note.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchType = true;
      if (typeFilter === 'ALL') {
        matchType = true;
      } else if (typeFilter === 'CORPORATE') {
        matchType =
          t.type === 'STOCK_DIVIDEND' ||
          t.type === 'STOCK_SPLIT' ||
          t.type === 'CAPITAL_REDUCTION' ||
          t.type === 'CAPITAL_INCREASE' ||
          t.type === 'STOCK_MERGER' ||
          t.type === 'PREFERRED_REDEMPTION' ||
          t.type === 'SPIN_OFF' ||
          t.type === 'CB_CONVERSION' ||
          t.type === 'TENDER_OFFER';
      } else {
        matchType = t.type === typeFilter;
      }

      return matchSearch && matchType;
    });

  const getTypeBadge = (type: TradeType) => {
    switch (type) {
      case 'BUY':
        return <span className="badge badge-buy">買進</span>;
      case 'SELL':
        return <span className="badge badge-sell">賣出</span>;
      case 'DIVIDEND':
        return <span className="badge badge-dividend">現金股利</span>;
      case 'STOCK_DIVIDEND':
        return <span className="badge badge-stock-div">除權配股</span>;
      case 'STOCK_SPLIT':
        return <span className="badge badge-split">股票分割</span>;
      case 'CAPITAL_REDUCTION':
        return <span className="badge badge-reduction">減資退款</span>;
      case 'CAPITAL_INCREASE':
        return <span className="badge badge-increase">現金增資</span>;
      case 'STOCK_MERGER':
        return <span className="badge" style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.4)' }}>換股合併</span>;
      case 'PREFERRED_REDEMPTION':
        return <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.4)' }}>特別股贖回</span>;
      case 'SPIN_OFF':
        return <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}>企業分拆</span>;
      case 'CB_CONVERSION':
        return <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)' }}>可轉債換股</span>;
      case 'TENDER_OFFER':
        return <span className="badge" style={{ background: 'rgba(251, 146, 60, 0.2)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.4)' }}>公開收購</span>;
      default:
        return <span className="badge">{type}</span>;
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
      {/* ⚠️ 歷史賣出紀錄稅費未拆分警示與一鍵修復橫幅 */}
      {needsRepairCount > 0 && onRepairTaxAndFee && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fef3c7', marginBottom: '2px' }}>
                偵測到 {needsRepairCount} 筆歷史賣出紀錄「稅費未拆分」
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                歷史匯入資料因將 0.3% 證交稅誤併入手續費，導致累計已繳證交稅顯示為 0 且折讓全數漏計。
              </div>
            </div>
          </div>

          <button
            onClick={onRepairTaxAndFee}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              padding: '8px 16px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
            }}
          >
            <Wrench size={16} /> 一鍵智慧拆分修復 (損益 100% 恆等)
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="#3b82f6" />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>交易與公司行動明細歷程</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '0.8rem',
                padding: '2px 8px',
                borderRadius: '6px',
                background: isGlobalFiltered ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: isGlobalFiltered ? '#f59e0b' : '#60a5fa',
                fontWeight: 600,
                border: isGlobalFiltered ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              {isGlobalFiltered
                ? `已篩選顯示 ${filteredTrades.length} 筆 / 全量共 ${totalCount} 筆`
                : `共 ${filteredTrades.length} 筆交易`}
            </span>

            {isGlobalFiltered && onResetGlobalFilters && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={onResetGlobalFilters}
                title="清除頂部市場與帳戶篩選，展示全量交易"
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                🔄 顯示全部 {totalCount} 筆
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(30, 41, 59, 0.6)',
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
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
                width: '140px',
              }}
            />
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: '全部' },
              { key: 'BUY', label: '買進' },
              { key: 'SELL', label: '賣出' },
              { key: 'DIVIDEND', label: '股息' },
              { key: 'CORPORATE', label: '🏢 公司行動' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTypeFilter(item.key as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: typeFilter === item.key ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.4)',
                  color: typeFilter === item.key ? '#60a5fa' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: typeFilter === item.key ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredTrades.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '30px 20px',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
          }}
        >
          未找到符合條件的交易或公司行動紀錄。
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>交易日期</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>類別</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>標的代碼 / 名稱</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>異動 / 成交股數</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>單價 / 比例</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>手續費</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>稅費</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>結算 / 退款金額</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>策略標籤 / 備註</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((t) => {
                const isBuy = t.type === 'BUY';
                const isSell = t.type === 'SELL';
                const isDiv = t.type === 'DIVIDEND';
                const isStockDiv = t.type === 'STOCK_DIVIDEND';
                const isSplit = t.type === 'STOCK_SPLIT';
                const isReduction = t.type === 'CAPITAL_REDUCTION';
                const isIncrease = t.type === 'CAPITAL_INCREASE';
                const isUS = t.currency === 'USD';
                const decimals = isUS ? (isDiv ? 4 : 2) : (t.price < 50 ? 2 : 1);

                // 計算結算與呈現金額
                let totalAmountDisplay = '';
                let amountColor = '#fff';

                const formatAmountVal = (val: number) => {
                  return isUS
                    ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : Math.round(val).toLocaleString('en-US');
                };

                if (isBuy) {
                  const net = (t.shares * t.price) + (t.fee || 0) + (t.tax || 0);
                  totalAmountDisplay = `-${t.currency} ${formatAmountVal(net)}`;
                  amountColor = 'var(--loss-color)';
                } else if (isSell) {
                  const net = (t.shares * t.price) - (t.fee || 0) - (t.tax || 0);
                  totalAmountDisplay = `+${t.currency} ${formatAmountVal(net)}`;
                  amountColor = 'var(--gain-color)';
                } else if (isDiv) {
                  // 美股現金股利以毛額 (Gross) 呈現，搭配獨立之稅費欄位以對齊券商 DOI/JRN 標準
                  const gross = t.cashAmount !== undefined
                    ? t.cashAmount
                    : (t.shares > 0 && t.price > 0 ? (t.shares * t.price) : (t.price || 0));
                  const divDisplay = isUS ? gross : (gross - (t.tax || 0) - (t.fee || 0));
                  totalAmountDisplay = `+${t.currency} ${formatAmountVal(divDisplay)}`;
                  amountColor = '#fbbf24';
                } else if (isReduction) {
                  const ref = t.cashAmount !== undefined ? t.cashAmount : (t.price > 0 ? t.price * t.shares : 0);
                  totalAmountDisplay = ref > 0 ? `+${t.currency} ${formatAmountVal(ref)} (退款)` : '0 (虧損減資)';
                  amountColor = ref > 0 ? '#fb923c' : 'var(--text-muted)';
                } else if (isIncrease) {
                  const cost = (t.shares * t.price) + (t.fee || 0) + (t.tax || 0);
                  totalAmountDisplay = `-${t.currency} ${formatAmountVal(cost)}`;
                  amountColor = '#a5b4fc';
                } else if (isStockDiv) {
                  totalAmountDisplay = `+${t.shares} 股 (配股)`;
                  amountColor = '#c084fc';
                } else if (isSplit) {
                  totalAmountDisplay = `比例 ${t.ratio || 1}x`;
                  amountColor = '#38bdf8';
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
                      {getTypeBadge(t.type)}
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

                    {/* 成交 / 異動股數 */}
                    <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                      {isReduction ? `-${t.shares.toLocaleString('en-US', { maximumFractionDigits: t.market === 'TW' ? 0 : 4 })}` :
                       isStockDiv ? `+${t.shares.toLocaleString('en-US', { maximumFractionDigits: t.market === 'TW' ? 0 : 4 })}` :
                       isSplit ? `1 拆 ${t.ratio || 1}` :
                       t.shares > 0 ? t.shares.toLocaleString('en-US', { maximumFractionDigits: t.market === 'TW' ? 0 : 4 }) : '-'}
                    </td>

                    {/* 成交單價 / 比例 */}
                    <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {isSplit ? `${t.ratio}x` :
                       isStockDiv ? (t.ratio ? `配股率 ${t.ratio}` : '-') :
                       isReduction ? (t.price > 0 ? `退 ${t.price} 元` : '虧損減資') :
                       t.price > 0 ? `${t.currency} ${t.price.toFixed(decimals)}` : '-'}
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
                    <td
                      className="mono"
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: amountColor,
                      }}
                    >
                      {totalAmountDisplay}
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
                                fontSize: '0.65rem',
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

                    {/* 操作按鈕 (編輯 / 刪除) */}
                    <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {onEditTrade && (
                          <button
                            onClick={() => onEditTrade(t)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              transition: 'color 0.2s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                            title="編輯此筆交易"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`確定要刪除 ${t.date} ${t.symbol} 的 ${t.type} 紀錄嗎？`)) {
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
                            transition: 'color 0.2s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--loss-color)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                          title="刪除此筆交易"
                        >
                          <Trash2 size={14} />
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
