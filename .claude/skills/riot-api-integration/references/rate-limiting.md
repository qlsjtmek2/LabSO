# Rate Limiting Strategies for Riot API

Complete guide to handling Riot API rate limits, from development to production scale.

## Rate Limit Types

### Application Rate Limits

Apply to your entire API key across all endpoints:

**Development Key:**
```
20 requests per 1 second
100 requests per 2 minutes
```

**Production Key (varies by tier):**
```
Personal: 300 requests per 1 second, 30,000 requests per 10 minutes
Production: Higher limits based on application needs
```

### Method Rate Limits

Apply to specific endpoint families:

**Common Method Limits:**
```
Match-V5: 2000 requests per minute
Summoner-V4: 2000 requests per minute
League-V4: 300 requests per minute
Champion-Mastery-V4: 2000 requests per minute
```

### Service Rate Limits

Shared across all applications globally:
- Protects Riot's backend services
- Rarely hit unless coordinated spike
- Not under your control

---

## Rate Limit Headers

Every API response includes rate limit information:

```http
HTTP/1.1 200 OK
X-App-Rate-Limit: 20:1,100:120
X-App-Rate-Limit-Count: 1:1,5:120
X-Method-Rate-Limit: 2000:60
X-Method-Rate-Limit-Count: 15:60
```

**Header Breakdown:**

`X-App-Rate-Limit: 20:1,100:120`
- Format: `{count}:{window},{count}:{window}`
- `20:1` = 20 requests per 1 second
- `100:120` = 100 requests per 120 seconds

`X-App-Rate-Limit-Count: 1:1,5:120`
- Current usage against limits
- `1:1` = 1 request used in 1-second window
- `5:120` = 5 requests used in 2-minute window

**429 Response:**
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 5
X-Rate-Limit-Type: application
```

`Retry-After: 5` = Wait 5 seconds before retry

---

## Request Queueing System

### Basic Queue Implementation

```typescript
class RiotApiClient {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerSecond = 19; // Slightly under limit for safety
  private requestsPer2Min = 95;
  private recentRequests: number[] = [];

  async enqueue<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      if (!this.canMakeRequest()) {
        await this.sleep(100); // Check again in 100ms
        continue;
      }

      const request = this.queue.shift();
      if (request) {
        this.recordRequest();
        await request();
      }
    }

    this.processing = false;
  }

  private canMakeRequest(): boolean {
    const now = Date.now();

    // Check 1-second window
    const lastSecond = this.recentRequests.filter(t => now - t < 1000);
    if (lastSecond.length >= this.requestsPerSecond) return false;

    // Check 2-minute window
    const last2Min = this.recentRequests.filter(t => now - t < 120000);
    if (last2Min.length >= this.requestsPer2Min) return false;

    return true;
  }

  private recordRequest() {
    const now = Date.now();
    this.recentRequests.push(now);

    // Clean old records (older than 2 minutes)
    this.recentRequests = this.recentRequests.filter(t => now - t < 120000);
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Usage

```typescript
const client = new RiotApiClient();

// Instead of direct API call:
// const data = await axios.get(url);

// Queue the request:
const data = await client.enqueue(() => axios.get(url));
```

---

## 429 Error Handling

### Retry with Exponential Backoff

```typescript
async function fetchWithRetry<T>(
  url: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: { 'X-Riot-Token': process.env.RIOT_API_KEY }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : baseDelay * Math.pow(2, attempt);

        console.log(`Rate limited. Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Non-429 error, don't retry
      }
    }
  }

  throw new Error('Max retries exceeded');
}
```

### Rate Limit Type Detection

```typescript
function handleRateLimit(error: any) {
  const rateLimitType = error.response?.headers['x-rate-limit-type'];

  switch (rateLimitType) {
    case 'application':
      console.warn('App-wide rate limit hit');
      // Slow down all requests
      break;
    case 'method':
      console.warn('Method-specific rate limit hit');
      // Slow down this specific endpoint
      break;
    case 'service':
      console.error('Service rate limit hit (global)');
      // Back off significantly
      break;
  }

  const retryAfter = error.response?.headers['retry-after'];
  return retryAfter ? parseInt(retryAfter) * 1000 : 5000;
}
```

---

## Advanced Queue Strategies

### Priority Queue

Give priority to user-facing requests over background tasks:

```typescript
enum Priority {
  HIGH = 0,    // User-initiated requests
  MEDIUM = 1,  // Prefetching
  LOW = 2      // Background data collection
}

