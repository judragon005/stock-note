import React, { useState } from 'react';
import { HoldingPosition, TradeRecord, PriceQuote, MarketType, AccountingView, PositionFilter } from '../types/stock';
import { AccountingMethod, ACCOUNTING_METHOD_LABELS } from '../types/lot';
import { ReceivableDividend } from '../types/dividend';
import { calculateHoldingFxBreakdown } from '../engine/fxBreakdown';
import { formatTimelineDividend, formatTimelineReduction } from '../utils/formatters';
import { Edit2, Check, ChevronDown, ChevronRight, Calendar, Lock, Unlock, RefreshCw, PlusCircle, Layers, Target, Clock, Sparkles } from 'lucide-react';
import { Tooltip } from './common/Tooltip';
import { LotsBreakdownModal } from './LotsBreakdownModal';
import { calculateHoldingPeriodMetrics } from '../engine/holdingPeriodEngine';
import { HoldingSignalCapsules } from './common/HoldingSignalCapsules';

interface HoldingsTableProps {
  holdings: HoldingPosition[];
  trades?: TradeRecord[];
  quotes?: Record<string, PriceQuote>;
  lockedSymbols?: string[];
  accountingView?: AccountingView;
  accountingMethod?: AccountingMethod;
  onChangeAccountingMethod?: (method: AccountingMethod) => void;
  positionFilter?: PositionFilter;
  onChangePositionFilter?: (filter: PositionFilter) => void;
  onUpdatePrice: (symbol: string, price: number) => void;
  onToggleLock?: (symbol: string) => void;
  onRefreshSymbol?: (symbol: string, market: MarketType) => void;
  onQuickTrade: (symbol: string, type: 'BUY' | 'SELL') => void;
  onInspectSecurityXirr?: (symbol: string) => void;
  receivableDividends?: ReceivableDividend[];
  usdToTwdRate?: number;
}

interface PriceDisplayViewProps {
  item: HoldingPosition;
  quote?: PriceQuote;
  isLocked: boolean;
  decimals: number;
  onStartEdit: (symbol: string, currentPrice: number) => void;
  onToggleLock?: (symbol: string) => void;
  onRefreshSymbol?: (symbol: string, market: MarketType) => void;
}

