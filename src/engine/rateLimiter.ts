import { logger } from '../utils/logger';

export class RateLimitExceededError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

export class CircuitBreakerOpenError extends Error {
  public domain: string;
  public cooldownRemainingMs: number;

  constructor(domain: string, cooldownRemainingMs: number) {
    super(`Circuit breaker is OPEN for domain "${domain}". Cooldown remaining: ${Math.ceil(cooldownRemainingMs / 1000)}s`);
    this.name = 'CircuitBreakerOpenError';
    this.domain = domain;
    this.cooldownRemainingMs = cooldownRemainingMs;
  }
}

export interface TokenBucketOptions {
  maxTokens: number;        // 最大權杖容量
  refillRatePerSec: number; // 每秒補充權杖數量
}

/**
 * 權杖桶節流器 (Token Bucket Rate Limiter)
 */
export class TokenBucket {
  private maxTokens: number;
  private refillRatePerSec: number;
  private tokens: number;
  private lastRefillTimestamp: number;
  private queue: Array<() => void> = [];
  private isProcessingQueue = false;

  constructor(options: TokenBucketOptions) {
    this.maxTokens = options.maxTokens;
    this.refillRatePerSec = options.refillRatePerSec;
    this.tokens = options.maxTokens;
    this.lastRefillTimestamp = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedTimeMs = Math.max(0, now - this.lastRefillTimestamp);
    if (elapsedTimeMs <= 0) return;

    const tokensToAdd = (elapsedTimeMs / 1000) * this.refillRatePerSec;
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefillTimestamp = now;
    }
  }

  public getTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  public async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // 權杖不足，排隊等待
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.scheduleQueueDrain();
    });
  }

  private scheduleQueueDrain(): void {
    if (this.isProcessingQueue || this.queue.length === 0) {
      return;
    }
    this.isProcessingQueue = true;

    const checkAndDrain = () => {
      this.refill();
      while (this.queue.length > 0 && this.tokens >= 1) {
        this.tokens -= 1;
        const next = this.queue.shift();
        if (next) next();
      }

      if (this.queue.length > 0) {
        // 計算補充 1 個 token 所需的毫秒數
        const neededTokens = 1 - this.tokens;
        const waitMs = Math.max(20, Math.ceil((neededTokens / this.refillRatePerSec) * 1000));
        setTimeout(checkAndDrain, waitMs);
      } else {
        this.isProcessingQueue = false;
      }
    };

    checkAndDrain();
  }
}

/**
 * 連線並發池 (Concurrency Pool)
 */
export class ConcurrencyPool {
  private maxConcurrency: number;
  private activeCount: number = 0;
  private queue: Array<() => void> = [];

  constructor(maxConcurrency: number = 3) {
    this.maxConcurrency = Math.max(1, maxConcurrency);
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) next();
      }
    }
  }
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // 觸發熔斷的連續失敗次數 (預設 1 次 429 即觸發)
  cooldownMs?: number;       // 熔斷冷卻毫秒數 (預設 30,000ms = 30秒)
}

/**
 * 網域熔斷器 (Circuit Breaker)
 */
export class CircuitBreaker {
  public domain: string;
  private failureThreshold: number;
  private cooldownMs: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private cooldownUntil: number = 0;
  private consecutiveFailures: number = 0;

  constructor(domain: string, options?: CircuitBreakerOptions) {
    this.domain = domain;
    this.failureThreshold = options?.failureThreshold ?? 1;
    this.cooldownMs = options?.cooldownMs ?? 30000;
  }

  public isOpen(): boolean {
    if (this.state === 'OPEN') {
      if (Date.now() >= this.cooldownUntil) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  public checkAvailability(): void {
    if (this.isOpen()) {
      const remainingMs = Math.max(0, this.cooldownUntil - Date.now());
      throw new CircuitBreakerOpenError(this.domain, remainingMs);
    }
  }

  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(status?: number | string): void {
    const isRateLimited =
      status === 429 ||
      status === '429' ||
      status === 503 ||
      status === '503' ||
      String(status).includes('429');

    if (isRateLimited) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.state = 'OPEN';
        this.cooldownUntil = Date.now() + this.cooldownMs;
        logger.warn(
          `[CircuitBreaker] Domain "${this.domain}" tripped due to HTTP ${status}. Cooldown for ${this.cooldownMs / 1000}s`
        );
      }
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.cooldownUntil = 0;
  }
}

export interface DomainSchedulePolicy {
  maxTokens: number;
  refillRatePerSec: number;
  maxConcurrency: number;
  cooldownMs?: number;
}

export interface SchedulerOptions {
  defaultCooldownMs?: number;
  customPolicies?: Record<string, DomainSchedulePolicy>;
}

/**
 * 全域客戶端請求調度器 (Client Request Scheduler)
 */
export class ClientRequestScheduler {
  private buckets: Map<string, TokenBucket> = new Map();
  private pools: Map<string, ConcurrencyPool> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private policies: Map<string, DomainSchedulePolicy> = new Map();
  private defaultPolicy: DomainSchedulePolicy;

