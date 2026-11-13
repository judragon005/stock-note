import { Calendar, Target } from 'lucide-react';
import { MonthlyDividendDistribution } from '../../types/dividend';
import { Tooltip } from '../common/Tooltip';

export type DividendDisplayMode = 'GROSS' | 'NET';

export interface DividendMonthlyChartProps {
  monthlyDistribution: MonthlyDividendDistribution[];
  maxMonthlyNet: number;
  targetMonthlyExpenseTwd?: number; // 預設 35,000 元
  dividendDisplayMode: DividendDisplayMode;
  selectedYear: number;
}

/**
 * 月度現金流長條圖 Tooltip 智慧避讓對齊演算法 (防禦 Tooltip 跨卡片覆蓋 Bug)
 * 1~2 月 (索引 0~1) 靠左展開 (align='left')
 * 3~9 月 (索引 2~8) 居中展開 (align='center')
 * 10~12 月 (索引 9~11) 靠右展開向左延伸 (align='right')
 */
export function calculateMonthTooltipAlign(monthIndex: number): 'left' | 'center' | 'right' {
  if (monthIndex < 2) return 'left';
  if (monthIndex >= 9) return 'right';
  return 'center';
}

export const DividendMonthlyChart: React.FC<DividendMonthlyChartProps> = ({
  monthlyDistribution,
  maxMonthlyNet,
  targetMonthlyExpenseTwd = 35000,
  dividendDisplayMode,
  selectedYear,
}) => {
  // 自動依據當前顯示模式 (毛額 GROSS / 淨額 NET) 計算動態最大值（含已實領與待入帳總額），防止分母失真
  const currentMaxVal = Math.max(
    ...monthlyDistribution.map((m) => {
      const received = dividendDisplayMode === 'GROSS' ? m.grossTWD : m.netTWD;
      const pending = dividendDisplayMode === 'GROSS' ? (m.pendingGrossTWD || 0) : (m.pendingNetTWD || 0);
      return received + pending;
    }),
    maxMonthlyNet,
    1000
  );

  // 若生活開銷基準高於當前最高月配息，計算刻度上限
  const chartMaxVal = Math.max(currentMaxVal, targetMonthlyExpenseTwd, 1000);
  const expenseLinePercent = chartMaxVal > 0 ? (targetMonthlyExpenseTwd / chartMaxVal) * 100 : 0;

  // 統一基準幾何參數 (消除魔術數字，達成 0 誤差對齊)
  const BASELINE_LABEL_HEIGHT_PX = 24; // 月份標籤高度與間隔
  const BAR_SCALE_HEIGHT_PX = 120;     // 長條柱刻度滿格高度
  const expenseLineBottomPx = BASELINE_LABEL_HEIGHT_PX + Math.round((targetMonthlyExpenseTwd / chartMaxVal) * BAR_SCALE_HEIGHT_PX);

  return (
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
        gap: '16px',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} color="#34d399" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
            {selectedYear} 各月份現金流分佈 (1~12 月)
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.74rem', color: '#94a3b8' }}>
          {targetMonthlyExpenseTwd > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
              <Target size={13} />
              生活費基準: NT$ {targetMonthlyExpenseTwd.toLocaleString()}
            </span>
          )}
          <span>單位：新台幣 TWD</span>
        </div>
      </div>

      {/* 柱狀圖本體與生活費對標水平虛線 */}
      <div
        style={{
          position: 'relative',
          height: '180px',
          borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
          paddingBottom: '8px',
          paddingTop: '20px',
        }}
      >
        {/* 生活費目標參考水平線 (置於 zIndex: 0 背景層，避免貫穿切斷前景長條柱) */}
        {targetMonthlyExpenseTwd > 0 && expenseLinePercent <= 100 && (
          <div
            style={{
              position: 'absolute',
              bottom: `${Math.min(170, expenseLineBottomPx)}px`,
              left: 0,
              right: 0,
              borderTop: '1px dashed #38bdf8',
              opacity: 0.75,
              pointerEvents: 'none',
              display: 'flex',
              justifyContent: 'flex-end',
              paddingRight: '6px',
              zIndex: 0,
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                color: '#38bdf8',
                background: 'rgba(15, 23, 42, 0.85)',
                padding: '0 4px',
                borderRadius: '4px',
                transform: 'translateY(-50%)',
              }}
            >
              🎯 生活費線
            </span>
          </div>
        )}

        {/* 柱狀網格 (置於 zIndex: 1 前景層) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '6px',
            height: '100%',
            alignItems: 'flex-end',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {monthlyDistribution.map((m, idx) => {
            const receivedVal = dividendDisplayMode === 'GROSS' ? m.grossTWD : m.netTWD;
            const pendingVal = dividendDisplayMode === 'GROSS' ? (m.pendingGrossTWD || 0) : (m.pendingNetTWD || 0);
            const totalVal = receivedVal + pendingVal;
            const pendingCount = m.pendingCount || 0;

            const hasReceived = receivedVal > 0;
            const hasPending = pendingVal > 0;
            const hasAnyData = totalVal > 0;

            const totalBarHeightPx = chartMaxVal > 0 ? Math.round((totalVal / chartMaxVal) * BAR_SCALE_HEIGHT_PX) : 0;
            const meetsExpense = targetMonthlyExpenseTwd > 0 && totalVal >= targetMonthlyExpenseTwd;

            // 計算堆疊比例
            const receivedRatio = totalVal > 0 ? receivedVal / totalVal : 0;
            const receivedHeightPx = hasReceived
              ? Math.max(hasPending ? 4 : 14, Math.round(totalBarHeightPx * receivedRatio))
              : 0;
            const pendingHeightPx = hasPending
              ? Math.max(hasReceived ? 4 : 14, totalBarHeightPx - receivedHeightPx)
              : 0;

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: '100%',
                  position: 'relative',
                }}
              >
                <Tooltip
                  align={calculateMonthTooltipAlign(idx)}
                  content={
                    <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '190px' }}>
                      <div style={{ fontWeight: 700, color: hasReceived ? '#34d399' : (hasPending ? '#f59e0b' : '#94a3b8'), borderBottom: '1px solid rgba(51,65,85,0.6)', paddingBottom: '4px' }}>
                        📅 {selectedYear} 年 {m.monthLabel} 股息明細
                      </div>
                      {hasAnyData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>實領入帳：</span>
                            <b className="mono" style={{ color: hasReceived ? '#34d399' : '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                              NT$ {m.netTWD.toLocaleString()}
                            </b>
                          </div>
                          {hasPending && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#f59e0b' }}>待入帳應收：</span>
                              <b className="mono" style={{ color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                                +NT$ {pendingVal.toLocaleString()}{pendingCount > 0 ? ` (${pendingCount} 筆)` : ''}
                              </b>
                            </div>
                          )}
                          {hasPending && hasReceived && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(51,65,85,0.6)', paddingTop: '2px' }}>
                              <span style={{ color: '#38bdf8' }}>預期入帳總額：</span>
                              <b className="mono" style={{ color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>
                                NT$ {totalVal.toLocaleString()}
                              </b>
                            </div>
                          )}
                          {!hasReceived && hasPending && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(51,65,85,0.6)', paddingTop: '2px' }}>
                              <span style={{ color: '#38bdf8' }}>預期入帳總額：</span>
                              <b className="mono" style={{ color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>
                                NT$ {totalVal.toLocaleString()}
                              </b>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>應發毛額：</span>
                            <span className="mono" style={{ color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>
                              NT$ {(m.grossTWD + (m.pendingGrossTWD || 0)).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>扣繳稅款/健保：</span>
                            <span className="mono" style={{ color: m.taxTWD > 0 ? 'var(--loss-color)' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                              {m.taxTWD > 0 ? `-NT$ ${m.taxTWD.toLocaleString()}` : 'NT$ 0'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>配息筆數：</span>
                            <span className="mono" style={{ color: '#ffffff' }}>
                              {m.count + pendingCount} 筆 {pendingCount > 0 ? `(含 ${pendingCount} 筆待入帳)` : ''}
                            </span>
                          </div>
                          {targetMonthlyExpenseTwd > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(51,65,85,0.5)', paddingTop: '3px', marginTop: '2px' }}>
                              <span style={{ color: '#38bdf8' }}>生活費覆蓋率：</span>
                              <b className="mono" style={{ color: meetsExpense ? '#34d399' : '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                                {((totalVal / targetMonthlyExpenseTwd) * 100).toFixed(1)}%
                              </b>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>該月份尚無配息入帳或待入帳紀錄</div>
                      )}
                    </div>
                  }
                >
                  {hasAnyData ? (
                    <div
                      aria-label={`${selectedYear}年${m.monthLabel}: 實領 NT$ ${m.netTWD.toLocaleString()}${hasPending ? `, 待入帳應收 NT$ ${pendingVal.toLocaleString()}` : ''}`}
                      style={{
                        width: '100%',
                        minWidth: '16px',
                        maxWidth: '36px',
                        height: `${Math.max(14, totalBarHeightPx)}px`,
                        display: 'flex',
                        flexDirection: 'column-reverse',
                        borderRadius: '6px 6px 2px 2px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: meetsExpense
                          ? '0 0 14px rgba(16, 185, 129, 0.45)'
                          : hasPending && !hasReceived
                            ? '0 0 10px rgba(245, 158, 11, 0.35)'
                            : '0 0 10px rgba(16, 185, 129, 0.25)',
                        border: meetsExpense
                          ? '1px solid rgba(52, 211, 153, 0.8)'
                          : hasPending && !hasReceived
                            ? '1px dashed rgba(245, 158, 11, 0.8)'
                            : 'none',
                      }}
                    >
                      {/* 下層：已實領綠柱 */}
                      {hasReceived && (
                        <div
                          style={{
                            width: '100%',
                            height: hasPending ? `${receivedHeightPx}px` : '100%',
                            background: meetsExpense && !hasPending
                              ? 'linear-gradient(180deg, #10b981 0%, #047857 100%)'
                              : 'linear-gradient(180deg, #34d399 0%, #059669 100%)',
                            borderRadius: hasPending ? '0 0 2px 2px' : '6px 6px 2px 2px',
                          }}
                        />
                      )}
                      {/* 上層：待入帳金黃柱 */}
                      {hasPending && (
                        <div
                          style={{
                            width: '100%',
                            height: hasReceived ? `${pendingHeightPx}px` : '100%',
                            background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                            borderRadius: hasReceived ? '6px 6px 0 0' : '6px 6px 2px 2px',
                            opacity: 0.92,
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        minWidth: '16px',
                        maxWidth: '36px',
                        height: '6px',
                        borderRadius: '6px 6px 2px 2px',
                        background: 'rgba(51, 65, 85, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  )}
                </Tooltip>
                <span
                  style={{
                    fontSize: '0.72rem',
                    marginTop: '6px',
                    color: hasReceived ? '#34d399' : (hasPending ? '#f59e0b' : '#64748b'),
                    fontWeight: hasAnyData ? 700 : 500,
                  }}
                >
                  {idx + 1}月
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
        <span>💡 提示：綠色代表已實領入帳，金黃色代表待入帳應收股利。滑鼠懸浮柱狀條可檢視三態細節與扣稅拆解。</span>
        {targetMonthlyExpenseTwd > 0 && (
          <span style={{ color: '#38bdf8' }}>🎯 藍色虛線為每月 NT$ {targetMonthlyExpenseTwd.toLocaleString()} 生活開銷門檻</span>
        )}
      </div>
    </div>
  );
};
