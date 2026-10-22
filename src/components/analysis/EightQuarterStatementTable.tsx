import React, { useState } from 'react';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';
import { formatFinancialAmount } from '../../utils/formatters';
import { deriveSharesOutstanding } from '../../engine/keyMetricsEngine';

interface EightQuarterStatementTableProps {
  records: QuarterlyFinancialRecord[];
  stockName?: string;
  symbol?: string;
}

type StatementViewType = 'ALL' | 'INCOME' | 'BALANCE' | 'CASHFLOW';

export const EightQuarterStatementTable: React.FC<EightQuarterStatementTableProps> = ({
  records,
  stockName = '',
  symbol = '',
}) => {
  const [activeView, setActiveView] = useState<StatementViewType>('ALL');

  if (!records || records.length === 0) {
    return (
      <div style={{ background: 'var(--bg-secondary)', padding: '36px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>暫無歷史 8 季財務報表數據</p>
      </div>
    );
  }

  // 排序：最近 8 季，由舊到新橫向排列便於觀察歷史趨勢
  const sorted = [...records]
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.quarter - b.quarter;
    })
    .slice(-8);

  const quarters = sorted.map((r) => `${r.year % 100}Q${r.quarter}`);

  const renderSectionHeader = (title: string, color: string) => (
    <tr style={{ background: `${color}18`, borderTop: `2px solid ${color}40`, borderBottom: `1px solid ${color}40` }}>
      <td
        colSpan={quarters.length + 1}
        style={{
          textAlign: 'left',
          padding: '8px 12px',
          fontWeight: 800,
          fontSize: '13px',
          color,
          letterSpacing: '0.02em',
        }}
      >
        {title}
      </td>
    </tr>
  );

  const renderRow = (
    label: string,
    values: (string | number)[],
    isHighlight = false,
    colorOverride?: string
  ) => (
    <tr
      style={{
        borderBottom: '1px solid var(--border-color)',
        background: isHighlight ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
      }}
    >
      <td
        style={{
          position: 'sticky',
          left: 0,
          background: 'var(--bg-card)',
          zIndex: 2,
          padding: '8px 12px',
          textAlign: 'left',
          fontWeight: isHighlight ? 700 : 500,
          fontSize: '12px',
          color: colorOverride || (isHighlight ? 'var(--text-primary)' : 'var(--text-secondary)'),
          borderRight: '1px solid var(--border-color)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </td>
      {values.map((v, i) => {
        const isNum = typeof v === 'number';
        const isNeg = isNum && v < 0;
        const display = isNum ? formatFinancialAmount(v) : v;
        return (
          <td
            key={i}
            style={{
              padding: '8px 10px',
              textAlign: 'right',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '12px',
              fontWeight: isHighlight ? 700 : 400,
              color: isNeg ? '#ef4444' : colorOverride || 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}
          >
            {display}
          </td>
        );
      })}
    </tr>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 標題與篩選切換列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            三大財務報表 8 季橫向對比全貌 {stockName ? `(${stockName} ${symbol})` : ''}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            損益表、資產負債表與現金流量表全貌檢視，百萬/億單位友善顯示，支援左右滑動對照
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          {(
            [
              { id: 'ALL', label: '全部三表' },
              { id: 'INCOME', label: '損益表' },
              { id: 'BALANCE', label: '資產負債表' },
              { id: 'CASHFLOW', label: '現金流量表' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              style={{
                fontSize: '11px',
                fontWeight: activeView === tab.id ? 800 : 500,
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: activeView === tab.id ? 'var(--accent-primary, #3b82f6)' : 'transparent',
                color: activeView === tab.id ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 8 季橫向全貌對比表格 */}
      <div
        style={{
          overflowX: 'auto',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <th
                style={{
                  position: 'sticky',
                  left: 0,
                  background: 'var(--bg-secondary)',
                  zIndex: 3,
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  borderRight: '1px solid var(--border-color)',
                  minWidth: '150px',
                }}
              >
                財務指標 / 季度
              </th>
              {quarters.map((q, i) => (
                <th
                  key={i}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    minWidth: '95px',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {q}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 1. 損益表 (Income Statement) */}
            {(activeView === 'ALL' || activeView === 'INCOME') && (
              <>
                {renderSectionHeader('一、 綜合損益表 (Income Statement)', '#3b82f6')}
                {renderRow('營業收入 (Revenue)', sorted.map((r) => r.income?.revenue || 0), true)}
                {renderRow('營業毛利 (Gross Profit)', sorted.map((r) => r.income?.grossProfit || 0))}
                {renderRow(
                  '毛利率 (%)',
                  sorted.map((r) => {
                    const rev = r.income?.revenue || 0;
                    const gp = r.income?.grossProfit || 0;
                    return rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '-';
                  }),
                  false,
                  '#10b981'
                )}
                {renderRow('營業利益 (Operating Income)', sorted.map((r) => r.income?.operatingIncome || 0))}
                {renderRow(
                  '營益率 (%)',
                  sorted.map((r) => {
                    const rev = r.income?.revenue || 0;
                    const op = r.income?.operatingIncome || 0;
                    return rev > 0 ? `${((op / rev) * 100).toFixed(1)}%` : '-';
                  })
                )}
                {renderRow('稅後淨利 / 母公司業主淨利', sorted.map((r) => r.income?.netIncome || 0), true)}
                {renderRow(
                  '淨利率 (%)',
                  sorted.map((r) => {
                    const rev = r.income?.revenue || 0;
                    const ni = r.income?.netIncome || 0;
                    return rev > 0 ? `${((ni / rev) * 100).toFixed(1)}%` : '-';
                  })
                )}
                {renderRow(
                  '每股盈餘 EPS (元)',
                  sorted.map((r) => (typeof r.income?.eps === 'number' ? `${r.income.eps.toFixed(2)}` : '-')),
                  true,
                  '#f59e0b'
                )}
              </>
            )}

            {/* 2. 資產負債表 (Balance Sheet) */}
            {(activeView === 'ALL' || activeView === 'BALANCE') && (
              <>
                {renderSectionHeader('二、 資產負債表 (Balance Sheet)', '#10b981')}
                {renderRow('現金及約當現金', sorted.map((r) => r.balanceSheet?.cashAndEquivalents || 0), true)}
                {renderRow('應收帳款與票據', sorted.map((r) => r.balanceSheet?.accountsReceivable || 0))}
                {renderRow('存貨 (Inventory)', sorted.map((r) => r.balanceSheet?.inventory || 0))}
                {renderRow('總資產 (Total Assets)', sorted.map((r) => r.balanceSheet?.totalAssets || 0), true)}
                {renderRow('短期借款 (Short-term Debt)', sorted.map((r) => r.balanceSheet?.shortTermDebt ?? '-'))}
                {renderRow('長期借款 (Long-term Debt)', sorted.map((r) => r.balanceSheet?.longTermDebt ?? '-'))}
                {renderRow('總負債 (Total Liabilities)', sorted.map((r) => r.balanceSheet?.totalLiabilities || 0))}
                {renderRow(
                  '負債比率 (%)',
                  sorted.map((r) => {
                    const a = r.balanceSheet?.totalAssets || 0;
                    const l = r.balanceSheet?.totalLiabilities || 0;
                    return a > 0 ? `${((l / a) * 100).toFixed(1)}%` : '-';
                  })
                )}
                {renderRow('股東權益 (Total Equity)', sorted.map((r) => r.balanceSheet?.totalEquity || 0), true)}
                {renderRow(
                  '每股淨值 BVPS (元)',
                  sorted.map((r) => {
                    const eq = r.balanceSheet?.totalEquity || 0;
                    const s = deriveSharesOutstanding(r);
                    return s > 0 && eq > 0 ? (eq / s).toFixed(2) : '-';
                  }),
                  true,
                  '#06b6d4'
                )}
              </>
            )}

            {/* 3. 現金流量表 (Cash Flow Statement) */}
            {(activeView === 'ALL' || activeView === 'CASHFLOW') && (
              <>
                {renderSectionHeader('三、 現金流量表 (Cash Flow Statement)', '#8b5cf6')}
                {renderRow('營業活動現金流 (CFO)', sorted.map((r) => r.cashFlow?.operatingCashFlow || 0), true)}
                {renderRow('資本支出 (Capex)', sorted.map((r) => -(r.cashFlow?.capitalExpenditure || 0)))}
                {renderRow(
                  '自由現金流 (FCF)',
                  sorted.map((r) => (r.cashFlow?.operatingCashFlow || 0) - (r.cashFlow?.capitalExpenditure || 0)),
                  true,
                  '#10b981'
                )}
                {renderRow('已發放現金股利 (Dividend Paid)', sorted.map((r) => (r.cashFlow?.dividendPaid ? -r.cashFlow.dividendPaid : '-')))}
                {renderRow('已支付利息費用 (Interest Paid)', sorted.map((r) => (r.cashFlow?.interestPaid ? -r.cashFlow.interestPaid : '-')))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
