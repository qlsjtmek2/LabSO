/**
 * Production-Ready Riot API Rate Limiter
 *
 * Features:
 * - Request queueing with dual time windows (1s and 2min)
 * - Automatic 429 retry with Retry-After header support
 * - Exponential backoff
 * - Metrics tracking
 * - Circuit breaker pattern
 *
 * Usage:
 *   const limiter = new RiotApiRateLimiter();
 *   const data = await limiter.request(() => axios.get(url));
 */

import axios, { AxiosResponse } from 'axios';

interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPer2Minutes: number;
  maxRetries: number;
  baseRetryDelay: number;
}

interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
  avgResponseTime: number;
  queueLength: number;
}

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  priority: RequestPriority;
  timestamp: number;
}

enum RequestPriority {
  HIGH = 0,    // User-initiated requests
  MEDIUM = 1,  // Prefetching
  LOW = 2      // Background tasks
}

export class RiotApiRateLimiter {
  private config: RateLimitConfig;
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private recentRequests: number[] = [];
  private metrics: RequestMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitHits: 0,
    avgResponseTime: 0,
    queueLength: 0
  };

  // Circuit breaker state
  private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 60000; // 1 minute

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      requestsPerSecond: 19, // Slightly under 20 for safety margin
      requestsPer2Minutes: 95, // Slightly under 100
      maxRetries: 3,
      baseRetryDelay: 1000,
      ...config
    };
  }

  /**
   * Queue a request with automatic rate limiting and retry logic
   */
  async request<T>(
    fn: () => Promise<AxiosResponse<T>>,
    priority: RequestPriority = RequestPriority.MEDIUM
  ): Promise<T> {
    // Check circuit breaker
    if (this.circuitBreakerState === 'OPEN') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure > this.circuitBreakerTimeout) {
        console.log('Circuit breaker: Attempting recovery (HALF_OPEN)');
        this.circuitBreakerState = 'HALF_OPEN';
      } else {
        throw new Error(
          `Circuit breaker is OPEN. Retry after ${Math.ceil((this.circuitBreakerTimeout - timeSinceFailure) / 1000)}s`
        );
      }
    }

    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        execute: () => this.executeWithRetry(fn),
        resolve,
        reject,
        priority,
        timestamp: Date.now()
      };

      this.queue.push(request);
      this.metrics.queueLength = this.queue.length;

      // Sort queue by priority (stable sort maintains timestamp order within priority)
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.timestamp - b.timestamp;
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests respecting rate limits
   */
  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      // Wait if rate limit would be exceeded
      if (!this.canMakeRequest()) {
        await this.sleep(100); // Check again in 100ms
        continue;
      }

      const request = this.queue.shift();
      if (!request) break;

      this.metrics.queueLength = this.queue.length;

      try {
        this.recordRequest();
        const startTime = Date.now();

        const result = await request.execute();

        const responseTime = Date.now() - startTime;
        this.updateMetrics(true, responseTime);
        this.onSuccess();

        request.resolve(result);
      } catch (error) {
        this.updateMetrics(false, 0);
        this.onFailure(error);
        request.reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<AxiosResponse<T>>,
    attempt: number = 0
  ): Promise<T> {
    try {
      const response = await fn();
      return response.data;
    } catch (error: any) {
      // Handle rate limit errors
      if (error.response?.status === 429 && attempt < this.config.maxRetries) {
        this.metrics.rateLimitHits++;

        const retryAfter = this.getRetryDelay(error, attempt);
        const rateLimitType = error.response.headers['x-rate-limit-type'] || 'unknown';

        console.warn(
          `Rate limit hit (${rateLimitType}). Retrying after ${retryAfter}ms (attempt ${attempt + 1}/${this.config.maxRetries})`
        );

        await this.sleep(retryAfter);
        return this.executeWithRetry(fn, attempt + 1);
      }

      // Non-retryable error or max retries exceeded
      throw error;
    }
  }

  /**
   * Calculate retry delay from response or exponential backoff
   */
  private getRetryDelay(error: any, attempt: number): number {
    // Check for Retry-After header
    const retryAfter = error.response?.headers['retry-after'];
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }

    // Exponential backoff: baseDelay * 2^attempt
    return this.config.baseRetryDelay * Math.pow(2, attempt);
  }

  /**
   * Check if we can make a request without exceeding rate limits
   */
  private canMakeRequest(): boolean {
    const now = Date.now();

    // Clean old request timestamps (older than 2 minutes)
    this.recentRequests = this.recentRequests.filter(t => now - t < 120000);

    // Check 1-second window
    const lastSecond = this.recentRequests.filter(t => now - t < 1000);
    if (lastSecond.length >= this.config.requestsPerSecond) {
      return false;
    }

    // Check 2-minute window
    if (this.recentRequests.length >= this.config.requestsPer2Minutes) {
      return false;
    }

    return true;
  }

  /**
   * Record a request timestamp
   */
  private recordRequest() {
    this.recentRequests.push(Date.now());
  }

  /**
   * Update metrics
   */
  private updateMetrics(success: boolean, responseTime: number) {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successfulRequests++;

      // Update average response time
      const totalTime =
        this.metrics.avgResponseTime * (this.metrics.successfulRequests - 1) + responseTime;
      this.metrics.avgResponseTime = totalTime / this.metrics.successfulRequests;
    } else {
      this.metrics.failedRequests++;
    }
  }

  /**
   * Circuit breaker: Record success
   */
  private onSuccess() {
    this.failureCount = 0;
    if (this.circuitBreakerState === 'HALF_OPEN') {
      console.log('Circuit breaker: Recovery successful (CLOSED)');
      this.circuitBreakerState = 'CLOSED';
    }
  }

  /**
   * Circuit breaker: Record failure
   */
  private onFailure(error: any) {
    // Only count non-429 errors for circuit breaker
    if (error.response?.status !== 429) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.circuitBreakerThreshold) {
        console.error('Circuit breaker: Threshold exceeded (OPEN)');
        this.circuitBreakerState = 'OPEN';
      }
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): RequestMetrics & {
    successRate: number;
    utilizationPercent: number;
    circuitBreakerState: string;
  } {
    const successRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
        : 0;

    const utilizationPercent =
      (this.recentRequests.filter(t => Date.now() - t < 1000).length /
        this.config.requestsPerSecond) *
      100;

    return {
      ...this.metrics,
      successRate,
      utilizationPercent,
      circuitBreakerState: this.circuitBreakerState
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      avgResponseTime: 0,
      queueLength: this.queue.length
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    length: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    oldestWaitTime: number;
  } {
    const now = Date.now();
    return {
      length: this.queue.length,
      highPriority: this.queue.filter(r => r.priority === RequestPriority.HIGH).length,
      mediumPriority: this.queue.filter(r => r.priority === RequestPriority.MEDIUM).length,
      lowPriority: this.queue.filter(r => r.priority === RequestPriority.LOW).length,
      oldestWaitTime: this.queue.length > 0 ? now - this.queue[0].timestamp : 0
    };
  }
}

