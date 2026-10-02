import { describe, it, expect } from 'vitest';
import {
  safeSanitizeObject,
  sanitizeTradeRecord,
  validateFullDatabaseBackup,
} from './securitySanitizer';
import { TradeRecord } from '../types/stock';

describe('Security Sanitizer (Seam: 輸入邊界與原型污染防禦)', () => {
  describe('Ticket 01: safeSanitizeObject (原型污染安全對象消毒)', () => {
    it('應安全保留原始純量類型與純淨陣列', () => {
      expect(safeSanitizeObject(42)).toBe(42);
      expect(safeSanitizeObject('hello')).toBe('hello');
      expect(safeSanitizeObject(true)).toBe(true);
      expect(safeSanitizeObject(null)).toBeNull();
      expect(safeSanitizeObject(undefined)).toBeUndefined();
      expect(safeSanitizeObject([1, 'a', false])).toEqual([1, 'a', false]);
    });

    it('應徹底剔除 __proto__ 惡意屬性，確保全域 Object.prototype 不受污染', () => {
      const maliciousJson = '{"name":"safe","__proto__":{"isAdmin":true}}';
      const parsed = JSON.parse(maliciousJson);

      const sanitized = safeSanitizeObject(parsed);
      expect(sanitized.name).toBe('safe');
      expect((sanitized as any).isAdmin).toBeUndefined();
      expect((Object.prototype as any).isAdmin).toBeUndefined();
    });

    it('應徹底剔除 constructor 與 prototype 屬性', () => {
      const payload = {
        title: 'test',
        constructor: { evil: true },
        prototype: { hack: true },
        nested: {
          __proto__: { backdoor: true },
          regular: 123,
        },
      };

      const sanitized = safeSanitizeObject(payload);
      expect(sanitized.title).toBe('test');
      expect((sanitized as any).constructor).toBeUndefined();
      expect((sanitized as any).prototype).toBeUndefined();
      expect(sanitized.nested.regular).toBe(123);
      expect((sanitized.nested as any).backdoor).toBeUndefined();
      expect((Object.prototype as any).backdoor).toBeUndefined();
    });
  });

  describe('Ticket 02: sanitizeTradeRecord (數值邊界硬性熔斷守門員)', () => {
    const validSample: TradeRecord = {
      id: 'trade-1',
      date: '2026-10-01',
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      currency: 'TWD',
      type: 'BUY',
      accountId: 'broker-tw-default',
      shares: 1000,
      price: 950,
      fee: 20,
      tax: 0,
      note: '標準買進',
      tags: ['核心持股'],
      createdAt: 1727740800000,
    };

    it('合法記錄應完整保留所有合法數值', () => {
      const sanitized = sanitizeTradeRecord(validSample);
      expect(sanitized).not.toBeNull();
      expect(sanitized?.symbol).toBe('2330');
      expect(sanitized?.shares).toBe(1000);
      expect(sanitized?.price).toBe(950);
    });

    it('當 shares 為 Infinity、NaN、0 或負數時應安全拒絕或修復', () => {
      expect(sanitizeTradeRecord({ ...validSample, shares: Infinity })).toBeNull();
      expect(sanitizeTradeRecord({ ...validSample, shares: NaN })).toBeNull();
      expect(sanitizeTradeRecord({ ...validSample, shares: -500 })).toBeNull();
      expect(sanitizeTradeRecord({ ...validSample, shares: 0 })).toBeNull();
      expect(sanitizeTradeRecord({ ...validSample, shares: 2e9 })).toBeNull(); // 超出十億股邊界
    });

    it('當 price 為負數、NaN 或超出邊界時應安全拒絕', () => {
      expect(sanitizeTradeRecord({ ...validSample, price: -10 })).toBeNull();
      expect(sanitizeTradeRecord({ ...validSample, price: NaN })).toBeNull();
      expect(sanitizeTradeRecord({ ...validSample, price: Infinity })).toBeNull();
      expect(sanitizeTradeRecord({ ...validSample, price: 2e7 })).toBeNull(); // 超出千萬單價
    });

    it('超長 note 應被硬性截斷至 2,000 字元以內，防範 DoS 攻擊', () => {
      const giantNote = 'A'.repeat(50000);
      const sanitized = sanitizeTradeRecord({ ...validSample, note: giantNote });
      expect(sanitized).not.toBeNull();
      expect(sanitized!.note?.length).toBe(2000);
    });

    it('過多或超長 tags 應被限制數量（上限 20）且字串截斷（上限 50 字元）', () => {
      const manyTags = Array.from({ length: 50 }, (_, i) => `Tag-${i}-${'X'.repeat(100)}`);
      const sanitized = sanitizeTradeRecord({ ...validSample, tags: manyTags });
      expect(sanitized).not.toBeNull();
      expect(sanitized!.tags?.length).toBe(20);
      expect(sanitized!.tags?.[0]?.length).toBe(50);
    });

    it('異常股票代碼格式應被安全拒絕', () => {
      expect(sanitizeTradeRecord({ ...validSample, symbol: '<script>alert(1)</script>' })).toBeNull();
      expect(sanitizeTradeRecord({ ...validSample, symbol: 'TOOLONGSYMBOLOVER12CHARS' })).toBeNull();
      expect(sanitizeTradeRecord({ ...validSample, symbol: '' })).toBeNull();
    });
  });

  describe('Ticket 03: validateFullDatabaseBackup (全庫備份反序列化前置審核)', () => {
    it('非合法物件或缺少 data 屬性時應判定為無效備份', () => {
      expect(validateFullDatabaseBackup(null)).toBeNull();
      expect(validateFullDatabaseBackup('string')).toBeNull();
      expect(validateFullDatabaseBackup({})).toBeNull();
      expect(validateFullDatabaseBackup({ data: null })).toBeNull();
    });

    it('應過濾惡意原型污染載荷並安全清理 trades 陣列', () => {
      const maliciousPayload = {
        version: 1,
        __proto__: { isAdmin: true },
        data: {
          __proto__: { isRoot: true },
          trades: [
            {
              id: 'trade-valid',
              date: '2026-10-01',
              symbol: '2330',
              market: 'TW',
              currency: 'TWD',
              type: 'BUY',
              shares: 100,
              price: 1000,
            },
            {
              id: 'trade-invalid-shares',
              date: '2026-10-01',
              symbol: '2330',
              market: 'TW',
              currency: 'TWD',
              type: 'BUY',
              shares: -500, // 負數股數
              price: 1000,
            },
          ],
        },
      };

      const sanitized = validateFullDatabaseBackup(maliciousPayload);
      expect(sanitized).not.toBeNull();
      expect((Object.prototype as any).isAdmin).toBeUndefined();
      expect((Object.prototype as any).isRoot).toBeUndefined();
      expect(sanitized?.data.trades?.length).toBe(1);
      expect(sanitized?.data.trades?.[0].id).toBe('trade-valid');
    });
  });
});
