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

import { BuildOptimizer } from '../simulator/buildOptimizer';
import { MetaBreaker } from '../simulator/metaBreaker';
import { GeneticOptimizer } from '../simulator/genetic/geneticOptimizer';
import { ChampionSchema } from '../simulator/data/schemas';
import itemsData from '../../data/json/items.json';

// 챔피언 데이터 동적 로드 함수
async function loadChampionSchema(championId: string): Promise<ChampionSchema | null> {
  try {
    // lowercase 처리하여 파일명 매칭 (aatrox.json 등)
    const schema = await import(`../simulator/data/samples/${championId.toLowerCase()}.json`);
    return schema.default || schema;
  } catch (e) {
    console.error(`Failed to load schema for ${championId}:`, e);
    return null;
  }
}

// 빌드 추천기 클래스
export class BuildRecommender {
  private ruleEngine: RuleEngine<RuleContext, BuildRuleResult>;

  constructor() {
    this.ruleEngine = new RuleEngine<RuleContext, BuildRuleResult>('build');
    this.ruleEngine.addRules(ALL_BUILD_RULES);
  }

  // 빌드 추천 생성
  async recommend(
    myChampion: ChampionMeta,
    myLane: Lane,
    allies: ChampionMeta[],
    enemies: ChampionMeta[],
    enemyLaner: ChampionMeta | null
  ): Promise<BuildRecommendation> {
    const allyAnalysis = analyzeTeam(allies);
    const enemyAnalysis = analyzeTeam(enemies);
    const matchup = enemyLaner ? analyzeMatchup(myChampion, enemyLaner) : null;

    const context: RuleContext = {
      myChampion, myLane, allies, enemies, enemyLaner, allyAnalysis, enemyAnalysis, matchup,
    };

    const evaluation = this.ruleEngine.evaluate(context);

    // 모든 챔피언에 대해 시뮬레이션 데이터 동적 로드
    let simRecommendations: ItemRecommendation[] = [];
    let bestIndividual: any = null;
    let geneticItems: any[] = [];
    
    const schema = await loadChampionSchema(myChampion.id);
    
    if (schema) {
      const enemyStats = {
        level: 18,
        range: 125,
        hp: 2000, maxHp: 2000, mana: 0, ad: 100, ap: 0,
        armor: enemyAnalysis.totalAD * 10 + 50,
        mr: enemyAnalysis.totalAP * 10 + 40,
        attackSpeed: 0.7, abilityHaste: 0, critChance: 0, critDamage: 1.75,
        lethality: 0, armorPen: 0, magicPenFlat: 0, magicPenPercent: 0, omnivamp: 0, lifesteal: 0,
        movementSpeed: 340
      };

      const simulationResults = await BuildOptimizer.findBestItems(
        schema as ChampionSchema,
        enemyStats,
        this.generateCandidates(myChampion)
      );
      
      simRecommendations = simulationResults;

      const hiddenOP = await MetaBreaker.findHiddenOP(
        schema as ChampionSchema,
        enemyStats,
        simulationResults
      );

      if (hiddenOP) {
        simRecommendations.unshift(hiddenOP);
      }

      // 진짜 적 스키마 로드
      const enemySchema = await loadChampionSchema(enemyLaner?.id || 'Aatrox');

      // 4. 통합 유전 알고리즘 최적화 (풀 로드아웃 - 하이퍼 진화)
      const geneticOptimizer = new GeneticOptimizer(
        schema as ChampionSchema,
        enemyStats,
        {
          populationSize: 200, 
          generations: 500,    
          mutationRate: 0.2,   
          eliteCount: 10       
        },
        enemySchema || undefined // V2 엔진용 적 스키마 전달
      );

      bestIndividual = await geneticOptimizer.run();
      
      geneticItems = bestIndividual.genes.items.map((id: number) => ({
        itemId: id,
        slot: 'core' as const,
        reason: "유전 알고리즘 시뮬레이션 결과 최고의 효율을 보인 아이템입니다.",
        score: 1.0,
        ruleId: 'genetic-optimized'
      }));

      // 5. 파워 커브 시뮬레이션 (6, 11, 16, 18레벨)
      const powerCurve = await this.simulatePowerCurve(
        schema as ChampionSchema,
        bestIndividual.genes.items,
        enemyStats
      );

      return this.aggregateResults(
        evaluation.appliedRules, 
        [...geneticItems, ...simRecommendations], 
        myChampion, 
        matchup,
        {
          damage: Math.round(bestIndividual.stats.damage),
          survivability: Math.round(bestIndividual.stats.survivability),
          dps: Math.round(bestIndividual.stats.damage / 3)
        },
        bestIndividual,
        powerCurve
      );
    }

    // 결과 집계
    return this.aggregateResults(evaluation.appliedRules, simRecommendations, myChampion, matchup);
  }

