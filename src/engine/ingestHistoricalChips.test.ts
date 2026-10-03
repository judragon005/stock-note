// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getSqliteDbConnection, initSqliteLakehouseDb } from '../../scripts/market-sync/sqlite-db-core.cjs';
import {
  parseHistoricalInstitutionalContent,
  parseHistoricalMarginContent,
  saveHistoricalChipsBatchToSqlite,
} from '../../scripts/market-sync/ingest-historical-chips.cjs';

describe('Ticket 03 & 04: 三大法人與融資融券歷史 CSV 解析與入庫模組 (TDD)', () => {
  const testDbDir = path.resolve(process.cwd(), '.scratch/test-chips-deep');
  let testDbPath = '';

  beforeEach(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    testDbPath = path.join(testDbDir, `test_chips_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.db`);
    initSqliteLakehouseDb(testDbPath);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {}
  });

  it('1. parseHistoricalInstitutionalContent 應能將多行法人記錄正確聚合為外資、投信與自營商(含避險)之張數', () => {
    const csvContent = `﻿日期,股票代號,法人類別,買進股數,賣出股數,買賣超股數
2026-09-29,2330,Foreign_Investor,10000000,5000000,5000000
2026-09-29,2330,Investment_Trust,2000000,1000000,1000000
2026-09-29,2330,Dealer_self,500000,200000,300000
2026-09-29,2330,Dealer_Hedging,300000,100000,200000
2026-09-30,2330,Foreign_Investor,8000000,9000000,-1000000
2026-09-30,2330,Investment_Trust,1500000,500000,1000000
2026-09-30,2330,Dealer_self,400000,100000,300000
2026-09-30,2330,Dealer_Hedging,100000,200000,-100000`;

    const records = parseHistoricalInstitutionalContent(csvContent, 260);
    expect(records.length).toBe(2);

    // 2026-09-29:
    // 外資: 5000000 股 = 5000 張
    // 投信: 1000000 股 = 1000 張
    // 自營: (300000 + 200000) 股 = 500 張
    expect(records[0].date).toBe('2026-09-29');
    expect(records[0].foreign_net).toBe(5000);
    expect(records[0].trust_net).toBe(1000);
    expect(records[0].dealer_net).toBe(500);

    // 2026-09-30:
    // 外資: -1000 張
    // 投信: 1000 張
    // 自營: 300 - 100 = 200 張
    expect(records[1].date).toBe('2026-09-30');
    expect(records[1].foreign_net).toBe(-1000);
    expect(records[1].trust_net).toBe(1000);
    expect(records[1].dealer_net).toBe(200);
  });

  it('2. parseHistoricalMarginContent 應能正確解析融資餘額與融券餘額(張)', () => {
    const marginCsv = `﻿日期,股票代號,融資買進(張),融資賣出(張),融資餘額(張),融券買進(張),融券賣出(張),融券餘額(張),資券相抵(張)
2026-09-29,2330,120,80,15420,10,30,1250,5
2026-09-30,2330,150,100,15470,20,15,1245,10`;

    const records = parseHistoricalMarginContent(marginCsv, 260);
    expect(records.length).toBe(2);
    expect(records[0].date).toBe('2026-09-29');
    expect(records[0].margin_balance).toBe(15420);
    expect(records[0].short_balance).toBe(1250);

    expect(records[1].date).toBe('2026-09-30');
    expect(records[1].margin_balance).toBe(15470);
    expect(records[1].short_balance).toBe(1245);
  });

  it('3. saveHistoricalChipsBatchToSqlite 應將三大法人與融資融券批次寫入並合流更新 tw_institutional_chips', () => {
    const instRecords = [
      { date: '2026-09-29', foreign_net: 5000, trust_net: 1000, dealer_net: 500 },
      { date: '2026-09-30', foreign_net: -1000, trust_net: 1000, dealer_net: 200 },
    ];
    const marginRecords = [
      { date: '2026-09-29', margin_balance: 15420, short_balance: 1250 },
      { date: '2026-09-30', margin_balance: 15470, short_balance: 1245 },
    ];

    saveHistoricalChipsBatchToSqlite('2330', instRecords, marginRecords, testDbPath);

    const db = getSqliteDbConnection(testDbPath);
    const rows = db
      .prepare('SELECT * FROM tw_institutional_chips WHERE symbol = ? ORDER BY date ASC')
      .all('2330');

    expect(rows.length).toBe(2);
    expect(rows[0].date).toBe('2026-09-29');
    expect(rows[0].foreign_net).toBe(5000);
    expect(rows[0].margin_balance).toBe(15420);
    expect(rows[0].short_balance).toBe(1250);

    expect(rows[1].date).toBe('2026-09-30');
    expect(rows[1].foreign_net).toBe(-1000);
    expect(rows[1].margin_balance).toBe(15470);
    expect(rows[1].short_balance).toBe(1245);
  });

  describe('Ticket 05: 湖倉歷史籌碼與資券 API 端點聚合輸出 (TDD)', () => {
    it('應能將特定標的對齊日期的三大法人買賣超與資券餘額打包為完整物件輸出', () => {
      const instRecords = [
        { date: '2026-09-29', foreign_net: 3000, trust_net: 500, dealer_net: -200 },
        { date: '2026-09-30', foreign_net: -1500, trust_net: 200, dealer_net: 100 },
      ];
      const marginRecords = [
        { date: '2026-09-29', margin_balance: 8000, short_balance: 300 },
        { date: '2026-09-30', margin_balance: 8100, short_balance: 320 },
      ];

      saveHistoricalChipsBatchToSqlite('0050', instRecords, marginRecords, testDbPath);

      const db = getSqliteDbConnection(testDbPath);
      const rows = db
        .prepare('SELECT * FROM tw_institutional_chips WHERE symbol = ? ORDER BY date ASC')
        .all('0050');

      const chipsMap: Record<string, any> = {};
      for (const row of rows) {
        chipsMap[(row as any).date] = row;
      }

      expect(Object.keys(chipsMap).length).toBe(2);
      expect(chipsMap['2026-09-29'].foreign_net).toBe(3000);
      expect(chipsMap['2026-09-29'].margin_balance).toBe(8000);
      expect(chipsMap['2026-09-29'].short_balance).toBe(300);

      expect(chipsMap['2026-09-30'].foreign_net).toBe(-1500);
      expect(chipsMap['2026-09-30'].margin_balance).toBe(8100);
      expect(chipsMap['2026-09-30'].short_balance).toBe(320);
    });
  });
});
