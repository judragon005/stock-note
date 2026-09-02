import React from 'react';
import {
  X,
  TrendingUp,
  Clock,
  Activity,
  Calendar,
  CheckCircle2,
  HelpCircle,
  Percent,
} from 'lucide-react';
import { XirrResult, CashFlowEvent } from '../engine/xirrCalculator';
import { Currency } from '../types/stock';

export interface XirrDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  result: XirrResult;
  cashFlows: CashFlowEvent[];
  currency?: Currency;
}

export const XirrDetailModal: React.FC<XirrDetailModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  result,
  cashFlows,
  currency = 'TWD',
}) => {
  if (!isOpen) return null;

  const currencySymbol = currency === 'USD' ? '$' : 'NT$';
  const isPositive = result.ratePercent >= 0;

  // 計算每筆金流的折現權重或現值 (PV at rate r)
  const d0 = cashFlows.length > 0 ? cashFlows[0].date : '';
  const calculatedFlows = cashFlows.map((f) => {
    let dtYears = 0;
    if (d0 && f.date) {
      const t1 = new Date(d0).getTime();
      const t2 = new Date(f.date).getTime();
      dtYears = Math.max(0, (t2 - t1) / (1000 * 60 * 60 * 24 * 365.0));
    }
    const discountFactor = result.rate !== 0 ? Math.pow(1 + result.rate, dtYears) : 1;
    const pv = discountFactor !== 0 && !isNaN(discountFactor) ? f.amount / discountFactor : f.amount;

    return {
      ...f,
      dtYears: Math.round(dtYears * 100) / 100,
      pv: Math.round(pv),
    };
  });

  const getCategoryBadge = (category?: string, amount?: number) => {
    switch (category) {
      case 'DEPOSIT':
        return <span className="px-2 py-0.5 text-xs rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">銀行入金</span>;
      case 'WITHDRAWAL':
        return <span className="px-2 py-0.5 text-xs rounded font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">銀行出金</span>;
      case 'BUY':
        return <span className="px-2 py-0.5 text-xs rounded font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">股票買進</span>;
      case 'SELL':
        return <span className="px-2 py-0.5 text-xs rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">股票賣出</span>;
      case 'DIVIDEND':
        return <span className="px-2 py-0.5 text-xs rounded font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30">現金股利</span>;
      case 'TERMINAL_VALUE':
        return <span className="px-2 py-0.5 text-xs rounded font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">期末結算淨值</span>;
      default:
        return (amount || 0) < 0
          ? <span className="px-2 py-0.5 text-xs rounded font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">現金流出</span>
          : <span className="px-2 py-0.5 text-xs rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">現金流入</span>;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 8, 18, 0.82)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          borderRadius: '16px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部標題列 */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.8))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(56, 189, 248, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(16, 185, 129, 0.4)',
              }}
            >
              <TrendingUp size={22} color="#10b981" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {title}
                </h3>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: result.isAnnualized ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: result.isAnnualized ? '#10b981' : '#f59e0b',
                    border: `1px solid ${result.isAnnualized ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                    fontWeight: 700,
                  }}
                >
                  {result.isAnnualized ? '精確年化 XIRR' : '未滿 30 天 (非年化絕對報酬)'}
                </span>
              </div>
              {subtitle && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 彈窗內容滾動區 */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* 1. 核心指標四格看板 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            {/* XIRR 年化報酬率 */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Percent size={14} color="#10b981" />
                {result.isAnnualized ? '年化報酬率 (XIRR)' : '累計報酬率 (Simple Return)'}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: isPositive ? 'var(--gain-color)' : 'var(--loss-color)',
                }}
              >
                {isPositive ? '+' : ''}{result.ratePercent.toFixed(2)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                資金加權 MWRR 複利口徑
              </div>
            </div>

            {/* 累積絕對報酬率 */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={14} color="#38bdf8" />
                全期累積總回報
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: result.simpleReturnPercent >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
                }}
              >
                {result.simpleReturnPercent >= 0 ? '+' : ''}{result.simpleReturnPercent.toFixed(2)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                淨收益: {currencySymbol}{(result.totalOutflow - result.totalInflow).toLocaleString()}
              </div>
            </div>

            {/* 總投入本金 vs 期末價值 */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={14} color="#f59e0b" />
                總投入 / 期末總值
              </div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f59e0b' }}>
                {currencySymbol}{result.totalInflow.toLocaleString()}
              </div>
              <div className="mono" style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                期末: {currencySymbol}{result.totalOutflow.toLocaleString()}
              </div>
            </div>

            {/* 歷時天數與數值收斂 */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} color="#a855f7" />
                持有週期與求解狀態
              </div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#e2e8f0' }}>
                {result.durationDays} 天
              </div>
              <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} />
                {result.method === 'NEWTON_RAPHSON' ? `Newton (${result.iterations} 次迭代)` : (result.method === 'BISECTION' ? 'Bisection 二分收斂' : '直接求解')}
              </div>
            </div>
          </div>

          {/* 2. 說明條欄 */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              marginBottom: '20px',
              fontSize: '0.8rem',
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <HelpCircle size={18} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <span style={{ fontWeight: 700, color: '#38bdf8' }}>XIRR 金融演算法解析：</span>
              XIRR（Money-Weighted Rate of Return）根據每筆現金流的「實際發生日期」，以非線性折現方程 NPV(r) = Σ [ C_i / (1+r)^Δt_i ] = 0 求解真實年化複合報酬率。能客觀消除定期定額與低點加碼被傳統 CAGR 稀釋的盲點。
              {!result.isAnnualized && (
                <div style={{ marginTop: '4px', color: '#f59e0b', fontWeight: 600 }}>
                  ⚠️ 當前標的持有天數小於 30 天，為避免短線年化次方外推失真，系統自動啟用平滑保護，以絕對累積報酬率呈現。
                </div>
              )}
            </div>
          </div>

          {/* 3. 現金流時序明細表 */}
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📜 現金流事件明細 ({calculatedFlows.length} 筆)</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                流出投入為負值 ($-$) · 流入期末為正值 ($+$)
              </span>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(30, 41, 59, 0.7)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>日期</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>事件類型</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>說明</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>現金流金額</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>距今 (年)</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedFlows.map((f, idx) => {
                    const isOutflow = f.amount < 0;
                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: idx === calculatedFlows.length - 1 ? 'none' : '1px solid rgba(51, 65, 85, 0.4)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(30, 41, 59, 0.2)',
                        }}
                      >
                        <td className="mono" style={{ padding: '10px 14px', color: '#e2e8f0', fontWeight: 600 }}>
                          {f.date}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {getCategoryBadge(f.category, f.amount)}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>
                          {f.description || (isOutflow ? '投入資金' : '回收資金/市值')}
                        </td>
                        <td
                          className="mono"
                          style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: isOutflow ? '#38bdf8' : (f.amount > 0 ? '#10b981' : '#94a3b8'),
                          }}
                        >
                          {isOutflow ? '-' : '+'}{currencySymbol}{Math.abs(f.amount).toLocaleString()}
                        </td>
                        <td className="mono" style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>
                          {f.dtYears > 0 ? `${f.dtYears}y` : '基準日'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(15, 23, 42, 0.9)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
