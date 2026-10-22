/**
 * 戰情室外部 AI 裁決回流協議引擎 (Spec 0200 / Ticket 03)
 * 負責標準回流 JSON 解析、價格防呆清洗、時效計算、盤中觸價與 LocalStorage 持久化
 */

import {
  StrategyLoopbackPayload,
  PinnedStrategy,
  StrategyOutcomeRecord,
  ModelWinRateStat,
  StrategyTriggerStatus,
  MultiStrategyTriggerStatus,
  ConsensusLevel,
} from '../types/strategyPin';

export const PINNED_STRATEGIES_STORAGE_KEY = 'stock_note_pinned_strategies';
export const STRATEGY_OUTCOMES_STORAGE_KEY = 'stock_note_strategy_outcomes';
const MAX_OUTCOME_HISTORY_LIMIT = 20;

/**
 * 價格防呆清洗器：去除「元」、「$」、逗點與空白，轉為精準浮點數
 */
export function sanitizePriceNumber(val: unknown): number | undefined {
  if (val === null || val === undefined) {
    return undefined;
  }
  if (typeof val === 'number') {
    return isFinite(val) ? val : undefined;
  }
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'n/a' || str === '無') {
    return undefined;
  }
  // 移除非數字、小數點、負號的字元
  const cleaned = str.replace(/[^0-9.-]/g, '');
  if (!cleaned) {
    return undefined;
  }
  const num = parseFloat(cleaned);
  return !isNaN(num) && isFinite(num) ? num : undefined;
}

/**
 * 回流內容解析器：從長篇 Markdown 中秒級抽取 JSON 代碼塊或解析純 JSON
 */
export function parseLoopbackContent(
  rawText: string,
  expectedSymbol?: string
): { success: boolean; data?: StrategyLoopbackPayload; error?: string } {
  if (!rawText || !rawText.trim()) {
    return { success: false, error: '傳入之內容為空，無法解析' };
  }

  let jsonStr = '';

  // 1. 優先嘗試擷取 ```json ... ``` 區塊
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    // 2. 嘗試尋找包含 "aiModel" 或 "stopLoss" 的最外層大括弧
    const braceMatch = rawText.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      jsonStr = braceMatch[0].trim();
    } else {
      jsonStr = rawText.trim();
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err: any) {
    return {
      success: false,
      error: `JSON 格式解析失敗，請確認外部 AI 輸出是否符合標準代碼區塊格式 (${err?.message || '語法錯誤'})`,
    };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { success: false, error: '解析結果非有效 JSON 物件' };
  }

  // 標的校驗
  const parsedSymbol = String(parsed.symbol || '').trim();
  const normalizedExpected = (expectedSymbol || '').trim();

  if (normalizedExpected && parsedSymbol && parsedSymbol.toUpperCase() !== normalizedExpected.toUpperCase()) {
    return {
      success: false,
      error: `標的代號不一致 (預期: ${normalizedExpected}, 外部回覆: ${parsedSymbol})，請確認是否貼錯標的`,
    };
  }

  const finalSymbol = parsedSymbol || normalizedExpected || 'UNKNOWN';

  // 停損點位校驗 (必要欄位)
  const stopLoss = sanitizePriceNumber(parsed.stopLoss);
  if (stopLoss === undefined) {
    return {
      success: false,
      error: '缺少有效之 stopLoss (停損點位)，外部 AI 回傳之數值無法解析為有效價格',
    };
  }

  const takeProfit = sanitizePriceNumber(parsed.takeProfit);
  const trendReversal = sanitizePriceNumber(parsed.trendReversal);

  // 時效天數 (預設 5 天)
  let validityDays = parseInt(String(parsed.validityDays ?? 5), 10);
  if (isNaN(validityDays) || validityDays <= 0) {
    validityDays = 5;
  }

  const rawModel = String(parsed.aiModel || '').trim();
  const aiModel = normalizeAiModelName(rawModel);
  const verdict = String(parsed.verdict || '無具體裁決').trim();

  return {
    success: true,
    data: {
      symbol: finalSymbol,
      aiModel,
      verdict,
      stopLoss,
      takeProfit,
      trendReversal,
      validityDays,
    },
  };
}

/**
 * AI 模型名稱語意正規化 (Spec 0201 / Ticket 01)
 * 統一發散字串（如 Claude 3.5 Sonnet / claude-3-5 / ChatGPT 4o / Perplexity 等）
 */
