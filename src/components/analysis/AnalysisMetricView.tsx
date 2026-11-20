import React, { useState, useMemo } from 'react';
import { ExternalLink, Calendar } from 'lucide-react';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';
import type { CompanyDividendPolicyRecord } from '../../engine/dividendService';
import {
  calculatePiotroskiFScore,
  calculateFcfYield,
  calculatePeterLynchValuation,
  calculateDcfValuation,
  calculateDdmValuation,
  deriveSharesOutstanding,
} from '../../engine/keyMetricsEngine';
import { calculateTurnoverMetrics } from '../../engine/financialTurnoverEngine';
import { isFinancialIndustry, isCyclicalIndustry } from '../../engine/industryGate';
import { ForensicWarningSection } from './ForensicWarningSection';
import { findLatestCloseBeforeDate } from '../../utils/binarySearch';
import { FinancialStatementsSection } from './sections/FinancialStatementsSection';
import { ProfitabilitySection } from './sections/ProfitabilitySection';
import { SolvencySection } from './sections/SolvencySection';
import { GrowthSection } from './sections/GrowthSection';
import { ValuationMultiplesSection } from './sections/ValuationMultiplesSection';
import { QuantValuationModelsSection } from './sections/QuantValuationModelsSection';

interface AnalysisMetricViewProps {
  primaryTab: string;
  subTab: string;
  records: QuarterlyFinancialRecord[];
  currentPrice: number;
  annualDividends: { year: number; amount: number }[];
  companyDividends?: CompanyDividendPolicyRecord[];
  stockName: string;
  symbol: string;
  historicalCandles?: Array<{ date: string; close: number }>;
  revenueRecords?: Array<{
    yearMonth: string;
    revenue: number;
    lastYearRevenue?: number;
    yoyRate?: number;
    momRate?: number;
    isAllTimeHigh?: number;
  }>;
  pledge?: {
    report_date?: string;
    pledged_shares?: number;
    total_director_shares?: number;
    pledge_ratio?: number;
    insider_transfer_shares?: number;
  };
  valuation?: {
    pe?: number | null;
    pb?: number | null;
    dividendYield?: number | null;
    history?: Array<{
      pe?: number | null;
      pb?: number | null;
      dividendYield?: number | null;
      date?: string;
    }>;
  };
}

export const AnalysisMetricView: React.FC<AnalysisMetricViewProps> = ({
  primaryTab: _primaryTab,
  subTab,
  records,
  currentPrice,
  annualDividends,
  companyDividends = [],
  stockName,
  symbol,
  historicalCandles,
  revenueRecords,
  pledge,
  valuation,
}) => {
  const isUsMarket = !/^\d+[A-Za-z]?$/.test(symbol) && !symbol.startsWith('00');
  const isFinancialStock = isFinancialIndustry(symbol);
  const isCyclicalStock = isCyclicalIndustry(symbol);

  const [dcfWacc, setDcfWacc] = useState<number>(0.09);
  const [dcfGrowth, setDcfGrowth] = useState<number>(0.025);

  const chronological = useMemo(() => {
    return [...records]
      .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.quarter - b.quarter))
      .slice(-20);
  }, [records]);

  const latestRecord = chronological[chronological.length - 1];

  const piotroskiRes = useMemo(() => calculatePiotroskiFScore(records), [records]);
  const fcfYield = useMemo(() => calculateFcfYield(chronological, currentPrice), [chronological, currentPrice]);
  const lynchRes = useMemo(() => calculatePeterLynchValuation(records, currentPrice), [records, currentPrice]);
  const dcfRes = useMemo(
    () => calculateDcfValuation(records, currentPrice, { waccRate: dcfWacc, perpetualGrowthRate: dcfGrowth }),
    [records, currentPrice, dcfWacc, dcfGrowth]
  );
  const ddmRes = useMemo(() => calculateDdmValuation(annualDividends, currentPrice), [annualDividends, currentPrice]);
  const turnoverMetrics = useMemo(() => (latestRecord ? calculateTurnoverMetrics(latestRecord) : null), [latestRecord]);

  const valuationRiverQuarterlyClosePrices = useMemo<(number | null)[]>(() => {
    if (!historicalCandles || historicalCandles.length === 0 || chronological.length === 0) return [];
    return chronological.map((r) => findLatestCloseBeforeDate(historicalCandles, r.periodDate));
  }, [historicalCandles, chronological]);

  const handleDcfWaccChange = (nextWacc: number) => {
    setDcfWacc(nextWacc);
    if (dcfGrowth >= nextWacc - 0.01) {
      setDcfGrowth(Number(Math.max(0.01, nextWacc - 0.01).toFixed(3)));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <FinancialStatementsSection subTab={subTab} chronological={chronological} companyDividends={companyDividends} />

      <ProfitabilitySection
        subTab={subTab}
        records={records}
        chronological={chronological}
        latestRecord={latestRecord}
        companyDividends={companyDividends}
        turnoverMetrics={turnoverMetrics}
      />

      <SolvencySection subTab={subTab} chronological={chronological} isFinancialStock={isFinancialStock} />

      <GrowthSection subTab={subTab} chronological={chronological} revenueRecords={revenueRecords} />

      <ValuationMultiplesSection
        subTab={subTab}
        chronological={chronological}
        latestRecord={latestRecord}
        currentPrice={currentPrice}
        companyDividends={companyDividends}
        isUsMarket={isUsMarket}
        isCyclicalStock={isCyclicalStock}
        valuationRiverQuarterlyClosePrices={valuationRiverQuarterlyClosePrices}
        valuation={valuation}
      />

      <QuantValuationModelsSection
        subTab={subTab}
        chronological={chronological}
        latestRecord={latestRecord}
        piotroskiRes={piotroskiRes}
        fcfYield={fcfYield}
        lynchRes={lynchRes}
        dcfRes={dcfRes}
        ddmRes={ddmRes}
        dcfWacc={dcfWacc}
        dcfGrowth={dcfGrowth}
        onDcfWaccChange={handleDcfWaccChange}
        onDcfGrowthChange={setDcfGrowth}
      />

      {subTab === 'forensic_warning' && (
        <ForensicWarningSection
          latestRecord={latestRecord}
          chronological={chronological}
          isFinancialStock={isFinancialStock}
          sharesOutstanding={latestRecord ? deriveSharesOutstanding(latestRecord) : undefined}
          directorPledgeRatio={pledge?.pledge_ratio}
          insiderTransferShares={pledge?.insider_transfer_shares}
        />
      )}

      {(subTab === 'news_feed' || subTab === 'news_events') && (
        <div style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '14px', textAlign: 'center' }}>
          <Calendar size={40} style={{ color: 'var(--accent-primary, #3b82f6)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            {subTab === 'news_feed' ? '即時重大訊息公告' : '重大事件日曆 (除權息與法說會)'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '8px auto 20px auto', lineHeight: 1.6 }}>
            {subTab === 'news_feed'
              ? `${stockName} (${symbol}) 公開資訊觀測站即時重大訊息，提供投資人最即時之營運重大事項查驗。`
              : `${stockName} (${symbol}) 包含現金股利除息日程、法說會、股東常會預估時程表。`}
          </p>
          <a
            href="https://mops.twse.com.tw/mops/web/t05st01"
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
            開啟臺灣證券交易所重大訊息專區 <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  );
};
