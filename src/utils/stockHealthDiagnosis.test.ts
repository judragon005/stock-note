import { describe, it, expect } from 'vitest';
import type { QuarterlyFinancialRecord } from '../types/financialForensic';
import { computeStockHealthDiagnosis } from './stockHealthDiagnosis';

function createMockQuarter(
  year: number,
  quarter: number,
  overrides?: Partial<QuarterlyFinancialRecord>
): QuarterlyFinancialRecord {
  return {
    symbol: 'TEST',
    market: 'TW',
    year,
    quarter,
    periodDate: `${year}-${String(quarter * 3).padStart(2, '0')}-30`,
    income: {
      revenue: 100000000,
      grossProfit: 40000000,
      operatingIncome: 20000000,
      netIncome: 15000000,
      eps: 1.5,
      ...overrides?.income,
    },
    balanceSheet: {
      totalAssets: 500000000,
      totalLiabilities: 200000000,
      totalEquity: 300000000,
      accountsReceivable: 20000000,
      inventory: 15000000,
      cashAndEquivalents: 80000000,
      ...overrides?.balanceSheet,
    },
    cashFlow: {
      operatingCashFlow: 18000000, // CFO > NetIncome
      capitalExpenditure: 5000000,  // FCF = 18M - 5M = 13M > 0
      dividendPaid: 10000000,
      ...overrides?.cashFlow,
    },
    updatedAt: Date.now(),
    ...overrides,
  };
}

// 建立 5 年 (20 季) 連續測試財報，從 2021-Q1 到 2025-Q4
function create5YearMockRecords(
  customizer?: (year: number, quarter: number) => Partial<QuarterlyFinancialRecord>
): QuarterlyFinancialRecord[] {
  const records: QuarterlyFinancialRecord[] = [];
  for (let y = 2021; y <= 2025; y++) {
    for (let q = 1; q <= 4; q++) {
      const override = customizer ? customizer(y, q) : {};
      records.push(createMockQuarter(y, q, override));
    }
  }
  return records;
}

