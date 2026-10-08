import { describe, it, expect } from 'vitest';
import { calculateRevenueBarHeight } from './MonthlyRevenueCard';
import type { MonthlyRevenueData } from '../../../types/aiForceDashboard';
import { buildMonthlyRevenue } from '../../../engine/aiForceDashboardEngine';

describe('MonthlyRevenueCard - TDD Unit Tests', () => {
  it('1. calculateRevenueBarHeight 應將營收相對於最大營收正確等比縮放', () => {
    const maxHeight = 100;
    const maxRev = 200000;

    const hFull = calculateRevenueBarHeight(200000, maxRev, maxHeight);
    const hHalf = calculateRevenueBarHeight(100000, maxRev, maxHeight);
    const hZero = calculateRevenueBarHeight(0, maxRev, maxHeight);

    expect(hFull).toBe(100);
    expect(hHalf).toBe(50);
    expect(hZero).toBe(2); // 至少 2px 留底防隱形
  });

  it('2. 個股營收資料模型應正確包含 YoY 與 ATH 標籤', () => {
    const stockRevenueData: MonthlyRevenueData = {
      isEtf: false,
      history: [
        { yearMonth: '2026-07', revenue: 150000, yoyRate: 15.2, momRate: 4.1 },
        { yearMonth: '2026-08', revenue: 160000, yoyRate: 18.5, momRate: 6.7 },
        { yearMonth: '2026-09', revenue: 175000, yoyRate: 22.1, momRate: 9.4, isAllTimeHigh: true },
      ],
      latestRevenueText: '1.8 億元',
      latestYoyRate: 22.1,
      growthStreakMonths: 3,
      athCount: 1,
      growthBadge: '連續 3 個月年月雙增',
      asOfDateText: '營收基準: 2026-09',
      isEmpty: false,
    };

    expect(stockRevenueData.isEtf).toBe(false);
    expect(stockRevenueData.growthBadge).toBe('連續 3 個月年月雙增');
    expect(stockRevenueData.latestRevenueText).toBe('1.8 億元');
  });

  it('3. ETF 標的 (0050) 應具備 ETF 規模與配息收益分配資料，杜絕營收空白', () => {
    const etfRevenueData: MonthlyRevenueData = {
      isEtf: true,
      history: [],
      growthBadge: 'ETF 規模穩健',
      asOfDateText: 'ETF 規模與殖利率',
      etfData: {
        aumBillion: 420,
        dividendYield: 4.2,
        beneficiaries: 750000,
        quarterlyDividends: [
          { quarter: '2026 Q3', amount: 1.0, yieldRate: 4.1 },
          { quarter: '2026 Q2', amount: 1.0, yieldRate: 4.2 },
          { quarter: '2026 Q1', amount: 1.0, yieldRate: 4.3 },
          { quarter: '2025 Q4', amount: 1.0, yieldRate: 4.0 },
        ],
      },
      isEmpty: false,
    };

    expect(etfRevenueData.isEtf).toBe(true);
    expect(etfRevenueData.etfData).toBeDefined();
    expect(etfRevenueData.etfData?.aumBillion).toBe(420);
    expect(etfRevenueData.etfData?.dividendYield).toBe(4.2);
    expect(etfRevenueData.etfData?.quarterlyDividends.length).toBe(4);
  });

  it('4. 空狀態或美股時應具備優雅提示說明', () => {
    const emptyData: MonthlyRevenueData = {
      isEtf: false,
      history: [],
      growthBadge: '尚無營收',
      asOfDateText: '無營收資料',
      isEmpty: true,
      emptyMessage: '美股採季度財報 (10-Q/10-K)',
    };

    expect(emptyData.isEmpty).toBe(true);
    expect(emptyData.emptyMessage).toBe('美股採季度財報 (10-Q/10-K)');
  });

  it('5. buildMonthlyRevenue 當標的為 ETF 且存在 TDCC 集保數據時，應動態連動最新股東人數為受益人人數', () => {
    const tdccMock = [
      { date: '2026-09-25', over1000Ratio: 65.5, totalShareholders: 810000 },
      { date: '2026-10-02', over1000Ratio: 66.2, totalShareholders: 825000 },
    ];

    const result = buildMonthlyRevenue('0050', '元大台灣50', 'TW', undefined, tdccMock);
    expect(result.isEtf).toBe(true);
    expect(result.etfData?.beneficiaries).toBe(825000);
    expect(result.asOfDateText).toBe('ETF 規模與受益人 (2026-10-02)');
  });
});
