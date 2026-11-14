import { describe, it, expect } from 'vitest';
import {
  generate12MonthProjectedCashflow,
  ProjectedCashflowInput,
  recommendComplementaryDividendMonths,
  FALLBACK_SUMMER_MONTHS,
} from './projectedCashflowEngine';
import { HoldingPosition } from '../types/stock';

describe('Spec 0183 Ticket 02: projectedCashflowEngine (未來 12 個月現金流投影)', () => {
  const mockHoldings: HoldingPosition[] = [
    {
      symbol: '00929',
      name: '復華台灣科技優息',
      shares: 10000,
      avgCost: 20,
      currentPrice: 21,
      marketValue: 210000,
      unrealizedPnL: 10000,
      unrealizedPnLPercent: 5,
      market: 'TW',
    },
    {
      symbol: '00878',
      name: '國泰永續高股息',
      shares: 5000,
      avgCost: 22,
      currentPrice: 23,
      marketValue: 115000,
      unrealizedPnL: 5000,
      unrealizedPnLPercent: 4.5,
      market: 'TW',
    },
    {
      symbol: '2330',
      name: '台積電',
      shares: 1000,
      avgCost: 900,
      currentPrice: 1000,
      marketValue: 1000000,
      unrealizedPnL: 100000,
      unrealizedPnLPercent: 11.1,
      market: 'TW',
    },
  ] as unknown as HoldingPosition[];

  it('1. 應正確根據當前基準月份 (如 2026-10) 產生連續 12 個月時間軸', () => {
    const input: ProjectedCashflowInput = {
      baseYearMonth: '2026-10',
      holdings: mockHoldings,
      customPayoutRates: {
        '00929': { frequency: 'MONTHLY', estimatedPerShare: 0.15 }, // 每月發 0.15
        '00878': { frequency: 'QUARTERLY', estimatedPerShare: 0.55, payoutMonths: [2, 5, 8, 11] }, // 2, 5, 8, 11 月發放
        '2330': { frequency: 'QUARTERLY', estimatedPerShare: 4.5, payoutMonths: [1, 4, 7, 10] }, // 1, 4, 7, 10 月發放
      },
    };

    const projection = generate12MonthProjectedCashflow(input);

    expect(projection.months).toHaveLength(12);
    expect(projection.months[0].yearMonth).toBe('2026-10');
    expect(projection.months[11].yearMonth).toBe('2027-09');

    // 2026-10 月份應包含 00929 (10,000 * 0.15 = 1,500) 與 2330 (1,000 * 4.5 = 4,500) = 6,000
    const oct2026 = projection.months[0];
    expect(oct2026.estimatedTotalTwd).toBe(6000);
    expect(oct2026.breakdown).toHaveLength(2);

    // 2026-11 月份應包含 00929 (1,500) 與 00878 (5,000 * 0.55 = 2,750) = 4,250
    const nov2026 = projection.months[1];
    expect(nov2026.estimatedTotalTwd).toBe(4250);

    // 2026-12 月份僅有 00929 (1,500)
    const dec2026 = projection.months[2];
    expect(dec2026.estimatedTotalTwd).toBe(1500);
  });

  it('2. 應準確計算月均股息並辨識枯水期月份 (低於月均 50%)', () => {
    const input: ProjectedCashflowInput = {
      baseYearMonth: '2026-10',
      holdings: mockHoldings,
      customPayoutRates: {
        '00929': { frequency: 'MONTHLY', estimatedPerShare: 0.15 }, // 12 * 1,500 = 18,000
        '00878': { frequency: 'QUARTERLY', estimatedPerShare: 0.55, payoutMonths: [2, 5, 8, 11] }, // 4 * 2,750 = 11,000
        '2330': { frequency: 'QUARTERLY', estimatedPerShare: 4.5, payoutMonths: [1, 4, 7, 10] }, // 4 * 4,500 = 18,000
      },
    };

    const projection = generate12MonthProjectedCashflow(input);
    // 全年總預估 = 18,000 + 11,000 + 18,000 = 47,000
    // 月均 = 47,000 / 12 ≈ 3,916.67
    // 枯水期閥值 (50%) ≈ 1,958.33
    expect(projection.annualTotalTwd).toBe(47000);
    expect(Math.round(projection.monthlyAverageTwd)).toBe(3917);

    // 2026-12 只有 1,500，低於 1,958.33，應標記為 isDrySeason = true
    const dec2026 = projection.months.find((m) => m.yearMonth === '2026-12');
    expect(dec2026?.isDrySeason).toBe(true);

    // 2026-10 有 6,000，不應標記為枯水期
    const oct2026 = projection.months.find((m) => m.yearMonth === '2026-10');
    expect(oct2026?.isDrySeason).toBe(false);
  });

  it('3. detectDrySeasonMonths 與 recommendComplementaryDividendMonths 應能產出互補標的配息建議', () => {
    // 缺少 3, 6, 9, 12 月現金流時，應推薦在 3, 6, 9, 12 月發放的 00878
    const drySeasonMonths36912 = [3, 6, 9, 12];
    const recs36912 = recommendComplementaryDividendMonths(drySeasonMonths36912);
    expect(recs36912.some((r) => r.symbol === '00878')).toBe(true);

    // 缺少 1, 4, 7, 10 月現金流時，應推薦在 1, 4, 7, 10 月發放的 00919 或 00713
    const drySeasonMonths14710 = [1, 4, 7, 10];
    const recs14710 = recommendComplementaryDividendMonths(drySeasonMonths14710);
    expect(recs14710.some((r) => r.symbol === '00919' || r.symbol === '00713')).toBe(true);
  });

  it('4. [Spec 0227 / Ticket 01] 0056 預設發放月應精準對齊實際入帳發放月 [2, 5, 8, 11]，而非除息月', () => {
    const holdingsWith0056: HoldingPosition[] = [
      {
        symbol: '0056',
        name: '元大高股息',
        shares: 10000,
        avgCost: 35,
        currentPrice: 38,
        marketValue: 380000,
        unrealizedPnL: 30000,
        unrealizedPnLPercent: 8.57,
        market: 'TW',
      } as unknown as HoldingPosition,
    ];

    const input: ProjectedCashflowInput = {
      baseYearMonth: '2026-10',
      holdings: holdingsWith0056,
      // 不傳入 customPayoutRates，使用預設 DEFAULT_DIVIDEND_PROFILES
    };

    const projection = generate12MonthProjectedCashflow(input);

    // 0056 現金發放日為 2, 5, 8, 11 月，10 月不應有配息入帳！
    const oct2026 = projection.months.find((m) => m.yearMonth === '2026-10');
    expect(oct2026?.estimatedTotalTwd).toBe(0);
    expect(oct2026?.breakdown).toHaveLength(0);

    // 11 月應有 0056 配息入帳！
    const nov2026 = projection.months.find((m) => m.yearMonth === '2026-11');
    expect(nov2026?.estimatedTotalTwd).toBeGreaterThan(0);
    expect(nov2026?.breakdown.some((b) => b.symbol === '0056')).toBe(true);

    // 2 月應有 0056 配息入帳！
    const feb2027 = projection.months.find((m) => m.yearMonth === '2027-02');
    expect(feb2027?.estimatedTotalTwd).toBeGreaterThan(0);
    expect(feb2027?.breakdown.some((b) => b.symbol === '0056')).toBe(true);
  });

  it('5. [Spec 0227 / Ticket 01] 非清單普通股持倉不應全部粗暴擠在 8 月單點發放造成假性暴衝', () => {
    // 模擬用戶持有 20 檔非清單內普通股
    const genericHoldings: HoldingPosition[] = Array.from({ length: 20 }, (_, i) => ({
      symbol: `STOCK${i + 1}`,
      name: `普通股${i + 1}`,
      shares: 1000,
      avgCost: 50,
      currentPrice: 50,
      marketValue: 50000,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      market: 'TW',
    })) as unknown as HoldingPosition[];

    const input: ProjectedCashflowInput = {
      baseYearMonth: '2026-01',
      holdings: genericHoldings,
    };

    const projection = generate12MonthProjectedCashflow(input);

    // 8 月份不應單點包攬全部 20 筆股票之發放 (解除單月 100% 暴衝 Bug)
    const augMonth = projection.months.find((m) => m.yearMonth === '2026-08');
    expect(augMonth?.breakdown.length).toBeLessThan(20);
  });

  it('6. [Spec 0227 / Review Fix] 歷史發放月與 Profile 預設發放月應取聯集補齊，杜絕因僅有 1 筆入帳而覆蓋季配節奏', () => {
    const holdingsWith0056: HoldingPosition[] = [
      {
        symbol: '0056',
        name: '元大高股息',
        shares: 10000,
        avgCost: 35,
        currentPrice: 38,
        marketValue: 380000,
        unrealizedPnL: 30000,
        unrealizedPnLPercent: 8.57,
        market: 'TW',
      } as unknown as HoldingPosition,
    ];

    const input: ProjectedCashflowInput = {
      baseYearMonth: '2026-10',
      holdings: holdingsWith0056,
      // 模擬帳本歷史上只記錄了一筆 11 月的 0056 配息
      historicalPayoutMonths: {
        '0056': [11],
      },
    };

    const projection = generate12MonthProjectedCashflow(input);

    // 0056 本身為季配 [2, 5, 8, 11]，聯集後應保留 2, 5, 8, 11 四個發放月
    const nov2026 = projection.months.find((m) => m.yearMonth === '2026-11');
    const feb2027 = projection.months.find((m) => m.yearMonth === '2027-02');
    const may2027 = projection.months.find((m) => m.yearMonth === '2027-05');
    const aug2027 = projection.months.find((m) => m.yearMonth === '2027-08');

    expect(nov2026?.breakdown.some((b) => b.symbol === '0056')).toBe(true);
    expect(feb2027?.breakdown.some((b) => b.symbol === '0056')).toBe(true);
    expect(may2027?.breakdown.some((b) => b.symbol === '0056')).toBe(true);
    expect(aug2027?.breakdown.some((b) => b.symbol === '0056')).toBe(true);
  });

  it('7. [Spec 0227 / Review Refinements] Profile 標的即使歷史月份包含非典型特例月，單期金額仍以 Profile 原生常態頻率次數計算防止稀釋', () => {
    const holdingsWith0056: HoldingPosition[] = [
      {
        symbol: '0056',
        name: '元大高股息',
        shares: 10000,
        avgCost: 35,
        currentPrice: 38,
        marketValue: 380000,
        unrealizedPnL: 30000,
        unrealizedPnLPercent: 8.57,
        market: 'TW',
      } as unknown as HoldingPosition,
    ];

    // 0056 常態 defaultYield 為 0.07，全年期望 = 38 * 0.07 * 10,000 = 26,600
    // 常態 4 次季配，每期應為 26,600 / 4 = 6,650
    // 假設帳本歷史因特例額外多記了 6 月（共 5 個月：2, 5, 6, 8, 11）
    const input: ProjectedCashflowInput = {
      baseYearMonth: '2026-10',
      holdings: holdingsWith0056,
      historicalPayoutMonths: {
        '0056': [2, 5, 6, 8, 11],
      },
    };

    const projection = generate12MonthProjectedCashflow(input);
    const nov2026 = projection.months.find((m) => m.yearMonth === '2026-11');
    const b0056 = nov2026?.breakdown.find((b) => b.symbol === '0056');

    expect(b0056).toBeDefined();
    // 應維持每期 6,650，而不是被除以 5 稀釋為 5,320
    expect(b0056?.estimatedAmountTwd).toBe(6650);
  });

  it('8. [Spec 0227 / Code Review Fix] FALLBACK_SUMMER_MONTHS 應嚴格對齊台股除權息週期 7~9 月', () => {
    expect(FALLBACK_SUMMER_MONTHS).toEqual([7, 8, 9]);
  });
});
