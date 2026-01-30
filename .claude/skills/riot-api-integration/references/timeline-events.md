# Match Timeline Event Types Reference

Complete schemas for all 18 event types in Match-V5 Timeline API.

## Event Structure Overview

All events share common base fields:

```typescript
{
  timestamp: number;        // Game time in milliseconds
  type: string;            // Event type identifier
  realTimestamp?: number;  // Real-world timestamp
}
```

Events occur within frames that capture game state every 60 seconds.

---

## Combat Events

### 1. CHAMPION_KILL

Triggered when a champion kills another champion.

```typescript
{
  type: "CHAMPION_KILL",
  timestamp: number,
  killerId: number,              // ParticipantId of killer (0 if executed)
  victimId: number,              // ParticipantId of victim
  position: { x: number, y: number },
  assistingParticipantIds: number[],
  bounty: number,                // Shutdown/bounty gold
  killStreakLength: number,      // Killer's kill streak
  victimDamageDealt: DamageDto[],
  victimDamageReceived: DamageDto[]
}
```

**DamageDto:**
```typescript
{
  basic: boolean,
  magicDamage: number,
  name: string,
  participantId: number,
  physicalDamage: number,
  spellName: string,
  spellSlot: number,
  trueDamage: number,
  type: string
}
```

**Use Cases:**
- Kill participation tracking
- Death analysis (who killed whom)
- Damage breakdown (which abilities killed)
- Gold bounty calculations
- Position-based death heatmaps

**Example:**
```typescript
const killEvents = frames
  .flatMap(f => f.events)
  .filter(e => e.type === 'CHAMPION_KILL');

const playerKills = killEvents.filter(e =>
  e.killerId === playerId || e.assistingParticipantIds.includes(playerId)
);
```

---

### 2. CHAMPION_SPECIAL_KILL

Multi-kills, pentakills, and first blood.

```typescript
{
  type: "CHAMPION_SPECIAL_KILL",
  timestamp: number,
  killType: string,              // See Kill Types below
  killerId: number,
  multiKillLength?: number,      // 2=double, 3=triple, 4=quadra, 5=penta
  position: { x: number, y: number }
}
```

**Kill Types:**
- `KILL_FIRST_BLOOD` - First kill of the game
- `KILL_MULTI` - Multi-kill (double, triple, quadra, penta)
- `KILL_ACE` - Ace (all 5 enemies dead)

**Use Cases:**
- Highlight reel moments
- Player skill assessment
- Game-changing events tracking

**Example:**
```typescript
const pentakills = frames
  .flatMap(f => f.events)
  .filter(e =>
    e.type === 'CHAMPION_SPECIAL_KILL' &&
    e.multiKillLength === 5
  );
```

---

## Objective Events

### 3. BUILDING_KILL

Tower or inhibitor destruction.

```typescript
{
  type: "BUILDING_KILL",
  timestamp: number,
  buildingType: string,          // "TOWER_BUILDING" or "INHIBITOR_BUILDING"
  towerType?: string,            // See Tower Types below
  laneType?: string,             // "TOP_LANE", "MID_LANE", "BOT_LANE"
  teamId: number,                // Team that owned the building (100 or 200)
  killerId: number,
  assistingParticipantIds: number[],
  position: { x: number, y: number }
}
```

**Tower Types:**
- `OUTER_TURRET` - First tower in lane
- `INNER_TURRET` - Second tower in lane
- `BASE_TURRET` - Third tower (inhibitor tower)
- `NEXUS_TURRET` - Nexus towers

**Use Cases:**
- Objective control timeline
- Turret gold distribution
- Map pressure analysis
- Lane priority assessment

**Example:**
```typescript
const firstTower = frames
  .flatMap(f => f.events)
  .find(e =>
    e.type === 'BUILDING_KILL' &&
    e.buildingType === 'TOWER_BUILDING'
  );
```

---

### 4. TURRET_PLATE_DESTROYED

Turret plate destruction (before 14 minutes).

```typescript
{
  type: "TURRET_PLATE_DESTROYED",
  timestamp: number,
  killerId: number,
  laneType: string,              // "TOP_LANE", "MID_LANE", "BOT_LANE"
  position: { x: number, y: number },
  teamId: number                 // Team that owned the turret
}
```

**Gold Value:** 160 gold per plate (split among nearby allies)

**Use Cases:**
- Early game gold advantage tracking
- Lane dominance analysis
- First back timing

