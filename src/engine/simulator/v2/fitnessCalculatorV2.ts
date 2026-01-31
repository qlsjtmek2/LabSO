/**
 * V2 적합도 계산기 (Fitness Calculator V2)
 * 
 * 구형 계산기 대신, V2 시뮬레이션 엔진을 사용하여 
 * 실제 전투(이벤트 기반) 결과를 바탕으로 적합도를 평가합니다.
 */

import { GeneLoadout, Individual } from '../genetic/types';
import { ChampionSchema } from '../data/schemas';
import { CombatStats } from '../core/types';
import { SimulationEngine } from './core/engine';
import { ChampionModelV2 } from './models/ChampionModelV2';
import { ItemScriptFactory } from './items/itemFactory';
import { TimelineSimulator } from './timeline/TimelineSimulator'; // 타임라인 시뮬레이터
import itemsData from '../../../data/json/items.json';

// 아이템 데이터 캐싱 (V2 아이템 팩토리용)
const ITEM_MAP: Record<number, any> = {};
Object.values(itemsData).forEach((item: any) => ITEM_MAP[item.id] = item);

// 적군 자동 무장 (ID 반환 버전)
function getEnemyBuildIds(schema: ChampionSchema): number[] {
  const builds: Record<string, number[]> = {
    'Tank': [3068, 3075, 6665, 3110, 3065, 3047],
    'Mage': [6653, 3089, 3135, 3157, 4645, 3020],
    'Assassin': [3142, 6676, 6692, 3814, 3026, 3158],
    'Marksman': [6673, 3031, 3036, 3046, 3026, 3006],
    'Bruiser': [3078, 3053, 6333, 3153, 3026, 3111],
    'Support': [3190, 3050, 3107, 3222, 3110, 3158],
  };

  let role = 'Bruiser';
  if (schema.baseStats.armor > 35) role = 'Tank';
  if (schema.baseStats.mr > 32 && schema.baseStats.range > 400) role = 'Mage';
  if (schema.baseStats.attackSpeed > 0.65) role = 'Marksman';

  return builds[role] || builds['Bruiser'];
}

export class FitnessCalculatorV2 {
  
  static async evaluate(
    loadout: GeneLoadout,
    champSchema: ChampionSchema,
    enemyStats: CombatStats,
    enemySchema?: ChampionSchema
  ): Promise<Individual> {
    
    // 1. 적 빌드 설정
    let enemyBuild: number[] = [];
    if (enemySchema) {
      enemyBuild = getEnemyBuildIds(enemySchema);
    } else {
      // 샌드백용 기본 빌드 (체력/방어)
      enemyBuild = [3068, 3075, 3110, 3065, 3047]; 
    }

    // 2. 타임라인 시뮬레이션 실행 (5분~25분 성장 대결)
    // 적 스키마가 없으면 샌드백 모드 (champSchema 복사)
    const targetSchema = enemySchema || champSchema;
    
    const simulator = new TimelineSimulator(
      champSchema,
      targetSchema,
      [loadout.starterItem, ...loadout.items], // 시작템 포함
      enemyBuild // 적은 시작템 생략 (단순화)
    );

    const timelineScore = simulator.run();

    // 3. 점수 계산 (타임라인 점수 그대로 사용)
    // 기존의 단순 전투 점수보다 훨씬 정교함 (초반/중반/후반 모두 고려)
    
    // 시너지 점수 보정
    let synergyScore = 0;
    const myItems = loadout.items.map(id => ITEM_MAP[id]).filter(i => !!i);
    const tags = new Set<string>();
    myItems.forEach(item => {
      if (item.tags) item.tags.forEach((t: string) => tags.add(t));
    });
    if (tags.has('CriticalStrike')) synergyScore += 100;
    if (tags.has('Lethality')) synergyScore += 100;

    const totalFitness = timelineScore + synergyScore;

    // 통계용 데이터 (마지막 25분 시점 데이터가 있으면 좋겠지만, 일단 점수 기반 추정치)
    // 정확한 표기를 위해 마지막 전투 상태를 가져오면 좋음. (TimelineSimulator 리팩토링 필요)
    // 여기서는 Fitness를 그대로 생존력/데미지로 매핑
    
    return {
      genes: loadout,
      fitness: totalFitness,
      stats: {
        damage: Math.round(totalFitness / 3), // 대략적 수치
        survivability: Math.round(totalFitness / 5),
        utility: 1,
        synergy: synergyScore
      }
    };
  }
}