import React from 'react';
import { Compass } from 'lucide-react';
import { ProjectedCashflowResult, ComplementaryRecommendation } from '../../engine/projectedCashflowEngine';
import { DividendTaxDeductionStats } from '../../engine/taxOptimizationGuard';

export interface DividendCalendarCardProps {
  projectedCashflow: ProjectedCashflowResult;
  complementaryRecommendations: ComplementaryRecommendation[];
  taxStats: DividendTaxDeductionStats;
  targetMonthlyExpenseTwd?: number; // 預設 35,000 元
  onTargetExpenseChange?: (val: number) => void;
  zavyDividendPlanSummary?: string; // 複用 zavySlowWealthEngine 活水轉向指引
  isCashflowExpanded: boolean;
  onToggleExpand: () => void;
}

const PRESET_EXPENSE_TARGETS = [30000, 35000, 40000, 50000];

export const DividendCalendarCard: React.FC<DividendCalendarCardProps> = ({
  projectedCashflow,
  complementaryRecommendations,
  taxStats,
  targetMonthlyExpenseTwd = 35000,
  onTargetExpenseChange,
  zavyDividendPlanSummary,
  isCashflowExpanded,
  onToggleExpand,
}) => {
  const [isEditingCustom, setIsEditingCustom] = React.useState<boolean>(false);
  const [customValue, setCustomValue] = React.useState<string>(String(targetMonthlyExpenseTwd));

  const fiCoverageRatioPct = targetMonthlyExpenseTwd > 0
    ? ((projectedCashflow.monthlyAverageTwd / targetMonthlyExpenseTwd) * 100)
    : 0;

  const handleCustomSubmit = () => {
    const val = parseInt(customValue, 10);
    if (!isNaN(val) && val > 0) {
      onTargetExpenseChange?.(val);
    }
    setIsEditingCustom(false);
  };

  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        padding: '20px',
        borderRadius: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📅</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              未來 12 個月現金流預估行事曆
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              全年預估: <strong style={{ color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>NT$ {projectedCashflow.annualTotalTwd.toLocaleString()}</strong> · 月均: <strong style={{ color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>NT$ {Math.round(projectedCashflow.monthlyAverageTwd).toLocaleString()}</strong>
              {targetMonthlyExpenseTwd > 0 && (
                <span>
                  {' '}· 生活費覆蓋: <strong style={{ color: fiCoverageRatioPct >= 100 ? '#34d399' : '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{fiCoverageRatioPct.toFixed(1)}%</strong>
                  {onTargetExpenseChange && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>(目標:</span>
                      {PRESET_EXPENSE_TARGETS.map((amt) => {
                        const isSelected = targetMonthlyExpenseTwd === amt && !isEditingCustom;
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => {
                              setIsEditingCustom(false);
                              onTargetExpenseChange(amt);
                            }}
                            style={{
                              background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                              border: `1px solid ${isSelected ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.12)'}`,
                              color: isSelected ? '#38bdf8' : '#94a3b8',
                              borderRadius: '4px',
                              padding: '1px 5px',
                              fontSize: '10px',
                              cursor: 'pointer',
                              fontWeight: isSelected ? 700 : 500,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                            title={`切換每月生活費基準為 NT$ ${amt.toLocaleString()}`}
                          >
                            {amt / 1000}k
                          </button>
                        );
                      })}
                      {isEditingCustom ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <input
                            type="number"
                            className="mono"
                            value={customValue}
                            onChange={(e) => setCustomValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCustomSubmit();
                              if (e.key === 'Escape') setIsEditingCustom(false);
                            }}
                            style={{
                              width: '65px',
                              padding: '1px 4px',
                              fontSize: '10px',
                              borderRadius: '3px',
                              border: '1px solid #38bdf8',
                              background: 'rgba(15, 23, 42, 0.9)',
                              color: '#ffffff',
                              outline: 'none',
                            }}
                            autoFocus
                            placeholder="如 45000"
                          />
                          <button
                            type="button"
                            onClick={handleCustomSubmit}
                            style={{
                              background: '#38bdf8',
                              color: '#0f172a',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '1px 4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            確定
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomValue(String(targetMonthlyExpenseTwd));
                            setIsEditingCustom(true);
                          }}
                          style={{
                            background: !PRESET_EXPENSE_TARGETS.includes(targetMonthlyExpenseTwd) ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                            border: `1px solid ${!PRESET_EXPENSE_TARGETS.includes(targetMonthlyExpenseTwd) ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.12)'}`,
                            color: !PRESET_EXPENSE_TARGETS.includes(targetMonthlyExpenseTwd) ? '#38bdf8' : '#94a3b8',
                            borderRadius: '4px',
                            padding: '1px 5px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontWeight: !PRESET_EXPENSE_TARGETS.includes(targetMonthlyExpenseTwd) ? 700 : 500,
                          }}
                          title="自訂義生活費目標金額"
                        >
                          {!PRESET_EXPENSE_TARGETS.includes(targetMonthlyExpenseTwd)
                            ? `自訂 (${Math.round(targetMonthlyExpenseTwd / 1000)}k)`
                            : '自訂'}
                        </button>
                      )}
                      <span style={{ fontSize: '11px', color: '#64748b' }}>)</span>
                    </span>
                  )}
                </span>
              )}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', marginRight: '6px' }}>
            8.5% 綜所稅抵扣額剩餘: <strong style={{ color: taxStats.isCapReached ? '#ef4444' : '#34d399', fontVariantNumeric: 'tabular-nums' }}>NT$ {taxStats.remainingDeductionCapacityTwd.toLocaleString()}</strong> (上限8萬)
          </span>
          <button
            type="button"
            onClick={onToggleExpand}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {isCashflowExpanded ? '收合月曆' : '展開月曆'}
          </button>
        </div>
      </div>

      {isCashflowExpanded && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px', marginBottom: '12px' }}>
            {projectedCashflow.months.map((m) => {
              const isCovered = targetMonthlyExpenseTwd > 0 && m.estimatedTotalTwd >= targetMonthlyExpenseTwd;
              return (
                <div
                  key={m.yearMonth}
                  style={{
                    backgroundColor: m.isDrySeason
                      ? 'rgba(239, 68, 68, 0.12)'
                      : isCovered
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(30, 41, 59, 0.65)',
                    border: `1px solid ${
                      m.isDrySeason
                        ? 'rgba(239, 68, 68, 0.35)'
                        : isCovered
                        ? 'rgba(16, 185, 129, 0.35)'
                        : 'rgba(255, 255, 255, 0.08)'
                    }`,
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  title={m.breakdown.map((b) => `${b.name}: NT$ ${b.estimatedAmountTwd.toLocaleString()}`).join('\n') || '無預估入帳'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: m.isDrySeason ? '#fca5a5' : '#cbd5e1' }}>
                      {m.monthNumber}月
                    </span>
                    {m.isDrySeason ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#f87171',
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                        }}
                      >
                        枯水期
                      </span>
                    ) : isCovered ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#34d399',
                          backgroundColor: 'rgba(16, 185, 129, 0.2)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                        }}
                      >
                        達標
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: m.estimatedTotalTwd > 0
                        ? m.isDrySeason
                          ? '#fbbf24'
                          : '#34d399'
                        : '#64748b',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.2px',
                      marginBottom: '4px',
                    }}
                  >
                    {m.estimatedTotalTwd > 0 ? `NT$ ${Math.round(m.estimatedTotalTwd).toLocaleString()}` : '-'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{m.breakdown.length > 0 ? `${m.breakdown.length} 筆配息` : '無預估入帳'}</span>
                    {targetMonthlyExpenseTwd > 0 && m.estimatedTotalTwd > 0 && (
                      <span style={{ color: isCovered ? '#34d399' : '#94a3b8', fontWeight: 600 }}>
                        {Math.round((m.estimatedTotalTwd / targetMonthlyExpenseTwd) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 枯水期互補推薦 */}
          {projectedCashflow.drySeasonMonths.length > 0 && complementaryRecommendations.length > 0 && (
            <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '12px', color: '#fde68a', marginBottom: '8px' }}>
              💡 <strong>現金流互補配置推薦：</strong> 您在 {projectedCashflow.drySeasonMonths.join('、')} 月為現金流枯水期，可評估納入 <strong>{complementaryRecommendations.slice(0, 3).map((r) => `${r.name} (${r.symbol})`).join('、')}</strong> 以填補月度開銷缺口。
            </div>
          )}

          {/* Zavy 股息活水轉向指引 (大卡車/小車防禦注入) */}
          {zavyDividendPlanSummary && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontSize: '12px',
                color: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Compass size={16} color="#38bdf8" />
              <div style={{ flex: 1, lineHeight: 1.45 }}>
                <strong style={{ color: '#38bdf8' }}>Zavy 股息活水轉向：</strong> {zavyDividendPlanSummary}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