const PriceDisplayView: React.FC<PriceDisplayViewProps> = ({
  item,
  quote,
  isLocked,
  decimals,
  onStartEdit,
  onToggleLock,
  onRefreshSymbol,
}) => {
  const hasDailyChange = quote && typeof quote.change === 'number' && typeof quote.changePercent === 'number';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <div
          onClick={() => onStartEdit(item.symbol, item.currentPrice)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '5px',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(51, 65, 85, 0.4)',
            transition: 'all 0.15s ease',
          }}
          title="點擊修改最新現價"
        >
          <span style={{ fontWeight: 700, color: '#ffffff' }}>
            {item.currentPrice.toFixed(decimals)}
          </span>
          <Edit2 size={11} color="var(--text-muted)" />
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', fontSize: '0.68rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                fontWeight: 700,
              }}
              title={`昨日收盤價: ${quote.previousClose?.toFixed(decimals)}`}
            >
              {quote.change! >= 0 ? '+' : ''}{quote.change!.toFixed(decimals)} ({quote.changePercent! >= 0 ? '+' : ''}{quote.changePercent!.toFixed(2)}%)
            </span>
          )}
        </div>

        {item.todaysPnL !== undefined && item.shares > 0 && item.todaysPnL !== 0 && (
          <span
            style={{
              color: item.todaysPnL >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
              fontWeight: 700,
              fontSize: '0.66rem',
            }}
            title="今日持有部位未實現損益波動額"
          >
            今日 {item.todaysPnL >= 0 ? '+' : ''}{Math.round(item.todaysPnL).toLocaleString('en-US')}
          </span>
        )}
      </div>
    </div>
  );
};

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  holdings,
  trades = [],
  quotes = {},
  lockedSymbols = [],
  accountingView = 'BROKER',
  accountingMethod = 'MOVING_AVERAGE',
  onChangeAccountingMethod,
  positionFilter,
  onChangePositionFilter,
  onUpdatePrice,
  onToggleLock,
  onRefreshSymbol,
  onQuickTrade,
  onInspectSecurityXirr,
  receivableDividends = [],
  usdToTwdRate = 32.0,
}) => {
  const [localFilter, setLocalFilter] = useState<PositionFilter>('ACTIVE');
  const currentFilter = positionFilter ?? localFilter;
  const setFilter = onChangePositionFilter ?? setLocalFilter;

  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [selectedLotHolding, setSelectedLotHolding] = useState<HoldingPosition | null>(null);
  const isBroker = accountingView === 'BROKER';

  // 數量統計
  const activeCount = holdings.filter((h) => h.shares > 0).length;
  const closedCount = holdings.filter(
    (h) => h.shares === 0 && (h.realizedPnL !== 0 || (h.totalDividends || 0) > 0 || (h.originalBuyShares || 0) > 0)
  ).length;
  const allCount = holdings.filter(
    (h) => h.shares > 0 || h.realizedPnL !== 0 || (h.totalDividends || 0) > 0 || (h.originalBuyShares || 0) > 0
  ).length;

  // 依據當前選取的檢視模式過濾
  const displayedHoldings = holdings
    .filter((h) => {
      if (currentFilter === 'ACTIVE') {
        return h.shares > 0;
      }
      if (currentFilter === 'CLOSED') {
        return h.shares === 0 && (h.realizedPnL !== 0 || (h.totalDividends || 0) > 0 || (h.originalBuyShares || 0) > 0);
      }
      // ALL
      return h.shares > 0 || h.realizedPnL !== 0 || (h.totalDividends || 0) > 0 || (h.originalBuyShares || 0) > 0;
    })
    .sort((a, b) => {
      // 總覽模式下：若有持股優先排在前面
      if (currentFilter === 'ALL') {
        const activeWeightA = a.shares > 0 ? 0 : 1;
        const activeWeightB = b.shares > 0 ? 0 : 1;
        if (activeWeightA !== activeWeightB) {
          return activeWeightA - activeWeightB;
        }
      }
      // 台股優先排前面
      const marketWeightA = a.market === 'TW' ? 0 : 1;
      const marketWeightB = b.market === 'TW' ? 0 : 1;
      if (marketWeightA !== marketWeightB) {
        return marketWeightA - marketWeightB;
      }
      return a.symbol.localeCompare(b.symbol);
    });

  const startEditPrice = (symbol: string, currentPrice: number) => {
    setEditingSymbol(symbol);
    setPriceInput(currentPrice.toString());
  };

  const savePrice = (symbol: string) => {
    const newPrice = parseFloat(priceInput);
    if (!isNaN(newPrice) && newPrice >= 0) {
      onUpdatePrice(symbol, newPrice);
    }
    setEditingSymbol(null);
  };

  const toggleExpand = (symbol: string) => {
    setExpandedSymbol((prev) => (prev === symbol ? null : symbol));
  };

  return (
    <div
      className="glass-card"
      style={{
        padding: '20px 24px',
        marginBottom: '24px',
        border: '1px solid rgba(51, 65, 85, 0.4)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 16, 30, 0.75) 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* 左側：三態切換膠囊按鈕 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(19, 29, 49, 0.8)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              onClick={() => setFilter('ACTIVE')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: currentFilter === 'ACTIVE'
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : 'transparent',
                color: currentFilter === 'ACTIVE' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: currentFilter === 'ACTIVE' ? 700 : 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: currentFilter === 'ACTIVE' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
              }}
            >
              <span>持倉中</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: currentFilter === 'ACTIVE' ? 'rgba(255,255,255,0.25)' : 'rgba(51, 65, 85, 0.6)',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                {activeCount}
              </span>
            </button>

            <button
              onClick={() => setFilter('CLOSED')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: currentFilter === 'CLOSED'
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                  : 'transparent',
                color: currentFilter === 'CLOSED' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: currentFilter === 'CLOSED' ? 700 : 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: currentFilter === 'CLOSED' ? '0 2px 8px rgba(139, 92, 246, 0.3)' : 'none',
              }}
            >
              <span>已平倉</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: currentFilter === 'CLOSED' ? 'rgba(255,255,255,0.25)' : 'rgba(51, 65, 85, 0.6)',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                {closedCount}
              </span>
            </button>

            <button
              onClick={() => setFilter('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: currentFilter === 'ALL'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'transparent',
                color: currentFilter === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: currentFilter === 'ALL' ? 700 : 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: currentFilter === 'ALL' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
              }}
            >
              <span>全部總覽</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: currentFilter === 'ALL' ? 'rgba(255,255,255,0.25)' : 'rgba(51, 65, 85, 0.6)',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                {allCount}
              </span>
            </button>
          </div>
        </div>

        {/* 右側：會計口徑與沖銷模式 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* 沖銷會計模式 (AccountingMethod) 切換器 */}
          {onChangeAccountingMethod && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(19, 29, 49, 0.8)',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              <Tooltip content={ACCOUNTING_METHOD_LABELS[accountingMethod].tooltip}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  沖銷會計 ℹ️
                </span>
              </Tooltip>
              <select
                value={accountingMethod}
                onChange={(e) => onChangeAccountingMethod(e.target.value as AccountingMethod)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#34d399',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {(Object.keys(ACCOUNTING_METHOD_LABELS) as AccountingMethod[]).map((m) => (
                  <option key={m} value={m} style={{ background: '#0f172a', color: '#e2e8f0' }}>
                    {ACCOUNTING_METHOD_LABELS[m].name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <span
            style={{
              fontSize: '0.75rem',
              padding: '4px 10px',
              borderRadius: '6px',
              background: isBroker ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: isBroker ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
              color: isBroker ? '#60a5fa' : '#34d399',
              fontWeight: 700,
            }}
          >
            {isBroker ? '🏢 券商核帳口徑 (含稅淨值)' : '📈 投資總報酬口徑 (毛市值)'}
          </span>
        </div>
      </div>

      {displayedHoldings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          {currentFilter === 'ACTIVE'
            ? '目前無任何持股紀錄。請點擊上方按鈕新增交易或智慧掃描公司行動。'
            : currentFilter === 'CLOSED'
            ? '目前尚無已平倉的交易紀錄。'
            : '目前尚無任何標的紀錄。'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: '32px' }}></th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>標的代碼 / 名稱</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>市場 / 幣別</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>持有股數</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>平均成本</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>
                  {currentFilter === 'CLOSED' ? '出場均價 / 清倉日' : '最新參考市價'}
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>
                  {currentFilter === 'CLOSED' ? '歷史總投入' : isBroker ? '總付出成本' : '持倉成本基準'}
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>
                  {currentFilter === 'CLOSED' ? '在倉市值' : isBroker ? '當前市值 (含稅淨值)' : '當前毛市值'}
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>
                  {currentFilter === 'CLOSED' ? '已實現損益 / 報酬率' : isBroker ? '未實現損益 (含稅)' : '未實現損益 / 報酬率'}
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>
                  {isBroker ? '累計股息 / YoC' : '含息總損益 / 回報%'}
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {displayedHoldings.map((item) => {
                const isClosed = item.isClosed || item.shares === 0;
                const isGain = isClosed ? item.realizedPnL >= 0 : item.unrealizedPnL >= 0;
                const isUS = item.currency === 'USD';
                const decimals = isUS ? 2 : item.avgCost < 50 ? 2 : 1;
                const currencyPrefix = isUS ? '$' : 'NT$';
                const isExpanded = expandedSymbol === item.symbol;
                const isLocked = lockedSymbols.some((s) => s.trim().toUpperCase() === item.symbol.trim().toUpperCase());
                const quote = quotes[item.symbol];

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
                        transition: 'background 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: isExpanded ? 'rgba(30, 41, 59, 0.45)' : isClosed ? 'rgba(15, 23, 42, 0.25)' : 'transparent',
                        cursor: 'pointer',
                        opacity: isClosed && currentFilter === 'ALL' ? 0.8 : 1,
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
                          <span className="mono" style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.96rem' }}>
                            {item.symbol}
                          </span>
                          {currentFilter === 'ALL' && (
                            <span
                              style={{
                                fontSize: '0.625rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: isClosed ? 'rgba(148, 163, 184, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: isClosed ? '#94a3b8' : '#34d399',
                                fontWeight: 700,
                              }}
                            >
                              {isClosed ? '⚪ 已清倉' : '🟢 持倉中'}
                            </span>
                          )}
                          {hasCorporateActions && (
                            <span
                              className="badge badge-stock-div"
                              style={{ padding: '1px 5px', fontSize: '0.65rem' }}
                              title="此標的曾發生除權配股、減資或分割事件"
                            >
                              ⚡ 公司行動
                            </span>
                          )}
                          {/* 主動交易風控狀態標籤 */}
                          {!isClosed && item.riskMetrics && item.riskMetrics.riskStatus !== 'NORMAL' && (
                            (() => {
                              const rm = item.riskMetrics;
                              if (rm.riskStatus === 'STOP_LOSS_TRIGGERED') {
                                return (
                                  <span
                                    style={{
                                      fontSize: '0.65rem',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(239, 68, 68, 0.25)',
                                      color: '#f87171',
                                      border: '1px solid rgba(239, 68, 68, 0.5)',
                                      fontWeight: 700,
                                      animation: 'pulse 1.5s infinite',
                                    }}
                                    title={`🚨 觸及停損！已跌破預設停損價 ${rm.stopLossPrice} (${rm.distanceToStopLossPercent}%)`}
                                  >
                                    🚨 觸及停損
                                  </span>
                                );
                              }
                              if (rm.riskStatus === 'TAKE_PROFIT_TRIGGERED') {
                                return (
                                  <span
                                    style={{
                                      fontSize: '0.65rem',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(16, 185, 129, 0.25)',
                                      color: '#34d399',
                                      border: '1px solid rgba(16, 185, 129, 0.5)',
                                      fontWeight: 700,
                                    }}
                                    title={`🎯 達標停利！已達到預設目標價 ${rm.takeProfitPrice} (${rm.distanceToTakeProfitPercent}%)`}
                                  >
                                    🎯 達標停利
                                  </span>
                                );
                              }
                              if (rm.riskStatus === 'NEAR_STOP_LOSS') {
                                return (
                                  <span
                                    style={{
                                      fontSize: '0.65rem',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(245, 158, 11, 0.2)',
                                      color: '#fbbf24',
                                      border: '1px solid rgba(245, 158, 11, 0.4)',
                                      fontWeight: 600,
                                    }}
                                    title={`⚠️ 接近停損點 (距停損價 ${rm.stopLossPrice} 僅差 ${rm.distanceToStopLossPercent}%)`}
                                  >
                                    ⚠️ 逼近停損
                                  </span>
                                );
                              }
                              if (rm.riskStatus === 'NEAR_TAKE_PROFIT') {
                                return (
                                  <span
                                    style={{
                                      fontSize: '0.65rem',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(56, 189, 248, 0.2)',
                                      color: '#38bdf8',
                                      border: '1px solid rgba(56, 189, 248, 0.4)',
                                      fontWeight: 600,
                                    }}
                                    title={`💡 逼近停利目標 (距目標價 ${rm.takeProfitPrice} 僅差 ${rm.distanceToTakeProfitPercent}%)`}
                                  >
                                    💡 逼近停利
                                  </span>
                                );
                              }
                              return null;
                            })()
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{item.name}</span>
                          {!isClosed && item.shares > 0 && (() => {
                            const hp = calculateHoldingPeriodMetrics(item.lots || [], item.symbol);
                            if (hp.weightedHoldingDays <= 0 && hp.activeLotsCount === 0) return null;
                            return (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  border: '1px solid',
                                }}
                                className={hp.categoryInfo.badgeColor}
                                title={`加權持股天數: ${hp.weightedHoldingDays} 天 (最早買入: ${hp.firstBuyDate || '-'} / 最近買入: ${hp.latestBuyDate || '-'}) · ${hp.categoryInfo.description}`}
                              >
                                {hp.weightedHoldingDays}天 · {hp.categoryInfo.label.split(' ')[1] || hp.categoryInfo.label}
                              </span>
                            );
                          })()}
                        </div>
                        {/* 技術指標多維警示膠囊與操作定調 */}
                        {!isClosed && item.signals && item.signals.length > 0 && (
                          <HoldingSignalCapsules
                            signals={item.signals}
                            directive={item.actionDirective}
                          />
                        )}
                      </td>

                      {/* 市場/幣別 */}
                      <td style={{ padding: '14px' }}>
                        <span className={`badge ${item.market === 'TW' ? 'badge-tw' : 'badge-us'}`}>
                          {item.market === 'TW' ? '🇹🇼 台股' : '🇺🇸 美股'} ({item.currency})
                        </span>
                      </td>

                      {/* 股數 */}
                      <td className="mono" style={{ padding: '14px', textAlign: 'right', fontWeight: 600 }}>
                        {isClosed ? (
                          <>
                            <div style={{ color: 'var(--text-muted)' }}>0 股</div>
                            {item.originalBuyShares && item.originalBuyShares > 0 ? (
                              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                                歷程 {item.originalBuyShares.toLocaleString('en-US', { maximumFractionDigits: item.market === 'TW' ? 0 : 4 })} 股
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                      </td>

                      {/* 平均成本 */}
                      <td className="mono" style={{ padding: '14px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        <div>{item.avgCost > 0 ? item.avgCost.toFixed(decimals) : '-'}</div>
                        {!isClosed && item.breakevenPrice !== undefined && item.breakevenPrice > 0 && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontSize: '0.68rem',
                              color: '#38bdf8',
                              background: 'rgba(56, 189, 248, 0.1)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              marginTop: '3px',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              fontWeight: 600,
                            }}
                            title={`精確保本出場價：${item.breakevenPrice.toFixed(decimals)} (已計入賣出證交稅與券商手續費折讓)`}
                          >
                            保本 {item.breakevenPrice.toFixed(decimals)}
                          </div>
                        )}
                        {item.totalCapitalReturned && item.totalCapitalReturned > 0 ? (
                          <div style={{ fontSize: '0.7rem', color: '#fb923c', marginTop: '2px' }}>已扣減資退款</div>
                        ) : null}
                      </td>

                      {/* 最新參考市價 / 出場均價 */}
                      <td
                        className="mono"
                        style={{ padding: '14px', textAlign: 'right' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isClosed ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {item.exitPrice ? item.exitPrice.toFixed(decimals) : item.currentPrice.toFixed(decimals)}
                            </span>
                            {item.lastTradeDate && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                清倉 {item.lastTradeDate}
                              </span>
                            )}
                          </div>
                        ) : editingSymbol === item.symbol ? (
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
                        ) : (
                          <PriceDisplayView
                            item={item}
                            quote={quote}
                            isLocked={isLocked}
                            decimals={decimals}
                            onStartEdit={startEditPrice}
                            onToggleLock={onToggleLock}
                            onRefreshSymbol={onRefreshSymbol}
                          />
                        )}
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
                        <div>{isClosed ? '-' : Math.round(item.marketValue).toLocaleString('en-US')}</div>
                        {!isClosed && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                            {isBroker
                              ? `毛 ${Math.round(item.grossMarketValue).toLocaleString()} (稅費 -${Math.round(item.estimatedSellTax + item.estimatedSellFee)})`
                              : `淨現值 ${Math.round(item.netMarketValue).toLocaleString()}`}
                          </div>
                        )}
                      </td>

                      {/* 損益欄位 (持倉顯示未實現，已平倉顯示已實現) */}
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        {isClosed ? (
                          <>
                            <div
                              className="mono"
                              style={{
                                fontWeight: 800,
                                color: item.realizedPnL >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
                                fontSize: '0.92rem',
                              }}
                            >
                              {item.realizedPnL >= 0 ? '+' : ''}
                              {Math.round(item.realizedPnL).toLocaleString('en-US')}
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: item.realizedPnL >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
                                marginTop: '2px',
                              }}
                            >
                              已實現 {item.totalReturnPercent >= 0 ? '+' : ''}{item.totalReturnPercent.toFixed(2)}%
                            </div>
                          </>
                        ) : (
                          <>
                            <div
                              className="mono"
                              style={{
                                fontWeight: 800,
                                color: isGain ? 'var(--gain-color)' : 'var(--loss-color)',
                                fontSize: '0.92rem',
                              }}
                            >
                              {isGain ? '+' : ''}
                              {Math.round(isBroker ? item.unrealizedPnL : item.unrealizedPnL).toLocaleString('en-US')}
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: isGain ? 'var(--gain-color)' : 'var(--loss-color)',
                                marginTop: '2px',
                              }}
                            >
                              {isGain ? '▲' : '▼'} {Math.abs(item.unrealizedPnLPercent).toFixed(2)}%
                            </div>

                            {/* 應收股利平滑補償提示 */}
                            {(() => {
                              const rec = receivableDividends?.find((r) => r.symbol.toUpperCase() === item.symbol.toUpperCase());
                              if (!rec) return null;
                              const smoothedPnL = item.unrealizedPnL + (item.currency === 'USD' ? rec.estimatedNetDividend : rec.estimatedNetDividendInTWD);
                              return (
                                <Tooltip
                                  content={`💡 除息平滑補償：待發放應收股利 +${currencyPrefix}${Math.round(rec.estimatedNetDividend).toLocaleString()} (預估 ${rec.payDate} 入帳)，調整後平滑損益為 ${smoothedPnL >= 0 ? '+' : ''}${currencyPrefix}${Math.round(smoothedPnL).toLocaleString()}`}
                                >
                                  <div
                                    style={{
                                      fontSize: '0.65rem',
                                      color: '#fbbf24',
                                      background: 'rgba(245, 158, 11, 0.15)',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      marginTop: '3px',
                                      cursor: 'help',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <Clock size={10} />
                                    <span>待入帳 +{currencyPrefix}{Math.round(rec.estimatedNetDividend).toLocaleString()}</span>
                                  </div>
                                </Tooltip>
                              );
                            })()}

                            {/* 美股外匯匯差與本體價差拆解 Tooltip */}
                            {item.market === 'US' && item.shares > 0 && (() => {
                              const fx = calculateHoldingFxBreakdown(item, 32.0, usdToTwdRate || 32.0);
                              return (
                                <Tooltip
                                  content={`🇺🇸 美股雙軸損益拆解 (TWD 計價)：\n• 股票本體價差：${fx.assetGainTWD >= 0 ? '+' : ''}NT$ ${fx.assetGainTWD.toLocaleString()} (${fx.assetGainPercent}%)\n• 外匯匯差波動：${fx.fxGainTWD >= 0 ? '+' : ''}NT$ ${fx.fxGainTWD.toLocaleString()} (${fx.fxGainPercent}%)\n• 總計台幣損益：${fx.totalGainTWD >= 0 ? '+' : ''}NT$ ${fx.totalGainTWD.toLocaleString()}`}
                                >
                                  <div
                                    style={{
                                      fontSize: '0.65rem',
                                      color: '#38bdf8',
                                      background: 'rgba(56, 189, 248, 0.15)',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      marginTop: '3px',
                                      cursor: 'help',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <Sparkles size={10} />
                                    <span>FX 匯差 {fx.fxGainTWD >= 0 ? '+' : ''}{fx.fxGainPercent}%</span>
                                  </div>
                                </Tooltip>
                              );
                            })()}
                          </>
                        )}
                      </td>

                      {/* 累計股息與總報酬 / YoC / XIRR */}
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        {isBroker ? (
                          <>
                            <div
                              className="mono"
                              style={{
                                fontWeight: 700,
                                color: item.totalDividends > 0 ? '#fbbf24' : 'var(--text-muted)',
                                fontSize: '0.86rem',
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
                              {isClosed ? '已入帳股息' : `YoC: ${item.yieldOnCostPercent > 0 ? `${item.yieldOnCostPercent.toFixed(2)}%` : '-'}`}
                            </div>
                          </>
                        ) : (
                          <>
                            <div
                              className="mono"
                              style={{
                                fontWeight: 800,
                                color: item.totalReturnPnL >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
                                fontSize: '0.86rem',
                              }}
                            >
                              {item.totalReturnPnL >= 0 ? '+' : ''}{currencyPrefix} {Math.round(item.totalReturnPnL).toLocaleString('en-US')}
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: item.totalReturnPnL >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
                                marginTop: '2px',
                              }}
                            >
                              總回報: {item.totalReturnPercent >= 0 ? '+' : ''}{item.totalReturnPercent.toFixed(2)}%
                            </div>
                          </>
                        )}

                        {item.xirrPercent !== undefined && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              marginTop: '3px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '4px',
                            }}
                          >
                            <span
                              style={{ color: item.xirrPercent >= 0 ? 'var(--gain-color)' : 'var(--loss-color)', fontWeight: 700 }}
                              title="含息資金加權年化報酬率 (MWRR)，計入歷史買賣、加碼、股息與期末持股市值"
                            >
                              XIRR: {item.xirrPercent >= 0 ? '+' : ''}{item.xirrPercent.toFixed(2)}%
                              {!item.isXirrAnnualized && <span style={{ color: '#f59e0b', marginLeft: '2px' }} title="未滿 30 天非年化">*</span>}
                            </span>
                            {onInspectSecurityXirr && (
                              <span
                                onClick={(e) => {
                                   e.stopPropagation();
                                  onInspectSecurityXirr(item.symbol);
                                }}
                                style={{
                                  color: '#38bdf8',
                                  fontSize: '0.68rem',
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                }}
                                title="點擊透視此標的現金流"
                              >
                                透視
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 快速加碼 / 平倉 / 再次買入操作 */}
                      <td style={{ padding: '14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {isClosed ? (
                          <button
                            className="btn btn-sm"
                            style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#60a5fa',
                              padding: '4px 10px',
                              border: '1px solid rgba(59, 130, 246, 0.35)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600,
                            }}
                            onClick={() => onQuickTrade(item.symbol, 'BUY')}
                            title="以此標的再次建倉"
                          >
                            <PlusCircle size={13} />
                            <span>再次買入</span>
                          </button>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                            <button
                              className="btn btn-sm"
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                padding: '4px 9px',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                fontWeight: 700,
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
                                color: '#fb7185',
                                padding: '4px 9px',
                                border: '1px solid rgba(244, 63, 94, 0.35)',
                                fontWeight: 700,
                              }}
                              onClick={() => onQuickTrade(item.symbol, 'SELL')}
                              title="賣出平倉"
                            >
                              賣出
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* 展開之歷史股權歷程時間軸 */}
                    {isExpanded && (
                      <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid rgba(51, 65, 85, 0.3)' }}>
                        <td colSpan={11} style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Calendar size={14} color="#60a5fa" />
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa' }}>
                                【{item.symbol} {item.name}】完整交易與公司行動歷史時間軸 ({stockTrades.length} 筆)
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLotHolding(item);
                                }}
                                style={{
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  border: '1px solid rgba(16, 185, 129, 0.35)',
                                  color: '#34d399',
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Layers size={13} />
                                <span>📦 批次明細與節稅對照</span>
                              </button>

                              {onInspectSecurityXirr && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onInspectSecurityXirr(item.symbol);
                                  }}
                                  style={{
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    border: '1px solid rgba(56, 189, 248, 0.35)',
                                    color: '#38bdf8',
                                    borderRadius: '6px',
                                    padding: '4px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  🔍 透視個股含息 XIRR 現金流
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 作戰計畫與賽後覆盤專區 */}
                          {(() => {
                            const latestBuyWithPlan = [...stockTrades].reverse().find((t) => t.type === 'BUY' && t.plan);
                            const latestSell = [...stockTrades].reverse().find((t) => t.type === 'SELL');

                            return (
                              <div
                                style={{
                                  marginBottom: '12px',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  background: 'rgba(15, 23, 42, 0.7)',
                                  border: '1px solid rgba(59, 130, 246, 0.25)',
                                }}
                              >
                                {/* 0. 智慧量化操作建議方針 */}
                                {!isClosed && item.actionDirective && (
                                  <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed rgba(51, 65, 85, 0.6)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Sparkles size={14} color="#38bdf8" /> 🤖 智慧量化技術診斷與操作方針
                                      </span>
                                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fbbf24' }}>
                                        定調：{item.actionDirective.headline} (評分: {item.actionDirective.score > 0 ? `+${item.actionDirective.score}` : item.actionDirective.score})
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                                      💡 <strong>操作建言：</strong>{item.actionDirective.advice}
                                    </div>
                                  </div>
                                )}

                                {/* 1. 作戰計畫對照 */}
                                {latestBuyWithPlan?.plan ? (
                                  <div style={{ marginBottom: isClosed ? '10px' : '0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#93c5fd', marginBottom: '4px' }}>
                                      <Target size={14} /> 🎯 建倉作戰計畫對照
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                      {latestBuyWithPlan.plan.entryReason && (
                                        <span>進場假說：<strong style={{ color: '#fff' }}>{latestBuyWithPlan.plan.entryReason}</strong></span>
                                      )}
                                      {latestBuyWithPlan.plan.stopLossPrice && (
                                        <span>預設停損：<strong style={{ color: '#f87171' }}>{latestBuyWithPlan.plan.stopLossPrice}</strong></span>
                                      )}
                                      {latestBuyWithPlan.plan.takeProfitPrice && (
                                        <span>預設停利：<strong style={{ color: '#34d399' }}>{latestBuyWithPlan.plan.takeProfitPrice}</strong></span>
                                      )}
                                      {latestBuyWithPlan.plan.plannedRiskRewardRatio && (
                                        <span>預期風報比：<strong style={{ color: '#60a5fa' }}>1 : {latestBuyWithPlan.plan.plannedRiskRewardRatio}</strong></span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  !isClosed && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      💡 此持股建倉時未設定停損停利計畫，可於下次加碼或編輯時設定。
                                    </div>
                                  )
                                )}

                                {/* 2. 賽後覆盤檢討 (已平倉或有賣出時) */}
                                {isClosed && latestSell && (
                                  <div style={{ borderTop: latestBuyWithPlan?.plan ? '1px dashed rgba(51, 65, 85, 0.6)' : 'none', paddingTop: latestBuyWithPlan?.plan ? '10px' : '0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        📝 賽後覆盤與紀律檢討
                                      </span>
                                      {latestSell.review && (
                                        <span style={{ fontSize: '0.7rem', color: latestSell.review.isPlanFollowed ? '#34d399' : '#f87171', fontWeight: 600 }}>
                                          {latestSell.review.isPlanFollowed ? '✅ 嚴守紀律' : '⚠️ 違反計畫'} · ⭐ {latestSell.review.disciplineScore} 星
                                        </span>
                                      )}
                                    </div>
                                    {latestSell.review ? (
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {latestSell.review.lessonsLearned && (
                                          <div style={{ marginTop: '2px', color: '#e2e8f0' }}>
                                            💬 心得筆記：{latestSell.review.lessonsLearned}
                                          </div>
                                        )}
                                        {latestSell.review.mistakesMade && latestSell.review.mistakesMade.length > 0 && (
                                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                            {latestSell.review.mistakesMade.map((m) => (
                                              <span
                                                key={m}
                                                style={{
                                                  fontSize: '0.65rem',
                                                  background: 'rgba(239, 68, 68, 0.2)',
                                                  color: '#fca5a5',
                                                  padding: '1px 6px',
                                                  borderRadius: '4px',
                                                }}
                                              >
                                                {m === 'CHASE_HIGH' ? '追高' : m === 'HOLD_LOSER' ? '凹單' : m === 'PREMATURE_PROFIT' ? '過早止盈' : m === 'EMOTIONAL_SIZE' ? '情緒重押' : '無計畫'}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        尚未填寫覆盤紀錄。可於交易紀錄編輯中補充此平倉之紀律評分與心得。
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

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
                                    {st.type === 'CAPITAL_REDUCTION' && formatTimelineReduction(st)}
                                    {st.type === 'DIVIDEND' && formatTimelineDividend(st)}
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

      {/* 持股多批次明細與節稅抽屜 Modal */}
      {selectedLotHolding && (
        <LotsBreakdownModal
          isOpen={!!selectedLotHolding}
          onClose={() => setSelectedLotHolding(null)}
          holding={selectedLotHolding}
          trades={trades}
          currentMethod={accountingMethod}
          onMethodChange={onChangeAccountingMethod}
        />
      )}
    </div>
  );
};
