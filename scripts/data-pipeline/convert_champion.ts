import fs from 'fs/promises';
import path from 'path';

const RAW_DIR = path.join(process.cwd(), 'src/engine/simulator/data/raw/champions');
const BIN_DIR = path.join(process.cwd(), 'src/engine/simulator/data/raw/bin');
const OUTPUT_DIR = path.join(process.cwd(), 'src/engine/simulator/data/samples');

// Stat Type Mapping (Heuristic based on community knowledge)
const STAT_MAPPING: Record<number, string> = {
  2: 'ap',
  1: 'bonusAd', // Often bonus AD
  0: 'ad',      // Total AD
  3: 'bonusAd', 
  5: 'bonusAttackSpeed',
};

// DDragon vars link mapping
const LINK_MAPPING: Record<string, string> = {
  'attackdamage': 'ad',
  'bonusattackdamage': 'bonusAd',
  'spelldamage': 'ap',
  'armor': 'armor',
  'bonusarmor': 'bonusArmor',
  'spellblock': 'mr',
  'bonusspellblock': 'bonusMr',
  'bonushealth': 'bonusHp',
  'health': 'hp',
  'critchance': 'critChance',
  'attackSpeed': 'attackSpeed'
};

const TRANSFORMATION_MAP: Record<string, Record<string, string[]>> = {
  'Nidalee': {
    'Q_Form2': ['Characters/Nidalee/Spells/Takedown'],
    'W_Form2': ['Characters/Nidalee/Spells/Pounce'],
    'E_Form2': ['Characters/Nidalee/Spells/Swipe']
  },
  'Jayce': {
    'Q_Form2': ['Characters/Jayce/Spells/JayceToTheSkiesAbility/JayceToTheSkies'],
    'W_Form2': ['Characters/Jayce/Spells/JayceStaticFieldAbility/JayceStaticField'],
    'E_Form2': ['Characters/Jayce/Spells/JayceThunderingBlowAbility/JayceThunderingBlow']
  }
};

const PET_OVERRIDES: any = {
  'Heimerdinger': {
    'Q': {
      effects: [
        {
          type: 'damage',
          logic: {
            damageType: 'Magical',
            base: [6, 9, 12, 15, 18],
            scalings: [{ stat: 'ap', ratio: 0.35 }],
            onHitEffectiveness: 1 // Attacks count as hits? No, pet attacks usually don't apply on-hit unless specified
          }
        },
        {
          type: 'damage',
          logic: {
            damageType: 'Magical',
            base: [40, 60, 80, 100, 120],
            scalings: [{ stat: 'ap', ratio: 0.55 }]
          }
        }
      ]
    }
  },
  'Zyra': {
    'W': {
        effects: [
            {
                type: 'damage',
                logic: {
                    damageType: 'Magical',
                    levelScaling: true,
                    // Lv 1-18: 20~100 (Approx linear)
                    base: Array.from({length: 18}, (_, i) => 20 + i * 4.7), 
                    scalings: [{ stat: 'ap', ratio: 0.15 }]
                }
            }
        ]
    }
  },
  'Yorick': {
      'Q': {
          effects: [
              {
                  type: 'damage',
                  logic: {
                      damageType: 'Physical',
                      levelScaling: true,
                      base: Array.from({length: 18}, (_, i) => 2 + i * 5), // 2-88 approx
                      scalings: [{ stat: 'ad', ratio: 0.25 }]
                  }
              }
          ]
      }
  },
  'Malzahar': {
      'W': {
          effects: [
              {
                  type: 'damage',
                  logic: {
                      damageType: 'Magical', // Changed to Magical (Voidlings deal magic?) Wait, usually Physical?
                      // Wiki: Magic Damage.
                      base: [12, 14, 16, 18, 20],
                      scalings: [
                          { stat: 'bonusAd', ratio: 0.40 },
                          { stat: 'ap', ratio: 0.20 }
                      ]
                  }
              }
          ]
      }
  }
};

