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
  3: 'bonusAd', // Sometimes 3? Need verification.
  5: 'bonusAttackSpeed',
  // Add more as discovered
};

async function convertChampions() {
  try {
    // 1. Load DDragon Data (Base Stats Source)
    const ddragonPath = path.join(RAW_DIR, 'ddragon_championFull.json');
    const ddragonData = JSON.parse(await fs.readFile(ddragonPath, 'utf-8'));
    const champions = Object.values(ddragonData.data);

    console.log(`Loaded ${champions.length} champions from DataDragon.`);

    for (const champ of champions as any[]) {
      const alias = champ.id; // DDragon ID is the alias (e.g. "Ahri")
      // const key = champ.key;  // Numeric ID (e.g. "103")
      
      // Load Bin Data (Spell Data Source)
      // Bin files are named by CDragon alias which usually matches DDragon ID
      // But we need to handle case sensitivity. CDragon uses PascalCase usually for file names?
      // Fetcher saved as `summary.alias`. Usually PascalCase.
      
      // Try to find the bin file case-insensitively
      const binFiles = await fs.readdir(BIN_DIR);
      const targetBinFile = binFiles.find(f => f.toLowerCase() === `${alias.toLowerCase()}.bin.json`);
      
      let binData: any = {};
      if (targetBinFile) {
        try {
          binData = JSON.parse(await fs.readFile(path.join(BIN_DIR, targetBinFile), 'utf-8'));
        } catch (e) {
          console.warn(`Failed to parse bin data for ${alias}`);
        }
      } else {
        // console.warn(`Bin data not found for ${alias} (File missing)`);
      }

      // 1. Base Stats (From DDragon)
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
        attackSpeedRatio: champ.stats.attackspeedratio || champ.stats.attackspeed, // Fallback
        range: champ.stats.attackrange,
        moveSpeed: champ.stats.movespeed
      };

      // 2. Spells
      const spells: any = { P: {}, Q: {}, W: {}, E: {}, R: {} };
      
      // Parse Passive
      spells.P = {
        id: 'P',
        name: champ.passive.name,
        cooldown: [0],
        cost: [0],
        effects: [] 
      };

      // Parse Q, W, E, R
      ['Q', 'W', 'E', 'R'].forEach((spellKey, idx) => {
        // DDragon spells array is ordered Q, W, E, R
        const ddragonSpell = champ.spells[idx];
        if (!ddragonSpell) return;

        spells[spellKey] = {
            id: spellKey,
            name: ddragonSpell.name,
            cooldown: ddragonSpell.cooldown,
            cost: ddragonSpell.cost, // DDragon has cost array
            range: ddragonSpell.range,
            effects: []
        };
        
        // Find Spell Data in Bin
        // CDragon Keys: Characters/{Alias}/Spells/{Alias}{Key}Ability/{Alias}{Key}
        // Alias is usually the DDragon ID (PascalCase)
        
        // Special case: Wukong is MonkeyKing in CDragon/Bin keys
        let binAlias = alias;
        if (alias === 'Wukong') binAlias = 'MonkeyKing'; // Mapping if needed
        // Renekton -> Renekton.
        
        // Try multiple patterns
        const patterns = [
            `Characters/${binAlias}/Spells/${binAlias}${spellKey}Ability/${binAlias}${spellKey}`,
            `Characters/${binAlias}/Spells/${binAlias}${spellKey}`, // Old pattern
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
            const logic = parseDamageLogic(binSpell.mSpell);
            if (logic) {
                spells[spellKey].effects.push({
                    type: 'damage',
                    logic: logic
                });
            }
        }
      });

      // Construct Final JSON
      const result = {
        id: alias,
        name: champ.name,
        baseStats,
        spells
      };

      await fs.writeFile(path.join(OUTPUT_DIR, `${alias}.json`), JSON.stringify(result, null, 2));
      // console.log(`Converted ${alias}`);
    }
    console.log(`Conversion complete. Processed ${champions.length} champions.`);
  } catch (error) {
    console.error('Conversion Error:', error);
  }
}

function parseCoefficients(coeffs: number[]): number[] {
    return coeffs ? coeffs.slice(0, 5) : []; // Usually 5 levels, CDragon gives more sometimes
}

function parseDamageLogic(mSpell: any): any {
    // Try to find "TotalDamage" or similar in mSpellCalculations
    // Defaulting to first calculation that looks like damage
    
    if (!mSpell.mSpellCalculations) return null;

    const calcKeys = Object.keys(mSpell.mSpellCalculations);
    // Prioritize "TotalDamage", "Damage", "MaxDamage"
    const targetKey = calcKeys.find(k => k.includes('Damage') && !k.includes('Tool')) || calcKeys[0];
    
    if (!targetKey) return null;

    const calculation = mSpell.mSpellCalculations[targetKey];
    const logic: any = {
        damageType: 'Magical', // Default, infer from somewhere else if possible (tacticalInfo.damageType?)
        base: [],
        scalings: []
    };

    if (calculation.mFormulaParts) {
        calculation.mFormulaParts.forEach((part: any) => {
            // Base Damage (DataValue)
            if (part.__type === 'NamedDataValueCalculationPart' && part.mDataValue) {
                const dataValue = mSpell.DataValues?.find((d: any) => d.mName === part.mDataValue);
                if (dataValue && dataValue.mValues) {
                    // mValues often [0, lv1, lv2...] or [lv1, lv2...]
                    // We assume 1-based index usually for levels 1-5
                    logic.base = dataValue.mValues.slice(1, 6); 
                }
            }
            // Scaling (Coefficient)
            else if (part.__type === 'StatByCoefficientCalculationPart') {
                 // mStat: 2=AP, 0=TotalAD?
                 // If mStat is undefined, check mCoefficient.
                 // Heuristic: if mCoefficient is defined, look for mStat.
                 const statType = STAT_MAPPING[part.mStat] || 'ap'; // Default to AP if unknown? Risky.
                 // Actually, if mStat is missing, it's often implied by the context or it's a fixed value?
                 // Let's default to 'ap' only if reasonable or skip.
                 
                 // Note: Ahri's bin showed mCoefficient: 0.5 without mStat.
                 // If mStat is missing, we might assume AP for mages?
                 // Let's check logic.damageType later.
                 
                 logic.scalings.push({
                     stat: part.mStat !== undefined ? STAT_MAPPING[part.mStat] : 'ap', // Fallback
                     ratio: part.mCoefficient || 0
                 });
            }
        });
    }

    return logic;
}

convertChampions();