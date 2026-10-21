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

  const aiModel = String(parsed.aiModel || '外部 AI').trim();
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
 * 儲存釘選策略至 LocalStorage
 */
export function savePinnedStrategy(pin: PinnedStrategy): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(PINNED_STRATEGIES_STORAGE_KEY);
    const map: Record<string, PinnedStrategy> = raw ? JSON.parse(raw) : {};
    map[pin.symbol] = pin;
    localStorage.setItem(PINNED_STRATEGIES_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('[strategyPinEngine] savePinnedStrategy failed:', err);
  }
}

/**
 * 讀取指定標的的釘選策略 (動態計算 isExpired)
 */
export function getPinnedStrategy(symbol: string): PinnedStrategy | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PINNED_STRATEGIES_STORAGE_KEY);
    if (!raw) return null;
    const map: Record<string, PinnedStrategy> = JSON.parse(raw);
    const pin = map[symbol];
    if (!pin) return null;

    // 動態檢查是否已過期
    const isExpired = new Date(pin.expiresAt).getTime() < Date.now();
    return {
      ...pin,
      isExpired,
    };
  } catch (err) {
    console.warn('[strategyPinEngine] getPinnedStrategy failed:', err);
    return null;
  }
}

/**
 * 清除指定標的的釘選策略
 */
export function clearPinnedStrategy(symbol: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(PINNED_STRATEGIES_STORAGE_KEY);
    if (!raw) return;
    const map: Record<string, PinnedStrategy> = JSON.parse(raw);
    delete map[symbol];
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
