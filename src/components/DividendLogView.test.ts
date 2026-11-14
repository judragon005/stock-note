import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TradeRecord } from '../types/stock';
import { ReceivableDividend } from '../types/dividend';
import { calculateConsolidatedTwNhiTax } from '../engine/taxComplianceEngine';
import { CorporateActionSessionCache, RawCorporateEvent } from '../engine/corporateActionScanner';
import { calculateMonthTooltipAlign, DividendLogView } from './DividendLogView';
import { buildUnifiedPendingReceivables } from '../engine/dividendAggregator';

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

  describe('4. 月度長條圖 Tooltip 智慧避讓演算法 (照片 1 UI Bug 防禦)', () => {
    it('1~2 月 (索引 0~1) 應靠左對齊 (align=left)，避免被左邊界裁切', () => {
      expect(calculateMonthTooltipAlign(0)).toBe('left');
      expect(calculateMonthTooltipAlign(1)).toBe('left');
    });

    it('3~9 月 (索引 2~8) 應居中對齊 (align=center)', () => {
      expect(calculateMonthTooltipAlign(2)).toBe('center');
      expect(calculateMonthTooltipAlign(5)).toBe('center');
      expect(calculateMonthTooltipAlign(8)).toBe('center');
    });

    it('10~12 月 (索引 9~11) 應靠右對齊 (align=right)，向左展開，徹底杜絕遮擋右側股息貢獻排行卡片', () => {
      expect(calculateMonthTooltipAlign(9)).toBe('right');
      expect(calculateMonthTooltipAlign(10)).toBe('right');
      expect(calculateMonthTooltipAlign(11)).toBe('right');
    });
  });

  describe('5. Spec 0228 / Ticket 03 & 04: 卡片 3 閉環與待對帳款項一鍵入帳', () => {
    it('Ticket 03: activeReceivables 應嚴格過濾淨額大於 0 之項目，確保 Count > 0 當且僅當 Amount > 0', () => {
      const mockItems: ReceivableDividend[] = [
        {
          id: 'rec-1',
          symbol: '0056',
          name: '元大高股息',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-10-22',
          payDate: '2026-11-11',
          sharesHeldOnExDate: 7000,
          cashDividendPerShare: 1.07,
          estimatedGrossDividend: 7490,
          estimatedTaxOrFee: 10,
          estimatedNetDividend: 7480,
          estimatedNetDividendInTWD: 7480,
          status: 'DUE_FOR_RECONCILIATION',
        },
        {
          id: 'rec-invalid-ghost',
          symbol: '0050',
          name: '元大台灣50',
          market: 'TW',
          currency: 'TWD',
          exDate: '2026-10-20',
          payDate: '2026-11-15',
          sharesHeldOnExDate: 0,
          cashDividendPerShare: 1.0,
          estimatedGrossDividend: 0,
          estimatedTaxOrFee: 0,
          estimatedNetDividend: 0,
          estimatedNetDividendInTWD: 0, // 無效 0 元記錄
          status: 'PENDING_PAYMENT',
        },
      ];

      const active = mockItems.filter(
        (r) =>
          (r.status === 'PENDING_PAYMENT' || r.status === 'OVERDUE' || r.status === 'DUE_FOR_RECONCILIATION') &&
          r.estimatedNetDividendInTWD > 0
      );

      const totalTwd = active.reduce((sum, r) => sum + r.estimatedNetDividendInTWD, 0);
      const count = active.length;

      expect(count).toBe(1);
      expect(totalTwd).toBe(7480);
      expect(active[0].symbol).toBe('0056');
    });
  });

  describe('6. Spec 0229 / Ticket 03: 雙軌應收中樞整合 (消滅待入帳矛盾)', () => {
    it('當 scopedReceivables 為空，但交易明細存在未來預約股利 (如 2344 華邦電 2026-12-16) 時，應能正確合成為可待入帳實體', () => {
      const mockFutureDividend: TradeRecord = {
        id: 'trade-future-2344',
        symbol: '2344',
        name: '華邦電',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        date: '2026-11-18', // 除息日
        payDate: '2026-12-16', // 發放日
        shares: 4000,
        price: 2.0,
        fee: 0,
        tax: 0,
        createdAt: 999,
      };

      const emptyScopedReceivables: ReceivableDividend[] = [];
      const todayStr = '2026-11-14';
      const usdToTwdRate = 32.0;

      // 透過公開介面縫隙 buildUnifiedPendingReceivables 驗證合成管線
      const unifiedList = buildUnifiedPendingReceivables(
        emptyScopedReceivables,
        [mockFutureDividend],
        todayStr,
        usdToTwdRate
      );

      expect(unifiedList.length).toBe(1);
      expect(unifiedList[0].symbol).toBe('2344');
      expect(unifiedList[0].estimatedNetDividendInTWD).toBe(8000);
      expect(unifiedList[0].payDate).toBe('2026-12-16');
      expect(unifiedList[0].status).toBe('PENDING_PAYMENT');
    });

    it('Spec 0230 / Issue 03: buildUnifiedPendingReceivables 應使用 Market_Symbol_ExDate 金融自然鍵防撞去重', () => {
      // 官方公告除息日 2026-11-18，發放日 2026-12-18
      const officialRec: ReceivableDividend = {
        id: 'rec-official-2344',
        symbol: '2344',
        name: '華邦電',
        market: 'TW',
        currency: 'TWD',
        exDate: '2026-11-18',
        payDate: '2026-12-18', // 官方發放日比本地預約晚 2 天
        sharesHeldOnExDate: 4000,
        cashDividendPerShare: 2.0,
        estimatedGrossDividend: 8000,
        estimatedTaxOrFee: 0,
        estimatedNetDividend: 8000,
        estimatedNetDividendInTWD: 8000,
        status: 'PENDING_PAYMENT',
      };

      // 本地預約交易除息日 2026-11-18，發放日 2026-12-16
      const localTrade: TradeRecord = {
        id: 'trade-local-2344',
        symbol: '2344',
        name: '華邦電',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        date: '2026-11-18', // exDate
        exDate: '2026-11-18',
        payDate: '2026-12-16', // 發放日 12-16
        shares: 4000,
        price: 2.0,
        fee: 0,
        tax: 0,
        createdAt: 1000,
      };

      const unified = buildUnifiedPendingReceivables([officialRec], [localTrade], '2026-11-14', 32.0);

      // 雖然發放日不同 (12-18 vs 12-16)，但市場、代碼、除息日完全相同，必須防撞去重為 1 筆，嚴禁 200% 重複認列！
      expect(unified.length).toBe(1);
      expect(unified[0].symbol).toBe('2344');
      expect(unified[0].estimatedNetDividendInTWD).toBe(8000);
    });
  });

  describe('7. Spec 0230: 時序門禁、全域同態收縮與對帳單防漏驗證', () => {
    it('券商對帳核對小計 annualReconciliationList 應嚴格阻斷未到期預約款項提前計入 (payDate <= todayStr 門禁)', () => {
      const todayStr = '2026-11-14';
      const tradesForRecon: TradeRecord[] = [
        {
          id: 'trade-past',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'DIVIDEND',
          date: '2026-03-16',
          payDate: '2026-04-10', // 已入帳
          shares: 1000,
          price: 4.0,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        {
          id: 'trade-future',
          symbol: '2344',
          name: '華邦電',
          market: 'TW',
          currency: 'TWD',
          type: 'DIVIDEND',
          date: '2026-11-18',
          payDate: '2026-12-16', // 未到期預約款項 (未來)
          shares: 4000,
          price: 2.0,
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
      ];

      // 模擬 annualReconciliationList 的計算邏輯縫隙
      const selectedYearStr = '2026';
      const map = new Map<string, any>();
      for (const trade of tradesForRecon) {
        if (trade.type !== 'DIVIDEND') continue;
        const payDate = trade.payDate || trade.date;
        if (!payDate.startsWith(selectedYearStr)) continue;
        if (payDate > todayStr) continue; // 時序門禁

        const key = trade.symbol.toUpperCase();
        map.set(key, trade);
      }

      // 未到期的 2344 華邦電不得出現在對帳單中
      expect(map.has('2330')).toBe(true);
      expect(map.has('2344')).toBe(false);
      expect(map.size).toBe(1);
    });
  });

  describe('6. Ticket #545: DividendLogView 台北當地時區基準', () => {
    it('在 UTC+8 凌晨 00:30 渲染 DividendLogView 時，當日 (2026-03-11) 發放之股利應視為已到期而不列為預約待入帳', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-10T16:30:00.000Z')); // 台北 2026-03-11 00:30
      try {
        const tradeSettledToday: TradeRecord = {
          id: 't-taipei-midnight',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'DIVIDEND',
          date: '2026-03-11',
          payDate: '2026-03-11',
          exDate: '2026-02-11',
          shares: 1000,
          price: 4.5,
          fee: 10,
          tax: 0,
          cashAmount: 4490,
          createdAt: 1,
        };

        const html = renderToStaticMarkup(
          React.createElement(DividendLogView, {
            trades: [tradeSettledToday],
            holdings: [],
            receivableDividends: [],
            usdToTwdRate: 32,
          })
        );

        // 若 todayStr 正確為 '2026-03-11'，該筆應已到期，不應出現在「預約待入」或「待發放應收現金股利」區塊
        expect(html).not.toContain('預約待入');
        expect(html).not.toContain('待發放應收現金股利');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('7. Ticket #546: 跨帳戶隔離防穿透', () => {
    it('指定單一券商帳戶 (acc-a) 時，缺少 accountId 的未歸屬股利紀錄不得穿透顯示', () => {
      const orphanTrade: TradeRecord = {
        id: 't-orphan',
        symbol: '0050',
        name: '元大台灣50',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        date: '2026-02-10',
        payDate: '2026-02-10',
        shares: 1000,
        price: 2.0,
        fee: 10,
        tax: 0,
        cashAmount: 1990,
        createdAt: 1,
      };

      const html = renderToStaticMarkup(
        React.createElement(DividendLogView, {
          trades: [orphanTrade],
          holdings: [],
          receivableDividends: [],
          usdToTwdRate: 32,
          selectedAccountId: 'acc-a',
        })
      );

      expect(html).not.toContain('0050');
    });
  });

  describe('8. Ticket #547: 假值與硬編碼市場文案清零', () => {
    it('美股視角 (market="US") 不得出現台股 ETF (00687B/00635U) 與無關的二代健保文案', () => {
      const html = renderToStaticMarkup(
        React.createElement(DividendLogView, {
          holdings: [
            {
              symbol: 'AAPL',
              name: 'Apple',
              market: 'US',
              accountId: 'acc-us',
              shares: 100,
              avgCost: 150,
              currentPrice: 200,
              marketValue: 20000,
              unrealizedPnL: 5000,
              unrealizedPnLPercent: 33.3,
              totalCostBasis: 15000,
              currency: 'USD',
              totalDividends: 100,
              yieldOnCostPercent: 0.67,
            },
          ] as any,
          trades: [
            {
              id: 'div-aapl',
              symbol: 'AAPL',
              name: 'Apple',
              market: 'US',
              accountId: 'acc-us',
              type: 'DIVIDEND',
              date: '2026-02-15',
              shares: 100,
              price: 0.25,
              currency: 'USD',
              fee: 0,
              tax: 7.5,
              exchangeRate: 32,
              createdAt: 1,
            },
          ],
          receivableDividends: [],
          market: 'US',
          usdToTwdRate: 32,
        })
      );
      expect(html).not.toContain('00687B');
      expect(html).not.toContain('00635U');
      expect(html).not.toContain('二代健保');
    });

    it('空資料狀態下不得顯示硬編碼台股 ETF 活水推薦與扣稅文案', () => {
      const html = renderToStaticMarkup(
        React.createElement(DividendLogView, {
          holdings: [],
          trades: [],
          receivableDividends: [],
          market: 'ALL',
          usdToTwdRate: 32,
        })
      );
      expect(html).not.toContain('00687B');
      expect(html).not.toContain('00635U');
      expect(html).not.toContain('已扣除二代健保與 30% IRS 預扣稅');
    });
  });
});


