/**
 * 빌드 관련 타입 정의
 */

import type { ChampionClass, DamageType, Lane } from './champion';

// 아이템 슬롯 유형
export type ItemSlot = 'starter' | 'core' | 'situational' | 'boots';

// 아이템 조건 유형
export type ItemConditionType =
  | 'enemyHasClass'       // 상대에 특정 클래스 있을 때
  | 'enemyDamageType'     // 상대 주 데미지 타입
  | 'enemyHasCC'          // 상대 CC 많을 때
  | 'teamNeedsCC'         // 우리팀 CC 부족할 때
  | 'teamNeedsTank'       // 우리팀 탱커 부족할 때
  | 'teamNeedsAP'         // 우리팀 AP 부족할 때
  | 'vsLaner'             // 특정 라이너 상대
  | 'gamePhase'           // 게임 페이즈
  | 'always';             // 항상

// 아이템 조건
export interface ItemCondition {
  type: ItemConditionType;
  value?: string | string[] | number;
}

// 상황별 아이템
export interface SituationalItem {
  itemId: number;
  reason: string;           // "상대 AP 데미지 높을 때"
  condition: ItemCondition;
  priority: number;         // 동일 슬롯 내 우선순위
}

// 부츠 선택
export interface BootsChoice {
  itemId: number;
  reason: string;
  condition: ItemCondition;
  priority: number;
}

// 빌드 조건
export interface BuildCondition {
  vsClasses?: ChampionClass[];    // 상대에 이 클래스가 있을 때
  vsDamageType?: DamageType;      // 상대 주 데미지 타입
  vsLaner?: string[];             // 특정 챔피언과 라인전 시
  teamHasNoTank?: boolean;        // 우리 팀에 탱커가 없을 때
  teamNeedsAP?: boolean;          // 우리 팀에 AP가 부족할 때
  forLane?: Lane;                 // 특정 라인용
}

// 빌드 템플릿
export interface BuildTemplate {
  id: string;
  name: string;                   // "기본 빌드", "탱커 상대 빌드" 등
  tags: string[];                 // ["vsAP", "vsAssassin", "splitPush"]

  // 선템
  starterItems: number[];         // 시작 아이템 (도란검, 물약 등)

  // 코어 아이템 (순서대로)
  coreItems: number[];            // 필수 코어 (item ID)

  // 상황별 아이템
  situationalItems: SituationalItem[];

  // 부츠
  boots: BootsChoice[];

  // 조건
  condition?: BuildCondition;
  priority: number;               // 동일 조건 시 우선순위
}

// 아이템 추천 결과
export interface ItemRecommendation {
  itemId: number;
  slot: ItemSlot;
  reason: string;
  score: number;                  // 추천 점수 (0-1)
  ruleId: string;                 // 적용된 규칙 ID
}

// 최종 빌드 추천
export interface BuildRecommendation {
  starterItems: ItemRecommendation[];
  coreItems: ItemRecommendation[];
  situationalItems: ItemRecommendation[];
  boots: ItemRecommendation;
  summary: string;
  reasons: string[];
  
  // 유전 알고리즘 분석 결과
  skillOrder?: string[];
  summonerSpells?: string[];
  
  // 시뮬레이션 결과
  simulationStats?: {
    damage: number;
    survivability: number;
    dps: number;
  };
  
  // 레벨별 파워 커브 (6, 11, 16, 18)
  powerCurve?: Array<{
    level: number;
    damage: number;
    survivability: number;
    items: number[]; // 당시 보유 아이템 ID
  }>;
}

// 아이템 정보 (DataDragon에서 가져온 데이터 + 추가 메타)
export interface ItemInfo {
  id: number;
  name: string;
  description: string;
  stats: Record<string, number>;
  gold: { total: number; sell: number; purchasable: boolean };
  image: string;

  // 추가 메타데이터
  category?: 'damage' | 'defense' | 'utility' | 'boots';
  antiClass?: ChampionClass[];    // 이 클래스에 효과적
  tags?: string[];
}
