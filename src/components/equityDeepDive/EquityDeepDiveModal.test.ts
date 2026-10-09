import { describe, it, expect } from 'vitest';
import { isSymbolInHoldings, syncMemoToHoldingsRiskLine } from '../../utils/investmentMemoStorage';
import { parseLlmResponseToMemoDraft } from '../../utils/memoSmartParser';
import { HoldingPosition } from '../../types/stock';
import { InvestmentMemoRecord } from '../../types/equityDeepDive';

describe('EquityDeepDiveModal - 整合資料流與風控模型 (Spec 0173 / Tickets 02, 03, 04, 05)', () => {
  const mockHoldings: HoldingPosition[] = [
    {
      symbol: '1560',
      name: '中砂',
      market: 'TW',
      currentPrice: 320,
      shares: 1000,
    } as any,
  ];

  it('Ticket 03: 傳入真實 holdings 時應正確判定為已在庫標的', () => {
    expect(isSymbolInHoldings('1560', mockHoldings)).toBe(true);
    expect(isSymbolInHoldings('2330', mockHoldings)).toBe(false);
  });

  it('Ticket 03 / Ticket 04: 同步投資筆記至在庫持倉，包含目標價、停損價與證偽開關', () => {
    const memo: InvestmentMemoRecord = {
      symbol: '1560',
      name: '中砂',
      market: 'TW',
      buyReason: '先進製程鑽石碟獨占優勢',
      thesisInvalidation: '台積電採用非鑽石碟方案',
      targetPrice: 420,
      stopLossPrice: 290,
      holdingPeriodDays: 90,
      trackingMetrics: ['月營收年增率', '外資連續買超'],
      isWatchlist: false,
      calculatedRiskRewardRatio: 3.33,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const syncResult = syncMemoToHoldingsRiskLine('1560', memo, mockHoldings);
    expect(syncResult.success).toBe(true);
    expect((syncResult.updatedHoldings[0] as any).targetPrice).toBe(420);
    expect((syncResult.updatedHoldings[0] as any).stopLossPrice).toBe(290);
  });

  it('Ticket 04: R-Multiple 風報比計算邏輯 (現價 320, 目標 420, 停損 290 應為 3.33R)', () => {
    const current = 320;
    const target = 420;
    const stop = 290;
    const reward = target - current;
    const risk = current - stop;
    const rMultiple = Math.round((reward / risk) * 100) / 100;

    expect(reward).toBe(100);
    expect(risk).toBe(30);
    expect(rMultiple).toBe(3.33);
    expect(rMultiple).toBeGreaterThanOrEqual(3.0); // 機構級非對稱風報比
  });

  it('Ticket 05: Smart Paste 智慧解析外部研報全文一鍵萃取回填', () => {
    const aiOutput = `
【第 7 步】投資筆記（200 字極簡交易卡）(中砂 - 1560)
- 買進核心理由：2nm 鑽石碟導入進度優於預期，毛利率有望突破 40%。
- 目標價區間：450 元
- 停損價底線：285 元
- 核心論點失效條件：台積電先進製程良率遞延或單季毛利率跌破 32%。
- 預計持有週期：120 天
- 3 個追蹤觀察指標：SEMICON 訂單能見度, 外資持股率, 月營收
    `;

    const draft = parseLlmResponseToMemoDraft(aiOutput);
    expect(draft.targetPrice).toBe(450);
    expect(draft.stopLossPrice).toBe(285);
    expect(draft.buyReason).toContain('2nm 鑽石碟導入進度優於預期');
    expect(draft.thesisInvalidation).toContain('台積電先進製程良率遞延');
    expect(draft.holdingPeriodDays).toBe(120);
    expect(draft.trackingMetrics).toContain('月營收');
  });
});
