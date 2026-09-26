import { describe, it, expect } from 'vitest';
import {
  synthesizeMainForceVerdict,
  type MainForceSemanticInput,
} from './mainForceSemanticEngine';

describe('mainForceSemanticEngine', () => {
  it('應該在法人減碼且股價高於 VWAP 時輸出「調節減碼」與對應文案', () => {
    const input: MainForceSemanticInput = {
      fiveDaysNetShares: -64,
      vwapBiasPercent: 7.5,
      rsi: 60,
    };
    const result = synthesizeMainForceVerdict(input);
    expect(result.primaryVerb).toBe('調節減碼');
    expect(result.semanticTag).toBe('法人動作');
    expect(result.fullVerdictText).toContain('法人近 5 日合計 -64 張');
    expect(result.fullVerdictText).toContain('收盤相對 20 日 VWAP +7.5%');
  });

  it('應該在法人大幅加碼且突破成本時輸出「積極進貨」', () => {
    const input: MainForceSemanticInput = {
      fiveDaysNetShares: 1500,
      vwapBiasPercent: 5.2,
      rsi: 68,
    };
    const result = synthesizeMainForceVerdict(input);
    expect(result.primaryVerb).toBe('積極進貨');
    expect(result.fullVerdictText).toContain('偏多');
  });

  it('應該在法人大幅賣超且跌破成本時輸出「停損撤退」', () => {
    const input: MainForceSemanticInput = {
      fiveDaysNetShares: -2500,
      vwapBiasPercent: -6.0,
      rsi: 32,
    };
    const result = synthesizeMainForceVerdict(input);
    expect(result.primaryVerb).toBe('賣壓沉重');
    expect(result.fullVerdictText).toContain('偏空');
  });

  it('應該在無特定極端特徵時輸出「洗盤震盪」或「區間整理」', () => {
    const input: MainForceSemanticInput = {
      fiveDaysNetShares: 10,
      vwapBiasPercent: 0.5,
      rsi: 50,
    };
    const result = synthesizeMainForceVerdict(input);
    expect(result.primaryVerb).toMatch(/整理|震盪/);
  });
});
