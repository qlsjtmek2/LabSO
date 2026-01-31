# 🔴 RabSO 프로젝트 가이드라인

## 핵심 아키텍처 (Simulator V2)

### 1. 이벤트 기반 전투 엔진 (`src/engine/simulator/v2/core`)
- 모든 행위는 `GameEvent`로 발행됨.
- 아이템, 룬, 챔피언 패시브는 이 이벤트를 리스닝하여 반응함.
- `SimulationEngine`: 0.1초 단위의 틱과 이벤트 브로드캐스팅 관리.

### 2. 타임라인 및 경제 시스템 (`src/engine/simulator/v2/timeline`)
- `TimelineSimulator`: 0~25분 사이의 성장 곡선을 시뮬레이션함.
- `BuildPathGenerator`: 현재 골드 상황에서 최적의 하위템 구매 트리 생성.
- `GPM` (Gold Per Minute) 상수를 통해 현실적인 성장 속도 반영.

### 3. 유전 알고리즘 (`src/engine/simulator/genetic`)
- `GeneticOptimizer`: V2 엔진을 수만 번 호출하여 적합도 평가.
- `Fitness`: (라인전 킬/골드 격차) + (후반 전투 승리 여부) + (생존 HP)를 종합하여 산출.

## 🔴 CRITICAL RULES

- **데이터 무결성**: `src/data/json/` 아래의 챔피언/아이템 데이터를 수정하기 전 반드시 `data-pipeline` 스크립트를 통해 생성되었는지 확인할 것.
- **V2 엔진 우선**: 새로운 기능을 추가할 때는 V1(`buildOptimizer.ts`)이 아닌 V2 엔진(`v2/`) 구조를 확장할 것.
- **챔피언 로직**: 특수 기믹이 필요한 경우 `src/engine/simulator/v2/champions/index.ts`에 로직을 추가하여 `ChampionModelV2`에 주입할 것.

## 💻 현재 상태
- [DONE] V2 이벤트 기반 시뮬레이션 엔진 구축.
- [DONE] 타임라인 기반 성장 시뮬레이터 통합.
- [DONE] 172개 챔피언 정밀 데이터 파이프라인 완성.
- [DONE] 주요 챔피언(카타리나, 이즈, 베인 등) 메커니즘 특수 구현.
- [DONE] UI/UX 리뉴얼 및 아이템 툴팁 연동.

## 🚀 향후 과제
- **전 챔피언 특수 로직 구현**: 172개 챔피언 전체의 패시브/특수 기믹 스크립트화.
- **멀티 시나리오**: 한타(5:5) 상황을 가정한 간이 시뮬레이션 모드 추가.
- **성능 최적화**: 100만 회 이상의 시뮬레이션을 위한 Web Worker 도입.