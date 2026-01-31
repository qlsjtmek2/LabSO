# LoL Adaptive Build & Strategy Optimizer (RabSO) 🧬⚔️

RabSO(구 LabSO)는 단순히 통계에 의존하는 기존의 빌드 추천 사이트와는 궤를 달리합니다. **유전 알고리즘(Genetic Algorithm)**과 **이벤트 기반 전투 시뮬레이션(V2 Engine)**을 결합하여, 특정 챔피언 상성에서의 최적 승리 공식을 찾아내는 차세대 분석 엔진입니다.

## 🚀 핵심 혁신 (V2 Simulation Engine)

기존의 단순한 스탯 합산 방식이 아닌, 실제 게임과 동일한 메커니즘을 시뮬레이션합니다.

1.  **Event-Driven Architecture**: `OnAttack`, `OnHit`, `OnSpellCast` 등 롤의 모든 상호작용을 이벤트로 처리합니다.
2.  **Timeline-Based Growth**: 0분부터 25분까지의 시간 흐름을 시뮬레이션합니다. CS 파밍, 골드 수급, 하위 아이템 구매, 라인전 딜교환 및 킬각을 모두 고려합니다.
3.  **Mutual Duel AI**: 사용자가 지정한 '상대 라이너' 역시 AI로 작동하며, 실제 스킬 콤보와 무빙을 구사합니다.
4.  **Hyper Evolution**: 한 번의 분석을 위해 AI가 약 **100,000회~500,000회**의 가상 전투를 수행하여 가장 승률이 높은 유전자를 진화시킵니다.

## 🛠️ 주요 기능

*   **진짜 1:1 맞딜 시뮬레이션**: 상대가 제드라면 '존야의 모래시계'의 가치를, 상대가 탱커라면 '도미닉 경의 인사'의 가치를 스스로 깨닫고 추천합니다.
*   **스킬 마스터 순서 진화**: 쿨타임 감소 효율과 구간별 데미지 기여도를 계산하여 최적의 스킬 선마 순서를 제안합니다.
*   **정밀한 룬/스펠 세팅**: 정복자 스택, 감전 쿨타임 등을 이벤트 단위로 계산하여 챔피언 메커니즘에 딱 맞는 룬을 찾아냅니다.
*   **아이템 툴팁 & AI 근거**: 왜 이 아이템이 선택되었는지 시뮬레이션 데이터(예상 데미지, TTK 등)와 함께 상세 설명을 제공합니다.

## 챔피언 정밀 구현 (Specialized Mechanics)

현재 다음 챔피언들은 고유의 복잡한 메커니즘이 코드 단위로 정밀 구현되어 있습니다:
*   **카타리나**: 단검 줍기 쿨타임 초기화 및 온힛 효율.
*   **이즈리얼**: Q 적중 시 모든 스킬 쿨다운 감소.
*   **베인**: 은화살(3타 고정 피해) 메커니즘.
*   **야스오/요네**: 치명타 확률 배증 및 공속 비례 Q 쿨감.
*   **기타 172개 전 챔피언**: 기본 스탯, 스킬 계수, 쿨타임 데이터 완전 연동.

## 💻 Tech Stack

*   **Frontend**: Next.js 14+ (App Router), Tailwind CSS
*   **Engine**: TypeScript-based Event-Driven Simulation Engine
*   **Data**: DataDragon API & CommunityDragon Data Pipeline
*   **Optimization**: Genetic Algorithm (Population: 500, Generations: 1000+)

---
"통계는 과거를 보여주지만, RabSO는 당신의 승리를 시뮬레이션합니다."