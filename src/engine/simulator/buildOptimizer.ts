/**
 * 시뮬레이션 기반 빌드 최적화 도구
 * 
 * 모든 후보 아이템을 실제로 가상 전투에 투입해보고
 * 가장 높은 효율(데미지/탱킹)을 내는 아이템을 찾아냅니다.
 */

import { CombatStats, ItemScript } from './core/types';
import { GenericChampionModel } from './models/GenericChampion';
import { ChampionSchema } from './data/schemas';
import type { ItemRecommendation } from '@/types';

import itemsData from '../../data/json/items.json';

// 아이템 데이터 파싱 및 로드
const ITEM_POOL: Record<number, ItemScript> = {};

// JSON 데이터를 실행 가능한 스크립트로 변환
Object.values(itemsData).forEach((rawItem: any) => {
  const script: ItemScript = {
    id: rawItem.id,
    name: rawItem.name,
    stats: rawItem.stats,
  };

  // 태그 정보 저장 (신발 구분용)
  (script as any).tags = rawItem.tags || [];

  // 효과(Effect) 파싱
  if (rawItem.effects) {
    rawItem.effects.forEach((effect: any) => {
      if (effect.type === 'onHit') {
        script.onHit = (target: CombatStats, source: CombatStats) => {
          let damage = 0;
          
          if (effect.base) damage += effect.base;
          
          if (effect.ratio) {
            const statValue = source[effect.ratio.stat as keyof CombatStats] || 0;
            damage += statValue * effect.ratio.value;
          }
          
          if (effect.targetHpBased) {
            const { type, percent } = effect.targetHpBased;
            if (type === 'current') damage += target.hp * percent;
            if (type === 'max') damage += target.maxHp * percent;
            if (type === 'missing') damage += (target.maxHp - target.hp) * percent;
          }

          return {
            type: effect.damageType,
            damage
          };
        };
      }
    });
  }

  ITEM_POOL[rawItem.id] = script;
});

export interface SimulationResultItem extends ItemRecommendation {
  totalDamage: number;
}

export class BuildOptimizer {
  
  // 가장 효율적인 아이템 찾기
  static async findBestItems(
    champSchema: ChampionSchema,
    enemyStats: CombatStats,
    candidates: number[]
  ): Promise<SimulationResultItem[]> {
    
    const results: { itemId: number, totalDamage: number, reason: string, isBoots: boolean }[] = [];

    for (const itemId of candidates) {
      const itemData = ITEM_POOL[itemId];
      if (!itemData) continue;

      const isBoots = (itemData as any).tags?.includes('Boots');

      const itemScript: ItemScript = {
        id: itemId,
        name: itemData.name,
        stats: itemData.stats,
        onHit: itemData.onHit
      };

      const model = new GenericChampionModel(champSchema, [itemScript], 11);
      
      let totalDmg = 0;
      const qEvents = model.castSpell('Q', enemyStats, 0);
      const eEvents = model.castSpell('E', enemyStats, 0.5);
      const rEvents = model.castSpell('R', enemyStats, 1.0);

      const allEvents = [...qEvents, ...eEvents, ...rEvents];
      totalDmg = allEvents.reduce((sum, e) => sum + e.mitigatedDamage, 0);

      results.push({
        itemId,
        totalDamage: totalDmg,
        reason: `시뮬레이션 결과: 콤보 데미지 ${Math.round(totalDmg)} 달성`,
        isBoots
      });
    }

    return results
      .sort((a, b) => b.totalDamage - a.totalDamage)
      .map(r => ({
        itemId: r.itemId,
        // 신발 태그가 있으면 slot을 'boots'로 강제 지정
        slot: r.isBoots ? 'boots' : 'core',
        reason: r.reason,
        score: 0.9,
        ruleId: 'simulation-optimized',
        totalDamage: r.totalDamage
      }));
  }
}
