# Riot API Endpoints Reference

Complete reference for all Riot Games API endpoints used in LabSO project.

## Regional Routing Guide

### Platform Routing (Region-Specific)

Base URL: `https://{platform}.api.riotgames.com`

**Platforms:**
- `kr` - Korea
- `na1` - North America
- `euw1` - Europe West
- `jp1` - Japan
- `br1` - Brazil
- `eun1` - Europe Nordic & East
- `la1` - Latin America North
- `la2` - Latin America South
- `oc1` - Oceania
- `tr1` - Turkey
- `ru` - Russia

**Used for:**
- Summoner-V4
- Champion-Mastery-V4
- League-V4
- Spectator-V5
- Champion-V3

### Regional Routing (Continental)

Base URL: `https://{region}.api.riotgames.com`

**Regions:**
- `asia` - KR, JP
- `americas` - NA, BR, LAN, LAS
- `europe` - EUW, EUNE, TR, RU
- `sea` - OCE, PH, SG, TH, TW, VN

**Used for:**
- Account-V1 (Riot ID)
- Match-V5 (Match history, Timeline)

---

## Account-V1 (Riot ID → PUUID)

**Regional routing required** (`asia.api.riotgames.com` for KR)

### Get Account by Riot ID

```http
GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
```

**Parameters:**
- `gameName`: Summoner name (e.g., "Hide on bush")
- `tagLine`: Tag without # (e.g., "KR1")

**Response:**
```json
{
  "puuid": "abc123...",
  "gameName": "Hide on bush",
  "tagLine": "KR1"
}
```

**Rate Limit:** 2000/min (application), 20/sec (development)

**Use Case:** First step in summoner lookup chain

### Get Account by PUUID

```http
GET /riot/account/v1/accounts/by-puuid/{puuid}
```

**Response:**
```json
{
  "puuid": "abc123...",
  "gameName": "Hide on bush",
  "tagLine": "KR1"
}
```

**Use Case:** Reverse lookup from PUUID to Riot ID

---

## Summoner-V4

**Platform routing required** (`kr.api.riotgames.com`)

### Get Summoner by PUUID

```http
GET /lol/summoner/v4/summoners/by-puuid/{encryptedPUUID}
```

**Response:**
```json
{
  "id": "encryptedSummonerId",
  "accountId": "encryptedAccountId",
  "puuid": "abc123...",
  "profileIconId": 4568,
  "revisionDate": 1612345678000,
  "summonerLevel": 347
}
```

**Rate Limit:** 2000/min (application), 20/sec (development)

**Use Case:** Get summoner profile information

### Get Summoner by ID

```http
GET /lol/summoner/v4/summoners/{encryptedSummonerId}
```

**Use Case:** When you already have summonerId from other APIs

---

## Match-V5

**Regional routing required** (`asia.api.riotgames.com` for KR)

### Get Match IDs by PUUID

```http
GET /lol/match/v5/matches/by-puuid/{puuid}/ids
```

**Query Parameters:**
- `startTime` (optional): Epoch timestamp (seconds)
- `endTime` (optional): Epoch timestamp (seconds)
- `queue` (optional): Queue ID (420 for ranked solo, 450 for ARAM)
- `type` (optional): Match type (ranked, normal, tourney, tutorial)
- `start` (optional): Start index (default 0)
- `count` (optional): Number of match IDs (default 20, max 100)

**Response:**
```json
["KR_6549876543", "KR_6549876542", ...]
```

**Rate Limit:** 2000/min (application), 20/sec (development)

**Use Case:** Get list of recent match IDs for analysis

### Get Match Detail

```http
GET /lol/match/v5/matches/{matchId}
```

**Response Structure:**
```json
{
  "metadata": {
    "dataVersion": "2",
    "matchId": "KR_6549876543",
    "participants": ["puuid1", "puuid2", ...]
  },
  "info": {
    "gameCreation": 1612345678000,
    "gameDuration": 1847,
    "gameEndTimestamp": 1612347525000,
    "gameId": 6549876543,
    "gameMode": "CLASSIC",
    "gameName": "teambuilder-match-6549876543",
    "gameStartTimestamp": 1612345678000,
    "gameType": "MATCHED_GAME",
    "gameVersion": "16.2.565.4561",
    "mapId": 11,
    "participants": [ /* ParticipantDto[] */ ],
    "platformId": "KR",
    "queueId": 420,
    "teams": [ /* TeamDto[] */ ],
    "tournamentCode": ""
  }
}
```

