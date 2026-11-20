import React from 'react';
import type { QuarterlyFinancialRecord } from '../../../types/financialForensic';
import { renderSimpleBars } from './metricChartPrimitives';

export interface GrowthSectionProps {
  subTab: string;
  chronological: QuarterlyFinancialRecord[];
  revenueRecords?: Array<{
    yearMonth: string;
    revenue: number;
    lastYearRevenue?: number;
    yoyRate?: number;
    momRate?: number;
    isAllTimeHigh?: number;
  }>;
}

const GROWTH_SUBTABS = new Set([
  'revenue_growth',
  'gross_profit_growth',
  'operating_profit_growth',
  'net_income_growth',
  'eps_growth',
]);

export const GrowthSection: React.FC<GrowthSectionProps> = ({
  subTab,
  chronological,
  revenueRecords,
}) => {
  if (!GROWTH_SUBTABS.has(subTab)) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {subTab === 'revenue_growth' && revenueRecords && revenueRecords.length > 0 && (
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                📊 領先指標：最新 12 個月營收走勢
              </span>
              {revenueRecords[revenueRecords.length - 1]?.isAllTimeHigh === 1 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                  }}
                >
                  🔥 ATH 創歷史新高
                </span>
              )}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              資料來源：台灣證券交易所 / 櫃買中心月營收公告（比季報領先 1~2 個月）
            </span>
          </div>
          {renderSimpleBars(
            revenueRecords.slice(-12).map((rec) => ({
              label: rec.yearMonth.slice(2),
              value: rec.revenue / 100000,
              displayValue: `${(rec.revenue / 100000).toFixed(1)} 億`,
              note: rec.yoyRate !== undefined ? `YoY: ${rec.yoyRate > 0 ? `+${rec.yoyRate}` : rec.yoyRate}%` : undefined,
            })),
            '#3b82f6',
            '月營收 (億元新台幣)'
          )}
        </div>
      )}

      <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>
        {subTab === 'revenue_growth'
          ? '營業收入年增率 (Revenue YoY)'
          : subTab === 'gross_profit_growth'
          ? '營業毛利年增率 (Gross Profit YoY)'
          : subTab === 'operating_profit_growth'
          ? '營業利益年增率 (Operating Profit YoY)'
          : subTab === 'net_income_growth'
          ? '稅後淨利年增率 (Net Income YoY)'
          : '每股盈餘年增率 (EPS YoY)'}
      </h3>
      {renderSimpleBars(
        chronological.map((curr) => {
          const prev = chronological.find((p) => p.year === curr.year - 1 && p.quarter === curr.quarter);
          let currVal = curr.income?.revenue || 0;
          let prevVal = prev?.income?.revenue || 0;

          if (subTab === 'gross_profit_growth') {
            currVal = curr.income?.grossProfit || 0;
            prevVal = prev?.income?.grossProfit || 0;
          } else if (subTab === 'operating_profit_growth') {
            currVal = curr.income?.operatingIncome || 0;
            prevVal = prev?.income?.operatingIncome || 0;
          } else if (subTab === 'net_income_growth') {
            currVal = curr.income?.netIncome || 0;
            prevVal = prev?.income?.netIncome || 0;
          } else if (subTab === 'eps_growth') {
            currVal = curr.income?.eps || 0;
            prevVal = prev?.income?.eps || 0;
          }

          const hasBaseline = Boolean(prev && prevVal !== 0);
          const yoy = hasBaseline ? Number((((currVal - prevVal) / Math.abs(prevVal)) * 100).toFixed(1)) : null;

          return {
            label: `${curr.year % 100}Q${curr.quarter}`,
            value: yoy ?? 0,
            displayValue: yoy !== null ? `${yoy > 0 ? `+${yoy}` : yoy}%` : '-',
            isNegative: (yoy ?? 0) < 0,
            isNoData: !hasBaseline,
            note: !hasBaseline
              ? '無前期同期基期資料'
              : (yoy ?? 0) > 300
              ? `歷史低基期爆發效應：去年同期基期較低 (+${yoy}%)`
              : undefined,
          };
        }),
        '#10b981',
        '與去年同期相比 (YoY %)'
      )}
    </div>
  );
};
