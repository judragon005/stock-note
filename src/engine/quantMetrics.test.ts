import { describe, it, expect } from 'vitest';
import {
  calculateDailyReturns,
  calculateAnnualizedVolatility,
  calculateMaxDrawdown,
  calculateSharpeRatio,
  calculateBetaAndCorrelation,
  calculateJensensAlpha,
  calculateQuantMetrics,
  getQuantMetricDiagnosis,
} from './quantMetrics';
import { QuantPerformanceMetrics } from '../types/stock';

describe('量化統計與風險調整指標計算引擎 (quantMetrics)', () => {
  describe('1. 日報酬率與波動度計算 (calculateDailyReturns & calculateAnnualizedVolatility)', () => {
    it('應正確計算日收益率序列', () => {
      const prices = [100, 105, 102.9];
      const returns = calculateDailyReturns(prices);
      expect(returns.length).toBe(2);
      expect(returns[0]).toBeCloseTo(0.05, 4);
      expect(returns[1]).toBeCloseTo(-0.02, 4);
    });

    it('價格序列少於 2 筆時應回傳空日報酬率', () => {
      expect(calculateDailyReturns([100])).toEqual([]);
      expect(calculateDailyReturns([])).toEqual([]);
    });

    it('應正確計算年化波動度 (標準差 * sqrt(252))', () => {
      // 假設每天固定漲 1%，標準差為 0，波動度為 0%
      const returns = [0.01, 0.01, 0.01, 0.01];
      expect(calculateAnnualizedVolatility(returns)).toBe(0);

      // 給定標準差的收益率
      const variableReturns = [0.02, -0.01, 0.03, -0.02];
      const vol = calculateAnnualizedVolatility(variableReturns);
      expect(vol).toBeGreaterThan(0);
    });
  });

  describe('2. 歷史最大回撤 (calculateMaxDrawdown)', () => {
    it('單調上升數列最大回撤應為 0%', () => {
      const values = [100, 110, 120, 130];
      expect(calculateMaxDrawdown(values)).toBe(0);
    });

    it('應正確捕捉歷史最高點到波谷的最大回撤 (100 -> 150 -> 90 -> 120 -> MDD = 40%)', () => {
      const values = [100, 150, 90, 120];
      // (150 - 90) / 150 = 60 / 150 = 40%
      expect(calculateMaxDrawdown(values)).toBe(40);
    });

    it('數列為空或單一值時 MDD 應為 0', () => {
      expect(calculateMaxDrawdown([])).toBe(0);
      expect(calculateMaxDrawdown([100])).toBe(0);
    });
  });

  describe('3. 夏普值計算 (calculateSharpeRatio)', () => {
    it('應正確計算夏普值 (年化報酬 15%, 無風險利率 1.5%, 波動度 10% -> Sharpe = 1.35)', () => {
      const sharpe = calculateSharpeRatio(15, 10, 1.5);
      expect(sharpe).toBe(1.35);
    });

    it('當波動度為 0 時應安全回傳 0', () => {
      expect(calculateSharpeRatio(10, 0, 1.5)).toBe(0);
    });
  });

  describe('4. 貝塔係數、相關係數與阿爾法 (Beta, Correlation, Alpha)', () => {
    it('完全同向波動時 Beta 應接近 1.0，相關係數為 1.0', () => {
      const portfolioReturns = [0.01, 0.02, -0.01, 0.03];
      const benchmarkReturns = [0.01, 0.02, -0.01, 0.03];

      const { beta, correlation } = calculateBetaAndCorrelation(portfolioReturns, benchmarkReturns);
      expect(beta).toBeCloseTo(1.0, 2);
      expect(correlation).toBeCloseTo(1.0, 2);
    });

    it('應正確計算詹森阿爾法 (Jensen Alpha)', () => {
      // Rp = 20%, Rb = 10%, Rf = 1.5%, Beta = 1.0
      // Alpha = 20 - (1.5 + 1.0 * (10 - 1.5)) = 20 - 10 = 10%
      const alpha = calculateJensensAlpha(20, 10, 1.0, 1.5);
      expect(alpha).toBe(10.0);
    });
  });

  describe('5. 完整量化指標整合生成 (calculateQuantMetrics)', () => {
    it('應能從 NAV 序列與基準序列中一站式產生 QuantPerformanceMetrics', () => {
      const portfolioNAV = [100, 105, 110, 108, 115, 120];
      const benchmarkPrices = [100, 102, 104, 103, 106, 108];

      const metrics = calculateQuantMetrics(portfolioNAV, benchmarkPrices, 1.5);
      expect(metrics.hasBenchmark).toBe(true);
      expect(metrics.portfolioMaxDrawdown).toBeGreaterThanOrEqual(0);
      expect(metrics.benchmarkMaxDrawdown).toBeGreaterThanOrEqual(0);
      expect(metrics.annualizedVolatility).toBeGreaterThan(0);
      expect(typeof metrics.sharpeRatio).toBe('number');
      expect(typeof metrics.beta).toBe('number');
      expect(typeof metrics.alpha).toBe('number');
      expect(typeof metrics.correlation).toBe('number');
    });

    it('當無基準數列時，應獨立計算自身波動度與夏普值，大盤指標為 null', () => {
      const portfolioNAV = [100, 105, 110, 108, 115, 120];
      const metrics = calculateQuantMetrics(portfolioNAV, []);
      expect(metrics.hasBenchmark).toBe(false);
      expect(metrics.alpha).toBeNull();
      expect(metrics.beta).toBeNull();
      expect(metrics.correlation).toBeNull();
      expect(metrics.benchmarkMaxDrawdown).toBeNull();
      expect(metrics.annualizedVolatility).toBeGreaterThan(0);
      expect(typeof metrics.sharpeRatio).toBe('number');
      expect(metrics.portfolioMaxDrawdown).toBeGreaterThanOrEqual(0);
    });

    it('當資料不足時應回傳安全數值且不拋錯', () => {
      const metrics = calculateQuantMetrics([100], []);
      expect(metrics.hasBenchmark).toBe(false);
      expect(metrics.alpha).toBeNull();
      expect(metrics.beta).toBeNull();
      expect(metrics.sharpeRatio).toBe(0);
      expect(metrics.portfolioMaxDrawdown).toBe(0);
    });
  });

  describe('6. 量化指標動態診斷分析器 (getQuantMetricDiagnosis)', () => {
    const mockMetrics: QuantPerformanceMetrics = {
      hasBenchmark: true,
      alpha: 3.23,
      beta: 0.17,
      sharpeRatio: 0.38,
      annualizedVolatility: 8.7,
      portfolioMaxDrawdown: 18.4,
      benchmarkMaxDrawdown: 7.83,
      correlation: 0.06,
    };

    it('應產出全部 5 大指標之診斷結構', () => {
      const diagnosis = getQuantMetricDiagnosis(mockMetrics, 'us SPY 標普500 ETF');
      expect(diagnosis.alpha).toBeDefined();
      expect(diagnosis.beta).toBeDefined();
      expect(diagnosis.sharpe).toBeDefined();
      expect(diagnosis.mdd).toBeDefined();
      expect(diagnosis.volatility).toBeDefined();
    });

    it('應正確診斷當前數值（Alpha=3.23% -> 🟢 穩健超額）', () => {
      const diagnosis = getQuantMetricDiagnosis(mockMetrics, 'us SPY');
      expect(diagnosis.alpha.level).toBe('GOOD');
      expect(diagnosis.alpha.levelBadge).toContain('穩健超額');
      expect(diagnosis.alpha.formula).toContain('α =');
    });

    it('應正確診斷當前數值（Beta=0.17 -> 🛡️ 防禦獨立型）', () => {
      const diagnosis = getQuantMetricDiagnosis(mockMetrics, 'us SPY');
      expect(diagnosis.beta.level).toBe('GOOD');
      expect(diagnosis.beta.levelBadge).toContain('防禦獨立型');
    });

    it('應正確診斷當前數值（Sharpe=0.38 -> 🟡 回報偏弱）', () => {
      const diagnosis = getQuantMetricDiagnosis(mockMetrics, 'us SPY');
      expect(diagnosis.sharpe.level).toBe('FAIR');
      expect(diagnosis.sharpe.levelBadge).toContain('回報偏弱');
      expect(diagnosis.sharpe.benchmarkNote).toContain('1.5%');
    });

    it('應正確診斷當前數值（MDD=18.40% -> 🟡 正常回撤）', () => {
      const diagnosis = getQuantMetricDiagnosis(mockMetrics, 'us SPY');
      expect(diagnosis.mdd.level).toBe('GOOD');
      expect(diagnosis.mdd.levelBadge).toContain('正常回撤');
      expect(diagnosis.mdd.summary).toContain('SPY');
    });

    it('應正確診斷當前數值（Volatility=8.70% -> 🛡️ 低波防守）', () => {
      const diagnosis = getQuantMetricDiagnosis(mockMetrics, 'us SPY');
      expect(diagnosis.volatility.level).toBe('GOOD');
      expect(diagnosis.volatility.levelBadge).toContain('低波防守');
    });

    it('當無基準時，Alpha 與 Beta 應顯示需大盤基準評級', () => {
      const noBenchmarkMetrics: QuantPerformanceMetrics = {
        ...mockMetrics,
        hasBenchmark: false,
        alpha: null,
        beta: null,
        correlation: null,
        benchmarkMaxDrawdown: null,
      };

      const diagnosis = getQuantMetricDiagnosis(noBenchmarkMetrics, '');
      expect(diagnosis.alpha.level).toBe('NEUTRAL');
      expect(diagnosis.alpha.levelBadge).toContain('需大盤基準');
      expect(diagnosis.beta.level).toBe('NEUTRAL');
      expect(diagnosis.beta.levelBadge).toContain('需大盤基準');
    });
  });
});

