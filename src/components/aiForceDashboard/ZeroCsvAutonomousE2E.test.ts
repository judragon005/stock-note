/**
 * ZeroCsvAutonomousE2E.test.ts
 * 全自主聯網回補、櫃買去 O 治理與盤中動態縫合全鏈路 E2E 驗收測試 (Spec 0170 / Ticket 10)
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateAiForceReportFromCandles } from '../../engine/aiForceDashboardEngine';
import { RawDataView, paginateCandles } from './TaskPanels';
// @ts-ignore
import { isTwTradingDay, getPreviousTradingDay } from '../../../scripts/market-sync/trading-calendar-engine.cjs';
// @ts-ignore
import { initSqliteLakehouseDb } from '../../../scripts/market-sync/sqlite-db-core.cjs';

describe('Spec 0170 E2E: 零本地 CSV 依賴、全自主聯網回補與櫃買去 O 治理端到端驗收', () => {
  it('1. 驗證演算法交易日曆 100% 自主運作，零外部檔案讀寫依賴', () => {
    // 驗證 2026 年法定交易日與假日判定
    expect(isTwTradingDay('2026-10-07')).toBe(true); // 週三
    expect(isTwTradingDay('2026-10-08')).toBe(true); // 週四
    expect(isTwTradingDay('2026-10-09')).toBe(false); // 國慶連假補假
    expect(isTwTradingDay('2026-10-10')).toBe(false); // 週六
    expect(isTwTradingDay('2026-10-11')).toBe(false); // 週日
    expect(getPreviousTradingDay('2026-10-08')).toBe('2026-10-07');
  });

  it('2. 驗證 SQLite 數據湖倉中 3293 與 00679B 等櫃買標的已徹底去 O 且最新日期推進至 2026-10-07', () => {
    const db = initSqliteLakehouseDb();

    // 驗證 3293 (上櫃鈊象)
    const candle3293 = db
      .prepare('SELECT date, close FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT 1')
      .get('3293') as { date: string; close: number } | undefined;
    expect(candle3293).toBeDefined();
    expect(candle3293!.date).toBe('2026-10-07');
    expect(candle3293!.close).toBeGreaterThan(0);

    // 驗證 00679B (櫃買債券 ETF)
    const candle00679B = db
      .prepare('SELECT date, close FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT 1')
      .get('00679B') as { date: string; close: number } | undefined;
    expect(candle00679B).toBeDefined();
    expect(candle00679B!.date).toBe('2026-10-07');
    expect(candle00679B!.close).toBeGreaterThan(0);

    // 驗證全庫不再有以數字開頭且帶 O 的孤兒紀錄
    const orphanCount = db
      .prepare("SELECT COUNT(*) as cnt FROM daily_candles WHERE symbol GLOB '[0-9]*O'")
      .get() as { cnt: number };
    expect(orphanCount.cnt).toBe(0);
  });

  it('3. 驗證 2330 台積電上市三大法人籌碼 10/05~10/07 連續無斷層', () => {
    const db = initSqliteLakehouseDb();

    const chipsRows = db
      .prepare(
        "SELECT date, foreign_net, trust_net, dealer_net FROM tw_institutional_chips WHERE symbol = '2330' AND date >= '2026-10-01' ORDER BY date ASC"
      )
      .all() as Array<{ date: string; foreign_net: number; trust_net: number; dealer_net: number }>;

    const dates = chipsRows.map((r) => r.date);
    expect(dates).toContain('2026-10-01');
    expect(dates).toContain('2026-10-02');
    expect(dates).toContain('2026-10-05');
    expect(dates).toContain('2026-10-06');
    expect(dates).toContain('2026-10-07');
  });

  it('4. 驗證主力戰情室盤中即時 K 棒動態縫合與任務五原始資料表首行置頂', () => {
    const db = initSqliteLakehouseDb();

    // 讀取 3293 歷史日 K (截至 10/07)
    const historyCandles = db
      .prepare('SELECT date, open, high, low, close, volume, transactions FROM daily_candles WHERE symbol = ? ORDER BY date DESC LIMIT 250')
      .all('3293') as Array<any>;
    historyCandles.reverse();

    // 模擬 10/08 盤中 13:40 即時報價
    const intradayTime = new Date('2026-10-08T13:40:00+08:00');
    const liveQuote = {
      price: 785,
      open: 775,
      high: 790,
      low: 770,
      volume: 3200000,
      transactions: 21500,
      change: 5,
      changePercent: 0.64,
    };

    const report = generateAiForceReportFromCandles(
      '3293',
      '鈊象',
      'TW',
      historyCandles,
      liveQuote,
      undefined,
      intradayTime
    );

    // 驗證 K 線最末根包含今日盤中 10/08
    const candles = report.klineSystem.candles;
    const last = candles[candles.length - 1];
    expect(last.date).toBe('2026-10-08');
    expect(last.close).toBe(785);
    expect(last.isIntraday).toBe(true);

    // 驗證任務五原始資料表活頁降序分頁：首行第 1 筆即為當日 10/08 且帶有即時徽章
    const pageData = paginateCandles(candles, 1, 10);
    expect(pageData.items[0].date).toBe('2026-10-08');
    expect(pageData.items[0].close).toBe(785);
    expect(pageData.items[0].isIntraday).toBe(true);

    // 驗證 RawDataView UI 渲染
    const html = renderToStaticMarkup(React.createElement(RawDataView, { report }));
    expect(html).toContain('2026-10-08');
    expect(html).toContain('⚡ 即時');
    expect(html).toContain('$785');
  });
});