class PriorityQueue {
  private queues: Map<Priority, Array<() => Promise<any>>> = new Map([
    [Priority.HIGH, []],
    [Priority.MEDIUM, []],
    [Priority.LOW, []]
  ]);

  enqueue(request: () => Promise<any>, priority: Priority) {
    this.queues.get(priority)!.push(request);
  }

  dequeue(): (() => Promise<any>) | undefined {
    // Try HIGH first, then MEDIUM, then LOW
    for (const priority of [Priority.HIGH, Priority.MEDIUM, Priority.LOW]) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    return undefined;
  }
}
```

### Burst Allowance

Allow short bursts while maintaining average rate:

```typescript
class BurstLimiter {
  private tokens = 20; // Start with full bucket
  private maxTokens = 20;
  private refillRate = 20; // 20 per second
  private lastRefill = Date.now();

  canRequest(): boolean {
    this.refillTokens();
    return this.tokens >= 1;
  }

  consumeToken() {
    this.tokens -= 1;
  }

  private refillTokens() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate
    );
    this.tokens = newTokens;
    this.lastRefill = now;
  }
}
```

---

## Production Scaling Strategies

### Multi-Key Rotation

Distribute load across multiple API keys:

```typescript
class KeyRotator {
  private keys: string[];
  private currentIndex = 0;
  private keyStats: Map<string, { requests: number[], blocked: boolean }>;

  constructor(keys: string[]) {
    this.keys = keys;
    this.keyStats = new Map(keys.map(k => [k, { requests: [], blocked: false }]));
  }

  getNextKey(): string {
    // Round-robin with skip if blocked
    let attempts = 0;
    while (attempts < this.keys.length) {
      const key = this.keys[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;

      const stats = this.keyStats.get(key)!;
      if (!stats.blocked && this.canUseKey(key)) {
        return key;
      }
      attempts++;
    }

    throw new Error('All keys exhausted');
  }

  private canUseKey(key: string): boolean {
    const stats = this.keyStats.get(key)!;
    const now = Date.now();
    const recentRequests = stats.requests.filter(t => now - t < 1000);
    return recentRequests.length < 20;
  }

  recordRequest(key: string) {
    const stats = this.keyStats.get(key)!;
    stats.requests.push(Date.now());
  }

  markBlocked(key: string, duration: number) {
    const stats = this.keyStats.get(key)!;
    stats.blocked = true;
    setTimeout(() => stats.blocked = false, duration);
  }
}
```

### Request Batching

Batch related requests to minimize total API calls:

```typescript
class BatchLoader {
  private batchQueue: Map<string, Array<(data: any) => void>> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;

  async loadMatch(matchId: string): Promise<any> {
    return new Promise((resolve) => {
      if (!this.batchQueue.has(matchId)) {
        this.batchQueue.set(matchId, []);
      }
      this.batchQueue.get(matchId)!.push(resolve);

      // Schedule batch execution
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => this.executeBatch(), 50);
      }
    });
  }

  private async executeBatch() {
    const matchIds = Array.from(this.batchQueue.keys());
    const promises = matchIds.map(id => fetchMatchDetail(id));

    const results = await Promise.allSettled(promises);

    results.forEach((result, i) => {
      const matchId = matchIds[i];
      const callbacks = this.batchQueue.get(matchId)!;

      if (result.status === 'fulfilled') {
        callbacks.forEach(cb => cb(result.value));
      } else {
        callbacks.forEach(cb => cb(null));
      }
    });

    this.batchQueue.clear();
    this.batchTimeout = null;
  }
}
```

---

## Monitoring and Metrics

### Track Rate Limit Usage

```typescript
class RateLimitMonitor {
  private metrics = {
    requestsThisSecond: 0,
    requestsThis2Min: 0,
    totalRequests: 0,
    rateLimitHits: 0,
    avgResponseTime: 0
  };

  recordRequest(responseTime: number) {
    this.metrics.requestsThisSecond++;
    this.metrics.requestsThis2Min++;
    this.metrics.totalRequests++;

    // Update average response time
    const total = this.metrics.avgResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.avgResponseTime = (total + responseTime) / this.metrics.totalRequests;

    // Reset counters
    setTimeout(() => this.metrics.requestsThisSecond--, 1000);
    setTimeout(() => this.metrics.requestsThis2Min--, 120000);
  }

