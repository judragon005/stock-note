import { describe, it, expect, vi } from 'vitest';

declare const require: (id: string) => any;

describe('T02 & T03: Lakehouse DDL & US Symbol Alias SSOT', () => {
  it('T02: sqlite-db-core 應匯出單一 ensureCorporateActionCalendarTable 並建立表與雙索引', () => {
    const { ensureCorporateActionCalendarTable } = require('../../scripts/market-sync/sqlite-db-core.cjs');
    expect(typeof ensureCorporateActionCalendarTable).toBe('function');

    const executedSql: string[] = [];
    const mockDb = {
      exec: vi.fn((sql: string) => {
        executedSql.push(sql);
      }),
    };
    ensureCorporateActionCalendarTable(mockDb);
    expect(mockDb.exec).toHaveBeenCalledTimes(1);
    expect(executedSql[0]).toContain('CREATE TABLE IF NOT EXISTS corporate_action_calendar');
    expect(executedSql[0]).toContain('idx_ca_symbol');
    expect(executedSql[0]).toContain('idx_ca_ex_date');
  });

  it('T03: market-sync-core 應集中提供美股點號/連字號正規化與別名產生純函式', () => {
    const {
      buildSymbolAliases,
      normalizeYahooSymbol,
      normalizeUsTickerCandidates,
    } = require('../../scripts/market-sync/market-sync-core.cjs');

    expect(buildSymbolAliases('brk.b')).toEqual(['BRK.B', 'BRK-B']);
    expect(buildSymbolAliases('BRK-B')).toEqual(['BRK-B', 'BRK.B']);
    expect(buildSymbolAliases('3293')).toEqual(['3293', '3293O']);
    expect(buildSymbolAliases('3293O')).toEqual(['3293O', '3293']);
    expect(buildSymbolAliases('NVDA')).toEqual(['NVDA', 'NVDA']);

    expect(normalizeYahooSymbol(' brk.b ')).toBe('BRK-B');
    expect(normalizeYahooSymbol('AAPL')).toBe('AAPL');

    expect(normalizeUsTickerCandidates('brk.b')).toEqual(['BRK.B', 'BRK-B']);
    expect(normalizeUsTickerCandidates('BRK_B')).toEqual(['BRK_B', 'BRK-B', 'BRK.B']);
    expect(normalizeUsTickerCandidates('')).toEqual([]);
  });
});
