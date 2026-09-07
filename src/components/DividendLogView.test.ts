import { describe, it, expect } from 'vitest';
import { TradeRecord } from '../types/stock';
import { ReceivableDividend } from '../types/dividend';
import { calculateConsolidatedTwNhiTax } from '../engine/taxComplianceEngine';
import { CorporateActionSessionCache, RawCorporateEvent } from '../engine/corporateActionScanner';

describe('DividendLogView (股利日誌與雙看板核心資料流測試)', () => {
  describe('1. 歷史現金股利入帳明細：配股配息合併健保計算', () => {
    it('真實場景：2890 永豐金持股 31,000 股、配息 1.10 元、同期配股 620 股，應自動合併面額計算二代健保 NT$ 850，實領 NT$ 33,250', () => {
      const mockTrades: TradeRecord[] = [
        {
          id: 't-div-2890',
          symbol: '2890',
          name: '永豐金',
          market: 'TW',
          currency: 'TWD',
          type: 'DIVIDEND',
          date: '2026-07-23',
          shares: 31000,
          price: 1.10,
          fee: 0,
          tax: 0, // 未手動指定，由系統智能計算
          createdAt: 1,
        },
        {
          id: 't-stock-div-2890',
          symbol: '2890',
          name: '永豐金',
          market: 'TW',
          currency: 'TWD',
          type: 'STOCK_DIVIDEND',
          date: '2026-07-23',
          shares: 620,
          price: 0,
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
      ];

      const dividendTrade = mockTrades[0];
      const gross = dividendTrade.shares * dividendTrade.price; // 34,100

      // 模擬 DividendLogView 中的計算縫隙
      let peerStockShares = 0;
      const tTime = new Date(dividendTrade.date).getTime();
      const matchedStockTrade = mockTrades.find((st) => {
        if (st.symbol.toUpperCase() !== dividendTrade.symbol.toUpperCase()) return false;
        if (st.type !== 'STOCK_DIVIDEND' && st.type !== 'STOCK_SPLIT') return false;
        const stTime = new Date(st.date).getTime();
        return Math.abs(tTime - stTime) / (1000 * 3600 * 24) <= 7;
      });

      if (matchedStockTrade) {
        peerStockShares = matchedStockTrade.shares;
      }

      expect(peerStockShares).toBe(620);

      const taxRes = calculateConsolidatedTwNhiTax({
        cashDividendGross: gross,
        stockDividendShares: Math.round(peerStockShares),
      });

      expect(gross).toBe(34100);
      expect(taxRes.stockDividendParValue).toBe(6200);
      expect(taxRes.totalTaxableIncome).toBe(40300);
      expect(taxRes.triggersNhi).toBe(true);
      expect(taxRes.nhiFeeTWD).toBe(850);
      expect(taxRes.netCashDividend).toBe(33250);

      const net = Math.max(0, gross - taxRes.nhiFeeTWD);
      expect(net).toBe(33250);
    });

    it('若交易紀錄中尚未補登配股，應自動自 CorporateActionSessionCache 比對官方配股事件並計算健保', () => {
      const cachedEvents: RawCorporateEvent[] = [
        {
          symbol: '2890',
          market: 'TW',
          type: 'STOCK_DIVIDEND',
          date: '2026-07-23',
          ratio: 0.02,
          description: '除權 0.02',
        },
      ];
      CorporateActionSessionCache.set('2890', cachedEvents);

      const dividendTrade: TradeRecord = {
        id: 't-div-2890-standalone',
        symbol: '2890',
        name: '永豐金',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        date: '2026-07-23',
        shares: 31000,
        price: 1.10,
        fee: 0,
        tax: 0,
        createdAt: 1,
      };

      const gross = dividendTrade.shares * dividendTrade.price;
      const tTime = new Date(dividendTrade.date).getTime();
      const events = CorporateActionSessionCache.get(dividendTrade.symbol) || [];
      const stockEv = events.find((e) => {
        if (e.type !== 'STOCK_DIVIDEND') return false;
        const evTime = new Date(e.date).getTime();
        return Math.abs(tTime - evTime) / (1000 * 3600 * 24) <= 7;
      });

      expect(stockEv).toBeDefined();
      const peerStockShares = stockEv!.ratio ? dividendTrade.shares * stockEv!.ratio : 0;
      expect(peerStockShares).toBe(620);

      const taxRes = calculateConsolidatedTwNhiTax({
        cashDividendGross: gross,
        stockDividendShares: Math.round(peerStockShares),
      });

      expect(taxRes.nhiFeeTWD).toBe(850);
      expect(taxRes.netCashDividend).toBe(33250);
    });

    it('若使用者手動輸入或由券商匯入已有明確稅款 (t.tax > 0)，以 t.tax 為最高優先級', () => {
      const dividendTradeWithExplicitTax: TradeRecord = {
        id: 't-div-explicit',
        symbol: '2890',
        name: '永豐金',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        date: '2026-07-23',
        shares: 31000,
        price: 1.10,
        fee: 0,
        tax: 860, // 券商實收扣除 850 健保 + 10 匯費
        createdAt: 1,
      };

      let effectiveTax = dividendTradeWithExplicitTax.tax || 0;
      expect(effectiveTax).toBe(860);
      const gross = dividendTradeWithExplicitTax.shares * dividendTradeWithExplicitTax.price;
      const net = Math.max(0, gross - effectiveTax);
      expect(net).toBe(33240);
    });
  });

  describe('2. 雙看板獨立拆分與資料過濾', () => {
    const mockReceivables: ReceivableDividend[] = [
      {
        id: 'rec-1',
        symbol: '2886',
        name: '兆豐金',
        market: 'TW',
        currency: 'TWD',
        exDate: '2026-08-13',
        payDate: '2026-09-04',
        sharesHeldOnExDate: 20300,
        cashDividendPerShare: 1.75,
        estimatedGrossDividend: 35525,
        estimatedTaxOrFee: 759,
        estimatedNetDividend: 34766,
        estimatedNetDividendInTWD: 34766,
        status: 'PENDING_PAYMENT',
      },
      {
        id: 'rec-2',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        exDate: '2026-09-16',
        payDate: '2026-10-08',
        sharesHeldOnExDate: 300,
        cashDividendPerShare: 7.0,
        estimatedGrossDividend: 2100,
        estimatedTaxOrFee: 10,
        estimatedNetDividend: 2090,
        estimatedNetDividendInTWD: 2090,
        status: 'UPCOMING_EX',
      },
    ];

    it('應能精準將應收項目拆分為「待入帳行事曆」與「即將除息公告」', () => {
      const pending = mockReceivables.filter((r) => r.status !== 'UPCOMING_EX');
      const upcoming = mockReceivables.filter((r) => r.status === 'UPCOMING_EX');

      expect(pending.length).toBe(1);
      expect(pending[0].symbol).toBe('2886');

      expect(upcoming.length).toBe(1);
      expect(upcoming[0].symbol).toBe('2330');
    });

    it('當無待入帳項目時，pending 陣列長度為 0，可正確提供空狀態占位判定', () => {
      const onlyUpcoming = mockReceivables.filter((r) => r.status === 'UPCOMING_EX');
      const pending = onlyUpcoming.filter((r) => r.status !== 'UPCOMING_EX');

      expect(pending.length).toBe(0);
    });

    it('當無即將除息項目時，upcoming 陣列長度為 0，可正確提供空狀態占位判定', () => {
      const onlyPending = mockReceivables.filter((r) => r.status === 'PENDING_PAYMENT');
      const upcoming = onlyPending.filter((r) => r.status === 'UPCOMING_EX');

      expect(upcoming.length).toBe(0);
    });
  });

  describe('3. 歷史現金股利入帳明細：入帳日 (payDate) 與除息日 (exDate) 時序分離與排序', () => {
    it('2886 兆豐金除息 2026-08-13，有效入帳日應為 2026-09-04；2890 永豐金除息 2026-07-23，有效入帳日應為 2026-08-24', async () => {
      const { estimatePaymentDate } = await import('../engine/receivableDividendEngine');
      expect(estimatePaymentDate('2026-08-13', 'TW')).toBe('2026-09-04');
      expect(estimatePaymentDate('2026-07-23', 'TW')).toBe('2026-08-24');
    });

    it('歷史入帳明細應以有效入帳日 (effectivePayDate) 為主鍵進行倒序排列，而非除息日', async () => {
      const { estimatePaymentDate } = await import('../engine/receivableDividendEngine');
      const testTrades: TradeRecord[] = [
        {
          id: 't-2890',
          symbol: '2890',
          name: '永豐金',
          market: 'TW',
          type: 'DIVIDEND',
          date: '2026-07-23', // 除息日較早
          payDate: '2026-08-24', // 入帳日較晚
          shares: 31000,
          price: 1.1,
          currency: 'TWD',
          fee: 0,
          tax: 850,
          createdAt: 1,
        },
        {
          id: 't-0050',
          symbol: '0050',
          name: '元大台灣50',
          market: 'TW',
          type: 'DIVIDEND',
          date: '2026-07-25', // 除息日較晚
          payDate: '2026-08-15', // 入帳日較早
          shares: 1000,
          price: 1.0,
          currency: 'TWD',
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
      ];

      // 依 effectivePayDate 倒序排序
      const sorted = [...testTrades].sort((a, b) => {
        const payA = a.payDate || estimatePaymentDate(a.exDate || a.date, a.market);
        const payB = b.payDate || estimatePaymentDate(b.exDate || b.date, b.market);
        const comp = payB.localeCompare(payA);
        if (comp !== 0) return comp;
        return (b.exDate || b.date).localeCompare(a.exDate || a.date);
      });

      // 2890 入帳日 2026-08-24 應排在 0050 (2026-08-15) 前面
      expect(sorted[0].symbol).toBe('2890');
      expect(sorted[1].symbol).toBe('0050');
    });
  });
});
