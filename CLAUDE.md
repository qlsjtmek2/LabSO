# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**LabSO (LoL Adaptive Build & Strategy Optimizer)**는 리그 오브 레전드(LoL) 플레이어를 위한 전략 분석 및 콤보 최적화 웹 애플리케이션입니다.

### 핵심 기능
1. **콤보 데미지 계산기**: 챔피언 스킬 시퀀스 기반 데미지 계산
2. **장인 분석기**: 고수 플레이어의 매치 타임라인 분석 (위치 히트맵, 빌드 순서, 스킬 마스터)
3. **적응형 빌드 추천**: 상대 조합에 따른 아이템 추천 (향후 구현)

### 기술 스택
- **Framework**: Next.js 16 (App Router, React Server Components)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **API**: Riot Games API (Match-V5, Summoner-V4, DataDragon)
- **Font**: Geist Sans, Geist Mono
- **특수 라이브러리**: `hangul-js` (초성 검색)

---

## 개발 명령어

### 개발 서버 실행
```bash
npm run dev
```
- 로컬 개발 서버 시작: http://localhost:3000
- **주의**: 이 명령어를 Claude가 직접 실행하지 말고, 사용자에게 안내만 할 것

### 빌드 및 배포
```bash
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 서버 실행
npm run lint    # ESLint 실행
```

---

