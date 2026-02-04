# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**RabSO (LoL Adaptive Build & Strategy Optimizer)** - 리그 오브 레전드 빌드 최적화 웹 앱. 유전 알고리즘과 이벤트 기반 전투 시뮬레이션으로 상대 조합에 맞는 최적 빌드를 추천합니다.

### 기술 스택
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **API**: Riot Games API (Match-V5, Summoner-V4, DataDragon)
- **특수 라이브러리**: `hangul-js` (초성 검색), `js-yaml` (YAML 규칙 파싱)

---

## 개발 명령어

```bash
npm run dev     # 개발 서버 (http://localhost:3000) - Claude 직접 실행 금지
npm run build   # 프로덕션 빌드
npm run lint    # ESLint 실행
```

---

## 아키텍처

### 핵심 엔진 계층 (`src/engine/`)

```
engine/
├── index.ts              # 진입점 - 모든 export 집중
├── core/
│   ├── factEngine.ts     # 원시 데이터 → 사실(Fact) 변환
│   ├── ruleInterpreter.ts # YAML 규칙 → TypeScript 규칙 변환
│   └── advancedTypes.ts  # FactBase, 조건 타입 정의
├── analyzer/
│   ├── teamAnalyzer.ts   # 팀 조합 분석 (AD/AP 비율, CC 점수)
│   └── matchupAnalyzer.ts # 1:1 매치업 분석
├── rules/
│   ├── ruleEngine.ts     # 규칙 평가 엔진 (조건 → 추천)
│   ├── buildRules.ts     # 하드코딩된 빌드 규칙
│   ├── registry/         # 규칙 레지스트리
│   └── specialized/      # 챔피언별 특수 규칙 (카타리나 등)
├── recommender/
│   ├── buildRecommender.ts  # 빌드 추천 통합기
│   ├── runeOptimizer.ts     # 룬 최적화
│   └── strategyRecommender.ts
└── simulator/            # V2 시뮬레이션 엔진
    ├── v2/
    │   ├── core/engine.ts       # 이벤트 기반 시뮬레이션 코어
    │   ├── core/types.ts        # Entity, GameEvent 타입
    │   ├── timeline/            # 시간축 시뮬레이션 (0~25분)
    │   ├── economy/             # 골드 수급/아이템 구매 시뮬레이션
    │   ├── champions/           # 챔피언별 AI 모델
    │   ├── items/               # 아이템 효과 (bork.ts 등)
    │   └── runes/               # 룬 효과 팩토리
    ├── genetic/
    │   ├── geneticOptimizer.ts  # 유전 알고리즘 메인
    │   ├── fitnessCalculator.ts # 적합도 계산
    │   └── types.ts             # Individual, GeneLoadout 타입
    ├── buildOptimizer.ts    # 아이템 후보군 최적화
    └── metaBreaker.ts       # 오프메타 빌드 탐색
```

### 데이터 흐름

1. **사용자 입력** → `BuildRecommender.recommend()`
2. **팩트 생성** → `FactEngine.deriveFacts()` (적 CC, 데미지 프로필 분석)
3. **규칙 평가** → `RuleEngine.evaluate()` (조건 매칭)
4. **시뮬레이션** → `GeneticOptimizer.run()` (10만회+ 전투 시뮬레이션)
5. **결과 집계** → `aggregateResults()` → `BuildRecommendation`

### V2 시뮬레이션 엔진 핵심

```typescript
// 이벤트 전파 패턴 (engine.ts)
broadcastEvent(event: GameEvent) {
  // 1. 가해자 아이템/버프 효과 발동
  source.items.forEach(item => item.onEvent?.(event, source, context));
  // 2. 피해자 아이템/버프 효과 발동
  target.items.forEach(item => item.onEvent?.(event, target, context));
}
```

- **이벤트 타입**: `OnAttack`, `OnHit`, `OnSpellCast`, `OnPreTakeDamage`, `OnKill` 등
- **Tick Rate**: 0.1초 단위 시뮬레이션
- **데미지 계산**: 방어력/마저 → `100 / (100 + armor)`

---

## 주요 타입 (`src/types/`)

| 파일 | 주요 타입 |
|------|----------|
| `champion.ts` | `ChampionMeta`, `ChampionClass`, `DamageType`, `Lane` |
| `build.ts` | `BuildRecommendation`, `ItemRecommendation`, `ItemInfo` |
| `rune.ts` | `RunePage`, `RuneTemplate`, `RuneTree` |
| `analysis.ts` | `TeamAnalysis`, `MatchupAnalysis`, `RuleContext` |

### 유전 알고리즘 타입 (`simulator/genetic/types.ts`)

```typescript
interface GeneLoadout {
  items: number[];           // 아이템 ID 6개
  primaryStyle: string;      // 주 룬 트리
  primaryRunes: string[];    // 주 룬 4개
  subRunes: string[];        // 보조 룬 2개
  summonerSpells: string[];  // 소환사 주문 2개
  skillOrder: string[];      // 스킬 순서 (Q/W/E)
}

interface Individual {
  genes: GeneLoadout;
  fitness: number;
  stats: { damage, survivability, dps };
}
```

---

## 정적 데이터 (`src/data/`)

| 경로 | 내용 |
|------|------|
| `json/items.json` | 모든 아이템 (ID, 가격, 스탯, 태그) |
| `json/runes.json` | 룬 트리 구조 (trees.slots) |
| `json/spells.json` | 소환사 주문 |
| `runeData.ts` | 룬 정의 + `RUNE_ID_MAP` (string→numeric ID 변환) |
| `dummyPresets.ts` | 샌드백 프리셋 (물몸/브루저/탱커 평균 스탯) |
| `engine/simulator/data/samples/*.json` | 챔피언별 스키마 (172개) |
| `rules/*.yaml` | YAML 기반 빌드 규칙 |

