import { describe, it, expect } from 'vitest';
import { parseLlmResponseToMemoDraft } from './memoSmartParser';

describe('memoSmartParser - 智慧解析外部 LLM 研報回填 (Spec 0173 / Ticket 05)', () => {
  it('能精準解析標準條列式 7 步研報輸出', () => {
    const mockLlmOutput = `
### 【第 7 步】投資筆記（200 字極簡交易卡）(中砂 - 1560)
- 買進核心理由：台積電先進製程鑽石碟市佔率突破 70%，受惠 2nm 與 A16 放量成長動能明確。
- 目標價區間：420 元
- 停損價底線：295 元
- 核心論點失效條件（證偽開關 Kill-Switch）：台積電宣布導入非鑽石碟方案或單月營收年增率轉負。
- 預計持有週期：90 天（中期波段）
- 3 個追蹤觀察指標：次月營收年增率、外資連續買超、毛利率 > 38%
    `;

    const draft = parseLlmResponseToMemoDraft(mockLlmOutput);

    expect(draft.targetPrice).toBe(420);
    expect(draft.stopLossPrice).toBe(295);
    expect(draft.buyReason).toContain('台積電先進製程鑽石碟市佔率突破 70%');
    expect(draft.thesisInvalidation).toContain('台積電宣布導入非鑽石碟方案');
    expect(draft.holdingPeriodDays).toBe(90);
    expect(draft.trackingMetrics).toEqual([
      '次月營收年增率',
      '外資連續買超',
      '毛利率 > 38%',
    ]);
  });

  it('能相容冒號、粗體 Markdown 與英文字串格式', () => {
    const mockMarkdown = `
**Target Price**: 1200.5
**Stop Loss**: 880
**Catalyst**: 外資持續吃貨且突破箱頂防線。
**Kill Switch**: 營益率跌破 25% 或失去主力客戶。
**Holding Days**: 45
**Tracking Metrics**: 營收 YoY, 籌碼集中度, EPS
    `;

    const draft = parseLlmResponseToMemoDraft(mockMarkdown);

    expect(draft.targetPrice).toBe(1200.5);
    expect(draft.stopLossPrice).toBe(880);
    expect(draft.buyReason).toBe('外資持續吃貨且突破箱頂防線。');
    expect(draft.thesisInvalidation).toBe('營益率跌破 25% 或失去主力客戶。');
    expect(draft.holdingPeriodDays).toBe(45);
    expect(draft.trackingMetrics?.length).toBe(3);
  });

  it('若輸入非字串或未找到數字，應優雅返回空物件而不拋出錯誤', () => {
    const draft = parseLlmResponseToMemoDraft('今天天氣很好，沒有任何交易數據');
    expect(draft.targetPrice).toBeUndefined();
    expect(draft.stopLossPrice).toBeUndefined();
    expect(draft.buyReason).toBeUndefined();
  });
});
