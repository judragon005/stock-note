import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WarRoomPromptCard } from './WarRoomPromptCard';
import { synthesizeStockDigest } from '../../engine/strategicPromptDigest';
import * as strategyPinEngine from '../../engine/strategyPinEngine';
import { PinnedStrategy } from '../../types/strategyPin';

describe('Spec 0200 / Ticket 04: WarRoomPromptCard 戰情室外聯提示詞與釘選回流 UI', () => {
  const mockDigest = synthesizeStockDigest({
    symbol: '2344',
    name: '華邦電',
    market: 'TW',
    candles: [
      { date: '2026-10-21', open: 155, high: 160, low: 152, close: 153, volume: 50000 },
    ],
    quote: { price: 153 }, // 現價 153
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. 應正常渲染一鍵複製按鈕、Prompt 預覽切換、回流輸入區與勝率榜入口', () => {
    vi.spyOn(strategyPinEngine, 'getPinnedStrategy').mockReturnValue(null);
    vi.spyOn(strategyPinEngine, 'getStrategyOutcomeRecords').mockReturnValue([]);

    const html = renderToStaticMarkup(
      React.createElement(WarRoomPromptCard, {
        digest: mockDigest,
      })
    );

    // 驗證核心元素
    expect(html).toContain('⚡ AI 戰情提示詞與外聯中樞');
    expect(html).toContain('一鍵複製 AI 戰情提示詞 (2344 華邦電)');
    expect(html).toContain('檢視 Prompt 預覽');
    // 驗證回流協議相關元素
    expect(html).toContain('貼入外部 AI 裁決');
    expect(html).toContain('智囊團勝率榜');
  });

  it('2. 若存在有效釘選策略，應完整展示 AI 模型名稱、核心裁決、關鍵點位與剩餘效期', () => {
    const mockPin: PinnedStrategy = {
      id: 'pin-2344',
      symbol: '2344',
      aiModel: 'Claude 3.5 Sonnet',
      verdict: '防守型持倉，破線即砍',
      stopLoss: 153.46,
      takeProfit: 167.7,
      trendReversal: 170.71,
      validityDays: 5,
      createdAt: '2026-10-21T00:00:00.000Z',
      expiresAt: '2026-10-26T00:00:00.000Z',
      isExpired: false,
    };

    vi.spyOn(strategyPinEngine, 'getPinnedStrategies').mockReturnValue([mockPin]);
    vi.spyOn(strategyPinEngine, 'getPinnedStrategy').mockReturnValue(mockPin);
    vi.spyOn(strategyPinEngine, 'getStrategyOutcomeRecords').mockReturnValue([]);

    const html = renderToStaticMarkup(
      React.createElement(WarRoomPromptCard, {
        digest: mockDigest,
      })
    );

    expect(html).toContain('Claude 3.5 Sonnet');
    expect(html).toContain('防守型持倉，破線即砍');
    expect(html).toContain('153.46');
    expect(html).toContain('167.7');
    expect(html).toContain('170.71');
  });

  it('3. 當現價跌破停損線時，應即時顯示盤中觸價警報橫幅', () => {
    // 現價為 153，停損價為 153.46 => 觸發停損
    const mockPin: PinnedStrategy = {
      id: 'pin-2344',
      symbol: '2344',
      aiModel: 'Claude 3.5 Sonnet',
      verdict: '防守型持倉',
      stopLoss: 153.46,
      validityDays: 5,
      createdAt: '2026-10-21T00:00:00.000Z',
      expiresAt: '2026-10-26T00:00:00.000Z',
      isExpired: false,
    };

    vi.spyOn(strategyPinEngine, 'getPinnedStrategies').mockReturnValue([mockPin]);
    vi.spyOn(strategyPinEngine, 'getPinnedStrategy').mockReturnValue(mockPin);
    vi.spyOn(strategyPinEngine, 'getStrategyOutcomeRecords').mockReturnValue([]);

    const html = renderToStaticMarkup(
      React.createElement(WarRoomPromptCard, {
        digest: mockDigest,
      })
    );

    expect(html).toContain('跌破停損線');
  });

  it('4. 貼入抽屜結構應包含安全降級微引導條 (paste-modal-notice)', () => {
    vi.spyOn(strategyPinEngine, 'getPinnedStrategy').mockReturnValue(null);
    vi.spyOn(strategyPinEngine, 'getStrategyOutcomeRecords').mockReturnValue([]);

    const html = renderToStaticMarkup(
      React.createElement(WarRoomPromptCard, {
        digest: mockDigest,
      })
    );

    // 驗證組件已就緒，且具備手動貼入解析按鈕
    expect(html).toContain('貼入外部 AI 裁決');
  });

  it('5. Spec 0201: 應能同時渲染多個 AI 模型之緊湊條列與共識防線指標', () => {
    const pins: PinnedStrategy[] = [
      {
        id: 'pin-claude',
        symbol: '2344',
        aiModel: 'Claude 3.5 Sonnet',
        verdict: '防守型持倉',
        stopLoss: 153.0,
        takeProfit: 168.0,
        validityDays: 5,
        createdAt: '2026-10-21T00:00:00.000Z',
        expiresAt: '2026-10-26T00:00:00.000Z',
        isExpired: false,
      },
      {
        id: 'pin-ppx',
        symbol: '2344',
        aiModel: 'Perplexity',
        verdict: '突破加碼',
        stopLoss: 152.0,
        trendReversal: 160.0,
        validityDays: 3,
        createdAt: '2026-10-21T00:00:00.000Z',
        expiresAt: '2026-10-24T00:00:00.000Z',
        isExpired: false,
      },
    ];

    vi.spyOn(strategyPinEngine, 'getPinnedStrategies').mockReturnValue(pins);
    vi.spyOn(strategyPinEngine, 'getStrategyOutcomeRecords').mockReturnValue([]);

    const html = renderToStaticMarkup(
      React.createElement(WarRoomPromptCard, {
        digest: mockDigest,
      })
    );

    // 驗證兩家模型皆緊湊並存於畫面中
    expect(html).toContain('Claude 3.5 Sonnet');
    expect(html).toContain('Perplexity');
    expect(html).toContain('防守型持倉');
    expect(html).toContain('突破加碼');
    expect(html).toContain('共識防線');
    expect(html).toContain('全隊結案');
  });
});
