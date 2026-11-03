import React from 'react';
import { TrendingUp, ChevronDown, ChevronUp, Star, Zap } from 'lucide-react';
import { ScannedStockItem, BEGINNER_TOOLTIPS } from '../../../engine/muscleBookerEngine';
import { Tooltip } from '../../common/Tooltip';
import { formatCurrencyPrice } from '../../MuscleBookerWorkspace';

export interface DeductionTelescopeTableProps {
  filteredItems: ScannedStockItem[];
  watchlistSymbols: string[];
  expandedSymbol: string | null;
  onToggleExpand: (symbol: string) => void;
  onToggleWatchlist: (symbol: string) => void;
}

export const DeductionTelescopeTable: React.FC<DeductionTelescopeTableProps> = ({
  filteredItems,
  watchlistSymbols,
  expandedSymbol,
  onToggleExpand,
  onToggleWatchlist,
}) => {
  const [pageSize, setPageSize] = React.useState<number | 'ALL'>(50);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filteredItems.length, pageSize]);

  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedItems = pageSize === 'ALL'
    ? filteredItems
    : filteredItems.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const deductionUpItems = filteredItems.filter((i) => i.ma20Slope === 'UP');

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div className="warroom-section-header">
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: 'var(--accent-emerald)' }} />
            均線扣抵望遠鏡：月線扣低翻揚助漲先鋒 (MA Deduction Telescope)
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            提前推算未來 3~5 日扣抵價 · 現價大幅高於扣抵值 · 月均線即將翻揚助漲
          </span>
        </div>
        <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)' }}>
          {deductionUpItems.length} 檔翻揚先鋒
        </span>
      </div>

      <div className="warroom-table-container">
        <table className="warroom-table">
          <thead>
            <tr>
              <th>代號 / 標的名稱</th>
              <th style={{ textAlign: 'right' }}>現價</th>
              <th style={{ textAlign: 'right' }}>
                <Tooltip content={BEGINNER_TOOLTIPS.maDeductionTelescope} position="top">
                  <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>MA20 扣抵價 ℹ️</span>
                </Tooltip>
              </th>
              <th style={{ textAlign: 'center' }}>扣抵斜率預測</th>
              <th style={{ textAlign: 'center' }}>箱體位階</th>
              <th style={{ textAlign: 'center' }}>操盤建議</th>
              <th style={{ textAlign: 'center' }}>
                <Tooltip content={BEGINNER_TOOLTIPS.riskReward} position="top">
                  <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>防守價 / 風益比 ℹ️</span>
                </Tooltip>
              </th>
              <th style={{ textAlign: 'center', width: '60px' }}>自訂觀察</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.map((item) => {
              const isExpanded = expandedSymbol === item.symbol;
              const isWatched = watchlistSymbols.includes(item.symbol);
              return (
                <React.Fragment key={item.symbol}>
                  <tr
                    onClick={() => onToggleExpand(item.symbol)}
                    style={{ cursor: 'pointer', background: isExpanded ? 'rgba(56, 189, 248, 0.06)' : undefined }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="mono" style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.symbol}</span>
                        {isExpanded ? <ChevronUp size={13} style={{ color: 'var(--accent-cyan)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.name}</div>
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                      {formatCurrencyPrice(item.currentPrice, item.market)}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {formatCurrencyPrice(item.ma20DeductionPrice, item.market)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.isDataPending ? (
                        <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.3)', color: 'var(--text-muted)' }}>
                          --
                        </span>
                      ) : item.ma20Slope === 'UP' ? (
                        <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)' }}>
                          📈 扣低翻揚助漲
                        </span>
                      ) : item.ma20Slope === 'DOWN' ? (
                        <span className="badge" style={{ background: 'var(--loss-bg)', color: 'var(--loss-color)' }}>
                          📉 扣高下彎警戒
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.4)', color: 'var(--text-muted)' }}>
                          平緩盤整
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.isDataPending ? (
                        <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.3)', color: 'var(--text-muted)' }}>
                          資料未就緒
                        </span>
                      ) : item.boxStatus === 'BREAKOUT_UP' ? (
                        <span className="badge" style={{ background: 'var(--gain-bg)', color: 'var(--gain-color)' }}>
                          🔥 箱頂突破
                        </span>
                      ) : item.boxStatus === 'BREAKOUT_DOWN' ? (
                        <span className="badge" style={{ background: 'var(--loss-bg)', color: 'var(--loss-color)' }}>
                          ⚠️ 跌破箱底
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.3)', color: 'var(--text-secondary)' }}>
                          箱內整理
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.isDataPending ? (
                        <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.35)' }}>
                          🟡 回補中...
                        </span>
                      ) : item.actionDecision.action === 'BUY' ? (
                        <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                          🟢 建議買進
                        </span>
                      ) : item.actionDecision.action === 'AVOID' ? (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                          ⛔ 觀望不碰
                        </span>
                      ) : item.actionDecision.action === 'SELL' ? (
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                          🔴 建議賣出
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(51, 65, 85, 0.3)', color: 'var(--text-secondary)' }}>
                          ⚪ 區間觀望
                        </span>
                      )}
                    </td>
                    <td className="mono" style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                      {item.actionDecision.stopLossPrice ? (
                        <span>
                          防守: {formatCurrencyPrice(item.actionDecision.stopLossPrice, item.market)}
                          {item.actionDecision.riskRewardRatio && ` (${item.actionDecision.riskRewardRatio})`}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlist(item.symbol);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: isWatched ? '#fde047' : 'var(--text-muted)',
                          padding: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={isWatched ? '從自訂觀察移除' : '加入自訂觀察'}
                      >
                        <Star size={15} fill={isWatched ? '#fde047' : 'none'} />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ background: 'rgba(56, 189, 248, 0.04)' }}>
                      <td colSpan={8} style={{ padding: '10px 16px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Zap size={14} style={{ color: 'var(--accent-amber)' }} />
                          <strong>實戰操盤指引：</strong>
                          <span>{item.actionDecision.actionReason}</span>
                          {item.actionDecision.targetPrice && (
                            <span style={{ color: '#38bdf8', marginLeft: 'auto' }}>
                              目標價: {formatCurrencyPrice(item.actionDecision.targetPrice, item.market)}
                            </span>
                          )}
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

      {/* 分頁控制器 (Ticket 06) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.4)',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>每頁顯示：</span>
          {([50, 100, 'ALL'] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setPageSize(size)}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.78rem',
                border: pageSize === size ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                background: pageSize === size ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: pageSize === size ? '#38bdf8' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {size === 'ALL' ? '全部' : size}
            </button>
          ))}
          <span style={{ marginLeft: '8px' }}>
            共 {filteredItems.length} 檔標的
          </span>
        </div>

        {pageSize !== 'ALL' && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: safeCurrentPage <= 1 ? 'rgba(148, 163, 184, 0.4)' : '#cbd5e1',
                cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              上一頁
            </button>
            <span>
              第 {safeCurrentPage} / {totalPages} 頁
            </span>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: safeCurrentPage >= totalPages ? 'rgba(148, 163, 184, 0.4)' : '#cbd5e1',
                cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              下一頁
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
