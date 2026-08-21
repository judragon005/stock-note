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
  });
});
