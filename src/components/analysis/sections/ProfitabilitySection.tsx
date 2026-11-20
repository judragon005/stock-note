import React from 'react';
import type { QuarterlyFinancialRecord } from '../../../types/financialForensic';
import type { CompanyDividendPolicyRecord } from '../../../engine/dividendService';
import { renderSimpleBars, renderDualLines } from './metricChartPrimitives';

export interface ProfitabilitySectionProps {
  subTab: string;
  records: QuarterlyFinancialRecord[];
  chronological: QuarterlyFinancialRecord[];
  latestRecord?: QuarterlyFinancialRecord;
  companyDividends: CompanyDividendPolicyRecord[];
  turnoverMetrics: { dsoDays?: number | null; dioDays?: number | null; cccDays?: number | null } | null;
}

export const ProfitabilitySection: React.FC<ProfitabilitySectionProps> = ({
  subTab,
  records,
  chronological,
  latestRecord,
  companyDividends,
  turnoverMetrics,
}) => (
  <>
    {subTab === 'margins_trio' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>三率同圖走勢 (毛利率 vs 營業利益率)</h3>
        {renderDualLines(
          chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
          {
            name: '毛利率',
            values: chronological.map((r) =>
              r.income?.revenue ? Number(((r.income.grossProfit / r.income.revenue) * 100).toFixed(1)) : 0
            ),
            color: '#10b981',
          },
          {
            name: '營業利益率',
            values: chronological.map((r) =>
              r.income?.revenue ? Number(((r.income.operatingIncome / r.income.revenue) * 100).toFixed(1)) : 0
            ),
            color: '#3b82f6',
          }
        )}
      </div>
    )}

    {subTab === 'opex_breakdown' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>營業費用率拆解 (營收佔比)</h3>
        {renderSimpleBars(
          chronological.map((r) => {
            const rev = r.income?.revenue || 1;
            const opex = (r.income?.grossProfit || 0) - (r.income?.operatingIncome || 0);
            const opexRate = Number(((opex / rev) * 100).toFixed(1));
            return { label: `${r.year % 100}Q${r.quarter}`, value: opexRate, displayValue: `${opexRate}%` };
          }),
          '#f59e0b',
          '營業費用佔營收比重 (%)'
        )}
      </div>
    )}

    {subTab === 'non_op_ratio' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>業外佔稅後淨利比例 (獲利純度)</h3>
        {renderSimpleBars(
          chronological.map((r) => {
            const net = r.income?.netIncome || 1;
            const op = r.income?.operatingIncome || 0;
            const nonOp = net - op;
            const ratio = Number(((nonOp / Math.abs(net)) * 100).toFixed(1));
            return {
              label: `${r.year % 100}Q${r.quarter}`,
              value: ratio,
              displayValue: `${ratio}%`,
              isNegative: ratio < 0,
            };
          }),
          '#8b5cf6',
          '業外佔比高於 20% 代表本業造血純度受業外干擾'
        )}
      </div>
    )}

    {subTab === 'roe_roa' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>ROE 股東權益報酬率 vs ROA 資產報酬率 (年化)</h3>
        {renderDualLines(
          chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
          {
            name: 'ROE 股東權益報酬率',
            values: chronological.map((r) => {
              let eq = r.balanceSheet?.totalEquity || 0;
              if (eq <= 0 && r.balanceSheet?.totalAssets && r.balanceSheet?.totalLiabilities) {
                eq = Math.max(0, r.balanceSheet.totalAssets - r.balanceSheet.totalLiabilities);
              }
              if (eq <= 0) return 0;
              const roe = (((r.income?.netIncome || 0) * 4) / eq) * 100;
              return !isFinite(roe) || isNaN(roe) ? 0 : Number(Math.max(-100, Math.min(200, roe)).toFixed(1));
            }),
            color: '#10b981',
          },
          {
            name: 'ROA 資產報酬率',
            values: chronological.map((r) => {
              const as = r.balanceSheet?.totalAssets || 0;
              if (as <= 0) return 0;
              const roa = (((r.income?.netIncome || 0) * 4) / as) * 100;
              return !isFinite(roa) || isNaN(roa) ? 0 : Number(Math.max(-100, Math.min(100, roa)).toFixed(1));
            }),
            color: '#3b82f6',
          }
        )}
      </div>
    )}

    {subTab === 'dupont' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>杜邦分析三因子拆解</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>1. 稅後純益率 (Net Margin)</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {latestRecord?.income?.revenue ? ((latestRecord.income.netIncome / latestRecord.income.revenue) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>2. 總資產週轉率 (年化 Asset Turnover)</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {latestRecord?.balanceSheet?.totalAssets && latestRecord.balanceSheet.totalAssets > 0
                ? (((latestRecord.income?.revenue || 0) * 4) / latestRecord.balanceSheet.totalAssets).toFixed(2)
                : '0.00'}次
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>3. 權益乘數 (Equity Multiplier)</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {latestRecord?.balanceSheet?.totalEquity && latestRecord.balanceSheet.totalEquity > 0
                ? (latestRecord.balanceSheet.totalAssets / latestRecord.balanceSheet.totalEquity).toFixed(2)
                : '1.00'}x
            </div>
          </div>
        </div>
      </div>
    )}

    {subTab === 'turnover_capability' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>經營週轉能力 (年化次數)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>應收帳款週轉率 (年化)</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
              {latestRecord?.balanceSheet?.accountsReceivable && latestRecord.balanceSheet.accountsReceivable > 0
                ? (((latestRecord.income?.revenue || 0) * 4) / latestRecord.balanceSheet.accountsReceivable).toFixed(1) + '次/年'
                : '暫無資料'}
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>存貨週轉率 (年化)</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
              {latestRecord?.balanceSheet?.inventory && latestRecord.balanceSheet.inventory > 0
                ? ((((latestRecord.income?.revenue || 0) - (latestRecord.income?.grossProfit || 0)) * 4) / latestRecord.balanceSheet.inventory).toFixed(1) + '次/年'
                : '暫無資料'}
            </div>
          </div>
        </div>
      </div>
    )}

    {subTab === 'turnover_days' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>營運週轉天數 (DSO / DIO / CCC)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>應收帳款週轉天數 (DSO)</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {turnoverMetrics?.dsoDays ? `${turnoverMetrics.dsoDays.toFixed(0)} 天` : '-'}
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>存貨週轉天數 (DIO)</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {turnoverMetrics?.dioDays ? `${turnoverMetrics.dioDays.toFixed(0)} 天` : '-'}
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>現金轉換週期 (CCC)</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
              {turnoverMetrics?.cccDays ? `${turnoverMetrics.cccDays.toFixed(0)} 天` : '-'}
            </div>
          </div>
        </div>
      </div>
    )}

    {subTab === 'dividend_payout' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>現金股利發放率 (DPS / EPS)</h3>
        {renderSimpleBars(
          companyDividends.map((d) => {
            const yearRecords = records.filter((r) => r.year === d.year);
            const totalYearEps = yearRecords.reduce((sum, r) => sum + (r.income?.eps || 0), 0);
            const payout = totalYearEps > 0 ? Number(((d.cashDividend / totalYearEps) * 100).toFixed(0)) : null;
            return {
              label: `${d.year}年`,
              value: payout ?? 0,
              displayValue: payout != null ? `${payout}%` : '-',
              isNoData: payout == null,
            };
          }),
          '#10b981',
          '發放率維持在 50%~80% 屬穩健定存股 (分母為全年累計 EPS)'
        )}
      </div>
    )}
  </>
);