**Key Fields:**
- `info.gameDuration`: Game length in seconds
- `info.gameMode`: CLASSIC, ARAM, URF, etc.
- `info.queueId`: Queue type (see Queue IDs section)
- `info.participants`: Array of player data
- `info.teams`: Team summary (100 = blue, 200 = red)

**Rate Limit:** 2000/min (application), 20/sec (development)

**Use Case:** Get detailed match statistics

### Get Match Timeline

```http
GET /lol/match/v5/matches/{matchId}/timeline
```

**Response Structure:**
```json
{
  "metadata": {
    "dataVersion": "2",
    "matchId": "KR_6549876543",
    "participants": ["puuid1", "puuid2", ...]
  },
  "info": {
    "frameInterval": 60000,
    "frames": [ /* FrameDto[] */ ],
    "gameId": 6549876543,
    "participants": [ /* ParticipantDto[] */ ]
  }
}
```

**Rate Limit:** 2000/min (application), 20/sec (development)

**Use Case:** Get frame-by-frame game data for deep analysis

**See `timeline-events.md` for complete event schemas**

---

## League-V4 (Rank Information)

**Platform routing required** (`kr.api.riotgames.com`)

### Get League Entries by Summoner

```http
GET /lol/league/v4/entries/by-summoner/{encryptedSummonerId}
```

**Response:**
```json
[
  {
    "leagueId": "abc123...",
    "queueType": "RANKED_SOLO_5x5",
    "tier": "DIAMOND",
    "rank": "II",
    "summonerId": "encryptedSummonerId",
    "leaguePoints": 67,
    "wins": 123,
    "losses": 98,
    "veteran": false,
    "inactive": false,
    "freshBlood": false,
    "hotStreak": true
  }
]
```

**Queue Types:**
- `RANKED_SOLO_5x5`: Solo/Duo rank
- `RANKED_FLEX_SR`: Flex 5v5 rank
- `RANKED_FLEX_TT`: Twisted Treeline (deprecated)

**Tiers:** IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER, CHALLENGER

**Ranks:** I, II, III, IV (Master+ has no rank)

**Rate Limit:** 300/min (application), 20/sec (development)

**Use Case:** Display player rank, calculate tier-based recommendations

### Get Challenger League

```http
GET /lol/league/v4/challengerleagues/by-queue/{queue}
```

**Queue:** `RANKED_SOLO_5x5` or `RANKED_FLEX_SR`

**Response:**
```json
{
  "tier": "CHALLENGER",
  "leagueId": "abc123...",
  "queue": "RANKED_SOLO_5x5",
  "name": "Aatrox's Battlemasters",
  "entries": [
    {
      "summonerId": "...",
      "leaguePoints": 1234,
      "rank": "I",
      "wins": 234,
      "losses": 123,
      "veteran": true,
      "inactive": false,
      "freshBlood": false,
      "hotStreak": false
    }
  ]
}
```

**Use Case:** Get top players for "장인" (expert) analysis

---

## Champion-Mastery-V4

**Platform routing required** (`kr.api.riotgames.com`)

### Get All Champion Masteries by PUUID

```http
GET /lol/champion-mastery/v4/champion-masteries/by-puuid/{encryptedPUUID}
```

**Response:**
```json
[
  {
    "puuid": "abc123...",
    "championId": 157,
    "championLevel": 7,
    "championPoints": 234567,
    "lastPlayTime": 1612345678000,
    "championPointsSinceLastLevel": 134567,
    "championPointsUntilNextLevel": 0,
    "tokensEarned": 2,
    "chestGranted": true
  }
]
```

**Champion Levels:** 1-7 (mastery progression)

**Rate Limit:** 2000/min (application), 20/sec (development)

**Use Case:** Identify player's main champions for "장인" recommendations

### Get Champion Mastery by Champion

```http
GET /lol/champion-mastery/v4/champion-masteries/by-puuid/{encryptedPUUID}/by-champion/{championId}
```

**Use Case:** Check mastery for specific champion

### Get Total Mastery Score

```http
GET /lol/champion-mastery/v4/scores/by-puuid/{encryptedPUUID}
```

**Response:** Integer (total mastery points across all champions)

---

## Spectator-V5 (Live Game)

**Platform routing required** (`kr.api.riotgames.com`)

### Get Active Game by PUUID

```http
GET /lol/spectator/v5/active-games/by-summoner/{encryptedPUUID}
```

