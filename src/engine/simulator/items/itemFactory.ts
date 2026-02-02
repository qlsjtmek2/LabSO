import { CombatStats, ItemScript, DamageResult } from '../core/types';

type ItemEffectFactory = (item: any) => Partial<ItemScript>;

const ITEM_EFFECTS: Record<number, ItemEffectFactory> = {
  // 몰락한 왕의 검 (Blade of the Ruined King)
  3153: (item) => ({
    onHit: (target: CombatStats, source: CombatStats): DamageResult => {
      const isMelee = source.range < 350; // Range Check
      
      const percent = isMelee ? 0.12 : 0.09; // 근접 12%, 원거리 9%
      let damage = target.hp * percent;
      damage = Math.max(damage, 15); // 최소 데미지
      
      return { type: 'Physical', damage };
    }
  }),

  // 마법사의 최후 (Wit's End)
  3091: (item) => ({
    onHit: (target, source) => {
      // 레벨 비례 15~80
      const level = source.level || 1;
      let dmg = 15;
      if (level >= 9) dmg = 15 + (level - 8) * (65 / 10); // 대략적인 선형
      if (level > 18) dmg = 80;
      
      return { type: 'Magical', damage: dmg };
    }
  }),

  // 내셔의 이빨 (Nashor's Tooth)
  3115: (item) => ({
    onHit: (target, source) => {
      const dmg = 15 + (source.ap * 0.2);
      return { type: 'Magical', damage: dmg };
    }
  }),
  
  // 크라켄 학살자 (Kraken Slayer) - 3타 로직은 복잡(상태 저장 필요)하므로 단순 온힛으로 근사화하거나
  // onAttack에서 카운터 증가 -> onHit에서 발동
  // ItemScript의 한계: 상태 저장이 어려움. (클로저 사용 가능)
  // 일단 3타 평균값(1/3)을 매 타격에 추가하는 것으로 단순화
  6672: (item) => ({
    onHit: (target, source) => {
      // 140 + 0.65 AD + 0.5 AP (대략) / 3
      const procDmg = 140 + (source.ad * 0.65) + (source.ap * 0.5);
      return { type: 'Physical', damage: procDmg / 3 };
    }
  })
};

export const ItemFactory = {
  createItem(itemData: any): ItemScript {
    const baseScript: ItemScript = {
      id: parseInt(itemData.id),
      name: itemData.name,
      stats: {
        hp: itemData.stats?.FlatHPPoolMod || 0,
        mana: itemData.stats?.FlatMPPoolMod || 0,
        ad: itemData.stats?.FlatPhysicalDamageMod || 0,
        ap: itemData.stats?.FlatMagicDamageMod || 0,
        armor: itemData.stats?.FlatArmorMod || 0,
        mr: itemData.stats?.FlatSpellBlockMod || 0,
        attackSpeed: itemData.stats?.PercentAttackSpeedMod || 0,
        critChance: itemData.stats?.FlatCritChanceMod || 0,
        movementSpeed: itemData.stats?.FlatMovementSpeedMod || 0,
        // TODO: Ability Haste, Lethality parsing from description or special fields
      }
    };

    const effectFactory = ITEM_EFFECTS[parseInt(itemData.id)];
    if (effectFactory) {
      const effects = effectFactory(itemData);
      return { ...baseScript, ...effects };
    }

    return baseScript;
  }
};