export function normalizeAiModelName(raw: string): string {
  if (!raw || !raw.trim()) {
    return '外部 AI';
  }
  const trimmed = raw.trim();
  if (/claude/i.test(trimmed)) {
    return 'Claude 3.5 Sonnet';
  }
  if (/chatgpt|gpt-?4/i.test(trimmed)) {
    return 'ChatGPT-4o';
  }
  if (/perplexity|sonar/i.test(trimmed)) {
    return 'Perplexity';
  }
  if (/gemini/i.test(trimmed)) {
    return 'Gemini 1.5 Pro';
  }
  return trimmed;
}

/**
 * 批次代碼塊抽取器 (Spec 0201 / Ticket 01)
 * 從長文中批次抽取多個 ```json ... ``` 代碼塊並逐一解析
 */
export function parseLoopbackContentBatch(
  rawText: string,
  expectedSymbol?: string
): StrategyLoopbackPayload[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  const results: StrategyLoopbackPayload[] = [];
  // 全域正則抽取所有 ```json ... ``` 或 ``` ... ```
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(rawText)) !== null) {
    const blockContent = match[1]?.trim();
    if (!blockContent) continue;
    const parsed = parseLoopbackContent(blockContent, expectedSymbol);
    if (parsed.success && parsed.data) {
      results.push(parsed.data);
    }
  }

  // 若正則未抓到任何代碼塊，嘗試作為單一純文字或 JSON 解析
  if (results.length === 0) {
    const single = parseLoopbackContent(rawText, expectedSymbol);
    if (single.success && single.data) {
      results.push(single.data);
    }
  }

  return results;
}

/**
 * 建立釘選實體
 */
