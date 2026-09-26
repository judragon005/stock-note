import { describe, it, expect } from 'vitest';
import { getVerbBadgeColor } from './MainForceVerdictCard';
import type { MainForceVerdictData } from '../../../types/aiForceDashboard';

describe('MainForceVerdictCard & badge styling', () => {
  it('應該依據不同語意動詞給予對應的警示色彩', () => {
    const buyMeta = getVerbBadgeColor('積極進貨');
    expect(buyMeta.color).toBe('#ef4444');

    const sellMeta = getVerbBadgeColor('調節減碼');
    expect(sellMeta.color).toBe('#f59e0b');

    const heavySell = getVerbBadgeColor('賣壓沉重');
    expect(heavySell.color).toBe('#10b981');
  });

  it('應該完整相容 MainForceVerdictData 資料模型', () => {
    const mockData: MainForceVerdictData = {
      primaryVerb: '調節減碼',
      semanticTag: '法人動作',
      fullVerdictText:
        'AI 結論：經 5 日主力行為綜合研判（法人近 5 日合計 -64 張、收盤相對 20 日 VWAP +7.5%、RSI 60），法人小幅調節，短線宜區間操作。',
    };
    expect(mockData.primaryVerb).toBe('調節減碼');
    expect(mockData.semanticTag).toBe('法人動作');
  });
});
