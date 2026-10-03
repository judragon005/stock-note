import { describe, it, expect } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

describe('Ticket 03 - 美股符號相容轉譯正規化器 (Spec 0163)', () => {
  it('1. normalizeUsSymbol 應能精確將含點號之美股標的轉為連字符號', () => {
    const { normalizeUsSymbol } = require('../../scripts/market-sync/market-sync-core.cjs');
    expect(typeof normalizeUsSymbol).toBe('function');

    expect(normalizeUsSymbol('BRK.A')).toBe('BRK-A');
    expect(normalizeUsSymbol('BRK.B')).toBe('BRK-B');
    expect(normalizeUsSymbol('BF.B')).toBe('BF-B');
    expect(normalizeUsSymbol('JW.A')).toBe('JW-A');
  });

  it('2. 標準代碼與帶前後空格標的應正確處理', () => {
    const { normalizeUsSymbol } = require('../../scripts/market-sync/market-sync-core.cjs');

    expect(normalizeUsSymbol('AAPL')).toBe('AAPL');
    expect(normalizeUsSymbol('NVDA')).toBe('NVDA');
    expect(normalizeUsSymbol('  tsla  ')).toBe('TSLA');
    expect(normalizeUsSymbol('')).toBe('');
    expect(normalizeUsSymbol(null)).toBe('');
  });
});
