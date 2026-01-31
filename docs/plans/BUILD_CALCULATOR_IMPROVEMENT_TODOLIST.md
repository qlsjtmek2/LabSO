# RabSO 빌드 계산기 개선 계획

> 생성일: 2026-01-31
> 예상 Phase: 6개
> 총 작업: 20개
> 목표: 최고 수준의 LoL 빌드 추천 시스템 구축

## 📋 프로젝트 개요

- **목적**: RabSO 빌드 계산기를 op.gg/u.gg 수준 이상으로 개선
- **핵심 차별화**: 시뮬레이션 기반 추천, 설명 가능한 AI, 상대 조합 맞춤
- **우선순위 기준**: 영향도 × 구현 난이도

---

## 📊 현재 상태 요약

| 영역 | 완성도 | 핵심 이슈 |
|------|--------|----------|
| 시뮬레이션 엔진 | 40% | 치명타/흡혈/AP 계수 미구현 |
| 데이터 완성도 | 60% | 적 스탯 임의 계산, 메타 동기화 부재 |
| 규칙 시스템 | 30% | 10개 규칙만 존재, 시너지/타이밍 미지원 |
| UI/UX | 70% | 진행률 표시 없음, 결과 설명 부족 |

---

## 🎯 Phase 1: UI/UX 즉시 개선

**목표**: 사용자 경험 즉시 향상 (영향도 높음, 난이도 낮음)

### 분석 진행률 표시
- [ ] `AnalysisProgress.tsx` 컴포넌트 생성
- [ ] 4단계 진행률 표시 (규칙 분석 → 전투 시뮬레이션 → AI 최적화 → 결과 집계)
- [ ] 세대 진행 상황 실시간 표시 (유전 알고리즘)
- [ ] 애니메이션 프로그레스 바

**관련 파일**:
- `src/app/build-advisor/page.tsx` (라인 177-187)
- `src/components/build-advisor/` (새 컴포넌트)

### 결과 설명 개선
- [ ] `ItemCard.tsx` 리디자인
- [ ] 구체적 추천 이유 표시 ("vs 제드: 효율 85%")
- [ ] 대안 아이템 비교 정보
- [ ] 구매 타이밍 권장 표시

**관련 파일**:
- `src/components/build-advisor/AnalysisResult.tsx` (라인 46-98)

### 아이템 카드 UI 리디자인
- [ ] 시너지 아이템 표시
- [ ] 빌드 경로 (하위 아이템) 시각화
- [ ] 툴팁 정보 개선 (HTML 정제 로직 수정)

---

## 🎯 Phase 2: 시뮬레이션 엔진 핵심

**목표**: 전투 시뮬레이션 정확도 대폭 향상 (영향도 높음, 난이도 중간)

### 치명타 시스템 구현
- [ ] `CriticalStrike` 인터페이스 정의
- [ ] 기본 치명타 확률/데미지 계산
- [ ] 야스오/요네 특수 케이스 (치확 2배, 크뎀 감소)
- [ ] 인피니티 엣지 패시브 (+35% 크뎀)
- [ ] `damageEngine.ts` 라인 81 주석 → 실제 구현

**관련 파일**:
- `src/engine/simulator/core/damageEngine.ts`
- `src/engine/simulator/v2/core/engine.ts`

### AP 스케일링 구현
- [ ] `ChampionModelV2.ts` 수정 (라인 64: `ap: 0` 하드코딩 제거)
- [ ] 스킬별 AP 계수 적용
- [ ] 보너스 AD 계수 분리 계산

**관련 파일**:
- `src/engine/simulator/v2/models/ChampionModelV2.ts`

### 흡혈/재생 시스템 구현
- [ ] `Sustain` 인터페이스 정의
- [ ] 물리 피해 흡혈 (Lifesteal)
- [ ] 모든 피해 흡혈 (Omnivamp)
- [ ] 체력 재생 틱 처리

