import { describe, it, expect } from 'vitest';
import {
  detectForensicAnomalies,
  evaluateDividendPurity,
} from './forensicRadarEngine';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';

describe('Forensic Radar & "The Unspoken" Contrarian Engine (TDD Seam)', () => {
  const createBaseRecord = (
    quarter: number,
    overrides?: Partial<QuarterlyFinancialRecord>
  ): QuarterlyFinancialRecord => ({
    symbol: 'TEST',
    market: 'TW',
    year: 2025,
    quarter,
    periodDate: `2025-0${quarter * 3}-30`,
    ...overrides,
    income: {
      revenue: 1000000,
      grossProfit: 400000,
      operatingIncome: 250000,
      netIncome: 200000,
      eps: 2.0,
      ...overrides?.income,
    },
    balanceSheet: {
      totalAssets: 2000000,
      totalLiabilities: 800000,
      totalEquity: 1200000,
      accountsReceivable: 100000,
      inventory: 150000,
      cashAndEquivalents: 500000,
      ...overrides?.balanceSheet,
    },
    cashFlow: {
      operatingCashFlow: 220000,
      capitalExpenditure: 80000,
      stockBasedCompensation: 0,
      dividendPaid: 50000,
      ...overrides?.cashFlow,
    },
    auditInfo: {
      opinionType: 'UNQUALIFIED',
      cpaFirm: '勤業眾信聯合會計師事務所',
      isBigFour: true,
      ...overrides?.auditInfo,
    },
    updatedAt: Date.now(),
  });

  describe('1. 塞貨與庫存滯銷背離 (CHANNEL_STUFFING_DIVERGENCE)', () => {
    it('當營收年增但應收與存貨天數劇烈飆升時，應檢出塞貨背離', () => {
      // 基準季度 (4 季前)
      const base = createBaseRecord(1, {
        income: { revenue: 800000, grossProfit: 320000, operatingIncome: 180000, netIncome: 150000, eps: 1.5 },
        balanceSheet: { totalAssets: 1600000, totalLiabilities: 600000, totalEquity: 1000000, accountsReceivable: 80000, inventory: 100000, cashAndEquivalents: 400000 },
      });
      // 最新季度: 營收成長 25% (100萬 vs 80萬)，但應收天數 (350000*90/1000000 = 31.5天 vs 9天) 飆增 > 20天
      const latest = createBaseRecord(2, {
        income: { revenue: 1000000, grossProfit: 400000, operatingIncome: 220000, netIncome: 180000, eps: 1.8 },
        balanceSheet: { totalAssets: 2200000, totalLiabilities: 900000, totalEquity: 1300000, accountsReceivable: 350000, inventory: 350000, cashAndEquivalents: 300000 },
      });

      const anomalies = detectForensicAnomalies([latest, base]);
      const stuffAnomaly = anomalies.find((a) => a.type === 'CHANNEL_STUFFING_DIVERGENCE');

      expect(stuffAnomaly).toBeDefined();
      expect(stuffAnomaly?.severity).toBe('DANGEROUS');
      expect(stuffAnomaly?.summary).toContain('塞貨');
    });
  });

  describe('2. 紙上富貴與現金流脫鉤 (EARNINGS_QUALITY_DECOUPLING)', () => {
    it('當淨利創新高但營業現金流 (CFO) 為負數時，應檢出紙上富貴警訊', () => {
      const record = createBaseRecord(1, {
        income: { revenue: 1200000, grossProfit: 500000, operatingIncome: 350000, netIncome: 300000, eps: 3.0 },
        cashFlow: { operatingCashFlow: -50000, capitalExpenditure: 40000 }, // CFO 負數
      });

      const anomalies = detectForensicAnomalies([record]);
      const cashAnomaly = anomalies.find((a) => a.type === 'EARNINGS_QUALITY_DECOUPLING');

      expect(cashAnomaly).toBeDefined();
      expect(cashAnomaly?.severity).toBe('DANGEROUS');
      expect(cashAnomaly?.summary).toContain('紙上富貴');
    });
  });

  describe('3. 借債配息與老本掏空 (DEBT_FUNDED_DIVIDEND)', () => {
    it('當股利發放額遠大於 FCF 且負債上升時，應檢出借債配息警戒', () => {
      // 基準季度 (負債 60萬)
      const base = createBaseRecord(1, {
        balanceSheet: { totalAssets: 1500000, totalLiabilities: 600000, totalEquity: 900000, accountsReceivable: 50000, inventory: 50000, cashAndEquivalents: 300000 },
      });
      // 最新季度 (負債 90萬，FCF = 5萬 - 6萬 = -1萬，卻發放 15 萬股利)
      const latest = createBaseRecord(2, {
        balanceSheet: { totalAssets: 1800000, totalLiabilities: 900000, totalEquity: 900000, accountsReceivable: 80000, inventory: 80000, cashAndEquivalents: 150000 },
        cashFlow: { operatingCashFlow: 50000, capitalExpenditure: 60000, dividendPaid: 150000 },
      });

      const anomalies = detectForensicAnomalies([latest, base]);
      const divAnomaly = anomalies.find((a) => a.type === 'DEBT_FUNDED_DIVIDEND');

      expect(divAnomaly).toBeDefined();
      expect(divAnomaly?.severity).toBe('WARNING');
      expect(divAnomaly?.summary).toContain('借債配息');
    });

    it('evaluateDividendPurity 應能正確標記配息純度', () => {
      // 正常 FCF 支應
      expect(evaluateDividendPurity(50000, 100000)).toBe('ORGANIC_CASH_FLOW');
      // 借債/透支老本支應
      expect(evaluateDividendPurity(150000, -20000)).toBe('DEBT_FINANCED');
      // 未發放股利
      expect(evaluateDividendPurity(0, 100000)).toBe('NO_DIVIDEND');
    });
  });

  describe('4. 業外美化與本業衰退 (CORE_BUSINESS_DECAY)', () => {
    it('當稅後淨利年增 > 15% 但營業利益年增 < -10% 時，應標記業外美化', () => {
      // 基準季度
      const base = createBaseRecord(1, {
        income: { revenue: 1000000, grossProfit: 400000, operatingIncome: 250000, netIncome: 180000, eps: 1.8 },
      });
      // 最新季度: 營業利益大跌至 18萬 (-28%)，但淨利大增至 25萬 (+38%，賣地/處分轉投資)
      const latest = createBaseRecord(2, {
        income: { revenue: 950000, grossProfit: 320000, operatingIncome: 180000, netIncome: 250000, eps: 2.5 },
      });

      const anomalies = detectForensicAnomalies([latest, base]);
      const coreAnomaly = anomalies.find((a) => a.type === 'CORE_BUSINESS_DECAY');

      expect(coreAnomaly).toBeDefined();
      expect(coreAnomaly?.severity).toBe('WARNING');
      expect(coreAnomaly?.summary).toContain('業外美化');
    });
  });

  describe('5. 美股 SBC 股權稀釋 (SBC_DILUTION_WARNING)', () => {
    it('當美股標的 SBC 佔營收比重超過 15% 時，應標記 SBC 稀釋警戒', () => {
      const usRecord = createBaseRecord(1, {
        market: 'US',
        income: { revenue: 1000000, grossProfit: 700000, operatingIncome: 100000, netIncome: 80000, eps: 0.2 },
        cashFlow: { operatingCashFlow: 250000, capitalExpenditure: 30000, stockBasedCompensation: 220000 }, // SBC 佔營收 22%
      });

      const anomalies = detectForensicAnomalies([usRecord]);
      const sbcAnomaly = anomalies.find((a) => a.type === 'SBC_DILUTION_WARNING');

      expect(sbcAnomaly).toBeDefined();
      expect(sbcAnomaly?.severity).toBe('WARNING');
      expect(sbcAnomaly?.summary).toContain('SBC');
    });
  });

  describe('6. 審計查核意見異常 (AUDITOR_OPINION_RISK)', () => {
    it('當會計師出具非無保留意見時，應檢出重大審計風險', () => {
      const auditRiskRecord = createBaseRecord(1, {
        auditInfo: {
          opinionType: 'QUALIFIED',
          cpaFirm: '某某會計師事務所',
          isBigFour: false,
          keyAuditMatters: ['重大存貨評價損失難以核實'],
        },
      });

      const anomalies = detectForensicAnomalies([auditRiskRecord]);
      const auditAnomaly = anomalies.find((a) => a.type === 'AUDITOR_OPINION_RISK');

      expect(auditAnomaly).toBeDefined();
      expect(auditAnomaly?.severity).toBe('DANGEROUS');
      expect(auditAnomaly?.summary).toContain('審計');
    });
  });

  describe('7. 財務健康優質企業無任何背離', () => {
    it('健全企業應回傳空陣列 (零背離)', () => {
      const healthy1 = createBaseRecord(1);
      const healthy2 = createBaseRecord(2);

      const anomalies = detectForensicAnomalies([healthy2, healthy1]);
      expect(anomalies).toHaveLength(0);
    });
  });
});
