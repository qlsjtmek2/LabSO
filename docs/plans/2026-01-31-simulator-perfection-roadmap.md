# LabSO: 완벽한 LoL 시뮬레이터 구축 로드맵

> **목표**: 160개 이상의 모든 챔피언을 지원하며, 인게임과 99% 일치하는 정밀한 데미지 시뮬레이터 구축.
> **핵심 전략**: 수동 입력을 배제한 **데이터 파이프라인 자동화**와 **스키마 기반 엔진** 고도화.

---

## 🏗️ Phase 1: 데이터 파이프라인 자동화 (Data Pipeline) ✅
> **목표**: 160+ 챔피언의 스킬 데이터(계수, 기본값, 성장치)를 자동으로 수집하여 V2 스키마 JSON으로 변환합니다.

- [x] **데이터 소스 분석 및 선정**
    - [x] CommunityDragon (CDragon) 데이터 구조 분석
    - [x] Riot DataDragon 데이터 구조 분석
- [x] **Raw Data Fetcher 구현** (`scripts/data-pipeline/`)
    - [x] `fetch_raw_champion_data.ts`: CDragon(.bin.json) 및 DDragon(championFull.json) 데이터 다운로드
- [x] **Schema Converter 구현**
    - [x] `convert_champion.ts`: Raw 데이터를 `ChampionSchema` V2로 변환
        - [x] **Hybrid Parsing Strategy**: DDragon `vars`/`tooltip` 우선 파싱, 실패 시 CDragon `.bin.json` 분석 (백업 전략)
        - [x] `StatByNamedDataValueCalculationPart` 등 복잡한 CDragon 구조 지원
- [x] **Batch Processing**
    - [x] 172개 챔피언에 대해 변환 실행 -> `src/engine/simulator/data/samples/*.json` 생성 완료

## ⚙️ Phase 2: 엔진 코어 정밀화 (Engine Core) ✅
> **목표**: LoL의 복잡한 데미지 공식과 전투 매커니즘을 엔진에 완벽히 구현합니다.

- [x] **평타(Auto Attack) 로직 고도화**
    - [x] 치명타(Crit) 확률 및 데미지 공식 적용 (175% + 아이템)
    - [x] 공격 속도(Attack Speed) 공식(Base + Ratio*Bonus) 및 2.5 Cap 적용
- [x] **관통력 및 방어력 공식 완비**
    - [x] `DamageEngine`: 레벨 비례 물리 관통력(Lethality) 공식 적용
    - [x] `calculateEffectiveDefense`: 방어구 관통력 -> 고정 관통력 순서 적용 확인
- [x] **아이템 효과 시스템 (Item Effects)**
    - [x] `ItemScript` 인터페이스 확장 (`onHit` return type, `onAttack` 등)
    - [x] `ItemFactory` 구현: 몰락한 왕의 검, 마법사의 최후, 내셔의 이빨, 크라켄 학살자 로직 구현
- [ ] **룬 시스템 연동**
    - [ ] 주요 룬(정복자, 감전, 집공)의 데미지 및 버프 효과 구현

## 🧩 Phase 3: 특수 메커니즘 지원 (Edge Cases)
> **목표**: 정형화된 스키마로 표현 불가능한 챔피언들을 위한 예외 처리를 구현합니다.

- [ ] **변신 챔피언 지원**
    - [ ] 니달리/제이스/엘리스: 스킬셋 교체 로직 구현 (`GenericChampion` 확장)
    - [ ] 나르: 분노 조절 및 메가 나르 변신 로직
- [ ] **스택형 챔피언 지원**
    - [ ] 나서스(Q), 베이가(Q/P), 킨드레드(P), 세나(P) 스택 입력 UI 및 로직 추가
- [ ] **특수 자원 챔피언**
    - [ ] 아펠리오스: 무기 시스템 (별도 클래스 필요 가능성 높음)
    - [ ] 블라디미르/자크: 체력 코스트 스킬 로직
- [ ] **소환수 메커니즘**
    - [ ] 하이머딩거, 자이라, 요릭, 말자하 소환수 데미지 계산

## 🖥️ Phase 4: UI/UX 확장 (UI Expansion) ✅
> **목표**: 사용자가 시뮬레이션 조건을 자유롭게 설정하고 결과를 직관적으로 확인하도록 합니다.

- [ ] **시뮬레이션 설정 UI 개선**
    - [ ] 챔피언 레벨, 스킬 레벨 상세 설정 (Q/W/E/R 각각)
    - [ ] 적 더미 스탯 설정 (체력, 방어력, 마법저항력)
    - [ ] 룬 페이지 선택 및 룬 스택 설정 (예: 정복자 풀스택)
- [x] **결과 리포트 고도화**
    - [x] `SimulationReport` 컴포넌트 추가
    - [x] 데미지 타입(물리/마법/고정) 구성비 바 차트
    - [x] 스킬별 데미지 기여도 시각화
    - [x] 상세 전투 로그 뷰어

## ✅ Phase 5: 검증 및 배포 (Validation)
> **목표**: 실제 인게임 데이터와 비교하여 정확도를 보증합니다.

- [ ] **Test Suite 구축**
    - [ ] 주요 챔피언 10종에 대한 시나리오 테스트 작성 (Jest)
    - [ ] "인게임 연습 모드" 데이터와 시뮬레이션 결과 비교표 작성
- [ ] **커뮤니티 검증**
    - [ ] 사용자 피드백 루프 생성 (데미지 오차 제보 기능)