import { describe, it, expect } from 'vitest';
import { aggregateDividendReport } from './dividendAggregator';
import { TradeRecord } from '../types/stock';
import { ReceivableDividend } from '../types/dividend';

describe('Dividend Aggregator Engine (股利數據聚合引擎)', () => {
  const mockTrades: TradeRecord[] = [
    {
      id: 't-div-1',
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      type: 'DIVIDEND',
      date: '2026-03-01',
      payDate: '2026-03-20', // 實質入帳日 3 月
      shares: 1000,
      price: 4.0, // 4,000 TWD
      currency: 'TWD',
      fee: 0,
      tax: 0,
      createdAt: 1710921600000,
    },
    {
      id: 't-div-2',
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      type: 'DIVIDEND',
      date: '2026-05-20',
      payDate: '2026-06-18', // 實質入帳日 6 月
      shares: 1000,
      price: 4.5, // 4,500 TWD
      currency: 'TWD',
      fee: 0,
      tax: 0,
      createdAt: 1718697600000,
    },
    {
      id: 't-div-3',
      symbol: 'VOO',
      name: '標普500',
      market: 'US',
      type: 'DIVIDEND',
      date: '2026-06-01',
      payDate: '2026-06-25', // 實質入帳日 6 月
      shares: 10,
      price: 1.8, // 18 USD (稅前), 假設稅 5.4 USD (實收 12.6 USD ➔ 403 TWD)
      currency: 'USD',
      fee: 0,
      tax: 5.4,
      createdAt: 1719302400000,
    },
    {
      id: 't-div-old',
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      type: 'DIVIDEND',
      date: '2025-05-15',
      payDate: '2025-06-15', // 2025 年實質入帳
      shares: 1000,
      price: 3.5, // 3,500 TWD
      currency: 'TWD',
      fee: 0,
      tax: 0,
      createdAt: 1686816000000,
    },
  ];

  const mockReceivables: ReceivableDividend[] = [
    {
      id: 'rec-1',
      symbol: '2454',
      name: '聯發科',
      market: 'TW',
      currency: 'TWD',
      exDate: '2026-07-10',
      payDate: '2026-08-05',
      sharesHeldOnExDate: 500,
      cashDividendPerShare: 30,
      estimatedGrossDividend: 15000,
      estimatedTaxOrFee: 0,
      estimatedNetDividend: 15000,
      estimatedNetDividendInTWD: 15000,
      status: 'PENDING_PAYMENT',
    },
  ];

  it('能正確計算全歷史、當年度、去年同期股息與 YoY 成長率', () => {
    const report = aggregateDividendReport(mockTrades, mockReceivables, 2026, 32.0, '2026-12-31');

    // 2026 年實領股利：4,000 + 4,500 + (12.6 * 32 = 403) = 8,903 TWD
    // 2025 年實領股利：3,500 TWD
    expect(report.currentYearDividendsTWD).toBe(8903);
    expect(report.previousYearDividendsTWD).toBe(3500);
    // YoY = (8,903 - 3,500) / 3,500 * 100 = 154.37%
    expect(report.yoyGrowthPercent).toBeCloseTo(154.37, 1);
    expect(report.totalHistoricalDividendsTWD).toBe(12403);
  });

  it('能正確生成 12 個月份的月度現金流分佈', () => {
    const report = aggregateDividendReport(mockTrades, mockReceivables, 2026, 32.0, '2026-12-31');

    expect(report.monthlyDistribution).toHaveLength(12);
    // 3月 (Index 2) = 4,000
    expect(report.monthlyDistribution[2].netTWD).toBe(4000);
    // 6月 (Index 5) = 4,500 + 403 = 4,903
    expect(report.monthlyDistribution[5].netTWD).toBe(4903);
  });

  it('能正確排序全歷史與當年度 Top 貢獻排行榜', () => {
    const report = aggregateDividendReport(mockTrades, mockReceivables, 2026, 32.0, '2026-12-31');

    expect(report.topDividendContributors.length).toBeGreaterThanOrEqual(2);
    expect(report.topDividendContributors[0].symbol).toBe('2330');
    expect(report.topDividendContributors[0].totalDividendsTWD).toBe(12000); // 4000+4500+3500

    expect(report.currentYearTopContributors.length).toBeGreaterThanOrEqual(2);
    expect(report.currentYearTopContributors[0].symbol).toBe('2330');
    expect(report.currentYearTopContributors[0].totalDividendsTWD).toBe(8500); // 4000+4500
  });

  describe('PRD #0136 入帳日時序對齊、毛淨額勾稽與排行榜入帳過濾 (TDD Red-Green)', () => {
    // 跨年跨月測試用資料集
    const temporalTrades: TradeRecord[] = [
      // 1. 2024 年底除息、2025 年 1 月入帳款項 (跨年入帳)
      {
        id: 't-cross-year-1',
        symbol: '00919',
        name: '群益台灣精選高息',
        market: 'TW',
        type: 'DIVIDEND',
        date: '2024-12-20', // 除息基準日 2024 年底
        payDate: '2025-01-15', // 實質入帳日 2025 年 1 月中旬
        shares: 10000,
        price: 0.72, // 毛額 7,200 TWD
        currency: 'TWD',
        fee: 0,
        tax: 0,
        createdAt: 1734652800000,
      },
      // 2. 2025 年 7 月除息、8 月底入帳款項 (跨月入帳，模擬 2890 永豐金)
      {
        id: 't-cross-month-1',
        symbol: '2890',
        name: '永豐金',
        market: 'TW',
        type: 'DIVIDEND',
        date: '2025-07-23', // 除息基準日 7 月
        payDate: '2025-08-24', // 實質發放日 8 月
        shares: 20000,
        price: 1.1, // 毛額 22,000 TWD，觸發二代健保 (2.11% = 464)，實收 21,536
        currency: 'TWD',
        fee: 0,
        tax: 464,
        createdAt: 1753228800000,
      },
      // 3. 2025 年底除息、2026 年初入帳款項 (2025 不得計入實領)
      {
        id: 't-cross-year-2',
        symbol: '00929',
        name: '復華台灣科技優息',
        market: 'TW',
        type: 'DIVIDEND',
        date: '2025-12-18', // 2025 年底除息
        payDate: '2026-01-15', // 2026 年初入帳
        shares: 10000,
        price: 0.18, // 毛額 1,800 TWD
        currency: 'TWD',
        fee: 0,
        tax: 0,
        createdAt: 1766016000000,
      },
      // 4. 未到期入帳款項 (未來發放，如 payDate > currentDateStr)
      {
        id: 't-future-div',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        type: 'DIVIDEND',
        date: '2025-09-16',
        payDate: '2025-10-08', // 假設當前基準日為 2025-09-30，則為未來未到期
        shares: 1000,
        price: 5.0, // 5,000 TWD
        currency: 'TWD',
        fee: 0,
        tax: 0,
        createdAt: 1757980800000,
      },
    ];

    it('能正確將 2024 年底除息、2025 年初入帳之款項歸入 2025 年度，並排除 2025 年底除息 2026 年入帳之款項', () => {
      // 模擬當前日期為 2025-12-31 (此時 10-08 已入帳，但 2026-01-15 尚未入帳)
      const report2025 = aggregateDividendReport(temporalTrades, [], 2025, 32.0, '2025-12-31');

      // 2025 應納入：
      // - 00919 (payDate 2025-01-15): 7,200
      // - 2890 (payDate 2025-08-24): 21,536 (22,000 - 464)
      // - 2330 (payDate 2025-10-08): 5,000
      // 排除：
      // - 00929 (payDate 2026-01-15): 1,800 (不可計入 2025！)
      const expectedNet2025 = 7200 + 21536 + 5000; // 33,736 TWD
      expect(report2025.currentYearDividendsTWD).toBe(expectedNet2025);
    });

    it('能正確將 7 月除息、8 月底入帳之款項歸入 8 月份分佈，而非 7 月', () => {
      const report2025 = aggregateDividendReport(temporalTrades, [], 2025, 32.0, '2025-12-31');

      // 7 月 (Index 6) 不應有 2890 的現金流
      expect(report2025.monthlyDistribution[6].netTWD).toBe(0);

      // 8 月 (Index 7) 應有 2890 實領 21,536 TWD
      expect(report2025.monthlyDistribution[7].netTWD).toBe(21536);
      expect(report2025.monthlyDistribution[7].grossTWD).toBe(22000);
      expect(report2025.monthlyDistribution[7].taxTWD).toBe(464);

      // 1 月 (Index 0) 應有 00919 的 7,200 TWD
      expect(report2025.monthlyDistribution[0].netTWD).toBe(7200);
    });

    it('能精確計算當年度應發毛額 currentYearGrossTWD 與扣繳稅費 currentYearTaxTWD 並完成對帳勾稽', () => {
      const report2025 = aggregateDividendReport(temporalTrades, [], 2025, 32.0, '2025-12-31');

      // 毛額 = 7,200 + 22,000 + 5,000 = 34,200
      // 稅費 = 464
      // 淨額 = 33,736
      expect(report2025.currentYearGrossTWD).toBe(34200);
      expect(report2025.currentYearTaxTWD).toBe(464);
      expect(report2025.currentYearGrossTWD - report2025.currentYearTaxTWD).toBe(report2025.currentYearDividendsTWD);
    });

    it('當款項尚未實質到達發放日 (payDate > currentDateStr) 時，不得計入當年度實領總額與排行榜分子', () => {
      // 模擬當前時間為 2025-09-30 (台積電 payDate 為 2025-10-08，尚未到期)
      const reportAsOfSep = aggregateDividendReport(temporalTrades, [], 2025, 32.0, '2025-09-30');

      // 實領僅納入 00919 (7,200) + 2890 (21,536) = 28,736 TWD
      expect(reportAsOfSep.currentYearDividendsTWD).toBe(7200 + 21536);

      // 當年度排行榜中，尚未到期的 2330 不得出現
      const foundTsmc = reportAsOfSep.currentYearTopContributors.find((c) => c.symbol === '2330');
      expect(foundTsmc).toBeUndefined();

      // 第一名應為 2890 (21,536 TWD)，且其 percentageOfTotal 應正確以已入帳 28,736 為分母
      expect(reportAsOfSep.currentYearTopContributors[0].symbol).toBe('2890');
      expect(reportAsOfSep.currentYearTopContributors[0].totalDividendsTWD).toBe(21536);
      expect(reportAsOfSep.currentYearTopContributors[0].percentageOfTotal).toBeCloseTo((21536 / 28736) * 100, 1);
    });

    it('若無顯式 payDate 時，能透過 estimatePaymentDate 自動推估有效入帳日', () => {
      const implicitTrade: TradeRecord = {
        id: 't-implicit-1',
        symbol: '2330',
        market: 'TW',
        type: 'DIVIDEND',
        date: '2025-08-01', // 無 payDate，台股自動 +28 天推估為 2025-08-29 (仍為 8 月)
        shares: 1000,
        price: 4.0,
        currency: 'TWD',
        fee: 0,
        tax: 0,
        createdAt: 1754000000000,
      };

      const report = aggregateDividendReport([implicitTrade], [], 2025, 32.0, '2025-12-31');
      expect(report.currentYearDividendsTWD).toBe(4000);
      expect(report.monthlyDistribution[7].netTWD).toBe(4000); // 8 月
    });
  });
});

