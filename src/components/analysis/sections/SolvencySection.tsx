import React from 'react';
import type { QuarterlyFinancialRecord } from '../../../types/financialForensic';
import { formatFinancialAmount } from '../../../utils/formatters';
import { renderSimpleBars, renderDualLines } from './metricChartPrimitives';

export interface SolvencySectionProps {
  subTab: string;
  chronological: QuarterlyFinancialRecord[];
  isFinancialStock: boolean;
}

export const SolvencySection: React.FC<SolvencySectionProps> = ({
  subTab,
  chronological,
  isFinancialStock,
}) => (
  <>
    {subTab === 'capital_structure' && (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>財務結構比率 (負債比率走勢)</h3>
          {isFinancialStock && (
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              金融保險業：吸收存款與承保資金為營運核心，高負債比屬法規常態，免於一般製造業負債警報
            </span>
          )}
        </div>
        {renderSimpleBars(
          chronological.map((r) => {
            const as = r.balanceSheet?.totalAssets || 0;
            let liab = r.balanceSheet?.totalLiabilities || 0;
            if (liab === 0 && as > 0 && (r.balanceSheet?.totalEquity || 0) > 0) {
              liab = Math.max(0, as - (r.balanceSheet?.totalEquity || 0));
            }
            const debtRatio = as > 0 ? Number(((liab / as) * 100).toFixed(1)) : 0;
            return {
              label: `${r.year % 100}Q${r.quarter}`,
              value: debtRatio,
              displayValue: `${debtRatio}%`,
              isNegative: isFinancialStock ? false : debtRatio > 65,
            };
          }),
          '#f59e0b',
          isFinancialStock ? '金融保險業負債結構正常 (免於製造業門檻)' : '負債比率 = 負債總額 / 總資產 (低於 50% 最佳)'
        )}
      </div>
    )}

    {subTab === 'liquidity_ratios' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>流動比率與速動比率</h3>
        {renderDualLines(
          chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
          {
            name: '流動比率 (Current)',
            values: chronological.map((r) => {
              const curLiab = r.balanceSheet?.currentLiabilities || 0;
              const curAssets = r.balanceSheet?.currentAssets || (r.balanceSheet?.cashAndEquivalents || 0) + (r.balanceSheet?.accountsReceivable || 0) + (r.balanceSheet?.inventory || 0);
              if (curLiab <= 0 || curAssets <= 0) return 0;
              const ratio = (curAssets / curLiab) * 100;
              return !isFinite(ratio) || isNaN(ratio) ? 0 : Number(Math.min(999, Math.max(0, ratio)).toFixed(0));
            }),
            color: '#3b82f6',
          },
          {
            name: '速動比率 (Quick)',
            values: chronological.map((r) => {
              const curLiab = r.balanceSheet?.currentLiabilities || 0;
              const inv = r.balanceSheet?.inventory || 0;
              const curAssets = r.balanceSheet?.currentAssets || (r.balanceSheet?.cashAndEquivalents || 0) + (r.balanceSheet?.accountsReceivable || 0) + inv;
              const quickAssets = r.balanceSheet?.currentAssets ? Math.max(0, curAssets - inv) : (r.balanceSheet?.cashAndEquivalents || 0) + (r.balanceSheet?.accountsReceivable || 0);
              if (curLiab <= 0 || quickAssets <= 0) return 0;
              const ratio = (quickAssets / curLiab) * 100;
              return !isFinite(ratio) || isNaN(ratio) ? 0 : Number(Math.min(999, Math.max(0, ratio)).toFixed(0));
            }),
            color: '#10b981',
          }
        )}
      </div>
    )}

    {subTab === 'interest_coverage' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>利息保障倍數 (EBIT / 利息費用)</h3>
        {renderSimpleBars(
          chronological.map((r) => {
            const ebit = r.income?.operatingIncome || 0;
            const interest = r.cashFlow?.interestPaid || 0;
            if (interest > 0) {
              const coverage = Number((ebit / interest).toFixed(1));
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: Math.max(-20, Math.min(100, coverage)),
                displayValue: `${coverage}x`,
                isNegative: coverage < 3,
              };
            }
            return {
              label: `${r.year % 100}Q${r.quarter}`,
              value: ebit > 0 ? 50 : 0,
              displayValue: ebit > 0 ? '>50x (無利息負擔)' : '0x',
            };
          }),
          '#10b981',
          '倍數高於 5x 代表公司償債付息能力綽綽有餘'
        )}
      </div>
    )}

    {subTab === 'cashflow_safety' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>現金流量安全檢驗 (自由現金流 FCF)</h3>
        {renderSimpleBars(
          chronological.map((r) => {
            const fcf = (r.cashFlow?.operatingCashFlow || 0) - (r.cashFlow?.capitalExpenditure || 0);
            return {
              label: `${r.year % 100}Q${r.quarter}`,
              value: fcf,
              displayValue: formatFinancialAmount(fcf),
              isNegative: fcf < 0,
            };
          }),
          '#10b981',
          'FCF > 0 代表企業具備真實現金造血能力'
        )}
      </div>
    )}

    {subTab === 'cfo_to_net_income' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>營業現金流對淨利比 (盈餘含金量)</h3>
        {renderSimpleBars(
          chronological.map((r) => {
            const net = r.income?.netIncome || 1;
            const cfo = r.cashFlow?.operatingCashFlow || 0;
            const ratio = Number(((cfo / Math.abs(net)) * 100).toFixed(0));
            return {
              label: `${r.year % 100}Q${r.quarter}`,
              value: ratio,
              displayValue: `${ratio}%`,
              isNegative: ratio < 80,
            };
          }),
          '#10b981',
          '比率 > 100% 代表無紙上富貴'
        )}
      </div>
    )}

    {subTab === 'reinvestment_rate' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>盈餘再投資比率 (4 年資本支出對淨利)</h3>
        {renderSimpleBars(
          chronological.map((curr, idx) => {
            const windowRecords = chronological.slice(Math.max(0, idx - 15), idx + 1);
            const totalCapex = windowRecords.reduce((sum, r) => sum + Math.abs(r.cashFlow?.capitalExpenditure || 0), 0);
            const totalNet = windowRecords.reduce((sum, r) => sum + (r.income?.netIncome || 0), 0);
            if (totalNet <= 0 || totalCapex === 0) {
              return {
                label: `${curr.year % 100}Q${curr.quarter}`,
                value: 0,
                displayValue: totalNet <= 0 ? '虧損 N/A' : '0%',
                isNegative: true,
              };
            }
            const reinv = Math.round((totalCapex / totalNet) * 100);
            return {
              label: `${curr.year % 100}Q${curr.quarter}`,
              value: Math.min(300, Math.max(0, reinv)),
              displayValue: `${reinv}%`,
              isNegative: reinv > 80,
            };
          }),
          '#6366f1',
          '4年累積資本支出 / 4年累積淨利 (高於 80% 代表企業高度依賴大額資本擴張)'
        )}
      </div>
    )}
  </>
);
