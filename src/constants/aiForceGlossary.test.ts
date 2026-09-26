import { describe, it, expect } from 'vitest';
import {
  AI_FORCE_GLOSSARY,
  getGlossaryEntry,
  diagnoseMainForceCost,
  diagnoseDayTradeRisk,
  diagnoseForecastCone,
  diagnoseBullBearEnergy,
  diagnoseHealthScore,
} from './aiForceGlossary';

describe('AI Force Glossary 領域字典', () => {
  it('應包含所有 18 大卡片與 Header 核心名詞', () => {
    const requiredKeys = [
      'openPrice',
      'closePrice',
      'volumeShares',
      'transactionCount',
      'ma5',
      'ma10',
      'ma20',
      'ma60',
      'highResistance',
      'mainForceCost',
      'supportLevel',
      'kd',
      'macd',
      'rsi',
      'decisionTrend',
      'shortTermState',
      'mainForceAction',
      'chipStructure',
      'dayTradeRisk',
      'chipHealth',
      'radarInstitutional',
      'radarTrend',
      'radarChips',
      'radarLiquidity',
      'radarVolatility',
      'radarMomentum',
      'volumeResistance',
      'volumeHeavy',
      'volumeDense',
      'volumeBreakeven',
      'volumeSupport',
      'forecastUp',
      'forecastRange',
      'forecastDown',
      'annualDrift',
      'vwap20',
      'foreignFlow',
      'trustFlow',
      'dealerFlow',
      'totalInstFlow',
      'turnoverRate',
      'dayTradeRatio',
      'pullbackRisk',
      'intradayVolatility',
      'bullEnergy',
      'bearEnergy',
      'bullBearRatio',
      'chipsHealth',
      'techHealth',
      'momentumHealth',
      'volatilityRisk',
      'instSupport',
      'trafficLight',
      'retailSentiment',
      'instSentiment',
      'mainSentiment',
      'aiConfidence',
      'bigBuyerFlow',
      'retailBuyerFlow',
      'retailSellerFlow',
      'bullStrength',
      'bearStrength',
      'mlpSemanticVerdict',
    ];

    for (const key of requiredKeys) {
      expect(AI_FORCE_GLOSSARY[key]).toBeDefined();
      const entry = AI_FORCE_GLOSSARY[key];
      expect(entry.term).toBeTruthy();
      expect(entry.metaphor).toBeTruthy();
      expect(entry.meaning).toBeTruthy();
      expect(entry.buySignal).toBeTruthy();
      expect(entry.sellSignal).toBeTruthy();
    }
  });

  it('getGlossaryEntry 應能正確依 ID 檢索，無效 ID 回傳 undefined', () => {
    expect(getGlossaryEntry('mainForceCost')?.term).toBe('主力成本');
    expect(getGlossaryEntry('non_existing_term_id')).toBeUndefined();
  });

  describe('即時動態數據診斷函式 (Dynamic Diagnosis)', () => {
    it('diagnoseMainForceCost 應依現價與主力成本高低判定多空與乖離', () => {
      // 現價 1240 高於主力成本 1138.81
      const bullishResult = diagnoseMainForceCost(1240, 1138.81);
      expect(bullishResult).toContain('1,240');
      expect(bullishResult).toContain('1,138.81');
      expect(bullishResult).toContain('高於');
      expect(bullishResult).toContain('偏多');

      // 現價 1000 跌破主力成本 1138.81
      const bearishResult = diagnoseMainForceCost(1000, 1138.81);
      expect(bearishResult).toContain('1,000');
      expect(bearishResult).toContain('跌破');
      expect(bearishResult).toContain('偏空');
      expect(bearishResult).toContain('停損');
    });

    it('diagnoseDayTradeRisk 應依沖銷比例與風險百分比給予開盤防禦警示', () => {
      const highRisk = diagnoseDayTradeRisk(53, 75);
      expect(highRisk).toContain('隔日沖比例偏高');
      expect(highRisk).toContain('開高');

      const lowRisk = diagnoseDayTradeRisk(15, 20);
      expect(lowRisk).toContain('風險較低');
    });

    it('diagnoseForecastCone 應依上漲與下跌機率給予方向指引', () => {
      const up = diagnoseForecastCone(48, 44);
      expect(up).toContain('上漲機率');

      const down = diagnoseForecastCone(20, 65);
      expect(down).toContain('下跌風險');
    });

    it('diagnoseBullBearEnergy 應依多空能量比給出拔河優勢評判', () => {
      const bull = diagnoseBullBearEnergy(55, 45, 1.22);
      expect(bull).toContain('多方佔優');

      const bear = diagnoseBullBearEnergy(40, 60, 0.67);
      expect(bear).toContain('空方佔優');
    });

    it('diagnoseHealthScore 應依綜合分數給出健康評級', () => {
      expect(diagnoseHealthScore(85)).toContain('體質優良');
      expect(diagnoseHealthScore(50)).toContain('體質偏弱');
    });
  });
});