async function convertChampions() {
  try {
    const ddragonPath = path.join(RAW_DIR, 'ddragon_championFull.json');
    const ddragonData = JSON.parse(await fs.readFile(ddragonPath, 'utf-8'));
    const champions = Object.values(ddragonData.data);

    console.log(`Loaded ${champions.length} champions from DataDragon.`);

    // Load Bin Files List once
    let binFiles: string[] = [];
    try {
        binFiles = await fs.readdir(BIN_DIR);
    } catch (e) {
        console.warn('Bin directory not found or empty.');
    }

    for (const champ of champions as any[]) {
      const alias = champ.id; 

      // Load Bin Data (Lazy)
      let binData: any = {};
      const targetBinFile = binFiles.find(f => f.toLowerCase() === `${alias.toLowerCase()}.bin.json`);
      if (targetBinFile) {
        try {
          binData = JSON.parse(await fs.readFile(path.join(BIN_DIR, targetBinFile), 'utf-8'));
        } catch (e) { /* ignore */ }
      }

      // 1. Base Stats
      const baseStats = {
        hp: champ.stats.hp,
        hpPerLevel: champ.stats.hpperlevel,
        mp: champ.stats.mp,
        mpPerLevel: champ.stats.mpperlevel,
        ad: champ.stats.attackdamage,
        adPerLevel: champ.stats.attackdamageperlevel,
        armor: champ.stats.armor,
        armorPerLevel: champ.stats.armorperlevel,
        mr: champ.stats.spellblock,
        mrPerLevel: champ.stats.spellblockperlevel,
        attackSpeed: champ.stats.attackspeed,
        attackSpeedRatio: champ.stats.attackspeedratio || champ.stats.attackspeed,
        range: champ.stats.attackrange,
        moveSpeed: champ.stats.movespeed
      };

      // 2. Spells
      const spells: any = { P: {}, Q: {}, W: {}, E: {}, R: {} };
      
      spells.P = {
        id: 'P',
        name: champ.passive.name,
        cooldown: [0], cost: [0], effects: [] 
      };

      ['Q', 'W', 'E', 'R'].forEach((spellKey, idx) => {
        const spell = champ.spells[idx];
        if (!spell) return;

        // Damage Type Inference
        let damageType = 'Physical';
        const tooltipLower = spell.tooltip.toLowerCase();
        if (tooltipLower.includes('magic damage')) damageType = 'Magical';
        else if (tooltipLower.includes('true damage')) damageType = 'True';
        else if (tooltipLower.includes('physical damage')) damageType = 'Physical';
        
        // Base Damage (DDragon)
        const baseDamage = spell.effect[1] || [];

        // Scalings (DDragon)
        const scalings: any[] = [];
        if (spell.vars && spell.vars.length > 0) {
            spell.vars.forEach((v: any) => {
                const stat = LINK_MAPPING[v.link];
                if (stat) {
                    scalings.push({
                        stat: stat,
                        ratio: v.coeff
                    });
                }
            });
        }

        // Cost and CostType Inference
        let costType: any = 'Mana';
        let costRatio: number[] = [];
        
        const partype = champ.partype.toLowerCase();
        if (partype.includes('energy')) costType = 'Energy';
        else if (partype.includes('none') || partype.includes('crimson') || partype.includes('health')) {
            // Check spell resource string for Health costs
            const resource = spell.resource.toLowerCase();
            if (resource.includes('current health')) costType = 'CurrentHealth';
            else if (resource.includes('max health')) costType = 'MaxHealth';
            else if (resource.includes('health')) costType = 'Health';
            else if (resource.includes('no cost')) costType = 'None';
            else costType = 'None';
        }

        // Try to find cost ratios in effect (Legacy DDragon parsing)
        if (costType === 'CurrentHealth' || costType === 'MaxHealth') {
            const eMatch = spell.resource.match(/{{ e(\d+) }}/);
            if (eMatch) {
                const eIdx = parseInt(eMatch[1]);
                const vals = spell.effect[eIdx];
                if (vals) costRatio = vals.map((v: number) => v / 100);
            }
        }

        // Fallback to Bin Data if DDragon is insufficient
        // Condition: No scalings AND (No base damage OR base damage is all 0)
        const isDDragonMissing = scalings.length === 0 && (!baseDamage || baseDamage.length === 0 || baseDamage.every((v:any) => v === 0));
        
        let logic: any = {
            damageType: damageType,
            base: baseDamage,
            scalings: scalings
        };

        if (targetBinFile) {
            let binAlias = alias;
            if (alias === 'Wukong') binAlias = 'MonkeyKing'; 
            
            // Try keys for main spell and alt forms
            const patterns = [
                `Characters/${binAlias}/Spells/${binAlias}${spellKey}Ability/${binAlias}${spellKey}`,
                `Characters/${binAlias}/Spells/${binAlias}${spellKey}`, 
                `Characters/${binAlias}/Spells/${binAlias}${spellKey}Ability`
            ];

            let binSpell: any = null;
            for (const p of patterns) {
                if (binData[p]) {
                    binSpell = binData[p];
                    break;
                }
            }

            if (binSpell && binSpell.mSpell) {
                let binLogic = parseDamageLogic(binSpell.mSpell);
                if (!binLogic) binLogic = parseLegacyDamageLogic(binSpell.mSpell);
                
                if (binLogic && isDDragonMissing) {
                    logic = binLogic;
                    logic.damageType = damageType;
                }

                // Extract Health Cost from Bin if DDragon failed
                if (costRatio.length === 0 && binSpell.mSpell.DataValues) {
                    const hCost = binSpell.mSpell.DataValues.find((dv: any) => 
                        dv.mName.toLowerCase().includes('healthcost') || 
                        dv.mName.toLowerCase() === 'cost'
                    );
                    if (hCost) {
                        costRatio = hCost.mValues.slice(1, 6);
                        // If values are large (e.g. 20, 30), they are percentages. If small (0.2), already ratios.
                        if (costRatio.some(v => v > 1)) costRatio = costRatio.map(v => v / 100);
                    }
                }
            }
        }

        let effects = [
            {
                type: 'damage',
                logic: logic
            }
        ];

        // Apply Pet Overrides
        if (PET_OVERRIDES[alias] && PET_OVERRIDES[alias][spellKey]) {
            const override = PET_OVERRIDES[alias][spellKey];
            if (override.effects) {
                effects = override.effects;
            }
        }

        spells[spellKey] = {
            id: spellKey,
            name: spell.name,
            cooldown: spell.cooldown,
            cost: spell.cost,
            costType: costType,
            costRatio: costRatio.length > 0 ? costRatio : undefined,
            range: spell.range,
            effects: effects
        };
      });

      // Process Transformation Spells (Alt Forms)
      if (TRANSFORMATION_MAP[alias] && targetBinFile) {
        for (const [key, paths] of Object.entries(TRANSFORMATION_MAP[alias])) {
            let binSpell: any = null;
            for (const p of paths) {
                if (binData[p]) {
                    binSpell = binData[p];
                    break;
                }
            }

            if (binSpell && binSpell.mSpell) {
                let binLogic = parseDamageLogic(binSpell.mSpell);
                if (!binLogic) {
                    binLogic = parseLegacyDamageLogic(binSpell.mSpell);
                }

                if (binLogic) {
                    spells[key] = {
                        id: key,
                        name: `${key} (Form 2)`,
                        cooldown: [0], // 쿨타임은 기본 스킬 공유하거나 별도 설정 필요하지만 여기선 0
                        cost: [0],
                        range: [0],
                        effects: [
                            {
                                type: 'damage',
                                logic: binLogic
                            }
                        ]
                    };
                }
            }
        }
      }

      const result = {
        id: alias,
        name: champ.name,
        baseStats,
        spells
      };

      await fs.writeFile(path.join(OUTPUT_DIR, `${alias}.json`), JSON.stringify(result, null, 2));
    }
    console.log(`Conversion complete using DDragon (Hybrid).`);
  } catch (error) {
    console.error('Conversion Error:', error);
  }
}

