import { describe, it, expect } from 'vitest';
import { calculateValuationPercentile } from './aiForceDashboardEngine';

describe('calculateValuationPercentile - 機構級歷史倍數分位數演算法 (Spec 0199 Ticket 03)', () => {
  it('1. 正常個股 PE 數列應能正確計算 Min / Median / Max 與百分位數 (PR)', () => {
    // 假設歷史 PE 數列: [12, 15, 18, 20, 25, 30]
    const history = [
      { pe: 12, pb: 1.5 },
      { pe: 15, pb: 1.8 },
      { pe: 18, pb: 2.0 },
      { pe: 20, pb: 2.2 },
      { pe: 25, pb: 2.8 },
      { pe: 30, pb: 3.5 },
    ];

    // 當前 PE = 13 (介於 12 與 15 之間，PR = 1/6 ~= 16.7% -> 低估便宜)
    const resultLow = calculateValuationPercentile(13, 1.6, history);
    expect(resultLow.peMin).toBe(12);
    expect(resultLow.peMax).toBe(30);
    expect(resultLow.peMedian).toBe(19); // (18 + 20) / 2
    expect(resultLow.pePercentile).toBe(17);
    expect(resultLow.valuationTier).toBe('UNDERVALUED');
    expect(resultLow.valuationTierText).toContain('自身歷史偏低');

    // 當前 PE = 28 (高於 5 筆，PR = 5/6 ~= 83.3% -> 高估偏貴)
    const resultHigh = calculateValuationPercentile(28, 3.2, history);
    expect(resultHigh.pePercentile).toBe(83);
    expect(resultHigh.valuationTier).toBe('OVERVALUED');
    expect(resultHigh.valuationTierText).toContain('自身歷史偏高');

    // 當前 PE = 19 (合理常態區間)
    const resultFair = calculateValuationPercentile(19, 2.1, history);
    expect(resultFair.valuationTier).toBe('FAIR');
    expect(resultFair.valuationTierText).toContain('自身歷史常態');
  });

  it('2. 虧損期或本益比失真 (PE <= 0 或無 PE) 應自動防禦切換至 PB 歷史分位數', () => {
    const history = [
      { pe: null, pb: 1.0 },
      { pe: -5, pb: 1.2 },
      { pe: null, pb: 1.5 },
      { pe: null, pb: 2.0 },
      { pe: 45, pb: 3.0 },
    ];

    // 當前 PE 負數或為空，但 PB = 1.1 (PR = 1/5 = 20% -> 低估便宜)
    const resultLoss = calculateValuationPercentile(null, 1.1, history);
    expect(resultLoss.pbMin).toBe(1.0);
    expect(resultLoss.pbMax).toBe(3.0);
    expect(resultLoss.pbMedian).toBe(1.5);
    expect(resultLoss.pbPercentile).toBe(20);
    expect(resultLoss.valuationTier).toBe('UNDERVALUED');
    expect(resultLoss.valuationTierText).toContain('自身歷史偏低');
  });

  it('3. 當歷史樣本數不足 (< 1 筆) 時應優雅降級為全市場常態判斷', () => {
    const resultEmpty = calculateValuationPercentile(18.5, 2.2, []);
    expect(resultEmpty.sampleCount).toBe(0);
    expect(resultEmpty.valuationTier).toBe('FAIR');
    expect(resultEmpty.valuationTierText).toContain('合理估值區間');
  });
});