**Example:**
```typescript
const plateGold = frames
  .flatMap(f => f.events)
  .filter(e => e.type === 'TURRET_PLATE_DESTROYED' && e.killerId === playerId)
  .length * 160;
```

---

### 5. ELITE_MONSTER_KILL

Baron, Dragon, Rift Herald kills.

```typescript
{
  type: "ELITE_MONSTER_KILL",
  timestamp: number,
  monsterType: string,           // See Monster Types below
  monsterSubType?: string,       // Dragon soul types
  killerId: number,
  killerTeamId: number,
  assistingParticipantIds: number[],
  position: { x: number, y: number }
}
```

**Monster Types:**
- `BARON_NASHOR` - Baron buff
- `DRAGON` - Elemental dragons
- `RIFTHERALD` - Herald (can spawn twice)

**Dragon Sub-Types:**
- `FIRE_DRAGON` - Infernal (AD/AP)
- `EARTH_DRAGON` - Mountain (resistances)
- `WATER_DRAGON` - Ocean (regen)
- `AIR_DRAGON` - Cloud (movement speed)
- `HEXTECH_DRAGON` - Hextech (ability haste, attack speed)
- `CHEMTECH_DRAGON` - Chemtech (tenacity, heal)
- `ELDER_DRAGON` - Elder (execute, requires 4 dragons)

**Use Cases:**
- Objective control analysis
- Soul progression tracking
- Baron timing and fights
- Team fight context (was it for dragon?)

**Example:**
```typescript
const dragonSoul = frames
  .flatMap(f => f.events)
  .filter(e => e.type === 'ELITE_MONSTER_KILL' && e.monsterType === 'DRAGON')
  .map(e => e.monsterSubType);

// ["FIRE_DRAGON", "FIRE_DRAGON", "WATER_DRAGON", "FIRE_DRAGON"]
// = Fire soul at 4th dragon
```

---

## Item Events

### 6. ITEM_PURCHASED

Item bought from shop.

```typescript
{
  type: "ITEM_PURCHASED",
  timestamp: number,
  itemId: number,
  participantId: number
}
```

**Use Cases:**
- Build order tracking
- Item timing analysis (when did they finish core items?)
- Gold efficiency (time between items)
- Adaptive build recommendations

**Example:**
```typescript
const buildOrder = frames
  .flatMap(f => f.events)
  .filter(e => e.type === 'ITEM_PURCHASED' && e.participantId === playerId)
  .map(e => ({
    itemId: e.itemId,
    minute: Math.floor(e.timestamp / 60000)
  }));

// [{itemId: 1001, minute: 0}, {itemId: 3047, minute: 8}, ...]
```

---

### 7. ITEM_SOLD

Item sold for gold.

```typescript
{
  type: "ITEM_SOLD",
  timestamp: number,
  itemId: number,
  participantId: number
}
```

**Use Cases:**
- Item transition tracking
- Late game build changes
- Gold recovery analysis

---

### 8. ITEM_DESTROYED

Item consumed or destroyed (e.g., potions, wards).

```typescript
{
  type: "ITEM_DESTROYED",
  timestamp: number,
  itemId: number,
  participantId: number
}
```

**Common Destroyed Items:**
- `2003` - Health Potion
- `2055` - Control Ward (when placed)
- `3340` - Trinket (when upgraded)

**Use Cases:**
- Consumable usage patterns
- Ward budget tracking

---

### 9. ITEM_UNDO

Purchase undone within undo window.

```typescript
{
  type: "ITEM_UNDO",
  timestamp: number,
  participantId: number,
  afterId: number,               // Item ID after undo
  beforeId: number,              // Item ID before undo
  goldGain: number               // Gold refunded
}
```

**Use Cases:**
- Purchase mistakes
- Build optimization mid-game

---

## Progression Events

### 10. SKILL_LEVEL_UP

Champion ability leveled up.

```typescript
{
  type: "SKILL_LEVEL_UP",
  timestamp: number,
  participantId: number,
  skillSlot: number,             // 1=Q, 2=W, 3=E, 4=R
  levelUpType: string,           // "NORMAL" or "EVOLVE"
  level: number                  // Champion level at time of skill-up
}
```

**Skill Slots:**
- `1` - Q ability
- `2` - W ability
- `3` - E ability
- `4` - R ability (ultimate)

**Level Up Types:**
- `NORMAL` - Standard skill point
- `EVOLVE` - Kha'Zix evolution, Kayle transformation, etc.

**Use Cases:**
- Skill order analysis (Q max vs E max)
- Adaptive skill recommendations
- Champion-specific patterns

