/**
 * 智慧解析外部 LLM 研報回填 (Spec 0173 / Ticket 05)
 * 從 ChatGPT / Claude / Gemini 生成之結構化文本中萃取投資筆記草稿
 */
import { InvestmentMemoRecord } from '../types/equityDeepDive';

export function parseLlmResponseToMemoDraft(rawText: string): Partial<InvestmentMemoRecord> {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return {};
  }

  const result: Partial<InvestmentMemoRecord> = {};

  // 1. 目標價解析 (支援「目標價區間」、「目標價」、「Target Price」後之第一個數字)
  const targetMatch = rawText.match(/(?:目標價(?:位|區間)?|Target\s*Price)[*：:\s]*([0-9.]+)/i);
  if (targetMatch && targetMatch[1]) {
    const num = parseFloat(targetMatch[1]);
    if (!isNaN(num) && num > 0) {
      result.targetPrice = num;
    }
  }

  // 2. 停損價解析 (支援「停損價底線」、「停損價」、「Stop Loss」後之第一個數字)
  const stopLossMatch = rawText.match(/(?:停損(?:價)?(?:底線|風控線)?|Stop\s*Loss)[*：:\s]*([0-9.]+)/i);
  if (stopLossMatch && stopLossMatch[1]) {
    const num = parseFloat(stopLossMatch[1]);
    if (!isNaN(num) && num > 0) {
      result.stopLossPrice = num;
    }
  }

  // 3. 買進核心理由 (支援「買進核心理由」、「買進理由」、「Catalyst」)
  const buyReasonMatch = rawText.match(/(?:買進(?:核心)?理由|Catalyst)[*：:\s]*([^\n\r]+)/i);
  if (buyReasonMatch && buyReasonMatch[1]) {
    const text = buyReasonMatch[1].replace(/^[*-]\s*/, '').replace(/[*_#]/g, '').trim();
    if (text) {
      result.buyReason = text;
    }
  }

  // 4. 核心論點失效條件 (Kill-Switch / 證偽條件)
  const killSwitchMatch = rawText.match(/(?:核心論點失效條件|證偽條件|Kill\s*Switch)[*：:\s]*([^\n\r]+)/i);
  if (killSwitchMatch && killSwitchMatch[1]) {
    const text = killSwitchMatch[1].replace(/^[*-]\s*/, '').replace(/[*_#]/g, '').trim();
    if (text) {
      result.thesisInvalidation = text;
    }
  }

  // 5. 預計持有週期 (天數)
  const daysMatch = rawText.match(/(?:預計持有週期|Holding\s*(?:Days|Period)?)[*：:\s]*([0-9]+)/i);
  if (daysMatch && daysMatch[1]) {
    const days = parseInt(daysMatch[1], 10);
    if (!isNaN(days) && days > 0) {
      result.holdingPeriodDays = days;
    }
  }

  // 6. 3 個追蹤觀察指標
  const metricsMatch = rawText.match(/(?:追蹤觀察指標|觀察指標|Tracking\s*Metrics)[*：:\s]*([^\n\r]+)/i);
  if (metricsMatch && metricsMatch[1]) {
    const rawMetrics = metricsMatch[1].replace(/^[*-]\s*/, '').replace(/[*_#]/g, '').trim();
    const splitMetrics = rawMetrics
      .split(/[,，、|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (splitMetrics.length > 0) {
      result.trackingMetrics = splitMetrics;
    }
  }

  return result;
}