**Response:**
```json
{
  "gameId": 6549876543,
  "gameType": "MATCHED_GAME",
  "gameStartTime": 1612345678000,
  "mapId": 11,
  "gameLength": 234,
  "platformId": "KR",
  "gameMode": "CLASSIC",
  "bannedChampions": [ /* BannedChampion[] */ ],
  "gameQueueConfigId": 420,
  "observers": {
    "encryptionKey": "abc123..."
  },
  "participants": [ /* CurrentGameParticipant[] */ ]
}
```

**Rate Limit:** 2000/min (application), 20/sec (development)

**Use Case:** Real-time game analysis (within Riot policy limits)

**Error:** 404 if player not in game

---

## Champion-V3 (Free Rotation)

**Platform routing required** (`kr.api.riotgames.com`)

### Get Champion Rotations

```http
GET /lol/platform/v3/champion-rotations
```

**Response:**
```json
{
  "freeChampionIds": [1, 2, 3, ...],
  "freeChampionIdsForNewPlayers": [18, 81, 22, ...],
  "maxNewPlayerLevel": 10
}
```

**Rate Limit:** 2000/min (application), 20/sec (development)

**Use Case:** Display free champions for new players

---

## DataDragon (Static Data)

**No authentication required - CDN hosted**

Base URL: `https://ddragon.leagueoflegends.com`

### Get Latest Version

```http
GET /api/versions.json
```

**Response:**
```json
["16.2.1", "16.1.1", "15.24.1", ...]
```

**First element is latest version**

### Get Champions (List)

```http
GET /cdn/{version}/data/{locale}/champion.json
```

**Locale:** `ko_KR`, `en_US`, `ja_JP`, etc.

**Response:**
```json
{
  "type": "champion",
  "format": "standAloneComplex",
  "version": "16.2.1",
  "data": {
    "Aatrox": {
      "id": "Aatrox",
      "key": "266",
      "name": "아트록스",
      "title": "다르킨의 검",
      "image": { "full": "Aatrox.png" }
    }
  }
}
```

### Get Champion Detail

```http
GET /cdn/{version}/data/{locale}/champion/{championId}.json
```

**Response includes:**
- Full champion stats (`stats`)
- Spell data with coefficients (`spells`)
- Passive data (`passive`)
- Tooltips with placeholders

**Use Case:** Combo calculator damage formulas

### Get Items

```http
GET /cdn/{version}/data/{locale}/item.json
```

**Response:**
```json
{
  "type": "item",
  "version": "16.2.1",
  "data": {
    "1001": {
      "name": "신발",
      "description": "...",
      "gold": { "base": 300, "total": 300, "sell": 210 },
      "stats": { "FlatMovementSpeedMod": 25 },
      "tags": ["Boots"],
      "maps": { "11": true, "12": true }
    }
  }
}
```

### Get Summoner Spells

```http
GET /cdn/{version}/data/{locale}/summoner.json
```

### Get Runes/Perks

```http
GET /cdn/{version}/data/{locale}/runesReforged.json
```

**Note:** Modern runes (keystones, secondary trees)

### Image Assets

**Champion:**
```
/cdn/{version}/img/champion/{championId}.png
```

**Item:**
```
/cdn/{version}/img/item/{itemId}.png
```

**Spell:**
```
/cdn/{version}/img/spell/{spellId}.png
```

**Passive:**
```
/cdn/{version}/img/passive/{passiveId}.png
```

**Profile Icon:**
```
/cdn/{version}/img/profileicon/{iconId}.png
```

---

## Queue IDs

Common queue types:

- `420` - Ranked Solo/Duo
- `440` - Ranked Flex
- `450` - ARAM
- `400` - Normal Draft Pick
- `430` - Normal Blind Pick
- `490` - Quickplay
- `700` - Clash
- `900` - ARURF
- `1020` - One for All

---

## Rate Limit Headers

Response headers include rate limit info:

```
X-App-Rate-Limit: 20:1,100:120
X-App-Rate-Limit-Count: 1:1,1:120
X-Method-Rate-Limit: 2000:60
X-Method-Rate-Limit-Count: 1:60
Retry-After: 5
```

**Headers:**
- `X-App-Rate-Limit`: Application limits (requests:seconds)
- `X-App-Rate-Limit-Count`: Current count
- `X-Method-Rate-Limit`: Method-specific limits
- `Retry-After`: Seconds to wait on 429 error

---

## Error Codes

Common HTTP status codes:

- `200` - Success
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (blacklisted API key)
- `404` - Not found (summoner/match doesn't exist)
- `429` - Rate limit exceeded
- `500` - Internal server error
- `503` - Service unavailable

**Always check status codes before parsing response**
