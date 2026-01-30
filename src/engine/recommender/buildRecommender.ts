/**
 * 빌드 추천기
 *
 * 규칙 엔진을 사용하여 상황별 최적 빌드를 추천합니다.
 */

import type {
  ChampionMeta,
  Lane,
  TeamAnalysis,
  MatchupAnalysis,
  RuleContext,
  BuildRecommendation,
  ItemRecommendation,
} from '@/types';
import { RuleEngine } from '../rules/ruleEngine';
import { ALL_BUILD_RULES, type BuildRuleResult } from '../rules/buildRules';
import { analyzeTeam } from '../analyzer/teamAnalyzer';
import { analyzeMatchup } from '../analyzer/matchupAnalyzer';

// 빌드 추천기 클래스
export class BuildRecommender {
  private ruleEngine: RuleEngine<RuleContext, BuildRuleResult>;

  constructor() {
    this.ruleEngine = new RuleEngine<RuleContext, BuildRuleResult>('build');
    this.ruleEngine.addRules(ALL_BUILD_RULES);
  }

  // 빌드 추천 생성
  recommend(
    myChampion: ChampionMeta,
    myLane: Lane,
    allies: ChampionMeta[],
    enemies: ChampionMeta[],
    enemyLaner: ChampionMeta | null
  ): BuildRecommendation {
    // 팀 분석
    const allyAnalysis = analyzeTeam(allies);
    const enemyAnalysis = analyzeTeam(enemies);

    // 매치업 분석
    const matchup = enemyLaner
      ? analyzeMatchup(myChampion, enemyLaner)
      : null;

    // 규칙 컨텍스트 생성
    const context: RuleContext = {
      myChampion,
      myLane,
      allies,
      enemies,
      enemyLaner,
      allyAnalysis,
      enemyAnalysis,
      matchup,
    };

    // 규칙 평가
    const evaluation = this.ruleEngine.evaluate(context);

    // 결과 집계
    return this.aggregateResults(evaluation.appliedRules, myChampion, matchup);
  }

  // 결과 집계
  private aggregateResults(
    appliedRules: Array<{
      ruleId: string;
      ruleName: string;
      score: number;
      result: BuildRuleResult;
      reason: string;
    }>,
    myChampion: ChampionMeta,
    matchup: MatchupAnalysis | null
  ): BuildRecommendation {
    // 슬롯별로 분류
    const bySlot: Record<string, ItemRecommendation[]> = {
      starter: [],
      core: [],
      situational: [],
      boots: [],
    };

    for (const rule of appliedRules) {
      const slot = rule.result.slot;
      bySlot[slot].push(rule.result);
    }

    // 각 슬롯에서 상위 항목 선택
    const starterItems = this.selectTop(bySlot.starter, 2);
    const coreItems = this.selectTop(bySlot.core, 3);
    const situationalItems = this.selectTop(bySlot.situational, 3);
    const boots = bySlot.boots.length > 0
      ? bySlot.boots.sort((a, b) => b.score - a.score)[0]
      : this.getDefaultBoots(myChampion);

    // 종합 설명 생성
    const summary = this.generateSummary(appliedRules, matchup);
    const reasons = appliedRules
      .slice(0, 5)
      .map((r) => r.reason);

    return {
      starterItems,
      coreItems,
      situationalItems,
      boots,
      summary,
      reasons,
    };
  }

  // 상위 N개 선택
  private selectTop(items: ItemRecommendation[], n: number): ItemRecommendation[] {
    return items
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  }

  // 기본 부츠 추천
  private getDefaultBoots(champion: ChampionMeta): ItemRecommendation {
    let itemId = 3006; // 광전사의 군화
    let reason = '기본 공격 속도 부츠';

    if (champion.class === 'Mage' || champion.class === 'Artillery') {
      itemId = 3020; // 마법사의 신발
      reason = 'AP 챔피언용 마법 관통력 부츠';
    } else if (champion.class === 'Assassin' && champion.damageType === 'AD') {
      itemId = 3158; // 명석함의 아이오니아 장화
      reason = '스킬 쿨다운 감소 부츠';
    } else if (champion.class === 'Tank') {
      itemId = 3047; // 판금 장화
      reason = '탱커용 방어 부츠';
    }

    return {
      itemId,
      slot: 'boots',
      reason,
      score: 0.5,
      ruleId: 'default-boots',
    };
  }

  // 종합 설명 생성
  private generateSummary(
    appliedRules: Array<{
      ruleId: string;
      ruleName: string;
      score: number;
    }>,
    matchup: MatchupAnalysis | null
  ): string {
    const parts: string[] = [];

    // 매치업 기반
    if (matchup) {
      if (matchup.advantageLevel === 'Heavy Disadvantage' || matchup.advantageLevel === 'Disadvantage') {
        parts.push('라인전이 불리하므로 안정적인 빌드를 추천합니다.');
      } else if (matchup.advantageLevel === 'Heavy Advantage' || matchup.advantageLevel === 'Advantage') {
        parts.push('라인전이 유리하므로 공격적인 빌드가 가능합니다.');
      }
    }

    // 적용된 규칙 기반
    const topRules = appliedRules.slice(0, 3);
    if (topRules.some((r) => r.ruleId.includes('assassin'))) {
      parts.push('상대 암살자 대비 생존 아이템이 중요합니다.');
    }
    if (topRules.some((r) => r.ruleId.includes('tank'))) {
      parts.push('상대 탱커 대비 관통 아이템을 고려하세요.');
    }
    if (topRules.some((r) => r.ruleId.includes('healing'))) {
      parts.push('상대 회복 챔피언 대비 회복 감소가 필요합니다.');
    }

    return parts.join(' ') || '표준 빌드를 추천합니다.';
  }

  // 디버그
  debug(): string {
    return this.ruleEngine.debug();
  }
}

// 싱글톤 인스턴스
let recommenderInstance: BuildRecommender | null = null;

export function getBuildRecommender(): BuildRecommender {
  if (!recommenderInstance) {
    recommenderInstance = new BuildRecommender();
  }
  return recommenderInstance;
}

// 빌드 추천 함수 (편의용)
export function recommendBuild(
  myChampion: ChampionMeta,
  myLane: Lane,
  allies: ChampionMeta[],
  enemies: ChampionMeta[],
  enemyLaner: ChampionMeta | null
): BuildRecommendation {
  return getBuildRecommender().recommend(
    myChampion,
    myLane,
    allies,
    enemies,
    enemyLaner
  );
}
