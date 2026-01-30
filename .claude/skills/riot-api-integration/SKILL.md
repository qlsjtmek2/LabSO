---
name: Riot API Integration
description: This skill should be used when the user asks to "handle Riot API rate limits", "parse Timeline data", "analyze match events", "implement build recommendations", "design API caching", "fix 429 errors", or works with Riot Games API endpoints. Provides comprehensive guidance for integrating Riot API into LabSO project.
version: 0.1.0
---

# Riot API Integration for LabSO

## Purpose

Integrate Riot Games API into the LabSO (League of Legends Adaptive Build & Strategy Optimizer) project with proper rate limiting, efficient caching, and comprehensive data analysis capabilities. This skill provides procedural knowledge for handling Riot API's unique constraints and leveraging its rich dataset for champion analytics, match analysis, and build recommendations.

## When to Use This Skill

Use this skill when working with:
- Rate limit handling and 429 error recovery
- Match-V5 Timeline data parsing and event analysis
- API response caching and performance optimization
- Build recommendation logic based on match statistics
- DataDragon static data integration
- Regional routing and PUUID-based queries

## Core Concepts

### Regional vs Platform Routing

Riot API uses two routing systems:

**Platform Routing** (region-specific):
- Use for: Summoner-V4, Champion-Mastery-V4, League-V4, Spectator-V5
- Korea endpoint: `kr.api.riotgames.com`
- Example: Summoner lookup by PUUID

**Regional Routing** (continental):
- Use for: Account-V1, Match-V5
- Asia endpoint: `asia.api.riotgames.com`
- Example: Match history, Riot ID resolution

Always use the correct routing domain for each API family to avoid 404 errors.

### PUUID as Universal Identifier

PUUID (Player Universally Unique Identifier) persists across:
- Region transfers
- Summoner name changes
- Account migrations

