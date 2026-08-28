import { describe, it, expect } from 'vitest';
import { InterestIncomeSummary } from '../engine/cashLedgerEngine';

// 測試被動收入卡片的核心計算與膠囊文字格式化輔助函數
export function calculatePassiveIncomeTotal(totalDividends: number, interestIncomeSummary?: InterestIncomeSummary): number {
  const interestAmount = interestIncomeSummary?.totalInterestAmount ?? 0;
  return totalDividends + interestAmount;
}

export function formatInterestBadgeText(name: string, amount: number, currency: 'TWD' | 'USD'): string {
  const symbol = currency === 'USD' ? '$' : 'NT$';
  const decimals = currency === 'USD' ? 2 : 0;
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `💵 ${name} +${symbol}${formattedAmount} ${currency}`;
}

describe('SummaryCards 被動收益與膠囊格式化輔助邏輯測試', () => {
  const mockInterestSummary: InterestIncomeSummary = {
    totalInterestAmount: 23.7,
    totalInterestInTWD: 758.4,
    totalInterestTaxUSD: 0,
    totalInterestTaxTWD: 0,
    interestItems: [
      {
        id: '嘉信活存利息__USD',
        name: '嘉信活存利息',
        amount: 15.2,
        amountInTWD: 486.4,
        currency: 'USD',
      },
      {
        id: '借券利息__USD',
        name: '借券利息',
        amount: 8.5,
        amountInTWD: 272.0,
        currency: 'USD',
      },
    ],
  };

  it('被動收入總額應為股息加各項利息之和', () => {
    const totalDividends = 87.21;
    const totalPassive = calculatePassiveIncomeTotal(totalDividends, mockInterestSummary);
    expect(totalPassive).toBeCloseTo(110.91, 2);
  });

  it('美元利息膠囊格式化應保留兩位小數與美元符號', () => {
    const badge = formatInterestBadgeText('嘉信活存利息', 15.2, 'USD');
    expect(badge).toBe('💵 嘉信活存利息 +$15.20 USD');
  });

  it('台幣利息膠囊格式化應為整數與 NT$ 符號', () => {
    const badge = formatInterestBadgeText('證券戶活存息', 500, 'TWD');
    expect(badge).toBe('💵 證券戶活存息 +NT$500 TWD');
  });
});
