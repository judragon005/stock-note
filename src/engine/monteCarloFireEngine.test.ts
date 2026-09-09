import { describe, it, expect } from 'vitest';
import {
  generateStandardNormal,
  runMonteCarloFIRESimulation,
} from './monteCarloFireEngine';
import { MonteCarloSimulationConfig } from '../types/firePlanning';

describe('monteCarloFireEngine (蒙地卡羅退休提領與安全提領率引擎)', () => {
  describe('generateStandardNormal (Box-Muller 常態亂數生成器)', () => {
    it('抽樣 10,000 次之均值應接近 0，標準差應接近 1', () => {
      const N = 10_000;
      const samples: number[] = [];
      let sum = 0;

      for (let i = 0; i < N; i++) {
        const val = generateStandardNormal();
        samples.push(val);
        sum += val;
      }

      const mean = sum / N;
      expect(Math.abs(mean)).toBeLessThan(0.05); // |均值| < 0.05

      let varianceSum = 0;
      for (const val of samples) {
        varianceSum += Math.pow(val - mean, 2);
      }
      const stdDev = Math.sqrt(varianceSum / (N - 1));
      expect(Math.abs(stdDev - 1.0)).toBeLessThan(0.05); // |標準差 - 1| < 0.05
    });
  });

  describe('runMonteCarloFIRESimulation (1,000 次路徑與提領策略)', () => {
    const baseConfig: MonteCarloSimulationConfig = {
      initialPortfolioValue: 15_000_000,    // 1,500 萬台幣
      annualExpenditureTargetTwd: 600_000,  // 年支出 60 萬 (4% 初始提領率)
      yearsToSimulate: 30,                  // 模擬 30 年
      expectedAnnualReturn: 0.07,           // 年化預期報酬 7%
      annualVolatility: 0.15,               // 年化波動度 15%
      annualInflationRate: 0.025,           // 通膨率 2.5%
      dividendYield: 0.04,                  // 股息殖利率 4%
      strategy: 'FIXED_PERCENT_INFLATION_ADJUSTED',
      simulationRuns: 1_000,
    };

    it('在經典 Trinity 4% 法則下應產出 30 年百分位數錐形圖與成功率', () => {
      const result = runMonteCarloFIRESimulation(baseConfig);

      expect(result.simulationRuns).toBe(1_000);
      expect(result.percentileTracks.length).toBe(31); // 0..30 年
      expect(result.successRate).toBeGreaterThan(70);  // 4% 提領在 7% 期望報酬下應有顯著成功率
      expect(result.ruinProbability).toBe(Number((100 - result.successRate).toFixed(1)));

      // 驗證百分位數單調性: P10 <= P25 <= P50 <= P75 <= P90
      for (const track of result.percentileTracks) {
        expect(track.p10).toBeLessThanOrEqual(track.p25);
        expect(track.p25).toBeLessThanOrEqual(track.p50);
        expect(track.p50).toBeLessThanOrEqual(track.p75);
        expect(track.p75).toBeLessThanOrEqual(track.p90);
        expect(track.p10).toBeGreaterThanOrEqual(0); // 資產不得為負
      }
    });

    it('Guyton-Klinger 動態護欄策略應能提供靈活提領調節，並有效防範順序報酬破產', () => {
      const gkConfig: MonteCarloSimulationConfig = {
        ...baseConfig,
        strategy: 'GUYTON_KLINGER_GUARDRAILS',
      };
      const result = runMonteCarloFIRESimulation(gkConfig);
      expect(result.percentileTracks.length).toBe(31);
      expect(result.successRate).toBeGreaterThan(0);
      expect(result.medianFinalNetWorthTwd).toBeGreaterThan(0);
    });

    it('純股息本金保全模式 (DIVIDEND_ONLY_PRESERVATION) 破產率應嚴格為 0%', () => {
      const divOnlyConfig: MonteCarloSimulationConfig = {
        ...baseConfig,
        strategy: 'DIVIDEND_ONLY_PRESERVATION',
      };
      const result = runMonteCarloFIRESimulation(divOnlyConfig);
      // 純股息不賣母本，破產率應為 0
      expect(result.ruinProbability).toBe(0);
      expect(result.successRate).toBe(100);
      expect(result.runsExhaustedBeforeYear10).toBe(0);
    });

    it('安全提領率 (safeWithdrawalRateMax) 逆運算應求出介於 1% ~ 10% 之間的有效數值', () => {
      const result = runMonteCarloFIRESimulation(baseConfig);
      expect(result.safeWithdrawalRateMax).toBeGreaterThanOrEqual(1.0);
      expect(result.safeWithdrawalRateMax).toBeLessThanOrEqual(10.0);
    });

    it('極端邊界：若初始提領額大於初始總資產，成功率應降為 0%', () => {
      const bankruptConfig: MonteCarloSimulationConfig = {
        ...baseConfig,
        initialPortfolioValue: 500_000,     // 50 萬本金
        annualExpenditureTargetTwd: 1_000_000, // 每年想領 100 萬
      };
      const result = runMonteCarloFIRESimulation(bankruptConfig);
      expect(result.successRate).toBe(0);
      expect(result.ruinProbability).toBe(100);
      expect(result.runsExhaustedBeforeYear10).toBe(1_000);
    });
  });
});
