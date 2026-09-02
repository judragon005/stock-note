import React, { useState, useEffect, useMemo } from 'react';
import { TradeRecord, HoldingPosition } from '../types/stock';
import { AccountingMethod, ACCOUNTING_METHOD_LABELS } from '../types/lot';
import { processLots, calculateTaxComparison } from '../engine/lotEngine';
import { Tooltip } from './common/Tooltip';
import { Package, History, Lightbulb, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';

interface LotsBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: HoldingPosition;
  trades: TradeRecord[];
  currentMethod: AccountingMethod;
  onMethodChange?: (method: AccountingMethod) => void;
}

export type SortField = 'buyDate' | 'remainingShares' | 'buyPrice' | 'unitCost' | 'unrealizedPnL' | 'holdingDays';
export type SortDirection = 'asc' | 'desc';

const fmtNum = (num: number, decimals: number = 0) => {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const fmtPct = (pct: number) => {
  return `${pct >= 0 ? '+' : ''}${(pct || 0).toFixed(2)}%`;
};

export const LotsBreakdownModal: React.FC<LotsBreakdownModalProps> = ({
  isOpen,
  onClose,
  holding,
  trades,
  currentMethod,
  onMethodChange,
}) => {
  const [selectedTab, setSelectedTab] = useState<'openLots' | 'disposals' | 'taxComparison'>('openLots');
  const [sortField, setSortField] = useState<SortField>('buyDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // 鍵盤 Escape 鍵關閉監聽
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const symbolTrades = useMemo(() => {
    return trades.filter(
      (t) => t.symbol.trim().toUpperCase() === holding.symbol.trim().toUpperCase()
    );
  }, [trades, holding.symbol]);

  const lotResult = useMemo(() => {
    return processLots(symbolTrades, { accountingMethod: currentMethod });
  }, [symbolTrades, currentMethod]);

  const openLots = useMemo(() => {
    return lotResult.openLots.filter((l) => l.symbol === holding.symbol);
  }, [lotResult, holding.symbol]);

  const disposals = useMemo(() => {
    return lotResult.disposals.filter((d) => d.symbol === holding.symbol);
  }, [lotResult, holding.symbol]);

  const taxComparison = useMemo(() => {
    const pricesMap = { [holding.symbol]: holding.currentPrice };
    return calculateTaxComparison(symbolTrades, pricesMap);
  }, [symbolTrades, holding.symbol, holding.currentPrice]);

  // 可用年份提取
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(openLots.map((l) => l.buyDate.slice(0, 4))));
    return years.sort((a, b) => b.localeCompare(a));
  }, [openLots]);

  // 富化批次數據（含未實現損益、持有天數）並支援排序與年份過濾
  const processedOpenLots = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(`${todayStr}T00:00:00Z`);

    const enriched = openLots.map((lot) => {
      const curPrice = holding.currentPrice;
      const marketVal = lot.remainingShares * curPrice;
      const unrealizedPnL = marketVal - lot.totalCostBasis;
      const unrealizedPnLPercent = lot.totalCostBasis > 0 ? (unrealizedPnL / lot.totalCostBasis) * 100 : 0;

      const buyDate = new Date(`${lot.buyDate}T00:00:00Z`);
      const holdingDays = Math.max(0, Math.round((today.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24)));
      const isLongTerm = holdingDays >= 365;

      return {
        ...lot,
        marketVal,
        unrealizedPnL,
        unrealizedPnLPercent,
        holdingDays,
        isLongTerm,
      };
    });

    // 年份過濾
    const filtered = selectedYear === 'ALL' ? enriched : enriched.filter((l) => l.buyDate.startsWith(selectedYear));

    // 排序
    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'buyDate') {
        cmp = a.buyDate.localeCompare(b.buyDate);
      } else {
        cmp = (a[sortField] as number) - (b[sortField] as number);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [openLots, holding.currentPrice, selectedYear, sortField, sortDirection]);

  if (!isOpen) return null;

  const currencySymbol = holding.currency === 'USD' ? '$' : 'NT$';

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ opacity: 0.35, marginLeft: 4 }} />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} style={{ color: 'var(--primary-color, #10b981)', marginLeft: 4 }} />
    ) : (
      <ArrowDown size={12} style={{ color: 'var(--primary-color, #10b981)', marginLeft: 4 }} />
    );
  };

  // 最佳節稅模式判定 (在 FIFO, LIFO, HIFO 中比較已實現獲利最低者)
  const bestMethod = (['FIFO', 'LIFO', 'HIFO'] as AccountingMethod[]).reduce((best, curr) => {
    return taxComparison[curr].totalRealizedPnL < taxComparison[best].totalRealizedPnL ? curr : best;
  }, 'HIFO' as AccountingMethod);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        className="glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-card, #0f172a)',
          border: '1px solid var(--border-color, rgba(51, 65, 85, 0.5))',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          color: 'var(--text-primary, #f8fafc)',
        }}
      >
        {/* 標頭 Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-color, rgba(51, 65, 85, 0.5))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={22} color="#3b82f6" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  {holding.symbol} {holding.name}
                </h2>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    fontWeight: 600,
                  }}
                >
                  {holding.market === 'TW' ? '台股' : '美股'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', margin: 0 }}>
                持股多批次會計明細與稅務歸因分析 (Lot-based Accounting)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* 會計模式切換 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--bg-input, #1e293b)',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, rgba(51, 65, 85, 0.5))',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>會計方法:</span>
              <select
                value={currentMethod}
                onChange={(e) => onMethodChange?.(e.target.value as AccountingMethod)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--primary-color, #10b981)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {(Object.keys(ACCOUNTING_METHOD_LABELS) as AccountingMethod[]).map((m) => (
                  <option key={m} value={m} style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
                    {ACCOUNTING_METHOD_LABELS[m].shortName}
                  </option>
                ))}
              </select>
              <Tooltip content={ACCOUNTING_METHOD_LABELS[currentMethod].tooltip} position="bottom" align="right">
                <span style={{ fontSize: '0.75rem', cursor: 'help', opacity: 0.8 }}>ℹ️</span>
              </Tooltip>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary, #94a3b8)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 頂部 4 格資產指標看板 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            padding: '16px 24px',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            borderBottom: '1px solid var(--border-color, rgba(51, 65, 85, 0.5))',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(51, 65, 85, 0.4)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>在庫總股數</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {fmtNum(holding.shares)} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>股</span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(51, 65, 85, 0.4)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>總成本基準</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {currencySymbol}{fmtNum(holding.totalCostBasis)}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(51, 65, 85, 0.4)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>參考現價</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {currencySymbol}{fmtNum(holding.currentPrice, 2)}
            </div>
          </div>

          <div
            style={{
              backgroundColor: holding.unrealizedPnL >= 0 ? 'var(--gain-bg, rgba(239, 68, 68, 0.12))' : 'var(--loss-bg, rgba(16, 185, 129, 0.12))',
              padding: '10px 14px',
              borderRadius: '10px',
              border: `1px solid ${holding.unrealizedPnL >= 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>未實現損益</div>
            <div
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: holding.unrealizedPnL >= 0 ? 'var(--gain-color, #ef4444)' : 'var(--loss-color, #10b981)',
                marginTop: '2px',
              }}
            >
              {holding.unrealizedPnL >= 0 ? '+' : ''}{currencySymbol}{fmtNum(holding.unrealizedPnL)}{' '}
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>({fmtPct(holding.unrealizedPnLPercent)})</span>
            </div>
          </div>
        </div>

        {/* 標籤頁籤切換 Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color, rgba(51, 65, 85, 0.5))',
            padding: '0 24px',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setSelectedTab('openLots')}
            style={{
              padding: '12px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: selectedTab === 'openLots' ? '2px solid var(--primary-color, #10b981)' : '2px solid transparent',
              color: selectedTab === 'openLots' ? 'var(--primary-color, #10b981)' : 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <Package size={15} />
            <span>在庫未沖銷批次</span>
            <span
              style={{
                padding: '2px 6px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(51, 65, 85, 0.6)',
                fontSize: '0.7rem',
                color: 'var(--text-primary, #f8fafc)',
              }}
            >
              {openLots.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedTab('disposals')}
            style={{
              padding: '12px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: selectedTab === 'disposals' ? '2px solid var(--primary-color, #10b981)' : '2px solid transparent',
              color: selectedTab === 'disposals' ? 'var(--primary-color, #10b981)' : 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <History size={15} />
            <span>歷史賣出沖銷歸因</span>
            <span
              style={{
                padding: '2px 6px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(51, 65, 85, 0.6)',
                fontSize: '0.7rem',
                color: 'var(--text-primary, #f8fafc)',
              }}
            >
              {disposals.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedTab('taxComparison')}
            style={{
              padding: '12px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: selectedTab === 'taxComparison' ? '2px solid #f59e0b' : '2px solid transparent',
              color: selectedTab === 'taxComparison' ? '#f59e0b' : 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <Lightbulb size={15} color={selectedTab === 'taxComparison' ? '#f59e0b' : '#94a3b8'} />
            <span>💡 節稅沖銷對照 (Tax Comparison)</span>
          </button>
        </div>

        {/* 內容區 Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. 在庫未沖銷批次頁籤 */}
          {selectedTab === 'openLots' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 年份快速過濾條 */}
              {availableYears.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>年份篩選:</span>
                  <button
                    onClick={() => setSelectedYear('ALL')}
                    style={{
                      padding: '3px 10px',
                      fontSize: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: selectedYear === 'ALL' ? 'var(--primary-color, #10b981)' : 'rgba(51, 65, 85, 0.6)',
                      backgroundColor: selectedYear === 'ALL' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      color: selectedYear === 'ALL' ? 'var(--primary-color, #10b981)' : 'var(--text-secondary, #94a3b8)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    全部 ({openLots.length})
                  </button>
                  {availableYears.map((yr) => {
                    const count = openLots.filter((l) => l.buyDate.startsWith(yr)).length;
                    return (
                      <button
                        key={yr}
                        onClick={() => setSelectedYear(yr)}
                        style={{
                          padding: '3px 10px',
                          fontSize: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: selectedYear === yr ? 'var(--primary-color, #10b981)' : 'rgba(51, 65, 85, 0.6)',
                          backgroundColor: selectedYear === yr ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                          color: selectedYear === yr ? 'var(--primary-color, #10b981)' : 'var(--text-secondary, #94a3b8)',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {yr} 年 ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {processedOpenLots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>
                  目前無符合條件之在庫批次
                </div>
              ) : (
                <div
                  style={{
                    border: '1px solid var(--border-color, rgba(51, 65, 85, 0.5))',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr
                        style={{
                          backgroundColor: 'rgba(30, 41, 59, 0.8)',
                          borderBottom: '1px solid var(--border-color, rgba(51, 65, 85, 0.5))',
                          color: 'var(--text-secondary, #94a3b8)',
                        }}
                      >
                        <th
                          onClick={() => handleSortToggle('buyDate')}
                          style={{ padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span>買進日期</span>
                            {renderSortIndicator('buyDate')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSortToggle('remainingShares')}
                          style={{ padding: '10px 14px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <span>剩餘股數</span>
                            {renderSortIndicator('remainingShares')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSortToggle('buyPrice')}
                          style={{ padding: '10px 14px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <span>買入單價</span>
                            {renderSortIndicator('buyPrice')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSortToggle('unitCost')}
                          style={{ padding: '10px 14px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <span>單股成本(含費)</span>
                            {renderSortIndicator('unitCost')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSortToggle('unrealizedPnL')}
                          style={{ padding: '10px 14px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <span>未實現損益</span>
                            {renderSortIndicator('unrealizedPnL')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSortToggle('holdingDays')}
                          style={{ padding: '10px 14px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span>稅務持有期</span>
                            {renderSortIndicator('holdingDays')}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody style={{ fontFamily: 'var(--font-mono)' }}>
                      {processedOpenLots.map((lot, idx) => (
                        <tr
                          key={lot.id}
                          style={{
                            borderBottom: '1px solid rgba(51, 65, 85, 0.25)',
                            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(30, 41, 59, 0.25)',
                            transition: 'background 0.15s',
                          }}
                        >
                          <td style={{ padding: '10px 14px', color: 'var(--text-primary, #f8fafc)', fontFamily: 'inherit' }}>
                            {lot.buyDate}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-primary, #f8fafc)' }}>
                            {fmtNum(lot.remainingShares)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary, #94a3b8)' }}>
                            {currencySymbol}{fmtNum(lot.buyPrice, 2)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                            {currencySymbol}{fmtNum(lot.unitCost, 2)}
                          </td>
                          <td
                            style={{
                              padding: '10px 14px',
                              textAlign: 'right',
                              fontWeight: 600,
                              color: lot.unrealizedPnL >= 0 ? 'var(--gain-color, #ef4444)' : 'var(--loss-color, #10b981)',
                            }}
                          >
                            {lot.unrealizedPnL >= 0 ? '+' : ''}{currencySymbol}{fmtNum(lot.unrealizedPnL)}{' '}
                            <span style={{ fontSize: '0.75rem' }}>({fmtPct(lot.unrealizedPnLPercent)})</span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                            {lot.isLongTerm ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                }}
                              >
                                💎 長期 ({lot.holdingDays}天)
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                  color: '#60a5fa',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                }}
                              >
                                ⚡ 短期 ({lot.holdingDays}天)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 2. 歷史賣出沖銷歸因頁籤 */}
          {selectedTab === 'disposals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {disposals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>
                  此標的尚無歷史賣出沖銷紀錄
                </div>
              ) : (
                <div
                  style={{
                    border: '1px solid var(--border-color, rgba(51, 65, 85, 0.5))',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr
                        style={{
                          backgroundColor: 'rgba(30, 41, 59, 0.8)',
                          borderBottom: '1px solid var(--border-color, rgba(51, 65, 85, 0.5))',
                          color: 'var(--text-secondary, #94a3b8)',
                        }}
                      >
                        <th style={{ padding: '10px 14px' }}>賣出日期</th>
                        <th style={{ padding: '10px 14px' }}>對應買進日</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>沖銷股數</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>成本基準</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>賣出淨所得</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>已實現損益</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>持有期間</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontFamily: 'var(--font-mono)' }}>
                      {disposals.map((disp, idx) => (
                        <tr
                          key={disp.id}
                          style={{
                            borderBottom: '1px solid rgba(51, 65, 85, 0.25)',
                            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(30, 41, 59, 0.25)',
                          }}
                        >
                          <td style={{ padding: '10px 14px', color: 'var(--text-primary, #f8fafc)' }}>{disp.sellDate}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary, #94a3b8)' }}>{disp.buyDate}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>{fmtNum(disp.shares)}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary, #94a3b8)' }}>
                            {currencySymbol}{fmtNum(disp.costBasis)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>{currencySymbol}{fmtNum(disp.netProceeds)}</td>
                          <td
                            style={{
                              padding: '10px 14px',
                              textAlign: 'right',
                              fontWeight: 600,
                              color: disp.realizedPnL >= 0 ? 'var(--gain-color, #ef4444)' : 'var(--loss-color, #10b981)',
                            }}
                          >
                            {disp.realizedPnL >= 0 ? '+' : ''}{currencySymbol}{fmtNum(disp.realizedPnL)}{' '}
                            <span style={{ fontSize: '0.75rem' }}>({fmtPct(disp.realizedPnLPercent)})</span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                            {disp.isLongTerm ? (
                              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>長期 ({disp.holdingDays}天)</span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>短期 ({disp.holdingDays}天)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. 節稅沖銷對照頁籤 */}
          {selectedTab === 'taxComparison' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.45)',
                  border: '1px solid rgba(51, 65, 85, 0.6)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                  <Lightbulb size={18} />
                  <span>節稅收割分析 (Tax-Loss Harvesting Insight)</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', margin: 0, lineHeight: 1.5 }}>
                  不同沖銷會計模式將直接影響本年度已認列之資本利得與遞延稅負。
                  若採用 <strong style={{ color: '#f8fafc' }}>HIFO (最高成本先出法)</strong>，系統將優先出脫高價買進批次以最小化獲利或放大虧損抵稅。
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '14px',
                }}
              >
                {(['FIFO', 'LIFO', 'HIFO'] as AccountingMethod[]).map((m) => {
                  const data = taxComparison[m];
                  const label = ACCOUNTING_METHOD_LABELS[m];
                  const isCurrent = currentMethod === m;
                  const isBest = bestMethod === m;

                  return (
                    <div
                      key={m}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: isCurrent
                          ? '1px solid var(--primary-color, #10b981)'
                          : isBest
                          ? '1px solid rgba(245, 158, 11, 0.6)'
                          : '1px solid rgba(51, 65, 85, 0.5)',
                        backgroundColor: isCurrent
                          ? 'rgba(16, 185, 129, 0.08)'
                          : isBest
                          ? 'rgba(245, 158, 11, 0.06)'
                          : 'rgba(30, 41, 59, 0.35)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{label.shortName}</span>
                          <Tooltip content={label.tooltip}>
                            <span style={{ fontSize: '0.75rem', cursor: 'help', opacity: 0.8 }}>ℹ️</span>
                          </Tooltip>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {isBest && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '9999px',
                                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                              }}
                            >
                              👑 最佳節稅
                            </span>
                          )}
                          {isCurrent && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '9999px',
                                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                              }}
                            >
                              當前套用
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>已實現總損益:</span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              color: data.totalRealizedPnL >= 0 ? 'var(--gain-color, #ef4444)' : 'var(--loss-color, #10b981)',
                            }}
                          >
                            {currencySymbol}{fmtNum(data.totalRealizedPnL)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>短期利得 (&lt;1年):</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{currencySymbol}{fmtNum(data.shortTermRealizedPnL)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>長期利得 (≥1年):</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{currencySymbol}{fmtNum(data.longTermRealizedPnL)}</span>
                        </div>
                        {data.potentialTaxSavingsVsFIFO > 0 && (
                          <div
                            style={{
                              marginTop: '6px',
                              paddingTop: '6px',
                              borderTop: '1px solid rgba(51, 65, 85, 0.4)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              color: 'var(--primary-color, #10b981)',
                              fontWeight: 600,
                            }}
                          >
                            <span>相較 FIFO 節省/遞延:</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>+{currencySymbol}{fmtNum(data.potentialTaxSavingsVsFIFO)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 底欄 Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color, rgba(51, 65, 85, 0.5))',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: 'rgba(51, 65, 85, 0.6)',
              color: 'var(--text-primary, #f8fafc)',
              border: '1px solid var(--border-color, rgba(51, 65, 85, 0.5))',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