**Example:**
```typescript
const skillOrder = frames
  .flatMap(f => f.events)
  .filter(e => e.type === 'SKILL_LEVEL_UP' && e.participantId === playerId)
  .map(e => ['Q', 'W', 'E', 'R'][e.skillSlot - 1]);

// ["Q", "W", "E", "Q", "Q", "R", "Q", "W", ...]
```

---

### 11. LEVEL_UP

Champion reaches new level.

```typescript
{
  type: "LEVEL_UP",
  timestamp: number,
  participantId: number,
  level: number                  // New level (2-18)
}
```

**Use Cases:**
- XP efficiency tracking
- Level advantage analysis
- Power spike timing (level 6, 11, 16)

**Example:**
```typescript
const level6Time = frames
  .flatMap(f => f.events)
  .find(e =>
    e.type === 'LEVEL_UP' &&
    e.participantId === playerId &&
    e.level === 6
  )?.timestamp;

const level6Minutes = level6Time / 60000; // Convert to minutes
```

---

## Vision Events

### 12. WARD_PLACED

Ward placed on map.

```typescript
{
  type: "WARD_PLACED",
  timestamp: number,
  creatorId: number,
  wardType: string,              // See Ward Types below
  position: { x: number, y: number }
}
```

**Ward Types:**
- `YELLOW_TRINKET` - Stealth Ward (free trinket)
- `SIGHT_WARD` - Regular ward (item)
- `CONTROL_WARD` - Pink ward (visible, stays until destroyed)
- `BLUE_TRINKET` - Farsight Alteration
- `UNDEFINED` - Special wards (Zombie Ward, Ghost Poro, etc.)

**Use Cases:**
- Vision control analysis
- Ward coverage heatmap
- Support activity tracking

**Example:**
```typescript
const wardPositions = frames
  .flatMap(f => f.events)
  .filter(e => e.type === 'WARD_PLACED' && e.creatorId === playerId)
  .map(e => e.position);

// Plot on minimap for vision heatmap
```

---

### 13. WARD_KILL

Ward destroyed.

```typescript
{
  type: "WARD_KILL",
  timestamp: number,
  killerId: number,
  wardType: string,              // Same types as WARD_PLACED
  position: { x: number, y: number }
}
```

**Use Cases:**
- Vision denial tracking
- Support gold generation (ward kills give gold)
- Ward clearing patterns

---

## Game State Events

### 14. GAME_END

Game concluded.

```typescript
{
  type: "GAME_END",
  timestamp: number,
  winningTeam: number,           // 100 (blue) or 200 (red)
  gameId: number
}
```

**Use Cases:**
- Match duration
- Victory condition analysis
- Post-game statistics cutoff

---

### 15. PAUSE_END

Game unpaused (competitive/tournament games).

```typescript
{
  type: "PAUSE_END",
  timestamp: number,
  realTimestamp: number
}
```

**Use Cases:**
- Tournament game analysis
- Pause duration tracking

**Note:** Rare in solo queue, common in pro play

---

## Special Game Mode Events

### 16. ASCENDED_EVENT

Ascension game mode event (player becomes Ascended).

```typescript
{
  type: "ASCENDED_EVENT",
  timestamp: number,
  // Event-specific fields for Ascension mode
}
```

**Use Cases:**
- Special game mode analytics

---

### 17. CAPTURE_POINT

Dominion/Nexus Blitz point capture.

```typescript
{
  type: "CAPTURE_POINT",
  timestamp: number,
  // Event-specific fields
}
```

**Use Cases:**
- Dominion game mode (deprecated)
- Nexus Blitz events

---

### 18. PORO_KING_SUMMON

Poro King summoned in ARAM event.

```typescript
{
  type: "PORO_KING_SUMMON",
  timestamp: number,
  // Event-specific fields
}
```

**Use Cases:**
- Poro King game mode tracking

---

## Position Coordinates

All position fields use map coordinates:

**Summoner's Rift (mapId 11):**
- Map dimensions: 0-15,000 (x and y)
- Blue side Nexus: ~400, ~400
- Red side Nexus: ~14,500, ~14,500
- Center: ~7,500, ~7,500

**Howling Abyss (mapId 12):**
- Map dimensions: 0-13,900 (x), 0-13,900 (y)
- Linear map (single lane)

**Converting to Minimap:**
```typescript
const minimapX = (position.x / 15000) * minimapWidth;
const minimapY = (1 - position.y / 15000) * minimapHeight; // Invert Y
```

---

## Frame-by-Frame Data

