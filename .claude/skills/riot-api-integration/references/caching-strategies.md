# Caching Strategies for Riot API

Comprehensive caching strategies to minimize API calls, respect rate limits, and improve performance.

## Cache Hierarchy

Different data types require different caching strategies based on update frequency and importance.

### Tier 1: Static Data (Long-Term Cache)

**Duration:** 24 hours to permanent
**Invalidation:** Patch detection

#### DataDragon Assets

```typescript
// Version cache (24 hours)
const versionCache = {
  key: 'ddragon:version',
  ttl: 86400, // 24 hours
  invalidate: 'on-patch'
};

// Champion data (until patch)
const championCache = {
  key: 'ddragon:champions:{version}',
  ttl: Infinity, // Never expires
  invalidate: 'version-change'
};

// Item data (until patch)
const itemCache = {
  key: 'ddragon:items:{version}',
  ttl: Infinity,
  invalidate: 'version-change'
};
```

**Implementation:**
```typescript
const versionCacheKey = 'ddragon:version';
let cachedVersion: { version: string, timestamp: number } | null = null;

async function getLatestVersion(): Promise<string> {
  const now = Date.now();

  // Check memory cache first
  if (cachedVersion && now - cachedVersion.timestamp < 86400000) {
    return cachedVersion.version;
  }

  // Fetch fresh version
  const res = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
  const version = res.data[0];

  cachedVersion = { version, timestamp: now };
  return version;
}
```

**Patch Detection:**
```typescript
async function detectPatch(): Promise<boolean> {
  const currentVersion = await getLatestVersion();
  const storedVersion = await redis.get('current-patch');

  if (currentVersion !== storedVersion) {
    console.log(`New patch detected: ${storedVersion} → ${currentVersion}`);
    await redis.set('current-patch', currentVersion);
    await invalidateStaticDataCache();
    return true;
  }

  return false;
}

async function invalidateStaticDataCache() {
  const pattern = 'ddragon:*';
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  console.log(`Invalidated ${keys.length} static data cache entries`);
}
```

---

### Tier 2: Match Data (Permanent Cache)

**Duration:** Permanent (matches never change)
**Invalidation:** Never

```typescript
const matchCache = {
  key: 'match:{matchId}',
  ttl: Infinity,
  invalidate: 'never'
};

const timelineCache = {
  key: 'timeline:{matchId}',
  ttl: Infinity,
  invalidate: 'never'
};
```

**Implementation:**
```typescript
async function getMatchDetail(matchId: string) {
  // Check cache first
  const cached = await redis.get(`match:${matchId}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from API
  const url = `${MATCH_BASE_URL}/lol/match/v5/matches/${matchId}`;
  const res = await axios.get(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY }
  });

  // Cache permanently
  await redis.set(`match:${matchId}`, JSON.stringify(res.data));
  return res.data;
}
```

**Database Storage:**
```sql
CREATE TABLE matches (
  match_id VARCHAR(50) PRIMARY KEY,
  region VARCHAR(10) NOT NULL,
  game_creation BIGINT NOT NULL,
  game_duration INT NOT NULL,
  game_mode VARCHAR(20),
  queue_id INT,
  data JSONB NOT NULL, -- Full match JSON
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_game_creation (game_creation),
  INDEX idx_queue_id (queue_id)
);

