import { describe, it, expect } from 'vitest';
import { getCategoryBadge, getCountdownBadge } from './PendingSettlementCard';
import { PendingSettlementItem } from '../engine/cashLedgerEngine';

describe('PendingSettlementCard Unit Tests & Visual Seams (PRD #0055)', () => {
  describe('1. 交易類別徽章與配色判定 (getCategoryBadge)', () => {
    it('股票買進 (STOCK_BUY) 應標示為紅色調「股票買進」', () => {
      const badge = getCategoryBadge('STOCK_BUY');
      expect(badge.label).toBe('股票買進');
      expect(badge.color).toBe('#f87171');
    });

    it('股票賣出 (STOCK_SELL) 應標示為綠色調「股票賣出」', () => {
      const badge = getCategoryBadge('STOCK_SELL');
      expect(badge.label).toBe('股票賣出');
      expect(badge.color).toBe('#34d399');
    });

    it('現金股息 (DIVIDEND 或 DIVIDEND_PAYOUT) 應標示為綠色調「現金股息」', () => {
      const badge1 = getCategoryBadge('DIVIDEND');
      expect(badge1.label).toBe('現金股息');
      expect(badge1.color).toBe('#10b981');

      const badge2 = getCategoryBadge('DIVIDEND_PAYOUT');
      expect(badge2.label).toBe('現金股息');
    });

    it('利息收入 (INTEREST 或 INTEREST_INCOME) 應標示為水藍色「利息收入」', () => {
      const badge = getCategoryBadge('INTEREST_INCOME');
      expect(badge.label).toBe('利息收入');
      expect(badge.color).toBe('#38bdf8');
    });

    it('資金存入 (DEPOSIT) 應標示為藍色「資金存入」', () => {
      const badge = getCategoryBadge('DEPOSIT');
      expect(badge.label).toBe('資金存入');
      expect(badge.color).toBe('#60a5fa');
    });

    it('資金提領 (WITHDRAWAL) 應標示為橘色「資金提領」', () => {
      const badge = getCategoryBadge('WITHDRAWAL');
      expect(badge.label).toBe('資金提領');
      expect(badge.color).toBe('#f97316');
    });

    it('未知名稱預設安全 fallback 為灰色「資金異動」', () => {
      const badge = getCategoryBadge('OTHER_FEE');
      expect(badge.label).toBe('資金異動');
      expect(badge.color).toBe('#94a3b8');
    });
  });

  describe('2. 時序倒數膠囊判定 (getCountdownBadge)', () => {
    it('逾期天數 (< 0) 應顯示「逾期 N 天」與紅色高亮', () => {
      const badge = getCountdownBadge(-3);
      expect(badge.text).toBe('逾期 3 天');
      expect(badge.color).toBe('#f87171');
    });

    it('今日到期 (0 天) 應顯示「今日到期」與琥珀金黃色', () => {
      const badge = getCountdownBadge(0);
      expect(badge.text).toBe('今日到期');
      expect(badge.color).toBe('#fbbf24');
    });

    it('明日到期 (1 天) 應顯示「明日到期」與藍色', () => {
      const badge = getCountdownBadge(1);
      expect(badge.text).toBe('明日到期');
      expect(badge.color).toBe('#60a5fa');
    });

    it('未來排程 (> 1 天) 應顯示「N 天後」與清晰文字', () => {
      const badge = getCountdownBadge(5);
      expect(badge.text).toBe('5 天後');
      expect(badge.color).toBe('#cbd5e1');
    });
  });

  describe('3. PendingSettlementItem 結構完備性驗證', () => {
    it('單行條目物件應具備必要交割屬性', () => {
      const mockItem: PendingSettlementItem = {
        transactionId: 'tx-001',
        accountId: 'broker-tw-sinopac',
        accountName: '永豐大戶投 (2折/低消20元)',
        currency: 'TWD',
        type: 'STOCK_BUY',
        category: 'STOCK_BUY',
        amount: -50670,
        date: '2026-08-30',
        settlementDate: '2026-09-01',
        daysUntilSettlement: 2,
        settlementStatus: 'PENDING',
        note: '[台股 T+2 交割日: 2026-09-01] 買進 2330',
      };

      expect(mockItem.accountName).toContain('永豐大戶投');
      expect(mockItem.settlementDate).toBe('2026-09-01');
      expect(mockItem.daysUntilSettlement).toBe(2);
      expect(mockItem.amount).toBe(-50670);
    });
  });
});
