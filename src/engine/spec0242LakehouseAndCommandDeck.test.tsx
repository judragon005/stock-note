import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildMonthlyRevenue } from './aiForceMarketAssembly';
import { createDefaultAiForceReport, generateAiForceReportFromCandles } from './aiForceDashboardEngine';
import { AiForceDashboardView } from '../components/aiForceDashboard/AiForceDashboardView';
import { MainForceVerdictCard } from '../components/aiForceDashboard/cards/MainForceVerdictCard';
import { MonthlyRevenueCard } from '../components/aiForceDashboard/cards/MonthlyRevenueCard';
import { ValuationMetricsCard } from '../components/aiForceDashboard/cards/ValuationMetricsCard';

declare const require: (id: string) => any;
declare const process: { cwd: () => string; env: Record<string, string | undefined> };

const fs = require('fs');
const path = require('path');

const { getDbPath, initSqliteLakehouseDb, closeSqliteDb } = require('../../scripts/market-sync/sqlite-db-core.cjs');
const {
  parseTwseTwt49uReport,
  parseTpexExDailyReport,
  ingestCorporateActionsToDb,
} = require('../../scripts/market-sync/ingest-tw-corporate-actions.cjs');
const {
  parseTdccQryPageMeta,
  parseTdccQryResultHtml,
} = require('../../scripts/market-sync/ingest-tw-tdcc.cjs');
const {
  runWithNonBlockingTimeout,
} = require('../../scripts/market-sync/on-demand-backfill-orchestrator.cjs');
const {
  evaluateScheduleWindow,
} = require('../../scripts/market-sync/nas-autonomous-scheduler.cjs');

const TEST_DB = path.resolve(process.cwd(), '.scratch/test-market-cache/test_spec0242.db');

