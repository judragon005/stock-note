import React from 'react';
import { Coins, TrendingUp, Clock, Sparkles, AlertTriangle, Layers } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { DividendDisplayMode } from './DividendMonthlyChart';
import { calculateNetCarrySpread } from '../../engine/dividendCarrySpreadEngine';

export interface DividendKpiSummaryProps {
  selectedYear: number;
  dividendDisplayMode: DividendDisplayMode; // 'GROSS' | 'NET'
  onToggleDisplayMode: (mode: DividendDisplayMode) => void;
  currentYearGrossTWD: number;
  currentYearNetTWD: number;
  currentYearTaxTWD: number;
  yoyGrowthPercent?: number;
  trailing12mDividendsTWD?: number;
  totalReceivableTWD: number;
  receivablePendingCount?: number;
  totalHistoricalNetTWD: number;
  nhiAlertCount?: number;
  pendingStockSharesTotal?: number;
  estimatedLoanInterestTWD?: number; // 複用 cashLedgerEngine：質押利息支出
  totalWireFeesTWD?: number;         // 複用 cashLedgerEngine：累計匯費
}

export const DividendKpiSummary: React.FC<DividendKpiSummaryProps> = ({
  selectedYear,
  dividendDisplayMode,
  onToggleDisplayMode,
  currentYearGrossTWD,
  currentYearNetTWD,
  currentYearTaxTWD,
  yoyGrowthPercent = 0,
  trailing12mDividendsTWD = 0,
  totalReceivableTWD,
  receivablePendingCount = 0,
  totalHistoricalNetTWD,
  nhiAlertCount = 0,
  pendingStockSharesTotal = 0,
  estimatedLoanInterestTWD = 0,
  totalWireFeesTWD = 0,
}) => {
  // 質押借貸實質淨利差計算
  const carrySpread = calculateNetCarrySpread({
    dividendIncomeTwd: currentYearNetTWD,
    loanInterestExpenseTwd: estimatedLoanInterestTWD,
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '14px',
      }}
    >
      {/* 卡片 1: 當年度配息總額 (支援 Gross / Net 切換與借貸利差) */}
      <div
        className="glass-card"
        style={{
          padding: '16px 18px',
          borderRadius: '14px',
          background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Coins size={15} /> {selectedYear} 年度配息總額
          </span>
          <div style={{ display: 'inline-flex', padding: '2px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '6px', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
            <button
              onClick={() => onToggleDisplayMode('GROSS')}
              style={{
                border: 'none',
                background: dividendDisplayMode === 'GROSS' ? '#10b981' : 'transparent',
                color: dividendDisplayMode === 'GROSS' ? '#0f172a' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.66rem',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              title="切換為券商對帳單口徑（應發毛額）"
            >
              券商對帳
            </button>
            <button
              onClick={() => onToggleDisplayMode('NET')}
              style={{
                border: 'none',
                background: dividendDisplayMode === 'NET' ? '#10b981' : 'transparent',
                color: dividendDisplayMode === 'NET' ? '#0f172a' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.66rem',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              title="切換為銀行存摺實際入帳口徑（實領淨額）"
            >
              存摺實領
            </button>
          </div>
        </div>

        <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#34d399', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
          NT$ {(dividendDisplayMode === 'GROSS' ? currentYearGrossTWD : currentYearNetTWD).toLocaleString()}
        </div>

        {/* 毛額與稅費對帳輔助列 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.72rem', color: '#94a3b8', flexWrap: 'wrap' }}>
          {dividendDisplayMode === 'GROSS' ? (
            <span>
              實領入帳 <b className="mono" style={{ color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>NT$ {currentYearNetTWD.toLocaleString()}</b>
            </span>
          ) : (
            <span>
              應發毛額 <b className="mono" style={{ color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>NT$ {currentYearGrossTWD.toLocaleString()}</b>
            </span>
          )}
          {currentYearTaxTWD > 0 && (
            <span className="mono" style={{ color: 'var(--loss-color)', fontVariantNumeric: 'tabular-nums' }}>
              (稅費 -NT$ {currentYearTaxTWD.toLocaleString()})
            </span>
          )}
          <Tooltip
            content={
              <div style={{ padding: '4px', fontSize: '0.74rem', maxWidth: '280px', lineHeight: 1.45 }}>
                💡 <b>券商對帳口徑 (Gross) vs 存摺實領 (Net)</b>：<br />
                • <b>券商對帳 (應發毛額)</b>：吻合券商 APP 總額（未扣除健保補充保費與匯費）。<br />
                • <b>存摺實領 (實領淨額)</b>：銀行實際入帳金額（已扣除 2.11% 二代健保與匯費）。
              </div>
            }
          >
            <span style={{ cursor: 'pointer', color: '#34d399', textDecoration: 'underline dotted', fontSize: '0.68rem' }}>
              對帳提示
            </span>
          </Tooltip>
        </div>

        {/* YoY 成長率 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.72rem', color: '#94a3b8' }}>
          <span>YoY 成長率：</span>
          <span
            style={{
              fontWeight: 800,
              color: yoyGrowthPercent >= 0 ? 'var(--gain-color)' : 'var(--loss-color)',
            }}
          >
            {yoyGrowthPercent >= 0 ? '+' : ''}{yoyGrowthPercent}%
          </span>
        </div>
      </div>

      {/* 卡片 2: 滾動 12 個月現金流 (TTM) 與質押利差對沖 */}
      <div
        className="glass-card"
        style={{
          padding: '16px 18px',
          borderRadius: '14px',
          background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={15} /> 近 12 個月滾動現金流 (TTM)
          </span>
          <span style={{ fontSize: '0.68rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            12M 滾動
          </span>
        </div>
        <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
          NT$ {trailing12mDividendsTWD.toLocaleString()}
        </div>
        <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#94a3b8' }}>
          平均每月約 <b className="mono" style={{ color: '#60a5fa', fontVariantNumeric: 'tabular-nums' }}>NT$ {Math.round(trailing12mDividendsTWD / 12).toLocaleString()}</b>
        </div>

        {/* 質押借貸淨利差現金流 (Carry Trade Net Spread) */}
        {estimatedLoanInterestTWD > 0 && (
          <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>扣除質押利息淨現金流：</span>
            <b
              className="mono"
              style={{
                color: carrySpread.isNegativeSpread ? 'var(--loss-color)' : '#34d399',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              NT$ {carrySpread.netCashflowTwd.toLocaleString()}
            </b>
          </div>
        )}
      </div>

      {/* 卡片 3: 待發放應收現金股利與配股上市追蹤 */}
      <div
        className="glass-card"
        style={{
          padding: '16px 18px',
          borderRadius: '14px',
          background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} /> 待發放應收股利 (平滑中)
          </span>
          <span style={{ fontSize: '0.68rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            ⚡ 假性虧損平滑
          </span>
        </div>
        <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fcd34d', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
          +NT$ {totalReceivableTWD.toLocaleString()}
        </div>
        <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#fde68a' }}>
          共 <b>{receivablePendingCount} 筆</b> 待入帳款項
        </div>

        {/* 股票股利 (配股) 入庫追蹤 */}
        {pendingStockSharesTotal > 0 && (
          <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#fcd34d' }}>
            <Layers size={13} />
            <span>待入庫股票股利：<b className="mono">{pendingStockSharesTotal.toLocaleString()} 股</b></span>
          </div>
        )}
      </div>

      {/* 卡片 4: 全歷史累計實領淨額與摩擦損耗警報 */}
      <div
        className="glass-card"
        style={{
          padding: '16px 18px',
          borderRadius: '14px',
          background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          boxShadow: '0 4px 16px rgba(168, 85, 247, 0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={15} /> 全歷史累計實領淨額
          </span>
          <span style={{ fontSize: '0.68rem', color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            全歷史已落袋
          </span>
        </div>
        <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#d8b4fe', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
          NT$ {totalHistoricalNetTWD.toLocaleString()}
        </div>
        <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#94a3b8' }}>
          已扣除二代健保與 30% IRS 預扣稅
        </div>

        {/* 跨行匯費與二代健保警報提示 */}
        {(totalWireFeesTWD > 0 || nhiAlertCount > 0) && (
          <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(168, 85, 247, 0.25)', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#cbd5e1' }}>
            {totalWireFeesTWD > 0 && (
              <span>累計跨行匯費: <b className="mono" style={{ color: '#f43f5e' }}>NT$ {totalWireFeesTWD.toLocaleString()}</b></span>
            )}
            {nhiAlertCount > 0 && (
              <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <AlertTriangle size={11} /> 健保門檻: {nhiAlertCount} 筆
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