  constructor(options?: SchedulerOptions) {
    const defaultCooldown = options?.defaultCooldownMs ?? 30000;

    this.defaultPolicy = {
      maxTokens: 5,
      refillRatePerSec: 3,
      maxConcurrency: 3,
      cooldownMs: defaultCooldown,
    };

    // 內建主流金融數據網域專用策略
    this.policies.set('query1.finance.yahoo.com', {
      maxTokens: 5,
      refillRatePerSec: 3,
      maxConcurrency: 3,
      cooldownMs: defaultCooldown,
    });
    this.policies.set('www.twse.com.tw', {
      maxTokens: 3,
      refillRatePerSec: 2,
      maxConcurrency: 2,
      cooldownMs: defaultCooldown,
    });
    this.policies.set('www.tpex.org.tw', {
      maxTokens: 3,
      refillRatePerSec: 2,
      maxConcurrency: 2,
      cooldownMs: defaultCooldown,
    });

    if (options?.customPolicies) {
      for (const [dom, pol] of Object.entries(options.customPolicies)) {
        this.policies.set(dom, pol);
      }
    }
  }

  /**
   * 自動萃取真實目標網域（自動解構 CORS 代理封裝）
   */
  public resolveDomain(targetUrl: string): string {
    try {
      let urlToParse = targetUrl;
      // 處理常見代理參數
      if (urlToParse.includes('?url=') || urlToParse.includes('&url=')) {
        const urlParam = new URL(urlToParse).searchParams.get('url');
        if (urlParam) urlToParse = decodeURIComponent(urlParam);
      } else if (urlToParse.includes('?quest=') || urlToParse.includes('&quest=')) {
        const questParam = new URL(urlToParse).searchParams.get('quest');
        if (questParam) urlToParse = decodeURIComponent(questParam);
      }

      const parsed = new URL(urlToParse);
      return parsed.hostname.toLowerCase();
    } catch {
      return 'default';
    }
  }

  private getBucket(domain: string): TokenBucket {
    let bucket = this.buckets.get(domain);
    if (!bucket) {
      const policy = this.policies.get(domain) || this.defaultPolicy;
      bucket = new TokenBucket({
        maxTokens: policy.maxTokens,
        refillRatePerSec: policy.refillRatePerSec,
      });
      this.buckets.set(domain, bucket);
    }
    return bucket;
  }

  private getPool(domain: string): ConcurrencyPool {
    let pool = this.pools.get(domain);
    if (!pool) {
      const policy = this.policies.get(domain) || this.defaultPolicy;
      pool = new ConcurrencyPool(policy.maxConcurrency);
      this.pools.set(domain, pool);
    }
    return pool;
  }

  private getCircuitBreaker(domain: string): CircuitBreaker {
    let cb = this.circuitBreakers.get(domain);
    if (!cb) {
      const policy = this.policies.get(domain) || this.defaultPolicy;
      cb = new CircuitBreaker(domain, {
        failureThreshold: 1,
        cooldownMs: policy.cooldownMs,
      });
      this.circuitBreakers.set(domain, cb);
    }
    return cb;
  }

  /**
   * 透過速率限制器與熔斷保護執行外部非同步請求
   */
  public async schedule<T>(url: string, requestFn: () => Promise<T>): Promise<T> {
    const domain = this.resolveDomain(url);
    const cb = this.getCircuitBreaker(domain);

    // 1. 檢查熔斷器狀態
    cb.checkAvailability();

    // 2. 獲取權杖桶 Token
    const bucket = this.getBucket(domain);
    await bucket.acquire();

    // 3. 獲取並發槽位並執行
    const pool = this.getPool(domain);
    return pool.run(async () => {
      try {
        const result = await requestFn();
        cb.recordSuccess();
        return result;
      } catch (err: any) {
        // 判斷是否為 429 / 503 錯誤
        const errMsg = err?.message || String(err);
        if (errMsg.includes('429') || errMsg.includes('503')) {
          cb.recordFailure(errMsg);
        }
        throw err;
      }
    });
  }

  public resetCircuitBreaker(domain: string): void {
    this.circuitBreakers.get(domain)?.reset();
  }
}

export const globalRequestScheduler = new ClientRequestScheduler();
