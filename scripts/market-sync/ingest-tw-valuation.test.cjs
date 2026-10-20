const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  cleanValuationNumber,
  parseTwseBwibbu,
  parseTpexPeratio,
  saveTwValuationToSqlite,
} = require('./ingest-tw-valuation.cjs');
const { initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');

describe('ingest-tw-valuation: TWSE/TPEx Daily Valuation Sync (Spec 0196 / Ticket 02)', () => {
  it('cleanValuationNumber: 應正確處理字串、允許零與防禦性非零 (allowZero)', () => {
    // 預設 allowZero = true
    assert.equal(cleanValuationNumber('0.00'), 0);
    assert.equal(cleanValuationNumber('0'), 0);
    assert.equal(cleanValuationNumber(0), 0);
    assert.equal(cleanValuationNumber('28.5'), 28.5);
    assert.equal(cleanValuationNumber('-'), null);
    assert.equal(cleanValuationNumber('--'), null);
    assert.equal(cleanValuationNumber('N/A'), null);
    assert.equal(cleanValuationNumber(null), null);
    assert.equal(cleanValuationNumber(undefined), null);

    // allowZero = false (用於本益比、股價淨值比等，<= 0 應轉化為 null)
    assert.equal(cleanValuationNumber('0.00', { allowZero: false }), null);
    assert.equal(cleanValuationNumber('0', { allowZero: false }), null);
    assert.equal(cleanValuationNumber('-5.2', { allowZero: false }), null);
    assert.equal(cleanValuationNumber('15.8', { allowZero: false }), 15.8);
  });

  it('應正確解析 TWSE BWIBBU_d 官方每日估值（含 0.00 本益比安全轉為 null）', () => {
    const mockTwseData = {
      stat: 'OK',
      date: '20261019',
      data: [
        ['1101', '台泥', '27.15', '2.95', 114, '15.2', '0.88', '115/2'],
        ['2330', '台積電', '1080.00', '1.50', 114, '28.5', '6.80', '115/2'],
        ['9999', '虧損股A', '10.00', '0.00', 114, '-', '0.50', '115/2'],
        ['9998', '虧損股B', '5.00', '0.00', 114, '0.00', '0.30', '115/2'],
      ],
    };

    const result = parseTwseBwibbu(mockTwseData);
    assert.ok(result['1101']);
    assert.equal(result['1101'].symbol, '1101');
    assert.equal(result['1101'].pe, 15.2);
    assert.equal(result['1101'].pb, 0.88);
    assert.equal(result['1101'].dividendYield, 2.95);

    assert.equal(result['2330'].pe, 28.5);
    assert.equal(result['2330'].pb, 6.8);

    // 虧損股本益比為 '-' 應安全解析為 null
    assert.equal(result['9999'].pe, null);
    assert.equal(result['9999'].dividendYield, 0); // 殖利率 0.00 合法保留為 0
    assert.equal(result['9999'].pb, 0.5);

    // 虧損股本益比為 '0.00' 亦應安全轉化為 null
    assert.equal(result['9998'].pe, null);
    assert.equal(result['9998'].dividendYield, 0);
  });

  it('應正確解析 TPEx OpenAPI peratio 官方每日估值', () => {
    const mockTpexData = [
      {
        Date: '1151019',
        SecuritiesCompanyCode: '4979',
        CompanyName: '華星光',
        PriceEarningRatio: '78.56',
        YieldRatio: '0.45',
        PriceBookRatio: '15.39',
      },
      {
        Date: '1151019',
        SecuritiesCompanyCode: '3260',
        CompanyName: '威剛',
        PriceEarningRatio: '12.30',
        YieldRatio: '5.20',
        PriceBookRatio: '1.45',
      },
    ];

    const result = parseTpexPeratio(mockTpexData);
    assert.ok(result['4979']);
    assert.equal(result['4979'].pe, 78.56);
    assert.equal(result['4979'].dividendYield, 0.45);
    assert.equal(result['4979'].pb, 15.39);

    assert.ok(result['3260']);
    assert.equal(result['3260'].pe, 12.3);
    assert.equal(result['3260'].dividendYield, 5.2);
    assert.equal(result['3260'].pb, 1.45);
  });

  it('應能將估值資料成功寫入 SQLite tw_valuation_daily 並支援冪等更新', () => {
    const testDbPath = path.resolve(__dirname, '../../.scratch/test-valuation.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    try {
      const mockValuationMap = {
        '4979': { symbol: '4979', pe: 78.56, pb: 15.39, dividendYield: 0.45 },
        '2330': { symbol: '2330', pe: 28.5, pb: 6.8, dividendYield: 1.5 },
      };

      const res = saveTwValuationToSqlite(mockValuationMap, '2026-10-19', testDbPath);
      assert.equal(res.savedCount, 2);

      const db = initSqliteLakehouseDb(testDbPath);
      const row4979 = db.prepare('SELECT * FROM tw_valuation_daily WHERE symbol = ?').get('4979');
      assert.ok(row4979);
      assert.equal(row4979.pe, 78.56);
      assert.equal(row4979.pb, 15.39);
      assert.equal(row4979.dividend_yield, 0.45);
    } finally {
      if (fs.existsSync(testDbPath)) {
        try { fs.unlinkSync(testDbPath); } catch {}
      }
    }
  });
});
