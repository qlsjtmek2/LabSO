/**
 * 분석 결과 관련 타입 정의
 */

import type { ChampionMeta, DamageType, Lane, TeamComposition } from './champion';
import type { BuildRecommendation } from './build';
import type { RuneRecommendation } from './rune';

// 팀 분석 결과
export interface TeamAnalysis {
  // 팀 구성 수치
  totalAD: number;                // AD 챔피언 수
  totalAP: number;                // AP 챔피언 수
  totalHybrid: number;            // 하이브리드 챔피언 수
  totalTanks: number;             // 탱커 수
  totalAssassins: number;         // 암살자 수
  totalMarksmen: number;          // 원거리 딜러 수

  // 종합 점수
  damageBalance: DamageType;      // 팀 전체 데미지 성향
  adRatio: number;                // AD 비율 (0-1)
  apRatio: number;                // AP 비율 (0-1)

  ccScore: number;                // 총 CC 점수 (0-100)
  engageScore: number;            // 이니시 능력 (0-100)
  peelScore: number;              // 필 능력 (0-100)
  burstScore: number;             // 순간 딜 능력 (0-100)
  sustainedScore: number;         // 지속 딜 능력 (0-100)

  // 파워 그래프
  powerCurve: {
    early: number;                // 1-10
    mid: number;                  // 1-10
    late: number;                 // 1-10
  };

  // 승리 조건 분석
  winConditions: string[];        // ["스플릿 푸시 우위", "후반 팀파이트 스케일링"]
  weaknesses: string[];           // ["초반 정글 싸움 불리", "이니시 부족"]
}

// 매치업 분석 결과
export interface MatchupAnalysis {
  myChampion: ChampionMeta;
  enemyLaner: ChampionMeta;

  // 라인전 분석
  advantageScore: number;         // -10 ~ +10 (양수: 유리, 음수: 불리)
  advantageLevel: 'Heavy Advantage' | 'Advantage' | 'Even' | 'Disadvantage' | 'Heavy Disadvantage';

  // 단계별 유불리
  earlyAdvantage: number;         // -10 ~ +10 (1-6레벨)
  midAdvantage: number;           // -10 ~ +10 (6-11레벨)
  lateAdvantage: number;          // -10 ~ +10 (11레벨 이후)

  // 라인전 팁
  tips: string[];
  warnings: string[];             // 주의사항

  // 추천 빌드 태그
  recommendedTags: string[];      // ["vsAssassin", "earlyArmor", "sustainLane"]

  // 킬 포텐셜
  killPotential: {
    early: 'High' | 'Medium' | 'Low';
    withJungler: 'High' | 'Medium' | 'Low';
    atSix: 'High' | 'Medium' | 'Low';
  };
}

// 전략 가이드
export interface StrategyGuide {
  // 게임 페이즈별 전략
  earlyGame: {
    objectives: string[];         // ["CS 집중", "레벨 2 교전 회피"]
    warnings: string[];           // ["상대 정글 인베이드 주의"]
    tips: string[];
  };

  midGame: {
    objectives: string[];         // ["드래곤 싸움 참여", "로밍"]
    playstyle: string;            // "사이드 라인 스플릿 푸시"
    tips: string[];
  };

  lateGame: {
    objectives: string[];         // ["바론 싸움", "백라인 보호"]
    teamfightRole: string;        // "플랭크 암살"
    tips: string[];
  };

  // 팀 내 역할
  teamRole: string;               // "메인 딜러", "이니시에이터" 등

  // 집중해야 할 상대
  priorityTargets: string[];      // ["적 원딜", "적 미드"]
  threatsToWatch: string[];       // ["적 정글 갱킹", "적 탑 TP"]
}

// 종합 분석 결과
export interface FullAnalysis {
  // 입력
  composition: TeamComposition;

  // 팀 분석
  allyAnalysis: TeamAnalysis;
  enemyAnalysis: TeamAnalysis;

  // 매치업 분석 (내 라이너 vs 상대 라이너)
  matchup: MatchupAnalysis | null;

  // 추천
  buildRecommendation: BuildRecommendation;
  runeRecommendation: RuneRecommendation;
  strategyGuide: StrategyGuide;

  // 메타 정보
  analyzedAt: Date;
  version: string;                // 패치 버전
}

// 규칙 컨텍스트 (규칙 엔진에서 사용)
export interface RuleContext {
  myChampion: ChampionMeta;
  myLane: Lane;

  allies: ChampionMeta[];
  enemies: ChampionMeta[];

  enemyLaner: ChampionMeta | null;

  allyAnalysis: TeamAnalysis;
  enemyAnalysis: TeamAnalysis;
  matchup: MatchupAnalysis | null;
}
