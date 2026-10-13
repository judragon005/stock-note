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
      compositeScore: 35,
    };
    expect(mockData.verdictLight).toBe('RED');
    expect(mockData.verdictLabel).toContain('紅燈');
  });

  describe('DynamicSignalsCard UI 渲染驗證 (Spec 0179 / Ticket 04)', () => {
    it('綠燈情境：底層與頂部應動態連動綠色呼吸光暈 (#10b981)，徹底廢除硬編碼純紅燈', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { DynamicSignalsCard } = await import('./DynamicSignalsCard');

      const greenData: DynamicSignalsData = {
        trendSignal: '偏多偏強',
        chipSignal: '土洋合買',
        momentumSignal: '動能偏強',
        riskSignal: '風險可控',
        verdictLight: 'GREEN',
        verdictLabel: '綠燈 (偏多 / 安全)',
        compositeScore: 82,
        actionableAdvice: '量價齊揚、籌碼高度集中，波段多頭共振主升趨勢明確。',
      };

      const html = renderToStaticMarkup(React.createElement(DynamicSignalsCard, { data: greenData }));

      // 驗證底部燈號動態呈現綠燈與 #10b981
      expect(html).toContain('綠燈');
      expect(html).toContain('#10b981');
      expect(html).toContain('82'); // 綜合量化分
      expect(html).toContain('共振主升');
    });

    it('四重視角 Bento 結構：應整合交易所監理、券商維持率、VWAP 偏離與關鍵防守價', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { DynamicSignalsCard } = await import('./DynamicSignalsCard');

      const multiData: DynamicSignalsData = {
        trendSignal: '破線偏空',
        chipSignal: '籌碼集中',
        momentumSignal: '動能超跌',
        riskSignal: '破位警戒',
        verdictLight: 'YELLOW',
        verdictLabel: '黃燈 (觀望 / 中性)',
        compositeScore: 48,
        regulatoryBadge: '處置股票 (分盤撮合)',
        brokerMarginAlert: '融資浮額沉重 / 斷頭防守警戒',
        vwapBiasStdText: '-2.1σ 超跌',
        actionableAdvice: '主力逆勢吸籌但短線破線，疑似洗盤破底翻觀察區。建議觀望勿殺低。',
        keySupportPrice: 95.5,
        keyPressurePrice: 104.0,
      };

      const html = renderToStaticMarkup(React.createElement(DynamicSignalsCard, { data: multiData }));

      expect(html).toContain('處置股票 (分盤撮合)');
      expect(html).toContain('融資浮額沉重 / 斷頭防守警戒');
      expect(html).toContain('-2.1σ 超跌');
      expect(html).toContain('95.5');
      expect(html).toContain('104');
      expect(html).toContain('洗盤破底翻');
    });
  });
});
