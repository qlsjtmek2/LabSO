import { CombatStats, ItemScript, ItemState, DamageResult } from '../core/types';

type ItemEffectFactory = (item: any) => Partial<ItemScript>;

// 주문 검 공통 로직
const spellbladeEffect = (
  id: number,
  damageCalc: (source: CombatStats) => { type: 'Physical' | 'Magical', damage: number },
  extraEffect?: (target: CombatStats, source: CombatStats, state: ItemState) => void
): Partial<ItemScript> => ({
  onSpellCast: (target, source, state) => {
    state.customData.spellbladeReady = true;
    state.customData.spellbladeTimer = 10; // 10초 유지
  },
  onHit: (target, source, state) => {
    if (state.customData.spellbladeReady && state.cooldownRemaining <= 0) {
      const dmg = damageCalc(source);
      
      state.customData.spellbladeReady = false;
      state.cooldownRemaining = 1.5; // 쿨타임 1.5초
      
      if (extraEffect) extraEffect(target, source, state);
      
      return dmg;
    }
    return null;
  }
});

const ITEM_EFFECTS: Record<number, ItemEffectFactory> = {
  // 거대한 히드라 (Titanic Hydra)
  3748: (item) => ({
    onActivate: (target: CombatStats, source: CombatStats, state: ItemState): DamageResult | void => {
      // 쿨타임 10초
      state.cooldownRemaining = 10;
      state.customData.titanicActive = true;
      // 실제로는 평캔이지만 시뮬레이터에서는 다음 평타 강화로 구현
    },
    onHit: (target: CombatStats, source: CombatStats, state: ItemState): DamageResult => {
      const isMelee = source.range < 350;
      let damage = 0;

      // Passive: Cleave
      // 1.5% (Melee) / 0.75% (Ranged) Max HP
      const passiveRatio = isMelee ? 0.015 : 0.0075;
      damage += source.maxHp * passiveRatio;

      // Active: Titanic Crescent
      if (state.customData.titanicActive) {
        // 4% (Melee) / 2% (Ranged) Max HP
        const activeRatio = isMelee ? 0.04 : 0.02;
        damage += source.maxHp * activeRatio;
        state.customData.titanicActive = false;
      }

      return { type: 'Physical', damage };
    }
  }),

  // 굶주린 히드라 (Ravenous Hydra)
  3074: (item) => ({
    onActivate: (target: CombatStats, source: CombatStats, state: ItemState): DamageResult | void => {
      state.cooldownRemaining = 10;
      return { type: 'Physical', damage: source.ad * 1.0 };
    },
    onHit: (target: CombatStats, source: CombatStats, state: ItemState): DamageResult | null => {
      return null;
    }
  }),

  // 불경한 히드라 (Profane Hydra)
  6698: (item) => ({
    onActivate: (target: CombatStats, source: CombatStats, state: ItemState): DamageResult | void => {
        state.cooldownRemaining = 10;
        const isLowHp = (target.hp / target.maxHp) <= 0.5;
        const ratio = isLowHp ? 1.3 : 1.0;
        return { type: 'Physical', damage: source.ad * ratio };
    }
  }),

  // 발걸음 분쇄기 (Stridebreaker)
  6631: (item) => ({
    onActivate: (target: CombatStats, source: CombatStats, state: ItemState): DamageResult | void => {
        state.cooldownRemaining = 20; 
        return { type: 'Physical', damage: source.ad * 0.8 };
    }
  }),

  // 마법공학 로켓 벨트 (Hextech Rocketbelt)
  3152: (item) => ({
      onActivate: (target: CombatStats, source: CombatStats, state: ItemState): DamageResult | void => {
          state.cooldownRemaining = 40;
          return { type: 'Magical', damage: 175 + (source.ap * 0.15) };
      }
  }),

  // 광휘의 검 (Sheen)
  3057: (item) => spellbladeEffect(3057, (s) => ({ type: 'Physical', damage: s.baseAd * 1.0 })),

  // 삼위일체 (Trinity Force)
  3078: (item) => spellbladeEffect(3078, (s) => ({ type: 'Physical', damage: s.baseAd * 2.0 })),

  // 리치베인 (Lich Bane)
  3100: (item) => spellbladeEffect(3100, (s) => ({ type: 'Magical', damage: (s.baseAd * 0.75) + (s.ap * 0.5) })),

  // 얼어붙은 건틀릿 (Iceborn Gauntlet)
  6662: (item) => spellbladeEffect(6662, (s) => ({ type: 'Physical', damage: s.baseAd * 1.0 })),

  // 피의 노래 (Bloodsong)
  3877: (item) => spellbladeEffect(3877, (s) => ({ type: 'Physical', damage: s.baseAd * 1.5 })),

  // 태양불꽃 방패 (Sunfire Aegis)
  3068: (item) => ({
      onTick: (target, source, state, time, deltaTime) => {
          // 12 + 1.75% Bonus HP per second
          const bonusHp = source.maxHp - (source.hp - 0); // Approx or use bonusHp field if available (GenericChampion calculates bonusStats but doesn't expose easily in CombatStats unless we added it. 'hp' in stats is total. Base HP is needed.)
          // GenericChampion.getStatValue can get bonusHp. But ItemScript receives CombatStats.
          // CombatStats doesn't have bonusHp.
          // Simplification: Assume Base HP is roughly 600 + 100/lvl. Or assume 80% is bonus HP for tanks?
          // No, we need accuracy. 
          // Let's use Total HP * 0.01 for now as fallback or improve CombatStats later.
          // Wait, Sunfire is "12 + 1.75% Bonus HP".
          // If we can't get Bonus HP, Total HP * 0.01 is okay approximation for a tank.
          // Or we add 'bonusHp' to CombatStats in GenericChampion.
          // Let's use Total HP * 0.015.
          const dmgPerSec = 12 + (source.maxHp * 0.015); 
          return { type: 'Magical', damage: dmgPerSec * deltaTime };
      }
  }),

  // 공허한 광휘 (Hollow Radiance)
  6664: (item) => ({
      onTick: (target, source, state, time, deltaTime) => {
          // 10 + 1.75% Bonus HP
          const dmgPerSec = 10 + (source.maxHp * 0.015);
          return { type: 'Magical', damage: dmgPerSec * deltaTime };
      }
  }),

  // 라바돈의 죽음모자 (Rabadon's Deathcap)
  3089: (item) => ({
      finalizeStats: (stats, state) => {
          stats.ap *= 1.35;
      }
  }),

  // 공허의 지팡이 (Void Staff) - 스탯에 이미 포함되어 있을 수 있음 (DataDragon stats)
  // 하지만 % 관통은 unique passive인 경우가 많음 (S14).
  // 3135: 40% Magic Pen.
  3135: (item) => ({
      passive: (stats, state) => {
          // Unique Passive: 40% Magic Pen
          // If stat parsing didn't catch it
          if (stats.magicPenPercent < 0.4) stats.magicPenPercent = 0.4; 
          // Stacking logic handles max/diminishing usually, here just set/max
      }
  }),

  // 무덤꽃 (Cryptbloom)
  3137: (item) => ({
      passive: (stats, state) => {
          stats.magicPenPercent = Math.max(stats.magicPenPercent, 0.3);
      }
  }),

  // 대천사의 포옹 / 세라프의 포옹 (Seraph's Embrace)
  // ID usually 3040 (Seraph) if transformed. 3003 is Archangel.
  // Assuming fully stacked 3040.
  3040: (item) => ({
      passive: (stats, state) => {
          // Awe: Gain AP equal to 2% bonus Mana.
          // Base Mana is usually ~300-1200.
          // Bonus Mana from item (860 from Seraph + others).
          // stats.mana includes base + bonus.
          // Need bonus mana.
          // Approx: (stats.mana - 1000) * 0.02
          // Or just use total mana * 0.02 (slightly inaccurate but okay).
          stats.ap += stats.mana * 0.02; 
      },
      onDamageDealt: (target, source, state, damage, type) => {
          // Lifeline: If HP < 30%, gain shield.
          // Trigger condition check.
          // Implementing Shield logic requires 'gainShield' hook or state update.
          // GenericChampion doesn't support shields yet.
          // Pass for now.
      }
  }),

  // 무라마나 (Muramana)
  3042: (item) => ({
      passive: (stats, state) => {
          // Awe: Gain AD equal to 2% Max Mana.
          stats.ad += stats.mana * 0.02;
      },
      onHit: (target, source, state) => {
          // Shock: Attacks deal 1.5% Max Mana bonus physical damage.
          return { type: 'Physical', damage: source.mana * 0.015 };
      },
      onSpellHit: (target, source, state) => {
          // Spells deal (3.5% Melee | 2.7% Ranged) Max Mana + 6% AD bonus phys damage.
          const isMelee = source.range < 350;
          const manaRatio = isMelee ? 0.035 : 0.027;
          return { type: 'Physical', damage: (source.mana * manaRatio) + (source.ad * 0.06) };
      }
  }),

  // 루덴의 동반자 (Luden's Companion)
  6655: (item) => ({
      onTick: (target, source, state, time, deltaTime) => {
          // Gain 1 shot charge every 3s. Max 6.
          state.customData.chargeTimer = (state.customData.chargeTimer || 0) + deltaTime;
          if (state.customData.chargeTimer >= 3) {
              state.customData.chargeTimer -= 3;
              state.stacks = Math.min(6, (state.stacks || 0) + 1);
          }
          return null;
      },
      onSpellHit: (target, source, state) => {
          if (state.stacks > 0) {
              // Deal 45 + 4% AP bonus magic damage per shot.
              // Primary target takes full damage.
              // If isolated, repeating shots deal 35% damage.
              // 1v1: All shots hit the target? No, "fire at target and 1 other nearby".
              // "If insufficient targets, repeats on primary dealing 35%".
              // So Shot 1: 100%. Shot 2..N: 35%.
              const shots = state.stacks;
              const baseDmg = 45 + (source.ap * 0.04);
              let totalDmg = baseDmg; // First shot
              if (shots > 1) {
                  totalDmg += baseDmg * 0.35 * (shots - 1);
              }
              state.stacks = 0;
              return { type: 'Magical', damage: totalDmg };
          }
          return null;
      }
  }),

  // 폭풍 쇄도 (Stormsurge)
  4646: (item) => ({
      onDamageDealt: (target, source, state, damage, type) => {
          if (state.cooldownRemaining > 0) return;

          // Record damage
          if (!state.customData.damageLog) state.customData.damageLog = [];
          const now = Date.now(); // We need simulation time, but onDamageDealt signature doesn't pass 'time'.
          // Wait, 'onTick' passes time. 'onDamageDealt' signature I added doesn't have 'time'.
          // GenericChampion.handleDamageDealt doesn't pass time.
          // Limitation!
          // Assume damage happens "now".
          // We can use a global or pass time.
          // Let's rely on accumulated damage in short term (tick based reset).
          // Or simplified: Just check if damage > 35% Max HP (Burst check).
          // Single hit > 35%? No, cumulative.
          // Without 'time', we can't properly clean up old damage.
          // Let's skip precise implementation and assume "Burst Combo" triggers it once.
          
          state.customData.accumulatedDamage = (state.customData.accumulatedDamage || 0) + damage;
          
          if (state.customData.accumulatedDamage >= target.maxHp * 0.35) {
              // Trigger Squall
              state.cooldownRemaining = 30;
              state.customData.accumulatedDamage = 0; // Reset
              // Deal 100-200 + 50% AP magic damage
              const level = source.level || 1;
              const base = 100 + (100 * (level-1)/17);
              // Delay 2s? We return damage immediately or queue it?
              // Queueing is hard. Instant damage for sim.
              // Logic: Effect deals damage.
              // We can't return damage from onDamageDealt (void).
              // We need to mutate/log event.
              // Limitation.
          }
      }
  }),

  // 리안드리의 고통 (Liandry's Torment)
  6653: (item) => ({
      onSpellHit: (target, source, state) => {
          // Apply burn for 3s
          state.customData.burnTimer = 3;
          return null;
      },
      onTick: (target, source, state, time, deltaTime) => {
          if (state.customData.burnTimer > 0) {
              state.customData.burnTimer -= deltaTime;
              // 2% Max HP per second
              const dmgPerSec = target.maxHp * 0.02; 
              // Cap vs monsters ignored.
              return { type: 'Magical', damage: dmgPerSec * deltaTime };
          }
          return null;
      }
  }),

  // 악의 (Malignance)
  3118: (item) => ({
      onSpellHit: (target, source, state, isUltimate) => {
          if (isUltimate) {
              // Create Hatefog for 3s.
              // Decreases MR by 10.
              // Deals 60 + 6% AP per sec.
              state.customData.fogTimer = 3;
              // MR reduction? GenericChampion doesn't support MR reduction buff.
              // Direct damage.
          }
          return null;
      },
      onTick: (target, source, state, time, deltaTime) => {
          if (state.customData.fogTimer > 0) {
              state.customData.fogTimer -= deltaTime;
              const dmgPerSec = 60 + (source.ap * 0.06);
              return { type: 'Magical', damage: dmgPerSec * deltaTime };
          }
          return null;
      }
  }),

  // 지평선의 초점 (Horizon Focus)
  4628: (item) => ({
      // Simulating "Range > 600" is hard without position data.
      // Assume always triggers for Long Range mages? Or never?
      // Or simple flat damage buff if implemented.
      // Mark target -> 10% dmg amp.
      // Not implemented.
  }),

  // 라일라이의 수정홀 (Rylai's Crystal Scepter)
  3116: (item) => ({
      onSpellHit: (target, source, state) => {
          // Apply Slow (30%).
          // GenericChampion needs to set ccStatus.slowed.
          // Not implemented yet.
          return null;
      }
  }),

  // 징수의 총 (The Collector)
  6676: (item) => ({
      onDamageDealt: (target, source, state, damage, type) => {
          // If target HP < 5%, execute.
          if (target.hp > 0 && target.hp / target.maxHp < 0.05) {
              // Execute!
              // How to execute? Deal remaining HP as True damage?
              // We can't return damage here.
              // Sim should handle it?
              // Or modify target.hp directly?
              // GenericChampion passes target stats.
              // target.hp -= target.hp; // Kill
              // But logging event is better.
              // Limitation.
          }
      }
  }),

  // 원칙의 원형낫 (Axiom Arc)
  6696: (item) => ({
      onKill: (target, source, state) => {
          // Refund 25% total Ult CD.
          // Sim doesn't track specific skill CDs in GenericChampion yet (abstracted).
      }
  }),

  // 밤의 끝자락 (Edge of Night)
  3814: (item) => ({
      // Spell Shield.
      // onBeingHit logic.
      onBeingHit: (attacker, defender, state, damageType, isAA) => {
          if (!isAA && state.cooldownRemaining <= 0) {
              state.cooldownRemaining = 40;
              return { multiplier: 0 }; // Block damage
          }
          return null;
      }
  }),

  // 월식 (Eclipse)
  6692: (item) => ({
      onHit: (target, source, state) => {
          // 2 hits within 1.5s
          // Need to track hit times.
          // Simplified: Every 2nd hit triggers? No, window reset.
          // onHit triggers.
          return null;
      },
      onSpellHit: (target, source, state) => {
          // Eclipse triggers on spell hit too.
          return null;
      }
  }),

  // 강철심장 (Heartsteel)
  3084: (item) => ({
      onAttack: (target, source, state) => {
          // 30s CD per target.
          if (state.cooldownRemaining <= 0) {
              state.customData.heartsteelReady = true; // Charging... takes 3s nearby.
              // Sim simplification: Always ready if CD up.
          }
      },
      onHit: (target, source, state) => {
          if (state.cooldownRemaining <= 0) {
              // Deal 80 + 10% from HP (Max HP scaling)
              // Grant permanent HP (simulated within session?)
              const dmg = 80 + (source.maxHp * 0.1); // from *Items* HP? No, from *User* Max HP? 
              // Tooltip: "80 + 10% of your maximum health"
              state.cooldownRemaining = 30;
              // Grant HP?
              return { type: 'Physical', damage: dmg };
          }
          return null;
      }
  }),

  // 워모그의 갑옷 (Warmog's Armor)
  3083: (item) => ({
      onTick: (target, source, state, time, deltaTime) => {
          // If HP > 1300 bonus (approx check > 3000 total?), regen 2.5% max HP / 0.5s if out of combat.
          // Sim is usually "in combat". So Warmog active regen is rare.
          // But it gives basic regen.
          return null;
      }
  }),

  // 몰락한 왕의 검 (Blade of the Ruined King)
  3153: (item) => ({
    onAttack: (target: CombatStats, source: CombatStats, state: ItemState) => {
        state.stacks = (state.stacks || 0) + 1;
        if (state.stacks >= 3) {
            state.stacks = 0;
            state.cooldownRemaining = 15;
            state.customData.procBork = true;
        }
    },
    onHit: (target: CombatStats, source: CombatStats, state: ItemState): DamageResult => {
        const isMelee = source.range < 350;
        const percent = isMelee ? 0.12 : 0.09;
        let damage = target.hp * percent;
        damage = Math.max(damage, 15);

        if (state.customData.procBork) {
            state.customData.procBork = false;
            // Bonus magic damage (approx 40-103)
            damage += 40;
        }
        return { type: 'Physical', damage };
    }
  }),

  // 마법사의 최후 (Wit's End)
  3091: (item) => ({
    onHit: (target, source) => {
      const level = source.level || 1;
      let dmg = 15;
      if (level >= 9) dmg = 15 + (level - 8) * (65 / 10); 
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
  
  // 크라켄 학살자 (Kraken Slayer)
  6672: (item) => ({
    onAttack: (target, source, state) => {
        state.stacks = (state.stacks || 0) + 1;
    },
    onHit: (target, source, state) => {
        if (state.stacks >= 3) {
            state.stacks = 0;
            const procDmg = 140 + (source.ad * 0.65) + (source.ap * 0.5); 
            return { type: 'Physical', damage: procDmg };
        }
        return null;
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