  recordRateLimit() {
    this.metrics.rateLimitHits++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      utilizationPercent: (this.metrics.requestsThisSecond / 20) * 100,
      efficiency: 100 - (this.metrics.rateLimitHits / this.metrics.totalRequests) * 100
    };
  }
}
```

### Logging Rate Limit Headers

```typescript
function logRateLimitHeaders(response: AxiosResponse) {
  const headers = {
    appLimit: response.headers['x-app-rate-limit'],
    appCount: response.headers['x-app-rate-limit-count'],
    methodLimit: response.headers['x-method-rate-limit'],
    methodCount: response.headers['x-method-rate-limit-count']
  };

  console.log('Rate Limit Status:', headers);

  // Parse and warn if close to limit
  const [used1s, limit1s] = parseRateLimit(headers.appCount, headers.appLimit);
  if (used1s / limit1s > 0.9) {
    console.warn('⚠️ Approaching 1-second rate limit');
  }
}

function parseRateLimit(count: string, limit: string): [number, number] {
  const [used] = count.split(',')[0].split(':').map(Number);
  const [allowed] = limit.split(',')[0].split(':').map(Number);
  return [used, allowed];
}
```

---

## Best Practices

### DO:
✅ Implement request queueing from day one
✅ Respect `Retry-After` header on 429 errors
✅ Set rate limits slightly below official limits (e.g., 19/sec instead of 20/sec)
✅ Use exponential backoff for retries
✅ Cache aggressively to reduce API calls
✅ Monitor rate limit headers
✅ Log all 429 errors for analysis
✅ Batch related requests when possible

### DON'T:
❌ Make parallel requests without queueing
❌ Ignore 429 errors
❌ Retry immediately without delay
❌ Hit rate limits during user-facing operations
❌ Use deprecated summoner name lookups (inefficient)
❌ Re-fetch static data on every request
❌ Fetch same match multiple times

---

## Error Recovery Strategies

### Graceful Degradation

```typescript
async function getSummonerWithFallback(name: string, tag: string) {
  try {
    return await getSummonerByRiotId(name, tag);
  } catch (error: any) {
    if (error.response?.status === 429) {
      // Return cached data if available
      const cached = await cache.get(`summoner:${name}#${tag}`);
      if (cached) {
        console.log('Using cached data due to rate limit');
        return cached;
      }
    }
    throw error;
  }
}
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private threshold = 5;
  private timeout = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.error('Circuit breaker opened due to failures');
    }
  }
}
```

---

## Testing Rate Limits

### Local Testing

```typescript
// Simulate rate limit in development
class MockRateLimiter {
  private requests: number[] = [];

  async testRateLimit() {
    // Fire 25 requests rapidly
    const promises = Array(25).fill(0).map(async (_, i) => {
      try {
        await this.makeRequest();
        console.log(`Request ${i + 1}: Success`);
      } catch (error: any) {
        console.log(`Request ${i + 1}: ${error.message}`);
      }
    });

    await Promise.allSettled(promises);
  }

  private async makeRequest() {
    const now = Date.now();
    const recentRequests = this.requests.filter(t => now - t < 1000);

    if (recentRequests.length >= 20) {
      throw new Error('Rate limit exceeded (20/sec)');
    }

    this.requests.push(now);
    return { success: true };
  }
}
```

---

## Upgrading to Production Key

When ready for production:

1. **Prepare Application:**
   - Implement robust rate limiting
   - Add comprehensive error handling
   - Set up monitoring and logging
   - Test with development key

2. **Application Requirements:**
   - Working website/application
   - Clear use case description
   - Expected traffic estimates
   - User benefit explanation

3. **Submit Application:**
   - Go to Riot Developer Portal
   - Navigate to "Apps"
   - Click "Register Product"
   - Choose tier (Personal or Production)
   - Fill out application form

4. **Approval Process:**
   - Personal Key: Usually approved within days
   - Production Key: May require demo and review
   - Higher limits require justification

5. **Post-Approval:**
   - Update `RIOT_API_KEY` environment variable
   - Adjust rate limiter thresholds
   - Monitor initial traffic
   - Scale infrastructure as needed

---

## Summary

Rate limiting is critical for Riot API integration:

- **Development:** 20/sec, 100/2min - Sufficient for testing
- **Production:** 300+/sec - Requires approval
- **Always queue requests** - Prevent 429 errors
- **Respect Retry-After** - Don't hammer on failures
- **Cache aggressively** - Minimize API calls
- **Monitor metrics** - Track utilization and failures

See `examples/rate-limiter.ts` for complete implementation.
