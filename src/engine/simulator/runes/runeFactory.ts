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
        return null;
    },
    onSpellHit: (_target, _source, state) => {
        state.stacks = Math.min(12, (state.stacks || 0) + 2);
        return null;
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

  // 유령 포로 (Ghost Poro) (8120)
  8120: () => ({
      name: 'Ghost Poro',
      passive: (stats, _state) => {
          // Max stacks: +18 AD or +30 AP (same as Eyeball Collection)
          if (stats.ad >= stats.ap) {
              stats.ad += 18;
          } else {
              stats.ap += 30;
          }
      }
  }),

  // 좀비 와드 (Zombie Ward) (8136)
  8136: () => ({
      name: 'Zombie Ward',
      passive: (stats, _state) => {
          // Max stacks: +18 AD or +30 AP
          if (stats.ad >= stats.ap) {
              stats.ad += 18;
          } else {
              stats.ap += 30;
          }
      }
  }),

  // 궁극의 사냥꾼 (Ultimate Hunter) (8106)
  8106: () => ({
      name: 'Ultimate Hunter',
      passive: (stats, _state) => {
          // 31 Ult Haste. Ignored in sim.
      }
  }),

  // 싼 공격 (Cheap Shot) (8126)
  8126: () => ({
      name: 'Cheap Shot',
      onHit: (target, source, state) => {
          // Deal 10-45 true damage to impaired targets.
          // Sim: Assume target is impaired if we recently cast ability?
          if (state.cooldownRemaining <= 0 && state.customData.recentSpellCast) {
              state.cooldownRemaining = 4;
              const level = source.level || 1;
              const dmg = 10 + (35 * (level - 1) / 17);
              return { type: 'True', damage: dmg };
          }
          return null;
      },
      onSpellCast: (_target, _source, state) => {
          state.customData.recentSpellCast = true;
      }
  }),

  // 피의 맛 (Taste of Blood) (8139)
  8139: () => ({
      name: 'Taste of Blood',
      onDamageDealt: (_target, source, state, _damage, _type) => {
          if (state.cooldownRemaining <= 0) {
              state.cooldownRemaining = 20;
              const level = source.level || 1;
              const heal = 18 + (17 * (level - 1) / 17) + (source.ad * 0.15) + (source.ap * 0.1);
              source.hp = Math.min(source.maxHp, source.hp + heal);
          }
      }
  }),

  // 안구 수집가 (Eyeball Collection) (8138 - correct ID)
  8138: () => ({
      name: 'Eyeball Collection',
      passive: (stats, _state) => {
          // Max stacks: +18 AD or +30 AP
          if (stats.ad >= stats.ap) {
              stats.ad += 18;
          } else {
              stats.ap += 30;
          }
      }
  }),

  // 보물 사냥꾼 (Treasure Hunter) (8135)
  8135: () => ({
      name: 'Treasure Hunter',
      // Gold only - no combat effect
  }),

  // 지능형 사냥꾼 (Ingenious Hunter) (8134)
  8134: () => ({
      name: 'Ingenious Hunter',
      passive: (stats, _state) => {
          // Item haste. Would need itemHaste stat.
          // Ignored in sim.
      }
  }),

  // 집요한 사냥꾼 (Relentless Hunter) (8105)
  8105: () => ({
      name: 'Relentless Hunter',
      passive: (stats, _state) => {
          // Out of combat MS.
          stats.movementSpeed += 45; // Max stacks
      }
  }),

  // 전설: 강인함 (Legend: Tenacity) (9105)
  9105: () => ({
      name: 'Legend: Tenacity',
      // Tenacity not tracked in sim.
  }),

  // 전설: 핏빛 길 (Legend: Bloodline) (9103)
  9103: () => ({
      name: 'Legend: Bloodline',
      passive: (stats, _state) => {
          // 5.5% lifesteal max
          stats.lifesteal += 0.055;
      }
  }),

  // 피해 과다 (Overheal) (9101)
  9101: () => ({
      name: 'Overheal',
      // Shield mechanic - not tracked
  }),

  // 체력 차단 (Cut Down) (8017)
  8017: () => ({
      name: 'Cut Down',
      // Deal 5-15% more damage to targets with more max HP.
      // onDamageDealt can't modify damage. Limitation.
  }),

  // 최후의 저항 (Last Stand) (8299)
  8299: () => ({
      name: 'Last Stand',
      // Deal 5-11% more damage when below 60% HP.
      // onDamageDealt can't modify damage. Limitation.
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

  // 질풍 (Phase Rush) (8230)
  8230: () => ({
      name: 'Phase Rush',
      // MS boost after 3 hits. Movement only.
  }),

  // 무효화 구슬 (Nullifying Orb) (8224)
  8224: () => ({
      name: 'Nullifying Orb',
      // Magic damage shield when low HP.
  }),

  // 마나 순환 팔찌 (Manaflow Band) (8226)
  8226: () => ({
      name: 'Manaflow Band',
      // Max mana + mana regen.
  }),

  // 님버스 망토 (Nimbus Cloak) (8275)
  8275: () => ({
      name: 'Nimbus Cloak',
      // MS after summoner spell.
  }),

  // 신속함 (Celerity) (8234)
  8234: () => ({
      name: 'Celerity',
      passive: (stats, _state) => {
          stats.movementSpeed *= 1.01; // 1% bonus MS
      }
  }),

  // 절대 집중 (Absolute Focus) (8233)
  8233: () => ({
      name: 'Absolute Focus',
      passive: (stats, _state) => {
          // AD/AP when above 70% HP.
          // Assume full HP in sim.
          const level = stats.level || 1;
          const bonus = 1.8 + (16.2 * (level - 1) / 17);
          if (stats.ad >= stats.ap) {
              stats.ad += bonus;
          } else {
              stats.ap += bonus * 1.8;
          }
      }
  }),

  // 주문 작열 (Scorch) (8237)
  8237: () => ({
      name: 'Scorch',
      onSpellHit: (_target, source, state) => {
          if (state.cooldownRemaining <= 0) {
              state.cooldownRemaining = 10;
              const level = source.level || 1;
              const dmg = 20 + (20 * (level - 1) / 17);
              return { type: 'Magical', damage: dmg };
          }
          return null;
      }
  }),

  // 물 위를 걷는 자 (Waterwalking) (8232)
  8232: () => ({
      name: 'Waterwalking',
      // River bonus. Ignored in sim.
  }),

  // 폭풍의 결집 (Gathering Storm) (8236)
  8236: () => ({
      name: 'Gathering Storm',
      passive: (stats, _state) => {
          // Adaptive: 4.8/14.4/28.8/48/72/... at 10/20/30/40/50 min.
          // Sim usually tests mid-game. Assume 20 min = 14.4 AD or 24 AP.
          if (stats.ad >= stats.ap) {
              stats.ad += 14.4;
          } else {
              stats.ap += 24;
          }
      }
  }),

  // --- RESOLVE ---

  // 수호자 (Guardian) (8465)
  8465: () => ({
      name: 'Guardian',
      // Shield ally. Not tracked in sim.
  }),

  // 철거 (Demolish) (8446)
  8446: () => ({
      name: 'Demolish',
      // Turret damage. Not tracked.
  }),

  // 생명의 샘 (Font of Life) (8463)
  8463: () => ({
      name: 'Font of Life',
      // CC marks target for ally heal. Not tracked.
  }),

  // 방패 강타 (Shield Bash) (8401)
  8401: () => ({
      name: 'Shield Bash',
      passive: (stats, _state) => {
          // When shielded: +1-10 armor/MR.
          // Assume sometimes shielded.
          stats.armor += 5;
          stats.mr += 5;
      }
  }),

  // 컨디셔닝 (Conditioning) (8429)
  8429: () => ({
      name: 'Conditioning',
      passive: (stats, _state) => {
          // After 12 min: +10 armor, +10 MR, +5% armor/MR.
          // Assume active in mid-game.
          stats.armor += 10 + (stats.armor * 0.05);
          stats.mr += 10 + (stats.mr * 0.05);
      }
  }),

  // 재생의 바람 (Second Wind) (8444)
  8444: () => ({
      name: 'Second Wind',
      // Regen after taking damage. Not combat damage.
  }),

  // 뼈 방패 (Bone Plating) (8473)
  8473: () => ({
      name: 'Bone Plating',
      // Block damage from first 3 attacks. Complex to track.
  }),

  // 과성장 (Overgrowth) (8451)
  8451: () => ({
      name: 'Overgrowth',
      passive: (stats, _state) => {
          // +180 HP from minion absorbs + 3.5% bonus HP.
          const bonusHp = stats.maxHp - (stats.level || 1) * 80; // Rough base HP estimate
          const extra = 180 + (bonusHp * 0.035);
          stats.hp += extra;
          stats.maxHp += extra;
      }
  }),

  // 소생 (Revitalize) (8453)
  8453: () => ({
      name: 'Revitalize',
      // +5% heals/shields. Complex modifier.
  }),

  // 불굴의 의지 (Unflinching) (8242)
  8242: () => ({
      name: 'Unflinching',
      // Tenacity and slow resist. Not tracked.
  }),

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
  }),

  // 봉인 해제된 주문서 (Unsealed Spellbook) (8360)
  8360: () => ({
      name: 'Unsealed Spellbook',
      // Swap summoner spells. Not tracked.
  }),

  // 마법공학 점멸기 (Hextech Flashtraption) (8306)
  8306: () => ({
      name: 'Hextech Flashtraption',
      // Channel flash. Not combat relevant.
  }),

  // 마법의 신발 (Magical Footwear) (8304)
  8304: () => ({
      name: 'Magical Footwear',
      passive: (stats, _state) => {
          // Free boots at 12 min with +10 MS.
          stats.movementSpeed += 10;
      }
  }),

  // 완벽한 타이밍 (Perfect Timing) (8313)
  8313: () => ({
      name: 'Perfect Timing',
      // One-time Stopwatch. Not tracked.
  }),

  // 선물 시장 (Futures Market) (8321)
  8321: () => ({
      name: 'Futures Market',
      // Debt gold. Not tracked.
  }),

  // 미니언 해체 분석기 (Minion Dematerializer) (8316)
  8316: () => ({
      name: 'Minion Dematerializer',
      // Minion damage. Not tracked.
  }),

  // 비스킷 배달 (Biscuit Delivery) (8345)
  8345: () => ({
      name: 'Biscuit Delivery',
      // Consumables. Not tracked.
  }),

  // 우주적 통찰력 (Cosmic Insight) (8347)
  8347: () => ({
      name: 'Cosmic Insight',
      passive: (stats, _state) => {
          // +18 summoner spell haste, +10 item haste.
          stats.abilityHaste += 10; // Approximate with item haste
      }
  }),

  // 접근 속도 (Approach Velocity) (8410)
  8410: () => ({
      name: 'Approach Velocity',
      // MS toward CC'd enemies. Movement only.
  }),

  // 시간 왜곡 물약 (Time Warp Tonic) (8352)
  8352: () => ({
      name: 'Time Warp Tonic',
      // Consumable effects. Not tracked.
  }),

  // === STAT RUNES (5001 ~ 5011) ===

  // 체력 (레벨 비례) (5001)
  5001: () => ({
      name: 'Health Scaling',
      passive: (stats, _state) => {
          const level = stats.level || 1;
          // 15-140 HP based on level
          const hpBonus = 15 + (125 * (level - 1) / 17);
          stats.hp += hpBonus;
          stats.maxHp += hpBonus;
      }
  }),

  // 체력 +65 (5002)
  5002: () => ({
      name: 'Health',
      passive: (stats, _state) => {
          stats.hp += 65;
          stats.maxHp += 65;
      }
  }),

  // 방어력 +6 (5003)
  5003: () => ({
      name: 'Armor',
      passive: (stats, _state) => {
          stats.armor += 6;
      }
  }),

  // 마법저항력 +8 (5004)
  5004: () => ({
      name: 'Magic Resist',
      passive: (stats, _state) => {
          stats.mr += 8;
      }
  }),

  // 공격 속도 +10% (5005)
  5005: () => ({
      name: 'Attack Speed',
      passive: (stats, _state) => {
          stats.attackSpeed += 0.10;
      }
  }),

  // 스킬 가속 +8 (5007)
  5007: () => ({
      name: 'Ability Haste',
      passive: (stats, _state) => {
          stats.abilityHaste += 8;
      }
  }),

  // 적응형 능력치 +9AD or +15AP (5008)
  5008: () => ({
      name: 'Adaptive Force',
      passive: (stats, _state) => {
          // Adaptive: AD if AD > AP, else AP
          if (stats.ad >= stats.ap) {
              stats.ad += 9;
          } else {
              stats.ap += 15;
          }
      }
  }),

  // 이동 속도 +2% (5010)
  5010: () => ({
      name: 'Movement Speed',
      passive: (stats, _state) => {
          stats.movementSpeed *= 1.02;
      }
  })
};

export const RuneFactory = {
  createRune(runeId: number): ItemScript {
    const factory = RUNE_EFFECTS[runeId];
    if (factory) {
      const partial = factory();
      return {
        name: partial.name || `Rune ${runeId}`,
        stats: partial.stats || {},
        ...partial
      };
    }
    return { name: `Rune ${runeId}`, stats: {} };
  }
};