function parseLegacyDamageLogic(mSpell: any): any {
    const logic: any = {
        damageType: 'Physical', // Default
        base: [],
        scalings: []
    };

    // 1. Base Damage (Heuristic)
    if (mSpell.mEffectAmount) {
        // Try index 1 first, then 2. (Indices 0-6 in values array usually correspond to levels 0-6? Or 1-5?)
        // Raw values usually [0, val1, val2, val3, val4, val5, val6]
        const c1 = mSpell.mEffectAmount[1]?.value;
        const c2 = mSpell.mEffectAmount[2]?.value;
        
        // Pick one that looks like damage (e.g. max value > 20)
        const max1 = c1 ? Math.max(...c1) : 0;
        const max2 = c2 ? Math.max(...c2) : 0;
        
        // If max2 is significantly larger, use it. Else use c1.
        if (max2 > 20 && max2 > max1) logic.base = c2.slice(1, 6);
        else if (c1) logic.base = c1.slice(1, 6);
    }

    // 2. Scalings (DataValues)
    if (mSpell.DataValues) {
        mSpell.DataValues.forEach((dv: any) => {
            const name = dv.mName.toLowerCase();
            let statType = '';
            if (name.includes('totalad')) statType = 'ad';
            else if (name.includes('bonusad')) statType = 'bonusAd';
            else if (name.includes('ap') || name.includes('ability')) statType = 'ap';
            else if (name.includes('health') || name.includes('hp')) statType = 'bonusHp';
            
            if (statType) {
                // Use first non-zero value or standard slice?
                // mValues is usually uniform for ratios
                const ratio = dv.mValues[1] || dv.mValues[0] || 0;
                logic.scalings.push({
                    stat: statType,
                    ratio: ratio
                });
            }
        });
    }

    // 3. Coefficients (Fallback for AP)
    const hasAP = logic.scalings.some((s: any) => s.stat === 'ap');
    if (!hasAP) {
        if (mSpell.mCoefficient2 > 0) {
             logic.scalings.push({ stat: 'ap', ratio: mSpell.mCoefficient2 });
        } else if (mSpell.mCoefficient > 0) {
             // Heuristic: If mCoefficient exists but no scalings found at all, assume AP
             if (logic.scalings.length === 0) {
                 logic.scalings.push({ stat: 'ap', ratio: mSpell.mCoefficient });
             }
        }
    }

    return logic;
}

