const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseTpexMargin, parseTwseMargin } = require('./ingest-tw-extended-chips.cjs');

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
});
