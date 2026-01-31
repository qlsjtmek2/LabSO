/**
 * 데미지 계산 엔진
 * 
 * 리그 오브 레전드의 불변의 데미지 공식을 구현합니다.
 */

import { CombatStats, DamageEvent } from './types';

export class DamageEngine {
  
  // 데미지 계산 (방어력/관통력 적용)
  static calculateDamage(
    rawDamage: number,
    damageType: 'Physical' | 'Magical' | 'True',
    attacker: CombatStats,
    defender: CombatStats
  ): number {
    if (damageType === 'True') return rawDamage;

    if (damageType === 'Physical') {
      const effectiveArmor = this.calculateEffectiveDefense(
        defender.armor,
        attacker.armorPen, // % 관통
        attacker.lethality // 고정 관통 (레벨 비례 로직은 단순화를 위해 생략하거나 여기서 처리)
      );
      return rawDamage * this.getDamageMultiplier(effectiveArmor);
    }

    if (damageType === 'Magical') {
      const effectiveMR = this.calculateEffectiveDefense(
        defender.mr,
        attacker.magicPenPercent,
        attacker.magicPenFlat
      );
      return rawDamage * this.getDamageMultiplier(effectiveMR);
    }

    return 0;
  }

  // 실질 방어력 계산 (방어력 * (1 - %관통) - 고정관통)
  private static calculateEffectiveDefense(
    defense: number,
    percentPen: number, // 0.3 = 30%
    flatPen: number
  ): number {
    let effective = defense * (1 - percentPen);
    effective = effective - flatPen;
    return Math.max(0, effective);
  }

  // 데미지 감소율 (100 / (100 + 방어력))
  private static getDamageMultiplier(defense: number): number {
    if (defense >= 0) {
      return 100 / (100 + defense);
    } else {
      // 음수 방어력 공식: 2 - (100 / (100 - defense))
      return 2 - (100 / (100 - defense));
    }
  }
}
