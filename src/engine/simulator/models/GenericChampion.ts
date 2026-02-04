/**
 * 범용 챔피언 모델
 * 
 * 특정 챔피언(KatarinaModel)이 아니라, 데이터(Schema)를 보고 
 * 그 챔피언처럼 행동하는 범용 클래스입니다.
 */

import { CombatStats, DamageEvent, ItemScript, ItemInstance, ItemState } from '../core/types';
import { DamageEngine } from '../core/damageEngine';
import { ChampionSchema, SpellSchema, DamageLogic } from '../data/schemas';

export class GenericChampionModel {
  private stats: CombatStats;
  private schema: ChampionSchema;
  private items: ItemInstance[];
  private level: number;
  private stacks: number;
  private form: number = 0; // 0: Base, 1: Alt
  private activeBuffs: Map<string, any> = new Map();

  constructor(schema: ChampionSchema, itemScripts: ItemScript[], level: number = 18, stacks: number = 0) {
    this.schema = schema;
    this.level = level;
    this.stacks = stacks;
    
    // 아이템 인스턴스 초기화
    this.items = itemScripts.map(script => ({
      script,
      state: {
        cooldownRemaining: 0,
        stacks: 0,
        charges: 0,
        lastTriggeredTime: 0,
        customData: {}
      }
    }));

    this.stats = this.calculateStats(schema.baseStats, this.items, level);
  }

  public toggleForm() {
    this.form = (this.form + 1) % 2;
  }

