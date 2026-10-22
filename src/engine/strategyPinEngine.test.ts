import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as strategyPinEngineModule from './strategyPinEngine';
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

  describe('Spec 0201 / Ticket 01: 儲存架構向下相容、模型正規化與批次代碼塊抽取', () => {
    it('應能將發散之 AI 模型名稱語意正規化 (normalizeAiModelName)', () => {
      // @ts-ignore - 尚未實作
      const { normalizeAiModelName } = strategyPinEngineModule;
      expect(normalizeAiModelName('Claude 3.5 Sonnet')).toBe('Claude 3.5 Sonnet');
      expect(normalizeAiModelName('claude-3-5-sonnet-20241022')).toBe('Claude 3.5 Sonnet');
      expect(normalizeAiModelName('Anthropic Claude')).toBe('Claude 3.5 Sonnet');
      expect(normalizeAiModelName('ChatGPT 4o')).toBe('ChatGPT-4o');
      expect(normalizeAiModelName('gpt-4o-latest')).toBe('ChatGPT-4o');
      expect(normalizeAiModelName('OpenAI ChatGPT')).toBe('ChatGPT-4o');
      expect(normalizeAiModelName('Perplexity Sonar')).toBe('Perplexity');
      expect(normalizeAiModelName('perplexity-pro')).toBe('Perplexity');
      expect(normalizeAiModelName('Gemini 1.5 Pro')).toBe('Gemini 1.5 Pro');
      expect(normalizeAiModelName('gemini-2.0-flash')).toBe('Gemini 1.5 Pro');
      expect(normalizeAiModelName('自訂量化模型')).toBe('自訂量化模型');
      expect(normalizeAiModelName('')).toBe('外部 AI');
    });

    it('應能批次抽取多個 JSON 代碼區塊 (parseLoopbackContentBatch)', () => {
      // @ts-ignore - 尚未實作
      const { parseLoopbackContentBatch } = strategyPinEngineModule;
      const multiModelText = `
### 1. Claude 觀點
\`\`\`json
{
  "symbol": "2344",
  "aiModel": "Claude 3.5",
  "verdict": "保守防守",
  "stopLoss": 150.0,
  "takeProfit": 165.0,
  "validityDays": 5
}
\`\`\`

### 2. Perplexity 觀點
\`\`\`json
{
  "symbol": "2344",
  "aiModel": "Perplexity",
  "verdict": "突破翻多",
  "stopLoss": 152.5,
  "trendReversal": 160.0,
  "validityDays": 3
}
\`\`\`
      `;

      const results = parseLoopbackContentBatch(multiModelText, '2344');
      expect(results.length).toBe(2);
      expect(results[0].aiModel).toBe('Claude 3.5 Sonnet'); // 自動正規化
      expect(results[0].stopLoss).toBe(150.0);
      expect(results[1].aiModel).toBe('Perplexity');
      expect(results[1].stopLoss).toBe(152.5);
    });

    it('getPinnedStrategies 應能安全向下相容舊版單一物件格式', () => {
      // @ts-ignore - 尚未實作
      const { getPinnedStrategies } = strategyPinEngineModule;
      // 模擬 LocalStorage 中舊版結構: Record<symbol, PinnedStrategy> (非陣列)
      const legacyMap = {
        '2344': {
          id: 'pin_legacy',
          symbol: '2344',
          aiModel: 'Claude 3.5 Sonnet',
          verdict: '舊版單一釘選',
          stopLoss: 153.0,
          validityDays: 5,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          isExpired: false,
        },
      };
      storageMock.setItem('stock_note_pinned_strategies', JSON.stringify(legacyMap));

      const list = getPinnedStrategies('2344');
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('pin_legacy');
      expect(list[0].verdict).toBe('舊版單一釘選');
    });
  });

  describe('Spec 0201 / Ticket 02: 多模型並存儲存、同名覆蓋與單卡獨立結案回報', () => {
    it('應能將不同 AI 模型之策略並存在同標的陣列中，同名模型後者覆蓋前者', () => {
      // 1. 儲存 Claude 策略
      const pinClaude = createPinnedStrategy({
        symbol: '2344',
        aiModel: 'Claude 3.5 Sonnet',
        verdict: '保守防守',
        stopLoss: 150.0,
        validityDays: 5,
      });
      savePinnedStrategy(pinClaude);

      let list = strategyPinEngineModule.getPinnedStrategies('2344');
      expect(list.length).toBe(1);
      expect(list[0].aiModel).toBe('Claude 3.5 Sonnet');
      expect(list[0].stopLoss).toBe(150.0);

      // 2. 儲存 Perplexity 策略 (不同模型 -> 應並存)
      const pinPpx = createPinnedStrategy({
        symbol: '2344',
        aiModel: 'Perplexity',
        verdict: '看多進攻',
        stopLoss: 153.0,
        validityDays: 3,
      });
      savePinnedStrategy(pinPpx);

      list = strategyPinEngineModule.getPinnedStrategies('2344');
      expect(list.length).toBe(2);
      expect(list.map((p) => p.aiModel)).toEqual(['Claude 3.5 Sonnet', 'Perplexity']);

      // 3. 再次儲存更新版 Claude (同名模型 -> 應覆蓋原本 Claude，總長度仍為 2)
      const pinClaudeUpdated = createPinnedStrategy({
        symbol: '2344',
        aiModel: 'claude-3-5-sonnet-20241022', // 會被正規化為 Claude 3.5 Sonnet
        verdict: '更新版嚴格防守',
        stopLoss: 152.0,
        validityDays: 5,
      });
      savePinnedStrategy(pinClaudeUpdated);

      list = strategyPinEngineModule.getPinnedStrategies('2344');
      expect(list.length).toBe(2);
      const claudeFound = list.find((p) => p.aiModel === 'Claude 3.5 Sonnet');
      expect(claudeFound).toBeDefined();
      expect(claudeFound?.verdict).toBe('更新版嚴格防守');
      expect(claudeFound?.stopLoss).toBe(152.0);
    });

    it('應支援刪除指定標的的單一模型策略，未指定時全清', () => {
      const pin1 = createPinnedStrategy({ symbol: '2344', aiModel: 'Claude 3.5 Sonnet', verdict: 'V1', stopLoss: 150, validityDays: 5 });
      const pin2 = createPinnedStrategy({ symbol: '2344', aiModel: 'ChatGPT-4o', verdict: 'V2', stopLoss: 151, validityDays: 5 });
      savePinnedStrategy(pin1);
      savePinnedStrategy(pin2);

      expect(strategyPinEngineModule.getPinnedStrategies('2344').length).toBe(2);

      // 刪除 Claude
      clearPinnedStrategy('2344', 'Claude 3.5 Sonnet');
      let list = strategyPinEngineModule.getPinnedStrategies('2344');
      expect(list.length).toBe(1);
      expect(list[0].aiModel).toBe('ChatGPT-4o');

      // 未指定 model -> 清空全標的
      clearPinnedStrategy('2344');
      expect(strategyPinEngineModule.getPinnedStrategies('2344').length).toBe(0);
    });
  });

  describe('Spec 0201 / Ticket 03: 最嚴格保命停損優先警報與共識/分歧指標評估', () => {
    it('多模型停損不同時，應以最高停損價 (最嚴格防線) 優先報警 (evaluateMultiStrategyTriggers)', () => {
      // @ts-ignore - 尚未實作
      const { evaluateMultiStrategyTriggers } = strategyPinEngineModule;
      const claudePin = createPinnedStrategy({
        symbol: '2344',
        aiModel: 'Claude 3.5 Sonnet',
        verdict: '保守防守',
        stopLoss: 153.0, // 較嚴格 (高)
        validityDays: 5,
      });
      const gptPin = createPinnedStrategy({
        symbol: '2344',
        aiModel: 'ChatGPT-4o',
        verdict: '寬鬆防守',
        stopLoss: 145.0, // 較寬鬆 (低)
        validityDays: 5,
      });

      // 1. 現價 150.0 (跌破 Claude 153.0，但尚未跌破 GPT 145.0)
      const status = evaluateMultiStrategyTriggers([claudePin, gptPin], 150.0);
      expect(status.isStopLossTriggered).toBe(true);
      expect(status.strictestStopLoss).toBe(153.0);
      expect(status.triggeredModel).toBe('Claude 3.5 Sonnet');
      expect(status.triggerMessage).toContain('跌破停損線');
      expect(status.triggerMessage).toContain('Claude 3.5 Sonnet');

      // 2. 現價 155.0 (安全高於兩家停損)
      const safeStatus = evaluateMultiStrategyTriggers([claudePin, gptPin], 155.0);
      expect(safeStatus.isStopLossTriggered).toBe(false);
    });

    it('應能精確判定共識防線 (<2%) 與意見分歧警告 (>5%)', () => {
      // @ts-ignore - 尚未實作
      const { evaluateMultiStrategyTriggers } = strategyPinEngineModule;
      // 1. 高度共識案例: 停損分別為 152.0 與 153.0，差幅 1 元 / 155 元 ≈ 0.64% < 2%
      const pinA = createPinnedStrategy({ symbol: '2344', aiModel: 'Claude', verdict: '守', stopLoss: 153.0, validityDays: 5 });
      const pinB = createPinnedStrategy({ symbol: '2344', aiModel: 'Perplexity', verdict: '守', stopLoss: 152.0, validityDays: 5 });

      const consensusStatus = evaluateMultiStrategyTriggers([pinA, pinB], 155.0);
      expect(consensusStatus.consensusLevel).toBe('CONSENSUS');
      expect(consensusStatus.consensusMessage).toContain('共識防線');

      // 2. 分歧警告案例: 停損分別為 135.0 與 153.0，差幅 18 元 / 155 元 ≈ 11.6% > 5%
      const pinDivergent = createPinnedStrategy({ symbol: '2344', aiModel: 'GPT', verdict: '等', stopLoss: 135.0, validityDays: 5 });
      const divergentStatus = evaluateMultiStrategyTriggers([pinA, pinDivergent], 155.0);
      expect(divergentStatus.consensusLevel).toBe('DIVERGENT');
      expect(divergentStatus.consensusMessage).toContain('分歧警告');
    });
  });
});
