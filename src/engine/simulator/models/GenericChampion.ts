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

  // 스탯 값 추출 헬퍼
  private getStatValue(statType: string, target?: CombatStats): number {
    const s = this.stats;
    const base = this.schema.baseStats;
    // 성장 스탯 계산 (현재 레벨 기준)
    const growth = this.level - 1;
    const baseAdAtLevel = base.ad + (base.adPerLevel * growth);
    
    switch (statType) {
      case 'ad': return s.ad;
      case 'bonusAd': return s.ad - baseAdAtLevel; // 총 AD - 기본 AD
      case 'ap': return s.ap;
      case 'hp': return s.hp;
      case 'bonusHp': return s.hp - (base.hp + (base.hpPerLevel * growth));
      case 'armor': return s.armor;
      case 'bonusArmor': return s.armor - (base.armor + (base.armorPerLevel * growth));
      case 'mr': return s.mr;
      case 'bonusMr': return s.mr - (base.mr + (base.mrPerLevel * growth));
      case 'attackSpeed': return s.attackSpeed;
      case 'critChance': return s.critChance;
      case 'level': return this.level;
      
      // Target Stats
      case 'missingHp': return target ? target.maxHp - target.hp : 0;
      case 'currentHp': return target ? target.hp : 0;
      case 'maxHp': return target ? target.maxHp : 0;
      
      default: return 0;
    }
  }

  // 스킬 데미지 계산 (V2)
  private calculateSpellDamage(logic: DamageLogic, target: CombatStats, skillLevel: number = 5): number {
    // 1. 기본 데미지 (스킬 레벨 기반, 인덱스는 0부터 시작하므로 -1)
    const baseDmg = logic.base[Math.min(skillLevel - 1, logic.base.length - 1)] || 0;

    // 2. 계수(Scaling) 데미지
    let scalingDmg = 0;
    if (logic.scalings) {
      logic.scalings.forEach(scale => {
        const statValue = this.getStatValue(scale.stat, target);
        
        // 계수가 배열일 경우 스킬 레벨에 따라 달라짐
        const ratio = Array.isArray(scale.ratio) 
          ? scale.ratio[Math.min(skillLevel - 1, scale.ratio.length - 1)] 
          : scale.ratio;
          
        scalingDmg += statValue * ratio;
      });
    }

    let totalDamage = baseDmg + scalingDmg;

    // 3. 조건부 증폭 (Modifiers)
    if (logic.modifiers) {
      logic.modifiers.forEach(mod => {
        // 조건 확인 로직 (현재는 단순화하여 무조건 true로 가정하거나 추후 구현)
        // 실제로는 mod.condition을 파싱해야 함.
        // 여기서는 예시로 '항상 적용'으로 가정
        if (mod.multiplier) totalDamage *= mod.multiplier;
        if (mod.flat) totalDamage += mod.flat;
      });
    }

    return totalDamage;
  }

  // 스킬 사용 시뮬레이션
  public castSpell(spellKey: 'Q' | 'W' | 'E' | 'R', target: CombatStats, time: number, skillLevel: number = 5): DamageEvent[] {
    const spell = this.schema.spells[spellKey];
    const events: DamageEvent[] = [];

    spell.effects.forEach(effect => {
      if (effect.type === 'damage' && effect.logic) {
        const rawDmg = this.calculateSpellDamage(effect.logic, target, skillLevel);
        
        // 도트 데미지 처리
        const ticks = effect.logic.ticks || 1;
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
  // 평타 수행
  public performAutoAttack(target: CombatStats, time: number): DamageEvent[] {
    const events: DamageEvent[] = [];
    
    // 1. 기본 물리 데미지 (치명타 미적용 단순화)
    // TODO: 치명타 확률(critChance) 반영
    const isCrit = Math.random() < (this.stats.critChance || 0);
    const damageMultiplier = isCrit ? (this.stats.critDamage || 1.75) : 1.0;
    const rawDmg = this.stats.ad * damageMultiplier;

    const mitigated = DamageEngine.calculateDamage(
      rawDmg,
      'Physical',
      this.stats,
      target
    );

    events.push({
      source: 'Auto Attack',
      type: 'Physical',
      rawDamage: rawDmg,
      mitigatedDamage: mitigated,
      timestamp: time,
      isCrit: isCrit
    });

    // 2. 온힛 아이템 효과
    this.items.forEach(item => {
      if (item.onHit) {
        const onHitDmg = item.onHit(target, this.stats);
        events.push({
          source: `${item.name} (On-hit)`,
          type: onHitDmg.type,
          rawDamage: onHitDmg.damage,
          mitigatedDamage: DamageEngine.calculateDamage(
            onHitDmg.damage,
            onHitDmg.type,
            this.stats,
            target
          ),
          timestamp: time,
          isCrit: false
        });
      }
    });

    return events;
  }

  // 콤보 시뮬레이션
  public simulateCombo(
    combo: string[], // ['Q', 'AA', 'E', 'R']
    target: CombatStats,
    skillLevels: { [key: string]: number } = { Q: 5, W: 5, E: 5, R: 3 }
  ): DamageEvent[] {
    let currentTime = 0;
    const allEvents: DamageEvent[] = [];

    combo.forEach(action => {
      // 쿨타임/시전시간 등은 일단 무시하고 0.5초 간격으로 가정
      currentTime += 0.5;

      if (action === 'AA') {
        const events = this.performAutoAttack(target, currentTime);
        allEvents.push(...events);
      } else if (['Q', 'W', 'E', 'R'].includes(action)) {
        const events = this.castSpell(
          action as 'Q' | 'W' | 'E' | 'R', 
          target, 
          currentTime, 
          skillLevels[action] || 1
        );
        allEvents.push(...events);
      }
    });

    return allEvents;
  }
}