/**
 * Example Usage
 */
export async function exampleUsage() {
  const limiter = new RiotApiRateLimiter();
  const RIOT_API_KEY = process.env.RIOT_API_KEY;

  try {
    // High priority request (user-initiated)
    const summoner = await limiter.request(
      () =>
        axios.get('https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/PUUID', {
          headers: { 'X-Riot-Token': RIOT_API_KEY }
        }),
      RequestPriority.HIGH
    );

    console.log('Summoner:', summoner);

    // Medium priority request (prefetching)
    const matches = await limiter.request(
      () =>
        axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/PUUID/ids', {
          headers: { 'X-Riot-Token': RIOT_API_KEY },
          params: { count: 20 }
        }),
      RequestPriority.MEDIUM
    );

    console.log('Matches:', matches);

    // Low priority request (background task)
    const champions = await limiter.request(
      () => axios.get('https://ddragon.leagueoflegends.com/cdn/16.2.1/data/ko_KR/champion.json'),
      RequestPriority.LOW
    );

    console.log('Champions loaded');

    // View metrics
    const metrics = limiter.getMetrics();
    console.log('Metrics:', metrics);

    // View queue status
    const queueStatus = limiter.getQueueStatus();
    console.log('Queue:', queueStatus);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

/**
 * Singleton instance for application-wide use
 */
export const riotApiLimiter = new RiotApiRateLimiter();
