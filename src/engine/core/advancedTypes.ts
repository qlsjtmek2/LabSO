/**
 * 고급 규칙 인터페이스 및 팩트 베이스
 * 
 * 복잡한 규칙과 상태를 효율적으로 관리하기 위한 코어 정의입니다.
 */

import type { ChampionMeta, TeamAnalysis, MatchupAnalysis, ItemRecommendation } from '@/types';

// 1. FactBase: 게임 상황에서 추출된 '사실'들의 집합
export interface FactBase {
  // 위협 요소
  hasPointClickCC: boolean;      // 확정 CC 여부 (트페 골카 등)
  hasHeavyBurst: boolean;        // 폭딜 여부
  hasShieldBow: boolean;         // 철갑궁 효과 필요 여부
  
  // 상대 구성 특성
  enemyDamageProfile: {
    adRatio: number;
    apRatio: number;
    trueDamageThreat: boolean;
  };
  
  // 내 챔피언 특성 (동적)
  myScaling: {
    ad: boolean;
    ap: boolean;
    hybrid: boolean;
  };
  
  // 게임 단계
  currentPhase: 'Early' | 'Mid' | 'Late';
}

// 2. AdvancedContext: 규칙이 실행될 때 참조하는 전체 맥락
export interface AdvancedContext {
  myChampion: ChampionMeta;
  allies: ChampionMeta[];
  enemies: ChampionMeta[];
  enemyLaner: ChampionMeta | null;
  
  // 분석 데이터
  facts: FactBase;
  matchup: MatchupAnalysis | null;
  
  // 현재 결정된 전략 (Strategy Layer에서 설정됨)
  activeStrategy: string | null; // 예: "AD_ONHIT", "AP_BURST"
}

// 3. RulePriority: 규칙 적용 시점/우선순위
export enum RulePriority {
  CRITICAL = 100, // 반드시 적용 (치감, 수은 등)
  STRATEGY = 80,  // 빌드 방향성 결정 (카타 AD/AP 전환)
  TACTICAL = 60,  // 특정 아이템 추천 (밤끝 등)
  OPTIMAL = 40,   // 효율 최적화
  FILLER = 20,    // 남는 슬롯 채우기
}

// 4. AdvancedRule: 개선된 규칙 인터페이스
export interface AdvancedRule {
  id: string;
  name: string;
  description: string;
  
  // 실행 조건: 트리거 (성능 최적화용)
  // 예: ['TwistedFate'] -> 적이나 아군에 트페가 있을 때만 이 규칙을 로드함
  triggers: string[]; 
  
  // 우선순위
  priority: RulePriority;
  
  // 조건 검사
  condition: (ctx: AdvancedContext) => boolean;
  
  // 액션: 아이템 추천 목록을 반환하거나, 전략을 수정함
  action: (ctx: AdvancedContext) => ItemRecommendation[] | { strategyChange: string };
}
