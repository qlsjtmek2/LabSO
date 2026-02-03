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
  private stacks: number;
  private form: number = 0; // 0: Base, 1: Alt

  constructor(schema: ChampionSchema, items: ItemScript[], level: number = 18, stacks: number = 0) {
    this.schema = schema;
    this.items = items;
    this.level = level;
    this.stacks = stacks;
    this.stats = this.calculateStats(schema.baseStats, items, level);
  }

  public toggleForm() {
    this.form = (this.form + 1) % 2;
  }

  // 레벨과 아이템을 반영한 최종 스탯 계산
  private calculateStats(base: ChampionSchema['baseStats'], items: ItemScript[], level: number): CombatStats {
    // 성장 스탯 적용 공식
    const growthMod = level - 1; 

    // 초기 보너스 스탯 누적 객체
    let bonusStats = {
      hp: 0, mp: 0, ad: 0, ap: 0, armor: 0, mr: 0,
      attackSpeed: (base.attackSpeedRatio * growthMod / 100), // 성장 공속 (%)
      abilityHaste: 0,
      range: 0, // 사거리 추가
      critChance: 0,
      critDamage: 0,
      lethality: 0,
      armorPen: 0,
      magicPenFlat: 0,
      magicPenPercent: 0,
      omnivamp: 0,
      lifesteal: 0,
      moveSpeed: 0
    };

    // 스택 보정 (패시브)
    if (this.schema.id === 'Veigar') {
      bonusStats.ap += this.stacks;
    } else if (this.schema.id === 'Senna') {
      bonusStats.ad += this.stacks * 0.75;
      bonusStats.range += Math.floor(this.stacks / 20) * 20;
      bonusStats.critChance += Math.floor(this.stacks / 20) * 0.10;
    } else if (this.schema.id === 'Kindred') {
      if (this.stacks >= 4) {
        bonusStats.range += 75 + Math.floor((this.stacks - 4) / 3) * 25;
      }
    }

    // 아이템 스탯 합산
    items.forEach(item => {
      const s = item.stats;
      if (s.hp) bonusStats.hp += s.hp;
      if (s.mana) bonusStats.mp += s.mana;
      if (s.ad) bonusStats.ad += s.ad;
      if (s.ap) bonusStats.ap += s.ap;
      if (s.armor) bonusStats.armor += s.armor;
      if (s.mr) bonusStats.mr += s.mr;
      if (s.attackSpeed) bonusStats.attackSpeed += s.attackSpeed;
      if (s.abilityHaste) bonusStats.abilityHaste += s.abilityHaste;
      if (s.critChance) bonusStats.critChance += s.critChance;
      if (s.lethality) bonusStats.lethality += s.lethality;
      // ... 기타 스탯
    });

    // 최종 스탯 계산
    // 공속: Base + (Ratio * Bonus%)
    const finalAs = base.attackSpeed + (base.attackSpeedRatio * bonusStats.attackSpeed);

    let stats: CombatStats = {
      level: level,
      hp: base.hp + (base.hpPerLevel * growthMod) + bonusStats.hp,
      maxHp: base.hp + (base.hpPerLevel * growthMod) + bonusStats.hp,
      mana: base.mp + (base.mpPerLevel * growthMod) + bonusStats.mp,
      ad: base.ad + (base.adPerLevel * growthMod) + bonusStats.ad,
      ap: bonusStats.ap,
      armor: base.armor + (base.armorPerLevel * growthMod) + bonusStats.armor,
      mr: base.mr + (base.mrPerLevel * growthMod) + bonusStats.mr,
      attackSpeed: Math.min(2.5, finalAs), // Cap 2.5
      range: base.range + bonusStats.range, // 사거리 추가
      abilityHaste: bonusStats.abilityHaste,
      critChance: Math.min(1.0, bonusStats.critChance), // Cap 100%
      critDamage: 1.75 + bonusStats.critDamage, // 기본 175% + 아이템(인피)
      lethality: bonusStats.lethality,
      armorPen: bonusStats.armorPen,
      magicPenFlat: bonusStats.magicPenFlat,
      magicPenPercent: bonusStats.magicPenPercent,
      omnivamp: bonusStats.omnivamp,
      lifesteal: bonusStats.lifesteal,
      movementSpeed: (base.moveSpeed || 330) + bonusStats.moveSpeed
    };

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
    let actualKey = spellKey;
    
    // 폼 변환 체크
    if (this.form === 1 && ['Q', 'W', 'E'].includes(spellKey)) {
        const altKey = `${spellKey}_Form2`;
        if ((this.schema.spells as any)[altKey]) {
            actualKey = altKey as any;
        }
    }

    const spell = (this.schema.spells as any)[actualKey];
    if (!spell) return []; // 스킬 데이터 없음

    // 리소스 소모 (체력/마나 등)
    const lvIdx = Math.min(skillLevel - 1, spell.cost.length - 1);
    const flatCost = spell.cost[lvIdx] || 0;
    const ratio = spell.costRatio ? (spell.costRatio[lvIdx] || 0) : 0;

    if (spell.costType === 'CurrentHealth') {
        this.stats.hp -= this.stats.hp * (ratio || 0.2); // 0.2 fallback for Vlad W
    } else if (spell.costType === 'MaxHealth') {
        this.stats.hp -= this.stats.maxHp * ratio;
    } else if (spell.costType === 'Health') {
        this.stats.hp -= flatCost;
    } else if (spell.costType === 'Mana' || spell.costType === 'Energy') {
        this.stats.mana -= flatCost;
    }

    const events: DamageEvent[] = [];

    spell.effects.forEach((effect: any) => {
      if (effect.type === 'damage' && effect.logic) {
        let rawDmg = this.calculateSpellDamage(effect.logic, target, skillLevel);
        
        // 나서스 Q 스택 데미지 추가
        if (this.schema.id === 'Nasus' && spellKey === 'Q') {
            rawDmg += this.stacks;
        }

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
            source: `${spell.name} (${actualKey})`,
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
                if (onHitDmg) {
                  events.push({
                    source: `${item.name} (On-hit)`,
                    type: onHitDmg.type,
                    rawDamage: onHitDmg.damage * effect.logic!.onHitEffectiveness!,
                    mitigatedDamage: DamageEngine.calculateDamage(
                      onHitDmg.damage * effect.logic!.onHitEffectiveness!,
                      onHitDmg.type,
                      this.stats,
                      target
                    ),
                    timestamp: time + (i * 0.5),
                    isCrit: false
                  });
                }
              }
            });
          }
        }
      }
    });

    return events;
  }

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
        if (onHitDmg) {
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
        
        // 변신 챔피언 R 사용 시 폼 전환
        if (action === 'R' && ['Nidalee', 'Jayce', 'Elise'].includes(this.schema.id)) {
            this.toggleForm();
            // R 자체 데미지/효과가 있다면 castSpell 호출 (니달리/엘리스는 0뎀, 제이스는 변신 효과)
            // 일단 호출해서 이벤트 발생시킴
        }

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
