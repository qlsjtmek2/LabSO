/**
 * V2 적합도 계산기 (Fitness Calculator V2)
 * 
 * 구형 계산기 대신, V2 시뮬레이션 엔진을 사용하여 
 * 실제 전투(이벤트 기반) 결과를 바탕으로 적합도를 평가합니다.
 * 
 * Phase 3 Improvements:
 * - 지능형 적군 빌드 선택 (역할군 기반)
 * - 클래스/룬 시너지 점수 추가
 */

import { GeneLoadout, Individual } from '../genetic/types';
import { ChampionSchema } from '../data/schemas';
import { CombatStats } from '../core/types';
import { TimelineSimulator } from './timeline/TimelineSimulator';
import itemsData from '../../../data/json/items.json';

// 아이템 데이터 캐싱
const ITEM_MAP: Record<number, any> = {};
Object.values(itemsData).forEach((item: any) => ITEM_MAP[item.id] = item);

// 역할군별 핵심 스탯 가중치 (시너지 계산용)
const ROLE_WEIGHTS: Record<string, Partial<Record<string, number>>> = {
  'Mage': { ap: 2, magicPen: 3, abilityHaste: 1.5, mana: 0.5 },
  'Assassin': { lethality: 3, ad: 2, abilityHaste: 1.5, armorPen: 2 },
  'Marksman': { ad: 2, attackSpeed: 2, critChance: 2, armorPen: 1.5 },
  'Tank': { hp: 1, armor: 1.5, mr: 1.5, abilityHaste: 1 },
  'Fighter': { ad: 1.5, hp: 1, abilityHaste: 1.5, omnivamp: 2 },
  'Support': { abilityHaste: 2, hp: 1, manaRegen: 2, healShieldPower: 3 }
};

