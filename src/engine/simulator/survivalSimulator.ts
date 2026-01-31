/**
 * 생존 시뮬레이터
 * 
 * "내가 적에게 죽을 확률"을 계산합니다.
 * 적의 콤보 데미지를 내 방어 스탯으로 받아내고, 생존 여부를 판단합니다.
 */

import { CombatStats, ItemScript } from './core/types';
import { GenericChampionModel } from './models/GenericChampion';
import { ChampionSchema } from './data/schemas';
import { DamageEngine } from './core/damageEngine';

export class SurvivalSimulator {
  
  /**
   * 생존 가능성 평가
   * @returns 0(사망) ~ 1(안전) 사이의 점수
   */
  static evaluateSurvival(
    myStats: CombatStats,
    enemySchema: ChampionSchema,
    enemyStats: CombatStats,
    myItems: ItemScript[]
  ): number {
    // 적 모델 생성 (11레벨 기준)
    // 적 아이템은 enemyStats에 이미 반영되어 있다고 가정
    const enemyModel = new GenericChampionModel(enemySchema, [], 11);
    
    // 적의 풀 콤보 시뮬레이션 (Q-W-E-R)
    let totalIncomingDamage = 0;
    const spells = ['Q', 'W', 'E', 'R'] as const;
    
    spells.forEach(spellKey => {
      const events = enemyModel.castSpell(spellKey, myStats, 0);
      events.forEach(evt => {
        // 내 방어력/마저로 데미지 감소 계산
        const damage = DamageEngine.calculateDamage(
          evt.rawDamage, 
          evt.type, 
          enemyStats, 
          myStats // 방어자(나)의 스탯 사용
        );
        totalIncomingDamage += damage;
      });
    });

    // 아이템 특수 방어 효과 적용 (쉴드, 피해 감소)
    let effectiveHp = myStats.hp;
    
    myItems.forEach(item => {
      // 맬모셔스/스테락: 생명선 효과 (최대 체력의 25% 쉴드 가정)
      if (item.name.includes('맬모셔스') || item.name.includes('스테락') || item.name.includes('철갑궁')) {
        effectiveHp += myStats.maxHp * 0.25;
      }
      // 존야: 2.5초 무적 (여기서는 데미지 50% 무효화로 단순화하여 평가)
      if (item.name.includes('존야')) {
        totalIncomingDamage *= 0.5; 
      }
    });

    // 생존 점수 계산
    if (totalIncomingDamage >= effectiveHp) return 0; // 사망
    
    // 남은 체력 비율을 점수로 반환
    return (effectiveHp - totalIncomingDamage) / effectiveHp;
  }
}
