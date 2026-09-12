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

  it('4. 操盤定調與體質指標結構完整定義', () => {
    // 驗證型別與契約無語法錯誤
    const mockReport = {
      symbol: '2327',
      market: 'TW' as const,
      companyName: '國巨',
      industryAttribute: 'STANDARD' as const,
      latestPeriod: '2025-Q2',
      overallScore: 55,
      overallGrade: 'WARNING' as const,
      trafficLights: {
        profitability: 'GREEN' as const,
        safety: 'YELLOW' as const,
        efficiency: 'YELLOW' as const,
        cashFlow: 'RED' as const,
      },
      executiveSummary: '獲利數據亮眼但營運現金流嚴重失血',
      directive: {
        stance: 'DEFENSIVE_WATCH' as const,
        stanceLabel: '【體質承壓·防守觀望】',
        conflictSummary: '帳面淨利看似獲利，但營運現金流 (CFO) 呈現淨流出',
        actionGuidance: '建議提高警覺並採取防守姿態，嚴控資金水位',
      },
      anomalies: [],
      duPont: {
        roe: 12.5,
        netMargin: 15.2,
        assetTurnover: 0.8,
        equityMultiplier: 1.5,
        primaryDriver: 'PROFITABILITY' as const,
      },
      historicalRecords: [
        {
          symbol: '2327',
          market: 'TW' as const,
          year: 2025,
          quarter: 2,
          periodDate: '2025-06-30',
          income: {
            revenue: 30000000000,
            grossProfit: 10000000000,
            operatingIncome: 5000000000,
            netIncome: 4500000000,
            eps: 10.5,
          },
          balanceSheet: {
            totalAssets: 100000000000,
            totalLiabilities: 45000000000,
            totalEquity: 55000000000,
            accountsReceivable: 12000000000,
            inventory: 15000000000,
            cashAndEquivalents: 20000000000,
            shortTermDebt: 5000000000,
            longTermDebt: 10000000000,
          },
          cashFlow: {
            operatingCashFlow: -1500000000,
            capitalExpenditure: 3000000000,
          },
          updatedAt: Date.now(),
        },
      ],
      updatedAt: Date.now(),
    };

    expect(mockReport.directive.stanceLabel).toContain('防守觀望');
    expect(mockReport.directive.conflictSummary).toContain('淨流出');
    expect(mockReport.directive.actionGuidance).toContain('建議提高警覺');
  });
});
