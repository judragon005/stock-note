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

export const DividendCalendarCard: React.FC<DividendCalendarCardProps> = ({
  projectedCashflow,
  complementaryRecommendations,
  taxStats,
  targetMonthlyExpenseTwd = 35000,
  zavyDividendPlanSummary,
  isCashflowExpanded,
  onToggleExpand,
}) => {
  const fiCoverageRatioPct = targetMonthlyExpenseTwd > 0
    ? ((projectedCashflow.monthlyAverageTwd / targetMonthlyExpenseTwd) * 100)
    : 0;

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
                <span> · 生活費覆蓋: <strong style={{ color: fiCoverageRatioPct >= 100 ? '#34d399' : '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{fiCoverageRatioPct.toFixed(1)}%</strong></span>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '6px', marginBottom: '12px' }}>
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
                    padding: '8px 4px',
                    textAlign: 'center',
                  }}
                  title={m.breakdown.map((b) => `${b.name}: NT$ ${b.estimatedAmountTwd.toLocaleString()}`).join('\n') || '無預估入帳'}
                >
                  <div style={{ fontSize: '11px', color: m.isDrySeason ? '#fca5a5' : '#94a3b8', marginBottom: '4px' }}>
                    {m.monthNumber}月
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: m.estimatedTotalTwd > 0
                        ? m.isDrySeason
                          ? '#fbbf24'
                          : '#34d399'
                        : '#64748b',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {m.estimatedTotalTwd > 0 ? `${Math.round(m.estimatedTotalTwd / 1000)}k` : '-'}
                  </div>
                  {m.isDrySeason && (
                    <div style={{ fontSize: '9px', color: '#f87171', marginTop: '2px', fontWeight: 700 }}>
                      枯水期
                    </div>
                  )}
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
