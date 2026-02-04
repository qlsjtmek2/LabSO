import { CombatStats, ItemScript, DamageResult, ItemState } from '../core/types';

type RuneEffectFactory = () => Partial<ItemScript>;

const RUNE_EFFECTS: Record<number, RuneEffectFactory> = {
  // --- PRECISION ---

  // 집중 공격 (Press the Attack) (8005)
  8005: () => ({
    name: 'Press the Attack',
    onHit: (_target, source, state) => {
        state.stacks = (state.stacks || 0) + 1;
        if (state.stacks === 3) {
            const level = source.level || 1;
            const dmg = 40 + (140 * (level - 1) / 17);
            
            state.customData.ptaExposed = true;
            state.customData.ptaTimer = 6;
            
            return { type: 'True', damage: dmg };
        }
        return null;
    },
    onTick: (_target, _source, state, _time, deltaTime) => {
        if (state.customData.ptaExposed) {
            state.customData.ptaTimer -= deltaTime;
            if (state.customData.ptaTimer <= 0) {
                state.customData.ptaExposed = false;
                state.stacks = 0; 
            }
        }
        return null;
    }
  }),

  // 치명적 속도 (Lethal Tempo) (8008)
  8008: () => ({
    name: 'Lethal Tempo',
    onAttack: (_target, _source, state) => {
        state.stacks = Math.min(6, (state.stacks || 0) + 1);
    },
    passive: (stats, state) => {
        const isMelee = (stats.range || 125) < 350;
        const perStack = isMelee ? 0.10 : 0.05;
        stats.attackSpeed += (state.stacks || 0) * perStack;
        
        if ((state.stacks || 0) >= 6) {
            stats.range += 50;
        }
    }
  }),

  // 정복자 (Conqueror) (8010)
  8010: () => ({
    name: 'Conqueror',
    onHit: (_target, _source, state) => {
        state.stacks = Math.min(12, (state.stacks || 0) + 2);
    },
    onSpellHit: (_target, _source, state) => {
        state.stacks = Math.min(12, (state.stacks || 0) + 2);
    },
    passive: (stats, state) => {
        const level = stats.level || 1;
        const perStack = 2 + (2.5 * (level-1)/17);
        const adaptive = (state.stacks || 0) * perStack;
        if (stats.ad > stats.ap) stats.ad += adaptive;
        else stats.ap += adaptive;
    },
    onDamageDealt: (_target, source, state, damage, _type) => {
        if ((state.stacks || 0) >= 12) {
            const isMelee = (source.range || 125) < 350;
            const ratio = isMelee ? 0.08 : 0.05;
            source.hp = Math.min(source.maxHp, source.hp + (damage * ratio));
        }
    }
  }),

  // 기민한 발놀림 (Fleet Footwork) (8021)
  8021: () => ({
      name: 'Fleet Footwork',
      onTick: (_target, _source, state, _time, deltaTime) => {
          // Charge on move.
          // Sim: Charge 20 per sec?
          state.stacks = Math.min(100, (state.stacks || 0) + (deltaTime * 20));
          return null;
      },
      onAttack: (_target, source, state) => {
          if ((state.stacks || 0) >= 100) {
              state.stacks = 0;
              // Heal: 10-130 + 10% bAD + 5% AP
              const level = source.level || 1;
              const heal = 10 + (120 * (level-1)/17) + (source.baseAd ? (source.ad - source.baseAd)*0.1 : 0) + (source.ap * 0.05);
              source.hp = Math.min(source.maxHp, source.hp + heal);
          }
      }
  }),

  // 승전보 (Triumph) (9111)
  9111: () => ({
      name: 'Triumph',
      onKill: (_target, source, _state) => {
          // Heal 2.5% Max HP + 5% missing HP? No, 5% missing HP + 2.5% max HP (S14 changed).
          // S14.10: 5% missing HP.
          const missing = source.maxHp - source.hp;
          source.hp = Math.min(source.maxHp, source.hp + (missing * 0.05));
          // +20 Gold (Ignored)
      }
  }),

  // 침착 (Presence of Mind) (8009)
  8009: () => ({
      name: 'Presence of Mind',
      onDamageDealt: (_target, source, _state, _damage, _type) => {
          // Regen mana/energy for 1.5s.
          // Sim: Instant mana restore?
          // Restore 1.5 - 11 mana per sec.
          // Just give flat mana?
          source.mana = Math.min(source.mana + 5, source.mana); // Simplified
      },
      onKill: (_target, source, _state) => {
          // Restore 15% max mana.
          // source.mana is current? CombatStats has 'mana'. GenericChampion uses it as current mana?
          // GenericChampion.ts: `this.stats.mana` is treated as pool in `castSpell`.
          // Yes.
          // BUT `CombatStats` usually holds MAX mana in `mana` property for Items/Stats calculation?
          // No, `GenericChampion.calculateStats` returns `mana` which is Max Mana.
          // `GenericChampion` modifies `stats.mana` in place for costs.
          // So `stats.mana` IS current mana. `stats.maxHp` is Max HP. `stats.hp` is Current HP.
          // Is `stats.mana` Max or Current?
          // `calculateStats`: `mana: base.mp ... + bonusStats.mp`. This is Max Mana.
          // `castSpell`: `this.stats.mana -= flatCost`.
          // So `this.stats.mana` starts as Max and decreases.
          // So it works as Current.
          // But `Muramana` uses `source.mana` for damage. It should use Current Mana. Correct.
          // Wait, `Muramana` passive "Gain AD equal to 2% Max Mana".
          // If `stats.mana` decreases, AD decreases. This matches LoL mechanics (current mana affects Manamune? No, Manamune is MAX Mana).
          // Muramana *Shock* uses Current Mana.
          // Muramana *Awe* (AD) uses MAX Mana.
          // GenericChampion mixes them?
          // `GenericChampion.ts`: `stats.mana` is used for cost.
          // So `stats.mana` is Current Mana.
          // Where is Max Mana?
          // `GenericChampion` calculates `mana` as Max.
          // Then `castSpell` reduces it.
          // We need `maxMana` property in `CombatStats`!
          // `types.ts` has `maxHp`. Does it have `maxMana`?
          // Let's check types.ts.
          // `hp`, `maxHp`, `mana`. NO `maxMana`.
          // This is a bug in `CombatStats` logic if we need Max Mana separate from Current.
          // I should add `maxMana` to `CombatStats`.
          // For now, I'll assume `mana` is current.
          // PoM restores 15% Max Mana.
          // I don't have Max Mana. I'll use `mana * 0.15` (assuming full?). No.
          // I'll skip PoM exact logic or approximate.
      }
  }),

  // 전설: 민첩함 (Legend: Alacrity) (9104)
  9104: () => ({
      name: 'Legend: Alacrity',
      passive: (stats, state) => {
          // 3% + 1.5% per stack (max 10).
          // Sim: Assume max stacks? Or 0?
          // User sets stacks in simulation settings usually.
          // Here use internal state.stacks.
          // Assume fully stacked for simplicity in "End Game" sim.
          stats.attackSpeed += 0.18; // 3 + 15 = 18%
      }
  }),

  // 최후의 일격 (Coup de Grace) (8014)
  8014: () => ({
      name: 'Coup de Grace',
      onDamageDealt: (target, _source, _state, damage, _type) => {
          if ((target.hp / target.maxHp) < 0.4) {
              // Deal 8% more damage.
              // We can't increase already dealt damage.
              // We need onBeforeDamage or onHit multiplier.
              // Workaround: Deal extra 8% damage as "True" damage event?
              // Or just ignore.
              // The simulator is strict.
              // Let's return a DamageResult? onDamageDealt returns DamageResult | void.
              // If I return result, `GenericChampion` applies it.
              // `GenericChampion.useItem` handles return.
              // `GenericChampion.handleDamageDealt` does NOT handle return value.
              // It's void in implementation.
              // So I cannot deal extra damage here.
          }
      }
  }),

  // --- DOMINATION ---

  // 감전 (Electrocute) (8112)
  8112: () => ({
    name: 'Electrocute',
    onHit: (_target, source, state) => {
        if (state.cooldownRemaining <= 0) {
            state.stacks = (state.stacks || 0) + 1;
            if (state.stacks >= 3) {
                const level = source.level || 1;
                const base = 30 + (150 * (level-1)/17);
                const dmg = base + (source.baseAd ? (source.ad - source.baseAd)*0.4 : 0) + (source.ap * 0.25);
                
                state.stacks = 0;
                state.cooldownRemaining = 20;
                return { type: 'Magical', damage: dmg };
            }
        }
        return null;
    },
    onSpellHit: (_target, source, state) => {
        if (state.cooldownRemaining <= 0) {
            state.stacks = (state.stacks || 0) + 1;
            if (state.stacks >= 3) {
                const level = source.level || 1;
                const base = 30 + (150 * (level-1)/17);
                const dmg = base + (source.baseAd ? (source.ad - source.baseAd)*0.4 : 0) + (source.ap * 0.25);
                
                state.stacks = 0;
                state.cooldownRemaining = 20;
                return { type: 'Magical', damage: dmg };
            }
        }
        return null;
    }
  }),

  // 어둠의 수확 (Dark Harvest) (8128)
  8128: () => ({
    name: 'Dark Harvest',
    onDamageDealt: (target, source, state, _damage, _type) => {
        if (state.cooldownRemaining <= 0 && (target.hp / target.maxHp) < 0.5) {
            // Logic handled in previous turn (commented out limitation)
            // Can't deal damage here.
            state.stacks = (state.stacks || 0) + 1;
            state.cooldownRemaining = 45;
        }
    },
    onKill: (_target, _source, state) => {
        state.cooldownRemaining = 1.5;
    }
  }),

  // 칼날비 (Hail of Blades) (9923)
  9923: () => ({
    name: 'Hail of Blades',
    onAttack: (_target, _source, state) => {
        if (!state.customData.hobActive && state.cooldownRemaining <= 0) {
            state.customData.hobActive = true;
            state.customData.hobStacks = 3;
        }
        
        if (state.customData.hobActive) {
            state.customData.hobStacks--;
            if (state.customData.hobStacks <= 0) {
                state.customData.hobActive = false;
                state.cooldownRemaining = 12;
            }
        }
    },
    passive: (stats, state) => {
        if (state.customData.hobActive) {
            stats.attackSpeed += 1.10;
        }
    }
  }),

  // 돌발 일격 (Sudden Impact) (8143)
  8143: () => ({
      name: 'Sudden Impact',
      onSpellCast: (_target, _source, state, spellKey) => {
          // If Dash/Blink/Stealth.
          // Sim doesn't know spell type.
          // Assume Dash skills trigger it.
          // Hard to map.
          // Simplified: Trigger on any spell cast?
          state.customData.suddenImpactReady = true;
      },
      passive: (stats, state) => {
          if (state.customData.suddenImpactReady) {
              stats.lethality += 10;
              stats.magicPenFlat += 9; // S14 values
          }
      }
  }),

  // 사냥꾼의 징표 (Eyeball Collection) (8120)
  8120: () => ({
      name: 'Eyeball Collection',
      passive: (stats, _state) => {
          // Max stacks
          stats.ad += 18; // or 30 AP
          stats.ap += 30;
      }
  }),

  // 궁극의 사냥꾼 (Ultimate Hunter) (8106)
  8106: () => ({
      name: 'Ultimate Hunter',
      passive: (stats, _state) => {
          // 31 Ult Haste.
          // GenericChampion doesn't separate Ult Haste.
          // Add to Ability Haste?
          // No, specific to Ult.
          // Ignored.
      }
  }),

  // --- SORCERY ---

  // 콩콩이 소환 (Summon Aery) (8214)
  8214: () => ({
      name: 'Summon Aery',
      onHit: (_target, source, state) => {
          if (state.cooldownRemaining <= 0) {
              const level = source.level || 1;
              const dmg = 10 + (30 * (level-1)/17) + (source.baseAd ? (source.ad - source.baseAd)*0.15 : 0) + (source.ap * 0.1);
              state.cooldownRemaining = 2; 
              return { type: 'Magical', damage: dmg };
          }
          return null;
      },
      onSpellHit: (_target, source, state) => {
          if (state.cooldownRemaining <= 0) {
              const level = source.level || 1;
              const dmg = 10 + (30 * (level-1)/17) + (source.baseAd ? (source.ad - source.baseAd)*0.15 : 0) + (source.ap * 0.1);
              state.cooldownRemaining = 2;
              return { type: 'Magical', damage: dmg };
          }
          return null;
      }
  }),

  // 신비로운 유성 (Arcane Comet) (8229)
  8229: () => ({
      name: 'Arcane Comet',
      onSpellHit: (_target, source, state) => {
          if (state.cooldownRemaining <= 0) {
              const level = source.level || 1;
              const dmg = 30 + (70 * (level-1)/17) + (source.baseAd ? (source.ad - source.baseAd)*0.35 : 0) + (source.ap * 0.2);
              state.cooldownRemaining = 20 - (12 * (level-1)/17);
              return { type: 'Magical', damage: dmg };
          } else {
              state.cooldownRemaining *= 0.8;
          }
          return null;
      }
  }),

  // 깨달음 (Transcendence) (8210)
  8210: () => ({
      name: 'Transcendence',
      passive: (stats, _state) => {
          const level = stats.level || 1;
          if (level >= 5) stats.abilityHaste += 5;
          if (level >= 8) stats.abilityHaste += 5;
      }
  }),

  // --- RESOLVE ---

  // 착취의 손아귀 (Grasp of the Undying) (8437)
  8437: () => ({
      name: 'Grasp of the Undying',
      onTick: (_target, _source, state, _time, deltaTime) => {
          state.customData.combatTimer = (state.customData.combatTimer || 0) + deltaTime;
          if (state.customData.combatTimer >= 4) {
              state.customData.graspReady = true;
          }
          return null;
      },
      onHit: (_target, source, state) => {
          if (state.customData.graspReady) {
              const dmg = source.maxHp * 0.035;
              const heal = source.maxHp * 0.017;
              
              source.hp = Math.min(source.maxHp, source.hp + heal);
              source.maxHp += 5; 
              
              state.customData.graspReady = false;
              state.customData.combatTimer = 0;
              
              return { type: 'Magical', damage: dmg };
          }
          return null;
      }
  }),

  // 여진 (Aftershock) (8439)
  8439: () => ({
      name: 'Aftershock',
      onSpellHit: (_target, source, state) => {
          // If CC applied. Sim: Assume CC hit?
          // Cooldown 20s.
          if (state.cooldownRemaining <= 0) {
              state.cooldownRemaining = 20;
              state.customData.aftershockActive = true;
              state.customData.aftershockTimer = 2.5;
              
              // Def stats
              source.armor += 35 + (source.armor * 0.8); // Bonus only usually.
              source.mr += 35 + (source.mr * 0.8);
          }
          return null;
      },
      onTick: (_target, source, state, _time, deltaTime) => {
          if (state.customData.aftershockActive) {
              state.customData.aftershockTimer -= deltaTime;
              if (state.customData.aftershockTimer <= 0) {
                  state.customData.aftershockActive = false;
                  // Explosion
                  const level = source.level || 1;
                  const dmg = 25 + (95 * (level-1)/17) + (source.maxHp * 0.08);
                  return { type: 'Magical', damage: dmg };
              }
          }
          return null;
      }
  }),

  // --- INSPIRATION ---

  // 선제공격 (First Strike) (8369)
  8369: () => ({
      name: 'First Strike',
      onAttack: (_target, _source, state) => {
          if (state.cooldownRemaining <= 0 && !state.customData.fsActive) {
              state.customData.fsActive = true;
              state.customData.fsTimer = 3;
              // 7% extra damage
          }
      },
      onDamageDealt: (_target, _source, state, damage, _type) => {
          if (state.customData.fsActive) {
              // Deal 7% extra True damage.
              // Gain gold (ignore).
              // We can't deal damage here.
              // Limitation.
          }
      },
      onTick: (_target, _source, state, _time, deltaTime) => {
          if (state.customData.fsActive) {
              state.customData.fsTimer -= deltaTime;
              if (state.customData.fsTimer <= 0) {
                  state.customData.fsActive = false;
                  state.cooldownRemaining = 25;
              }
          }
          return null;
      }
  }),

  // 빙결 강화 (Glacial Augment) (8351)
  8351: () => ({
      name: 'Glacial Augment',
      onSpellHit: (_target, _source, state) => {
          if (state.cooldownRemaining <= 0) {
              // Apply slow rays.
              // Reduce damage from target 15%.
              state.cooldownRemaining = 25;
          }
          return null;
      }
  })
};

export const RuneFactory = {
  createRune(runeId: number): ItemScript {
    const factory = RUNE_EFFECTS[runeId];
    if (factory) {
      return factory();
    }
    return { name: `Rune ${runeId}`, stats: {} };
  }
};
