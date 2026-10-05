import { describe, it, expect } from 'vitest';

declare const require: (id: string) => any;

describe('Ticket 13: Ingest TW Insider Pledge Records Pipeline', () => {
  const { parseTwPledgeReport, computePledgeRatio } = require('../../scripts/market-sync/ingest-tw-pledge.cjs');

  it('1. computePledgeRatio 應精確計算質押比率', () => {
    // 質押 5,000,000 股，總持股 10,000,000 股 -> 50.0%
    expect(computePledgeRatio(5000000, 10000000)).toBe(50.0);
    // 總持股為 0 時應防除以零
    expect(computePledgeRatio(100, 0)).toBe(0);
  });

  it('2. parseTwPledgeReport 應正確清洗並格式化開放資料', () => {
    const mockGovPledgeData = [
      {
        出表年月: '11502', // 2026-02
        公司代號: '2330',
        公司名稱: '台積電',
        董監事設質股數: '50000000',
        董監事持有股數: '1000000000',
        內部人申報轉讓股數: '0',
      },
      {
        出表年月: '11502',
        公司代號: '2454',
        公司名稱: '聯發科',
        董監事設質股數: '12000000',
        董監事持有股數: '30000000',
        內部人申報轉讓股數: '600',
      },
    ];

    const records = parseTwPledgeReport(mockGovPledgeData);
    expect(records.length).toBe(2);

    expect(records[0].symbol).toBe('2330');
    expect(records[0].reportDate).toBe('2026-02');
    expect(records[0].pledgedShares).toBe(50000000);
    expect(records[0].totalDirectorShares).toBe(1000000000);
    expect(records[0].pledgeRatio).toBe(5.0);

    expect(records[1].symbol).toBe('2454');
    expect(records[1].pledgeRatio).toBe(40.0);
    expect(records[1].insiderTransferShares).toBe(600);
  });
});
