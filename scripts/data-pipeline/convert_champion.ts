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

        // Fallback to Bin Data if DDragon is insufficient
        // Condition: No scalings AND (No base damage OR base damage is all 0)
        const isDDragonMissing = scalings.length === 0 && (!baseDamage || baseDamage.length === 0 || baseDamage.every((v:any) => v === 0));
        
        let logic: any = {
            damageType: damageType,
            base: baseDamage,
            scalings: scalings
        };

        if (isDDragonMissing && targetBinFile) {
            let binAlias = alias;
            if (alias === 'Wukong') binAlias = 'MonkeyKing'; 
            
            // Try keys
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
                const binLogic = parseDamageLogic(binSpell.mSpell);
                if (binLogic) {
                    // Merge: Use Bin logic but keep DDragon damageType if reliable
                    logic = binLogic;
                    logic.damageType = damageType;
                }
            }
        }

        spells[spellKey] = {
            id: spellKey,
            name: spell.name,
            cooldown: spell.cooldown,
            cost: spell.cost,
            range: spell.range,
            effects: [
                {
                    type: 'damage',
                    logic: logic
                }
            ]
        };
      });

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