function parseDamageLogic(mSpell: any): any {
    if (!mSpell.mSpellCalculations) return null;

    const calcKeys = Object.keys(mSpell.mSpellCalculations);
    const targetKey = calcKeys.find(k => k.includes('Damage') && !k.includes('Tool')) || calcKeys[0];
    
    if (!targetKey) return null;

    const calculation = mSpell.mSpellCalculations[targetKey];
    const logic: any = {
        damageType: 'Physical', // Default
        base: [],
        scalings: []
    };

    if (calculation.mFormulaParts) {
        calculation.mFormulaParts.forEach((part: any) => {
            // 1. Base Damage (NamedDataValue)
            if (part.__type === 'NamedDataValueCalculationPart' && part.mDataValue) {
                const dataValue = mSpell.DataValues?.find((d: any) => d.mName === part.mDataValue);
                if (dataValue && dataValue.mValues) {
                    logic.base = dataValue.mValues.slice(1, 6); 
                }
            }
            // 2. Scaling (Coefficient)
            else if (part.__type === 'StatByCoefficientCalculationPart') {
                 let statType = STAT_MAPPING[part.mStat] || 'ap'; 
                 logic.scalings.push({
                     stat: statType,
                     ratio: part.mCoefficient || 0
                 });
            }
            // 3. Scaling (NamedDataValue - e.g. Garen Q tADRatio)
            else if (part.__type === 'StatByNamedDataValueCalculationPart') {
                const name = part.mDataValue.toLowerCase();
                let statType = 'ap';
                
                // Heuristic Name Matching
                if (name.includes('ad') || name.includes('attackdamage')) {
                    statType = name.includes('bonus') ? 'bonusAd' : 'ad';
                } else if (name.includes('ap') || name.includes('spell')) {
                    statType = 'ap';
                } else if (name.includes('hp') || name.includes('health')) {
                    statType = name.includes('bonus') ? 'bonusHp' : 'hp';
                } else if (name.includes('armor')) {
                    statType = name.includes('bonus') ? 'bonusArmor' : 'armor';
                } else if (part.mStat !== undefined) {
                    statType = STAT_MAPPING[part.mStat] || 'ap';
                }

                const dataValue = mSpell.DataValues?.find((d: any) => d.mName === part.mDataValue);
                const ratios = dataValue?.mValues?.slice(1, 6) || [0];
                
                logic.scalings.push({
                    stat: statType,
                    ratio: ratios // V2 schema supports array ratio
                });
            }
        });
    }

    return logic;
}

convertChampions();