describe('Spec 0242: 台股全市場配息/集保歷史庫、NAS 無人值守排程與戰情室司令台 (4 Seams)', () => {
  afterEach(() => {
    delete process.env.LAKEHOUSE_DB_PATH;
    try {
      closeSqliteDb();
    } catch {
      // ignore
    }
    if (fs.existsSync(TEST_DB)) {
      try {
        fs.unlinkSync(TEST_DB);
      } catch {
        // ignore
      }
    }
  });

  it('Seam 1: 解析 TWSE TWT49U 與 TPEx exDailyQ 歷史除權息，並支援 LAKEHOUSE_DB_PATH 與冪等寫入不覆蓋發放日', () => {
    process.env.LAKEHOUSE_DB_PATH = TEST_DB;
    expect(getDbPath()).toBe(TEST_DB);

    const twseRows = parseTwseTwt49uReport({
      data: [
        ['113年01月17日', '0050', '元大台灣50', '131.65', '128.65', '3.000000', '息', '141.50', '115.80', '128.65', '128.65'],
        ['113年07月16日', '0050', '元大台灣50', '196.70', '195.70', '1.000000', '息', '215.25', '176.15', '195.70', '195.70'],
      ],
    });
    expect(twseRows).toHaveLength(2);
    expect(twseRows[0]).toMatchObject({
      symbol: '0050',
      exDate: '2024-01-17',
      cashDividendPerShare: 3,
      stockDividendRatio: 0,
    });

    const tpexRows = parseTpexExDailyReport({
      tables: [
        {
          data: [
            ['113/01/03', '6629', '泰金-KY', '55.00', '53.50', '0', '1.50', '1.50', '除息', '58.8', '48.15', '53.5', '53.5', '1.50000000', '0'],
          ],
        },
      ],
    });
    expect(tpexRows).toHaveLength(1);
    expect(tpexRows[0]).toMatchObject({
      symbol: '6629',
      exDate: '2024-01-03',
      cashDividendPerShare: 1.5,
    });

    // 先寫入含 paymentDate 的資料，再寫入不含 paymentDate 的官方結果表，應保留原 paymentDate
    ingestCorporateActionsToDb(
      [{ symbol: '0050', market: 'TW', actionType: 'DIVIDEND', exDate: '2024-01-17', paymentDate: '2024-02-21', cashDividendPerShare: 3, stockDividendRatio: 0 }],
      TEST_DB
    );
    ingestCorporateActionsToDb([...twseRows, ...tpexRows], TEST_DB);

    const db = initSqliteLakehouseDb(TEST_DB);
    const saved = db
      .prepare('SELECT payment_date, cash_dividend_per_share FROM corporate_action_calendar WHERE symbol = ? AND ex_date = ?')
      .get('0050', '2024-01-17') as any;
    expect(saved.payment_date).toBe('2024-02-21');
    expect(saved.cash_dividend_per_share).toBe(3);
  });

  it('Seam 2: 解析 TDCC 官方 qryStock HTML 週次與 15 級距，且 runWithNonBlockingTimeout 逾時後不中止背景寫庫', async () => {
    const sampleHtml = `
      <input type="hidden" name="SYNCHRONIZER_TOKEN" value="tok-123" />
      <input type="hidden" name="firDate" value="20261113" />
      <select name="scaDate">
        <option value="20261113">20261113</option>
        <option value="20261106">20261106</option>
      </select>
      <table>
        <tr><td>1</td><td>1-999</td><td>1,600,000</td><td>485,000,000</td><td>2.02</td></tr>
        <tr><td>15</td><td>1,000,001以上</td><td>288</td><td>5,118,000,000</td><td>21.34</td></tr>
        <tr><td>17</td><td>合 計</td><td>3,874,009</td><td>23,982,500,000</td><td>100.00</td></tr>
      </table>
    `;
    const meta = parseTdccQryPageMeta(sampleHtml);
    expect(meta.synToken).toBe('tok-123');
    expect(meta.dates).toEqual(['20261113', '20261106']);

    const parsed = parseTdccQryResultHtml(sampleHtml, '0050', '2026-11-06');
    expect(parsed).toMatchObject({
      symbol: '0050',
      date: '2026-11-06',
      totalShareholders: 3874009,
    });
    expect(parsed.over1000Ratio).toBeGreaterThan(20);

    // 驗證超過首屏 30ms 等待門檻後，背景任務不被 abort 且能順利完成
    let bgCompleted = false;
    let wasAborted = false;
    const raced = await runWithNonBlockingTimeout(
      (signal: AbortSignal) =>
        new Promise<string>((resolve) => {
          signal.addEventListener('abort', () => {
            wasAborted = true;
          });
          setTimeout(() => {
            bgCompleted = true;
            resolve('DONE');
          }, 80);
        }),
      20,
      2000
    );
    expect(raced.timedOut).toBe(true);
    await raced.bgPromise;
    expect(wasAborted).toBe(false);
    expect(bgCompleted).toBe(true);
  });

  it('Seam 3: 市場組裝引擎完整保留 2026~2022 歷年配息 (不截斷為 4 筆) 並計算 ETF 折溢價波動統計', () => {
    const actions = [
      { exDate: '2026-07-21', cashDividendPerShare: 0.6 },
      { exDate: '2026-01-22', cashDividendPerShare: 1.0 },
      { exDate: '2025-07-21', cashDividendPerShare: 0.36 },
      { exDate: '2025-01-17', cashDividendPerShare: 2.7 },
      { exDate: '2024-07-16', cashDividendPerShare: 1.0 },
      { exDate: '2024-01-17', cashDividendPerShare: 3.0 },
      { exDate: '2023-07-18', cashDividendPerShare: 1.9 },
      { exDate: '2023-01-30', cashDividendPerShare: 2.6 },
    ];
    const rev = buildMonthlyRevenue('0050', '元大台灣50', 'TW', [], [], {
      currentPrice: 90,
      corporateActions: actions,
    });
    expect(rev.etfData?.quarterlyDividends).toHaveLength(8);
    expect(rev.etfData?.quarterlyDividends.map((d) => d.quarter)).toContain('2024-01-17');
    expect(rev.etfData?.quarterlyDividends.map((d) => d.quarter)).toContain('2023-01-30');

    const candles = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      open: 90,
      high: 91,
      low: 89,
      close: 90.2,
      volume: 10000,
    }));
    const report = generateAiForceReportFromCandles('0050', '元大台灣50', 'TW', candles, undefined, undefined, undefined, {
      etfNav: { date: '2026-11-19', nav: 90.05, closePrice: 90.2, premiumDiscountRatio: 0.17, unitChange: 500000 },
      etfNavHistory: [
        { date: '2026-11-17', nav: 89.8, closePrice: 89.7, premiumDiscountRatio: -0.11 },
        { date: '2026-11-18', nav: 90.0, closePrice: 90.36, premiumDiscountRatio: 0.4 },
        { date: '2026-11-19', nav: 90.05, closePrice: 90.2, premiumDiscountRatio: 0.17 },
      ],
      corporateActions: actions,
    });
    expect(report.valuationMetrics?.etfNavStats).toMatchObject({
      minPremiumDiscount: -0.11,
      maxPremiumDiscount: 0.4,
      sampleDays: 3,
      latestNav: 90.05,
    });
  });

  it('Seam 4: Card 18 置頂於 Card 01 之前且為直式堆疊、Card 20 呈現 2024/2023 配息、Card 21 ETF 渲染折溢價量化帶', () => {
    const baseReport = createDefaultAiForceReport('0050', '元大台灣50', 'TW');
    baseReport.isDataPending = false;
    const dashboardHtml = renderToStaticMarkup(
      <AiForceDashboardView initialSymbol="0050" initialMarket="TW" initialReport={baseReport} />
    );
    const idxCard18 = dashboardHtml.indexOf('data-layer="8-main-force-verdict-deck"');
    const idxCard01 = dashboardHtml.indexOf('data-layer="1-kline"');
    expect(idxCard18).toBeGreaterThan(-1);
    expect(idxCard01).toBeGreaterThan(-1);
    expect(idxCard18).toBeLessThan(idxCard01);

    const card18Html = renderToStaticMarkup(<MainForceVerdictCard data={baseReport.mainForceVerdict} />);
    expect(card18Html).toContain('data-layout="vertical-stack"');

    const card20Html = renderToStaticMarkup(
      <MonthlyRevenueCard
        data={{
          isEtf: true,
          history: [],
          growthBadge: 'ETF 規模穩健',
          asOfDateText: '2026-11-19',
          isEmpty: false,
          etfData: {
            aumBillion: 4380,
            dividendYield: 1.77,
            beneficiaries: 3956621,
            quarterlyDividends: [
              { quarter: '2026-07-21', amount: 0.6, yieldRate: 0.67 },
              { quarter: '2024-01-17', amount: 3.0, yieldRate: 3.3 },
              { quarter: '2023-07-18', amount: 1.9, yieldRate: 2.1 },
            ],
          },
        }}
      />
    );
    expect(card20Html).toContain('2024-01-17');
    expect(card20Html).toContain('2023-07-18');
    expect(card20Html).toContain('歷年配息紀錄與單期殖利率');

    const card21Html = renderToStaticMarkup(
      <ValuationMetricsCard
        data={{
          isEtf: true,
          etfPremiumDiscountRate: 0.17,
          etfExpenseRatio: 0.32,
          dividendYield: 1.77,
          asOfDateText: '2026-11-19',
          isEmpty: false,
          etfNavStats: {
            minPremiumDiscount: -0.11,
            maxPremiumDiscount: 0.4,
            avgPremiumDiscount: 0.15,
            sampleDays: 15,
            latestNav: 90.05,
            latestMarketPrice: 90.2,
            unitChange: 500000,
          },
        }}
      />
    );
    expect(card21Html).toContain('data-testid="valuation-etf-nav-band"');
    expect(card21Html).toContain('近 15 日折溢價波動區間');
    expect(card21Html).toContain('90.05');
  });

  it('NAS 無人值守排程器：週六台北時間 10:00 無瀏覽器自動觸發每週全市場湖倉更新', () => {
    // 2026-11-21T02:30:00Z = 台北時間 2026-11-21 (週六) 10:30
    const saturdayTaipei = new Date('2026-11-21T02:30:00Z');
    const plan = evaluateScheduleWindow(
      saturdayTaipei,
      { tw: { isStale: false }, us: { isStale: false }, tdcc: { isStale: false }, revenue: { isStale: false } },
      {}
    );
    expect(plan.runWeekly).toBe(true);
    expect(plan.reason).toBe('SATURDAY_WEEKLY_WINDOW');

    // 同日已跑過不重複觸發
    const planRepeat = evaluateScheduleWindow(
      saturdayTaipei,
      { tw: { isStale: false }, us: { isStale: false }, tdcc: { isStale: false }, revenue: { isStale: false } },
      { lastWeeklyIsoDate: '2026-11-21' }
    );
    expect(planRepeat.runWeekly).toBe(false);
  });

  it('Ticket 06: NAS 零依賴生產伺服器正確回應 /healthz 與 /api/market/sync-status', async () => {
    const { createNasServer } = require('../../scripts/nas-server.cjs');
    const { server } = createNasServer({ customDbPath: TEST_DB, enableScheduler: false });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as any;
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    try {
      const r1 = await fetch(`${baseUrl}/healthz`);
      expect(r1.status).toBe(200);
      const j1 = await r1.json();
      expect(j1.status).toBe('ok');
      expect(j1.dbPath).toBe(TEST_DB);

      const r2 = await fetch(`${baseUrl}/api/market/sync-status`);
      expect(r2.status).toBe(200);
      const j2 = await r2.json();
      expect(j2).toHaveProperty('tw');
      expect(j2).toHaveProperty('tdcc');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
