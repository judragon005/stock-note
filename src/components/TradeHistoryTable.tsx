import React, { useState, useMemo, useEffect } from 'react';
import { TradeRecord, TradeType } from '../types/stock';
import { History, Trash2, Edit2, Search, Tag, Sparkles, Wrench, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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

  // 分頁狀態
  const [pageSize, setPageSize] = useState<number | 'ALL'>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

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
    BUY: 1,                 // 買進 / DRIP 股息再投資
    SELL: 2,                // 賣出變現
    DIVIDEND: 3,            // 現金股利入帳
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

  const filteredTrades = useMemo(() => {
    return [...trades]
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
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
  }, [trades, searchTerm, typeFilter]);

  // 當篩選條件改變時，自動重置回第 1 頁
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, pageSize]);

  // 計算分頁衍生數據
  const totalPages = useMemo(() => {
    if (pageSize === 'ALL' || filteredTrades.length === 0) return 1;
    return Math.ceil(filteredTrades.length / Number(pageSize));
  }, [filteredTrades.length, pageSize]);

  const paginatedTrades = useMemo(() => {
    if (pageSize === 'ALL') return filteredTrades;
    const size = Number(pageSize);
    const start = (currentPage - 1) * size;
    return filteredTrades.slice(start, start + size);
  }, [filteredTrades, currentPage, pageSize]);

  const getTypeBadge = (type: TradeType) => {
    switch (type) {
      case 'BUY':
        return <span className="badge badge-buy" style={{ whiteSpace: 'nowrap' }}>買進</span>;
      case 'SELL':
        return <span className="badge badge-sell" style={{ whiteSpace: 'nowrap' }}>賣出</span>;
      case 'DIVIDEND':
        return <span className="badge badge-dividend" style={{ whiteSpace: 'nowrap' }}>現金股利</span>;
      case 'STOCK_DIVIDEND':
        return <span className="badge badge-stock-div" style={{ whiteSpace: 'nowrap' }}>除權配股</span>;
      case 'STOCK_SPLIT':
        return <span className="badge badge-split" style={{ whiteSpace: 'nowrap' }}>股票分割</span>;
      case 'CAPITAL_REDUCTION':
        return <span className="badge badge-reduction" style={{ whiteSpace: 'nowrap' }}>減資退款</span>;
      case 'CAPITAL_INCREASE':
        return <span className="badge badge-increase" style={{ whiteSpace: 'nowrap' }}>現金增資</span>;
      case 'STOCK_MERGER':
        return <span className="badge" style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.4)', whiteSpace: 'nowrap' }}>換股合併</span>;
      case 'PREFERRED_REDEMPTION':
        return <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.4)', whiteSpace: 'nowrap' }}>特別股贖回</span>;
      case 'SPIN_OFF':
        return <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)', whiteSpace: 'nowrap' }}>企業分拆</span>;
      case 'CB_CONVERSION':
        return <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', whiteSpace: 'nowrap' }}>可轉債換股</span>;
      case 'TENDER_OFFER':
        return <span className="badge" style={{ background: 'rgba(251, 146, 60, 0.2)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.4)', whiteSpace: 'nowrap' }}>公開收購</span>;
      default:
        return <span className="badge" style={{ whiteSpace: 'nowrap' }}>{type}</span>;
    }
  };

  return (
    <div className="glass-card" style={{ padding: '18px 20px', overflow: 'hidden', animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* ⚠️ 歷史賣出紀錄稅費未拆分警示與一鍵修復橫幅 */}
      {needsRepairCount > 0 && onRepairTaxAndFee && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
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
                padding: '7px',
                borderRadius: '9px',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fef3c7', marginBottom: '2px' }}>
                偵測到 {needsRepairCount} 筆歷史賣出紀錄「稅費未拆分」
              </div>
              <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
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
              fontWeight: 800,
              padding: '6px 14px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
            }}
          >
            <Wrench size={14} /> 一鍵智慧拆分修復 (損益 100% 恆等)
          </button>
        </div>
      )}

      {/* 頂部控制列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(59, 130, 246, 0.35)',
              }}
            >
              <History size={16} color="#60a5fa" />
            </div>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>交易與公司行動明細歷程</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '0.74rem',
                padding: '2px 8px',
                borderRadius: '6px',
                background: isGlobalFiltered ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: isGlobalFiltered ? '#fbbf24' : '#60a5fa',
                fontWeight: 700,
                border: isGlobalFiltered ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(59, 130, 246, 0.35)',
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
                  fontSize: '0.7rem',
                  padding: '2px 7px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontWeight: 600,
                }}
              >
                🔄 顯示全部 {totalCount} 筆
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(19, 29, 49, 0.8)',
              padding: '3px 8px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <Search size={13} color="#64748b" />
            <input
              type="text"
              placeholder="搜尋代碼、名稱或標籤..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.76rem',
                outline: 'none',
                width: '135px',
              }}
            />
          </div>

          {/* Type Filter */}
          <div
            style={{
              display: 'flex',
              gap: '3px',
              background: 'rgba(19, 29, 49, 0.8)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              flexWrap: 'wrap',
            }}
          >
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
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: typeFilter === item.key ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'transparent',
                  color: typeFilter === item.key ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.72rem',
                  fontWeight: typeFilter === item.key ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: typeFilter === item.key ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
                  whiteSpace: 'nowrap',
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
            padding: '32px 20px',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          未找到符合條件的交易或公司行動紀錄。
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(19, 29, 49, 0.5)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px 10px', fontWeight: 600, width: '105px', minWidth: '105px', whiteSpace: 'nowrap' }}>交易日期</th>
                <th style={{ padding: '8px 8px', fontWeight: 600, width: '85px', minWidth: '85px', whiteSpace: 'nowrap' }}>類別</th>
                <th style={{ padding: '8px 10px', fontWeight: 600, minWidth: '140px', whiteSpace: 'nowrap' }}>標的代碼 / 名稱</th>
                <th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'right', width: '100px', minWidth: '100px', whiteSpace: 'nowrap' }}>異動 / 成交股數</th>
                <th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'right', width: '90px', minWidth: '90px', whiteSpace: 'nowrap' }}>單價 / 比例</th>
                <th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'right', width: '65px', minWidth: '65px', whiteSpace: 'nowrap' }}>手續費</th>
                <th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'right', width: '65px', minWidth: '65px', whiteSpace: 'nowrap' }}>稅費</th>
                <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right', width: '130px', minWidth: '130px', whiteSpace: 'nowrap' }}>結算 / 退款金額</th>
                <th style={{ padding: '8px 10px', fontWeight: 600, minWidth: '160px', whiteSpace: 'nowrap' }}>策略標籤 / 備註</th>
                <th style={{ padding: '8px 6px', fontWeight: 600, textAlign: 'center', width: '55px', minWidth: '55px', whiteSpace: 'nowrap' }}>操作</th>
              </tr>
            </thead>
            <tbody className="mono">
              {paginatedTrades.map((t) => {
                const isBuy = t.type === 'BUY';
                const isSell = t.type === 'SELL';
                const isDiv = t.type === 'DIVIDEND';
                const isStockDiv = t.type === 'STOCK_DIVIDEND';
                const isSplit = t.type === 'STOCK_SPLIT';
                const isReduction = t.type === 'CAPITAL_REDUCTION';
                const isIncrease = t.type === 'CAPITAL_INCREASE';
                const isUS = t.currency === 'USD';
                const decimals = isUS ? (isDiv ? 4 : 2) : (t.price < 50 ? 2 : 1);

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
                  let divDisplay: number;
                  if (isUS) {
                    divDisplay = t.cashAmount !== undefined
                      ? t.cashAmount
                      : (t.shares > 0 && t.price > 0 ? (t.shares * t.price) : (t.price || 0));
                  } else {
                    divDisplay = t.cashAmount !== undefined && t.cashAmount > 0
                      ? t.cashAmount
                      : (t.shares > 0 && t.price > 0 ? (t.shares * t.price) - (t.tax || 0) - (t.fee || 0) : (t.price || 0));
                  }
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
                    style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.25)', transition: 'background 0.2s' }}
                  >
                    {/* 日期 (強制單行) */}
                    <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {t.date}
                    </td>

                    {/* 類別 (強制單行) */}
                    <td style={{ padding: '8px 8px', whiteSpace: 'nowrap' }}>
                      {getTypeBadge(t.type)}
                    </td>

                    {/* 代碼與名稱 */}
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>
                          {t.symbol}
                        </span>
                        <span className={`badge ${t.market === 'TW' ? 'badge-tw' : 'badge-us'}`} style={{ padding: '1px 4px', fontSize: '0.62rem', whiteSpace: 'nowrap' }}>
                          {t.market}
                        </span>
                      </div>
                      {t.name && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          {t.name}
                        </div>
                      )}
                    </td>

                    {/* 成交 / 異動股數 (強制單行) */}
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                      {isReduction ? `-${t.shares.toLocaleString('en-US', { maximumFractionDigits: t.market === 'TW' ? 0 : 4 })}` :
                       isStockDiv ? `+${t.shares.toLocaleString('en-US', { maximumFractionDigits: t.market === 'TW' ? 0 : 4 })}` :
                       isSplit ? `1 拆 ${t.ratio || 1}` :
                       t.shares > 0 ? t.shares.toLocaleString('en-US', { maximumFractionDigits: t.market === 'TW' ? 0 : 4 }) : '-'}
                    </td>

                    {/* 成交單價 / 比例 (強制單行) */}
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {isSplit ? `${t.ratio}x` :
                       isStockDiv ? (t.ratio ? `配股率 ${t.ratio}` : '-') :
                       isReduction ? (t.price > 0 ? `退 ${t.price} 元` : '虧損減資') :
                       t.price > 0 ? `${t.currency} ${t.price.toFixed(decimals)}` : '-'}
                    </td>

                    {/* 手續費 (強制單行) */}
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {t.fee > 0 ? t.fee.toFixed(isUS ? 2 : 0) : '-'}
                    </td>

                    {/* 稅費 (強制單行) */}
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {t.tax > 0 ? t.tax.toFixed(isUS ? 2 : 0) : '-'}
                    </td>

                    {/* 結算總額 (強制單行) */}
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: amountColor,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {totalAmountDisplay}
                    </td>

                    {/* 標籤與備註 */}
                    <td style={{ padding: '8px 10px' }}>
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
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '0.62rem',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Tag size={9} /> {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {t.note && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'sans-serif', maxWidth: '320px', lineHeight: 1.3 }}>
                          {t.note}
                        </div>
                      )}
                    </td>

                    {/* 操作按鈕 (編輯 / 刪除) */}
                    <td style={{ padding: '8px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        {onEditTrade && (
                          <button
                            onClick={() => onEditTrade(t)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '3px',
                              borderRadius: '4px',
                              transition: 'color 0.2s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                            title="編輯此筆交易"
                          >
                            <Edit2 size={13} />
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
                            padding: '3px',
                            borderRadius: '4px',
                            transition: 'color 0.2s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--loss-color)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                          title="刪除此筆交易"
                        >
                          <Trash2 size={13} />
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

      {/* 底部現代毛玻璃分頁控制器 (Pagination Controls) */}
      {filteredTrades.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(51, 65, 85, 0.4)',
            fontSize: '0.76rem',
            color: 'var(--text-secondary)',
          }}
        >
          {/* 左側：每頁筆數切換膠囊 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#94a3b8' }}>每頁顯示:</span>
            <div style={{ display: 'flex', gap: '3px', background: 'rgba(19, 29, 49, 0.8)', padding: '2px', borderRadius: '7px', border: '1px solid var(--border-color)' }}>
              {([25, 50, 100, 'ALL'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPageSize(size)}
                  style={{
                    padding: '2px 7px',
                    borderRadius: '5px',
                    border: 'none',
                    background: pageSize === size ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'transparent',
                    color: pageSize === size ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '0.72rem',
                    fontWeight: pageSize === size ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {size === 'ALL' ? '全部' : `${size} 筆`}
                </button>
              ))}
            </div>
            <span style={{ color: '#64748b' }}>
              (顯示 {pageSize === 'ALL' ? `1 ~ ${filteredTrades.length}` : `${(currentPage - 1) * Number(pageSize) + 1} ~ ${Math.min(currentPage * Number(pageSize), filteredTrades.length)}`} / 共 {filteredTrades.length} 筆)
            </span>
          </div>

          {/* 右側：頁碼導覽按鈕 */}
          {pageSize !== 'ALL' && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{ padding: '3px 6px', opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                title="第一頁"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '3px 6px', opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                title="上一頁"
              >
                <ChevronLeft size={14} />
              </button>

              <span className="mono" style={{ padding: '2px 8px', fontWeight: 700, color: '#f8fafc' }}>
                第 {currentPage} / {totalPages} 頁
              </span>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '3px 6px', opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                title="下一頁"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{ padding: '3px 6px', opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                title="最後一頁"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
