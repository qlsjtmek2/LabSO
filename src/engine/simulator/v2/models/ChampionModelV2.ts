/**
 * V2 챔피언 모델 (AI 포함)
 * 
 * 스스로 쿨타임을 관리하고 스킬을 사용하는 능동적인 객체입니다.
 */

import { Entity, CombatStats, Buff, ItemV2, SimulationContext, GameEvent } from '../core/types';
import { ChampionSchema, SpellSchema } from '../../data/schemas';
import { DamageEngine } from '../../core/damageEngine'; 
import { RuneFactory } from '../runes/RuneFactory';
import { ChampionLogicFactory } from '../champions/index'; // 추가

export class ChampionModelV2 implements Entity {
  id: string;
  stats: CombatStats;
  currentHp: number;
  buffs: Buff[] = [];
  items: ItemV2[] = [];
  
  private schema: ChampionSchema;
  private cooldowns: Record<string, number> = { Q: 0, W: 0, E: 0, R: 0, AA: 0 }; // AA 쿨타임 추가
  private skillOrder: string[] = ['Q', 'E', 'W']; 

  constructor(
    schema: ChampionSchema, 
    items: ItemV2[], 
    runeIds: string[] = [], 
    level: number = 18
  ) {
    this.id = schema.id;
    this.schema = schema;
    this.items = items;
    
    // 초기 스탯 계산
    this.stats = this.calculateBaseStats(schema.baseStats, level);
    this.applyItemStats();
    
    // 룬 장착
    runeIds.forEach(id => {
      const runeBuff = RuneFactory.create(id);
      if (runeBuff) {
        this.addBuff(runeBuff);
      }
    });

    // 챔피언 전용 특수 로직 장착 (자동 로드)
    const specificLogic = ChampionLogicFactory.get(schema.id);
    if (specificLogic) {
      this.addBuff(specificLogic);
    }

    this.currentHp = this.stats.maxHp;
  }

  // 기본 스탯 계산
  private calculateBaseStats(base: any, level: number): CombatStats {
    // 성장 스탯 공식 적용
    const growth = level - 1;
    return {
      level: level,
      range: base.range || 125,
      hp: base.hp + base.hpPerLevel * growth,
      maxHp: base.hp + base.hpPerLevel * growth,
      mana: base.mp + base.mpPerLevel * growth,
      ad: base.ad + base.adPerLevel * growth,
      ap: 0,
      armor: base.armor + base.armorPerLevel * growth,
      mr: base.mr + base.mrPerLevel * growth,
      attackSpeed: base.attackSpeed * (1 + (base.attackSpeedRatio * growth / 100)),
      abilityHaste: 0,
      critChance: 0,
      critDamage: 1.75,
      lethality: 0,
      armorPen: 0,
      magicPenFlat: 0,
      magicPenPercent: 0,
      omnivamp: 0,
      lifesteal: 0,
      movementSpeed: 340 // 기본 이속 가정
    };
  }

  private applyItemStats() {
    this.items.forEach(item => {
      if (!item.stats) return;
      // 스탯 합산 로직 (간략화)
      if (item.stats.ad) this.stats.ad += item.stats.ad;
      if (item.stats.ap) this.stats.ap += item.stats.ap;
      if (item.stats.hp) {
        this.stats.hp += item.stats.hp;
        this.stats.maxHp += item.stats.hp;
      }
      if (item.stats.abilityHaste) this.stats.abilityHaste += item.stats.abilityHaste;
      // ... 기타 스탯
    });
  }

  // 버프 추가/제거
  addBuff(buff: Buff) { this.buffs.push(buff); }
  removeBuff(id: string) { this.buffs = this.buffs.filter(b => b.id !== id); }

  // AI 행동 결정 (매 틱마다 호출됨)
  update(time: number, target: Entity, engine: any) {
    // 1. 스킬 사용 시도 (R > Q/W/E)
    // 실제로는 사거리 체크, 마나 체크 필요
    const spells = ['R', ...this.skillOrder];
    
    for (const key of spells) {
      if (time >= this.cooldowns[key]) {
        const spell = this.schema.spells[key as keyof typeof this.schema.spells];
        if (spell) {
          this.castSpell(key, spell, target, engine, time);
          return; // 한 틱에 행동 하나만
        }
      }
    }

    // 2. 평타 (스킬 못 쓰면)
    // 공속 기반 쿨타임 체크 필요 (여기선 매 틱마다 데미지 누적 방식이 아닌, 실제 공격 이벤트 발생)
    // V2에서는 공격 딜레이(Windup)까지 구현해야 완벽하지만, 일단은 쿨타임만 체크
    const attackDelay = 1 / this.stats.attackSpeed;
    if (time >= (this.cooldowns['AA'] || 0)) {
      this.attack(target, engine);
      this.cooldowns['AA'] = time + attackDelay;
    }
  }

  // 스킬 시전
  private castSpell(key: string, spell: SpellSchema, target: Entity, engine: any, time: number) {
    engine.broadcastEvent({ type: 'OnSpellCast', source: this, target, data: { spell: key } });
    
    // 쿨타임 적용 (스킬 가속 반영)
    const baseCd = spell.cooldown[spell.cooldown.length - 1]; // 만렙 기준
    const cdr = this.stats.abilityHaste / (100 + this.stats.abilityHaste);
    this.cooldowns[key] = time + (baseCd * (1 - cdr));

    // 데미지 적용
    spell.effects.forEach(effect => {
      if (effect.type === 'damage' && effect.logic) {
        const damage = this.calculateDamage(effect.logic, target);
        // 엔진을 통해 데미지 적용
        engine.applyDamage(this, target, damage, effect.logic.damageType);
        
        // 온힛 효과 적용 여부 확인 (스킬 설명에 on-hit이 있으면)
        if (effect.logic.onHitEffectiveness) {
           engine.broadcastEvent({ type: 'OnHit', source: this, target });
        }
      }
    });
  }

  // 평타 공격
  private attack(target: Entity, engine: any) {
    engine.broadcastEvent({ type: 'OnPreAttack', source: this, target });
    engine.broadcastEvent({ type: 'OnAttack', source: this, target });
    
    // 적중 (투사체 속도 무시하고 즉시 적중 가정)
    engine.broadcastEvent({ type: 'OnHit', source: this, target });
    // 데미지는 엔진의 handleGlobalRules에서 OnHit 이벤트를 받아 처리함 (engine.ts 참고)
  }

  // 데미지 계산 (V1 로직 재사용)
  private calculateDamage(logic: any, target: Entity): number {
    let dmg = logic.base[logic.base.length - 1] || 0;
    
    // 계수 적용
    if (logic.ratios) {
      logic.ratios.forEach((r: any) => {
        if (r.stat === 'ad') dmg += this.stats.ad * r.ratio;
        if (r.stat === 'ap') dmg += this.stats.ap * r.ratio;
      });
    }
    
    return dmg;
  }
}
