import { describe, it, expect, beforeEach } from 'vitest';
import { scanCorporateActions, normalizeTWSEDate, CorporateActionSessionCache } from './corporateActionScanner';
import { TradeRecord } from '../types/stock';

describe('公司行動智慧掃描引擎 (Corporate Action Scanner)', () => {
  beforeEach(() => {
    CorporateActionSessionCache.clear();
  });

  it('應能分析持股期間，正確偵測並計算歷史除息與分割事件', async () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2024-01-01',
        symbol: 'NVDA',
        name: 'NVIDIA',
        market: 'US',
        currency: 'USD',
        type: 'BUY',
        shares: 10,
        price: 500,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2024-01-05',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 600,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    // 自訂 mock 資料源模擬金融 API 回傳
    const mockFetcher = async (symbol: string) => {
      if (symbol === 'NVDA') {
        return [
          {
            symbol: 'NVDA',
            market: 'US' as const,
            type: 'STOCK_SPLIT' as const,
            date: '2024-06-10',
            ratio: 10,
            price: 0,
            description: '1 拆 10 股票分割',
          },
        ];
      }
      if (symbol === '2330') {
        return [
          {
            symbol: '2330',
            market: 'TW' as const,
            type: 'DIVIDEND' as const,
            date: '2024-06-13',
            price: 3.5,
            description: '2023Q4 現金股利每股 3.5 元',
          },
        ];
      }
      return [];
    };

    const results = await scanCorporateActions(trades, mockFetcher);

    expect(results).toHaveLength(2);

    // NVDA 分割事件
    const nvdaSplit = results.find((r) => r.symbol === 'NVDA');
    expect(nvdaSplit).toBeDefined();
    expect(nvdaSplit?.sharesHeldOnDate).toBe(10);
    expect(nvdaSplit?.ratio).toBe(10);
    expect(nvdaSplit?.isAlreadyRecorded).toBe(false);

    // 2330 除息事件
    const tsmcDiv = results.find((r) => r.symbol === '2330');
    expect(tsmcDiv).toBeDefined();
    expect(tsmcDiv?.sharesHeldOnDate).toBe(1000);
    expect(tsmcDiv?.estimatedCashAmount).toBe(3500); // 1000 * 3.5 = 3500
    expect(tsmcDiv?.isAlreadyRecorded).toBe(false);
  });

  it('已記錄於交易歷史中的事件應被標記為 isAlreadyRecorded = true', async () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2024-01-05',
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 600,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
      {
        id: '2',
        date: '2024-06-13',
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        type: 'DIVIDEND',
        shares: 1000,
        price: 3.5,
        cashAmount: 3500,
        fee: 0,
        tax: 0,
        createdAt: 2,
      },
    ];

    const mockFetcher = async () => [
      {
        symbol: '2330',
        market: 'TW' as const,
        type: 'DIVIDEND' as const,
        date: '2024-06-13',
        price: 3.5,
        description: '2023Q4 現金股利',
      },
    ];

    const results = await scanCorporateActions(trades, mockFetcher);

    expect(results).toHaveLength(1);
    expect(results[0].isAlreadyRecorded).toBe(true);
  });

  it('永豐金除權息實務：智慧掃描同時偵測到配息 1.1 與配股 0.2 時，應合併計算二代健保 850 元並自動自現金股利代扣', async () => {
    const trades: TradeRecord[] = [
      {
        id: 'trade-yf-1',
        date: '2026-01-10',
        symbol: '2890',
        name: '永豐金',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 31000,
        price: 20,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
    ];

    const mockFetcher = async (symbol: string) => {
      if (symbol === '2890') {
        return [
          {
            symbol: '2890',
            market: 'TW' as const,
            type: 'DIVIDEND' as const,
            date: '2026-07-15',
            payDate: '2026-08-20',
            price: 1.1,
            description: '現金股利 1.1 元',
          },
          {
            symbol: '2890',
            market: 'TW' as const,
            type: 'STOCK_DIVIDEND' as const,
            date: '2026-07-15',
            payDate: '2026-09-05',
            ratio: 0.02, // 每千股配 20 股 (0.2 元)
            price: 0,
            description: '股票股利 0.2 元 (配股率 0.02)',
          },
        ];
      }
      return [];
    };

    const actions = await scanCorporateActions(trades, mockFetcher);

    expect(actions).toHaveLength(2);

    const cashAction = actions.find((a) => a.type === 'DIVIDEND');
    const stockAction = actions.find((a) => a.type === 'STOCK_DIVIDEND');

    expect(cashAction).toBeDefined();
    expect(stockAction).toBeDefined();

    // 股票股利：獲配 620 股 (31,000 * 0.02)
    expect(stockAction!.estimatedSharesChange).toBe(620);
    expect(stockAction!.payDate).toBe('2026-09-05');

    // 現金股利：毛額 34,100 - 合併健保 850 = 33,250
    expect(cashAction!.estimatedCashAmount).toBe(33250);
    expect(cashAction!.payDate).toBe('2026-08-20');
  });

  it('基準日前未持有該股票 (持股為 0) 時應自動過濾或排除', async () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2024-12-01', // 2024-12 才首次買進
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 1000,
        price: 1000,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
    ];

    const mockFetcher = async () => [
      {
        symbol: '2330',
        market: 'TW' as const,
        type: 'DIVIDEND' as const,
        date: '2024-03-18', // 買進之前的除息日
        price: 3.5,
        description: '2023Q3 現金股利',
      },
    ];

    const results = await scanCorporateActions(trades, mockFetcher);
    // 基準日持股為 0，不應列入待補登清單
    expect(results).toHaveLength(0);
  });

  it('TWSE 日期格式標準化函式 normalizeTWSEDate 應正確轉換民國年與西元年', () => {
    expect(normalizeTWSEDate('1140915')).toBe('2025-09-15');
    expect(normalizeTWSEDate('1130613')).toBe('2024-06-13');
    expect(normalizeTWSEDate('20250915')).toBe('2025-09-15');
    expect(normalizeTWSEDate('2025-09-15')).toBe('2025-09-15');
  });

  it('真實場景：9927 泰銘 2025 現金減資線上資料解析與待補登試算', async () => {
    const trades: TradeRecord[] = [
      {
        id: '1',
        date: '2025-09-12',
        symbol: '9927',
        name: '泰銘',
        market: 'TW',
        currency: 'TWD',
        type: 'BUY',
        shares: 10000,
        price: 55.8,
        fee: 0,
        tax: 0,
        createdAt: 1,
      },
    ];

    const mockFetcher = async (symbol: string) => {
      if (symbol === '9927') {
        return [
          {
            symbol: '9927',
            market: 'TW' as const,
            type: 'CAPITAL_REDUCTION' as const,
            date: '2025-09-15',
            price: 2.828,
            ratio: 0.2828,
            description: '現金減資（減資比率 28.28%，每股退款 2.828 元）',
            sourceType: 'LIVE_API' as const,
          },
        ];
      }
      return [];
    };

    const results = await scanCorporateActions(trades, mockFetcher);
    expect(results).toHaveLength(1);

    const tmReduction = results[0];
    expect(tmReduction.symbol).toBe('9927');
    expect(tmReduction.type).toBe('CAPITAL_REDUCTION');
    expect(tmReduction.sharesHeldOnDate).toBe(10000);
    // 預估縮減股數 = 10,000 * 0.2828 = 2,828 股
    expect(tmReduction.estimatedSharesChange).toBeCloseTo(2828, 0);
    // 預估退款金額 = 10,000 * 2.828 = 28,280 元
    expect(tmReduction.estimatedCashAmount).toBe(28280);
    expect(tmReduction.isAlreadyRecorded).toBe(false);
    expect(tmReduction.sourceType).toBe('LIVE_API');
  });

  describe('進度回呼、受控並行、中斷信號與 Session 快取', () => {
    const multiTrades: TradeRecord[] = [
      { id: '1', date: '2024-01-01', symbol: '2330', name: '台積電', market: 'TW', currency: 'TWD', type: 'BUY', shares: 1000, price: 600, fee: 0, tax: 0, createdAt: 1 },
      { id: '2', date: '2024-01-01', symbol: '2317', name: '鴻海', market: 'TW', currency: 'TWD', type: 'BUY', shares: 2000, price: 100, fee: 0, tax: 0, createdAt: 2 },
      { id: '3', date: '2024-01-01', symbol: '2454', name: '聯發科', market: 'TW', currency: 'TWD', type: 'BUY', shares: 500, price: 900, fee: 0, tax: 0, createdAt: 3 },
      { id: '4', date: '2024-01-01', symbol: 'AAPL', name: '蘋果', market: 'US', currency: 'USD', type: 'BUY', shares: 10, price: 180, fee: 0, tax: 0, createdAt: 4 },
      { id: '5', date: '2024-01-01', symbol: 'MSFT', name: '微軟', market: 'US', currency: 'USD', type: 'BUY', shares: 5, price: 400, fee: 0, tax: 0, createdAt: 5 },
    ];

    it('應能透過 onProgress 逐步回報即時進度與當前個股', async () => {
      const progressList: any[] = [];
      const mockFetcher = async (symbol: string) => {
        if (symbol === '2330') {
          return [{ symbol: '2330', market: 'TW' as const, type: 'DIVIDEND' as const, date: '2024-06-13', price: 3.5 }];
        }
        return [];
      };

      const results = await scanCorporateActions(multiTrades, mockFetcher, {
        concurrency: 2,
        onProgress: (p) => {
          progressList.push({ ...p });
        },
      });

      expect(results).toHaveLength(1);
      expect(progressList.length).toBeGreaterThanOrEqual(5);
      // 最後一筆進度狀態
      const lastProgress = progressList[progressList.length - 1];
      expect(lastProgress.current).toBe(5);
      expect(lastProgress.total).toBe(5);
      expect(lastProgress.status).toBe('completed');
    });

    it('應支援 AbortSignal 中斷掃描，並安全回傳已完成之事件', async () => {
      const controller = new AbortController();
      let fetchedCount = 0;

      const mockFetcher = async (symbol: string) => {
        fetchedCount++;
        if (fetchedCount === 2) {
          // 在處理第二檔時中止
          controller.abort();
        }
        return [{ symbol, market: 'TW' as const, type: 'DIVIDEND' as const, date: '2024-06-13', price: 1 }];
      };

      const results = await scanCorporateActions(multiTrades, mockFetcher, {
        concurrency: 1,
        signal: controller.signal,
      });

      // 應在中斷前已完成的筆數內，且不會拋出 unhandled 錯誤
      expect(results.length).toBeLessThan(5);
    });

    it('應支援 symbolsToScan 參數，精準針對指定個股進行斷點接續掃描', async () => {
      const calledSymbols: string[] = [];
      const mockFetcher = async (symbol: string) => {
        calledSymbols.push(symbol);
        return [{ symbol, market: 'TW' as const, type: 'DIVIDEND' as const, date: '2024-06-13', price: 2 }];
      };

      // 僅接續掃描 AAPL 與 MSFT
      const results = await scanCorporateActions(multiTrades, mockFetcher, {
        symbolsToScan: ['AAPL', 'MSFT'],
      });

      expect(calledSymbols).toEqual(['AAPL', 'MSFT']);
      expect(results).toHaveLength(2);
    });

    it('應支援 Session 快取機制，命中快取時不重複呼叫 fetcher，且 forceRefresh 能強制重撈', async () => {
      let fetchCount = 0;
      const mockFetcher = async (symbol: string) => {
        fetchCount++;
        return [{ symbol, market: 'TW' as const, type: 'DIVIDEND' as const, date: '2024-06-13', price: 3 }];
      };

      // 第一次掃描：呼叫 fetcher 5 次
      await scanCorporateActions(multiTrades, mockFetcher, { forceRefresh: true });
      expect(fetchCount).toBe(5);

      // 第二次掃描（未帶 forceRefresh）：命中快取，fetchCount 應保持 5
      await scanCorporateActions(multiTrades, mockFetcher, { forceRefresh: false });
      expect(fetchCount).toBe(5);

      // 第三次掃描（forceRefresh: true）：強制重掃，fetchCount 增加 5 變為 10
      await scanCorporateActions(multiTrades, mockFetcher, { forceRefresh: true });
      expect(fetchCount).toBe(10);
    });
  });

  describe('V1.7 虛擬時序動態配股與高精準公司行動 (V1.7 Accuracy & Timeline Tests)', () => {
    it('應能透過虛擬時序 (Virtual Holdings Timeline) 動態累加歷年配股股數 (如 2890 連續除權)', async () => {
      const trades: TradeRecord[] = [
        {
          id: '1',
          date: '2023-01-01',
          symbol: '2890',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 10000,
          price: 15,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        {
          id: '2',
          date: '2024-01-01',
          symbol: '2890',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 800,
          price: 18,
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
      ];

      const mockFetcher = async () => [
        {
          symbol: '2890',
          market: 'TW' as const,
          type: 'STOCK_DIVIDEND' as const,
          date: '2023-08-09',
          ratio: 0.02, // 2023 配 2%
        },
        {
          symbol: '2890',
          market: 'TW' as const,
          type: 'STOCK_DIVIDEND' as const,
          date: '2024-08-22',
          ratio: 0.025, // 2024 配 2.5%
        },
      ];

      const results = await scanCorporateActions(trades, mockFetcher);

      expect(results).toHaveLength(2);
      // 2023 年：10,000 * 2% = 200 股
      expect(results[0].sharesHeldOnDate).toBe(10000);
      expect(results[0].estimatedSharesChange).toBe(200);

      // 2024 年：基準股數應為 10,000 + 200(2023配) + 800(買進) = 11,000 股！
      expect(results[1].sharesHeldOnDate).toBe(11000);
      expect(results[1].estimatedSharesChange).toBe(275); // 11,000 * 2.5% = 275 股
    });

    it('台股現金減資縮減股數應依集保規定採向下取整 (Math.floor) 精確計算 (如 9927 減資 2,829 股)', async () => {
      const trades: TradeRecord[] = [
        {
          id: '1',
          date: '2025-01-01',
          symbol: '9927',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 10000,
          price: 58.7,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
      ];

      const mockFetcher = async () => [
        {
          symbol: '9927',
          market: 'TW' as const,
          type: 'CAPITAL_REDUCTION' as const,
          date: '2025-11-13',
          ratio: 0.2828051, // 換發比例 71.71949%，縮減比率 28.28051%
          price: 2.828,
        },
      ];

      const results = await scanCorporateActions(trades, mockFetcher);

      expect(results).toHaveLength(1);
      // 10,000 股減資換發新股 = floor(10000 * 0.7171949) = 7,171 股，縮減股數應精確為 2,829 股！
      expect(results[0].estimatedSharesChange).toBe(2829);
    });

    it('除權息計算應以基準日前一日 (T-1) 收盤在倉為基準，當日買進不享配股配息', async () => {
      const trades: TradeRecord[] = [
        {
          id: '1',
          date: '2024-06-12', // 除權日前一日買進
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 1000,
          price: 600,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        {
          id: '2',
          date: '2024-06-13', // 除權日當天買進
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 500,
          price: 610,
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
      ];

      const mockFetcher = async () => [
        {
          symbol: '2330',
          market: 'TW' as const,
          type: 'DIVIDEND' as const,
          date: '2024-06-13',
          price: 3.5,
        },
      ];

      const results = await scanCorporateActions(trades, mockFetcher);

      expect(results).toHaveLength(1);
      // 基準日股數應只有 T-1 前的 1000 股，當日買進的 500 股不計入
      expect(results[0].sharesHeldOnDate).toBe(1000);
      expect(results[0].estimatedCashAmount).toBe(3500);
    });

    it('已全數平倉歸零 (0 股) 之標的，歷史股票分割與配股應自動標記為 isAlreadyRecorded = true', async () => {
      const trades: TradeRecord[] = [
        {
          id: '1',
          date: '2024-01-01',
          symbol: '3056',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 1000,
          price: 20,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        {
          id: '2',
          date: '2024-12-31',
          symbol: '3056',
          market: 'TW',
          currency: 'TWD',
          type: 'SELL',
          shares: 1000,
          price: 25,
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
      ];

      const mockFetcher = async () => [
        {
          symbol: '3056',
          market: 'TW' as const,
          type: 'STOCK_DIVIDEND' as const,
          date: '2024-06-15',
          ratio: 0.1,
        },
      ];

      const results = await scanCorporateActions(trades, mockFetcher);

      expect(results).toHaveLength(1);
      // 因目前持股為 0 股，歷史配股應被守護鎖定為已記錄，防範死灰復燃
      expect(results[0].isAlreadyRecorded).toBe(true);
    });

    it('無效減資安全閘門：無減資比率且無每股退款且無金額之假減資事件應被自動過濾', async () => {
      const trades: TradeRecord[] = [
        {
          id: '1',
          date: '2024-01-01',
          symbol: '9927',
          name: '泰銘',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 10000,
          price: 50,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
      ];

      // 模擬先前誤將除息預告解析成的 0 股 0 元假減資
      const mockFetcher = async () => [
        {
          symbol: '9927',
          market: 'TW' as const,
          type: 'CAPITAL_REDUCTION' as const,
          date: '2026-10-01',
          price: 0,
          ratio: 0,
          cashAmount: 0,
          description: '現金減資（減資比率 0.00%，每股退款 0 元）',
        },
      ];

      const results = await scanCorporateActions(trades, mockFetcher);
      // 應被安全過濾閘門剔除，結果為空
      expect(results).toHaveLength(0);
    });

    it('應為現金股利 (DIVIDEND) 事件自動精確注入預估發放日 payDate 欄位', async () => {
      const trades: TradeRecord[] = [
        {
          id: '1',
          date: '2026-01-01',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 2000,
          price: 900,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        {
          id: '2',
          date: '2026-01-01',
          symbol: 'AAPL',
          name: 'Apple',
          market: 'US',
          currency: 'USD',
          type: 'BUY',
          shares: 50,
          price: 200,
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
      ];

      const mockFetcher = async (symbol: string) => {
        if (symbol === '2330') {
          return [
            {
              symbol: '2330',
              market: 'TW' as const,
              type: 'DIVIDEND' as const,
              date: '2026-09-16',
              price: 7.0,
              payDate: '2026-10-08',
              description: '季度現金股利每股 7.0 TWD',
            },
          ];
        }
        if (symbol === 'AAPL') {
          return [
            {
              symbol: 'AAPL',
              market: 'US' as const,
              type: 'DIVIDEND' as const,
              date: '2026-08-10',
              price: 0.25,
              description: 'Quarterly Cash Dividend',
            },
          ];
        }
        return [];
      };

      const results = await scanCorporateActions(trades, mockFetcher);
      expect(results).toHaveLength(2);

      const tsmc = results.find((r) => r.symbol === '2330');
      expect(tsmc).toBeDefined();
      expect(tsmc?.date).toBe('2026-09-16');
      expect(tsmc?.exDate).toBe('2026-09-16');
      expect(tsmc?.payDate).toBe('2026-10-08'); // 官方指定發放日
      expect(tsmc?.sharesHeldOnDate).toBe(2000);

      const aapl = results.find((r) => r.symbol === 'AAPL');
      expect(aapl).toBeDefined();
      expect(aapl?.date).toBe('2026-08-10');
      expect(aapl?.exDate).toBe('2026-08-10');
      expect(aapl?.payDate).toBeDefined(); // 美股推算發放日 (2026-08-31)
      expect(aapl?.payDate).toBe('2026-08-31');
      expect(aapl?.sharesHeldOnDate).toBe(50);
    });

    it('真實場景：9927 泰銘減資 28.28% 後經後續交易庫存為 10,000 股，2026-10-01 除息應精準計算 50,000 元且發放日為 2026-10-29', async () => {
      const trades: TradeRecord[] = [
        // 1. 2024 年買進 10,000 股
        {
          id: 'tm-buy-1',
          date: '2024-05-10',
          symbol: '9927',
          name: '泰銘',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 10000,
          price: 55,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        // 2. 2025-09-15 現金減資 28.28% (縮減 2,828 股，剩餘 7,172 股)
        {
          id: 'tm-reduct',
          date: '2025-09-15',
          symbol: '9927',
          name: '泰銘',
          market: 'TW',
          currency: 'TWD',
          type: 'CAPITAL_REDUCTION',
          shares: 2828,
          price: 2.828,
          ratio: 0.2828,
          cashAmount: 28280,
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
        // 3. 減資後再買進 2,828 股補正，使持股回升至 10,000 股
        {
          id: 'tm-buy-2',
          date: '2025-11-20',
          symbol: '9927',
          name: '泰銘',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 2828,
          price: 60,
          fee: 0,
          tax: 0,
          createdAt: 3,
        },
      ];

      const mockFetcher = async (symbol: string) => {
        if (symbol === '9927') {
          return [
            {
              symbol: '9927',
              market: 'TW' as const,
              type: 'DIVIDEND' as const,
              date: '2026-10-01',
              payDate: '2026-10-29',
              price: 5.0,
              description: '年度現金股利每股 5.0 TWD (預計 2026-10-29 發放入帳)',
            },
          ];
        }
        return [];
      };

      const results = await scanCorporateActions(trades, mockFetcher);
      expect(results).toHaveLength(1);

      const tmDiv = results[0];
      expect(tmDiv.symbol).toBe('9927');
      expect(tmDiv.date).toBe('2026-10-01');
      expect(tmDiv.exDate).toBe('2026-10-01');
      expect(tmDiv.payDate).toBe('2026-10-29'); // 官方校準之發放日
      expect(tmDiv.sharesHeldOnDate).toBe(10000); // 減資與後續交易精準合計 10,000 股
      expect(tmDiv.taxDeduction).toBe(1055); // 50,000 * 2.11% = 1,055 元健保費
      expect(tmDiv.estimatedCashAmount).toBe(48945); // 50,000 - 1,055 = 48,945 元實收
    });

    it('真實場景：2890 永豐金 2026 年同時除權 (每千股 20 股) 與除息 (每股 1.1 元)，持股 31,000 股應正確掃描配股 620 股並精確扣除二代健保實收 33,250 元', async () => {
      const trades: TradeRecord[] = [
        {
          id: 'sinopac-buy-1',
          date: '2026-01-10',
          symbol: '2890',
          name: '永豐金',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 31000,
          price: 24.5,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
      ];

      const mockFetcher = async (sym: string) => {
        if (sym === '2890') {
          return [
            {
              symbol: '2890',
              market: 'TW' as const,
              type: 'STOCK_DIVIDEND' as const,
              date: '2026-07-23',
              payDate: '2026-08-24',
              ratio: 0.02,
              description: '盈餘轉增資配股每千股 20 股 (2.0%)',
            },
            {
              symbol: '2890',
              market: 'TW' as const,
              type: 'DIVIDEND' as const,
              date: '2026-07-23',
              payDate: '2026-08-24',
              price: 1.1,
              description: '現金股利每股 1.1 TWD',
            },
          ];
        }
        return [];
      };

      const results = await scanCorporateActions(trades, mockFetcher);
      expect(results.length).toBeGreaterThanOrEqual(2);

      const stockDiv = results.find((r) => r.type === 'STOCK_DIVIDEND' && r.date === '2026-07-23');
      expect(stockDiv).toBeDefined();
      expect(stockDiv?.symbol).toBe('2890');
      expect(stockDiv?.sharesHeldOnDate).toBe(31000);
      expect(stockDiv?.estimatedSharesChange).toBe(620); // 31,000 * 0.02 = 620 股
      expect(stockDiv?.payDate).toBe('2026-08-24');

      const cashDiv = results.find((r) => r.type === 'DIVIDEND' && r.date === '2026-07-23');
      expect(cashDiv).toBeDefined();
      expect(cashDiv?.symbol).toBe('2890');
      expect(cashDiv?.sharesHeldOnDate).toBe(31000);
      expect(cashDiv?.price).toBe(1.1);
      expect(cashDiv?.taxDeduction).toBe(850); // (34,100 + 6,200) * 2.11% = 850 元
      expect(cashDiv?.estimatedCashAmount).toBe(33250); // 34,100 - 850 = 33,250 元
      expect(cashDiv?.payDate).toBe('2026-08-24');
    }, 15000);

    it('防禦驗證：當手動刪除特定季配息後，重掃時該除息事件應精準標記為待補登 (isAlreadyRecorded: false)，不被其他季度混淆', async () => {
      const trades: TradeRecord[] = [
        {
          id: 'tsmc-buy',
          date: '2024-01-01',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 1000,
          price: 600,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        // 帳本中保留 Q1 配息 (2024-03-18, 每股 3.5 元)
        {
          id: 'tsmc-div-q1',
          date: '2024-03-18',
          symbol: '2330',
          name: '台積電',
          market: 'TW',
          currency: 'TWD',
          type: 'DIVIDEND',
          shares: 1000,
          price: 3.5,
          fee: 0,
          tax: 0,
          cashAmount: 3500,
          createdAt: 2,
        },
        // 假設使用者刪除了 Q2 配息 (2024-06-13, 每股 4.0 元)
      ];

      const mockFetcher = async (sym: string) => {
        if (sym === '2330') {
          return [
            {
              symbol: '2330',
              market: 'TW' as const,
              type: 'DIVIDEND' as const,
              date: '2024-03-18',
              price: 3.5,
              description: '2023Q3 現金股利每股 3.5 元',
            },
            {
              symbol: '2330',
              market: 'TW' as const,
              type: 'DIVIDEND' as const,
              date: '2024-06-13',
              price: 4.0,
              description: '2023Q4 現金股利每股 4.0 元',
            },
          ];
        }
        return [];
      };

      const results = await scanCorporateActions(trades, mockFetcher);
      expect(results).toHaveLength(2);

      const q1Event = results.find((r) => r.date === '2024-03-18');
      const q2Event = results.find((r) => r.date === '2024-06-13');

      expect(q1Event?.isAlreadyRecorded).toBe(true); // 已存在帳本
      expect(q2Event?.isAlreadyRecorded).toBe(false); // 被刪除後應正確識別為待補登！
    });

    it('法規合規驗證：除息日當天買進不享有該次配息，除息日前一日在倉者方享有配息', async () => {
      const trades: TradeRecord[] = [
        {
          id: 'ex-day-buy',
          date: '2026-08-18', // 於 00878 除息日當天買進
          symbol: '00878',
          name: '國泰永續高股息',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 2000,
          price: 22.0,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
      ];

      const mockFetcher = async (sym: string) => {
        if (sym === '00878') {
          return [
            {
              symbol: '00878',
              market: 'TW' as const,
              type: 'DIVIDEND' as const,
              date: '2026-08-18',
              payDate: '2026-09-11',
              price: 0.55,
              description: '季配息每股 0.55 元',
            },
          ];
        }
        return [];
      };

      // 00878 於 2026-08-18 除息，因除息日前一日 (2026-08-17) 在倉為 0，不得享有該次配息
      const results = await scanCorporateActions(trades, mockFetcher);
      const div00878 = results.find((r) => r.symbol === '00878' && r.date === '2026-08-18');
      expect(div00878).toBeUndefined();
    });

    it('真實場景：9927 泰銘 2025 年減資 28.28% 後買回，2026 年配息 5.0 元應精確以 10,000 股計算', async () => {
      const trades: TradeRecord[] = [
        {
          id: 'trade-9927-1',
          date: '2025-09-12',
          symbol: '9927',
          name: '泰銘',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 10000,
          price: 58.7,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        {
          id: 'trade-9927-2',
          date: '2025-12-17',
          symbol: '9927',
          name: '泰銘',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 829,
          price: 68.3,
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
        {
          id: 'trade-9927-3',
          date: '2025-12-17',
          symbol: '9927',
          name: '泰銘',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 2000,
          price: 68.1,
          fee: 0,
          tax: 0,
          createdAt: 3,
        },
      ];

      // 模擬資料源同時回傳 TWSE 減資 (2025-09-15) 與 2026 年度配息 (2026-10-01)
      const mockFetcher = async () => [
        {
          symbol: '9927',
          market: 'TW' as const,
          type: 'CAPITAL_REDUCTION' as const,
          date: '2025-09-15',
          ratio: 0.2828051,
          price: 2.828051,
          description: '現金減資（換發比例 71.71949%，減資縮減比率 28.28051%，每股退款 2.828051 元）',
        },
        {
          symbol: '9927',
          market: 'TW' as const,
          type: 'DIVIDEND' as const,
          date: '2026-10-01',
          payDate: '2026-10-29',
          price: 5.0,
          description: '年度現金股利每股 5.0 TWD (預計 2026-10-29 發放入帳)',
        },
      ];

      const results = await scanCorporateActions(trades, mockFetcher);

      // 減資事件檢驗 (10,000 股依集保換發 71.71949% 換發 7,171 股，縮減 2,829 股)
      const reduction = results.find((r) => r.type === 'CAPITAL_REDUCTION');
      expect(reduction).toBeDefined();
      expect(reduction?.sharesHeldOnDate).toBe(10000);
      expect(reduction?.estimatedSharesChange).toBe(2829); // 10000 - 7171 = 2829 股
      expect(reduction?.estimatedCashAmount).toBe(28280); // 10000 * 2.828051 = 28280 元

      // 2026-10-01 除息事件檢驗 (基準日持股應為 10,000 - 2,829 + 829 + 2,000 = 10,000 股)
      const dividend = results.find((r) => r.type === 'DIVIDEND');
      expect(dividend).toBeDefined();
      expect(dividend?.sharesHeldOnDate).toBe(10000); // 7171 + 2829 = 10000 股
      // 5.0 元股息 * 10000 = 50000 元，二代健保 2.11% = 1055 元，實收 = 48945 元
      expect(dividend?.estimatedCashAmount).toBe(48945);
      expect(dividend?.taxDeduction).toBe(1055);
    });

    it('減資防重複判定：若帳本已有 2025-09-15 減資，即使掃描到 2025-11-13 換發亦應標記為已記錄', async () => {
      const trades: TradeRecord[] = [
        {
          id: 'trade-9927-buy',
          date: '2025-09-12',
          symbol: '9927',
          name: '泰銘',
          market: 'TW',
          currency: 'TWD',
          type: 'BUY',
          shares: 10000,
          price: 58.7,
          fee: 0,
          tax: 0,
          createdAt: 1,
        },
        {
          id: 'trade-9927-reduction',
          date: '2025-09-15',
          symbol: '9927',
          name: '泰銘',
          market: 'TW',
          currency: 'TWD',
          type: 'CAPITAL_REDUCTION',
          shares: 2828,
          price: 2.828,
          cashAmount: 28280,
          fee: 0,
          tax: 0,
          createdAt: 2,
        },
      ];

      const mockFetcher = async () => [
        {
          symbol: '9927',
          market: 'TW' as const,
          type: 'CAPITAL_REDUCTION' as const,
          date: '2025-11-13', // Yahoo Finance 可能記錄在 11-13
          ratio: 0.2828,
          price: 0,
          description: '減資換發',
        },
      ];

      const results = await scanCorporateActions(trades, mockFetcher);
      expect(results).toHaveLength(1);
      expect(results[0].isAlreadyRecorded).toBe(true);
    });
  });
});


