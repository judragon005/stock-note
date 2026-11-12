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
  // 若生活開銷基準高於當前最高月配息，計算刻度上限
  const chartMaxVal = Math.max(maxMonthlyNet, targetMonthlyExpenseTwd, 1000);
  const expenseLinePercent = chartMaxVal > 0 ? (targetMonthlyExpenseTwd / chartMaxVal) * 100 : 0;

  return (
    <div
      className="glass-card"
      style={{
        gridColumn: 'span 2',
        padding: '20px',
        borderRadius: '16px',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '16px',
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
        {/* 生活費目標參考水平線 */}
        {targetMonthlyExpenseTwd > 0 && expenseLinePercent <= 100 && (
          <div
            style={{
              position: 'absolute',
              bottom: `${Math.min(170, Math.round((targetMonthlyExpenseTwd / chartMaxVal) * 135) + 26)}px`,
              left: 0,
              right: 0,
              borderTop: '1px dashed #38bdf8',
              opacity: 0.75,
              pointerEvents: 'none',
              display: 'flex',
              justifyContent: 'flex-end',
              paddingRight: '6px',
              zIndex: 1,
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

        {/* 柱狀網格 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '6px',
            height: '100%',
            alignItems: 'flex-end',
          }}
        >
          {monthlyDistribution.map((m, idx) => {
            const displayVal = dividendDisplayMode === 'GROSS' ? m.grossTWD : m.netTWD;
            const barHeightPx = chartMaxVal > 0 ? Math.round((displayVal / chartMaxVal) * 130) : 0;
            const hasData = displayVal > 0;
            const meetsExpense = targetMonthlyExpenseTwd > 0 && displayVal >= targetMonthlyExpenseTwd;

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
                    <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
                      <div style={{ fontWeight: 700, color: '#34d399', borderBottom: '1px solid rgba(51,65,85,0.6)', paddingBottom: '4px' }}>
                        📅 {selectedYear} 年 {m.monthLabel} 股息明細
                      </div>
                      {hasData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>實領入帳：</span>
                            <b className="mono" style={{ color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>
                              NT$ {m.netTWD.toLocaleString()}
                            </b>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>應發毛額：</span>
                            <span className="mono" style={{ color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>
                              NT$ {m.grossTWD.toLocaleString()}
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
                            <span className="mono" style={{ color: '#ffffff' }}>{m.count} 筆</span>
                          </div>
                          {targetMonthlyExpenseTwd > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(51,65,85,0.5)', paddingTop: '3px', marginTop: '2px' }}>
                              <span style={{ color: '#38bdf8' }}>生活費覆蓋率：</span>
                              <b className="mono" style={{ color: meetsExpense ? '#34d399' : '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                                {((displayVal / targetMonthlyExpenseTwd) * 100).toFixed(1)}%
                              </b>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>該月份尚無配息入帳紀錄</div>
                      )}
                    </div>
                  }
                >
                  <div
                    style={{
                      width: '100%',
                      minWidth: '16px',
                      maxWidth: '36px',
                      height: `${hasData ? Math.max(14, barHeightPx) : 6}px`,
                      borderRadius: '6px 6px 2px 2px',
                      background: hasData
                        ? meetsExpense
                          ? 'linear-gradient(180deg, #10b981 0%, #047857 100%)'
                          : 'linear-gradient(180deg, #34d399 0%, #059669 100%)'
                        : 'rgba(51, 65, 85, 0.3)',
                      boxShadow: hasData ? (meetsExpense ? '0 0 14px rgba(16, 185, 129, 0.5)' : '0 0 10px rgba(16, 185, 129, 0.3)') : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: meetsExpense ? '1px solid rgba(52, 211, 153, 0.8)' : 'none',
                    }}
                  />
                </Tooltip>
                <span
                  style={{
                    fontSize: '0.72rem',
                    marginTop: '6px',
                    color: hasData ? '#34d399' : '#64748b',
                    fontWeight: hasData ? 700 : 500,
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
        <span>💡 提示：綠色長條代表該月有配息入帳，滑鼠懸浮柱狀條可檢視該月份實領與扣稅細節。</span>
        {targetMonthlyExpenseTwd > 0 && (
          <span style={{ color: '#38bdf8' }}>🎯 藍色虛線為每月 NT$ {targetMonthlyExpenseTwd.toLocaleString()} 生活開銷門檻</span>
        )}
      </div>
    </div>
  );
};
