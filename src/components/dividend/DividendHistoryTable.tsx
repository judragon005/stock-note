import React from 'react';
import { Award, Coins, Search, CheckCircle2 } from 'lucide-react';
import { TradeRecord, MarketType, HoldingPosition } from '../../types/stock';
import { resolveEffectiveDividendTaxAndNet } from '../../engine/taxComplianceEngine';
import { getEffectiveDividendPayDate } from '../../engine/dividendAggregator';
import {
  calculateYieldOnCost,
  determineDividendFillStatus,
  formatDividendFillStatusLabel,
} from '../../engine/dividendMetricsEngine';

export interface DividendContributor {
  symbol: string;
  name: string;
  market: MarketType;
  totalDividendsTWD: number;
  percentageOfTotal: number;
}

export interface AnnualReconciliationItem {
  symbol: string;
  name: string;
  market: MarketType;
  count: number;
  grossTWD: number;
  netTWD: number;
  taxTWD: number;
}

export interface DividendHistoryTableProps {
  dividendTrades: TradeRecord[];
  allScopedTrades: TradeRecord[];
  holdings: HoldingPosition[];
  selectedYear: number;
  usdToTwdRate: number;
  todayStr: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  tableYearFilter: 'SELECTED_YEAR' | 'ALL';
  onTableYearFilterChange: (filter: 'SELECTED_YEAR' | 'ALL') => void;
  rankMode: 'YEAR' | 'ALL_TIME';
  onRankModeChange: (mode: 'YEAR' | 'ALL_TIME') => void;
  activeContributors: DividendContributor[];
  reconciliationList: AnnualReconciliationItem[];
  showReconciliationPanel: boolean;
  onToggleReconciliationPanel: () => void;
  onInstantSettle?: (tradeId: string) => void;
}

