import { describe, it, expect } from 'vitest';
import { scanCorporateActions, normalizeTWSEDate } from './corporateActionScanner';
import { TradeRecord } from '../types/stock';

describe('公司行動智慧掃描引擎 (Corporate Action Scanner)', () => {
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
});