In addition to discrete events, each frame captures participant state:

```typescript
{
  timestamp: number,
  participantFrames: {
    "1": {
      participantId: 1,
      totalGold: 5432,
      level: 11,
      currentGold: 234,
      xp: 8765,
      minionsKilled: 123,
      jungleMinionsKilled: 12,
      position: { x: 7500, y: 7500 },
      damageStats: {
        magicDamageDone: 12345,
        magicDamageDoneToChampions: 8765,
        physicalDamageDone: 23456,
        physicalDamageDoneToChampions: 15678,
        totalDamageDone: 35801,
        totalDamageDoneToChampions: 24443,
        // ... more damage stats
      }
    }
  },
  events: [ /* EventDto[] */ ]
}
```

**Use Cases:**
- Movement tracking (position per minute)
- Gold graph generation
- CS tracking over time
- Damage dealt timeline

---

## Event Analysis Patterns

### Kill Participation Rate

```typescript
const teamKills = events.filter(e =>
  e.type === 'CHAMPION_KILL' &&
  e.killerId in teamParticipantIds
);

const playerParticipation = teamKills.filter(k =>
  k.killerId === playerId ||
  k.assistingParticipantIds?.includes(playerId)
).length / teamKills.length;
```

### Objective Control

```typescript
const objectives = events.filter(e =>
  e.type === 'ELITE_MONSTER_KILL' ||
  (e.type === 'BUILDING_KILL' && e.buildingType === 'TOWER_BUILDING')
);

const teamObjectives = objectives.filter(o =>
  o.killerTeamId === teamId ||
  o.teamId !== teamId // Towers (teamId is owner, opposite of killer)
);
```

### Gold Efficiency

```typescript
const goldPerMinute = frames.map((frame, i) => {
  if (i === 0) return 0;
  const prev = frames[i - 1].participantFrames[playerId];
  const curr = frame.participantFrames[playerId];
  const goldGained = curr.totalGold - prev.totalGold;
  const timeElapsed = (frame.timestamp - frames[i - 1].timestamp) / 60000;
  return goldGained / timeElapsed;
});
```

### Position Heatmap

```typescript
const positions = frames
  .map(f => f.participantFrames[playerId]?.position)
  .filter(p => p);

// Discretize into grid
const heatmap = Array(50).fill(0).map(() => Array(50).fill(0));
positions.forEach(p => {
  const gridX = Math.floor((p.x / 15000) * 50);
  const gridY = Math.floor((p.y / 15000) * 50);
  heatmap[gridX][gridY]++;
});
```

---

## Common Queries

### First Blood Time

```typescript
const firstBlood = events.find(e =>
  e.type === 'CHAMPION_SPECIAL_KILL' &&
  e.killType === 'KILL_FIRST_BLOOD'
);
const fbTime = firstBlood?.timestamp / 60000; // Minutes
```

### Core Item Completion

```typescript
const coreItems = [3031, 3087, 3153]; // Example: IE, Runaan's, BotRK
const coreTimings = coreItems.map(itemId => {
  const purchase = events.find(e =>
    e.type === 'ITEM_PURCHASED' &&
    e.itemId === itemId &&
    e.participantId === playerId
  );
  return purchase ? purchase.timestamp / 60000 : null;
});
```

### Dragon Soul Type

```typescript
const dragons = events
  .filter(e => e.type === 'ELITE_MONSTER_KILL' && e.monsterType === 'DRAGON')
  .map(e => e.monsterSubType);

const dragonCounts = dragons.reduce((acc, type) => {
  acc[type] = (acc[type] || 0) + 1;
  return acc;
}, {});

const soulType = Object.entries(dragonCounts)
  .find(([type, count]) => count >= 4)?.[0];
```

### Average Position (Main Lane)

```typescript
const avgPosition = positions.reduce((acc, p) => ({
  x: acc.x + p.x / positions.length,
  y: acc.y + p.y / positions.length
}), { x: 0, y: 0 });

// Determine lane from avgPosition
const lane = determineLane(avgPosition); // TOP, MID, BOT, JUNGLE
```

---

## Performance Considerations

**Event Filtering:**
- Timeline can have 500+ events per game
- Filter early to reduce processing
- Use `.find()` for single events, `.filter()` for collections

**Memory Usage:**
- Full timeline JSON can be 500KB-2MB
- Cache parsed results, not raw JSON
- Extract only needed fields

**Processing Time:**
- Parse events once per match
- Store analyzed results in database
- Avoid re-parsing on every page load