### 챔피언 스키마 예시 (`samples/katarina.json`)

```json
{
  "id": "Katarina",
  "baseStats": { "hp": 672, "ad": 58, ... },
  "spells": [
    { "key": "Q", "cooldown": [11, 10, 9, 8, 7], "damage": [...] }
  ]
}
```

---

## 콤보 계산기 (`/calculator/[id]`)

챔피언별 콤보 데미지를 시뮬레이션하는 계산기.

### 주요 기능
- **콤보 시뮬레이션**: Q/W/E/R + AA + 패시브(P) 조합
- **전체 룬 페이지**: 키스톤 + 일반 룬 5개 + 스탯 룬 3개
- **샌드백 프리셋**: 물몸/브루저/탱커 (172 챔피언 평균 기반)
- **레벨/골드 차이**: ±5 레벨, ±3000G 조절
- **킬 판정**: HP 바 시각화 + KILL 뱃지

### 관련 파일
| 파일 | 역할 |
|------|------|
| `src/app/calculator/[id]/page.tsx` | 메인 UI |
| `src/components/calculator/SimulationSettings.tsx` | 룬/샌드백 설정 |
| `src/components/calculator/SimulationReport.tsx` | 데미지 리포트 + HP 바 |
| `src/app/api/simulate/combo/route.ts` | 시뮬레이션 API |
| `src/engine/simulator/models/GenericChampion.ts` | 챔피언 모델 (콤보 실행) |
| `src/engine/simulator/runes/runeFactory.ts` | 70+ 룬 효과 구현 |
| `src/data/dummyPresets.ts` | 샌드백 스탯 계산 |

### 룬 ID 매핑
`runeData.ts`의 `RUNE_ID_MAP`으로 문자열 ID → Riot 숫자 ID 변환:
```typescript
RUNE_ID_MAP['Conqueror'] // 8010
RUNE_ID_MAP['AdaptiveForce'] // 5008
```

### 샌드백 스탯 계산
```typescript
import { calculateDummyStats } from '@/data/dummyPresets';

// 레벨 11, 브루저, 레벨차 +2, 골드차 -1000
const stats = calculateDummyStats('bruiser', 11, 2, -1000);
// { hp: 2150, armor: 85, mr: 52 }
```

---

## API 라우트 (`src/app/api/`)

| 라우트 | 기능 |
|--------|------|
| `/api/summoner` | Riot ID → PUUID 조회 |
| `/api/matches/[puuid]` | 최근 매치 리스트 |
| `/api/analysis/[matchId]` | 매치 상세 + 타임라인 |
| `/api/simulate/combo` | 콤보 데미지 시뮬레이션 |

### 콤보 시뮬레이션 API
```typescript
// POST /api/simulate/combo
{
  championId: "Katarina",
  level: 11,
  stacks: 0,
  targetStats: { hp: 2000, armor: 100, mr: 100 },
  runes: [8010, 9111, 9104, 8014, 8143, 8135, 5008, 5008, 5002],
  items: [3115, 3089],
  skillLevels: [5, 3, 3, 2],
  combo: [2, -2, 0, -1]  // E, P, Q, AA
}

// Response
{
  totalDamage: 1850,
  targetMaxHp: 2000,
  damagePercent: 92.5,
  canKill: false,
  overkillDamage: 0,
  events: [{ source: "Shunpo (E)", type: "Magical", ... }],
  championStats: { ad: 150, ap: 320, ... }
}
```

### Riot API 지역 설정

- 소환사 정보: `kr.api.riotgames.com`
- 매치 데이터: `asia.api.riotgames.com` (KR은 asia 리전)

---

## 중요 규칙

### Riot API 정책
- **API Key**: `.env.local`의 `RIOT_API_KEY` - 클라이언트 노출 금지
- **Rate Limit**: 개발 키 초당 20회, 2분당 100회
- **No Cheat**: 게임 중 실시간 정보 제공 금지

### 스타일 컨벤션
- **색상**: `bg-[#0a0a0c]` (다크 배경), `blue-500/600` (강조)
- **폰트**: Geist Sans (본문), Geist Mono (숫자)
- Tailwind 유틸리티만 사용, 하드코딩 금지

### TypeScript
- `@/*` → `./src/*` 경로 alias
- Strict mode 활성화

---

## 개발 시 참고

### 새 챔피언 규칙 추가
1. `engine/rules/specialized/` 에 `[champion]Rules.ts` 생성
2. `engine/rules/registry/ruleRegistry.ts`에 등록
3. `engine/simulator/data/samples/[champion].json` 스키마 확인

### 디버깅 팁
- **API 401**: 잘못된 RIOT_API_KEY
- **API 404**: 존재하지 않는 소환사/매치 ID
- **스킬 데미지 이상**: `champion.spells[i].vars`의 `link` 값 확인

### 시뮬레이션 디버깅
- `SimulationEngine`의 `eventLog` 배열에서 이벤트 흐름 확인
- `GeneticOptimizer`의 `fitnessCache` 사이즈로 중복 계산 확인

---

## 참고 문서

- [Riot Developer Portal](https://developer.riotgames.com/)
- [DataDragon 문서](https://developer.riotgames.com/docs/lol#data-dragon)
- [Match-V5 API](https://developer.riotgames.com/apis#match-v5)