  // 파워 커브 시뮬레이션
  private async simulatePowerCurve(
    schema: ChampionSchema,
    finalItems: number[],
    enemyStats: any
  ): Promise<any[]> {
    const levels = [6, 11, 16, 18];
    const itemProgression: Record<number, number[]> = {
      6:  [finalItems[0] || 1055], // 도란검 or 첫템
      11: finalItems.slice(0, 2), // 2코어
      16: finalItems.slice(0, 4), // 4코어
      18: finalItems // 풀템
    };

    const results = [];
    
    // GenericChampionModel 동적 임포트 (순환 참조 방지)
    const { GenericChampionModel } = await import('../simulator/models/GenericChampion');
    const { ItemFactory } = await import('../simulator/items/itemFactory');

    // items.json 로드
    const itemsData = (await import('../../data/json/items.json')).default;

    for (const level of levels) {
      const currentItems = itemProgression[level];
      const itemScripts = currentItems.map(id => {
        const data = (itemsData as any)[String(id)];
        return data ? ItemFactory.createItem({ ...data, id }) : { name: 'Unknown', stats: {} };
      });

      const model = new GenericChampionModel(schema, itemScripts, level);
      
      // 적 스탯 조정 (레벨에 맞게)
      const scaledEnemy = {
        ...enemyStats,
        hp: 1000 + (level * 80),
        armor: 30 + (level * 3),
        mr: 30 + (level * 2)
      };

      // QWE 콤보 시뮬레이션
      const events = model.simulateCombo(['Q', 'W', 'E', 'AA', 'R'], scaledEnemy);
      const totalDamage = events.reduce((sum, e) => sum + e.mitigatedDamage, 0);

      results.push({
        level,
        damage: Math.round(totalDamage),
        survivability: Math.round(model['stats'].hp + model['stats'].armor * 2), // 단순 생존력 지표
        items: currentItems
      });
    }

    return results;
  }

  // 후보군 생성 유틸리티
  private generateCandidates(myChampion: ChampionMeta): number[] {
    const candidates = Object.values(itemsData)
      .filter((item: any) => {
        if (!item || item.price < 2000 || !item.stats) return false;
        
        // 신발은 무조건 후보군에 포함 (별도 로직으로 처리되지만 여기서도 필터링되지 않게)
        if (item.tags && item.tags.includes('Boots')) return true;

        // 관련 스탯이 하나라도 있으면 포함 (범위 확장)
        // 딜러라도 방어템을 고려할 수 있게 Tank 스탯도 포함
        const hasRelevantStat = 
          (myChampion.damageType === 'AD' && (item.stats.ad || item.stats.lethality || item.stats.attackSpeed || item.stats.armor || item.stats.hp)) ||
          (myChampion.damageType === 'AP' && (item.stats.ap || item.stats.magicPenFlat || item.stats.abilityHaste || item.stats.mr || item.stats.hp)) ||
          (myChampion.class === 'Tank' && (item.stats.hp || item.stats.armor || item.stats.mr || item.stats.abilityHaste)) ||
          (myChampion.damageType === 'Hybrid');
          
        return hasRelevantStat;
      })
      .map((item: any) => item.id);

    // 신발 후보군 별도 추출 (모든 신발 포함)
    const bootsCandidates = Object.values(itemsData)
      .filter((item: any) => item.tags?.includes('Boots') && item.price > 300) // 300원(똥신) 이상
      .map((item: any) => item.id);

    // 중복 제거 후 반환
    return Array.from(new Set([...candidates, ...bootsCandidates]));
  }

  // 결과 집계 수정 (시뮬레이션 스탯 파라미터 추가)
  private aggregateResults(
    appliedRules: any[],
    simRules: ItemRecommendation[],
    myChampion: ChampionMeta,
    matchup: MatchupAnalysis | null,
    simulationStats?: any,
    bestIndividual?: any, // 유전 알고리즘 결과 (타입은 any로 받지만 실제로는 Individual)
    powerCurve?: any[]
  ): BuildRecommendation { // 리턴 타입 명시 (Promise 아님)
    const bySlot: Record<string, ItemRecommendation[]> = {
      starter: [], core: [], situational: [], boots: [],
    };

    // ... (기존 로직 동일)
    const allRecs = [...simRules, ...appliedRules.map(r => r.result)];
    
    allRecs.forEach(r => {
      if (bySlot[r.slot]) bySlot[r.slot].push(r);
    });

    const boots = bySlot.boots.sort((a, b) => b.score - a.score)[0] 
      || this.getDefaultBoots(myChampion);

    const coreCandidates = bySlot.core.sort((a, b) => b.score - a.score);
    const situationalCandidates = bySlot.situational.sort((a, b) => b.score - a.score);

    const fullBuild: ItemRecommendation[] = [];
    const mainCores = coreCandidates.slice(0, 5); 
    fullBuild.push(...mainCores);

    const alternativeItems = coreCandidates.slice(5, 9);

    const summary = this.generateSummary(appliedRules, matchup);
    const reasons = [
      ...(simulationStats ? [`최적화 시뮬레이션 완료: 예상 데미지 ${simulationStats.damage}`] : []),
      ...simRules.slice(0, 2).map(r => r.reason),
      ...appliedRules.slice(0, 2).map(r => r.reason)
    ];

    return { 
      starterItems: this.selectTop(bySlot.starter, 2), 
      coreItems: fullBuild, 
      situationalItems: alternativeItems, 
      boots, 
      summary, 
      reasons,
      // 유전 알고리즘 결과 매핑
      skillOrder: bestIndividual?.genes.skillOrder,
      summonerSpells: bestIndividual?.genes.summonerSpells,
      simulationStats: simulationStats,
      powerCurve: powerCurve
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
export async function recommendBuild(
  myChampion: ChampionMeta,
  myLane: Lane,
  allies: ChampionMeta[],
  enemies: ChampionMeta[],
  enemyLaner: ChampionMeta | null
): Promise<BuildRecommendation> {
  return getBuildRecommender().recommend(
    myChampion,
    myLane,
    allies,
    enemies,
    enemyLaner
  );
}
