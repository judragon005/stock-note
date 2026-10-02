import { describe, it, expect } from 'vitest';
import {
  assembleQuoteValuationData,
  assembleChipsAndBoxData,
  assembleAllDeepDiveData,
} from './equityDeepDiveAssembler';
import { EquityDeepDiveInput } from '../types/equityDeepDive';

describe('equityDeepDiveAssembler - 湖倉數據裝配與跨市場適配 (Ticket 06, 07, 08)', () => {
  describe('Ticket 06: 行情與估值數據裝配', () => {
    it('應正確從 quote 或日 K 提取市價與估值指標', () => {
      const mockCandles = [
        { date: '2026-09-30', open: 980, high: 990, low: 975, close: 985, volume: 30000 },
      ];
      const mockQuote = {
        price: 985,
        change: 10,
        changePercent: 1.02,
        pe: 25.4,
        pb: 5.8,
        dividendYield: 2.1,
      };

      const result = assembleQuoteValuationData(mockCandles, mockQuote, 'TW');
      expect(result.currentPrice).toBe(985);
      expect(result.pe).toBe(25.4);
      expect(result.pb).toBe(5.8);
      expect(result.dividendYield).toBe(2.1);
    });

    it('當無即時 quote 時，應從最後一根日 K 兜底市價', () => {
      const mockCandles = [
        { date: '2026-09-30', open: 100, high: 105, low: 98, close: 102, volume: 5000 },
      ];
      const result = assembleQuoteValuationData(mockCandles, undefined, 'TW');
      expect(result.currentPrice).toBe(102);
      expect(result.pe).toBeUndefined();
    });
  });

  describe('Ticket 07: 籌碼與箱體防線裝配 (台股)', () => {
    it('應正確累加 20 日法人買賣超與箱體價位', () => {
      const mockInst = [
        { date: '2026-09-29', foreignShares: 1000, trustShares: 500, dealerShares: -200 },
        { date: '2026-09-30', foreignShares: 2000, trustShares: -100, dealerShares: 300 },
      ];

      const result = assembleChipsAndBoxData(mockInst, 950, 1050, 'TW', []);
      expect(result.foreignNetShares20D).toBe(3000);
      expect(result.trustNetShares20D).toBe(400);
      expect(result.dealerNetShares20D).toBe(100);
      expect(result.totalNetShares20D).toBe(3500);
      expect(result.boxFloorPrice).toBe(950);
      expect(result.boxCeilingPrice).toBe(1050);
    });
  });

  describe('Ticket 08: 台美雙市場動態適配', () => {
    it('美股標的應自動轉換為價量動能描述，不出現台股籌碼特徵', () => {
      const input: EquityDeepDiveInput = {
        symbol: 'NVDA',
        name: '輝達',
        market: 'US',
        candles: [
          { date: '2026-09-30', open: 120, high: 125, low: 119, close: 124, volume: 50000000 },
        ],
        quote: { price: 124, pe: 45.2 },
        statusTag: 'NORMAL',
      };

      const assembled = assembleAllDeepDiveData(input);
      expect(assembled.step5.currency).toBe('USD');
      expect(assembled.step6.foreignNetShares20D).toBeUndefined();
      expect(assembled.step6.microstructureSummary).toContain('美股量能');
      expect(assembled.step4.volatilityText).toBeDefined();
    });

    it('台股標的應維持三大法人與 TWD 幣別', () => {
      const input: EquityDeepDiveInput = {
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        candles: [
          { date: '2026-09-30', open: 980, high: 990, low: 975, close: 985, volume: 30000 },
        ],
        quote: { price: 985 },
        institutionalRecords: [
          { date: '2026-09-30', foreignShares: 5000, trustShares: 1000, dealerShares: 500 },
        ],
        statusTag: 'DISPOSITION',
        boxFloorPrice: 950,
        boxCeilingPrice: 1020,
      };

      const assembled = assembleAllDeepDiveData(input);
      expect(assembled.step4.statusTag).toBe('DISPOSITION');
      expect(assembled.step5.currency).toBe('TWD');
      expect(assembled.step6.totalNetShares20D).toBe(6500);
      expect(assembled.step6.boxFloorPrice).toBe(950);
    });
  });
});
