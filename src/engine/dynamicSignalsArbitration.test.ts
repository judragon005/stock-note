import { describe, it, expect } from 'vitest';
import {
  arbitrateSignals,
  calculateDynamicSignalsFromCandles,
} from './aiForceDashboardEngine';
import type { KlineCandleItem, InstitutionalFlowData } from '../types/aiForceDashboard';

describe('Ticket 03: 多空矛盾智能仲裁演算法與四重視角整合 (TDD)', () => {
  describe('arbitrateSignals - 多空矛盾智能仲裁演算法', () => {
    it('1. 應精準識別「洗盤破底翻 (Bear Trap)」型態並給出不殺低、待轉強之建議', () => {
      const result = arbitrateSignals('破線偏空', '籌碼集中', '動能超跌', '破位警戒');
      expect(result.patternType).toBe('BEAR_TRAP');
      expect(result.actionableAdvice).toContain('洗盤破底翻');
      expect(result.actionableAdvice).toContain('建議觀望勿殺低');
    });

    it('2. 應精準識別「誘多高檔出貨 (Bull Trap)」型態並提醒出貨背離、嚴防倒貨', () => {
      const result = arbitrateSignals('偏多偏強', '籌碼渙散', '動能過熱', '波動偏高');
      expect(result.patternType).toBe('BULL_TRAP');
      expect(result.actionableAdvice).toContain('出貨背離');
      expect(result.actionableAdvice).toContain('切勿追高');
    });

    it('3. 應精準識別「共振主升段 (Harmonic Surge)」型態並建議順勢偏多', () => {
      const result = arbitrateSignals('偏多偏強', '土洋合買', '動能偏強', '風險可控');
      expect(result.patternType).toBe('HARMONIC_SURGE');
      expect(result.actionableAdvice).toContain('共振主升');
      expect(result.actionableAdvice).toContain('順勢持有');
    });

    it('4. 應精準識別「共振破位主跌段 (Harmonic Collapse)」型態並強烈警告嚴格停損', () => {
      const result = arbitrateSignals('破線偏空', '籌碼渙散', '動能偏弱', '破位警戒');
      expect(result.patternType).toBe('HARMONIC_COLLAPSE');
      expect(result.actionableAdvice).toContain('主跌段殺盤風險極高');
      expect(result.actionableAdvice).toContain('嚴格執行停損退場');
    });

    it('5. 指標分歧但無極端矛盾時，應回傳「中性區間整理 (Neutral Range)」', () => {
      const result = arbitrateSignals('區間整理', '籌碼中性', '動能整理', '風險可控');
      expect(result.patternType).toBe('NEUTRAL_RANGE');
      expect(result.actionableAdvice).toContain('區間整理');
    });
  });

  describe('calculateDynamicSignalsFromCandles - 四重視角整合產出', () => {
    const mockCandles: KlineCandleItem[] = [
      { date: '2026-10-01', open: 100, high: 102, low: 98, close: 99, volume: 1000, ma5: 100, ma10: 100, ma20: 100, rsi: 25 },
      { date: '2026-10-02', open: 99, high: 100, low: 95, close: 96, volume: 1500, ma5: 98, ma10: 99, ma20: 100, rsi: 20 },
      { date: '2026-10-03', open: 96, high: 97, low: 90, close: 92, volume: 2000, ma5: 95, ma10: 98, ma20: 100, rsi: 18 },
    ];

    const mockInstitutionalFlow: InstitutionalFlowData = {
      history: [
        { date: '2026-10-01', foreignShares: 500, trustShares: 300, dealerShares: 100, cumulativeTotalShares: 900 },
        { date: '2026-10-02', foreignShares: 600, trustShares: 400, dealerShares: 200, cumulativeTotalShares: 2100 },
        { date: '2026-10-03', foreignShares: 800, trustShares: 500, dealerShares: 300, cumulativeTotalShares: 3700 },
      ],
      recentDaysTable: [],
      cumulative20DaysSummary: '多頭',
      recent5DaysSummary: '大買',
    };

    it('洗盤破底翻情境：短線破線+主力逆勢大買，動態信號應輸出洗盤指引、量化分與防守價', () => {
      const result = calculateDynamicSignalsFromCandles(
        mockCandles,
        100, // mainForceCost (close 92 < cost 100 破線偏空)
        mockInstitutionalFlow,
        {
          dispositionStatus: 'ATTENTION',
          marginBalanceChange: 500,
        }
      );

      expect(result.compositeScore).toBeDefined();
      expect(result.verdictLight).toBeDefined();
      expect(result.actionableAdvice).toContain('洗盤破底翻');
      expect(result.regulatoryBadge).toBe('列注意股票');
      expect(result.keySupportPrice).toBeGreaterThan(0);
      expect(result.keyPressurePrice).toBeGreaterThan(0);
      expect(result.vwapBiasStdText).toBeDefined();
    });
  });
});
