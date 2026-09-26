import { describe, it, expect } from 'vitest';
import { getSignalLightColor, getVerdictBadgeConfig } from './DynamicSignalsCard';
import type { DynamicSignalsData } from '../../../types/aiForceDashboard';

describe('DynamicSignalsCard & signal mapping', () => {
  it('應該正確映射偏多/偏強為綠色系信號', () => {
    const light = getSignalLightColor('偏多偏強');
    expect(light.dot).toBe('#10b981');
    expect(light.color).toBe('#34d399');
  });

  it('應該正確映射高風險/偏空為紅色系信號', () => {
    const light = getSignalLightColor('波動高特偏高');
    expect(light.dot).toBe('#ef4444');
    expect(light.color).toBe('#f87171');
  });

  it('應該正確映射中性為黃色系信號', () => {
    const light = getSignalLightColor('籌碼中性');
    expect(light.dot).toBe('#f59e0b');
    expect(light.color).toBe('#fbbf24');
  });

  it('應該正確解析三色總評判標籤設定', () => {
    const redConfig = getVerdictBadgeConfig('RED');
    expect(redConfig.color).toBe('#ef4444');
    expect(redConfig.text).toContain('高風險');

    const yellowConfig = getVerdictBadgeConfig('YELLOW');
    expect(yellowConfig.color).toBe('#f59e0b');

    const greenConfig = getVerdictBadgeConfig('GREEN');
    expect(greenConfig.color).toBe('#10b981');
  });

  it('應該正確相容 DynamicSignalsData 資料模型', () => {
    const mockData: DynamicSignalsData = {
      trendSignal: '偏多偏強',
      chipSignal: '籌碼中性',
      momentumSignal: '動能偏強',
      riskSignal: '波動高特偏高',
      verdictLight: 'RED',
      verdictLabel: '紅燈 (高風險)',
    };
    expect(mockData.verdictLight).toBe('RED');
    expect(mockData.verdictLabel).toContain('紅燈');
  });
});