### 적응형 틱 레이트 적용
- [ ] 스킬 시전 중: 0.01초 (정밀)
- [ ] 전투 중: 0.05초
- [ ] 이동/대기: 0.5초 (성능)

**관련 파일**:
- `src/engine/simulator/v2/core/engine.ts` (라인 22-32)

---

## 🎯 Phase 3: 규칙 시스템 확장

**목표**: 10개 → 50+ 규칙으로 확장 (영향도 높음, 난이도 중간)

### 아이템 시너지 규칙 추가
- [ ] 온힛 시너지 (BotRK + 구인수 + 위츠엔드)
- [ ] 치명타 시너지 (인피니티 + 나보리)
- [ ] AP 버스트 시너지
- [ ] 방어 아이템 시너지

**관련 파일**:
- `src/engine/rules/buildRules.ts`
- `src/data/rules/` (새 YAML 규칙)

### 타이밍 규칙 추가
- [ ] 첫 귀환 아이템 규칙
- [ ] 적 6렙 전 대응 아이템 (수은 등)
- [ ] 1코어/2코어 스파이크 규칙
- [ ] 드래곤/바론 전 빌드 조정

### 포지션별 규칙 추가
- [ ] 탑: vs 원거리, vs 포킹
- [ ] 미드: 로밍 중심, 라인전 중심
- [ ] 정글: 갱킹 중심, 파밍 중심
- [ ] 원딜: 라인전 유리/불리
- [ ] 서폿: 인게이지, 인챈터, 메이지

### 회복 챔피언 리스트 최신화
- [ ] 2025-2026 신챔 추가 (Samira, Lillia 등)
- [ ] 메타 변경 반영

**관련 파일**:
- `src/engine/rules/buildRules.ts` (라인 205-207)

---

## 🎯 Phase 4: 성능 최적화

**목표**: 분석 시간 10-30초 → 3초 이내 (영향도 중간, 난이도 중간)

### Web Worker로 유전 알고리즘 분리
- [ ] `workers/geneticWorker.ts` 생성
- [ ] 메인 스레드 블로킹 제거
- [ ] 진행률 메시지 통신

**관련 파일**:
- `src/engine/simulator/genetic/geneticOptimizer.ts`

### 빌드 추천 캐싱 전략 구현
- [ ] LocalStorage 캐시 키 설계
- [ ] 1시간 TTL 적용
- [ ] 챔피언+적조합 기반 캐시 키

### 점진적 결과 표시
- [ ] 1단계: 규칙 기반 즉시 결과 (100ms)
- [ ] 2단계: 시뮬레이션 결과 (5초)
- [ ] 3단계: 유전 알고리즘 (백그라운드)
- [ ] 결과 병합 로직

---

## 🎯 Phase 5: 데이터 시스템

**목표**: 데이터 정확도 및 현실성 향상 (영향도 중간, 난이도 높음)

### 레벨/시간 기반 적 스탯 계산 로직
- [ ] `estimateEnemyStats()` 함수 구현
- [ ] 레벨별 기본 스탯 + 성장 계산
- [ ] 예상 골드 기반 아이템 스탯 추정
- [ ] `buildRecommender.ts` 라인 71-78 수정

**관련 파일**:
- `src/engine/recommender/buildRecommender.ts`

### 상황별 시뮬레이션 시나리오 구현
- [ ] 레벨 3 올인 (가중치 15%)
- [ ] 레벨 6 궁 교전 (가중치 20%)
- [ ] 1코어 완성 시점 (가중치 25%)
- [ ] 2코어 드래곤 싸움 (가중치 20%)
- [ ] 풀템 한타 (가중치 20%)
- [ ] 가중 평균 적합도 산출

### championMeta.ts 전체 챔피언 확장
- [ ] 현재 42개 → 166개 챔피언
- [ ] 2026년 메타 반영
- [ ] powerSpike 데이터 정확도 개선

**관련 파일**:
- `src/data/championMeta.ts`

---

## 🎯 Phase 6: 고급 기능