export const DividendHistoryTable: React.FC<DividendHistoryTableProps> = ({
  dividendTrades,
  allScopedTrades,
  holdings,
  selectedYear,
  usdToTwdRate,
  todayStr,
  searchQuery,
  onSearchChange,
  tableYearFilter,
  onTableYearFilterChange,
  rankMode,
  onRankModeChange,
  activeContributors,
  reconciliationList,
  showReconciliationPanel,
  onToggleReconciliationPanel,
  onInstantSettle,
}) => {
  // 建立標的持倉快速比對 Map
  const holdingsMap = React.useMemo(() => {
    const map = new Map<string, HoldingPosition>();
    holdings.forEach((h) => map.set(h.symbol.toUpperCase(), h));
    return map;
  }, [holdings]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 標的股息貢獻排行 Top 榜 */}
      <div
        className="glass-card"
        style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="#c084fc" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                股息貢獻排行 (Top)
              </h3>
            </div>

            {/* 當年度 vs 全歷史 切換開關 */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(19, 29, 49, 0.8)',
                padding: '2px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              <button
                type="button"
                onClick={() => onRankModeChange('YEAR')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: rankMode === 'YEAR' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'transparent',
                  color: rankMode === 'YEAR' ? '#ffffff' : '#94a3b8',
                  fontSize: '0.7rem',
                  fontWeight: rankMode === 'YEAR' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {selectedYear}年
              </button>
              <button
                type="button"
                onClick={() => onRankModeChange('ALL_TIME')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: rankMode === 'ALL_TIME' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'transparent',
                  color: rankMode === 'ALL_TIME' ? '#ffffff' : '#94a3b8',
                  fontSize: '0.7rem',
                  fontWeight: rankMode === 'ALL_TIME' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                全歷史
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '190px', overflowY: 'auto' }}>
            {activeContributors.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '30px 0' }}>
                {rankMode === 'YEAR' ? `${selectedYear} 年度尚無股息記錄` : '尚無股息發放紀錄'}
              </div>
            ) : (
              activeContributors.slice(0, 5).map((item, idx) => {
                const holding = holdingsMap.get(item.symbol.toUpperCase());
                const holdingCost = holding?.avgCost || 0;
                return (
                  <div key={item.symbol} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#334155',
                            color: '#ffffff',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontWeight: 700, color: '#ffffff' }}>{item.symbol}</span>
                        <span style={{ color: '#94a3b8', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </span>
                        {holdingCost > 0 && holding?.yieldOnCostPercent ? (
                          <span style={{ fontSize: '0.65rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '1px 4px', borderRadius: '4px' }}>
                            YOC: {holding.yieldOnCostPercent.toFixed(1)}%
                          </span>
                        ) : null}
                      </div>
                      <span className="mono" style={{ fontWeight: 700, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>
                        NT$ {item.totalDividendsTWD.toLocaleString()} ({item.percentageOfTotal}%)
                      </span>
                    </div>

                    {/* 進度條 */}
                    <div style={{ width: '100%', height: '5px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, item.percentageOfTotal)}%`,
                          background: 'linear-gradient(90deg, #a855f7 0%, #10b981 100%)',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ fontSize: '0.72rem', color: '#64748b', paddingTop: '8px', borderTop: '1px solid rgba(51, 65, 85, 0.4)' }}>
          {rankMode === 'YEAR' ? `${selectedYear} 年度共 ${activeContributors.length} 檔標的貢獻` : `全歷史共 ${activeContributors.length} 檔標的貢獻`}
        </div>
      </div>

      {/* 歷史現金股利入帳流水明細表 */}
      <div
        className="glass-card"
        style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={18} color="#34d399" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
              歷史現金股利入帳明細
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>({dividendTrades.length} 筆)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* 當年度 vs 全歷史 切換開關 */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(19, 29, 49, 0.8)',
                padding: '2px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              <button
                type="button"
                onClick={() => onTableYearFilterChange('SELECTED_YEAR')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: tableYearFilter === 'SELECTED_YEAR' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                  color: tableYearFilter === 'SELECTED_YEAR' ? '#ffffff' : '#94a3b8',
                  fontSize: '0.7rem',
                  fontWeight: tableYearFilter === 'SELECTED_YEAR' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {selectedYear} 年度
              </button>
              <button
                type="button"
                onClick={() => onTableYearFilterChange('ALL')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: tableYearFilter === 'ALL' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                  color: tableYearFilter === 'ALL' ? '#ffffff' : '#94a3b8',
                  fontSize: '0.7rem',
                  fontWeight: tableYearFilter === 'ALL' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                全歷史
              </button>
            </div>

            {/* 券商對帳核對展開按鈕 */}
            <button
              type="button"
              onClick={onToggleReconciliationPanel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '8px',
                border: showReconciliationPanel ? '1px solid #10b981' : '1px solid var(--border-color)',
                background: showReconciliationPanel ? 'rgba(16, 185, 129, 0.2)' : 'rgba(19, 29, 49, 0.8)',
                color: showReconciliationPanel ? '#34d399' : '#cbd5e1',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="展開或收合年度各標的券商對帳核對摘要"
            >
              <Award size={13} />
              <span>{selectedYear} 券商對帳核對</span>
            </button>

            {/* 搜尋標的 */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                placeholder="搜尋代碼或名稱..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  padding: '6px 12px 6px 30px',
                  background: 'rgba(19, 29, 49, 0.8)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: '#ffffff',
                  outline: 'none',
                  width: '180px',
                }}
              />
            </div>
          </div>
        </div>

        {/* 券商對帳核對面板 */}
        {showReconciliationPanel && (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#34d399' }}>
                  📊 {selectedYear} 年度各標的券商對帳小計 (共 {reconciliationList.length} 檔)
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  (已依應發毛額排序 · 方便比對券商 APP 累積股利清單)
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
              {reconciliationList.map((item) => (
                <div
                  key={item.symbol}
                  style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(51, 65, 85, 0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.82rem' }}>{item.symbol}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{item.count} 筆</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <span style={{ color: '#94a3b8' }}>毛額：</span>
                    <b className="mono" style={{ color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>
                      NT$ {item.grossTWD.toLocaleString()}
                    </b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#64748b' }}>
                    <span>實領：NT$ {item.netTWD.toLocaleString()}</span>
                    {item.taxTWD > 0 && <span className="mono" style={{ color: 'var(--loss-color)' }}>稅 -{item.taxTWD.toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 明細表格 */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.8)', color: '#94a3b8', background: 'rgba(19, 29, 49, 0.4)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>入帳日期</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>標的代碼 / 名稱</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>除息股數</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>每股配息</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>YOC / 填息</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>應發總額</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>扣繳稅款/健保</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>實領淨額</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>折合台幣</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {dividendTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    {tableYearFilter === 'SELECTED_YEAR'
                      ? `${selectedYear} 年度尚無符合條件之現金股利入帳明細`
                      : '尚無符合條件之現金股利入帳明細'}
                  </td>
                </tr>
              ) : (
                dividendTrades.map((t) => {
                  const isUS = t.market === 'US' || t.currency === 'USD';
                  const res = resolveEffectiveDividendTaxAndNet(t, allScopedTrades);
                  const gross = res.gross;
                  const effectiveTax = res.effectiveTax;
                  const net = res.netCash;
                  const netTWD = isUS ? Math.round(net * usdToTwdRate) : Math.round(net);
                  const effectivePayDate = getEffectiveDividendPayDate(t);
                  const exDate = t.exDate || t.date;
                  const isFuture = effectivePayDate > todayStr;

                  // 計算 YOC 與填息狀態
                  const holding = holdingsMap.get(t.symbol.toUpperCase());
                  const yoc = holding && holding.avgCost > 0
                    ? calculateYieldOnCost(t.price, holding.avgCost)
                    : 0;

                  const fillStatus = holding && holding.currentPrice > 0
                    ? determineDividendFillStatus({
                        currentPrice: holding.currentPrice,
                        exPrice: holding.avgCost,
                        dividendPerShare: t.price,
                      })
                    : undefined;

                  const formattedShares = isUS ? t.shares.toLocaleString() : Math.round(t.shares).toLocaleString();
                  const formattedPrice = isUS ? `${t.price.toFixed(4)} USD` : `${t.price} TWD`;
                  const formattedGross = isUS ? `${gross.toFixed(2)} USD` : `${Math.round(gross).toLocaleString()} TWD`;

                  let formattedTax = isUS ? '$0.00 USD' : 'NT$ 0';
                  if (effectiveTax > 0) {
                    formattedTax = isUS ? `-${effectiveTax.toFixed(2)} USD` : `-NT$ ${Math.round(effectiveTax).toLocaleString()}`;
                  }

                  const formattedNet = isUS ? `${net.toFixed(2)} USD` : `${Math.round(net).toLocaleString()} TWD`;

                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
                        transition: 'background 0.2s',
                        background: isFuture ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                      }}
                    >
                      <td className="mono" style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: isFuture ? '#fbbf24' : '#34d399', fontSize: '0.85rem' }}>
                              {effectivePayDate}
                            </span>
                            {isFuture && (
                              <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.2)', padding: '1px 4px', borderRadius: '4px', color: '#fbbf24' }}>
                                預約待入
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            除息: {exDate}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: '#ffffff' }}>{t.symbol}</span>
                          <span style={{ color: '#94a3b8' }}>{t.name}</span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(51, 65, 85, 0.6)',
                              color: '#cbd5e1',
                            }}
                          >
                            {t.market}
                          </span>
                        </div>
                      </td>
                      <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                        {formattedShares}
                      </td>
                      <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                        {formattedPrice}
                      </td>
                      {/* YOC 與實質填息標籤 */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          {yoc > 0 && (
                            <span className="mono" style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              YOC {yoc.toFixed(1)}%
                            </span>
                          )}
                          {fillStatus && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: fillStatus === 'FILLED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                                color: fillStatus === 'FILLED' ? '#34d399' : '#f87171',
                                border: `1px solid ${fillStatus === 'FILLED' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
                              }}
                            >
                              {formatDividendFillStatusLabel(fillStatus)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                        {formattedGross}
                      </td>
                      <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', color: effectiveTax > 0 ? 'var(--loss-color)' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                        {formattedTax}
                      </td>
                      <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>
                        {formattedNet}
                      </td>
                      <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                        NT$ {netTWD.toLocaleString()}
                      </td>
                      {/* 操作欄 (支援一鍵已入帳) */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {isFuture && onInstantSettle && (
                          <button
                            type="button"
                            onClick={() => onInstantSettle(t.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="收到銀行入帳通知時，定錨今日入帳"
                          >
                            <CheckCircle2 size={11} />
                            一鍵已入帳
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
