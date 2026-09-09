import { describe, it, expect } from 'vitest';
import {
  generateDCASchedule,
  forecastDCAOverdraftRisk,
  backtestDCAvsLumpSum,
} from './dcaSchedulerEngine';
import { DCAPlan } from '../types/firePlanning';
import { BrokerAccount } from '../types/stock';

describe('dcaSchedulerEngine (定期定額排程、假日順延與防透支引擎)', () => {
  const samplePlans: DCAPlan[] = [
    {
      id: 'plan-1',
      symbol: '0050',
      market: 'TW',
      accountId: 'acc-1',
      targetAmountTwd: 10_000,
      executionDays: [6, 16, 26],
      isActive: true,
      reinvestDividends: true,
      createdAt: Date.now(),
    },
    {
      id: 'plan-2',
      symbol: 'VT',
      market: 'US',
      accountId: 'acc-2',
      targetAmountTwd: 15_000,
      executionDays: [10],
      isActive: true,
      reinvestDividends: true,
      createdAt: Date.now(),
    },
    {
      id: 'plan-inactive',
      symbol: '2330',
      market: 'TW',
      accountId: 'acc-1',
      targetAmountTwd: 5_000,
      executionDays: [1],
      isActive: false, // 停用
      reinvestDividends: false,
      createdAt: Date.now(),
    },
  ];

  const sampleAccounts: BrokerAccount[] = [
    {
      id: 'acc-1',
      name: '國泰證券',
      market: 'TW',
      feeRate: 0.001425,
      discountRate: 0.28,
      minFee: 20,
      taxRate: 0.003,
      createdAt: Date.now(),
    },
    {
      id: 'acc-2',
      name: 'Firstrade',
      market: 'US',
      feeRate: 0,
      discountRate: 1.0,
      minFee: 0,
      taxRate: 0,
      createdAt: Date.now(),
    },
  ];

  describe('generateDCASchedule (排程與休市順延)', () => {
    it('應僅排程啟用中 (isActive: true) 的定投計畫', () => {
      // 基準日 2026-09-01
      const schedules = generateDCASchedule(samplePlans, 30, '2026-09-01');
      const symbols = new Set(schedules.map((s) => s.symbol));
      expect(symbols.has('0050')).toBe(true);
      expect(symbols.has('VT')).toBe(true);
      expect(symbols.has('2330')).toBe(false); // 停用不排程
    });

    it('若約定扣款日逢週末 (週六/日)，應自動順延至下週一開盤日', () => {
      // 2026-09-06 為週日
      const schedules = generateDCASchedule(samplePlans, 30, '2026-09-01');
      const executionSep6 = schedules.find(
        (s) => s.planId === 'plan-1' && s.scheduledDay === 6
      );
      expect(executionSep6).toBeDefined();
      // 9/6 (日) 順延至 9/7 (一)
      expect(executionSep6!.date).toBe('2026-09-07');
      expect(executionSep6!.isHolidayDeferred).toBe(true);
      // 台股 T+2 交割: 9/7 (一) -> 9/9 (三)
      expect(executionSep6!.settlementDate).toBe('2026-09-09');
    });

    it('美股約定扣款日應按 T+1 推導交割日', () => {
      // 2026-09-10 為週四
      const schedules = generateDCASchedule(samplePlans, 30, '2026-09-01');
      const executionVT = schedules.find((s) => s.planId === 'plan-2');
      expect(executionVT).toBeDefined();
      expect(executionVT!.date).toBe('2026-09-10');
      // 美股 T+1 交割: 9/10 (四) -> 9/11 (五)
      expect(executionVT!.settlementDate).toBe('2026-09-11');
    });
  });

  describe('forecastDCAOverdraftRisk (未來 30 天防透支推演)', () => {
    it('當累計扣款超過帳戶可用現金時，應精準發出透支警示與缺口金額', () => {
      const schedules = generateDCASchedule(samplePlans, 30, '2026-09-01');
      // acc-1 現金 25,000，9月有 3 次扣款 (各 10,000)，第三次將透支
      const cashMap = {
        'acc-1': 25_000,
        'acc-2': 50_000,
      };

      const forecasts = forecastDCAOverdraftRisk(schedules, sampleAccounts, cashMap);
      const acc1Forecasts = forecasts.filter((f) => f.accountId === 'acc-1');

      expect(acc1Forecasts.length).toBe(3);
      // 第 1 筆: 25000 - 10000 = 15000 (安全)
      expect(acc1Forecasts[0].projectedCashTwd).toBe(15_000);
      expect(acc1Forecasts[0].isOverdraftRisk).toBe(false);

      // 第 2 筆: 15000 - 10000 = 5000 (安全)
      expect(acc1Forecasts[1].projectedCashTwd).toBe(5_000);
      expect(acc1Forecasts[1].isOverdraftRisk).toBe(false);

      // 第 3 筆: 5000 - 10000 = -5000 (透支!)
      expect(acc1Forecasts[2].projectedCashTwd).toBe(-5_000);
      expect(acc1Forecasts[2].isOverdraftRisk).toBe(true);
      expect(acc1Forecasts[2].shortfallAmountTwd).toBe(5_000);
    });

    it('若帳戶現金充裕，所有扣款點均應標記為無透支風險', () => {
      const schedules = generateDCASchedule(samplePlans, 30, '2026-09-01');
      const cashMap = {
        'acc-1': 100_000,
        'acc-2': 100_000,
      };
      const forecasts = forecastDCAOverdraftRisk(schedules, sampleAccounts, cashMap);
      expect(forecasts.every((f) => !f.isOverdraftRisk)).toBe(true);
      expect(forecasts.every((f) => f.shortfallAmountTwd === 0)).toBe(true);
    });
  });

  describe('backtestDCAvsLumpSum (定期定額 vs 單筆歐印歷史回測)', () => {
    // 模擬 12 個月的股價走勢: 先跌後漲 (微笑曲線 100 -> 80 -> 60 -> 80 -> 120)
    const smileCurvePrices = [
      { date: '2025-01-06', close: 100 },
      { date: '2025-02-06', close: 90 },
      { date: '2025-03-06', close: 80 },
      { date: '2025-04-06', close: 70 },
      { date: '2025-05-06', close: 60 },
      { date: '2025-06-06', close: 65 },
      { date: '2025-07-06', close: 75 },
      { date: '2025-08-06', close: 85 },
      { date: '2025-09-06', close: 95 },
      { date: '2025-10-06', close: 105 },
      { date: '2025-11-06', close: 110 },
      { date: '2025-12-06', close: 120 },
    ];

    it('在微笑曲線行情中，DCA 策略之平均成本應顯著低於期初一次買入價', () => {
      const monthlyAmount = 10_000;
      const totalMonths = 12;
      const result = backtestDCAvsLumpSum(smileCurvePrices, monthlyAmount, totalMonths);

      expect(result.totalInvestedTwd).toBe(120_000);
      // 期初買入價為 100
      expect(result.dcaAverageCost).toBeLessThan(100);
      expect(result.dcaTotalShares).toBeGreaterThan(result.lumpSumTotalShares);
      expect(result.dcaFinalValueTwd).toBeGreaterThan(result.lumpSumFinalValueTwd);
      expect(result.wealthDeltaPercent).toBeGreaterThan(0);
    });

    it('在單邊暴漲行情中，Lump-Sum 策略應跑贏 DCA', () => {
      const bullMarketPrices = [
        { date: '2025-01-06', close: 100 },
        { date: '2025-02-06', close: 110 },
        { date: '2025-03-06', close: 120 },
        { date: '2025-04-06', close: 130 },
      ];
      const result = backtestDCAvsLumpSum(bullMarketPrices, 10_000, 4);
      expect(result.lumpSumFinalValueTwd).toBeGreaterThan(result.dcaFinalValueTwd);
      expect(result.wealthDeltaPercent).toBeLessThan(0);
    });
  });
});
