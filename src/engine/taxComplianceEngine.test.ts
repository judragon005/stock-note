import { describe, it, expect } from 'vitest';
import {
  checkTwNhiTaxAlert,
  calculateConsolidatedTwNhiTax,
  calculateOverseasIncomeProgress,
  TW_NHI_THRESHOLD,
  US_OVERSEAS_FILING_THRESHOLD,
  US_AMT_EXEMPTION,
} from './taxComplianceEngine';
import { TradeRecord } from '../types/stock';
import { ReceivableDividend } from '../types/dividend';

describe('Tax Compliance & Pre-Trade Tax Bracket Engine (稅務合規與稅階預警引擎)', () => {
  describe('checkTwNhiTaxAlert (台股二代健保 20,000 門檻警示)', () => {
    it('單筆股利達 20,000 元以上時，應觸發警示並試算 2.11% 補充保費', () => {
      const rec: ReceivableDividend = {
        id: 'rec-1',
        symbol: '2454',
        name: '聯發科',
        market: 'TW',
        currency: 'TWD',
        exDate: '2026-07-01',
        payDate: '2026-07-29',
        sharesHeldOnExDate: 1000,
        cashDividendPerShare: 25, // 25,000 TWD
        estimatedGrossDividend: 25000,
        estimatedTaxOrFee: 527, // 25,000 * 2.11% = 527.5 ➔ 527
        estimatedNetDividend: 24473,
        estimatedNetDividendInTWD: 24473,
        status: 'PENDING_PAYMENT',
      };

      const alert = checkTwNhiTaxAlert(rec);
      expect(alert.triggersNhi).toBe(true);
      expect(alert.nhiFeeTWD).toBe(527);
      expect(alert.thresholdAmount).toBe(TW_NHI_THRESHOLD);
    });

    it('單筆股利未達 20,000 元時，不觸發二代健保警示', () => {
      const rec: ReceivableDividend = {
        id: 'rec-2',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        exDate: '2026-06-15',
        payDate: '2026-07-13',
        sharesHeldOnExDate: 1000,
        cashDividendPerShare: 4.5, // 4,500 TWD
        estimatedGrossDividend: 4500,
        estimatedTaxOrFee: 0,
        estimatedNetDividend: 4500,
        estimatedNetDividendInTWD: 4500,
        status: 'PENDING_PAYMENT',
      };

      const alert = checkTwNhiTaxAlert(rec);
      expect(alert.triggersNhi).toBe(false);
      expect(alert.nhiFeeTWD).toBe(0);
    });

    it('永豐金除權息實務：配息 1.1 + 配股 0.2 (持股 31,000 股) 應合併試算 40,300 所得，扣除 850 健保費，實收 33,250', () => {
      // 31,000 股 * 1.1 元 = 34,100 現金
      // 31,000 股 * 0.02 = 620 股配股 * 10 元面額 = 6,200
      // 總所得 = 40,300 元 (>= 20,000)，健保費 = 40,300 * 2.11% = 850.33 ➔ 850 元
      // 實收現金 = 34,100 - 850 = 33,250 元
      const result = calculateConsolidatedTwNhiTax({
        cashDividendGross: 34100,
        stockDividendShares: 620,
        wireFee: 0,
      });

      expect(result.cashDividendGross).toBe(34100);
      expect(result.stockDividendParValue).toBe(6200);
      expect(result.totalTaxableIncome).toBe(40300);
      expect(result.triggersNhi).toBe(true);
      expect(result.nhiFeeTWD).toBe(850);
      expect(result.netCashDividend).toBe(33250);
    });

    it('合併總額未達 20,000 元門檻時，免扣二代健保補充保費', () => {
      const result = calculateConsolidatedTwNhiTax({
        cashDividendGross: 10000,
        stockDividendShares: 500, // 5,000 面額 ➔ 總計 15,000
        wireFee: 10,
      });

      expect(result.totalTaxableIncome).toBe(15000);
      expect(result.triggersNhi).toBe(false);
      expect(result.nhiFeeTWD).toBe(0);
      expect(result.netCashDividend).toBe(9990); // 10000 - 10 匯費
    });
  });

  describe('calculateOverseasIncomeProgress (美股海外所得與 AMT 稅階進度)', () => {
    it('能精準統計當年度美股已實現獲利與已領股息，並計算 100 萬申報與 750 萬免稅額進度', () => {
      const trades: TradeRecord[] = [
        // 2026 年買進與賣出 NVDA 獲利 10,000 USD (約 32 萬 TWD)
        {
          id: 't-buy-1',
          symbol: 'NVDA',
          name: '輝達',
          market: 'US',
          type: 'BUY',
          date: '2026-01-10',
          shares: 100,
          price: 50,
          currency: 'USD',
          fee: 0,
          tax: 0,
          createdAt: 1704844800000,
        },
        {
          id: 't-sell-1',
          symbol: 'NVDA',
          name: '輝達',
          market: 'US',
          type: 'SELL',
          date: '2026-03-15',
          shares: 100,
          price: 150,
          currency: 'USD',
          fee: 0,
          tax: 0,
          createdAt: 1710460800000,
        },
        // 2026 年已領美股股息 5,000 USD (約 16 萬 TWD)
        {
          id: 't-div-1',
          symbol: 'VOO',
          name: '標普500',
          market: 'US',
          type: 'DIVIDEND',
          date: '2026-06-20',
          shares: 100,
          price: 50,
          currency: 'USD',
          fee: 0,
          tax: 0,
          createdAt: 1718841600000,
        },
        // 2025 年舊記錄 (應被年份過濾排除)
        {
          id: 't-old-buy',
          symbol: 'AAPL',
          name: '蘋果',
          market: 'US',
          type: 'BUY',
          date: '2025-01-10',
          shares: 50,
          price: 100,
          currency: 'USD',
          fee: 0,
          tax: 0,
          createdAt: 1673308800000,
        },
        {
          id: 't-old-sell',
          symbol: 'AAPL',
          name: '蘋果',
          market: 'US',
          type: 'SELL',
          date: '2025-11-20',
          shares: 50,
          price: 180,
          currency: 'USD',
          fee: 0,
          tax: 0,
          createdAt: 1700438400000,
        },
      ];

      const progress = calculateOverseasIncomeProgress(trades, 2026, 32.0);

      expect(progress.taxYear).toBe(2026);
      expect(progress.realizedCapitalGainsTWD).toBe(320000); // 10,000 * 32
      expect(progress.overseasDividendsTWD).toBe(160000); // 5,000 * 32
      expect(progress.totalOverseasIncomeTWD).toBe(480000); // 320,000 + 160,000
      expect(progress.filingThresholdTWD).toBe(US_OVERSEAS_FILING_THRESHOLD); // 1,000,000
      expect(progress.amtExemptionTWD).toBe(US_AMT_EXEMPTION); // 7,500,000

      expect(progress.isFilingRequired).toBe(false); // 48萬 < 100萬
      expect(progress.filingProgressPercent).toBeCloseTo(48.0, 1); // 48%
      expect(progress.amtProgressPercent).toBeCloseTo((480000 / 7500000) * 100, 2);
    });
  });
});
