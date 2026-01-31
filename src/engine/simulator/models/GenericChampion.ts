/**
 * 범용 챔피언 모델
 * 
 * 특정 챔피언(KatarinaModel)이 아니라, 데이터(Schema)를 보고 
 * 그 챔피언처럼 행동하는 범용 클래스입니다.
 */

import { CombatStats, DamageEvent, ItemScript } from '../core/types';
import { DamageEngine } from '../core/damageEngine';
import { ChampionSchema, SpellSchema, DamageLogic } from '../data/schemas';

export class GenericChampionModel {
  private stats: CombatStats;
  private schema: ChampionSchema;
  private items: ItemScript[];
  private level: number;

  constructor(schema: ChampionSchema, items: ItemScript[], level: number = 18) {
    this.schema = schema;
    this.items = items;
    this.level = level;
    this.stats = this.calculateStats(schema.baseStats, items, level);
  }

  // 레벨과 아이템을 반영한 최종 스탯 계산
  private calculateStats(base: ChampionSchema['baseStats'], items: ItemScript[], level: number): CombatStats {
    // 성장 스탯 적용 공식: Base + Growth * (Level - 1) * (0.7025 + 0.0175 * (Level - 1))
    // 단순화를 위해 선형으로 가정하거나 정밀 공식을 적용
    const growthMod = level - 1; 

    let stats: CombatStats = {
      hp: base.hp + (base.hpPerLevel * growthMod),
      maxHp: base.hp + (base.hpPerLevel * growthMod),
      mana: base.mp + (base.mpPerLevel * growthMod),
      ad: base.ad + (base.adPerLevel * growthMod),
      ap: 0,
      armor: base.armor + (base.armorPerLevel * growthMod),
      mr: base.mr + (base.mrPerLevel * growthMod),
      attackSpeed: base.attackSpeed * (1 + (base.attackSpeedRatio * growthMod / 100)), // AS는 % 증가
      abilityHaste: 0,
      critChance: 0,
      critDamage: 1.75,
      lethality: 0,
      armorPen: 0,
      magicPenFlat: 0,
      magicPenPercent: 0,
      omnivamp: 0,
      lifesteal: 0,
      movementSpeed: 340 // 기본값
    };

    // 아이템 스탯 합산
    items.forEach(item => {
      if (item.stats.ad) stats.ad += item.stats.ad;
      if (item.stats.ap) stats.ap += item.stats.ap;
      if (item.stats.hp) {
        stats.hp += item.stats.hp;
        stats.maxHp += item.stats.hp;
      }
      // ... 기타 스탯 적용
    });

    return stats;
  }

  // 스킬 데미지 계산
  private calculateSpellDamage(logic: DamageLogic, target: CombatStats): number {
    // 1. 기본 데미지 (스킬 레벨은 챔피언 레벨에 따라 추정. 예: 9렙에 Q 5렙)
    // 단순화를 위해 만렙 기준 마지막 인덱스 사용
    const baseDmg = logic.base[logic.base.length - 1] || 0;

    // 2. 계수 데미지 (Ratio)
    let scalingDmg = 0;
    logic.ratios.forEach(r => {
      if (r.stat === 'ad') scalingDmg += this.stats.ad * r.ratio;
      if (r.stat === 'ap') scalingDmg += this.stats.ap * r.ratio;
      if (r.stat === 'hp') scalingDmg += this.stats.maxHp * r.ratio;
    });

    // 3. 체력 비례 데미지
    let hpDmg = 0;
    if (logic.targetHpBased) {
      const { type, percent } = logic.targetHpBased;
      if (type === 'current') hpDmg = target.hp * percent;
      if (type === 'max') hpDmg = target.maxHp * percent;
      if (type === 'missing') hpDmg = (target.maxHp - target.hp) * percent;
    }

    return baseDmg + scalingDmg + hpDmg;
  }

  // 스킬 사용 시뮬레이션
  public castSpell(spellKey: 'Q' | 'W' | 'E' | 'R', target: CombatStats, time: number): DamageEvent[] {
    const spell = this.schema.spells[spellKey];
    const events: DamageEvent[] = [];

    spell.effects.forEach(effect => {
      if (effect.type === 'damage') {
        const rawDmg = this.calculateSpellDamage(effect.logic, target);
        
        // 도트 데미지 처리
        const ticks = effect.ticks || 1;
        const dmgPerTick = rawDmg / ticks;

        for (let i = 0; i < ticks; i++) {
          const mitigated = DamageEngine.calculateDamage(
            dmgPerTick, 
            effect.logic.damageType, 
            this.stats, 
            target
          );

          events.push({
            source: `${spell.name} (${spellKey})`,
            type: effect.logic.damageType,
            rawDamage: dmgPerTick,
            mitigatedDamage: mitigated,
            timestamp: time + (i * 0.5), // 0.5초 간격 가정
            isCrit: false
          });

          // 온힛 적용 (효율 적용)
          if (effect.logic.onHitEffectiveness) {
            this.items.forEach(item => {
              if (item.onHit) {
                const onHitDmg = item.onHit(target, this.stats);
                events.push({
                  source: `${item.name} (On-hit)`,
                  type: onHitDmg.type,
                  rawDamage: onHitDmg.damage * effect.logic.onHitEffectiveness!,
                  mitigatedDamage: DamageEngine.calculateDamage(
                    onHitDmg.damage * effect.logic.onHitEffectiveness!,
                    onHitDmg.type,
                    this.stats,
                    target
                  ),
                  timestamp: time + (i * 0.5),
                  isCrit: false
                });
              }
            });
          }
        }
      }
    });

    return events;
  }
}
