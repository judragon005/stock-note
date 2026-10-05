import { describe, it, expect } from 'vitest';
import {
  createDefaultApiKeyItem,
  isKeyUsable,
  computeKeyHealthStatus,
  ApiKeyItem,
} from './apiKeyPoolTypes';

describe('Ticket 01: API Key Pool Types and State Schema', () => {
  it('1. createDefaultApiKeyItem 應正確初始化金鑰中繼資料與預設值', () => {
    const item = createDefaultApiKeyItem('finmind', 'test_key_123', {
      alias: '主力測試金鑰',
      dailyQuotaLimit: 300,
      rateLimitPerMin: 30,
    });

    expect(item.provider).toBe('finmind');
    expect(item.key).toBe('test_key_123');
    expect(item.alias).toBe('主力測試金鑰');
    expect(item.dailyQuotaLimit).toBe(300);
    expect(item.rateLimitPerMin).toBe(30);
    expect(item.totalRequestsToday).toBe(0);
    expect(item.consecutiveFailures).toBe(0);
    expect(item.isBlacklisted).toBe(false);
    expect(item.cooldownUntil).toBe(0);
    expect(typeof item.id).toBe('string');
    expect(item.id.length).toBeGreaterThan(0);
  });

  it('2. computeKeyHealthStatus 應依據狀態正確判定健康度', () => {
    const baseItem: ApiKeyItem = createDefaultApiKeyItem('fred', 'fred_key');

    // 正常狀態
    expect(computeKeyHealthStatus(baseItem, 1000)).toBe('HEALTHY');

    // 冷卻中
    const coolingItem: ApiKeyItem = { ...baseItem, cooldownUntil: 2000 };
    expect(computeKeyHealthStatus(coolingItem, 1500)).toBe('COOLING_DOWN');
    expect(computeKeyHealthStatus(coolingItem, 2500)).toBe('HEALTHY');

    // 配額耗盡
    const quotaItem: ApiKeyItem = { ...baseItem, dailyQuotaLimit: 100, totalRequestsToday: 100 };
    expect(computeKeyHealthStatus(quotaItem, 1000)).toBe('QUOTA_EXHAUSTED');

    // 黑名單失效
    const blacklistedItem: ApiKeyItem = { ...baseItem, isBlacklisted: true };
    expect(computeKeyHealthStatus(blacklistedItem, 1000)).toBe('INVALID');
  });

  it('3. isKeyUsable 應依據當前時間與限額判定是否可調用', () => {
    const baseItem: ApiKeyItem = createDefaultApiKeyItem('finnhub', 'finnhub_key', { dailyQuotaLimit: 50 });

    expect(isKeyUsable(baseItem, 1000)).toBe(true);

    // 黑名單不可用
    expect(isKeyUsable({ ...baseItem, isBlacklisted: true }, 1000)).toBe(false);

    // 冷卻中不可用
    expect(isKeyUsable({ ...baseItem, cooldownUntil: 5000 }, 1000)).toBe(false);

    // 配額滿載不可用
    expect(isKeyUsable({ ...baseItem, totalRequestsToday: 50 }, 1000)).toBe(false);

    // 配額未達上限 (-1 代表無上限) 可用
    expect(isKeyUsable({ ...baseItem, dailyQuotaLimit: -1, totalRequestsToday: 9999 }, 1000)).toBe(true);
  });
});