**목표**: 경쟁 서비스 차별화 기능 (영향도 높음, 난이도 높음)

### 인터랙티브 빌드 비교 컴포넌트
- [ ] `BuildComparator.tsx` 컴포넌트 생성
- [ ] 현재 빌드 vs 추천 빌드 비교
- [ ] 실시간 스탯 비교 차트
- [ ] 드래그앤드롭 아이템 교체

### 적응형 빌드 경로 시스템
- [ ] `DynamicBuildPath` 인터페이스 정의
- [ ] 게임 상황별 체크포인트
- [ ] 킬/골드/상대 빌드에 따른 분기
- [ ] 챔피언별 빌드 경로 데이터

### 메타 자동 동기화 파이프라인
- [ ] `scripts/updateMeta.ts` 스크립트 생성
- [ ] Riot API 패치 노트 파싱
- [ ] op.gg/u.gg 승률 데이터 수집 (선택적)
- [ ] championMeta.ts 자동 업데이트
- [ ] GitHub Actions 연동

---

## 📊 진행 상황

- **완료**: 0/20 (0%)
- **진행 중**: -
- **다음 단계**: Phase 1 시작

---

## 🔧 기술 참고사항

### Phase 1 관련 파일
```
src/app/build-advisor/page.tsx
src/components/build-advisor/AnalysisResult.tsx
src/components/build-advisor/AnalysisProgress.tsx (신규)
src/components/build-advisor/ItemCard.tsx (신규)
```

### Phase 2 관련 파일
```
src/engine/simulator/core/damageEngine.ts
src/engine/simulator/v2/core/engine.ts
src/engine/simulator/v2/models/ChampionModelV2.ts
```

### Phase 3 관련 파일
```
src/engine/rules/buildRules.ts
src/engine/rules/registry/ruleRegistry.ts
src/data/rules/*.yaml (신규)
```

### Phase 4 관련 파일
```
src/engine/simulator/genetic/geneticOptimizer.ts
workers/geneticWorker.ts (신규)
```

---

## 📈 예상 효과

| Phase | 완료 시 효과 |
|-------|------------|
| Phase 1 | 사용자 이탈률 50% 감소 (대기 시간 체감 개선) |
| Phase 2 | 추천 정확도 30% 향상 (핵심 메커니즘 구현) |
| Phase 3 | 상황 대응력 200% 향상 (규칙 5배 확장) |
| Phase 4 | 분석 시간 80% 단축 (30초 → 3초) |
| Phase 5 | 데이터 현실성 50% 향상 |
| Phase 6 | 경쟁 서비스 대비 고유 가치 확보 |

---

## ✅ 체크리스트

### Phase 1 완료 조건
- [ ] 분석 중 진행률 바가 표시됨
- [ ] 각 단계별 상태 메시지 표시
- [ ] 아이템 추천 이유가 구체적으로 표시됨

### Phase 2 완료 조건
- [ ] 치명타 빌드 챔피언의 DPS가 정확히 계산됨
- [ ] AP 챔피언의 스킬 데미지가 정확히 계산됨
- [ ] 흡혈 아이템의 생존력 기여가 반영됨

### Phase 3 완료 조건
- [ ] 50개 이상의 규칙이 등록됨
- [ ] 시너지 빌드가 우선 추천됨
- [ ] 타이밍별 추천이 다르게 표시됨

### Phase 4 완료 조건
- [ ] 분석 완료까지 3초 이내
- [ ] UI가 분석 중에도 반응함
- [ ] 캐시된 결과는 즉시 표시됨

### Phase 5 완료 조건
- [ ] 적 스탯이 게임 시간에 따라 달라짐
- [ ] 5개 시나리오 각각의 결과가 표시됨
- [ ] 166개 챔피언 메타 데이터 완비

### Phase 6 완료 조건
- [ ] 빌드 비교 UI가 작동함
- [ ] 게임 상황별 빌드 분기가 표시됨
- [ ] 주간 메타 자동 업데이트 작동
