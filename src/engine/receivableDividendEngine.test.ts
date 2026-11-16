import { describe, it, expect, vi } from 'vitest';
import {
  calculateReceivableDividends,
  calculateSmoothedHoldingPnL,
  estimatePaymentDate,
  isPaymentDateOfficial,
  isTwEtfSymbol,
  instantSettleReceivableDividend,
  generateUpcomingExDividendRadarEvents,
} from './receivableDividendEngine';
import { HoldingPosition, TradeRecord } from '../types/stock';
import { ReceivableDividend } from '../types/dividend';
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

  describe('estimatePaymentDate (發放日推估與分流)', () => {
    it('若無指定發放日，台股個股應預設推估為除息日後 28 天', () => {
      expect(estimatePaymentDate('2026-06-15', 'TW', '2330')).toBe('2026-07-13');
      expect(estimatePaymentDate('2026-06-15', 'TW')).toBe('2026-07-13');
    });

    it('若為台股 ETF 標的 (代碼 00 開頭或 5~6 碼 ETF)，應分流推估為除息日後 23 天', () => {
      // 2026-06-15 + 23 天 = 2026-07-08
      expect(estimatePaymentDate('2026-06-15', 'TW', '00878')).toBe('2026-07-08');
      expect(estimatePaymentDate('2026-06-15', 'TW', '00919')).toBe('2026-07-08');
      expect(estimatePaymentDate('2026-06-15', 'TW', '00687B')).toBe('2026-07-08');
    });

    it('美股若無指定發放日，應預設推估為除息日後 21 天', () => {
      expect(estimatePaymentDate('2026-06-15', 'US')).toBe('2026-07-06');
    });

    it('命中官方真實發放日庫時應優先返回官方公告日', () => {
      expect(estimatePaymentDate('2024-08-16', 'TW', '00878')).toBe('2024-09-11');
      expect(isPaymentDateOfficial('2024-08-16', '00878')).toBe(true);
      expect(isPaymentDateOfficial('2026-06-15', '00878')).toBe(false);
      // 0056 2026-10-22 除息，官方公告發放日為 2026-11-11
      expect(estimatePaymentDate('2026-10-22', 'TW', '0056')).toBe('2026-11-11');
      expect(isPaymentDateOfficial('2026-10-22', '0056')).toBe(true);
    });

    it('isTwEtfSymbol 能準確判定各類型台股 ETF 標的', () => {
      expect(isTwEtfSymbol('00878')).toBe(true);
      expect(isTwEtfSymbol('00919')).toBe(true);
      expect(isTwEtfSymbol('00687B')).toBe(true);
      expect(isTwEtfSymbol('2330')).toBe(false);
      expect(isTwEtfSymbol('2890')).toBe(false);
      expect(isTwEtfSymbol(undefined)).toBe(false);
    });

    it('instantSettleReceivableDividend 能將待發放款定錨為今日實領並轉為 RECEIVED', () => {
      const mockRec: any = {
        id: 'rec-test-1',
        symbol: '00878',
        name: '國泰永續高股息',
        market: 'TW',
        currency: 'TWD',
        exDate: '2026-06-15',
        payDate: '2026-07-08',
        sharesHeldOnExDate: 10000,
        cashDividendPerShare: 0.55,
        estimatedGrossDividend: 5500,
        estimatedTaxOrFee: 10,
        estimatedNhiTax: 0,
        estimatedWireFee: 10,
        estimatedNetDividend: 5490,
        estimatedNetDividendInTWD: 5490,
        status: 'PENDING_PAYMENT',
        dateSource: 'ESTIMATED',
      };

      const settled = instantSettleReceivableDividend(mockRec, '2026-06-25');
      expect(settled.status).toBe('RECEIVED');
      expect(settled.payDate).toBe('2026-06-25');
      expect(settled.dateSource).toBe('OFFICIAL');
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

  describe('estimatePaymentDate 官方發放日對照與泰銘定錨 (Ticket 02 / PRD #0138)', () => {
    it('9927 泰銘 2025-11-13 除息應精確定錨為銀行存摺官方入帳日 2025-12-01', () => {
      const payDate = estimatePaymentDate('2025-11-13', 'TW', '9927');
      expect(payDate).toBe('2025-12-01');
    });

    it('2890 永豐金 2025-08-21 除息應精確定錨為官方發放日 2025-09-18', () => {
      const payDate = estimatePaymentDate('2025-08-21', 'TW', '2890');
      expect(payDate).toBe('2025-09-18');
    });
  });

  describe('Spec 0228 / Ticket 01 & 02: 股利時序黑洞根除與 DUE_FOR_RECONCILIATION 狀態機', () => {
    const mockHolding0056: HoldingPosition = {
      symbol: '0056',
      name: '元大高股息',
      market: 'TW',
      currency: 'TWD',
      shares: 7000,
      avgCost: 36.5,
      totalCostBasis: 255500,
      adjustedCostBasis: 255500,
      currentPrice: 38.0,
      marketValue: 266000,
      grossMarketValue: 266000,
      estimatedSellTax: 266,
      estimatedSellFee: 379,
      netMarketValue: 265355,
      unrealizedPnL: 10500,
      unrealizedPnLPercent: 4.11,
      unrealizedPnLBroker: 9855,
      unrealizedPnLBrokerPercent: 3.86,
      realizedPnL: 0,
      totalDividends: 0,
      totalCapitalReturned: 0,
      totalStockDividendsShares: 0,
      totalReturnPnL: 10500,
      totalReturnPercent: 4.11,
      yieldOnCostPercent: 0,
    };

    it('Ticket 01: OFFICIAL_DIVIDEND_CALENDAR 必須收錄 0056 官方 2026-10-22 除息事件', () => {
      const receivables = calculateReceivableDividends(
        [mockHolding0056],
        [],
        [],
        '2026-10-20' // 除息前
      );
      const rec0056 = receivables.find((r) => r.symbol === '0056');
      expect(rec0056).toBeDefined();
      expect(rec0056?.exDate).toBe('2026-10-22');
      expect(rec0056?.payDate).toBe('2026-11-11');
      expect(rec0056?.cashDividendPerShare).toBe(1.07);
      expect(rec0056?.status).toBe('UPCOMING_EX');
    });

    it('Ticket 02: 發放日已過 (2026-11-14 >= 2026-11-11) 且帳本尚未記錄時，絕不丟棄，必須標記為 DUE_FOR_RECONCILIATION', () => {
      const receivables = calculateReceivableDividends(
        [mockHolding0056],
        [],
        [], // 無任何已確認交易
        '2026-11-14' // 當前時間晚於發放日 2026-11-11
      );
      const rec0056 = receivables.find((r) => r.symbol === '0056');
      expect(rec0056).toBeDefined();
      expect(rec0056?.status).toBe('DUE_FOR_RECONCILIATION');
      expect(rec0056?.sharesHeld).toBe(7000);
      expect(rec0056?.estimatedGrossDividend).toBe(7490);
      expect(rec0056?.estimatedNetDividendInTWD).toBe(7480); // 7490 - 10元匯費
    });

    it('Ticket 02: 若 trades 帳本已手動登記該次除息交易，則維持去重不重複生成', () => {
      const settledTrade: TradeRecord = {
        id: 'trade-0056-settled',
        symbol: '0056',
        name: '元大高股息',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        date: '2026-11-11',
        exDate: '2026-10-22',
        shares: 7000,
        price: 1.07,
        tax: 0,
        fee: 10,
        cashAmount: 7480,
        createdAt: 1,
      };

      const receivables = calculateReceivableDividends(
        [mockHolding0056],
        [],
        [settledTrade],
        '2026-11-14'
      );
      const rec0056 = receivables.find((r) => r.symbol === '0056');
      expect(rec0056).toBeUndefined();
    });
  });

  describe('Ticket #545: 台北當地時區日期基準', () => {
    it('instantSettleReceivableDividend 在 UTC+8 凌晨 00:30 預設入帳日應為台北當地日期', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-10T16:30:00.000Z')); // 台北 2026-03-11 00:30
      try {
        const settled = instantSettleReceivableDividend({
          id: 'rec-test',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-03-01',
          payDate: '2026-03-29',
          sharesHeld: 1000,
          sharesHeldOnExDate: 1000,
          cashDividendPerShare: 4,
          estimatedGrossDividend: 4000,
          estimatedTaxOrFee: 10,
          estimatedNetDividend: 3990,
          estimatedNetDividendInTWD: 3990,
          status: 'PENDING_PAYMENT',
        });
        expect(settled.payDate).toBe('2026-03-11');
      } finally {
        vi.useRealTimers();
      }
    });

    it('estimatePaymentDate 應正確處理閏年二月跨月 (+23 天)', () => {
      expect(estimatePaymentDate('2024-02-28', 'TW', '0056')).toBe('2024-03-22');
    });
  });

  describe('Ticket #546: 跨帳戶與跨市場嚴格隔離', () => {
    it('雙帳戶同代號 (2330) 分別持有 1000 與 2000 股，A 帳戶已入帳不應誤殺 B 帳戶應收，且 B 帳戶僅算 2000 股並標記 accountId', () => {
      const hA: HoldingPosition = { ...mockHoldingTW, accountId: 'acc-a', shares: 1000, totalCostBasis: 600000 };
      const hB: HoldingPosition = { ...mockHoldingTW, accountId: 'acc-b', shares: 2000, totalCostBasis: 1200000 };
      const trades: TradeRecord[] = [
        {
          id: 'buy-a',
          accountId: 'acc-a',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          date: '2026-01-10',
          shares: 1000,
          price: 600,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        {
          id: 'buy-b',
          accountId: 'acc-b',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          date: '2026-01-10',
          shares: 2000,
          price: 600,
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
        {
          id: 'div-a',
          accountId: 'acc-a',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'DIVIDEND',
          date: '2026-09-16',
          exDate: '2026-09-16',
          shares: 1000,
          price: 4.5,
          fee: 10,
          tax: 0,
          cashAmount: 4490,
          createdAt: 3,
        },
      ];
      const ev: RawCorporateEvent = {
        symbol: '2330',
        market: 'TW',
        type: 'DIVIDEND',
        date: '2026-09-16',
        price: 4.5,
        sourceType: 'OFFICIAL_DATA',
      };

      const res = calculateReceivableDividends([hA, hB], [ev], trades, '2026-09-20', 32.0, []);
      expect(res).toHaveLength(1);
      expect(res[0].accountId).toBe('acc-b');
      expect(res[0].sharesHeld).toBe(2000);
      expect(res[0].estimatedGrossDividend).toBe(9000);
    });
  });

  describe('8. Ticket #547: 靜態內建行事曆來源標記淨化', () => {
    it('OFFICIAL_DIVIDEND_CALENDAR 不得偽裝為 LIVE_API', async () => {
      const { OFFICIAL_DIVIDEND_CALENDAR } = await import('./receivableDividendEngine');
      expect(OFFICIAL_DIVIDEND_CALENDAR.length).toBeGreaterThan(0);
      for (const ev of OFFICIAL_DIVIDEND_CALENDAR) {
        expect(ev.sourceType).not.toBe('LIVE_API');
        expect(ev.sourceType).toBe('OFFICIAL_DATA');
      }
    });
  });

  describe('9. Ticket #548: 除息前一日快照（含清倉）與月配息去重視窗', () => {
    it('除息前一日持股 > 0 且於除息日後全數清倉（holdings 為空），仍應保留該筆應收股息', () => {
      const trades: TradeRecord[] = [
        {
          id: 'b-1',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          accountId: 'acc-1',
          type: 'BUY',
          date: '2026-09-01',
          shares: 2000,
          price: 900,
          currency: 'TWD',
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        {
          id: 's-1',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          accountId: 'acc-1',
          type: 'SELL',
          date: '2026-09-18', // 除息日 09-16 之後全數賣出清倉
          shares: 2000,
          price: 920,
          currency: 'TWD',
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
      ];
      const ev = {
        symbol: '2330',
        market: 'TW' as const,
        type: 'DIVIDEND' as const,
        date: '2026-09-16',
        price: 4.5,
        sourceType: 'OFFICIAL_DATA' as const,
      };

      const res = calculateReceivableDividends([], [ev], trades, '2026-09-20', 32.0, []);
      expect(res).toHaveLength(1);
      expect(res[0].sharesHeld).toBe(2000);
      expect(res[0].accountId).toBe('acc-1');
      expect(res[0].estimatedGrossDividend).toBe(9000);
    });

    it('月配息 ETF 上期發放日若與下期除息區間重疊，不得誤殺下期應收股息', () => {
      const holding = {
        symbol: '00929',
        name: '復華台灣科技優息',
        market: 'TW' as const,
        currency: 'TWD' as const,
        accountId: 'acc-1',
        shares: 10000,
        avgCost: 20,
        totalCostBasis: 200000,
        currentPrice: 20,
        marketValue: 200000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        realizedPnL: 0,
        totalDividends: 0,
        yieldOnCostPercent: 0,
      } as any;

      const trades: TradeRecord[] = [
        {
          id: 'b-00929',
          symbol: '00929',
          name: '復華台灣科技優息',
          market: 'TW',
          accountId: 'acc-1',
          type: 'BUY',
          date: '2026-07-01',
          shares: 10000,
          price: 20,
          currency: 'TWD',
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        {
          id: 'd-00929-prev',
          symbol: '00929',
          name: '復華台灣科技優息',
          market: 'TW',
          accountId: 'acc-1',
          type: 'DIVIDEND',
          date: '2026-09-22', // 上期入帳日落在下期 [09-19, 10-12] 區間內
          exDate: '2026-08-20', // 但明確標註為上期 08-20 除息
          shares: 10000,
          price: 0.15,
          currency: 'TWD',
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
      ];

      const evNext = {
        symbol: '00929',
        market: 'TW' as const,
        type: 'DIVIDEND' as const,
        date: '2026-09-19',
        price: 0.15,
        sourceType: 'OFFICIAL_DATA' as const,
      };

      const res = calculateReceivableDividends([holding], [evNext], trades, '2026-09-25', 32.0, []);
      expect(res).toHaveLength(1);
      expect(res[0].exDate).toBe('2026-09-19');
    });

    it('自訂未來股利交易應套用台股 ETF 23 天規則與正確狀態機 (UPCOMING_EX)', () => {
      const trades: TradeRecord[] = [
        {
          id: 't-custom-00878',
          symbol: '00878',
          name: '國泰永續高股息',
          market: 'TW',
          accountId: 'acc-1',
          type: 'DIVIDEND',
          date: '2026-05-18', // 除息日未指定 payDate
          exDate: '2026-05-18',
          shares: 1000,
          price: 0.55,
          currency: 'TWD',
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
      ];

      // 基準日 2026-05-10 早於除息日 2026-05-18，應為 UPCOMING_EX 且 payDate 為 +23 天 (2026-06-10)
      const res = calculateReceivableDividends([], [], trades, '2026-05-10', 32.0, []);
      expect(res).toHaveLength(1);
      expect(res[0].payDate).toBe('2026-06-10');
      expect(res[0].status).toBe('UPCOMING_EX');
    });
  });

  describe('10. Ticket #550: 一鍵入帳狀態機去重與帳戶保留', () => {
    it('對現有預約交易 (virtual_ 或 rec-trade-) 一鍵入帳時，應更新原交易而非重複新增，並保留 accountId', async () => {
      const mod = await import('./receivableDividendEngine');
      const settleFn = (mod as any).settleDividendAction;
      expect(typeof settleFn).toBe('function');

      const pendingTrade: TradeRecord = {
        id: 't-future-1',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        accountId: 'acc-a',
        type: 'DIVIDEND',
        date: '2026-10-08',
        exDate: '2026-09-16',
        shares: 5000,
        price: 4.5,
        currency: 'TWD',
        fee: 0,
        tax: 0,
        createdAt: 1,
      };

      const nextTrades = settleFn({
        dividendId: 'virtual_t-future-1',
        actualPayDate: '2026-10-01',
        receivableDividends: [],
        trades: [pendingTrade],
      });

      expect(nextTrades).toHaveLength(1);
      expect(nextTrades[0].id).toBe('t-future-1');
      expect(nextTrades[0].accountId).toBe('acc-a');
      expect(nextTrades[0].date).toBe('2026-10-01');
      expect(nextTrades[0].payDate).toBe('2026-10-01');
    });
  });

  describe('Spec 0232 / Ticket 01: 近日持倉除息行事曆雷達純運算引擎 (generateUpcomingExDividendRadarEvents)', () => {
    const todayStr = '2026-05-15';

    const createMockHolding = (data: Partial<HoldingPosition> & { symbol: string; shares: number }): HoldingPosition => ({
      name: data.symbol,
      market: 'TW',
      currency: 'TWD',
      avgCost: 100,
      totalCostBasis: 100000,
      adjustedCostBasis: 100000,
      currentPrice: 110,
      marketValue: 110000,
      grossMarketValue: 110000,
      netMarketValue: 110000,
      estimatedSellTax: 300,
      estimatedSellFee: 150,
      unrealizedPnL: 10000,
      unrealizedPnLPercent: 10,
      ...data,
    } as HoldingPosition);

    it('應精確篩選未來 60 天內即將除息事件，包含今日除息 (T=0) 與第 60 天，並排除第 61 天與過去事件', () => {
      const mockHoldings: HoldingPosition[] = [
        createMockHolding({ symbol: '0056', name: '元大高股息', shares: 10000 }),
        createMockHolding({ symbol: '00878', name: '國泰永續高股息', shares: 2000 }),
        createMockHolding({ symbol: '2330', name: '台積電', shares: 1000 }),
        createMockHolding({ symbol: '2454', name: '聯發科', shares: 1000 }),
        createMockHolding({ symbol: '2881', name: '富邦金', shares: 1000 }),
        createMockHolding({ symbol: '2882', name: '國泰金', shares: 0 }),
      ];

      const mockReceivables: ReceivableDividend[] = [
        {
          id: 'rec-0056-today',
          symbol: '0056',
          name: '元大高股息',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-05-15', // 今日除息 (T=0)
          payDate: '2026-06-08',
          sharesHeldOnExDate: 10000,
          sharesHeld: 10000,
          cashDividendPerShare: 1.07,
          estimatedGrossDividend: 10700,
          estimatedTaxOrFee: 0,
          estimatedNetDividend: 10700,
          estimatedNetDividendInTWD: 10700,
          status: 'UPCOMING_EX',
          dateSource: 'OFFICIAL',
        },
        {
          id: 'rec-00878-31d',
          symbol: '00878',
          name: '國泰永續高股息',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-06-15', // 31 天後
          payDate: '2026-07-10',
          sharesHeldOnExDate: 2000,
          sharesHeld: 2000,
          cashDividendPerShare: 0.55,
          estimatedGrossDividend: 1100,
          estimatedTaxOrFee: 0,
          estimatedNetDividend: 1100,
          estimatedNetDividendInTWD: 1100,
          status: 'UPCOMING_EX',
          dateSource: 'OFFICIAL',
        },
        {
          id: 'rec-2330-60d',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-07-14', // 恰好第 60 天 (2026-05-15 + 60 天)
          payDate: '2026-08-13',
          sharesHeldOnExDate: 1000,
          sharesHeld: 1000,
          cashDividendPerShare: 4.0,
          estimatedGrossDividend: 4000,
          estimatedTaxOrFee: 0,
          estimatedNetDividend: 4000,
          estimatedNetDividendInTWD: 4000,
          status: 'UPCOMING_EX',
          dateSource: 'OFFICIAL',
        },
        {
          id: 'rec-2454-61d',
          symbol: '2454',
          name: '聯發科',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-07-15', // 第 61 天 (超過 60 天視窗，應被排除)
          payDate: '2026-08-14',
          sharesHeldOnExDate: 1000,
          sharesHeld: 1000,
          cashDividendPerShare: 20.0,
          estimatedGrossDividend: 20000,
          estimatedTaxOrFee: 422,
          estimatedNetDividend: 19578,
          estimatedNetDividendInTWD: 19578,
          status: 'UPCOMING_EX',
          dateSource: 'OFFICIAL',
        },
        {
          id: 'rec-2881-past',
          symbol: '2881',
          name: '富邦金',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-05-10', // 過去 5 天前，已除息，非即將除息
          payDate: '2026-06-05',
          sharesHeldOnExDate: 1000,
          sharesHeld: 1000,
          cashDividendPerShare: 3.0,
          estimatedGrossDividend: 3000,
          estimatedTaxOrFee: 0,
          estimatedNetDividend: 3000,
          estimatedNetDividendInTWD: 3000,
          status: 'PENDING_PAYMENT',
          dateSource: 'OFFICIAL',
        },
        {
          id: 'rec-2882-zero-share',
          symbol: '2882',
          name: '國泰金',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-05-20', // 雖然在未來 5 天，但持股為 0，應排除
          payDate: '2026-06-18',
          sharesHeldOnExDate: 0,
          sharesHeld: 0,
          cashDividendPerShare: 2.0,
          estimatedGrossDividend: 0,
          estimatedTaxOrFee: 0,
          estimatedNetDividend: 0,
          estimatedNetDividendInTWD: 0,
          status: 'UPCOMING_EX',
          dateSource: 'OFFICIAL',
        },
      ];

      const results = generateUpcomingExDividendRadarEvents({
        holdings: mockHoldings,
        receivableDividends: mockReceivables,
        todayStr,
        horizonDays: 60,
      });

      // 預期僅包含 0056 (T=0), 00878 (T=31), 2330 (T=60)
      expect(results).toHaveLength(3);
      expect(results.map(r => r.symbol)).toEqual(['0056', '00878', '2330']);

      // 檢查 0056 今日除息
      expect(results[0].symbol).toBe('0056');
      expect(results[0].daysUntilEx).toBe(0);
      expect(results[0].daysFromExToPay).toBe(24); // 2026-06-08 - 2026-05-15 = 24 日曆天
      expect(results[0].scheduleType).toBe('CONFIRMED');
      expect(results[0].sharesHeld).toBe(10000);
      expect(results[0].cashPerShare).toBe(1.07);

      // 檢查 00878 31 天後除息
      expect(results[1].symbol).toBe('00878');
      expect(results[1].daysUntilEx).toBe(31);
      expect(results[1].daysFromExToPay).toBe(25); // 2026-07-10 - 2026-06-15 = 25 日曆天

      // 檢查 2330 恰好第 60 天
      expect(results[2].symbol).toBe('2330');
      expect(results[2].daysUntilEx).toBe(60);
      expect(results[2].daysFromExToPay).toBe(30); // 2026-08-13 - 2026-07-14 = 30 日曆天
    });

    it('Spec 0232 / Ticket 02: 應精確檢驗二代健保 19,999 vs 20,000 門檻與美股 30% 稅負折算', () => {
      const mockHoldings: HoldingPosition[] = [
        createMockHolding({ symbol: '2890', name: '永豐金A', shares: 19999 }),
        createMockHolding({ symbol: '2891', name: '中信金B', shares: 20000 }),
        createMockHolding({ symbol: 'AAPL', name: '蘋果', market: 'US', currency: 'USD', shares: 100 }),
      ];

      const mockReceivables: ReceivableDividend[] = [
        {
          id: 'rec-2890-sub20k',
          symbol: '2890',
          name: '永豐金A',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-05-20',
          payDate: '2026-06-15',
          sharesHeldOnExDate: 19999,
          sharesHeld: 19999,
          cashDividendPerShare: 1.0,
          estimatedGrossDividend: 19999,
          estimatedTaxOrFee: 0,
          estimatedNetDividend: 19999,
          estimatedNetDividendInTWD: 19999,
          status: 'UPCOMING_EX',
          dateSource: 'OFFICIAL',
        },
        {
          id: 'rec-2891-hit20k',
          symbol: '2891',
          name: '中信金B',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-05-22',
          payDate: '2026-06-18',
          sharesHeldOnExDate: 20000,
          sharesHeld: 20000,
          cashDividendPerShare: 1.0,
          estimatedGrossDividend: 20000,
          estimatedTaxOrFee: 422,
          estimatedNetDividend: 19578,
          estimatedNetDividendInTWD: 19578,
          status: 'UPCOMING_EX',
          dateSource: 'OFFICIAL',
        },
        {
          id: 'rec-aapl-us',
          symbol: 'AAPL',
          name: '蘋果',
          market: 'US',
          currency: 'USD',
          exDate: '2026-05-25',
          payDate: '2026-06-15',
          sharesHeldOnExDate: 100,
          sharesHeld: 100,
          cashDividendPerShare: 1.5,
          estimatedGrossDividend: 150,
          estimatedTaxOrFee: 45,
          estimatedNetDividend: 105,
          estimatedNetDividendInTWD: 3413,
          status: 'UPCOMING_EX',
          dateSource: 'OFFICIAL',
        },
      ];

      const results = generateUpcomingExDividendRadarEvents({
        holdings: mockHoldings,
        receivableDividends: mockReceivables,
        todayStr,
        usdToTwdRate: 32.5,
      });

      expect(results).toHaveLength(3);

      // 1. 永豐金: 19,999 元 -> 未達 20,000 元門檻
      const item2890 = results.find(r => r.symbol === '2890')!;
      expect(item2890.estimatedGrossTWD).toBe(19999);
      expect(item2890.isNhiTriggered).toBe(false);
      expect(item2890.nhiFeeTWD).toBe(0);
      expect(item2890.estimatedNetTWD).toBe(19999);

      // 2. 中信金: 20,000 元 -> 恰達門檻，觸發 2.11% 二代健保 NT$ 422
      const item2891 = results.find(r => r.symbol === '2891')!;
      expect(item2891.estimatedGrossTWD).toBe(20000);
      expect(item2891.isNhiTriggered).toBe(true);
      expect(item2891.nhiFeeTWD).toBe(422); // round(20000 * 0.0211) = 422
      expect(item2891.estimatedNetTWD).toBe(19578);

      // 3. 美股 AAPL: 100 股 * $1.5 * 32.5 = 4875 TWD，扣除 30% IRS 預扣稅後為 3413 TWD
      const itemAapl = results.find(r => r.symbol === 'AAPL')!;
      expect(itemAapl.market).toBe('US');
      expect(itemAapl.estimatedGrossTWD).toBe(4875);
      expect(itemAapl.isNhiTriggered).toBe(false);
      expect(itemAapl.nhiFeeTWD).toBe(0);
      expect(itemAapl.estimatedNetTWD).toBe(3413); // round(4875 * 0.7) = 3413
    });

    it('Spec 0232 / Ticket 03: 應正確區分 CONFIRMED 與 PROJECTED 標籤並評定填息信心指標', () => {
      const mockHoldings: HoldingPosition[] = [
        createMockHolding({ symbol: '0056', name: '元大高股息', shares: 5000 }),
        createMockHolding({ symbol: '9999', name: '測試個股', shares: 1000 }),
      ];

      const mockReceivables: ReceivableDividend[] = [
        {
          id: 'rec-0056-official',
          symbol: '0056',
          name: '元大高股息',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-06-01',
          payDate: '2026-06-25',
          sharesHeldOnExDate: 5000,
          sharesHeld: 5000,
          cashDividendPerShare: 1.0,
          estimatedGrossDividend: 5000,
          estimatedTaxOrFee: 0,
          estimatedNetDividend: 5000,
          estimatedNetDividendInTWD: 5000,
          status: 'UPCOMING_EX',
          dateSource: 'OFFICIAL',
        },
        {
          id: 'rec-9999-estimated',
          symbol: '9999',
          name: '測試個股',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-06-10',
          payDate: '2026-07-08',
          sharesHeldOnExDate: 1000,
          sharesHeld: 1000,
          cashDividendPerShare: 2.0,
          estimatedGrossDividend: 2000,
          estimatedTaxOrFee: 0,
          estimatedNetDividend: 2000,
          estimatedNetDividendInTWD: 2000,
          status: 'UPCOMING_EX',
          dateSource: 'ESTIMATED',
        },
      ];

      const results = generateUpcomingExDividendRadarEvents({
        holdings: mockHoldings,
        receivableDividends: mockReceivables,
        todayStr,
      });

      const item0056 = results.find(r => r.symbol === '0056')!;
      expect(item0056.scheduleType).toBe('CONFIRMED');
      expect(item0056.recoveryRating).toBe('HIGH_MOMENTUM');
      expect(item0056.rviScore).toBeGreaterThanOrEqual(0.7);

      const item9999 = results.find(r => r.symbol === '9999')!;
      expect(item9999.scheduleType).toBe('PROJECTED');
      expect(item9999.recoveryRating).toBe('MODERATE');
    });

    it('Spec 0232 / Ticket 04: 應實現多券商子帳戶隔離與跨市場 (TW/US) 動態連動閉環', () => {
      const mockHoldings: HoldingPosition[] = [
        createMockHolding({ accountId: 'acc-1', symbol: '2330', name: '台積電', shares: 1500 }),
        createMockHolding({ accountId: 'acc-2', symbol: '2330', name: '台積電', shares: 5500 }),
        createMockHolding({ accountId: 'acc-1', symbol: 'NVDA', name: '輝達', market: 'US', currency: 'USD', shares: 50 }),
      ];

      const mockReceivables: ReceivableDividend[] = [
        {
          id: 'rec-2330-acc1',
          accountId: 'acc-1',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-06-15',
          payDate: '2026-07-10',
          sharesHeldOnExDate: 1500,
          sharesHeld: 1500,
          cashDividendPerShare: 4.0,
          estimatedGrossDividend: 6000,
          estimatedTaxOrFee: 0,
          estimatedNetDividend: 6000,
          estimatedNetDividendInTWD: 6000,
          status: 'UPCOMING_EX',
          dateSource: 'OFFICIAL',
        },
        {
          id: 'rec-2330-acc2',
          accountId: 'acc-2',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-06-15',
          payDate: '2026-07-10',
          sharesHeldOnExDate: 5500,
          sharesHeld: 5500,
          cashDividendPerShare: 4.0,
          estimatedGrossDividend: 22000,
          estimatedTaxOrFee: 464,
          estimatedNetDividend: 21536,
          estimatedNetDividendInTWD: 21536,
          status: 'UPCOMING_EX',
          dateSource: 'OFFICIAL',
        },
        {
          id: 'rec-nvda-acc1',
          accountId: 'acc-1',
          symbol: 'NVDA',
          name: '輝達',
          market: 'US',
          currency: 'USD',
          exDate: '2026-06-18',
          payDate: '2026-07-05',
          sharesHeldOnExDate: 50,
          sharesHeld: 50,
          cashDividendPerShare: 0.1,
          estimatedGrossDividend: 5,
          estimatedTaxOrFee: 1.5,
          estimatedNetDividend: 3.5,
          estimatedNetDividendInTWD: 112,
          status: 'UPCOMING_EX',
          dateSource: 'OFFICIAL',
        },
      ];

      // 1. 篩選單一帳戶 acc-1
      const resAcc1 = generateUpcomingExDividendRadarEvents({
        holdings: mockHoldings,
        receivableDividends: mockReceivables,
        todayStr,
        selectedAccountId: 'acc-1',
        market: 'ALL',
      });
      expect(resAcc1).toHaveLength(2);
      expect(resAcc1.every(r => r.accountId === 'acc-1')).toBe(true);
      const acc1_2330 = resAcc1.find(r => r.symbol === '2330')!;
      expect(acc1_2330.sharesHeld).toBe(1500);
      expect(acc1_2330.estimatedGrossTWD).toBe(6000);
      expect(acc1_2330.isNhiTriggered).toBe(false); // 未達 20,000 元門檻

      // 2. 篩選台股市場 TW
      const resTW = generateUpcomingExDividendRadarEvents({
        holdings: mockHoldings,
        receivableDividends: mockReceivables,
        todayStr,
        selectedAccountId: 'ALL',
        market: 'TW',
      });
      expect(resTW).toHaveLength(2);
      expect(resTW.every(r => r.market === 'TW')).toBe(true);

      // 3. 篩選美股市場 US
      const resUS = generateUpcomingExDividendRadarEvents({
        holdings: mockHoldings,
        receivableDividends: mockReceivables,
        todayStr,
        selectedAccountId: 'ALL',
        market: 'US',
      });
      expect(resUS).toHaveLength(1);
      expect(resUS[0].symbol).toBe('NVDA');
      expect(resUS[0].market).toBe('US');
    });
  });
});




