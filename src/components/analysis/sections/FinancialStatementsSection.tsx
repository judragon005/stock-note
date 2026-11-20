import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import type { QuarterlyFinancialRecord } from '../../../types/financialForensic';
import type { CompanyDividendPolicyRecord } from '../../../engine/dividendService';
import { deriveSharesOutstanding } from '../../../engine/keyMetricsEngine';
import { formatFinancialAmount } from '../../../utils/formatters';
import { renderSimpleBars, renderDualLines } from './metricChartPrimitives';

export interface FinancialStatementsSectionProps {
  subTab: string;
  chronological: QuarterlyFinancialRecord[];
  companyDividends: CompanyDividendPolicyRecord[];
}

export const FinancialStatementsSection: React.FC<FinancialStatementsSectionProps> = ({
  subTab,
  chronological,
  companyDividends,
}) => (
  <>
    {subTab === 'eps' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>每股盈餘 (EPS) 20 季趨勢</h3>
        {renderSimpleBars(
          chronological.map((r) => {
            const eps = r.income?.eps || 0;
            return {
              label: `${r.year % 100}Q${r.quarter}`,
              value: eps,
              displayValue: `${eps.toFixed(2)}`,
            };
          }),
          '#3b82f6',
          '單位：元 / 每股'
        )}
      </div>
    )}

    {subTab === 'bvps' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>每股淨值 (BVPS) 20 季走勢</h3>
        {renderSimpleBars(
          chronological.map((r) => {
            const equity = r.balanceSheet?.totalEquity || 0;
            const shares = deriveSharesOutstanding(r);
            const bvps = shares > 0 && equity > 0 ? Number((equity / shares).toFixed(2)) : 0;
            return {
              label: `${r.year % 100}Q${r.quarter}`,
              value: bvps > 0 ? bvps : Number((equity / 100000000).toFixed(1)),
              displayValue: bvps > 0 ? `${bvps}元` : `${(equity / 100000000).toFixed(1)}億(無股數)`,
            };
          }),
          '#10b981',
          '單位：新台幣元'
        )}
      </div>
    )}

    {subTab === 'income_statement' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>損益表核心科目 (營收規模)</h3>
        {renderSimpleBars(
          chronological.map((r) => {
            const rev = r.income?.revenue || 0;
            return {
              label: `${r.year % 100}Q${r.quarter}`,
              value: rev,
              displayValue: formatFinancialAmount(rev),
            };
          }),
          '#6366f1'
        )}
      </div>
    )}

    {subTab === 'total_assets' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>總資產規模變化 (啟用自適應階梯縮放)</h3>
        {renderSimpleBars(
          chronological.map((r) => {
            const assets = r.balanceSheet?.totalAssets || 0;
            return {
              label: `${r.year % 100}Q${r.quarter}`,
              value: assets,
              displayValue: formatFinancialAmount(assets),
            };
          }),
          '#0284c7'
        )}
      </div>
    )}

    {subTab === 'liabilities_equity' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>負債與股東權益分佈</h3>
        {renderDualLines(
          chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
          {
            name: '負債總額',
            values: chronological.map((r) => Number(((r.balanceSheet?.totalLiabilities || 0) / 100000000).toFixed(1))),
            color: '#f59e0b',
          },
          {
            name: '股東權益',
            values: chronological.map((r) => Number(((r.balanceSheet?.totalEquity || 0) / 100000000).toFixed(1))),
            color: '#10b981',
          },
          '億'
        )}
      </div>
    )}

    {subTab === 'cash_flow' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>現金流量表 (營業現金流 CFO vs 資本支出)</h3>
        {renderDualLines(
          chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
          {
            name: '營業現金流 CFO',
            values: chronological.map((r) => Number(((r.cashFlow?.operatingCashFlow || 0) / 100000000).toFixed(1))),
            color: '#10b981',
          },
          {
            name: '資本支出 Capex',
            values: chronological.map((r) => Number(((r.cashFlow?.capitalExpenditure || 0) / 100000000).toFixed(1))),
            color: '#ef4444',
          },
          '億'
        )}
      </div>
    )}

    {subTab === 'dividend_policy' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>歷年公開股利政策 (每股配發金額)</h3>
        {companyDividends.length > 0 ? (
          <>
            {renderSimpleBars(
              companyDividends.map((d) => ({
                label: `${d.year}年`,
                value: d.totalDividend,
                displayValue: `${d.cashDividend}元`,
              })),
              '#f59e0b',
              '每股配發現金股利 (元)'
            )}
            <div style={{ overflowX: 'auto', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px' }}>年度</th>
                    <th style={{ padding: '8px' }}>現金股利 (元)</th>
                    <th style={{ padding: '8px' }}>股票股利 (元)</th>
                    <th style={{ padding: '8px' }}>合計發放</th>
                    <th style={{ padding: '8px' }}>除息日</th>
                  </tr>
                </thead>
                <tbody>
                  {companyDividends.slice().reverse().map((d) => (
                    <tr key={d.year} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px', fontWeight: 700 }}>{d.year}年</td>
                      <td style={{ padding: '8px', color: '#10b981', fontWeight: 800 }}>{d.cashDividend.toFixed(2)}</td>
                      <td style={{ padding: '8px' }}>{d.stockDividend.toFixed(2)}</td>
                      <td style={{ padding: '8px', fontWeight: 700 }}>{d.totalDividend.toFixed(2)} 元</td>
                      <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{d.exDividendDate || '已公告'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text-secondary)', padding: '24px', textAlign: 'center' }}>
            暫無上市公司公開除權息歷年記錄（若為美股或新上市櫃請確認代碼）。
          </div>
        )}
      </div>
    )}

    {subTab === 'reports_pdf' && (
      <div style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '14px', textAlign: 'center' }}>
        <FileText size={40} style={{ color: 'var(--accent-primary, #3b82f6)', margin: '0 auto 12px auto' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>財務報告書電子書索引</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '8px auto 20px auto' }}>
          提供臺灣公開資訊觀測站 (MOPS) 與 SEC EDGAR 官方認證會計師查核簽證報告書直通連結。
        </p>
        <a
          href="https://mops.twse.com.tw/mops/web/t164sb01"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            borderRadius: '10px',
            background: 'var(--accent-primary, #3b82f6)',
            color: '#ffffff',
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: '13px',
          }}
        >
          開啟公開資訊觀測站季報/年報 <ExternalLink size={14} />
        </a>
      </div>
    )}
  </>
);