export function createPinnedStrategy(
  payload: StrategyLoopbackPayload,
  nowIso?: string
): PinnedStrategy {
  const now = nowIso ? new Date(nowIso) : new Date();
  const days = payload.validityDays > 0 ? payload.validityDays : 5;
  const expiresAt = new Date(now.getTime() + days * 86400000).toISOString();

  return {
    ...payload,
    id: `pin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: now.toISOString(),
    expiresAt,
    isExpired: false,
    acknowledgedAlert: false,
  };
}

/**
 * 盤中觸價評估邏輯
 */
export function evaluateStrategyTrigger(
  pin: PinnedStrategy,
  currentPrice: number
): StrategyTriggerStatus {
  const isStopLossTriggered = currentPrice <= pin.stopLoss;
  const isTakeProfitTriggered = pin.takeProfit !== undefined && currentPrice >= pin.takeProfit;
  const isReversalTriggered = pin.trendReversal !== undefined && currentPrice >= pin.trendReversal;

  const messages: string[] = [];
  if (isStopLossTriggered) {
    messages.push(`⚠️ 跌破停損線 (${currentPrice} <= ${pin.stopLoss})，請依紀律嚴格防守！`);
  }
  if (isTakeProfitTriggered) {
    messages.push(`🎯 達到停利目標 (${currentPrice} >= ${pin.takeProfit})，可考慮分批落袋！`);
  }
  if (isReversalTriggered) {
    messages.push(`🚀 突破翻多點位 (${currentPrice} >= ${pin.trendReversal})，結構轉強！`);
  }

  return {
    isStopLossTriggered,
    isTakeProfitTriggered,
    isReversalTriggered,
    triggerMessage: messages.length > 0 ? messages.join(' | ') : undefined,
  };
}

/**
 * 多模型盤中觸價評估與共識防線指標 (Spec 0201 / Ticket 03)
 * 取最高停損價 (最嚴格保命防線) 優先報警，並計算停損差幅比率評估共識/分歧
 */
export function evaluateMultiStrategyTriggers(
  pins: PinnedStrategy[],
  currentPrice: number
): MultiStrategyTriggerStatus {
  if (!pins || pins.length === 0) {
    return {
      isStopLossTriggered: false,
      isTakeProfitTriggered: false,
      isReversalTriggered: false,
      consensusLevel: 'NEUTRAL',
    };
  }

  // 1. 最嚴格停損優先 (停損值最高者 = 最小跌幅容忍度 = 最嚴格防守)
  let strictestStopLoss = -Infinity;
  let strictestModel = '';

  pins.forEach((p) => {
    if (p.stopLoss > strictestStopLoss) {
      strictestStopLoss = p.stopLoss;
      strictestModel = p.aiModel;
    }
  });

  const isStopLossTriggered = currentPrice <= strictestStopLoss;

  // 2. 評估停利與翻多 (任一模型達到)
  let isTakeProfitTriggered = false;
  let takeProfitModel = '';
  let takeProfitPrice = 0;

  let isReversalTriggered = false;
  let reversalModel = '';
  let reversalPrice = 0;

  pins.forEach((p) => {
    if (p.takeProfit !== undefined && currentPrice >= p.takeProfit) {
      isTakeProfitTriggered = true;
      takeProfitModel = p.aiModel;
      takeProfitPrice = p.takeProfit;
    }
    if (p.trendReversal !== undefined && currentPrice >= p.trendReversal) {
      isReversalTriggered = true;
      reversalModel = p.aiModel;
      reversalPrice = p.trendReversal;
    }
  });

  // 3. 觸價警報訊息
  const messages: string[] = [];
  if (isStopLossTriggered) {
    messages.push(
      `⚠️ 跌破停損線 (${currentPrice} <= ${strictestStopLoss} 由 ${strictestModel} 發起)，請依紀律嚴格防守！`
    );
  }
  if (isTakeProfitTriggered) {
    messages.push(
      `🎯 達到停利目標 (${currentPrice} >= ${takeProfitPrice} 由 ${takeProfitModel} 預估)，可分批獲利了結！`
    );
  }
  if (isReversalTriggered) {
    messages.push(
      `🚀 突破翻多點位 (${currentPrice} >= ${reversalPrice} 由 ${reversalModel} 預估)，趨勢轉強！`
    );
  }

  // 4. 共識與分歧判定 (<2% 為共識，>5% 為分歧)
  let consensusLevel: ConsensusLevel = 'NEUTRAL';
  let consensusMessage: string | undefined;
  let stopLossSpreadPct: number | undefined;

  if (pins.length >= 2) {
    const validStopLosses = pins.map((p) => p.stopLoss).filter((sl) => sl > 0);
    if (validStopLosses.length >= 2 && currentPrice > 0) {
      const maxSl = Math.max(...validStopLosses);
      const minSl = Math.min(...validStopLosses);
      stopLossSpreadPct = Number((((maxSl - minSl) / currentPrice) * 100).toFixed(2));

      if (stopLossSpreadPct < 2.0) {
        consensusLevel = 'CONSENSUS';
        consensusMessage = `🛡️ 智囊團共識防線：${maxSl.toFixed(2)} (落差僅 ${stopLossSpreadPct}%)`;
      } else if (stopLossSpreadPct > 5.0) {
        consensusLevel = 'DIVERGENT';
        consensusMessage = `⚡ 智囊團分歧警告 (點位落差達 ${stopLossSpreadPct}%)，建議降低部位或嚴守保命線`;
      } else {
        consensusLevel = 'NEUTRAL';
        consensusMessage = `智囊團綜合觀察中 (點位落差 ${stopLossSpreadPct}%)`;
      }
    }
  } else if (pins.length === 1) {
    consensusLevel = 'CONSENSUS';
    consensusMessage = `🛡️ 智囊團防線：${pins[0].stopLoss.toFixed(2)}`;
  }

  return {
    isStopLossTriggered,
    isTakeProfitTriggered,
    isReversalTriggered,
    strictestStopLoss: isFinite(strictestStopLoss) ? strictestStopLoss : undefined,
    triggeredModel: strictestModel || undefined,
    triggerMessage: messages.length > 0 ? messages.join(' | ') : undefined,
    consensusLevel,
    consensusMessage,
    stopLossSpreadPct,
  };
}

/**
 * 儲存釘選策略至 LocalStorage (Spec 0201 / Ticket 02)
 * 同標的下支援多模型並存，同模型 (依 normalized aiModel) 後者覆蓋前者
 */
export function savePinnedStrategy(pin: PinnedStrategy): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(PINNED_STRATEGIES_STORAGE_KEY);
    const map: Record<string, unknown> = raw ? JSON.parse(raw) : {};
    const existingRaw = map[pin.symbol];
    const existingList: PinnedStrategy[] = Array.isArray(existingRaw)
      ? (existingRaw as PinnedStrategy[])
      : existingRaw && typeof existingRaw === 'object'
      ? [existingRaw as PinnedStrategy]
      : [];

    const normalizedModel = normalizeAiModelName(pin.aiModel);
    const standardizedPin: PinnedStrategy = {
      ...pin,
      aiModel: normalizedModel,
    };

    const targetIdx = existingList.findIndex(
      (p) => normalizeAiModelName(p.aiModel) === normalizedModel
    );

    if (targetIdx >= 0) {
      // 同模型覆蓋替換
      existingList[targetIdx] = standardizedPin;
    } else {
      // 不同模型追加
      existingList.push(standardizedPin);
    }

    map[pin.symbol] = existingList;
    localStorage.setItem(PINNED_STRATEGIES_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('[strategyPinEngine] savePinnedStrategy failed:', err);
  }
}

/**
 * 讀取指定標的的所有釘選策略 (動態計算 isExpired)
 * 具備雙軌向下相容：若儲存庫中為舊版單一物件，自動無損包裹為陣列回傳 (Spec 0201 / Ticket 01)
 */
export function getPinnedStrategies(symbol: string): PinnedStrategy[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PINNED_STRATEGIES_STORAGE_KEY);
    if (!raw) return [];
    const map: Record<string, unknown> = JSON.parse(raw);
    const stored = map[symbol];
    if (!stored) return [];

    const now = Date.now();
    const rawList: unknown[] = Array.isArray(stored) ? stored : [stored];

    return rawList
      .filter((item): item is PinnedStrategy => typeof item === 'object' && item !== null)
      .map((pin) => ({
        ...pin,
        isExpired: new Date(pin.expiresAt).getTime() < now,
      }));
  } catch (err) {
    console.warn('[strategyPinEngine] getPinnedStrategies failed:', err);
    return [];
  }
}

/**
 * 讀取指定標的的釘選策略 (向後相容代理：回傳第一筆或 null)
 */
export function getPinnedStrategy(symbol: string): PinnedStrategy | null {
  const list = getPinnedStrategies(symbol);
  return list.length > 0 ? list[0] : null;
}

/**
 * 清除指定標的的釘選策略 (Spec 0201 / Ticket 02)
 * 若有帶 aiModel 則僅刪除該模型，未帶則清空該標的全數策略
 */
export function clearPinnedStrategy(symbol: string, aiModel?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(PINNED_STRATEGIES_STORAGE_KEY);
    if (!raw) return;
    const map: Record<string, unknown> = JSON.parse(raw);

    if (!aiModel) {
      delete map[symbol];
    } else {
      const stored = map[symbol];
      if (stored) {
        const rawList: PinnedStrategy[] = Array.isArray(stored)
          ? (stored as PinnedStrategy[])
          : [stored as PinnedStrategy];
        const normalizedTarget = normalizeAiModelName(aiModel);
        const filtered = rawList.filter(
          (p) => normalizeAiModelName(p.aiModel) !== normalizedTarget
        );
        if (filtered.length > 0) {
          map[symbol] = filtered;
        } else {
          delete map[symbol];
        }
      }
    }

    localStorage.setItem(PINNED_STRATEGIES_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('[strategyPinEngine] clearPinnedStrategy failed:', err);
  }
}

/**
 * 記錄策略裁決結果 (上限 20 筆 FIFO)
 */
export function recordStrategyOutcome(record: StrategyOutcomeRecord): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const records = getStrategyOutcomeRecords();
    records.push(record);
    const trimmed = records.slice(-MAX_OUTCOME_HISTORY_LIMIT);
    localStorage.setItem(STRATEGY_OUTCOMES_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[strategyPinEngine] recordStrategyOutcome failed:', err);
  }
}

/**
 * 取得所有策略結案記錄
 */
export function getStrategyOutcomeRecords(): StrategyOutcomeRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STRATEGY_OUTCOMES_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('[strategyPinEngine] getStrategyOutcomeRecords failed:', err);
    return [];
  }
}

/**
 * 計算各 AI 模型勝率統計表 (降序排列)
 */
export function calculateModelWinRates(records: StrategyOutcomeRecord[]): ModelWinRateStat[] {
  const modelMap: Record<string, { total: number; wins: number; losses: number; expired: number }> = {};

  for (const r of records) {
    const model = r.aiModel || '未知模型';
    if (!modelMap[model]) {
      modelMap[model] = { total: 0, wins: 0, losses: 0, expired: 0 };
    }
    modelMap[model].total += 1;
    if (r.outcome === 'WIN') {
      modelMap[model].wins += 1;
    } else if (r.outcome === 'LOSS') {
      modelMap[model].losses += 1;
    } else {
      modelMap[model].expired += 1;
    }
  }

  const results: ModelWinRateStat[] = Object.entries(modelMap).map(([aiModel, stat]) => {
    // 結案且非過期之勝率；若過期則計入分母
    const winRatePct = stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : 0;
    return {
      aiModel,
      total: stat.total,
      wins: stat.wins,
      losses: stat.losses,
      expired: stat.expired,
      winRatePct,
    };
  });

  return results.sort((a, b) => b.winRatePct - a.winRatePct || b.total - a.total);
}
