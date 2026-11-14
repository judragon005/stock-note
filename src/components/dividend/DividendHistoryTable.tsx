import React from 'react';
import { Award, Coins, Search, CheckCircle2, Clock } from 'lucide-react';
import { TradeRecord, MarketType, HoldingPosition } from '../../types/stock';
import { ReceivableDividend } from '../../types/dividend';
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
  reconciliationList: AnnualReconciliationItem[];
  showReconciliationPanel: boolean;
  onToggleReconciliationPanel: () => void;
  onInstantSettle?: (tradeId: string) => void;
  dueReceivables?: ReceivableDividend[];
  onSettleReceivable?: (rec: ReceivableDividend) => void;
}

interface FillStatusStyle {
  bg: string;
  color: string;
  border: string;
}

const FILL_STATUS_STYLE_MAP: Record<string, FillStatusStyle> = {
  FILLED: {
    bg: 'rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.4)',
  },
  UNFILLED: {
    bg: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  CLOSED_POSITION: {
    bg: 'rgba(100, 116, 139, 0.2)',
    color: '#94a3b8',
    border: '1px solid rgba(100, 116, 139, 0.4)',
  },
  PENDING_DATA: {
    bg: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(245, 158, 11, 0.35)',
  },
};

/**
 * 實質填息狀態自癒膠囊元件 (Spec 0229)
 * 消除行內三元巢狀運算，統一樣式呈現
 */
export const DividendFillStatusBadge: React.FC<{ status: import('../../engine/dividendMetricsEngine').DividendFillStatus }> = ({ status }) => {
  const style = FILL_STATUS_STYLE_MAP[status] || FILL_STATUS_STYLE_MAP.PENDING_DATA;
  return (
    <span
      style={{
        fontSize: '0.65rem',
        padding: '1px 5px',
        borderRadius: '4px',
        background: style.bg,
        color: style.color,
        border: style.border,
      }}
    >
      {formatDividendFillStatusLabel(status)}
    </span>
  );
};

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
  reconciliationList,
  showReconciliationPanel,
  onToggleReconciliationPanel,
  onInstantSettle,
  dueReceivables = [],
  onSettleReceivable,
}) => {
  // 建立標的持倉快速比對 Map
  const holdingsMap = React.useMemo(() => {
    const map = new Map<string, HoldingPosition>();
    holdings.forEach((h) => map.set(h.symbol.toUpperCase(), h));
    return map;
  }, [holdings]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

        {/* 統計口徑與待入帳提示橫幅 (Spec 0227 / Ticket 04) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(51, 65, 85, 0.6)',
            fontSize: '0.74rem',
            color: '#cbd5e1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>📌 統計口徑說明：本表為銀行已入帳實領流水</span>
            <span style={{ color: '#94a3b8' }}>
              （已到期並完成交割之正式入帳紀錄）。若有除息基準日已過、款項尚未撥入銀行之股票，請參閱上方「除息待入帳行事曆」；收到網銀通知時可一鍵轉化入帳。
            </span>
          </div>
          <a
            href="#receivable-calendar"
            data-testid="jump-to-receivable-calendar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
              fontSize: '0.72rem',
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            查閱除息待入帳行事曆 ➔
          </a>
        </div>

        {/* 官方已發放·待核對入帳專區 (Spec 0228 / Ticket 04: 消滅時序黑洞) */}
        {dueReceivables.length > 0 && (
          <div
            data-testid="due-reconciliation-banner"
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="#fbbf24" />
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#fef3c7' }}>
                  ⚡ 官方已發放·待核對入帳款項 (共 {dueReceivables.length} 筆已到期)
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  （官方發放日已過，網銀確認入帳後請點擊「確認入帳」直接轉為正式交易）
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
              {dueReceivables.map((rec) => {
                const isUS = rec.market === 'US' || rec.currency === 'USD';
                const shares = rec.sharesHeldOnExDate || rec.sharesHeld || 0;
                const formattedShares = isUS ? shares.toLocaleString() : Math.round(shares).toLocaleString();
                const netTWD = rec.estimatedNetDividendInTWD;

                return (
                  <div
                    key={rec.id}
                    data-testid={`due-item-${rec.symbol}`}
                    style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <b style={{ color: '#ffffff', fontSize: '0.88rem' }}>{rec.symbol}</b>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{rec.name}</span>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                          發放日: {rec.payDate} (已屆期)
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.72rem', color: '#cbd5e1' }}>
                      <div>除息日: <b className="mono" style={{ color: '#ffffff' }}>{rec.exDate}</b></div>
                      <div>在庫股數: <b className="mono" style={{ color: '#38bdf8' }}>{formattedShares} 股</b></div>
                      <div>每股配息: <b className="mono" style={{ color: '#34d399' }}>{rec.cashDividendPerShare} {rec.currency}</b></div>
                      <div>實領金額: <b className="mono" style={{ color: '#34d399', fontWeight: 800 }}>NT$ {netTWD.toLocaleString()}</b></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                      <button
                        type="button"
                        data-testid={`btn-settle-${rec.symbol}`}
                        onClick={() => {
                          if (onSettleReceivable) {
                            onSettleReceivable(rec);
                          } else if (onInstantSettle) {
                            onInstantSettle(rec.id);
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(16, 185, 129, 0.6)',
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.4) 100%)',
                          color: '#34d399',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        title="將此筆官方已到期股利寫入正式交易紀錄"
                      >
                        <CheckCircle2 size={13} />
                        確認網銀已入帳
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

                  const rawExPrice = t.exPrice !== undefined
                    ? t.exPrice
                    : t.referencePrice !== undefined
                    ? t.referencePrice - t.price
                    : undefined;

                  const isClosedPosition = !holding || holding.shares <= 0;
                  const fillStatus = determineDividendFillStatus({
                    currentPrice: holding ? holding.currentPrice : 0,
                    exPrice: rawExPrice,
                    dividendPerShare: t.price,
                    isClosedPosition: isClosedPosition,
                  });

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
                          {fillStatus && <DividendFillStatusBadge status={fillStatus} />}
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