## 아키텍처 및 디렉토리 구조

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 메인 페이지 (소환사 검색 + 챔피언 선택)
│   ├── calculator/[id]/page.tsx  # 콤보 계산기 페이지
│   ├── analysis/[matchId]/page.tsx # 매치 분석 페이지
│   ├── api/
│   │   ├── summoner/route.ts     # Riot ID로 소환사 정보 조회
│   │   ├── matches/[puuid]/route.ts # 매치 리스트 조회
│   │   └── analysis/[matchId]/route.ts # 매치 상세 + 타임라인
│   ├── layout.tsx                # 루트 레이아웃 (폰트, 메타데이터)
│   └── globals.css               # Tailwind CSS 전역 스타일
├── lib/
│   ├── riotApi.ts                # Riot API 호출 유틸리티
│   └── dataDragon.ts             # DataDragon 정적 데이터 fetcher
docs/
└── plans/                        # 요구사항 명세서 및 Todo 리스트
```

### 주요 파일 설명

#### `src/lib/riotApi.ts`
Riot Games API와 통신하는 핵심 유틸리티. 환경 변수 `RIOT_API_KEY` 필수.

**주요 함수**:
- `getSummonerByName(summonerName, tagLine)`: Riot ID로 소환사 정보 조회
- `getMatchList(puuid, count)`: 최근 매치 ID 리스트
- `getMatchDetail(matchId)`: 매치 상세 데이터
- `getMatchTimeline(matchId)`: 타임라인 (위치 좌표, 아이템 구매, 스킬 레벨업)

**지역 설정**:
- 소환사 정보: `kr.api.riotgames.com`
- 매치 데이터: `asia.api.riotgames.com` (KR은 asia 리전 사용)

#### `src/lib/dataDragon.ts`
Riot DataDragon에서 정적 데이터(챔피언, 아이템, 스킬 정보) 가져오기.

**주요 함수**:
- `getLatestVersion()`: 최신 패치 버전 확인
- `getChampions(version)`: 모든 챔피언 목록 (한글)
- `getChampionDetail(version, championId)`: 특정 챔피언의 스킬 계수 포함 상세 데이터
- `getItems(version)`: 모든 아이템 정보
- `getAssetUrl(version, type, id)`: 이미지 URL 생성 (챔피언/아이템/스킬)

#### `src/app/page.tsx`
메인 페이지. 소환사 검색 + 챔피언 그리드.

**핵심 기능**:
- 소환사 검색: Riot ID (Name + Tag) 입력 후 최근 전적 표시
- 챔피언 초성 검색: `hangul-js` 사용 (예: "ㅇㅅ" → 야스오)
- 매치 카드 클릭 → `/analysis/[matchId]?puuid=...` 이동

#### `src/app/calculator/[id]/page.tsx`
콤보 데미지 계산기.

**핵심 로직**:
- `calculateBaseStat()`: 레벨별 스탯 성장 공식 (LoL 공식: `base + growth * (level - 1) * (0.7025 + 0.0175 * (level - 1))`)
- `calculateSpellDamage()`: 스킬 기본 데미지 + 계수(AD/AP) 반영
- 아이템 스탯 합산: `FlatPhysicalDamageMod`, `FlatMagicDamageMod` 등 사용
- 툴팁 파싱: `parseTooltip()` 함수가 `{{ e1 }}`, `{{ a1 }}` 등을 실제 값으로 치환

**UI 패턴**:
- 드래그앤드롭 대신 "클릭 → 모달"로 아이템 선택
- 스킬 레벨 조절: Q/W/E는 최대 5, R은 최대 3
- 콤보 시퀀스: 스킬 버튼 클릭 시 배열에 추가 (`-1`은 평타)

---

## 중요 규칙 및 컨벤션

### Riot API 정책 준수
- **API Key 보안**: `.env.local`에 `RIOT_API_KEY` 저장. 절대 클라이언트에 노출 금지
- **Rate Limit**: 개발 키는 초당 20회, 2분당 100회 제한. 프로덕션 키 신청 시 더 높은 한도
- **No Cheat 정책**: 게임 중 실시간 정보 제공 금지. Pre-game/Post-game 분석만 허용

### 데이터 전략
- **정적 데이터(DataDragon)**: 챔피언/아이템 정보는 패치마다 변경. 버전 확인 후 캐싱 권장
- **동적 데이터(Match API)**: 매치 ID는 고유하므로 DB 캐싱 가능 (향후 Supabase 연동 예정)
- **리플레이 파일 미지원**: `.rofl` 바이너리 파싱 대신 Timeline API로 대체

### 스타일 가이드
- **색상 스킴**: `bg-[#0a0a0c]` (다크 배경), 블루 강조 (`blue-500/600`)
- **폰트**: Geist Sans (본문), Geist Mono (숫자/코드)
- **디자인 토큰**: Tailwind 유틸리티 클래스 사용. 하드코딩 금지
- **애니메이션**: `transition-all`, `hover:scale-105`, `animate-in fade-in` 등 미묘한 인터랙션

### TypeScript 규칙
- **Strict Mode 활성화**: `tsconfig.json`에서 `strict: true`
- **경로 alias**: `@/*`는 `./src/*`로 매핑
- **타입 안전성**: API 응답은 `any` 사용 중이나, 향후 인터페이스 정의 권장

---

## 현재 구현 상태 (2026-01-29 기준)

### ✅ 완료된 기능
- [x] Riot API 연동 (소환사 조회, 매치 리스트)
- [x] DataDragon 정적 데이터 fetcher
- [x] 챔피언 초성 검색
- [x] 콤보 데미지 계산기 (스킬 계수, 아이템 스탯 반영)
- [x] 기본 UI/UX (다크 테마, 반응형)

### 🚧 진행 중
- [ ] 장인 분석기 (매치 타임라인 시각화)
- [ ] 위치 히트맵 (미니맵 좌표 오버레이)
- [ ] 빌드 타임라인 (시간축 기반 아이템 구매 표시)

### 📋 계획 중
- [ ] Supabase DB 연동 (매치 캐싱)
- [ ] 적응형 빌드 추천 (통계 기반)
- [ ] 반응형 개선 (모바일 UX)

---

## 알려진 제약사항 및 트레이드오프

### 웹 환경 한계
- **리플레이 파싱 불가**: `.rofl` 파일의 마우스 클릭/시야 정보는 추출 불가. Timeline API의 이벤트 기반 분석으로 대체.
- **실시간 데이터 부재**: 진행 중인 게임 정보는 Spectator API로 가능하나, Riot 정책상 게임 중 조언 금지.

### 성능 고려사항
- **DataDragon 버전 관리**: 패치마다 URL 변경. 클라이언트에서 버전 fetch 후 사용.
- **API 호출 최소화**: 동일 매치 ID 재검색 시 캐싱 필요 (현재는 매번 호출)

### 데이터 정확도
- **스킬 계수 파싱 한계**: DataDragon의 `tooltip`은 복잡한 조건문(`{{ f1 }}`, 중첩 변수 등) 포함. 100% 파싱은 어려움.
- **방어력 미반영**: 현재 계산기는 적 방어력 0 기준. 향후 데미지 감소 공식 추가 고려.

---

## 개발 시 주의사항

### 새 기능 추가 시
1. `docs/plans/` 디렉토리의 요구사항 명세서 및 Todo 리스트 참고
2. 기존 API 유틸리티(`riotApi.ts`, `dataDragon.ts`) 재사용
3. Riot API Rate Limit 초과 방지 위해 에러 핸들링 필수

### 디버깅 팁
- **API 에러**: `console.error`에서 Riot API 응답 확인 (`401`: 잘못된 키, `404`: 존재하지 않는 소환사/매치)
- **스킬 데미지 이상**: `champion.spells[i].vars`의 `link` 값 확인 (예: `attackdamage`, `spelldamage`, `bonusattackdamage`)
- **이미지 로딩 실패**: DataDragon 버전이 최신인지, `championId`가 정확한지 확인

### 배포 전 체크리스트
- [ ] `.env.local`에 프로덕션 API 키 설정
- [ ] 모든 API 호출에 에러 핸들링 존재
- [ ] Riot API 정책 준수 (Rate Limit, No Cheat)
- [ ] 민감 정보(API Key) 커밋되지 않았는지 확인

---

## 참고 문서

- [Riot Developer Portal](https://developer.riotgames.com/)
- [DataDragon 문서](https://developer.riotgames.com/docs/lol#data-dragon)
- [Match-V5 API](https://developer.riotgames.com/apis#match-v5)
- [Next.js App Router 가이드](https://nextjs.org/docs/app)
- [Tailwind CSS v4 문서](https://tailwindcss.com/docs)
