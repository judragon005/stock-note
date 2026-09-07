import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TokenBucket,
  ConcurrencyPool,
  CircuitBreaker,
  ClientRequestScheduler,
  CircuitBreakerOpenError,
} from './rateLimiter';

describe('TokenBucket (權杖桶節流器)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初始狀態應擁有滿額 Token，並能正常扣除', async () => {
    const bucket = new TokenBucket({ maxTokens: 3, refillRatePerSec: 1 });
    expect(bucket.getTokens()).toBe(3);

    await bucket.acquire();
    expect(bucket.getTokens()).toBe(2);

    await bucket.acquire();
    expect(bucket.getTokens()).toBe(1);
  });

  it('當 Token 耗盡時，acquire 應排隊並等待時間補充後才放行', async () => {
    const bucket = new TokenBucket({ maxTokens: 1, refillRatePerSec: 2 }); // 每 500ms 補充 1 個
    await bucket.acquire();
    expect(bucket.getTokens()).toBe(0);

    let acquired = false;
    const acquirePromise = bucket.acquire().then(() => {
      acquired = true;
    });

    expect(acquired).toBe(false);

    // 快進 500ms
    await vi.advanceTimersByTimeAsync(500);
    await acquirePromise;
    expect(acquired).toBe(true);
  });
});

describe('ConcurrencyPool (並發連線池)', () => {
  it('應限制同時執行的請求數不超過 maxConcurrency', async () => {
    const pool = new ConcurrencyPool(2);
    let running = 0;
    let maxRunningObserved = 0;

    const task = async (delayMs: number) => {
      return pool.run(async () => {
        running++;
        maxRunningObserved = Math.max(maxRunningObserved, running);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        running--;
      });
    };

    const p1 = task(50);
    const p2 = task(50);
    const p3 = task(50);
    const p4 = task(50);

    await Promise.all([p1, p2, p3, p4]);

    expect(maxRunningObserved).toBe(2);
    expect(pool.getActiveCount()).toBe(0);
  });
});

describe('CircuitBreaker (熔斷器)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('平時處於關閉 (CLOSED) 狀態，正常通過', () => {
    const cb = new CircuitBreaker('test.domain', { failureThreshold: 1, cooldownMs: 1000 });
    expect(cb.isOpen()).toBe(false);
  });

  it('當記錄 429 失敗時立即轉為開啟 (OPEN)，並拋出 CircuitBreakerOpenError', () => {
    const cb = new CircuitBreaker('test.domain', { failureThreshold: 1, cooldownMs: 1000 });
    cb.recordFailure(429);

    expect(cb.isOpen()).toBe(true);
    expect(() => cb.checkAvailability()).toThrowError(CircuitBreakerOpenError);
  });

  it('冷卻時間過後應自動進入半開/恢復狀態 (HALF-OPEN/CLOSED)', async () => {
    const cb = new CircuitBreaker('test.domain', { failureThreshold: 1, cooldownMs: 1000 });
    cb.recordFailure(429);
    expect(cb.isOpen()).toBe(true);

    // 快進 1001ms
    await vi.advanceTimersByTimeAsync(1001);
    expect(cb.isOpen()).toBe(false);
    expect(() => cb.checkAvailability()).not.toThrow();
  });
});

describe('ClientRequestScheduler (全域請求排程調度器)', () => {
  it('能正確解析 URL 與 CORS proxy 的原始目標網域', () => {
    const scheduler = new ClientRequestScheduler();
    expect(scheduler.resolveDomain('https://query1.finance.yahoo.com/v8/chart/2330.TW')).toBe('query1.finance.yahoo.com');
    expect(scheduler.resolveDomain('https://www.twse.com.tw/rwd/zh/fund/T86')).toBe('www.twse.com.tw');
    expect(scheduler.resolveDomain('https://corsproxy.io/?url=https%3A%2F%2Fwww.twse.com.tw%2Ftest')).toBe('www.twse.com.tw');
    expect(scheduler.resolveDomain('https://api.allorigins.win/raw?url=https://query1.finance.yahoo.com/test')).toBe('query1.finance.yahoo.com');
  });

  it('在正常狀態下能順利執行非同步請求並回傳結果', async () => {
    const scheduler = new ClientRequestScheduler();
    const result = await scheduler.schedule('https://query1.finance.yahoo.com/test', async () => 'hello');
    expect(result).toBe('hello');
  });

  it('當請求拋出 429 時應自動觸發熔斷器', async () => {
    const scheduler = new ClientRequestScheduler({
      defaultCooldownMs: 2000,
    });

    const error429 = new Error('HTTP 429 Too Many Requests');
    await expect(
      scheduler.schedule('https://query1.finance.yahoo.com/test', async () => {
        throw error429;
      })
    ).rejects.toThrow('HTTP 429 Too Many Requests');

    // 隨後立即呼叫同網域，應被熔斷器直接拒絕
    await expect(
      scheduler.schedule('https://query1.finance.yahoo.com/test2', async () => 'should not run')
    ).rejects.toThrowError(CircuitBreakerOpenError);
  });
});
