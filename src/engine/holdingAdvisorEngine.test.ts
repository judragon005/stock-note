import { describe, it, expect } from 'vitest';
import {
  evaluateHoldingActionDirective,
  buildAiAdvisorPromptPayload,
} from './holdingAdvisorEngine';
import { HoldingSignal, TechnicalIndicators } from '../types/signal';
import { HoldingPosition } from '../types/stock';

describe('holdingAdvisorEngine (持股智慧操作建議引擎)', () => {
  describe('evaluateHoldingActionDirective (確定性規則操作建議評定)', () => {
    it('在多頭訊號群集且得分高時，應給出【強勢續抱】', () => {
      const signals: HoldingSignal[] = [
        { id: 'MA_ABOVE_5', label: '5日線之上', category: 'MA_LEVEL', tone: 'BULLISH', weight: 1 },
        { id: 'MA_ABOVE_20', label: '月線之上', category: 'MA_LEVEL', tone: 'BULLISH', weight: 2 },
        { id: 'MA_ABOVE_60', label: '季線之上', category: 'MA_LEVEL', tone: 'BULLISH', weight: 2 },
        { id: 'KD_K_SURGE_9', label: '9日K大幅拉升', category: 'MOMENTUM', tone: 'BULLISH', weight: 2 },
      ];

      const directive = evaluateHoldingActionDirective(signals);
      expect(directive.headline).toBe('【強勢續抱】');
      expect(directive.sentiment).toBe('STRONG_BUY');
      expect(directive.score).toBe(7);
      expect(directive.advice).toContain('多頭');
    });

    it('在均線破位但落入 KD 超賣區時，應給出【超跌留意】避免殺低', () => {
      const signals: HoldingSignal[] = [
        { id: 'MA_BELOW_5', label: '5日線之下', category: 'MA_LEVEL', tone: 'BEARISH', weight: -1 },
        { id: 'MA_BELOW_20', label: '月線之下', category: 'MA_LEVEL', tone: 'BEARISH', weight: -2 },
        { id: 'KD_OVERSOLD', label: 'KD超賣區', category: 'MOMENTUM', tone: 'WARNING', weight: -1 },
      ];

      const directive = evaluateHoldingActionDirective(signals);
      expect(directive.headline).toBe('【超跌留意】');
      expect(directive.sentiment).toBe('ACCUMULATE');
      expect(directive.advice).toContain('超賣');
    });

    it('在空頭破位且創單週新低時，應給出【嚴設停損】或【弱勢防守】', () => {
      const signals: HoldingSignal[] = [
        { id: 'MA_BELOW_5', label: '5日線之下', category: 'MA_LEVEL', tone: 'BEARISH', weight: -1 },
        { id: 'MA_BELOW_20', label: '月線之下', category: 'MA_LEVEL', tone: 'BEARISH', weight: -2 },
        { id: 'MA_BELOW_60', label: '季線之下', category: 'MA_LEVEL', tone: 'BEARISH', weight: -2 },
        { id: 'PRICE_WEEK_LOW', label: '創單週新低', category: 'PRICE_EXTREME', tone: 'BEARISH', weight: -2 },
      ];

      const directive = evaluateHoldingActionDirective(signals);
      expect(directive.headline).toBe('【嚴設停損】');
      expect(directive.sentiment).toBe('STOP_LOSS_EXIT');
      expect(directive.score).toBe(-7);
      expect(directive.advice).toContain('停損');
    });

    it('在多空互相抵銷或無明顯方向時，應給出【盤整觀望】', () => {
      const signals: HoldingSignal[] = [
        { id: 'MA_ABOVE_5', label: '5日線之上', category: 'MA_LEVEL', tone: 'BULLISH', weight: 1 },
        { id: 'MA_BELOW_20', label: '月線之下', category: 'MA_LEVEL', tone: 'BEARISH', weight: -2 },
        { id: 'MA_ABOVE_120', label: '半年線之上', category: 'MA_LEVEL', tone: 'NEUTRAL', weight: 1 },
      ];

      const directive = evaluateHoldingActionDirective(signals);
      expect(directive.headline).toBe('【盤整觀望】');
      expect(directive.sentiment).toBe('WAIT_AND_SEE');
      expect(directive.score).toBe(0);
    });

    it('無任何訊號傳入時，應安全回傳預設中性觀望建議，不拋出異常', () => {
      const directive = evaluateHoldingActionDirective([]);
      expect(directive.headline).toBe('【盤整觀望】');
      expect(directive.sentiment).toBe('WAIT_AND_SEE');
      expect(directive.score).toBe(0);
    });
  });

  describe('buildAiAdvisorPromptPayload (AI 深度分析 Payload 建構)', () => {
    it('應能產出符合 LLM 規格之結構化 JSON 物件', () => {
      const holding: Partial<HoldingPosition> = {
        symbol: '00924',
        name: '復華S&P500成長',
        shares: 10000,
        avgCost: 24.5,
        currentPrice: 25.8,
        unrealizedPnL: 13000,
        unrealizedPnLPercent: 5.3,
      };

      const signals: HoldingSignal[] = [
        { id: 'MA_ABOVE_20', label: '月線之上', category: 'MA_LEVEL', tone: 'BULLISH', weight: 2 },
      ];

      const indicators: TechnicalIndicators = {
        currentPrice: 25.8,
        ma5: 25.5,
        ma20: 25.0,
      };

      const payload = buildAiAdvisorPromptPayload(holding as HoldingPosition, signals, indicators);
      expect(payload.symbol).toBe('00924');
      expect(payload.signals).toHaveLength(1);
      expect(payload.technicalIndicators.ma20).toBe(25.0);
    });
  });
});
