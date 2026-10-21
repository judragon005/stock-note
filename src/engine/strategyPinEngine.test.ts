import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sanitizePriceNumber,
  parseLoopbackContent,
  createPinnedStrategy,
  evaluateStrategyTrigger,
  savePinnedStrategy,
  getPinnedStrategy,
  clearPinnedStrategy,
  recordStrategyOutcome,
  getStrategyOutcomeRecords,
  calculateModelWinRates,
} from './strategyPinEngine';
import { StrategyLoopbackPayload, PinnedStrategy, StrategyOutcomeRecord } from '../types/strategyPin';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
};

describe('Spec 0200 / Ticket 03: strategyPinEngine 外部 AI 回流協議與釘選引擎', () => {
  let storageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    storageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', storageMock);
    storageMock.clear();
    vi.restoreAllMocks();
  });

  describe('1. 價格防呆清洗器 (sanitizePriceNumber)', () => {
    it('應能去除字尾「元」、「$」、逗點與空白並轉為精確浮點數', () => {
      expect(sanitizePriceNumber('153.46元')).toBe(153.46);
      expect(sanitizePriceNumber('$ 167.70')).toBe(167.7);
      expect(sanitizePriceNumber(' 1,234.50 元 ')).toBe(1234.5);
      expect(sanitizePriceNumber(150)).toBe(150);
      expect(sanitizePriceNumber('150')).toBe(150);
    });

    it('遇無效格式或 null/undefined 應安全回傳 undefined', () => {
      expect(sanitizePriceNumber('N/A')).toBeUndefined();
      expect(sanitizePriceNumber(null)).toBeUndefined();
      expect(sanitizePriceNumber(undefined)).toBeUndefined();
      expect(sanitizePriceNumber('無')).toBeUndefined();
    });
  });

  describe('2. 回流內容解析器 (parseLoopbackContent)', () => {
    it('應能從長篇 Markdown 分析文中秒級抽取並提純 JSON 代碼塊', () => {
      const markdownArticle = `
# 華邦電 (2344) 深度診斷報告
經過白帽、黑帽與籌碼面綜合評估...
結論：目前投信持續站在賣方，短期建議嚴守停損。

\`\`\`json
{
  "symbol": "2344",
  "aiModel": "Claude 3.5 Sonnet",
  "verdict": "防守型持倉，破線即砍",
  "stopLoss": "153.46元",
  "takeProfit": "167.70$",
  "trendReversal": "170.71",
  "validityDays": 5
}
\`\`\`

感謝您的閱讀。
      `;

      const result = parseLoopbackContent(markdownArticle, '2344');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.symbol).toBe('2344');
      expect(result.data?.aiModel).toBe('Claude 3.5 Sonnet');
      expect(result.data?.verdict).toBe('防守型持倉，破線即砍');
      expect(result.data?.stopLoss).toBe(153.46);
      expect(result.data?.takeProfit).toBe(167.7);
      expect(result.data?.trendReversal).toBe(170.71);
      expect(result.data?.validityDays).toBe(5);
    });

    it('應能解析未帶 markdown 標籤之純 JSON 字串', () => {
      const rawJson = JSON.stringify({
        symbol: '2344',
        aiModel: 'ChatGPT-4o',
        verdict: '觀望',
        stopLoss: 150,
      });

      const result = parseLoopbackContent(rawJson, '2344');
      expect(result.success).toBe(true);
      expect(result.data?.aiModel).toBe('ChatGPT-4o');
      expect(result.data?.stopLoss).toBe(150);
      expect(result.data?.validityDays).toBe(5); // 預設 5 天
    });

    it('缺少必要之 stopLoss 或數值無效時應回傳失敗與具體錯誤訊息', () => {
      const invalidJson = JSON.stringify({
        symbol: '2344',
        aiModel: 'TestAI',
        verdict: '觀望',
        stopLoss: '無效價格',
      });

      const result = parseLoopbackContent(invalidJson, '2344');
      expect(result.success).toBe(false);
      expect(result.error).toContain('缺少有效之 stopLoss');
    });

    it('標的不匹配時應提出警告', () => {
      const otherStockJson = JSON.stringify({
        symbol: '2330',
        aiModel: 'Gemini 1.5 Pro',
        verdict: '做多',
        stopLoss: 1000,
      });

      const result = parseLoopbackContent(otherStockJson, '2344');
      expect(result.success).toBe(false);
      expect(result.error).toContain('標的代號不一致');
    });
  });

  describe('3. 釘選實體建立與過期計算 (createPinnedStrategy)', () => {
    it('應依據 validityDays 正確計算過期時間 ISO 字串', () => {
      const fixedNow = new Date('2026-10-21T10:00:00.000Z');
      vi.setSystemTime(fixedNow);

      const payload: StrategyLoopbackPayload = {
        symbol: '2344',
        aiModel: 'Claude 3.5 Sonnet',
        verdict: '防守',
        stopLoss: 153.46,
        takeProfit: 167.7,
        trendReversal: 170.71,
        validityDays: 5,
      };

      const pin = createPinnedStrategy(payload);
      expect(pin.symbol).toBe('2344');
      expect(pin.createdAt).toBe(fixedNow.toISOString());
      // 5 天後 = 10-26T10:00:00.000Z
      expect(pin.expiresAt).toBe(new Date('2026-10-26T10:00:00.000Z').toISOString());
      expect(pin.isExpired).toBe(false);
    });
  });

  describe('4. 盤中觸價評估 (evaluateStrategyTrigger)', () => {
    const mockPin: PinnedStrategy = {
      id: 'pin-1',
      symbol: '2344',
      aiModel: 'Claude 3.5',
      verdict: '防守',
      stopLoss: 153.46,
      takeProfit: 167.7,
      trendReversal: 170.71,
      validityDays: 5,
      createdAt: '2026-10-21T00:00:00.000Z',
      expiresAt: '2026-10-26T00:00:00.000Z',
      isExpired: false,
    };

    it('當現價低於或等於停損價時應觸發 isStopLossTriggered', () => {
      const status = evaluateStrategyTrigger(mockPin, 153.0);
      expect(status.isStopLossTriggered).toBe(true);
      expect(status.triggerMessage).toContain('跌破停損線');
    });

    it('當現價高於或等於停利價時應觸發 isTakeProfitTriggered', () => {
      const status = evaluateStrategyTrigger(mockPin, 168.0);
      expect(status.isTakeProfitTriggered).toBe(true);
      expect(status.triggerMessage).toContain('達到停利目標');
    });

    it('當現價高於或等於翻多點位時應觸發 isReversalTriggered', () => {
      const status = evaluateStrategyTrigger(mockPin, 171.0);
      expect(status.isReversalTriggered).toBe(true);
      expect(status.triggerMessage).toContain('突破翻多點位');
    });

    it('若在安全區間則無觸發', () => {
      const status = evaluateStrategyTrigger(mockPin, 160.0);
      expect(status.isStopLossTriggered).toBe(false);
      expect(status.isTakeProfitTriggered).toBe(false);
      expect(status.isReversalTriggered).toBe(false);
    });
  });

  describe('5. LocalStorage 持久化與勝率榜統計 (上限 20 筆)', () => {
    it('應能正確儲存、讀取與清除釘選策略，並動態判定過期狀態', () => {
      const pin: PinnedStrategy = {
        id: 'pin-123',
        symbol: '2344',
        aiModel: 'Claude 3.5',
        verdict: '觀望',
        stopLoss: 150,
        validityDays: 5,
        createdAt: '2026-10-10T00:00:00.000Z',
        expiresAt: '2026-10-15T00:00:00.000Z', // 過去的時間
        isExpired: false,
      };

      savePinnedStrategy(pin);

      // 當前時間是 2026-10-21，已過期
      vi.setSystemTime(new Date('2026-10-21T00:00:00.000Z'));
      const loaded = getPinnedStrategy('2344');
      expect(loaded).toBeDefined();
      expect(loaded?.isExpired).toBe(true);

      clearPinnedStrategy('2344');
      expect(getPinnedStrategy('2344')).toBeNull();
    });

    it('歷史裁決記錄上限應為 20 筆，並正確統計各模型勝率', () => {
      // 依序寫入 22 筆記錄
      for (let i = 1; i <= 22; i++) {
        const record: StrategyOutcomeRecord = {
          id: `rec-${i}`,
          symbol: '2344',
          aiModel: i % 2 === 0 ? 'Claude 3.5 Sonnet' : 'ChatGPT-4o',
          createdAt: new Date().toISOString(),
          closedAt: new Date().toISOString(),
          outcome: i % 3 === 0 ? 'LOSS' : 'WIN',
        };
        recordStrategyOutcome(record);
      }

      const records = getStrategyOutcomeRecords();
      expect(records.length).toBe(20); // 最多 20 筆
      expect(records[0].id).toBe('rec-3'); // rec-1 與 rec-2 被先進先出擠出

      const stats = calculateModelWinRates(records);
      expect(stats.length).toBeGreaterThan(0);
      const claudeStat = stats.find((s) => s.aiModel === 'Claude 3.5 Sonnet');
      expect(claudeStat).toBeDefined();
      expect(claudeStat?.total).toBe(10);
      expect(claudeStat?.winRatePct).toBeGreaterThanOrEqual(0);
    });
  });
});