  // 레벨과 아이템을 반영한 최종 스탯 계산
  private calculateStats(base: ChampionSchema['baseStats'], items: ItemInstance[], level: number): CombatStats {
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
      moveSpeed: 0,
      tenacity: 0,
      slowResist: 0
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
      const s = item.script.stats;
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
      if (s.tenacity) bonusStats.tenacity += s.tenacity;
      if (s.slowResist) bonusStats.slowResist += s.slowResist;
      // ... 기타 스탯

      // 아이템 패시브 스탯 보정 (예: 대천사)
      if (item.script.passive) {
          // 여기서 호출하면 아직 기본 스탯만 있는 상태라 정확하지 않을 수 있음
          // 일단 단순 합산 로직만 처리하고 복잡한 건 finalize에서?
          // 하지만 passive signature가 (stats, state) -> void 이므로 여기서 stats 객체를 직접 수정하게 할 수도 있음.
          // 편의상 여기서 호출하지 않고 finalizeStats만 사용하거나, 
          // 아래의 최종 스탯 계산 후 한 번 더 돌리는게 맞음.
      }
    });

    // 최종 스탯 계산
    const finalAs = base.attackSpeed + (base.attackSpeedRatio * bonusStats.attackSpeed);

    const baseAdAtLevel = base.ad + (base.adPerLevel * growthMod);

    let stats: CombatStats = {
      level: level,
      hp: base.hp + (base.hpPerLevel * growthMod) + bonusStats.hp,
      maxHp: base.hp + (base.hpPerLevel * growthMod) + bonusStats.hp,
      mana: base.mp + (base.mpPerLevel * growthMod) + bonusStats.mp,
      ad: baseAdAtLevel + bonusStats.ad,
      baseAd: baseAdAtLevel,
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
      movementSpeed: (base.moveSpeed || 330) + bonusStats.moveSpeed,
      tenacity: bonusStats.tenacity,
      slowResist: bonusStats.slowResist
    };

    // 아이템 최종 스탯 보정 (라바돈 등)
    items.forEach(item => {
        if (item.script.finalizeStats) {
            item.script.finalizeStats(stats, item.state);
        }
    });

    return stats;
  }

  // 버프 효과 적용
  private applyBuff(effect: any, skillLevel: number) {
    if (!effect.stack) return;
    const name = effect.stack.name;
    const lvIdx = Math.min(skillLevel - 1, effect.logic?.base?.length - 1 || 0);
    const value = effect.logic?.base?.[lvIdx] || 0;
    
    this.activeBuffs.set(name, { value, duration: effect.duration || 10 });
    
    // 즉각적인 스탯 반영이 필요한 경우
    if (name === 'ad_amp') {
        this.stats.ad *= (1 + value);
    } else if (name === 'omnivamp') {
        this.stats.omnivamp += value;
    }
  }

  // 스탯 값 추출 헬퍼 (최신화)
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
        let conditionMet = false;
        
        if (mod.condition.type === 'cc') {
            const targetStats = mod.condition.target === 'enemy' ? target : this.stats;
            if (targetStats.ccStatus) {
                // 특정 CC가 필요한 경우 (예: charmed)
                if (mod.condition.buffName) {
                    conditionMet = !!(targetStats.ccStatus as any)[mod.condition.buffName];
                } else {
                    // 아무 CC나 걸려있으면 인정
                    conditionMet = Object.values(targetStats.ccStatus).some(v => v === true);
                }
            }
        } else if (mod.condition.type === 'stat') {
            const targetStats = mod.condition.target === 'enemy' ? target : this.stats;
            const statValue = this.getStatValue(mod.condition.stat!, targetStats);
            const compareValue = mod.condition.value || 0;
            
            // 비교 로직 (단순화)
            if (mod.condition.operator === '<') conditionMet = statValue < compareValue;
            else if (mod.condition.operator === '>') conditionMet = statValue > compareValue;
            else if (mod.condition.operator === '<=') conditionMet = statValue <= compareValue;
            else if (mod.condition.operator === '>=') conditionMet = statValue >= compareValue;
            else if (mod.condition.operator === '==') conditionMet = statValue === compareValue;
        }

        if (conditionMet) {
          if (mod.multiplier) totalDamage *= mod.multiplier;
          if (mod.flat) totalDamage += mod.flat;
        }
      });
    }

    return totalDamage;
  }

  // 시간 경과에 따른 처리 (틱)
  public tick(target: CombatStats, time: number, deltaTime: number): DamageEvent[] {
      const events: DamageEvent[] = [];

      // 아이템 쿨타임 감소 및 틱 효과
      this.items.forEach(item => {
          if (item.state.cooldownRemaining > 0) {
              item.state.cooldownRemaining = Math.max(0, item.state.cooldownRemaining - deltaTime);
          }

          if (item.script.onTick) {
              const res = item.script.onTick(target, this.stats, item.state, time, deltaTime);
              if (res) {
                  const mitigated = DamageEngine.calculateDamage(
                      res.damage,
                      res.type,
                      this.stats,
                      target
                  );
                  events.push({
                      source: `${item.script.name} (Tick)`,
                      type: res.type,
                      rawDamage: res.damage,
                      mitigatedDamage: mitigated,
                      timestamp: time,
                      isCrit: false
                  });
              }
          }
      });

      return events;
  }

  // 아이템 사용 (액티브)
  public useItem(itemId: number, target: CombatStats, time: number): DamageEvent[] {
      const item = this.items.find(i => i.script.id === itemId);
      if (!item || !item.script.onActivate) return [];
      
      // 쿨타임 체크
      if (item.state.cooldownRemaining > 0) return [];

      const events: DamageEvent[] = [];
      const res = item.script.onActivate(target, this.stats, item.state);
      
                 if (res && typeof res === 'object') { // DamageResult check
                     const mitigated = DamageEngine.calculateDamage(
                         res.damage,
                         res.type,
                         this.stats,
                         target
                     );
                     events.push({
                         source: `${item.script.name} (Active)`,
                         type: res.type,
                         rawDamage: res.damage,
                         mitigatedDamage: mitigated,
                         timestamp: time,
                         isCrit: false
                     });
                     
                     this.handleDamageDealt(target, res.damage, res.type, `${item.script.name} (Active)`, item.state);
                }
            return events;
  }

  // 데미지 입힌 후 처리
  private handleDamageDealt(target: CombatStats, damage: number, type: string, sourceName: string, sourceItemState?: ItemState) {
      // 모든 아이템의 onDamageDealt 트리거
      this.items.forEach(item => {
          if (item.script.onDamageDealt) {
              item.script.onDamageDealt(target, this.stats, item.state, damage, type, sourceName);
          }
      });
  }

  // 처치 시 처리
  private handleKill(target: CombatStats) {
    this.items.forEach(item => {
        if (item.script.onKill) {
            item.script.onKill(target, this.stats, item.state);
        }
    });
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
    const costArray = spell.cost || [];
    const lvIdx = Math.min(skillLevel - 1, Math.max(0, costArray.length - 1));
    const flatCost = costArray[lvIdx] || 0;
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

    // 스킬 시전 이벤트 (주문 검 등)
    this.items.forEach(item => {
        if (item.script.onSpellCast) {
            item.script.onSpellCast(target, this.stats, item.state, actualKey);
        }
    });

    spell.effects.forEach((effect: any) => {
      if (effect.type === 'buff') {
        this.applyBuff(effect, skillLevel);
      }
      
      if (effect.type === 'damage' && effect.logic) {
        const logic = effect.logic as DamageLogic;
        let rawDmg = this.calculateSpellDamage(logic, target, skillLevel);
        
        // 나서스 Q 스택 데미지 추가
        if (this.schema.id === 'Nasus' && spellKey === 'Q') {
            rawDmg += this.stacks;
        }

        // 도트/연타 데미지 처리
        const hits = logic.multiHit || logic.ticks || 1;
        const interval = logic.multiHitInterval || 0.5; // 기본 0.5초
        const dmgPerHit = rawDmg / (logic.ticks || 1); // ticks가 있으면 분할, multiHit은 각 타격이 rawDmg일 수도 있으나 일단 분할로 가정 (스키마 정의에 따라 다름)
        // 실제 롤 데이터상 multiHit은 전체 데미지를 나누는 경우가 많음. 
        // 하지만 여기서는 명시적으로 multiHit이 있으면 그만큼 반복하는 것으로 처리.
        
        // 투사체 속도에 따른 지연 시간 계산 (거리는 기본 500 가정)
        const travelTime = logic.projectileSpeed ? (500 / logic.projectileSpeed) : 0;
        const baseDelay = logic.delay || 0;

        for (let i = 0; i < hits; i++) {
          const hitTime = time + travelTime + baseDelay + (i * interval);
          const mitigated = DamageEngine.calculateDamage(
            dmgPerHit, 
            logic.damageType, 
            this.stats, 
            target
          );

          events.push({
            source: `${spell.name} (${actualKey})`,
            type: logic.damageType,
            rawDamage: dmgPerHit,
            mitigatedDamage: mitigated,
            timestamp: hitTime,
            isCrit: false
          });

          this.handleDamageDealt(target, mitigated, logic.damageType, `${spell.name} (${actualKey})`);

          // 돌아오는 데미지 처리 (예: 아리 Q)
          if (logic.returnDamage && i === 0) {
            // 돌아오는 데미지는 보통 0.5초~1초 뒤에 발생
            const returnMitigated = DamageEngine.calculateDamage(
                dmgPerHit,
                'True', // 아리 Q 등 돌아올 때 고정뎀인 경우가 많음 (스키마에서 damageType을 True로 주거나 여기서 강제 가능)
                this.stats,
                target
            );
            events.push({
                source: `${spell.name} (Return)`,
                type: 'True',
                rawDamage: dmgPerHit,
                mitigatedDamage: returnMitigated,
                timestamp: hitTime + 0.8, // 왕복 시간 가정
                isCrit: false
            });
            this.handleDamageDealt(target, returnMitigated, 'True', `${spell.name} (Return)`);
          }

          // 온힛 적용 (효율 적용)
          if (logic.onHitEffectiveness) {
            this.items.forEach(item => {
              if (item.script.onHit) {
                const onHitDmg = item.script.onHit(target, this.stats, item.state);
                if (onHitDmg) {
                  events.push({
                    source: `${item.script.name} (On-hit)`,
                    type: onHitDmg.type,
                    rawDamage: onHitDmg.damage * logic.onHitEffectiveness!,
                    mitigatedDamage: DamageEngine.calculateDamage(
                      onHitDmg.damage * logic.onHitEffectiveness!,
                      onHitDmg.type,
                      this.stats,
                      target
                    ),
                    timestamp: hitTime,
                    isCrit: false
                  });
                  this.handleDamageDealt(target, events[events.length-1].mitigatedDamage, onHitDmg.type, `${item.script.name} (On-hit)`, item.state);
                }
              }
              // 스펠 히트 적용
              if (item.script.onSpellHit) {
                  const spellHitDmg = item.script.onSpellHit(target, this.stats, item.state, spellKey === 'R');
                  if (spellHitDmg) {
                      events.push({
                          source: `${item.script.name} (Spell-hit)`,
                          type: spellHitDmg.type,
                          rawDamage: spellHitDmg.damage,
                          mitigatedDamage: DamageEngine.calculateDamage(
                              spellHitDmg.damage,
                              spellHitDmg.type,
                              this.stats,
                              target
                          ),
                          timestamp: hitTime,
                          isCrit: false
                      });
                      this.handleDamageDealt(target, events[events.length-1].mitigatedDamage, spellHitDmg.type, `${item.script.name} (Spell-hit)`, item.state);
                  }
              }
            });
          } else {
             // 온힛이 아니더라도 스펠 히트는 적용되어야 함 (일반 스킬)
             // 여기서 한 번만 적용 (다단히트 시 매번? 보통 매번 적용됨 리안드리 등. 루덴은 쿨타임 있어서 괜찮음)
             // 단, logic.onHitEffectiveness가 없으면 스펠 히트 로직이 안 도는 구조였는데, 분리해야 함.
             // 위 블록은 onHitEffectiveness가 있을 때만 돌고 있음.
             // 스펠 히트는 무조건 돌려야 함.
             this.items.forEach(item => {
                if (item.script.onSpellHit) {
                    const spellHitDmg = item.script.onSpellHit(target, this.stats, item.state, spellKey === 'R');
                    if (spellHitDmg) {
                        events.push({
                            source: `${item.script.name} (Spell-hit)`,
                            type: spellHitDmg.type,
                            rawDamage: spellHitDmg.damage,
                            mitigatedDamage: DamageEngine.calculateDamage(
                                spellHitDmg.damage,
                                spellHitDmg.type,
                                this.stats,
                                target
                            ),
                            timestamp: hitTime,
                            isCrit: false
                        });
                        this.handleDamageDealt(target, events[events.length-1].mitigatedDamage, spellHitDmg.type, `${item.script.name} (Spell-hit)`, item.state);
                    }
                }
             });
          }
        }
      }
    });

    return events;
  }

  // 패시브 시전 (카타리나 단검 줍기 등 데미지가 있는 패시브)
  public castPassive(target: CombatStats, time: number): DamageEvent[] {
    const pSpell = (this.schema.spells as any)['P'];
    if (!pSpell || !pSpell.effects) return [];

    const events: DamageEvent[] = [];

    pSpell.effects.forEach((effect: any) => {
      if (effect.type === 'damage' && effect.logic) {
        const logic = effect.logic as DamageLogic;

        // levelScaling이 true면 챔피언 레벨 기반, 아니면 스킬 레벨 1 사용
        const effectiveLevel = logic.levelScaling ? this.level : 1;
        const lvIdx = Math.min(effectiveLevel - 1, logic.base.length - 1);

        // 기본 데미지
        let rawDmg = logic.base[lvIdx] || 0;

        // 스케일링 데미지
        if (logic.scalings) {
          logic.scalings.forEach(scale => {
            const statValue = this.getStatValue(scale.stat, target);

            // 계수가 배열일 경우 레벨에 따라 달라짐 (카타리나 AP 계수 등)
            let ratio: number;
            if (Array.isArray(scale.ratio)) {
              // 패시브 계수는 보통 특정 레벨(1,6,11,16)에서 증가
              // 간단히: 레벨 1-5: 인덱스 0, 6-10: 인덱스 1, 11-15: 인덱스 2...
              const ratioIdx = Math.min(Math.floor((this.level - 1) / 5), scale.ratio.length - 1);
              ratio = scale.ratio[ratioIdx];
            } else {
              ratio = scale.ratio;
            }

            rawDmg += statValue * ratio;
          });
        }

        const mitigated = DamageEngine.calculateDamage(
          rawDmg,
          logic.damageType,
          this.stats,
          target
        );

        events.push({
          source: `${pSpell.name} (P)`,
          type: logic.damageType,
          rawDamage: rawDmg,
          mitigatedDamage: mitigated,
          timestamp: time,
          isCrit: false
        });

        this.handleDamageDealt(target, mitigated, logic.damageType, `${pSpell.name} (P)`);

        // 온힛 효과 적용 (카타리나 패시브는 onHitEffectiveness: 1.0)
        if (logic.onHitEffectiveness) {
          this.items.forEach(item => {
            if (item.script.onHit) {
              const onHitDmg = item.script.onHit(target, this.stats, item.state);
              if (onHitDmg) {
                const onHitMitigated = DamageEngine.calculateDamage(
                  onHitDmg.damage * logic.onHitEffectiveness!,
                  onHitDmg.type,
                  this.stats,
                  target
                );
                events.push({
                  source: `${item.script.name} (On-hit)`,
                  type: onHitDmg.type,
                  rawDamage: onHitDmg.damage * logic.onHitEffectiveness!,
                  mitigatedDamage: onHitMitigated,
                  timestamp: time,
                  isCrit: false
                });
                this.handleDamageDealt(target, onHitMitigated, onHitDmg.type, `${item.script.name} (On-hit)`, item.state);
              }
            }
          });
        }
      }
    });

    return events;
  }

  // 평타 수행
  public performAutoAttack(target: CombatStats, time: number): DamageEvent[] {
    const events: DamageEvent[] = [];
    
    // 1. 기본 물리 데미지 (치명타 미적용 단순화)
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
    
    this.handleDamageDealt(target, mitigated, 'Physical', 'Auto Attack');

    // 2. 온힛/OnAttack 아이템 효과
    this.items.forEach(item => {
      // OnAttack (구인수 등)
      if (item.script.onAttack) {
          item.script.onAttack(target, this.stats, item.state);
      }

      if (item.script.onHit) {
        const onHitDmg = item.script.onHit(target, this.stats, item.state);
        if (onHitDmg) {
          const mitigatedOnHit = DamageEngine.calculateDamage(
              onHitDmg.damage,
              onHitDmg.type,
              this.stats,
              target
          );
          events.push({
            source: `${item.script.name} (On-hit)`,
            type: onHitDmg.type,
            rawDamage: onHitDmg.damage,
            mitigatedDamage: mitigatedOnHit,
            timestamp: time,
            isCrit: false
          });
          this.handleDamageDealt(target, mitigatedOnHit, onHitDmg.type, `${item.script.name} (On-hit)`, item.state);
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
    const step = 0.5; // 액션 간 간격

    combo.forEach(action => {
      // 틱 처리 (액션 간격만큼)
      const tickEvents = this.tick(target, currentTime, step);
      allEvents.push(...tickEvents);

      currentTime += step;

      if (action === 'AA') {
        const events = this.performAutoAttack(target, currentTime);
        allEvents.push(...events);
      } else if (action === 'P') {
        // 패시브 시전 (카타리나 단검 줍기 등)
        const events = this.castPassive(target, currentTime);
        allEvents.push(...events);
      } else if (['Q', 'W', 'E', 'R'].includes(action)) {
        
        // 변신 챔피언 R 사용 시 폼 전환
        if (action === 'R' && ['Nidalee', 'Jayce', 'Elise'].includes(this.schema.id)) {
            this.toggleForm();
        }

        const events = this.castSpell(
          action as 'Q' | 'W' | 'E' | 'R', 
          target, 
          currentTime, 
          skillLevels[action] || 1
        );
        allEvents.push(...events);
      } else if (action.startsWith('Item:')) {
          // 아이템 사용 (예: Item:3748)
          const itemId = parseInt(action.split(':')[1]);
          const events = this.useItem(itemId, target, currentTime);
          allEvents.push(...events);
      }
    });

    return allEvents;
  }
}
