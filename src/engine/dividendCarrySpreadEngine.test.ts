import { describe, it, expect } from 'vitest';
import {
  calculateNetCarrySpread,
  evaluateWireFeeFriction,
  calculateTotalWireFeeLoss,
} from './dividendCarrySpreadEngine';

describe('dividendCarrySpreadEngine - 質押借貸淨利差與匯費警報模組', () => {
  describe('calculateNetCarrySpread - 質押借貸淨利差計算', () => {
    it('應正確計算正利差 (股息收入大於質押利息支出)', () => {
      const result = calculateNetCarrySpread({
        dividendIncomeTwd: 50000,
        loanInterestExpenseTwd: 15000,
      });

      expect(result.netCashflowTwd).toBe(35000);
      expect(result.isNegativeSpread).toBe(false);
    });

    it('應正確識別零利息支出情況', () => {
      const result = calculateNetCarrySpread({
        dividendIncomeTwd: 30000,
        loanInterestExpenseTwd: 0,
      });

      expect(result.netCashflowTwd).toBe(30000);
      expect(result.isNegativeSpread).toBe(false);
    });

    it('應正確識別損益兩平 (利差為 0)', () => {
      const result = calculateNetCarrySpread({
        dividendIncomeTwd: 20000,
        loanInterestExpenseTwd: 20000,
      });

      expect(result.netCashflowTwd).toBe(0);
      expect(result.isNegativeSpread).toBe(false);
    });

    it('應正確識別負利差 (利息支出大於股息收入，isNegativeSpread = true)', () => {
      const result = calculateNetCarrySpread({
        dividendIncomeTwd: 12000,
        loanInterestExpenseTwd: 18000,
      });

      expect(result.netCashflowTwd).toBe(-6000);
      expect(result.isNegativeSpread).toBe(true);
    });
  });

  describe('evaluateWireFeeFriction - 跨行匯費摩擦損耗與微額警報', () => {
    it('單筆配息小於 500 且匯費大於等於 10 時應觸發高摩擦警報', () => {
      const result = evaluateWireFeeFriction({
        payoutAmountTwd: 300,
        wireFeeTwd: 10,
      });

      // 10 / 300 * 100 = 3.3333... -> 3.33%
      expect(result.feeRatioPct).toBe(3.33);
      expect(result.isHighFrictionAlert).toBe(true);
      expect(result.alertMessage).toBe(
        '單筆配息 NT$ 300 遭扣跨行匯費 NT$ 10，摩擦耗損達 3.3%，建議變更收益分配至保管銀行'
      );
    });

    it('極端微額配息 (例如 50 元配息扣 10 元匯費，20% 損耗) 應精確觸發警報', () => {
      const result = evaluateWireFeeFriction({
        payoutAmountTwd: 50,
        wireFeeTwd: 10,
      });

      expect(result.feeRatioPct).toBe(20);
      expect(result.isHighFrictionAlert).toBe(true);
      expect(result.alertMessage).toBe(
        '單筆配息 NT$ 50 遭扣跨行匯費 NT$ 10，摩擦耗損達 20.0%，建議變更收益分配至保管銀行'
      );
    });

    it('單筆配息剛好 500 元 (達門檻) 時不應觸發警報', () => {
      const result = evaluateWireFeeFriction({
        payoutAmountTwd: 500,
        wireFeeTwd: 10,
      });

      expect(result.feeRatioPct).toBe(2);
      expect(result.isHighFrictionAlert).toBe(false);
      expect(result.alertMessage).toBeUndefined();
    });

    it('大額配息正常無警報 (例如配息 10000 扣 10 元匯費)', () => {
      const result = evaluateWireFeeFriction({
        payoutAmountTwd: 10000,
        wireFeeTwd: 10,
      });

      expect(result.feeRatioPct).toBe(0.1);
      expect(result.isHighFrictionAlert).toBe(false);
      expect(result.alertMessage).toBeUndefined();
    });

    it('無匯費或匯費小於 10 時不觸發警報', () => {
      const result = evaluateWireFeeFriction({
        payoutAmountTwd: 200,
        wireFeeTwd: 0,
      });

      expect(result.feeRatioPct).toBe(0);
      expect(result.isHighFrictionAlert).toBe(false);
      expect(result.alertMessage).toBeUndefined();
    });

    it('配息金額為 0 時應防禦除以零錯誤，費率返回 0', () => {
      const result = evaluateWireFeeFriction({
        payoutAmountTwd: 0,
        wireFeeTwd: 10,
      });

      expect(result.feeRatioPct).toBe(0);
      // payoutAmountTwd < 500 (0 < 500) 且 wireFeeTwd >= 10
      expect(result.isHighFrictionAlert).toBe(true);
      expect(result.alertMessage).toBe(
        '單筆配息 NT$ 0 遭扣跨行匯費 NT$ 10，摩擦耗損達 0.0%，建議變更收益分配至保管銀行'
      );
    });
  });

  describe('calculateTotalWireFeeLoss - 累計跨行匯費損耗計算', () => {
    it('應能正確加總多筆跨行匯費', () => {
      const items = [
        { wireFeeTwd: 10 },
        { wireFeeTwd: 10 },
        { wireFeeTwd: 15 },
        { wireFeeTwd: 0 },
      ];

      const total = calculateTotalWireFeeLoss(items);
      expect(total).toBe(35);
    });

    it('遇到未定義或缺失 wireFeeTwd 時應視為 0 累積', () => {
      const items = [
        { wireFeeTwd: 10 },
        {},
        { wireFeeTwd: undefined },
        { wireFeeTwd: 20 },
      ];

      const total = calculateTotalWireFeeLoss(items);
      expect(total).toBe(30);
    });

    it('空陣列應返回 0', () => {
      expect(calculateTotalWireFeeLoss([])).toBe(0);
    });
  });
});
