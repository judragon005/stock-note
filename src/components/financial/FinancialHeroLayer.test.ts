import { describe, it, expect } from 'vitest';
import {
  getGradeColorClass,
  getTrafficLightBadgeInfo,
  getIndustryBadgeInfo,
} from './FinancialHeroLayer';

describe('FinancialHeroLayer (Layer 1 UI Logic & Seam Tests)', () => {
  it('1. 綜合評分評級顏色映射正確', () => {
    expect(getGradeColorClass('EXCELLENT')).toContain('emerald');
    expect(getGradeColorClass('HEALTHY')).toContain('blue');
    expect(getGradeColorClass('WARNING')).toContain('amber');
    expect(getGradeColorClass('DANGEROUS')).toContain('rose');
  });

  it('2. 四大維度體質指示燈文字與背景色映射正確', () => {
    const greenInfo = getTrafficLightBadgeInfo('GREEN');
    expect(greenInfo.text).toBe('正常健全');
    expect(greenInfo.bgClass).toContain('emerald');

    const yellowInfo = getTrafficLightBadgeInfo('YELLOW');
    expect(yellowInfo.text).toBe('體質警戒');
    expect(yellowInfo.bgClass).toContain('amber');

    const redInfo = getTrafficLightBadgeInfo('RED');
    expect(redInfo.text).toBe('重大風險');
    expect(redInfo.bgClass).toContain('rose');

    const grayInfo = getTrafficLightBadgeInfo('GRAY');
    expect(grayInfo.text).toBe('不適用');
    expect(grayInfo.bgClass).toContain('slate');
  });

  it('3. 產業屬性徽章判斷正確', () => {
    const finInfo = getIndustryBadgeInfo('FINANCIALS');
    expect(finInfo.label).toContain('金融保險');
    expect(finInfo.exemptNote).toContain('豁免');

    const cycInfo = getIndustryBadgeInfo('CYCLICAL');
    expect(cycInfo.label).toContain('景氣循環');
    expect(cycInfo.exemptNote).toContain('週期高點');

    const stdInfo = getIndustryBadgeInfo('STANDARD');
    expect(stdInfo.label).toContain('標準模型');
    expect(stdInfo.exemptNote).toBe('');
  });
});