CREATE TABLE match_participants (
  id SERIAL PRIMARY KEY,
  match_id VARCHAR(50) REFERENCES matches(match_id),
  puuid VARCHAR(100) NOT NULL,
  champion_id INT NOT NULL,
  team_position VARCHAR(20),
  kills INT,
  deaths INT,
  assists INT,
  win BOOLEAN,
  INDEX idx_puuid (puuid),
  INDEX idx_champion_id (champion_id)
);
```

**Benefits:**
- Fast match history retrieval
- Offline analysis capability
- Historical statistics
- Reduced API calls to zero for cached matches

---

### Tier 3: Summoner Data (Short-Term Cache)

**Duration:** 5 minutes
**Invalidation:** TTL expiry

```typescript
const summonerCache = {
  key: 'summoner:{puuid}',
  ttl: 300, // 5 minutes
  invalidate: 'ttl'
};
```

**Why short cache:**
- Summoner level changes during play
- Profile icon may update
- Data lightweight (minimal storage cost)

**Implementation:**
```typescript
async function getSummonerByPuuid(puuid: string) {
  const cacheKey = `summoner:${puuid}`;

  // Check Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from API
  const url = `${BASE_URL}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  const res = await axios.get(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY }
  });

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(res.data));
  return res.data;
}
```

---

### Tier 4: Rank Data (Very Short Cache)

**Duration:** 1-2 minutes
**Invalidation:** TTL expiry

```typescript
const rankCache = {
  key: 'rank:{summonerId}',
  ttl: 120, // 2 minutes
  invalidate: 'ttl'
};
```

**Why very short:**
- Updates after every ranked game
- Critical for accurate display
- High user expectation of freshness

**Implementation:**
```typescript
async function getLeagueEntries(summonerId: string) {
  const cacheKey = `rank:${summonerId}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const url = `${BASE_URL}/lol/league/v4/entries/by-summoner/${summonerId}`;
  const res = await axios.get(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY }
  });

  // Cache for 2 minutes
  await redis.setex(cacheKey, 120, JSON.stringify(res.data));
  return res.data;
}
```

---

### Tier 5: Match List (User Session Cache)

**Duration:** Session-based or 10 minutes
**Invalidation:** User refresh or TTL

```typescript
const matchListCache = {
  key: 'matchlist:{puuid}:{count}',
  ttl: 600, // 10 minutes
  invalidate: 'ttl-or-user-refresh'
};
```

**Implementation:**
```typescript
async function getMatchList(puuid: string, count: number = 20, forceRefresh: boolean = false) {
  const cacheKey = `matchlist:${puuid}:${count}`;

  if (!forceRefresh) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  const url = `${MATCH_BASE_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids`;
  const res = await axios.get(url, {
    params: { start: 0, count },
    headers: { 'X-Riot-Token': RIOT_API_KEY }
  });

  await redis.setex(cacheKey, 600, JSON.stringify(res.data));
  return res.data;
}
```

---

## Cache Storage Options

### In-Memory Cache (Development)

**Pros:**
- Zero setup
- Fast access
- No external dependencies

**Cons:**
- Lost on server restart
- Not shared across instances
- Memory limited

**Implementation:**
```typescript
class MemoryCache {
  private cache = new Map<string, { data: any, expires: number }>();

