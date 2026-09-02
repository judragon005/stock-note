import React, { useState, useMemo } from 'react';
import {
  Coins,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search,
  Award,
  RefreshCw,
} from 'lucide-react';
import { TradeRecord, MarketType } from '../types/stock';
import { ReceivableDividend, DividendSummaryReport } from '../types/dividend';
import { aggregateDividendReport } from '../engine/dividendAggregator';
import { estimatePaymentDate } from '../engine/receivableDividendEngine';
import { resolveEffectiveDividendTaxAndNet } from '../engine/taxComplianceEngine';
import { Tooltip } from './common/Tooltip';

interface DividendLogViewProps {
  trades: TradeRecord[];
  receivableDividends: ReceivableDividend[];
  usdToTwdRate: number;
  market?: 'ALL' | MarketType;
  selectedAccountId?: string;
  onSyncCorporateActions?: () => void;
  isSyncingCorporateActions?: boolean;
}

export const DividendLogView: React.FC<DividendLogViewProps> = ({
  trades,
  receivableDividends,
  usdToTwdRate,
  market = 'ALL',
  selectedAccountId = 'ALL',
  onSyncCorporateActions,
  isSyncingCorporateActions = false,
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [searchQuery, setSearchQuery] = useState('');
  const [rankMode, setRankMode] = useState<'YEAR' | 'ALL_TIME'>('YEAR');

  // 1. 依全域市場與帳戶過濾交易與應收股利
  const scopedTrades = useMemo(() => {
    return trades.filter((t) => {
      if (market !== 'ALL' && t.market !== market) return false;
      if (selectedAccountId !== 'ALL' && t.accountId && t.accountId !== selectedAccountId) return false;
      return true;
    });
  }, [trades, market, selectedAccountId]);

  const scopedReceivables = useMemo(() => {
    return receivableDividends.filter((r) => {
      if (market !== 'ALL' && r.market !== market) return false;
      return true;
    });
  }, [receivableDividends, market]);

  // 2. 彙整股利分析報告
  const report: DividendSummaryReport = useMemo(() => {
    return aggregateDividendReport(scopedTrades, scopedReceivables, selectedYear, usdToTwdRate);
  }, [scopedTrades, scopedReceivables, selectedYear, usdToTwdRate]);

  // 待發放應收股利總額 (僅計入已除息平滑中者)
  const totalReceivableTWD = useMemo(() => {
    return scopedReceivables
      .filter((r) => r.status === 'PENDING_PAYMENT' || r.status === 'OVERDUE')
      .reduce((sum, r) => sum + r.estimatedNetDividendInTWD, 0);
  }, [scopedReceivables]);

  const todayStr = new Date().toISOString().split('T')[0];

  // 歷史現金股利交易明細列表 (僅納入 payDate <= today 已實質到達發放日之款項)
  const dividendTrades = useMemo(() => {
    return scopedTrades
      .filter((t) => t.type === 'DIVIDEND')
      .filter((t) => {
        const payDate = t.payDate || estimatePaymentDate(t.exDate || t.date, t.market);
        return payDate <= todayStr;
      })
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return t.symbol.toLowerCase().includes(q) || (t.name && t.name.toLowerCase().includes(q));
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [scopedTrades, searchQuery, todayStr]);

  // 計算月度最大值以設定柱狀圖高度比例
  const maxMonthlyNet = useMemo(() => {
    const maxVal = Math.max(...report.monthlyDistribution.map((m) => m.netTWD), 1000);
    return maxVal;
  }, [report.monthlyDistribution]);

  // 當前排行的資料來源 (當年度 vs 全歷史)
  const activeContributors = rankMode === 'YEAR'
    ? report.currentYearTopContributors
    : report.topDividendContributors;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* 1. 頂部控制導覽列 (Hero Header Banner) */}
      <div
        className="glass-card"
        style={{
          padding: '18px 24px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(30, 41, 59, 0.7) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Coins size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
                股利收益日誌與現金流全景
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  fontWeight: 600,
                }}
              >
                {selectedYear} 年度透視
              </span>
              {market !== 'ALL' && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    fontWeight: 600,
                  }}
                >
                  {market === 'TW' ? '🇹🇼 台股市場' : '🇺🇸 美股市場'}
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              穿透每月被動現金流、除權息平滑待入帳款與全歷史配息成長趨勢（已連動頂部市場與帳戶）
            </p>
          </div>
        </div>

        {/* 右側操作群組：同步除息公告按鈕 + 年份切換器 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onSyncCorporateActions && (
            <button
              onClick={onSyncCorporateActions}
              disabled={isSyncingCorporateActions}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: isSyncingCorporateActions ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)',
              }}
              title="立即同步最新官方除權息行事曆公告"
            >
              <RefreshCw size={14} className={isSyncingCorporateActions ? 'animate-spin' : ''} style={{ animation: isSyncingCorporateActions ? 'spin 1s linear infinite' : 'none' }} />
              <span>{isSyncingCorporateActions ? '正在同步除息公告...' : '同步除息公告'}</span>
            </button>
          )}

          {/* 年份切換器 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '4px 8px',
              borderRadius: '12px',
              border: '1px solid rgba(51, 65, 85, 0.8)',
            }}
          >
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              style={{
                background: 'rgba(51, 65, 85, 0.5)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 8px',
                color: '#cbd5e1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s',
              }}
              title="檢視前一年"
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', minWidth: '70px', textAlign: 'center' }}>
              {selectedYear} 年
            </span>
            <button
              onClick={() => setSelectedYear((y) => y + 1)}
              style={{
                background: 'rgba(51, 65, 85, 0.5)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 8px',
                color: '#cbd5e1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s',
              }}
              title="檢視後一年"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. 四大發光 KPI 摘要卡片 (4-Pillar Metric Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        {/* 卡片 1: 當年度實領股息 */}
        <div
          className="glass-card"
          style={{
            padding: '18px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={16} /> {selectedYear} 年度實領股息
            </span>
            <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              已實質入帳
            </span>
          </div>
          <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#34d399' }}>
            NT$ {report.currentYearDividendsTWD.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span>YoY 成長率：</span>
            <span
              style={{
                fontWeight: 700,
                color: report.yoyGrowthPercent >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {report.yoyGrowthPercent >= 0 ? '+' : ''}{report.yoyGrowthPercent}%
            </span>
          </div>
        </div>

        {/* 卡片 2: 近 12 個月滾動現金流 (TTM) */}
        <div
          className="glass-card"
          style={{
            padding: '18px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} /> 近 12 個月滾動現金流 (TTM)
            </span>
            <span style={{ fontSize: '0.7rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              12M 滾動
            </span>
          </div>
          <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff' }}>
            NT$ {report.trailing12mDividendsTWD.toLocaleString()}
          </div>
          <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
            平均每月約 <b style={{ color: '#60a5fa' }}>NT$ {Math.round(report.trailing12mDividendsTWD / 12).toLocaleString()}</b>
          </div>
        </div>

        {/* 卡片 3: 待發放應收股利 (除息平滑中) */}
        <div
          className="glass-card"
          style={{
            padding: '18px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> 待發放應收股利 (平滑中)
            </span>
            <span style={{ fontSize: '0.7rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              ⚡ 假性虧損平滑
            </span>
          </div>
          <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fcd34d' }}>
            +NT$ {totalReceivableTWD.toLocaleString()}
          </div>
          <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#fde68a' }}>
            共 <b>{scopedReceivables.filter((r) => r.status === 'PENDING_PAYMENT' || r.status === 'OVERDUE').length} 筆</b> 待入帳款項
          </div>
        </div>

        {/* 卡片 4: 全歷史累計領取淨額 */}
        <div
          className="glass-card"
          style={{
            padding: '18px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            boxShadow: '0 4px 16px rgba(168, 85, 247, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} /> 全歷史累計實領淨額
            </span>
            <span style={{ fontSize: '0.7rem', color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              全歷史已落袋
            </span>
          </div>
          <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#d8b4fe' }}>
            NT$ {report.totalHistoricalDividendsTWD.toLocaleString()}
          </div>
          <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
            已扣除二代健保與 30% IRS 預扣稅
          </div>
        </div>
      </div>

      {/* 3. 兩大主力圖表區：月度現金流柱狀圖 & 標的股息貢獻榜 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* 左側 2 欄位寬度：1~12 月月度現金流立體柱狀圖 */}
        <div
          className="glass-card"
          style={{
            gridColumn: 'span 2',
            padding: '20px',
            borderRadius: '16px',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(51, 65, 85, 0.6)',
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
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>單位：新台幣 TWD</span>
          </div>

          {/* 柱狀圖本體 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '6px',
              height: '180px',
              alignItems: 'flex-end',
              paddingTop: '20px',
              borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
              paddingBottom: '8px',
            }}
          >
            {report.monthlyDistribution.map((m, idx) => {
              const barHeightPx = maxMonthlyNet > 0 ? Math.round((m.netTWD / maxMonthlyNet) * 120) : 0;
              const hasData = m.netTWD > 0;
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
                    content={
                      <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '170px' }}>
                        <div style={{ fontWeight: 700, color: '#34d399', borderBottom: '1px solid rgba(51,65,85,0.6)', paddingBottom: '4px' }}>
                          📅 {selectedYear} 年 {m.monthLabel} 股息明細
                        </div>
                        {hasData ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>實領入帳：</span>
                              <b style={{ color: '#34d399' }}>NT$ {m.netTWD.toLocaleString()}</b>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>應發毛額：</span>
                              <span style={{ color: '#ffffff' }}>NT$ {m.grossTWD.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>扣繳稅款/健保：</span>
                              <span style={{ color: m.taxTWD > 0 ? '#f43f5e' : '#94a3b8' }}>
                                {m.taxTWD > 0 ? `-NT$ ${m.taxTWD.toLocaleString()}` : 'NT$ 0'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>配息筆數：</span>
                              <span style={{ color: '#ffffff' }}>{m.count} 筆</span>
                            </div>
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
                          ? 'linear-gradient(180deg, #34d399 0%, #059669 100%)'
                          : 'rgba(51, 65, 85, 0.3)',
                        boxShadow: hasData ? '0 0 12px rgba(16, 185, 129, 0.35)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
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

          <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>💡 提示：綠色長條代表該月有配息入帳，滑鼠懸浮柱狀條可檢視該月份實領與扣稅細節。</span>
          </div>
        </div>

        {/* 右側 1 欄位：標的股息貢獻度排行 Top 榜 (支援當年度 vs 全歷史切換) */}
        <div
          className="glass-card"
          style={{
            padding: '20px',
            borderRadius: '16px',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(51, 65, 85, 0.6)',
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
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '2px',
                  borderRadius: '8px',
                  border: '1px solid rgba(51, 65, 85, 0.6)',
                }}
              >
                <button
                  onClick={() => setRankMode('YEAR')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: rankMode === 'YEAR' ? '#8b5cf6' : 'transparent',
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
                  onClick={() => setRankMode('ALL_TIME')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: rankMode === 'ALL_TIME' ? '#8b5cf6' : 'transparent',
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
                activeContributors.slice(0, 5).map((item, idx) => (
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
                      </div>
                      <span className="mono" style={{ fontWeight: 700, color: '#34d399' }}>
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
                ))
              )}
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: '#64748b', paddingTop: '8px', borderTop: '1px solid rgba(51, 65, 85, 0.4)' }}>
            {rankMode === 'YEAR' ? `${selectedYear} 年度共 ${activeContributors.length} 檔標的貢獻` : `全歷史共 ${activeContributors.length} 檔標的貢獻`}
          </div>
        </div>
      </div>

      {/* 4. 雙看板區塊：⚡ 除息待入帳行事曆 (Receivable Dividends Pending Payment) */}
      <div
        className="glass-card"
        style={{
          padding: '22px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%)',
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
              ({scopedReceivables.filter((r) => r.status !== 'UPCOMING_EX').length} 筆待入帳)
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

        {/* 待入帳卡片清單 / 空狀態占位 */}
        {scopedReceivables.filter((r) => r.status !== 'UPCOMING_EX').length === 0 ? (
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
              gap: '18px',
            }}
          >
            {scopedReceivables
              .filter((rec) => rec.status !== 'UPCOMING_EX')
              .map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    padding: '18px 20px',
                    borderRadius: '14px',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(245, 158, 11, 0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)',
                  }}
                >
                  {/* 卡片標頭 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.15rem', letterSpacing: '0.5px' }}>
                        {rec.symbol}
                      </span>
                      <span style={{ color: '#cbd5e1', fontSize: '0.95rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {rec.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ⚡ 除息待入帳
                      </span>
                    </div>

                    <div className="mono" style={{ fontWeight: 800, color: '#34d399', fontSize: '1.15rem', whiteSpace: 'nowrap' }}>
                      +NT$ {rec.estimatedNetDividendInTWD.toLocaleString()}
                    </div>
                  </div>

                  {/* 4 大核心參數區塊 */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px 14px',
                      background: 'rgba(30, 41, 59, 0.6)',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(51, 65, 85, 0.5)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>📅 除息基準日</span>
                      <b className="mono" style={{ fontSize: '0.9rem', color: '#ffffff', whiteSpace: 'nowrap' }}>
                        {rec.exDate}
                      </b>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>💰 預估發放日</span>
                      <b className="mono" style={{ fontSize: '0.9rem', color: '#fbbf24', whiteSpace: 'nowrap' }}>
                        {rec.payDate}
                      </b>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>📦 除息庫存股數</span>
                      <b className="mono" style={{ fontSize: '0.9rem', color: '#ffffff', whiteSpace: 'nowrap' }}>
                        {rec.sharesHeldOnExDate.toLocaleString()} 股
                      </b>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>💵 每股配息金額</span>
                      <b className="mono" style={{ fontSize: '0.9rem', color: '#34d399', whiteSpace: 'nowrap' }}>
                        {rec.cashDividendPerShare} {rec.currency}
                      </b>
                    </div>
                  </div>

                  {/* 底部稅階預警標籤 */}
                  {rec.market === 'TW' && rec.estimatedGrossDividend >= 20000 && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#fef3c7',
                        background: 'rgba(245, 158, 11, 0.12)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                      <span>
                        單筆毛額達 2 萬門檻，預估預扣 2.11% 二代健保 <b>NT$ {rec.estimatedTaxOrFee.toLocaleString()}</b> (實領淨額 NT$ {rec.estimatedNetDividendInTWD.toLocaleString()})
                      </span>
                    </div>
                  )}
                  {rec.market === 'US' && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#93c5fd',
                        background: 'rgba(59, 130, 246, 0.12)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                      }}
                    >
                      美股 30% IRS 預扣稅 -${Number(rec.estimatedTaxOrFee).toFixed(2)} USD (實收 ${Number(rec.estimatedNetDividend).toFixed(2)} USD)
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 4.5 雙看板區塊：📢 即將除息公告看板 (Upcoming Corporate Actions & Ex-Dividends) */}
      <div
        className="glass-card"
        style={{
          padding: '22px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#60a5fa" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e0f2fe' }}>
              📢 即將除息公告看板 (Upcoming Corporate Actions & Ex-Dividends)
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>
              ({scopedReceivables.filter((r) => r.status === 'UPCOMING_EX').length} 筆除息預告)
            </span>
          </div>
          <span
            style={{
              fontSize: '0.74rem',
              padding: '3px 10px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#93c5fd',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              fontWeight: 600,
            }}
          >
            在席持股除權息日程追蹤
          </span>
        </div>

        {/* 即將除息卡片清單 / 空狀態占位 */}
        {scopedReceivables.filter((r) => r.status === 'UPCOMING_EX').length === 0 ? (
          <div
            style={{
              padding: '28px 20px',
              textAlign: 'center',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '12px',
              border: '1px dashed rgba(59, 130, 246, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={24} color="#60a5fa" style={{ opacity: 0.75, marginBottom: '2px' }} />
            <div style={{ fontSize: '0.9rem', color: '#e0f2fe', fontWeight: 600 }}>目前在庫持股暫無最新除息公告日程</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              上市公司發布除權息公告後，系統將自動同步並於此處預告日程
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
              gap: '18px',
            }}
          >
            {scopedReceivables
              .filter((rec) => rec.status === 'UPCOMING_EX')
              .map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    padding: '18px 20px',
                    borderRadius: '14px',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(59, 130, 246, 0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)',
                  }}
                >
                  {/* 卡片標頭 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.15rem', letterSpacing: '0.5px' }}>
                        {rec.symbol}
                      </span>
                      <span style={{ color: '#cbd5e1', fontSize: '0.95rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {rec.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        📢 即將除息
                      </span>
                    </div>

                    <div className="mono" style={{ fontWeight: 800, color: '#34d399', fontSize: '1.15rem', whiteSpace: 'nowrap' }}>
                      +NT$ {rec.estimatedNetDividendInTWD.toLocaleString()}
                    </div>
                  </div>

                  {/* 4 大核心參數區塊 */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px 14px',
                      background: 'rgba(30, 41, 59, 0.6)',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(51, 65, 85, 0.5)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>📅 除息基準日</span>
                      <b className="mono" style={{ fontSize: '0.9rem', color: '#ffffff', whiteSpace: 'nowrap' }}>
                        {rec.exDate}
                      </b>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>💰 預估發放日</span>
                      <b className="mono" style={{ fontSize: '0.9rem', color: '#fbbf24', whiteSpace: 'nowrap' }}>
                        {rec.payDate}
                      </b>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>📦 除息庫存股數</span>
                      <b className="mono" style={{ fontSize: '0.9rem', color: '#ffffff', whiteSpace: 'nowrap' }}>
                        {rec.sharesHeldOnExDate.toLocaleString()} 股
                      </b>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>💵 每股配息金額</span>
                      <b className="mono" style={{ fontSize: '0.9rem', color: '#34d399', whiteSpace: 'nowrap' }}>
                        {rec.cashDividendPerShare} {rec.currency}
                      </b>
                    </div>
                  </div>

                  {/* 底部稅階預警標籤 */}
                  {rec.market === 'TW' && rec.estimatedGrossDividend >= 20000 && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#fef3c7',
                        background: 'rgba(245, 158, 11, 0.12)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                      <span>
                        單筆毛額達 2 萬門檻，預估預扣 2.11% 二代健保 <b>NT$ {rec.estimatedTaxOrFee.toLocaleString()}</b> (實領淨額 NT$ {rec.estimatedNetDividendInTWD.toLocaleString()})
                      </span>
                    </div>
                  )}
                  {rec.market === 'US' && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#93c5fd',
                        background: 'rgba(59, 130, 246, 0.12)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                      }}
                    >
                      美股 30% IRS 預扣稅 -${Number(rec.estimatedTaxOrFee).toFixed(2)} USD (實收 ${Number(rec.estimatedNetDividend).toFixed(2)} USD)
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 5. 歷史現金股利入帳流水明細表 (全量智能補齊二代健保 2.11% 與美股 30% 稅費) */}
      <div
        className="glass-card"
        style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(51, 65, 85, 0.6)',
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
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({dividendTrades.length} 筆)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* 搜尋標的 */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                placeholder="搜尋代碼或名稱..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 12px 6px 30px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(51, 65, 85, 0.8)',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: '#ffffff',
                  outline: 'none',
                  width: '200px',
                }}
              />
            </div>
          </div>
        </div>

        {/* 明細表格 */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.8)', color: '#94a3b8' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>入帳日期</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>標的代碼 / 名稱</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>除息股數</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>每股配息</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>應發總額</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>扣繳稅款/健保</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>實領淨額</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>折合台幣</th>
              </tr>
            </thead>
            <tbody>
              {dividendTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    尚無符合條件之現金股利入帳明細
                  </td>
                </tr>
              ) : (
                dividendTrades.map((t) => {
                  const isUS = t.market === 'US' || t.currency === 'USD';
                  const res = resolveEffectiveDividendTaxAndNet(t, trades);
                  const gross = res.gross;
                  const effectiveTax = res.effectiveTax;
                  const net = res.netCash;
                  const netTWD = isUS ? Math.round(net * usdToTwdRate) : Math.round(net);
                  const isFuture = t.date > new Date().toISOString().split('T')[0];

                  // 格式化數字字串
                  const formattedShares = isUS ? t.shares.toLocaleString() : Math.round(t.shares).toLocaleString();
                  const formattedPrice = isUS ? `${t.price.toFixed(4)} USD` : `${t.price} TWD`;
                  const formattedGross = isUS ? `${gross.toFixed(2)} USD` : `${Math.round(gross).toLocaleString()} TWD`;
                  
                  // 扣繳稅款字串
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
                      <td className="mono" style={{ padding: '10px 12px', color: isFuture ? '#fbbf24' : '#cbd5e1' }}>
                        {t.date} {isFuture && <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.2)', padding: '1px 4px', borderRadius: '4px', color: '#fbbf24' }}>預約待入</span>}
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
                      <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', color: '#cbd5e1' }}>
                        {formattedShares}
                      </td>
                      <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', color: '#cbd5e1' }}>
                        {formattedPrice}
                      </td>
                      <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', color: '#cbd5e1' }}>
                        {formattedGross}
                      </td>
                      <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', color: effectiveTax > 0 ? 'var(--loss-color)' : '#94a3b8' }}>
                        {formattedTax}
                      </td>
                      <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                        {formattedNet}
                      </td>
                      <td className="mono" style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                        NT$ {netTWD.toLocaleString()}
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