Always store and query by PUUID rather than summoner name or ID. Resolve Riot ID (gameName#tagLine) to PUUID using Account-V1 API first.

## Rate Limiting Strategy

### Development vs Production Keys

**Development Key Limits:**
- 20 requests per second
- 100 requests per 2 minutes
- Expires after 24 hours

**Production Key Limits:**
- 300+ requests per second (tier-dependent)
- Requires working application for approval

### Request Queueing Implementation

Implement a request queue to stay within rate limits:

1. **Track Recent Requests**: Maintain timestamps of recent API calls
2. **Check Limits**: Before each request, verify both 1-second and 2-minute windows
3. **Delay if Needed**: Wait until sufficient capacity available
4. **Handle 429**: Retry with exponential backoff using `Retry-After` header

See `examples/rate-limiter.ts` for a complete TypeScript implementation with queue management and automatic retry logic.

### 429 Error Handling

When rate limited:
1. Extract `Retry-After` header (seconds to wait)
2. Delay request by specified duration
3. Retry with exponential backoff if header missing
4. Maximum 3 retry attempts before failing

## Timeline Analysis

Match-V5 Timeline API provides frame-by-frame game data at 1-minute intervals plus discrete events.

### Key Frame Data

Each frame (every 60 seconds) captures:
- **Position**: `{ x, y }` coordinates on map
- **Gold**: Total and current gold
- **Level**: Champion level
- **CS**: Minions killed and jungle farm
- **Damage**: Dealt and taken by damage type

Use frames for:
- Movement heatmaps (position tracking)
- Gold efficiency analysis (gold gain rate)
- Farm patterns (CS per minute)

### Critical Event Types

**Combat Events:**
- `CHAMPION_KILL`: Kill/death/assist tracking with damage breakdown
- `CHAMPION_SPECIAL_KILL`: Multi-kills, first blood
- `ELITE_MONSTER_KILL`: Baron, Dragon (with subtype: FIRE_DRAGON, etc.)
- `BUILDING_KILL`: Turret and inhibitor destruction

**Item Events:**
- `ITEM_PURCHASED`: Item buy timing
- `ITEM_SOLD`: Item sell for gold
- `ITEM_DESTROYED`: Consumable usage
- `ITEM_UNDO`: Purchase cancellation

**Progression Events:**
- `SKILL_LEVEL_UP`: Skill order (Q/W/E/R)
- `LEVEL_UP`: Champion level timing
- `TURRET_PLATE_DESTROYED`: Early gold generation

**Vision Events:**
- `WARD_PLACED`: Ward placement patterns
- `WARD_KILL`: Ward clearing

See `references/timeline-events.md` for complete event schemas with all fields.

### Example Analysis: Skill Order Extraction

```typescript
const skillOrder = timeline.info.frames
  .flatMap(f => f.events)
  .filter(e => e.type === 'SKILL_LEVEL_UP' && e.participantId === playerId)
  .map(e => ({
    skill: ['Q', 'W', 'E', 'R'][e.skillSlot - 1],
    level: e.level,
    timestamp: e.timestamp
  }));
```

See `examples/timeline-analyzer.ts` for complete parsing utilities.

## Build Recommendation Logic

### Context-Based Recommendation

Recommend items based on:

**Enemy Composition:**
```typescript
const enemyDamage = enemies.reduce((acc, p) => ({
  physical: acc.physical + p.physicalDamageDealtToChampions,
  magic: acc.magic + p.magicDamageDealtToChampions
}), { physical: 0, magic: 0 });

if (enemyDamage.physical > enemyDamage.magic * 1.5) {
  recommendDefense('armor'); // Plated Steelcaps, Randuin's Omen
}
```

**Game Phase:**
- Early (0-15 min): Core items, laning tools
- Mid (15-25 min): Power spikes, objectives
- Late (25+ min): Full build, team fighting

**Play Style (from Timeline):**
- Aggressive: High kill participation → Damage items
- Farming: High CS → Scaling items
- Roaming: Unique positions → Mobility items
- Team fighting: High assists → Utility items

See `examples/build-recommender.ts` for complete recommendation engine.

## Caching Strategies

### Cache Hierarchy

**Long-term (24+ hours):**
- DataDragon static data (champions, items, spells)
- Version numbers
- Cached invalidation: Patch release detection

**Medium-term (Permanent):**
- Completed match data (Match-V5, Timeline)
- Match results never change
- Cache key: `matchId`

**Short-term (5 minutes):**
- Summoner information (level, icon)
- Changes frequently during play
- Cache key: `puuid`

**Very short-term (1-2 minutes):**
- Rank/league data
- Updates after each game
- Cache key: `summonerId`

### Cache Storage Options

**In-Memory (Development):**
```typescript
const cache = new Map<string, { data: any, expires: number }>();
```

**Redis (Production):**
```typescript
await redis.setex(`match:${matchId}`, 86400, JSON.stringify(data));
```

**Database (Persistent):**
- Store in Supabase for match history
- Enable offline analysis
- Build historical statistics

See `references/caching-strategies.md` for detailed TTL configurations and invalidation patterns.

## DataDragon Integration

### Version Management

Always fetch latest version before accessing assets:

```typescript
const version = await getLatestVersion(); // e.g., "16.2.1"
const champions = await getChampions(version);
```

Cache version for duration of session to minimize API calls.

### Asset URL Patterns

**Champion Images:**
```
https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{championId}.png
```

**Item Images:**
```
https://ddragon.leagueoflegends.com/cdn/{version}/img/item/{itemId}.png
```

**Spell Images:**
```
https://ddragon.leagueoflegends.com/cdn/{version}/img/spell/{spellId}.png
```

Assets are CDN-hosted and should be cached by browser automatically.

### Tooltip Parsing

DataDragon tooltips contain placeholders:
- `{{ e1 }}`, `{{ e2 }}`: Reference `effectBurn` array
- `{{ a1 }}`, `{{ f1 }}`: Reference `vars` array with coefficients

Parse tooltips to display accurate damage calculations in combo calculator.

## API Policy Compliance

### Allowed Use Cases
✅ Champion statistics and analytics
✅ Match history and build recommendations
✅ Post-game analysis tools
✅ Community tools and insights

### Prohibited Use Cases
❌ Real-time game automation or scripting
❌ Misleading players with inaccurate data
❌ API key sharing or resale
❌ Impersonating official Riot services

### Attribution Requirement

Include on website:
```
"LabSO isn't endorsed by Riot Games and doesn't reflect the views or opinions
of Riot Games or anyone officially involved in producing or managing Riot Games
properties. Riot Games, and all associated properties are trademarks or
registered trademarks of Riot Games, Inc."
```

## Additional Resources

### Reference Files

For comprehensive API documentation:
- **`references/api-endpoints.md`** - Complete endpoint reference for all Riot APIs (Account-V1, Summoner-V4, Match-V5, League-V4, Champion-Mastery-V4, Spectator-V5, etc.)
- **`references/timeline-events.md`** - Detailed schemas for all 18 Timeline event types with field descriptions
- **`references/rate-limiting.md`** - Advanced rate limit handling, retry strategies, and production scaling
- **`references/caching-strategies.md`** - TTL configurations, cache invalidation, and storage implementations

### Example Files

Complete working implementations:
- **`examples/rate-limiter.ts`** - Production-ready request queue with 429 handling
- **`examples/timeline-analyzer.ts`** - Timeline parsing utilities for all event types
- **`examples/build-recommender.ts`** - Context-aware build recommendation engine

### Scripts

Utility tools:
- **`scripts/validate-api-key.sh`** - Verify API key validity and check rate limits

## Quick Implementation Checklist

When integrating Riot API:

1. ✅ Use correct regional routing (platform vs regional endpoints)
2. ✅ Implement request queueing to respect rate limits
3. ✅ Handle 429 errors with Retry-After header
4. ✅ Cache DataDragon static data for 24+ hours
5. ✅ Cache completed matches permanently
6. ✅ Store PUUID, not summoner names
7. ✅ Include Riot Games attribution
8. ✅ Validate API responses before processing
9. ✅ Use TypeScript types for API responses
10. ✅ Log API errors for debugging

## Common Pitfalls

**Wrong Routing:**
- Using `kr.api.riotgames.com` for Match-V5 (should be `asia.api.riotgames.com`)

**No Rate Limiting:**
- Making rapid requests without queueing system
- Not handling 429 errors

**Stale Cache:**
- Caching summoner data too long (>5 min)
- Not invalidating DataDragon on patch updates

**PUUID vs Summoner Name:**
- Storing summoner names (deprecated)
- Not resolving Riot ID to PUUID first

Refer to reference files for detailed solutions to these issues.
