import { CombatStats, DamageEvent, ItemScript, ItemState } from '../core/types';
import { DamageEngine } from '../core/damageEngine';

// 카타리나의 스킬 데이터 (API에서 받아와야 하지만 지금은 모의 데이터)
interface KatarinaSkillData {
  q: { base: number; apRatio: number; adRatio: number };
  e: { base: number; apRatio: number; adRatio: number; onHitEffectiveness: number };
  r: { basePerDagger: number; adRatio: number; apRatio: number; attackSpeedRatio: number; onHitEffectiveness: number; duration: number };
}

export class KatarinaModel {
  private stats: CombatStats;
  private items: ItemScript[];
  
  constructor(baseStats: CombatStats, items: ItemScript[]) {
    this.stats = { ...baseStats };
    this.items = items;
    
    // 아이템 스탯 적용
    this.items.forEach(item => {
      this.stats.ad += item.stats.ad || 0;
      this.stats.ap += item.stats.ap || 0;
      this.stats.attackSpeed += item.stats.attackSpeed || 0;
      // ... 기타 스탯
    });
  }

  // 콤보 시뮬레이션: E -> 평 -> Q -> 평 -> R (1.5초)
  simulateCombo(target: CombatStats, skillData: KatarinaSkillData): DamageEvent[] {
    const events: DamageEvent[] = [];
    let currentTime = 0;

    const dealDamage = (name: string, raw: number, type: 'Physical' | 'Magical' | 'True') => {
      const dmg = DamageEngine.calculateDamage(raw, type, this.stats, target);
      events.push({
        source: name,
        type,
        rawDamage: raw,
        mitigatedDamage: dmg,
        timestamp: currentTime,
        isCrit: false
      });
    };

    const defaultState: ItemState = {
      cooldownRemaining: 0,
      stacks: 0,
      charges: 0,
      lastTriggeredTime: 0,
      customData: {}
    };

    const applyOnHit = () => {
      this.items.forEach(item => {
        if (item.onHit) {
          const effect = item.onHit(target, this.stats, defaultState);
          if (effect) {
            dealDamage(item.name, effect.damage, effect.type);
          }
        }
      });
    };

    // 1. 순보 (E) - 온힛 적용
    currentTime += 0.1;
    const eDmg = skillData.e.base + (this.stats.ad * skillData.e.adRatio) + (this.stats.ap * skillData.e.apRatio);
    dealDamage('Shunpo (E)', eDmg, 'Magical');
    applyOnHit(); // E는 온힛 적용

    // 2. 평타 (Auto Attack)
    currentTime += 0.2;
    dealDamage('Auto Attack', this.stats.ad, 'Physical');
    applyOnHit();

    // 3. 단검 투척 (Q)
    currentTime += 0.3;
    const qDmg = skillData.q.base + (this.stats.ad * skillData.q.adRatio) + (this.stats.ap * skillData.q.apRatio);
    dealDamage('Bouncing Blade (Q)', qDmg, 'Magical');

    // 4. 죽음의 연꽃 (R) - 1.5초간 시전 (총 10~15회 타격 가정)
    // 공격 속도에 따라 단검 투척 수 증가 (기본 2.5초간 15회 -> 1.5초간 약 9~10회)
    const daggers = Math.floor(15 * (1.5 / 2.5)); 
    
    for (let i = 0; i < daggers; i++) {
      currentTime += (1.5 / daggers);
      const rDmgPhysical = (skillData.r.basePerDagger + (this.stats.ad * skillData.r.adRatio)) * (1 + this.stats.attackSpeed * skillData.r.attackSpeedRatio);
      const rDmgMagical = (skillData.r.basePerDagger + (this.stats.ap * skillData.r.apRatio));
      
      dealDamage('Death Lotus (R) - Phy', rDmgPhysical, 'Physical');
      dealDamage('Death Lotus (R) - Mag', rDmgMagical, 'Magical');
      
      // R은 온힛 효율 25~35% (레벨따라 다름, 여기선 30% 가정)
      this.items.forEach(item => {
        if (item.onHit) {
          const effect = item.onHit(target, this.stats, defaultState);
          if (effect) {
            dealDamage(`${item.name} (R)`, effect.damage * 0.3, effect.type);
          }
        }
      });
    }

    return events;
  }
}