  set(key: string, value: any, ttl: number) {
    const expires = Date.now() + ttl * 1000;
    this.cache.set(key, { data: value, expires });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

const cache = new MemoryCache();
```

---

### Redis Cache (Production)

**Pros:**
- Persistent across restarts
- Shared across instances
- TTL built-in
- High performance

**Cons:**
- External dependency
- Requires setup

**Setup:**
```bash
# Install Redis
npm install redis

# Run Redis locally
docker run -d -p 6379:6379 redis:alpine

# Or use Redis Cloud (free tier)
```

**Implementation:**
```typescript
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

await redis.connect();

// Set with TTL
await redis.setEx('key', 3600, JSON.stringify(data));

// Get
const cached = await redis.get('key');
const data = cached ? JSON.parse(cached) : null;

// Delete
await redis.del('key');

// Pattern matching
const keys = await redis.keys('match:*');

// Atomic operations
await redis.incr('api-calls-today');
```

---

### Database Cache (Persistent)

**Pros:**
- Already have database
- Queryable
- Historical analysis

**Cons:**
- Slower than Redis
- Database load

**When to use:**
- Match data (permanent storage)
- Analytics and statistics
- Audit trails

**Implementation:**
```typescript
async function getCachedMatch(matchId: string) {
  const result = await db.query(
    'SELECT data FROM matches WHERE match_id = $1',
    [matchId]
  );

  if (result.rows.length > 0) {
    return result.rows[0].data;
  }

  // Fetch from API
  const match = await fetchMatchDetail(matchId);

  // Store in DB
  await db.query(
    'INSERT INTO matches (match_id, region, game_creation, data) VALUES ($1, $2, $3, $4)',
    [matchId, 'kr', match.info.gameCreation, match]
  );

  return match;
}
```

---

## Cache Invalidation Strategies

### Time-Based (TTL)

Most common and simplest:

```typescript
// Redis built-in TTL
await redis.setEx('key', 300, value); // Expires in 5 minutes

// Manual TTL check
const entry = cache.get('key');
if (entry && Date.now() > entry.expires) {
  cache.delete('key');
  return null;
}
```

### Event-Based

Invalidate on specific events:

```typescript
// When user updates profile
async function updateProfile(puuid: string, data: any) {
  await saveProfile(puuid, data);
  await redis.del(`summoner:${puuid}`); // Invalidate cache
}

// When new match completes
async function onMatchComplete(matchId: string, participants: string[]) {
  // Invalidate match lists for all participants
  for (const puuid of participants) {
    await redis.del(`matchlist:${puuid}:*`);
  }
}
```

### Version-Based

For static data:

```typescript
async function getChampions(version?: string) {
  if (!version) {
    version = await getLatestVersion();
  }

  const cacheKey = `champions:${version}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const data = await fetchChampions(version);
  await redis.set(cacheKey, JSON.stringify(data)); // No expiry
  return data;
}
```

### Manual Invalidation

Admin controls:

```typescript
// API endpoint for cache clear
app.post('/api/admin/cache/clear', async (req, res) => {
  const { pattern } = req.body;

  const keys = await redis.keys(pattern || '*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }

  res.json({ cleared: keys.length });
});
```

---

## Cache Warming Strategies

### Predictive Prefetching

```typescript
async function warmCacheForUser(puuid: string) {
  // Fetch summoner (will cache)
  const summoner = await getSummonerByPuuid(puuid);

  // Prefetch match list
  const matchIds = await getMatchList(puuid, 20);

  // Prefetch first 5 matches in background
  matchIds.slice(0, 5).forEach(matchId => {
    getMatchDetail(matchId).catch(console.error);
  });
}
```

### Periodic Refresh

```typescript
// Refresh popular data every hour
setInterval(async () => {
  const version = await getLatestVersion();
  await getChampions(version); // Caches for next request
  await getItems(version);
}, 3600000);
```

### Popular Data Preloading

```typescript
// Load top 100 challengers at startup
async function preloadChallengers() {
  const league = await fetch('/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5');

  for (const entry of league.entries.slice(0, 100)) {
    getSummonerById(entry.summonerId).catch(console.error);
  }
}
```

---

## Performance Optimization

### Cache Hit Rate Monitoring

```typescript
class CacheMetrics {
  private hits = 0;
  private misses = 0;

  recordHit() {
    this.hits++;
  }

  recordMiss() {
    this.misses++;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }

  reset() {
    this.hits = 0;
    this.misses = 0;
  }
}

const metrics = new CacheMetrics();

async function getCached(key: string) {
  const value = await redis.get(key);

  if (value) {
    metrics.recordHit();
    return JSON.parse(value);
  }

  metrics.recordMiss();
  return null;
}

// Log metrics every minute
setInterval(() => {
  console.log(`Cache hit rate: ${metrics.getHitRate().toFixed(2)}%`);
}, 60000);
```

### Compression for Large Data

```typescript
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

async function setCached(key: string, data: any, ttl: number) {
  const json = JSON.stringify(data);

  // Compress if large (>10KB)
  if (json.length > 10000) {
    const compressed = await gzip(json);
    await redis.setEx(key, ttl, compressed.toString('base64'));
    await redis.set(`${key}:compressed`, '1');
  } else {
    await redis.setEx(key, ttl, json);
  }
}

async function getCached(key: string) {
  const value = await redis.get(key);
  if (!value) return null;

  const isCompressed = await redis.get(`${key}:compressed`);

  if (isCompressed) {
    const buffer = Buffer.from(value, 'base64');
    const decompressed = await gunzip(buffer);
    return JSON.parse(decompressed.toString());
  }

  return JSON.parse(value);
}
```

---

## Anti-Patterns to Avoid

### ❌ Caching Everything Forever

```typescript
// BAD: Caches rank data forever
await redis.set(`rank:${summonerId}`, JSON.stringify(rank));

// GOOD: Short TTL for frequently changing data
await redis.setEx(`rank:${summonerId}`, 120, JSON.stringify(rank));
```

### ❌ No Cache Keys Namespacing

```typescript
// BAD: Collisions possible
await redis.set(matchId, data);

// GOOD: Namespaced keys
await redis.set(`match:${matchId}`, data);
```

### ❌ Ignoring Cache Failures

```typescript
// BAD: App crashes on Redis failure
const data = await redis.get('key');

// GOOD: Fallback to API
try {
  const cached = await redis.get('key');
  if (cached) return JSON.parse(cached);
} catch (error) {
  console.error('Cache error, falling back to API');
}
return await fetchFromApi();
```

### ❌ Not Monitoring Cache Size

```typescript
// GOOD: Monitor Redis memory usage
const info = await redis.info('memory');
const usedMemory = parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0');

if (usedMemory > 1024 * 1024 * 1024) { // 1GB
  console.warn('Cache size exceeding 1GB');
}
```

---

## Complete Caching Layer Example

```typescript
class RiotApiCache {
  private redis: RedisClient;
  private memoryCache: Map<string, any> = new Map();

  async getMatch(matchId: string): Promise<any> {
    // Layer 1: Memory cache (fastest)
    if (this.memoryCache.has(matchId)) {
      return this.memoryCache.get(matchId);
    }

    // Layer 2: Redis cache (fast)
    const cached = await this.redis.get(`match:${matchId}`);
    if (cached) {
      const data = JSON.parse(cached);
      this.memoryCache.set(matchId, data); // Populate memory cache
      return data;
    }

    // Layer 3: Database (slower)
    const dbData = await this.getFromDatabase(matchId);
    if (dbData) {
      await this.redis.set(`match:${matchId}`, JSON.stringify(dbData));
      this.memoryCache.set(matchId, dbData);
      return dbData;
    }

    // Layer 4: Riot API (slowest)
    const apiData = await this.fetchFromApi(matchId);

    // Populate all caches
    await this.saveToDatabase(matchId, apiData);
    await this.redis.set(`match:${matchId}`, JSON.stringify(apiData));
    this.memoryCache.set(matchId, apiData);

    return apiData;
  }

  private async fetchFromApi(matchId: string) {
    // Rate-limited API call
    return await riotApi.getMatchDetail(matchId);
  }
}
```

---

## Cache Strategy Summary

| Data Type | TTL | Storage | Invalidation |
|-----------|-----|---------|--------------|
| DataDragon | 24h+ | Redis | Patch detection |
| Matches | ∞ | DB + Redis | Never |
| Summoner | 5min | Redis | TTL |
| Rank | 2min | Redis | TTL |
| Match List | 10min | Redis | TTL or refresh |

**General Rules:**
1. Cache static data aggressively
2. Cache match data permanently
3. Cache user data briefly
4. Use multi-layer caching for hot data
5. Monitor hit rates and adjust TTLs
6. Always handle cache failures gracefully

See `examples/rate-limiter.ts` for integration with rate limiting.
