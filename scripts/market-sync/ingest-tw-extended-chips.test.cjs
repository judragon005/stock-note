const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseTpexMargin, parseTwseMargin, parseTwseDayTrade, stripOtcSuffix } = require('./ingest-tw-extended-chips.cjs');

describe('ingest-tw-extended-chips: TPEx Margin Chips Sync (Spec 0196 / Ticket 01)', () => {
  it('應正確解析 TPEx OpenAPI 格式之信用交易資料', () => {
    const mockTpexData = [
      {
        Date: '1151019',
        SecuritiesCompanyCode: '4979',
        CompanyName: '華星光',
        MarginPurchaseBalance: '12,009',
        ShortSaleBalance: '273',
      },
      {
        Date: '1151019',
        SecuritiesCompanyCode: '3260',
        CompanyName: '威剛',
        MarginPurchaseBalance: '5,420',
        ShortSaleBalance: '150',
      },
    ];

    const result = parseTpexMargin(mockTpexData);
    assert.ok(result['4979'], '應包含 4979 華星光');
    assert.equal(result['4979'].symbol, '4979');
    assert.equal(result['4979'].marginBalance, 12009);
    assert.equal(result['4979'].shortBalance, 273);

    assert.ok(result['3260'], '應包含 3260 威剛');
    assert.equal(result['3260'].symbol, '3260');
    assert.equal(result['3260'].marginBalance, 5420);
    assert.equal(result['3260'].shortBalance, 150);
  });

  it('面對無效或空資料時應優雅回傳空物件而不崩潰', () => {
    assert.deepEqual(parseTpexMargin(null), {});
    assert.deepEqual(parseTpexMargin([]), {});
    assert.deepEqual(parseTpexMargin({}), {});
    assert.deepEqual(parseTpexMargin([{ SecuritiesCompanyCode: 'TOOLONG123' }]), {});
  });

  it('應自動剝除 TPEx 融資融券代碼尾綴 O (8299O -> 8299, 00679BO -> 00679B)', () => {
    assert.equal(stripOtcSuffix('8299O'), '8299');
    assert.equal(stripOtcSuffix('00679BO'), '00679B');
    const result = parseTpexMargin([
      { Date: '1151019', SecuritiesCompanyCode: '8299O', MarginPurchaseBalance: '3,200', ShortSaleBalance: '80' },
      { Date: '1151019', SecuritiesCompanyCode: '00679BO', MarginPurchaseBalance: '12,500', ShortSaleBalance: '0' },
    ]);
    assert.equal(result['8299O'], undefined);
    assert.equal(result['00679BO'], undefined);
    assert.equal(result['8299'].marginBalance, 3200);
    assert.equal(result['00679B'].marginBalance, 12500);
  });

  it('parseTwseDayTrade 應優先支援 TWSE TWTB4U RWD rawData.tables 並計算當沖率且避免 NaN', () => {
    const rwdRaw = {
      stat: 'OK',
      tables: [
        { title: '當日沖銷交易統計資訊', fields: ['統計項目', '數值'], data: [['當沖比率', '33.5']] },
        {
          title: '當日沖銷交易標的',
          fields: ['證券代號', '證券名稱', '暫停註記', '當日沖銷交易成交股數', '當日沖銷買進金額', '當日沖銷賣出金額'],
          data: [
            ['2330', '台積電', '', '5,000,000', '4,900,000,000', '4,950,000,000'],
            ['2317', '鴻海', '', '--', '--', '--'],
          ],
        },
      ],
    };
    const parsed = parseTwseDayTrade(rwdRaw, { '2330': { volume: 20000000 }, '2317': { volume: 0 } });
    assert.ok(parsed['2330']);
    assert.equal(parsed['2330'].dayTradeShares, 5000000);
    assert.equal(parsed['2330'].dayTradeRate, 25);
    assert.equal(Number.isNaN(parsed['2317'].dayTradeRate), false);
    assert.equal(parsed['2317'].dayTradeRate, 0);
  });
});
