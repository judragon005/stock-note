import { describe, it, expect } from 'vitest';
import {
  calculatePlannedRiskRewardRatio,
  evaluateRiskStatus,
  calculateRiskDistances,
  buildHoldingRiskMetrics,
} from './riskAlertEngine';
import { TradePlan } from '../types/stock';

describe('風控觸價與距離試算引擎 (riskAlertEngine)', () => {
  describe('1. 預期風報比試算 (calculatePlannedRiskRewardRatio)', () => {
    it('應正確計算標準多頭風報比 (TP=120, SL=90, Entry=100 -> RR = 2.0)', () => {
      const rr = calculatePlannedRiskRewardRatio(100, 90, 120);
      expect(rr).toBe(2.0);
    });

    it('應支援小數精確四捨五入至小數點後兩位', () => {
      // (115 - 100) / (100 - 94) = 15 / 6 = 2.5
      const rr = calculatePlannedRiskRewardRatio(100, 94, 115);
      expect(rr).toBe(2.5);

      // (108 - 100) / (100 - 97) = 8 / 3 = 2.67
      const rr2 = calculatePlannedRiskRewardRatio(100, 97, 108);
      expect(rr2).toBe(2.67);
    });

    it('當未提供停損或停利價時應回傳 undefined', () => {
      expect(calculatePlannedRiskRewardRatio(100, undefined, 120)).toBeUndefined();
      expect(calculatePlannedRiskRewardRatio(100, 90, undefined)).toBeUndefined();
      expect(calculatePlannedRiskRewardRatio(100, undefined, undefined)).toBeUndefined();
    });

    it('防禦無效數值：停損價高於或等於進場價時應回傳 undefined', () => {
      expect(calculatePlannedRiskRewardRatio(100, 100, 120)).toBeUndefined();
      expect(calculatePlannedRiskRewardRatio(100, 105, 120)).toBeUndefined();
    });

    it('防禦無效數值：停利價低於或等於進場價時應回傳 undefined', () => {
      expect(calculatePlannedRiskRewardRatio(100, 90, 100)).toBeUndefined();
      expect(calculatePlannedRiskRewardRatio(100, 90, 80)).toBeUndefined();
    });
  });

  describe('2. 即時風控狀態評估 (evaluateRiskStatus)', () => {
    it('未設定停損停利時應回傳 NORMAL', () => {
      expect(evaluateRiskStatus(100, undefined, undefined)).toBe('NORMAL');
    });

    it('當現價跌破或等於停損價時應判定 STOP_LOSS_TRIGGERED (🚨)', () => {
      expect(evaluateRiskStatus(90, 90, 120)).toBe('STOP_LOSS_TRIGGERED');
      expect(evaluateRiskStatus(88, 90, 120)).toBe('STOP_LOSS_TRIGGERED');
    });

    it('當現價接近停損點 (距離 <= 3%) 時應判定 NEAR_STOP_LOSS (⚠️)', () => {
      // SL = 100, 當現價為 102 時，距離 = (102 - 100) / 102 = 1.96% <= 3%
      expect(evaluateRiskStatus(102, 100, 150)).toBe('NEAR_STOP_LOSS');
      // SL = 100, 當現價為 103 時，距離 = (103 - 100) / 103 = 2.91% <= 3%
      expect(evaluateRiskStatus(103, 100, 150)).toBe('NEAR_STOP_LOSS');
      // SL = 100, 當現價為 105 時，距離 = (105 - 100) / 105 = 4.76% > 3%
      expect(evaluateRiskStatus(105, 100, 150)).toBe('NORMAL');
    });

    it('當現價達到或超越停利目標價時應判定 TAKE_PROFIT_TRIGGERED (🎯)', () => {
      expect(evaluateRiskStatus(120, 90, 120)).toBe('TAKE_PROFIT_TRIGGERED');
      expect(evaluateRiskStatus(125, 90, 120)).toBe('TAKE_PROFIT_TRIGGERED');
    });

    it('當現價接近停利目標 (距離 <= 3%) 時應判定 NEAR_TAKE_PROFIT', () => {
      // TP = 100, 當現價為 98 時，距離 = (100 - 98) / 98 = 2.04% <= 3%
      expect(evaluateRiskStatus(98, 70, 100)).toBe('NEAR_TAKE_PROFIT');
      // TP = 100, 當現價為 97 時，距離 = (100 - 97) / 97 = 3.09% > 3%
      expect(evaluateRiskStatus(97, 70, 100)).toBe('NORMAL');
    });

    it('停損優先原則：若同時符合條件，以停損觸發為最高優先', () => {
      // 極端異常輸入保護
      expect(evaluateRiskStatus(80, 90, 85)).toBe('STOP_LOSS_TRIGGERED');
    });
  });

  describe('3. 距離試算與完整指標建置 (calculateRiskDistances & buildHoldingRiskMetrics)', () => {
    it('應正確計算百分比距離 (正數為緩衝，負數為穿價)', () => {
      const distances = calculateRiskDistances(100, 90, 120);
      // 離停損：(100 - 90) / 100 * 100 = +10%
      expect(distances.distanceToStopLossPercent).toBe(10);
      // 離停利：(120 - 100) / 100 * 100 = +20%
      expect(distances.distanceToTakeProfitPercent).toBe(20);
    });

    it('跌破停損時距離應為負數', () => {
      const distances = calculateRiskDistances(85, 90, 120);
      // (85 - 90) / 85 * 100 = -5.88%
      expect(distances.distanceToStopLossPercent).toBe(-5.88);
    });

    it('buildHoldingRiskMetrics 應完整整合 TradePlan 並產生指標物件', () => {
      const plan: TradePlan = {
        entryReason: '突破箱頂型態',
        stopLossPrice: 90,
        takeProfitPrice: 120,
        plannedRiskRewardRatio: 2.0,
      };

      const metrics = buildHoldingRiskMetrics(92, plan, 100);
      expect(metrics.riskStatus).toBe('NEAR_STOP_LOSS');
      expect(metrics.stopLossPrice).toBe(90);
      expect(metrics.takeProfitPrice).toBe(120);
      expect(metrics.entryReason).toBe('突破箱頂型態');
      expect(metrics.distanceToStopLossPercent).toBe(2.17); // (92 - 90) / 92 * 100 = 2.17%
    });

    it('當無 Plan 時應回傳預設 NORMAL 指標', () => {
      const metrics = buildHoldingRiskMetrics(100, undefined);
      expect(metrics.riskStatus).toBe('NORMAL');
      expect(metrics.stopLossPrice).toBeUndefined();
      expect(metrics.takeProfitPrice).toBeUndefined();
    });
  });
});
