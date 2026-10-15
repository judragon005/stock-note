import { describe, it, expect } from 'vitest';
import {
  evaluateNhi20kOptimization,
  calculateDividendTaxDeductionStats,
  Nhi20kCheckInput,
} from './taxOptimizationGuard';

describe('Spec 0183 Ticket 05: taxOptimizationGuard (二代健保拆單與所得稅抵減防禦)', () => {
  it('1. 當單筆股利介於 20,000 ~ 25,000 元時，應精準觸發 2.11% 扣繳預警並提供合法拆單股數建議', () => {
    // 持有 10,000 股，每股現金股息 2.1 元 => 總股利 21,000 元
    // 剛好超過 20,000 門檻，會被扣 2.11% = 443 元
    const input: Nhi20kCheckInput = {
      symbol: '00878',
      name: '國泰永續高股息',
      currentShares: 10000,
      cashDividendPerShare: 2.1,
    };

    const result = evaluateNhi20kOptimization(input);

    expect(result.grossDividendTwd).toBe(21000);
    expect(result.triggersNhiDeduction).toBe(true);
    expect(result.nhiFeeTwd).toBe(443); // 21,000 * 2.11% = 443.1 => 443

    // 拆單建議：目標股息 < 20,000，即 <= 19,999
    // 19,999 / 2.1 = 9523.33 => 9,523 股
    // 需調節賣出股數 = 10,000 - 9,523 = 477 股
    expect(result.isSplitRecommended).toBe(true);
    expect(result.recommendedSafeShares).toBe(9523);
    expect(result.sharesToTrim).toBe(477);
    expect(result.potentialSavingsTwd).toBe(443);
    expect(result.guidanceMessage).toContain('建議除息前微調賣出 477 股');
  });

  it('2. 邊界測試：當單筆股利為 19,999 元時，未達 20,000 門檻，不觸發扣繳與拆單', () => {
    const input: Nhi20kCheckInput = {
      symbol: '0056',
      name: '元大高股息',
      currentShares: 19999,
      cashDividendPerShare: 1.0,
    };

    const result = evaluateNhi20kOptimization(input);

    expect(result.grossDividendTwd).toBe(19999);
    expect(result.triggersNhiDeduction).toBe(false);
    expect(result.nhiFeeTwd).toBe(0);
    expect(result.isSplitRecommended).toBe(false);
  });

  it('3. 當單筆股利遠高於 25,000 元 (如 10 萬元) 時，不建議為了省 2.11% 而大舉砍倉', () => {
    const input: Nhi20kCheckInput = {
      symbol: '2330',
      name: '台積電',
      currentShares: 20000,
      cashDividendPerShare: 5.0, // 總額 10 萬
    };

    const result = evaluateNhi20kOptimization(input);

    expect(result.grossDividendTwd).toBe(100000);
    expect(result.triggersNhiDeduction).toBe(true);
    // 超過 25,000 元微調區間，不建議削足適履大賣股票
    expect(result.isSplitRecommended).toBe(false);
  });

  it('4. 應準確統計全年應稅股利與 8.5% 綜合所得稅抵減額 (上限 8 萬元)', () => {
    // 台灣稅法：本國股利合併計稅可享有 8.5% 抵減稅額，每申報戶上限 80,000 元
    // 相當於全年股利在 941,176 元以內皆可全額享受 8.5% 抵減
    const stats1 = calculateDividendTaxDeductionStats(500000); // 領 50 萬
    expect(stats1.totalDividendTwd).toBe(500000);
    expect(stats1.deductionRate).toBe(0.085);
    expect(stats1.estimatedDeductionAmountTwd).toBe(42500); // 500,000 * 8.5%
    expect(stats1.remainingDeductionCapacityTwd).toBe(37500); // 80,000 - 42,500
    expect(stats1.isCapReached).toBe(false);

    const stats2 = calculateDividendTaxDeductionStats(1200000); // 領 120 萬 (超過上限)
    expect(stats2.estimatedDeductionAmountTwd).toBe(800000 * 0.085 > 80000 ? 80000 : 80000);
    expect(stats2.remainingDeductionCapacityTwd).toBe(0);
    expect(stats2.isCapReached).toBe(true);
  });
});
