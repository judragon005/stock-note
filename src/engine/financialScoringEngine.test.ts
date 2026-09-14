import { describe, it, expect } from 'vitest';
import { generateFinancialForensicReport } from './financialScoringEngine';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';

describe('Financial Health Scoring & Executive Summary Engine (TDD Seam)', () => {
  const createHealthyRecords = (): QuarterlyFinancialRecord[] => {
    const list: QuarterlyFinancialRecord[] = [];
    for (let q = 4; q >= 1; q--) {
      list.push({
        symbol: '2330',
        market: 'TW',
        year: 2024,
        quarter: q,
        periodDate: `2024-0${q * 3}-30`,
        income: {
          revenue: 600000000000 + q * 20000000000,
          grossProfit: 320000000000 + q * 12000000000,
          operatingIncome: 250000000000 + q * 10000000000,
          netIncome: 210000000000 + q * 8000000000,
          eps: 8.0 + q * 0.4,
        },
        balanceSheet: {
          totalAssets: 5000000000000,
          totalLiabilities: 1800000000000,
          totalEquity: 3200000000000,
          accountsReceivable: 200000000000,
          inventory: 250000000000,
          cashAndEquivalents: 1600000000000,
          shortTermDebt: 100000000000,
          longTermDebt: 700000000000,
        },
        cashFlow: {
          operatingCashFlow: 350000000000,
          capitalExpenditure: 150000000000,
          dividendPaid: 80000000000,
        },
        auditInfo: {
          opinionType: 'UNQUALIFIED',
          cpaFirm: '勤業眾信聯合會計師事務所',
          isBigFour: true,
        },
        updatedAt: Date.now(),
      });
    }
    return list;
  };

  it('1. 優質企業應獲得高分 (>= 85) 與 EXCELLENT 等級，四大燈號全綠', () => {
    const records = createHealthyRecords();
    const report = generateFinancialForensicReport('2330', 'TW', '台積電', records);

    expect(report.overallScore).toBeGreaterThanOrEqual(85);
    expect(report.overallGrade).toBe('EXCELLENT');
    expect(report.trafficLights.profitability).toBe('GREEN');
    expect(report.trafficLights.safety).toBe('GREEN');
    expect(report.trafficLights.efficiency).toBe('GREEN');
    expect(report.trafficLights.cashFlow).toBe('GREEN');
    expect(report.anomalies).toHaveLength(0);
    expect(report.executiveSummary).toContain('造血');
  });

  it('2. 當發生紙上富貴或塞貨等重大背離時，評分應扣減且等級封頂 WARNING / DANGEROUS', () => {
    const records = createHealthyRecords();
    // 篡改最新一季為紙上富貴 (淨利大增但 CFO 為負)
    records[0].income.netIncome = 500000000000;
    records[0].cashFlow.operatingCashFlow = -50000000000;

    const report = generateFinancialForensicReport('2330', 'TW', '台積電', records);

    expect(report.trafficLights.cashFlow).toBe('RED');
    expect(report.anomalies.some((a) => a.type === 'EARNINGS_QUALITY_DECOUPLING')).toBe(true);
    expect(report.overallScore).toBeLessThan(75);
    expect(report.executiveSummary).toContain('紙上富貴');
  });

  it('3. 金融業標的應自動套用豁免，不因高負債扣除安全性分數', () => {
    const records = createHealthyRecords();
    // 模擬中信金 92% 負債比率
    records[0].symbol = '2891';
    records[0].balanceSheet.totalAssets = 8000000000000;
    records[0].balanceSheet.totalLiabilities = 7360000000000; // 92%
    records[0].balanceSheet.totalEquity = 640000000000;

    const report = generateFinancialForensicReport('2891', 'TW', '中信金', records);

    expect(report.industryAttribute).toBe('FINANCIALS');
    expect(report.trafficLights.safety).toBe('GREEN');
    expect(report.overallScore).toBeGreaterThanOrEqual(75);
  });

  it('4. 空資料時應安全優雅降級，回傳 0 分與預設結構，不拋出異常', () => {
    const report = generateFinancialForensicReport('UNKNOWN', 'TW', '未知公司', []);

    expect(report.overallScore).toBe(0);
    expect(report.overallGrade).toBe('DANGEROUS');
    expect(report.latestPeriod).toBe('N/A');
    expect(report.executiveSummary).toContain('查無');
  });

  it('5. 當 CFO 為負或警告時應產出操盤方針且杜絕「獲利現金流平穩」之矛盾', () => {
    const records = createHealthyRecords();
    records[0].cashFlow.operatingCashFlow = -10000000000;

    const report = generateFinancialForensicReport('2327', 'TW', '國巨', records);

    expect(report.trafficLights.cashFlow).toBe('RED');
    expect(report.directive).toBeDefined();
    expect(report.executiveSummary).not.toContain('獲利與營運現金流處於健康區間');
    expect(report.executiveSummary).toContain('操作方針');
  });

  it('6. 當最新一筆為空殼未申報季 (無淨利/資產) 時，應自動錨定最新完整申報季', () => {
    const baseRecords = createHealthyRecords();
    // 插入一筆空殼 2026-Q2 (僅有營收，無淨利無資產無現金流)
    const shellRecord: QuarterlyFinancialRecord = {
      ...baseRecords[0],
      year: 2026,
      quarter: 2,
      periodDate: '2026-06-30',
      income: {
        revenue: 35000000000,
        grossProfit: 12000000000,
        operatingIncome: 0,
        netIncome: 0,
        eps: 0,
      },
      balanceSheet: {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        accountsReceivable: 0,
        inventory: 0,
        cashAndEquivalents: 0,
      },
      cashFlow: {
        operatingCashFlow: 0,
        capitalExpenditure: 0,
      },
    };

    const valid2025Q2: QuarterlyFinancialRecord = {
      ...baseRecords[0],
      year: 2025,
      quarter: 2,
      periodDate: '2025-06-30',
    };

    const mixedRecords = [shellRecord, valid2025Q2, ...baseRecords];
    const report = generateFinancialForensicReport('2327', 'TW', '國巨', mixedRecords);

    // 評估基準應自動錨定上一筆完整季 2025-Q2，而非空殼 2026-Q2
    expect(report.latestPeriod).toBe('2025-Q2');
    expect(report.duPont.roe).toBeGreaterThan(0);
    expect(report.duPont.netMargin).toBeGreaterThan(0);
  });
});