describe('Stock Health Diagnosis Engine (股票健診計算引擎 TDD)', () => {
  describe('模組 A：排除地雷股健診 (Safe Guard - 6 項指標)', () => {
    it('健康公司：5 年 FCF 均正且 CFO/淨利比 > 100%，週轉天數下降，應通過所有 6 項條件', () => {
      const records = create5YearMockRecords((y, q) => {
        // 讓最新一季 (2025-Q4) 的應收帳款與存貨低於去年同期 (2024-Q4)
        if (y === 2025 && q === 4) {
          return {
            balanceSheet: {
              totalAssets: 500000000,
              totalLiabilities: 200000000,
              totalEquity: 300000000,
              accountsReceivable: 10000000, // 去年為 20000000，天數減半
              inventory: 8000000,           // 去年為 15000000，天數減半
              cashAndEquivalents: 100000000,
            },
          };
        }
        return {};
      });

      const res = computeStockHealthDiagnosis({
        symbol: 'TEST',
        currentPrice: 100,
        records,
      });

      const safeGuard = res.categories.find((c) => c.category === 'SAFE_GUARD');
      expect(safeGuard).toBeDefined();
      expect(safeGuard?.totalItems).toBe(6);
      expect(safeGuard?.passedItems).toBe(6);
      expect(safeGuard?.passRatio).toBe(100);
      expect(safeGuard?.items.every((i) => i.passed)).toBe(true);
    });

    it('假帳灌水地雷：FCF 長期為負且週轉天數惡化，應精確判定沒過', () => {
      const records = create5YearMockRecords((y, q) => {
        // 讓 FCF 全為負，且 CFO 遠低於淨利
        const isLatest = y === 2025 && q === 4;
        return {
          income: {
            revenue: 100000000,
            grossProfit: 40000000,
            operatingIncome: 20000000,
            netIncome: 50000000, // 帳面淨利極高
            eps: 5,
          },
          balanceSheet: {
            totalAssets: 500000000,
            totalLiabilities: 200000000,
            totalEquity: 300000000,
            accountsReceivable: isLatest ? 80000000 : 20000000, // 應收帳款暴增
            inventory: isLatest ? 60000000 : 15000000,          // 存貨暴增
            cashAndEquivalents: 10000000,
          },
          cashFlow: {
            operatingCashFlow: -5000000,  // 現金流為負
            capitalExpenditure: 10000000, // FCF = -15M < 0
          },
        };
      });

      const res = computeStockHealthDiagnosis({
        symbol: 'TEST',
        currentPrice: 100,
        records,
      });

      const safeGuard = res.categories.find((c) => c.category === 'SAFE_GUARD');
      expect(safeGuard?.passedItems).toBe(0);
      expect(safeGuard?.passRatio).toBe(0);
      expect(safeGuard?.items.every((i) => !i.passed)).toBe(true);
    });

    it('金融股自動豁免機制：若標的為金融保險業，存貨與帳款指標自動標記 exempted，總項目為 4 項', () => {
      const records = create5YearMockRecords();

      const res = computeStockHealthDiagnosis({
        symbol: '2881',
        industryAttribute: 'FINANCIALS',
        currentPrice: 70,
        records,
      });

      const safeGuard = res.categories.find((c) => c.category === 'SAFE_GUARD');
      expect(safeGuard).toBeDefined();
      expect(safeGuard?.totalItems).toBe(4); // 豁免兩項後分母為 4

      const arItem = safeGuard?.items.find((i) => i.id === 'sg_ar_turnover');
      const invItem = safeGuard?.items.find((i) => i.id === 'sg_inv_turnover');
      expect(arItem?.exempted).toBe(true);
      expect(invItem?.exempted).toBe(true);
    });
  });

  describe('模組 B：定存股健診 (Dividend Value - 5 項指標)', () => {
    it('高殖利率與穩定配息公司應全數通過 5 項指標', () => {
      const records = create5YearMockRecords(() => ({
        income: {
          revenue: 100000000,
          grossProfit: 40000000,
          operatingIncome: 20000000,
          netIncome: 15000000,
          eps: 2.5, // 年 EPS = 10 元
        },
      }));

      // 每年發 7 元股利 (配息率 70% > 50%，股價 100 元殖利率 7% > 6%)
      const annualDividends = [
        { year: 2021, amount: 7 },
        { year: 2022, amount: 7 },
        { year: 2023, amount: 7 },
        { year: 2024, amount: 7 },
        { year: 2025, amount: 7 },
      ];

      const res = computeStockHealthDiagnosis({
        symbol: 'TEST',
        currentPrice: 100,
        records,
        annualDividends,
      });

      const divCat = res.categories.find((c) => c.category === 'DIVIDEND_VALUE');
      expect(divCat?.totalItems).toBe(5);
      expect(divCat?.passedItems).toBe(5);
      expect(divCat?.passRatio).toBe(100);
    });

    it('低殖利率或配息不穩之公司應精準識別未通過項', () => {
      const records = create5YearMockRecords();
      // 殖利率僅 2% (< 6%)，且中斷一年配息
      const annualDividends = [
        { year: 2021, amount: 2 },
        { year: 2022, amount: 0 }, // 中斷未配
        { year: 2023, amount: 2 },
        { year: 2024, amount: 2 },
        { year: 2025, amount: 2 },
      ];

      const res = computeStockHealthDiagnosis({
        symbol: 'TEST',
        currentPrice: 100,
        records,
        annualDividends,
      });

      const divCat = res.categories.find((c) => c.category === 'DIVIDEND_VALUE');
      const yield1Y = divCat?.items.find((i) => i.id === 'div_yield_1y');
      const cons5Y = divCat?.items.find((i) => i.id === 'div_consecutive_5y');

      expect(yield1Y?.passed).toBe(false);
      expect(cons5Y?.passed).toBe(false);
    });
  });

  describe('模組 C：成長股健診 (Growth Momentum - 4 項指標)', () => {
    it('當最新一季毛利、營業利益、稅前及稅後淨利 YoY 均為正時，通過 4/4 條件', () => {
      const records = create5YearMockRecords((y, q) => {
        // 讓 2025-Q4 數值高於 2024-Q4
        if (y === 2025 && q === 4) {
          return {
            income: {
              revenue: 120000000,
              grossProfit: 50000000,     // 去年為 40M
              operatingIncome: 25000000, // 去年為 20M
              netIncome: 18000000,       // 去年為 15M
              eps: 1.8,
            },
          };
        }
        return {};
      });

      const res = computeStockHealthDiagnosis({
        symbol: 'TEST',
        currentPrice: 100,
        records,
      });

      const growth = res.categories.find((c) => c.category === 'GROWTH_MOMENTUM');
      expect(growth?.totalItems).toBe(4);
      expect(growth?.passedItems).toBe(4);
      expect(growth?.passRatio).toBe(100);
    });

    it('當利潤全面衰退時，通過率應為 0%', () => {
      const records = create5YearMockRecords((y, q) => {
        // 讓 2025-Q4 數值大幅低於 2024-Q4
        if (y === 2025 && q === 4) {
          return {
            income: {
              revenue: 80000000,
              grossProfit: 20000000,     // 去年為 40M
              operatingIncome: 10000000, // 去年為 20M
              netIncome: 5000000,        // 去年為 15M
              eps: 0.5,
            },
          };
        }
        return {};
      });

      const res = computeStockHealthDiagnosis({
        symbol: 'TEST',
        currentPrice: 100,
        records,
      });

      const growth = res.categories.find((c) => c.category === 'GROWTH_MOMENTUM');
      expect(growth?.passedItems).toBe(0);
      expect(growth?.passRatio).toBe(0);
    });
  });

  describe('模組 D：便宜股健診 (Cheap Valuation - 6 項指標)', () => {
    it('當估值處於自身歷史低檔 (PE/PB 均位於前 20% 低位) 且高殖利率時，全數通過', () => {
      // 建立過去 20 季高淨值與高獲利，當前股價 30 元極度低估
      const records = create5YearMockRecords();
      const annualDividends = [
        { year: 2021, amount: 4 },
        { year: 2022, amount: 4 },
        { year: 2023, amount: 4 },
        { year: 2024, amount: 4 },
        { year: 2025, amount: 4 },
      ];

      const res = computeStockHealthDiagnosis({
        symbol: 'TEST',
        currentPrice: 30, // 股價 30 元，PE 僅 5 倍、PB 僅 0.3 倍，殖利率高達 13.3%
        records,
        annualDividends,
      });

      const cheap = res.categories.find((c) => c.category === 'CHEAP_VALUATION');
      expect(cheap?.totalItems).toBe(6);
      expect(cheap?.passedItems).toBe(6);
      expect(cheap?.passRatio).toBe(100);
    });
  });

  describe('極端邊界與容錯防禦', () => {
    it('當財報資料為空或少於 4 季時，應安全返回防呆狀態，不噴錯崩潰', () => {
      const res = computeStockHealthDiagnosis({
        symbol: 'EMPTY',
        currentPrice: 100,
        records: [],
      });

      expect(res.isDataSufficient).toBe(false);
      expect(res.categories).toHaveLength(4);
      expect(res.categories.every((c) => c.passedItems === 0)).toBe(true);
    });
  });
});
