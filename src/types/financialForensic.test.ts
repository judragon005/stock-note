import { describe, it, expect } from 'vitest';
import {
  isBigFourFirm,
  type QuarterlyFinancialRecord,
  type FinancialForensicReport,
  type ForensicAnomaly,
  type ForensicAnomalyType,
  type ProfitabilityMetrics,
  type SafetyMetrics,
  type TurnoverMetrics,
  type CashFlowMetrics,
  type DuPontAnalysis,
} from './financialForensic';

describe('Financial Forensic Data Contracts & Canonical Types (TDD Seam)', () => {
  it('1. 應能正確建構並驗證標準 QuarterlyFinancialRecord 16 欄位契約', () => {
    const sampleRecord: QuarterlyFinancialRecord = {
      symbol: '2330',
      market: 'TW',
      year: 2025,
      quarter: 2,
      periodDate: '2025-06-30',
      income: {
        revenue: 673510000000,
        grossProfit: 358300000000,
        operatingIncome: 286200000000,
        netIncome: 247800000000,
        eps: 9.56,
      },
      balanceSheet: {
        totalAssets: 5543000000000,
        totalLiabilities: 2154000000000,
        totalEquity: 3389000000000,
        accountsReceivable: 231000000000,
        inventory: 285000000000,
        cashAndEquivalents: 1850000000000,
        shortTermDebt: 120000000000,
        longTermDebt: 850000000000,
      },
      cashFlow: {
        operatingCashFlow: 382000000000,
        capitalExpenditure: 195000000000,
        stockBasedCompensation: 0,
        dividendPaid: 103700000000,
      },
      auditInfo: {
        opinionType: 'UNQUALIFIED',
        cpaFirm: '勤業眾信聯合會計師事務所 (Deloitte)',
        isBigFour: true,
        keyAuditMatters: ['先進製程設備折舊評估', '存貨評價與呆滯損失'],
      },
      updatedAt: Date.now(),
    };

    expect(sampleRecord.symbol).toBe('2330');
    expect(sampleRecord.market).toBe('TW');
    expect(sampleRecord.income.revenue).toBeGreaterThan(0);
    expect(sampleRecord.balanceSheet.cashAndEquivalents).toBeGreaterThan(0);
    expect(sampleRecord.cashFlow.operatingCashFlow).toBeGreaterThan(0);
    expect(sampleRecord.auditInfo?.isBigFour).toBe(true);
  });

  it('2. 應支援美股專屬欄位（SBC 股權激勵）與缺失選填欄位之安全容錯', () => {
    const usRecord: QuarterlyFinancialRecord = {
      symbol: 'PLTR',
      market: 'US',
      year: 2025,
      quarter: 1,
      periodDate: '2025-03-31',
      income: {
        revenue: 884000000,
        grossProfit: 712000000,
        operatingIncome: 145000000,
        netIncome: 120000000,
        eps: 0.05,
      },
      balanceSheet: {
        totalAssets: 5120000000,
        totalLiabilities: 950000000,
        totalEquity: 4170000000,
        accountsReceivable: 310000000,
        inventory: 0, // SaaS 軟體業零存貨
        cashAndEquivalents: 3800000000,
      },
      cashFlow: {
        operatingCashFlow: 295000000,
        capitalExpenditure: 12000000,
        stockBasedCompensation: 135000000, // 美股 SBC
        dividendPaid: 0,
      },
      auditInfo: {
        opinionType: 'UNQUALIFIED',
        cpaFirm: 'Ernst & Young LLP (EY)',
        isBigFour: true,
      },
      updatedAt: Date.now(),
    };

    expect(usRecord.cashFlow.stockBasedCompensation).toBe(135000000);
    expect(usRecord.balanceSheet.inventory).toBe(0);
    expect(usRecord.balanceSheet.shortTermDebt).toBeUndefined();
  });

  it('3. 應正確定義六大「市場沒說什麼」逆向背離型別與結構', () => {
    const anomalyTypes: ForensicAnomalyType[] = [
      'CHANNEL_STUFFING_DIVERGENCE', // 塞貨與庫存積壓 (DSO/DIO 暴增)
      'EARNINGS_QUALITY_DECOUPLING',  // 紙上富貴 (淨利增但 CFO 為負)
      'DEBT_FUNDED_DIVIDEND',        // 借債配息 (FCF 負卻發高息)
      'CORE_BUSINESS_DECAY',         // 業外美化 (本業衰退靠處分資產)
      'SBC_DILUTION_WARNING',        // SBC 股權稀釋 (SBC/Rev > 15%)
      'AUDITOR_OPINION_RISK',        // 審計查核異常 (保留意見/非四大)
    ];

    const anomaly: ForensicAnomaly = {
      type: 'CHANNEL_STUFFING_DIVERGENCE',
      severity: 'DANGEROUS',
      title: '營收創高但存貨與應收週轉天數異常飆升',
      summary: '本季營收年增 15%，但應收天數暴增 28 天，且存貨天數增加 35 天，呈現典型塞貨特徵。',
      metrics: {
        revenueYoY: 15.2,
        dsoChange: 28.5,
        dioChange: 35.1,
      },
    };

    expect(anomalyTypes).toHaveLength(6);
    expect(anomaly.severity).toBe('DANGEROUS');
    expect(anomaly.metrics?.dsoChange).toBe(28.5);
  });

  it('4. 應正確定義杜邦分析與四大核心維度結構契約', () => {
    const duPont: DuPontAnalysis = {
      roe: 24.5,
      netMargin: 36.7,
      assetTurnover: 0.45,
      equityMultiplier: 1.48,
      primaryDriver: 'PROFITABILITY',
    };

    const profitability: ProfitabilityMetrics = {
      grossMargin: 53.2,
      operatingMargin: 42.5,
      netMargin: 36.7,
      roe: 24.5,
      eps: 9.56,
      marginTrend: 'EXPANDING',
    };

    const safety: SafetyMetrics = {
      debtRatio: 38.8,
      quickRatio: 215.4,
      netCash: 880000000000,
      isNetCashPositive: true,
      interestCoverage: 65.4,
    };

    const turnover: TurnoverMetrics = {
      dsoDays: 30.9,
      dioDays: 52.4,
      dpoDays: 45.2,
      cccDays: 38.1,
    };

    const cashFlow: CashFlowMetrics = {
      operatingCashFlow: 382000000000,
      freeCashFlow: 187000000000,
      realFcfPerShare: 7.21,
      cfoToNetIncomeRatio: 1.54,
      dividendPurity: 'ORGANIC_CASH_FLOW',
    };

    expect(duPont.primaryDriver).toBe('PROFITABILITY');
    expect(safety.isNetCashPositive).toBe(true);
    expect(cashFlow.dividendPurity).toBe('ORGANIC_CASH_FLOW');
    expect(profitability.marginTrend).toBe('EXPANDING');
    expect(turnover.cccDays).toBe(38.1);
  });

  it('5. 應正確定義綜合評級與三層決策報告結構', () => {
    const report: FinancialForensicReport = {
      symbol: '2330',
      market: 'TW',
      companyName: '台積電',
      industryAttribute: 'STANDARD',
      latestPeriod: '2025-Q2',
      overallScore: 92,
      overallGrade: 'EXCELLENT',
      trafficLights: {
        profitability: 'GREEN',
        safety: 'GREEN',
        efficiency: 'GREEN',
        cashFlow: 'GREEN',
      },
      executiveSummary: '本業造血能力極為強勁，連續 8 季毛利率穩健擴張，淨現金水位充沛，無任何結構性背離。',
      anomalies: [],
      duPont: {
        roe: 24.5,
        netMargin: 36.7,
        assetTurnover: 0.45,
        equityMultiplier: 1.48,
        primaryDriver: 'PROFITABILITY',
      },
      historicalRecords: [],
      updatedAt: Date.now(),
    };

    expect(report.overallScore).toBe(92);
    expect(report.overallGrade).toBe('EXCELLENT');
    expect(report.trafficLights.profitability).toBe('GREEN');
    expect(report.anomalies).toHaveLength(0);
  });

  it('6. 應能準確識別四大會計師事務所 (Deloitte, KPMG, PwC, EY)', () => {
    expect(isBigFourFirm('勤業眾信聯合會計師事務所')).toBe(true);
    expect(isBigFourFirm('Deloitte & Touche')).toBe(true);
    expect(isBigFourFirm('資誠聯合會計師事務所')).toBe(true);
    expect(isBigFourFirm('PricewaterhouseCoopers LLP')).toBe(true);
    expect(isBigFourFirm('安侯建業聯合會計師事務所')).toBe(true);
    expect(isBigFourFirm('KPMG Taiwan')).toBe(true);
    expect(isBigFourFirm('安永聯合會計師事務所')).toBe(true);
    expect(isBigFourFirm('Ernst & Young Global')).toBe(true);

    // 非四大事務所
    expect(isBigFourFirm('正風聯合會計師事務所')).toBe(false);
    expect(isBigFourFirm('大華聯合會計師事務所')).toBe(false);
    expect(isBigFourFirm(undefined)).toBe(false);
    expect(isBigFourFirm('')).toBe(false);
  });
});
