import { describe, it, expect } from 'vitest';
import {
  aggregateMultiDayChips,
  classifyInstitutionalSignal,
  getTopMomentumSymbols,
} from './chipsAggregator';
import { TwseInstitutionalRow } from './smartMoneyFetcher';

describe('chipsAggregator (多日法人籌碼累加與動能決策引擎 Spec 0119)', () => {
  const createMockRow = (
    symbol: string,
    name: string,
    fNet: number,
    tNet: number,
    dNet = 0
  ): TwseInstitutionalRow => ({
    symbol,
    name,
    foreignBuyShares: fNet > 0 ? fNet : 0,
    foreignSellShares: fNet < 0 ? Math.abs(fNet) : 0,
    foreignNetShares: fNet,
    trustBuyShares: tNet > 0 ? tNet : 0,
    trustSellShares: tNet < 0 ? Math.abs(tNet) : 0,
    trustNetShares: tNet,
    dealerNetShares: dNet,
    totalNetShares: fNet + tNet + dNet,
  });

  describe('aggregateMultiDayChips (多日籌碼加總計算)', () => {
    const dates = ['20260907', '20260908', '20260909', '20260910', '20260911'];
    const historyMap: Record<string, Record<string, TwseInstitutionalRow>> = {
      '20260907': {
        '2330': createMockRow('2330', '台積電', 1000, 500),
        '2481': createMockRow('2481', '強茂', -200, -100),
      },
      '20260908': {
        '2330': createMockRow('2330', '台積電', 2000, 300),
        '2481': createMockRow('2481', '強茂', -100, -50),
      },
      '20260909': {
        '2330': createMockRow('2330', '台積電', 1500, 200),
        '2481': createMockRow('2481', '強茂', -300, -150),
      },
      '20260910': {
        '2330': createMockRow('2330', '台積電', 3000, 1000),
        '2481': createMockRow('2481', '強茂', -400, -200),
      },
      '20260911': {
        '2330': createMockRow('2330', '台積電', 2500, 800),
        '2481': createMockRow('2481', '強茂', 100, -50),
      },
    };

    it('1 日視角：回傳當日數據不累加', () => {
      const res = aggregateMultiDayChips(historyMap, dates, 1);
      expect(res['2330'].foreignNetShares).toBe(2500);
      expect(res['2330'].trustNetShares).toBe(800);
      expect(res['2481'].foreignNetShares).toBe(100);
    });

    it('3 日視角：精確加總最近 3 個交易日 (9/9, 9/10, 9/11) 之買賣超', () => {
      const res = aggregateMultiDayChips(historyMap, dates, 3);
      // 台積電: 1500 + 3000 + 2500 = 7000, 投信: 200 + 1000 + 800 = 2000
      expect(res['2330'].foreignNetShares).toBe(7000);
      expect(res['2330'].trustNetShares).toBe(2000);
      expect(res['2330'].totalNetShares).toBe(9000);

      // 強茂: -300 + -400 + 100 = -600, 投信: -150 + -200 + -50 = -400
      expect(res['2481'].foreignNetShares).toBe(-600);
      expect(res['2481'].trustNetShares).toBe(-400);
      expect(res['2481'].totalNetShares).toBe(-1000);
    });

    it('5 日視角：精確加總全 5 個交易日之買賣超', () => {
      const res = aggregateMultiDayChips(historyMap, dates, 5);
      // 台積電 5 日外資合計: 1000 + 2000 + 1500 + 3000 + 2500 = 10000
      expect(res['2330'].foreignNetShares).toBe(10000);
      // 台積電 5 日投信合計: 500 + 300 + 200 + 1000 + 800 = 2800
      expect(res['2330'].trustNetShares).toBe(2800);
    });
  });

  describe('classifyInstitutionalSignal (法人動能信號識別)', () => {
    it('外資與投信皆大於 0 時識別為【雙法人認養 (可以買)】', () => {
      const row = createMockRow('2330', '台積電', 1500, 800);
      const signal = classifyInstitutionalSignal(row);
      expect(signal.signalType).toBe('BUY_SYNERGY');
      expect(signal.label).toContain('雙法人認養');
    });

    it('外資與投信皆小於 0 時識別為【雙法人出逃 (一定要閃)】', () => {
      const row = createMockRow('2481', '強茂', -1200, -300);
      const signal = classifyInstitutionalSignal(row);
      expect(signal.signalType).toBe('SELL_DUMP');
      expect(signal.label).toContain('雙法人出逃');
    });

    it('投信買超但外資未買時識別為【投信逆勢護盤】', () => {
      const row = createMockRow('3037', '欣興', -500, 300);
      const signal = classifyInstitutionalSignal(row);
      expect(signal.label).toContain('投信逆勢護盤');
    });
  });

  describe('getTopMomentumSymbols (決策排行榜篩選)', () => {
    it('正確過濾並回傳法人合買買超榜與主力大賣出逃榜', () => {
      const aggregated: Record<string, TwseInstitutionalRow> = {
        '2330': createMockRow('2330', '台積電', 5000, 2000),
        '2454': createMockRow('2454', '聯發科', 2000, 500),
        '2481': createMockRow('2481', '強茂', -2000, -800),
        '2303': createMockRow('2303', '聯電', -3000, -1000),
      };

      const { buyList, dumpList } = getTopMomentumSymbols(aggregated, 2);
      expect(buyList.length).toBe(2);
      expect(buyList[0].symbol).toBe('2330'); // 7000 張合計排第 1
      expect(buyList[1].symbol).toBe('2454'); // 2500 張排第 2

      expect(dumpList.length).toBe(2);
      expect(dumpList[0].symbol).toBe('2303'); // -4000 張倒貨最多排第 1
      expect(dumpList[1].symbol).toBe('2481'); // -2800 張排第 2
    });
  });
});
