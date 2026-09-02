import { describe, it, expect } from 'vitest';
import {
  calculateReceivableDividends,
  calculateSmoothedHoldingPnL,
  estimatePaymentDate,
} from './receivableDividendEngine';
import { HoldingPosition, TradeRecord } from '../types/stock';
import { RawCorporateEvent } from './corporateActionScanner';

describe('Receivable Dividend & Ex-Dividend Smoothing Engine (應收股利平滑引擎)', () => {
  const mockHoldingTW: HoldingPosition = {
    symbol: '2330',
    name: '台積電',
    market: 'TW',
    currency: 'TWD',
    shares: 1000,
    avgCost: 900,
    totalCostBasis: 900000,
    adjustedCostBasis: 900000,
    currentPrice: 950,
    marketValue: 950000,
    grossMarketValue: 950000,
    estimatedSellTax: 2850,
    estimatedSellFee: 1353,
    netMarketValue: 945797,
    unrealizedPnL: 50000,
    unrealizedPnLPercent: 5.56,
    unrealizedPnLBroker: 45797,
    unrealizedPnLBrokerPercent: 5.09,
    realizedPnL: 0,
    totalDividends: 0,
    totalCapitalReturned: 0,
    totalStockDividendsShares: 0,
    totalReturnPnL: 50000,
    totalReturnPercent: 5.56,
    yieldOnCostPercent: 0,
  };

  const mockHoldingUS: HoldingPosition = {
    symbol: 'VOO',
    name: 'Vanguard標普500 ETF',
    market: 'US',
    currency: 'USD',
    shares: 10,
    avgCost: 400,
    totalCostBasis: 4000,
    adjustedCostBasis: 4000,
    currentPrice: 420,
    marketValue: 4200,
    grossMarketValue: 4200,
    estimatedSellTax: 0,
    estimatedSellFee: 0,
    netMarketValue: 4200,
    unrealizedPnL: 200,
    unrealizedPnLPercent: 5.0,
    unrealizedPnLBroker: 200,
    unrealizedPnLBrokerPercent: 5.0,
    realizedPnL: 0,
    totalDividends: 0,
    totalCapitalReturned: 0,
    totalStockDividendsShares: 0,
    totalReturnPnL: 200,
    totalReturnPercent: 5.0,
    yieldOnCostPercent: 0,
  };

  describe('estimatePaymentDate (發放日推估)', () => {
    it('若無指定發放日，台股應預設推估為除息日後 28 天', () => {
      expect(estimatePaymentDate('2026-06-15', 'TW')).toBe('2026-07-13');
    });

    it('美股若無指定發放日，應預設推估為除息日後 21 天', () => {
      expect(estimatePaymentDate('2026-06-15', 'US')).toBe('2026-07-06');
    });
  });

  describe('calculateReceivableDividends (應收股利計算)', () => {
    it('當基準日期處於除息日至發放日之間且尚未入帳，應正確識別應收股利', () => {
      const events: RawCorporateEvent[] = [
        {
          symbol: '2330',
          market: 'TW',
          type: 'DIVIDEND',
          date: '2026-06-15', // ex-date
          price: 4.5, // cash dividend
          description: '除息 4.5 元',
        },
      ];

      const trades: TradeRecord[] = [
        {
          id: 't1',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          type: 'BUY',
          date: '2026-01-10',
          shares: 1000,
          price: 900,
          currency: 'TWD',
          fee: 0,
          tax: 0,
          createdAt: 1704844800000,
        },
      ];

      const today = '2026-06-20'; // 處於除息後但發放前 (2026-06-15 ~ 2026-07-13)
      const receivables = calculateReceivableDividends([mockHoldingTW], events, trades, today, 32.0, []);

      expect(receivables).toHaveLength(1);
      const rec = receivables[0];
      expect(rec.symbol).toBe('2330');
      expect(rec.sharesHeldOnExDate).toBe(1000);
      expect(rec.cashDividendPerShare).toBe(4.5);
      expect(rec.estimatedGrossDividend).toBe(4500);
      expect(rec.estimatedTaxOrFee).toBe(10);
      expect(rec.estimatedWireFee).toBe(10);
      expect(rec.estimatedNetDividend).toBe(4490);
      expect(rec.estimatedNetDividendInTWD).toBe(4490);
      expect(rec.status).toBe('PENDING_PAYMENT');
    });

    it('美股應自動扣除 30% IRS 預扣稅並折合台幣', () => {
      const events: RawCorporateEvent[] = [
        {
          symbol: 'VOO',
          market: 'US',
          type: 'DIVIDEND',
          date: '2026-06-20',
          price: 1.8,
          description: '配發季度股息',
        },
      ];

      const trades: TradeRecord[] = [
        {
          id: 't2',
          symbol: 'VOO',
          name: 'Vanguard標普500 ETF',
          market: 'US',
          type: 'BUY',
          date: '2026-01-10',
          shares: 10,
          price: 400,
          currency: 'USD',
          fee: 0,
          tax: 0,
          createdAt: 1704844800000,
        },
      ];

      const today = '2026-06-25';
      const receivables = calculateReceivableDividends([mockHoldingUS], events, trades, today, 32.0, []);

      expect(receivables).toHaveLength(1);
      const rec = receivables[0];
      expect(rec.symbol).toBe('VOO');
      expect(rec.estimatedGrossDividend).toBe(18);
      expect(rec.estimatedTaxOrFee).toBeCloseTo(5.4, 2);
      expect(rec.estimatedNetDividend).toBeCloseTo(12.6, 2);
      expect(rec.estimatedNetDividendInTWD).toBe(403);
    });

    it('若已在交易帳本中登錄已到期入帳之 DIVIDEND 記錄 (date <= today)，應排除而不重複列計', () => {
      const events: RawCorporateEvent[] = [
        {
          symbol: '2330',
          market: 'TW',
          type: 'DIVIDEND',
          date: '2026-06-15',
          price: 4.5,
        },
      ];

      const trades: TradeRecord[] = [
        {
          id: 't1',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          type: 'BUY',
          date: '2026-01-10',
          shares: 1000,
          price: 900,
          currency: 'TWD',
          fee: 0,
          tax: 0,
          createdAt: 1704844800000,
        },
        {
          id: 't_div',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          type: 'DIVIDEND',
          date: '2026-06-18', // 已經在 6/18 實質入帳 (<= 6/20)
          shares: 1000,
          price: 4.5,
          currency: 'TWD',
          fee: 0,
          tax: 0,
          createdAt: 1718697600000,
        },
      ];

      const today = '2026-07-20'; // 發放日 2026-07-13 已過
      const receivables = calculateReceivableDividends([mockHoldingTW], events, trades, today, 32.0, []);
      expect(receivables).toHaveLength(0);
    });

    it('若帳本中登記了未來日期的 DIVIDEND 記錄 (date > today)，應自動列為待發放應收股利', () => {
      const trades: TradeRecord[] = [
        {
          id: 't_future_div',
          symbol: '9927',
          name: '泰銘',
          market: 'TW',
          type: 'DIVIDEND',
          date: '2026-10-01', // 未來發放日
          shares: 10000,
          price: 5,
          currency: 'TWD',
          fee: 0,
          tax: 0,
          createdAt: 1718697600000,
        },
      ];

      const today = '2026-08-28';
      const receivables = calculateReceivableDividends([], [], trades, today, 32.0);
      expect(receivables).toHaveLength(1);
      expect(receivables[0].symbol).toBe('9927');
      expect(receivables[0].estimatedGrossDividend).toBe(50000);
      expect(receivables[0].estimatedTaxOrFee).toBe(1055); // 2.11% 二代健保 (1,055)
      expect(receivables[0].estimatedNetDividendInTWD).toBe(48945);
      expect(receivables[0].status).toBe('PENDING_PAYMENT');
    });


  });

  describe('calculateSmoothedHoldingPnL (持倉平滑未實現損益)', () => {
    it('能正確將應收股息補償計入平滑未實現損益', () => {
      const result = calculateSmoothedHoldingPnL(mockHoldingTW, 4500);

      expect(result.rawUnrealizedPnL).toBe(50000);
      expect(result.receivableDividendTWD).toBe(4500);
      expect(result.smoothedUnrealizedPnL).toBe(54500);
      expect(result.smoothedUnrealizedPnLPercent).toBeCloseTo((54500 / 900000) * 100, 2);
      expect(result.hasReceivable).toBe(true);
    });

    it('若無應收股息，平滑損益與原生損益一致', () => {
      const result = calculateSmoothedHoldingPnL(mockHoldingTW, 0);

      expect(result.smoothedUnrealizedPnL).toBe(50000);
      expect(result.hasReceivable).toBe(false);
    });

    it('永豐金除權息實務：待入帳 620 股與應收現金 33,250 元能精準納入平滑損益，消除除權空窗期假摔', () => {
      // 假設永豐金成本 700,000 元，除權後在庫市值 680,000 元 (原損益 -20,000 元)
      // 待入帳 620 股 (以當前現價 23 元計 = 14,260 元)
      // 應收現金淨額 = 33,250 元
      // 平滑損益 = -20,000 + 33,250 + 14,260 = +27,510 元
      const yfHolding: HoldingPosition = {
        symbol: '2890',
        name: '永豐金',
        market: 'TW',
        currency: 'TWD',
        shares: 31000,
        avgCost: 22.58,
        totalCostBasis: 700000,
        adjustedCostBasis: 700000,
        currentPrice: 23,
        marketValue: 713000,
        grossMarketValue: 713000,
        estimatedSellTax: 0,
        estimatedSellFee: 0,
        netMarketValue: 713000,
        unrealizedPnL: -20000,
        unrealizedPnLPercent: -2.86,
        unrealizedPnLBroker: -20000,
        unrealizedPnLBrokerPercent: -2.86,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: -20000,
        totalReturnPercent: -2.86,
        yieldOnCostPercent: 0,
      };

      const result = calculateSmoothedHoldingPnL(yfHolding, 33250, 620, 23);

      expect(result.rawUnrealizedPnL).toBe(-20000);
      expect(result.receivableDividendTWD).toBe(33250);
      expect(result.receivableStockShares).toBe(620);
      expect(result.receivableStockValueTWD).toBe(14260); // 620 * 23
      expect(result.smoothedUnrealizedPnL).toBe(27510); // -20000 + 33250 + 14260
      expect(result.smoothedUnrealizedPnLPercent).toBeCloseTo((27510 / 700000) * 100, 2);
      expect(result.hasReceivable).toBe(true);
    });
  });

  describe('Ticket #005: 移除除息日前持股 Fallback 漏洞（嚴格排除除息日後買進者）', () => {
    it('在除息日之後才買進之股票，除息日前一日持股為 0，絕不誤算應收股利', () => {
      // 2886 兆豐金於 2026-08-13 除息 (每股 1.75 元，2026-09-04 發放)
      // 使用者在 2026-08-14 (除息日隔天) 買進 10,000 股
      const trades: TradeRecord[] = [
        {
          id: 'trade-buy-after-ex',
          symbol: '2886',
          name: '兆豐金',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          date: '2026-08-14', // 除息日後買進
          shares: 10000,
          price: 40,
          fee: 50,
          tax: 0,
          createdAt: 100,
        },
      ];

      const currentHolding: HoldingPosition = {
        symbol: '2886',
        name: '兆豐金',
        market: 'TW',
        currency: 'TWD',
        shares: 10000, // 當前在庫有 10000 股
        avgCost: 40,
        totalCostBasis: 400050,
        adjustedCostBasis: 400050,
        currentPrice: 40,
        marketValue: 400000,
        grossMarketValue: 400000,
        estimatedSellTax: 1200,
        estimatedSellFee: 570,
        netMarketValue: 398230,
        unrealizedPnL: -50,
        unrealizedPnLPercent: -0.01,
        unrealizedPnLBroker: -1820,
        unrealizedPnLBrokerPercent: -0.45,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: -50,
        totalReturnPercent: -0.01,
        yieldOnCostPercent: 0,
      };

      const today = '2026-08-20'; // 處於除息後與發放日之間
      const receivables = calculateReceivableDividends([currentHolding], [], trades, today, 32.0);

      // 嚴格判定：因為 2026-08-12 (除息前一日) 持股為 0，所以 receivables 必須為 0
      expect(receivables.filter((r) => r.symbol === '2886')).toHaveLength(0);
    });
  });

  describe('Ticket #007: 臺股現金股利 10 元跨行匯費內扣與二代健保精確對齊', () => {
    it('台股現金股利應精確計算 2.11% 二代健保與 10 元跨行匯費內扣', () => {
      // 假設持有 1,000 股台積電，除息 7 元，毛額 7,000 元 (< 20,000 免二代健保)，扣 10 元匯費 = 6,990 元
      const holding: HoldingPosition = {
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        shares: 1000,
        avgCost: 900,
        totalCostBasis: 900000,
        adjustedCostBasis: 900000,
        currentPrice: 950,
        marketValue: 950000,
        grossMarketValue: 950000,
        estimatedSellTax: 2850,
        estimatedSellFee: 1353,
        netMarketValue: 945797,
        unrealizedPnL: 50000,
        unrealizedPnLPercent: 5.56,
        unrealizedPnLBroker: 45797,
        unrealizedPnLBrokerPercent: 5.09,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: 50000,
        totalReturnPercent: 5.56,
        yieldOnCostPercent: 0,
      };

      const trades: TradeRecord[] = [
        {
          id: 't-2330-init',
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 1000,
          price: 900,
          fee: 0,
          tax: 0,
          date: '2026-01-01',
          createdAt: 1,
        },
      ];

      // 台積電 2026-09-16 除息 7 元
      const today = '2026-09-10'; // 處於即將除息階段
      const receivables = calculateReceivableDividends([holding], [], trades, today, 32.0);

      const rec = receivables.find((r) => r.symbol === '2330');
      expect(rec).toBeDefined();
      expect(rec!.estimatedGrossDividend).toBe(7000);
      expect(rec!.estimatedWireFee).toBe(10);
      // 實收淨額 = 7000 - 10 = 6990
      expect(rec!.estimatedNetDividend).toBe(6990);
    });

    it('真實場景：2890 永豐金持股 31,000 股，同時配息 1.10 元與配股 0.02 (620 股)，待入帳應合併面額計算二代健保 NT$850', () => {
      const holding: HoldingPosition = {
        symbol: '2890',
        name: '永豐金',
        market: 'TW',
        currency: 'TWD',
        shares: 31000,
        avgCost: 20,
        totalCostBasis: 620000,
        adjustedCostBasis: 620000,
        currentPrice: 25,
        marketValue: 775000,
        grossMarketValue: 775000,
        estimatedSellTax: 2325,
        estimatedSellFee: 1104,
        netMarketValue: 771571,
        unrealizedPnL: 155000,
        unrealizedPnLPercent: 25.0,
        unrealizedPnLBroker: 151571,
        unrealizedPnLBrokerPercent: 24.45,
        realizedPnL: 0,
        totalDividends: 0,
        totalCapitalReturned: 0,
        totalStockDividendsShares: 0,
        totalReturnPnL: 155000,
        totalReturnPercent: 25.0,
        yieldOnCostPercent: 0,
      };

      const trades: TradeRecord[] = [
        {
          id: 't-2890-init',
          symbol: '2890',
          name: '永豐金',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 31000,
          price: 20,
          fee: 0,
          tax: 0,
          date: '2026-01-01',
          createdAt: 1,
        },
      ];

      const events: RawCorporateEvent[] = [
        {
          symbol: '2890',
          market: 'TW',
          type: 'DIVIDEND',
          date: '2026-07-23',
          price: 1.10,
          description: '除息 1.10 元',
        },
        {
          symbol: '2890',
          market: 'TW',
          type: 'STOCK_DIVIDEND',
          date: '2026-07-23',
          ratio: 0.02,
          description: '除權 0.02',
        },
      ];

      const today = '2026-07-25'; // 已除息，處於待發放入帳階段 (發放日 2026-08-20)
      const receivables = calculateReceivableDividends([holding], events, trades, today, 32.0);

      const rec = receivables.find((r) => r.symbol === '2890');
      expect(rec).toBeDefined();
      expect(rec!.estimatedGrossDividend).toBe(34100);
      // 合併所得 34,100 + (620 * 10) = 40,300 -> 健保 40,300 * 2.11% = 850，匯費 10
      expect(rec!.estimatedNhiTax).toBe(850);
      expect(rec!.estimatedWireFee).toBe(10);
      expect(rec!.estimatedTaxOrFee).toBe(860);
      expect(rec!.estimatedNetDividend).toBe(33240); // 34100 - 850 - 10 = 33240
    });
  });
});


