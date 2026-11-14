import React, { useState, useMemo } from 'react';
import { useTaipeiDateStr } from '../hooks/useTaipeiDateStr';
import {
  Coins,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { TradeRecord, MarketType, HoldingPosition } from '../types/stock';
import { ReceivableDividend } from '../types/dividend';
import {
  aggregateDividendReport,
  getEffectiveDividendPayDate,
  extractHistoricalPayoutMonths,
  buildUnifiedPendingReceivables,
} from '../engine/dividendAggregator';
import { resolveEffectiveDividendTaxAndNet } from '../engine/taxComplianceEngine';
import { generate12MonthProjectedCashflow, recommendComplementaryDividendMonths } from '../engine/projectedCashflowEngine';
import { calculateDividendTaxDeductionStats } from '../engine/taxOptimizationGuard';

import { DividendMonthlyChart, calculateMonthTooltipAlign, DividendDisplayMode } from './dividend/DividendMonthlyChart';
import { DividendKpiSummary } from './dividend/DividendKpiSummary';
import { DividendCalendarCard } from './dividend/DividendCalendarCard';
import { DividendTopContributorsCard } from './dividend/DividendTopContributorsCard';
import { DividendHistoryTable, AnnualReconciliationItem } from './dividend/DividendHistoryTable';
import { loadLoanRecordsFromStorage } from '../utils/storage';
import { calculateLoanInterestAndPayoff } from '../engine/cashLedgerEngine';

// 保持 100% 向後相容之對外匯出
export { calculateMonthTooltipAlign };
export type { DividendDisplayMode };

export interface DividendLogViewProps {
  trades: TradeRecord[];
  holdings?: HoldingPosition[];
  receivableDividends: ReceivableDividend[];
  usdToTwdRate: number;
  market?: 'ALL' | MarketType;
  selectedAccountId?: string;
  onSyncCorporateActions?: () => void;
  isSyncingCorporateActions?: boolean;
  onInstantSettleDividend?: (dividendId: string, actualPayDate: string) => void;
}

export const DividendLogView: React.FC<DividendLogViewProps> = ({
  trades,
  holdings = [],
  receivableDividends,
  usdToTwdRate,
  market = 'ALL',
  selectedAccountId = 'ALL',
  onSyncCorporateActions,
  isSyncingCorporateActions = false,
  onInstantSettleDividend,
}) => {
  const todayStr = useTaipeiDateStr();
  const currentYear = Number(todayStr.slice(0, 4));
  const currentYearMonth = todayStr.slice(0, 7);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rankMode, setRankMode] = useState<'YEAR' | 'ALL_TIME'>('YEAR');
  const [tableYearFilter, setTableYearFilter] = useState<'SELECTED_YEAR' | 'ALL'>('SELECTED_YEAR');
  const [dividendDisplayMode, setDividendDisplayMode] = useState<DividendDisplayMode>('GROSS');
  const [isCashflowExpanded, setIsCashflowExpanded] = useState<boolean>(true);
  const [showReconciliationPanel, setShowReconciliationPanel] = useState(false);
  const [targetMonthlyExpenseTwd, setTargetMonthlyExpenseTwd] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('STOCK_TRACKER_DIVIDEND_TARGET_EXPENSE');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return 35000;
  });

  const handleTargetExpenseChange = (val: number) => {
    setTargetMonthlyExpenseTwd(val);
    try {
      localStorage.setItem('STOCK_TRACKER_DIVIDEND_TARGET_EXPENSE', String(val));
    } catch {
      // ignore
    }
  };

  // 1. 依全域市場與帳戶過濾交易、持股、借貸與應收股利 (Spec 0230 Homomorphic Context Closure)
  const scopedHoldings = useMemo(() => {
    return holdings.filter((h) => {
      if (market !== 'ALL' && h.market !== market) return false;
      if (selectedAccountId && selectedAccountId !== 'ALL' && h.accountId && h.accountId !== selectedAccountId) {
        return false;
      }
      return true;
    });
  }, [holdings, market, selectedAccountId]);

  const scopedLoans = useMemo(() => {
    try {
      const loans = loadLoanRecordsFromStorage();
      if (!loans || loans.length === 0) return [];
      return loans.filter((loan) => {
        if (market !== 'ALL') {
          const loanMarket = loan.currency === 'USD' ? 'US' : 'TW';
          if (loanMarket !== market) return false;
        }
        if (selectedAccountId && selectedAccountId !== 'ALL' && loan.accountId && loan.accountId !== selectedAccountId) {
          return false;
        }
        return true;
      });
    } catch {
      return [];
    }
  }, [market, selectedAccountId]);

  // 質押借貸利息支出計算 (連通 cashLedgerEngine，消費 scopedLoans 杜絕跨市場/跨帳戶洩漏)
  const estimatedLoanInterestTWD = useMemo(() => {
    try {
      if (!scopedLoans || scopedLoans.length === 0) return 0;
      return scopedLoans.reduce((sum, loan) => {
        if (!loan.principal || loan.principal <= 0) return sum;
        const fx = loan.currency === 'USD' ? usdToTwdRate : 1;
        const payoff = calculateLoanInterestAndPayoff(loan, todayStr);
        return sum + Math.round((payoff.monthlyEstimatedInterest * 12) * fx);
      }, 0);
    } catch {
      return 0;
    }
  }, [scopedLoans, todayStr, usdToTwdRate]);

  const scopedTrades = useMemo(() => {
    return trades.filter((t) => {
      if (market !== 'ALL' && t.market !== market) return false;
      if (selectedAccountId && selectedAccountId !== 'ALL' && t.accountId && t.accountId !== selectedAccountId) {
        return false;
      }
      return true;
    });
  }, [trades, market, selectedAccountId]);

  const scopedReceivables = useMemo(() => {
    return receivableDividends.filter((r) => {
      if (market !== 'ALL' && r.market !== market) return false;
      if (selectedAccountId && selectedAccountId !== 'ALL' && r.accountId && r.accountId !== selectedAccountId) {
        return false;
      }
      return true;
    });
  }, [receivableDividends, market, selectedAccountId]);

  // 2. 篩選有效之待入帳與待對帳應收款項 (Spec 0228 / Ticket 03)
  // 升級：融合 scopedReceivables 與本地未入帳預約交易 (如華邦電 2026-12-16)，消除雙軌分裂
  const activeReceivables = useMemo(() => {
    return buildUnifiedPendingReceivables(scopedReceivables, scopedTrades, todayStr, usdToTwdRate);
  }, [scopedReceivables, scopedTrades, todayStr, usdToTwdRate]);

  // 3. 彙總年度股利報表與現金流投影 (Spec 0230: 消費 activeReceivables 實現長條圖與卡片 100% SSOT 對齊)
  const report = useMemo(() => {
    return aggregateDividendReport(scopedTrades, activeReceivables, selectedYear, usdToTwdRate, todayStr);
  }, [scopedTrades, activeReceivables, selectedYear, usdToTwdRate, todayStr]);

  // 萃取各標的歷史已入帳交易之實際發放月份慣性 (SSOT Learning 純函式下沉，注入 todayStr 時序因果屏障)
  const historicalPayoutMonthsMap = useMemo(() => {
    return extractHistoricalPayoutMonths(scopedTrades, todayStr);
  }, [scopedTrades, todayStr]);

  const projectedCashflow = useMemo(() => {
    return generate12MonthProjectedCashflow({
      baseYearMonth: currentYearMonth,
      holdings: scopedHoldings,
      historicalPayoutMonths: historicalPayoutMonthsMap,
    });
  }, [scopedHoldings, currentYearMonth, historicalPayoutMonthsMap]);

  const complementaryRecommendations = useMemo(() => {
    return recommendComplementaryDividendMonths(projectedCashflow.drySeasonMonths);
  }, [projectedCashflow.drySeasonMonths]);

  // Spec 0230: 境內 54C 稅制水密隔離，僅以 report.currentYearTwDividendsTWD 計算抵減額
  const taxStats = useMemo(() => {
    return calculateDividendTaxDeductionStats(report.currentYearTwDividendsTWD ?? report.currentYearDividendsTWD);
  }, [report.currentYearTwDividendsTWD, report.currentYearDividendsTWD]);

  // 發放日已屆待核實入帳款項 (Spec 0228 / Ticket 04: 消滅時序黑洞)
  const dueReceivables = useMemo(() => {
    return scopedReceivables.filter((r) => r.status === 'DUE_FOR_RECONCILIATION' && r.estimatedNetDividendInTWD > 0);
  }, [scopedReceivables]);

  // 計算待發放款項總金額與待入庫配股 (嚴格閉環)
  const totalReceivableTWD = useMemo(() => {
    return activeReceivables.reduce((sum, r) => sum + r.estimatedNetDividendInTWD, 0);
  }, [activeReceivables]);

  const pendingStockSharesTotal = useMemo(() => {
    return activeReceivables
      .filter((r) => (r.stockDividendShares || 0) > 0)
      .reduce((sum, r) => sum + (r.stockDividendShares || 0), 0);
  }, [activeReceivables]);

  // 歷史入帳明細列表過濾 (解除 payDate > todayStr 硬截斷，支援穿透式時序預覽)
  const dividendTrades = useMemo(() => {
    const selectedYearStr = String(selectedYear);
    return scopedTrades
      .filter((t) => t.type === 'DIVIDEND')
      .filter((t) => {
        const payDate = getEffectiveDividendPayDate(t);
        if (tableYearFilter === 'SELECTED_YEAR') {
          return payDate.startsWith(selectedYearStr);
        }
        return true;
      })
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return t.symbol.toLowerCase().includes(q) || (t.name && t.name.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const payA = getEffectiveDividendPayDate(a);
        const payB = getEffectiveDividendPayDate(b);
        const comp = payB.localeCompare(payA);
        if (comp !== 0) return comp;
        return (b.exDate || b.date).localeCompare(a.exDate || a.date);
      });
  }, [scopedTrades, searchQuery, tableYearFilter, selectedYear]);

  // 計算月度最大值以設定長條圖比例
  const maxMonthlyNet = useMemo(() => {
    return Math.max(...report.monthlyDistribution.map((m) => m.netTWD), 1000);
  }, [report.monthlyDistribution]);

  // 各標的對帳小計 (Spec 0230: 設置 payDate <= todayStr 門禁，阻斷未結算預約款項偷跑計入)
  const annualReconciliationList = useMemo(() => {
    const map = new Map<string, AnnualReconciliationItem>();
    const selectedYearStr = String(selectedYear);
    for (const trade of scopedTrades) {
      if (trade.type !== 'DIVIDEND') continue;
      const payDate = getEffectiveDividendPayDate(trade);
      if (!payDate.startsWith(selectedYearStr)) continue;
      if (payDate > todayStr) continue;

      const res = resolveEffectiveDividendTaxAndNet(trade, scopedTrades);
      const effectiveFx = trade.exchangeRate && trade.exchangeRate > 0 ? trade.exchangeRate : usdToTwdRate;
      const grossTWD = trade.currency === 'USD' ? Math.round(res.gross * effectiveFx) : Math.round(res.gross);
      const netTWD = trade.currency === 'USD' ? Math.round(res.netCash * effectiveFx) : Math.round(res.netCash);
      const taxTWD = grossTWD - netTWD;

      const key = trade.symbol.toUpperCase();
      const existing = map.get(key) || {
        symbol: trade.symbol,
        name: trade.name || trade.symbol,
        market: trade.market,
        count: 0,
        grossTWD: 0,
        netTWD: 0,
        taxTWD: 0,
      };

      existing.count += 1;
      existing.grossTWD += grossTWD;
      existing.netTWD += netTWD;
      existing.taxTWD += taxTWD;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.grossTWD - a.grossTWD);
  }, [scopedTrades, selectedYear, usdToTwdRate, todayStr]);

  const activeContributors = rankMode === 'YEAR'
    ? report.currentYearTopContributors
    : report.topDividendContributors;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 頂部控制列 */}
      <div
        className="glass-card"
        style={{
          padding: '16px 22px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
            }}
          >
            <Coins size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
                股利收益日誌與現金流全景
              </h2>
              <span
                style={{
                  fontSize: '0.74rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  fontWeight: 700,
                }}
              >
                {selectedYear} 年度透視
              </span>
              {market !== 'ALL' && (
                <span
                  style={{
                    fontSize: '0.74rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    fontWeight: 700,
                  }}
                >
                  {market === 'TW' ? '🇹🇼 台股市場' : '🇺🇸 美股市場'}
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              穿透每月被動現金流、除權息平滑待入帳款與法人級實戰指標（已連動頂部市場與帳戶）
            </p>
          </div>
        </div>

        {/* 右側操作群組 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {onSyncCorporateActions && (
            <button
              onClick={onSyncCorporateActions}
              disabled={isSyncingCorporateActions}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                color: isSyncingCorporateActions ? '#94a3b8' : '#34d399',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                fontWeight: 700,
              }}
              title="立即同步最新官方除權息行事曆公告"
            >
              <RefreshCw size={13} className={isSyncingCorporateActions ? 'spin-animation' : ''} />
              <span>{isSyncingCorporateActions ? '正在同步除息公告...' : '同步除息公告'}</span>
            </button>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(19, 29, 49, 0.85)',
              padding: '3px 6px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              style={{
                background: 'rgba(51, 65, 85, 0.5)',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 7px',
                color: '#cbd5e1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="檢視前一年"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', minWidth: '65px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {selectedYear} 年
            </span>
            <button
              onClick={() => setSelectedYear((y) => y + 1)}
              style={{
                background: 'rgba(51, 65, 85, 0.5)',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 7px',
                color: '#cbd5e1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="檢視後一年"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 2×2 金融控制台網格佈局 */}
      {/* 1. 未來 12 個月現金流預估行事曆 (整合生活費對標與 Zavy 活水轉向指引) */}
      <DividendCalendarCard
        projectedCashflow={projectedCashflow}
        complementaryRecommendations={complementaryRecommendations}
        taxStats={taxStats}
        targetMonthlyExpenseTwd={targetMonthlyExpenseTwd}
        onTargetExpenseChange={handleTargetExpenseChange}
        zavyDividendPlanSummary="依目前景氣波浪建議活水轉向注入：純公債 (00687B) 與黃金儲備 (00635U)，存量不動、增量抗震。"
        isCashflowExpanded={isCashflowExpanded}
        onToggleExpand={() => setIsCashflowExpanded((v) => !v)}
      />

      {/* 2. 四大發光 KPI 摘要面板 */}
      <DividendKpiSummary
        selectedYear={selectedYear}
        dividendDisplayMode={dividendDisplayMode}
        onToggleDisplayMode={setDividendDisplayMode}
        currentYearGrossTWD={report.currentYearGrossTWD}
        currentYearNetTWD={report.currentYearDividendsTWD}
        currentYearTaxTWD={report.currentYearTaxTWD}
        yoyGrowthPercent={report.yoyGrowthPercent}
        trailing12mDividendsTWD={report.trailing12mDividendsTWD}
        totalReceivableTWD={totalReceivableTWD}
        receivablePendingCount={activeReceivables.length}
        totalHistoricalNetTWD={report.totalHistoricalDividendsTWD}
        nhiAlertCount={scopedReceivables.filter((r) => r.market === 'TW' && r.estimatedGrossDividend >= 20000).length}
        pendingStockSharesTotal={pendingStockSharesTotal}
        estimatedLoanInterestTWD={estimatedLoanInterestTWD}
      />

      {/* 3. 各月份現金流分佈 (2/3) + 股息貢獻排行榜 (1/3) 齊高並列網格 */}
      <div className="dividend-dual-panel-grid">
        <div style={{ minWidth: 0, height: '100%' }}>
          <DividendMonthlyChart
            monthlyDistribution={report.monthlyDistribution}
            maxMonthlyNet={maxMonthlyNet}
            targetMonthlyExpenseTwd={targetMonthlyExpenseTwd}
            dividendDisplayMode={dividendDisplayMode}
            selectedYear={selectedYear}
          />
        </div>
        <div style={{ minWidth: 0, height: '100%' }}>
          <DividendTopContributorsCard
            activeContributors={activeContributors}
            rankMode={rankMode}
            onRankModeChange={setRankMode}
            selectedYear={selectedYear}
            holdings={scopedHoldings}
          />
        </div>
      </div>

      {/* 4. 除息待入帳行事曆面板 (支援一鍵已入帳微操作) */}
      <div
        id="receivable-calendar"
        className="glass-card"
        style={{
          padding: '20px 22px',
          borderRadius: '16px',
          background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fef3c7' }}>
              ⚡ 除息待入帳行事曆 (Receivable Dividends Pending Payment)
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
              ({activeReceivables.length} 筆待入帳)
            </span>
          </div>
          <span
            style={{
              fontSize: '0.74rem',
              padding: '3px 10px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              fontWeight: 600,
            }}
          >
            已自動平滑除息假性虧損
          </span>
        </div>

        {activeReceivables.length === 0 ? (
          <div
            style={{
              padding: '28px 20px',
              textAlign: 'center',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '12px',
              border: '1px dashed rgba(245, 158, 11, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={24} color="#f59e0b" style={{ opacity: 0.75, marginBottom: '2px' }} />
            <div style={{ fontSize: '0.9rem', color: '#fef3c7', fontWeight: 600 }}>目前暫無除息待入帳款項</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              除息基準日過後、款項尚未撥入帳戶之應收現金股利將自動列於此處平滑展示
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '14px',
            }}
          >
            {activeReceivables.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>{rec.symbol}</span>
                      <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{rec.name}</span>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: rec.dateSource === 'OFFICIAL' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                          color: rec.dateSource === 'OFFICIAL' ? '#34d399' : '#38bdf8',
                          border: `1px solid ${rec.dateSource === 'OFFICIAL' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.3)'}`,
                        }}
                      >
                        {rec.dateSource === 'OFFICIAL' ? '官方公告' : '演算法推估'}
                      </span>
                    </div>
                    <div className="mono" style={{ fontWeight: 800, color: '#34d399', fontSize: '1.1rem', fontVariantNumeric: 'tabular-nums' }}>
                      +NT$ {rec.estimatedNetDividendInTWD.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '0.74rem', color: '#94a3b8' }}>
                    <div>除息基準日: <b className="mono" style={{ color: '#ffffff' }}>{rec.exDate}</b></div>
                    <div>預計入帳日: <b className="mono" style={{ color: '#fbbf24' }}>{rec.payDate}</b></div>
                    <div>在庫股數: <b className="mono" style={{ color: '#ffffff' }}>{rec.sharesHeldOnExDate.toLocaleString()} 股</b></div>
                    <div>每股配息: <b className="mono" style={{ color: '#34d399' }}>{rec.cashDividendPerShare} {rec.currency}</b></div>
                  </div>

                  {/* 一鍵已入帳微操作 */}
                  {onInstantSettleDividend && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => onInstantSettleDividend(rec.id, todayStr)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(16, 185, 129, 0.5)',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <CheckCircle2 size={12} />
                        網銀已入帳？點此一鍵結算
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 5. 歷史現金股利入帳明細與貢獻榜 */}
      <DividendHistoryTable
        dividendTrades={dividendTrades}
        allScopedTrades={scopedTrades}
        holdings={scopedHoldings}
        selectedYear={selectedYear}
        usdToTwdRate={usdToTwdRate}
        todayStr={todayStr}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        tableYearFilter={tableYearFilter}
        onTableYearFilterChange={setTableYearFilter}
        reconciliationList={annualReconciliationList}
        showReconciliationPanel={showReconciliationPanel}
        onToggleReconciliationPanel={() => setShowReconciliationPanel((v) => !v)}
        onInstantSettle={onInstantSettleDividend ? (id) => onInstantSettleDividend(id, todayStr) : undefined}
        dueReceivables={dueReceivables}
        onSettleReceivable={onInstantSettleDividend ? (rec) => onInstantSettleDividend(rec.id, todayStr) : undefined}
      />
    </div>
  );
};