// 적군 자동 무장 (ID 반환 버전)
function getEnemyBuildIds(schema: ChampionSchema): number[] {
  // 역할군 기반 빌드 프리셋
  const presets: Record<string, number[]> = {
    'Tank': [3068, 3075, 6665, 3110, 3065, 3047], // 썬파, 쏜메 등
    'Mage': [6653, 3089, 3135, 3157, 4645, 3020], // 리안드리, 데캡 등
    'Assassin': [3142, 6676, 6692, 3814, 3026, 3158], // 요우무, 징수 등
    'Marksman': [6673, 3031, 3036, 3046, 3026, 3006], // 철갑궁, 인피 등
    'Fighter': [3078, 3053, 6333, 3153, 3026, 3111], // 삼위, 스테락 등
    'Support': [3190, 3050, 3107, 3222, 3110, 3158], // 솔라리, 구원 등
  };

  // 1. 스키마에 명시된 역할군 확인
  if (schema.roles && schema.roles.length > 0) {
    const primaryRole = schema.roles[0];
    if (presets[primaryRole]) return presets[primaryRole];
  }

  // 2. 스탯 기반 추론 (Fallback)
  let role = 'Fighter';
  if (schema.baseStats.armor > 35) role = 'Tank';
  if (schema.baseStats.mr > 32 && schema.baseStats.range > 400) role = 'Mage';
  if (schema.baseStats.attackSpeed > 0.65) role = 'Marksman';

  return presets[role] || presets['Fighter'];
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
    const targetSchema = enemySchema || champSchema;
    
    const simulator = new TimelineSimulator(
      champSchema,
      targetSchema,
      [loadout.starterItem, ...loadout.items], // 시작템 포함
      enemyBuild 
    );

    const timelineScore = simulator.run(); // 데미지 + 생존 점수

    // 3. 시너지 점수 계산 (Intelligence)
    const synergyScore = this.calculateSynergy(loadout, champSchema);

    // 4. 종합 점수 (시뮬레이션 70% + 시너지 30% 비중 조절 가능, 일단 합산)
    // timelineScore가 보통 수천~수만 단위일 수 있음. synergyScore도 스케일 맞춰야 함.
    // 현재 timelineScore는 데미지 총량 기반이라 매우 클 수 있음.
    // 시너지 점수는 '보너스' 개념으로 추가.
    
    const totalFitness = timelineScore * (1 + synergyScore / 1000); 

    return {
      genes: loadout,
      fitness: totalFitness,
      stats: {
        damage: Math.round(timelineScore / 3), // 대략적 수치
        survivability: Math.round(timelineScore / 5),
        utility: 1,
        synergy: synergyScore
      }
    };
  }

  // 시너지 점수 계산기
  private static calculateSynergy(loadout: GeneLoadout, schema: ChampionSchema): number {
    let score = 0;
    const myItems = loadout.items.map(id => ITEM_MAP[id]).filter(i => !!i);
    const roles = schema.roles || ['Fighter'];
    const primaryRole = roles[0];
    const weights = ROLE_WEIGHTS[primaryRole] || ROLE_WEIGHTS['Fighter'];

    // 1. 역할군 - 아이템 스탯 매칭
    myItems.forEach(item => {
      if (!item.stats) return;
      
      // 스탯별 가중치 적용
      if (weights.ad && item.stats.ad) score += item.stats.ad * weights.ad;
      if (weights.ap && item.stats.ap) score += item.stats.ap * weights.ap;
      if (weights.attackSpeed && item.stats.attackSpeed) score += item.stats.attackSpeed * 100 * weights.attackSpeed;
      if (weights.hp && item.stats.hp) score += item.stats.hp * 0.1 * weights.hp;
      if (weights.armor && item.stats.armor) score += item.stats.armor * weights.armor;
      if (weights.mr && item.stats.mr) score += item.stats.mr * weights.mr;
      if (weights.abilityHaste && item.stats.abilityHaste) score += item.stats.abilityHaste * weights.abilityHaste;
      
      // 관통력 보너스
      if (weights.magicPen && (item.stats.magicPenFlat || item.stats.magicPenPercent)) score += 50;
      if (weights.armorPen && (item.stats.armorPen || item.stats.lethality)) score += 50;
      if (weights.critChance && item.stats.critChance) score += 40;
    });

    // 2. 룬 - 아이템 시너지
    const keystone = loadout.primaryRunes[0];
    // 정복자(Conqueror) + 지속 싸움/브루저
    if (keystone === 'Conqueror') { 
      if (roles.includes('Fighter') || roles.includes('Bruiser')) score += 100;
      if (myItems.some(i => i.stats.hp && i.stats.ad)) score += 50; // 브루저 아이템
    }
    // 치명적 속도(Lethal Tempo) + 공속
    if (keystone === 'LethalTempo') {
      const asItems = myItems.filter(i => i.stats.attackSpeed).length;
      score += asItems * 30;
    }
    // 감전(Electrocute) + 암살자/메이지
    if (keystone === 'Electrocute') {
      if (roles.includes('Assassin') || roles.includes('Mage')) score += 100;
      if (myItems.some(i => i.stats.lethality || i.stats.magicPenFlat)) score += 50;
    }

    // 3. 비효율 제거 (페널티)
    // 노코스트 챔피언이 마나 아이템 구매 시
    const isManaless = schema.baseStats.mp === 0;
    if (isManaless) {
      const manaItems = myItems.filter(i => i.stats.mana > 0).length;
      score -= manaItems * 200; 
    }

    // Mage가 AD 아이템 구매 시 (하이브리드 제외)
    if (primaryRole === 'Mage' && !roles.includes('Marksman') && !roles.includes('Fighter')) {
       const adItems = myItems.filter(i => i.stats.ad > 0).length;
       score -= adItems * 300; // 강력한 페널티
    }

    // Marksman/Assassin이 AP 아이템 구매 시 (하이브리드 제외)
    // 단, 카이사(Marksman+Mage), 아칼리(Assassin+Mage) 등은 제외
    if ((primaryRole === 'Marksman' || primaryRole === 'Assassin') && !roles.includes('Mage')) {
       const apItems = myItems.filter(i => i.stats.ap > 0).length;
       score -= apItems * 300;
    }

    return Math.round(score);
  }
}
