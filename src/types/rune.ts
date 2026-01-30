/**
 * 룬 관련 타입 정의
 */

import type { ChampionClass, Lane } from './champion';

// 룬 트리
export type RuneTree =
  | 'Precision'     // 정밀
  | 'Domination'    // 지배
  | 'Sorcery'       // 마법
  | 'Resolve'       // 결의
  | 'Inspiration';  // 영감

// 룬 조건
export interface RuneCondition {
  vsClass?: ChampionClass[];
  forLane?: Lane;
  playstyle?: 'Aggressive' | 'Defensive' | 'Scaling' | 'Utility';
  vsRanged?: boolean;
  vsMelee?: boolean;
}

// 룬 템플릿
export interface RuneTemplate {
  id: string;
  name: string;                   // "표준 딜러", "라인전 특화" 등

  // 주 룬
  primaryTree: RuneTree;
  primaryKeystone: string;        // 키스톤 ID
  primaryRunes: [string, string, string]; // 주 룬 3개

  // 보조 룬
  secondaryTree: RuneTree;
  secondaryRunes: [string, string]; // 보조 룬 2개

  // 스탯 룬 (3개)
  statRunes: [string, string, string];

  // 조건
  condition?: RuneCondition;
  priority: number;

  // 설명
  description?: string;
}

// 개별 룬 정보
export interface RuneInfo {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  tree: RuneTree;
  slot: number;                   // 0: 키스톤, 1-3: 일반 룬
  icon: string;
}

// 스탯 룬 정보
export interface StatRuneInfo {
  id: string;
  name: string;
  description: string;
  slot: number;                   // 0: 공격, 1: 유연, 2: 방어
  icon: string;
}

// 룬 추천 결과
export interface RuneRecommendation {
  template: RuneTemplate;
  reasons: string[];
  score: number;

  // 개별 룬별 추천 이유
  keystoneReason?: string;
  secondaryReason?: string;
  statReason?: string;
}

// 룬 페이지 (최종 결과)
export interface RunePage {
  primaryTree: RuneTree;
  secondaryTree: RuneTree;

  keystone: RuneInfo;
  primarySlot1: RuneInfo;
  primarySlot2: RuneInfo;
  primarySlot3: RuneInfo;

  secondarySlot1: RuneInfo;
  secondarySlot2: RuneInfo;

  statOffense: StatRuneInfo;
  statFlex: StatRuneInfo;
  statDefense: StatRuneInfo;

  reasons: string[];
}
