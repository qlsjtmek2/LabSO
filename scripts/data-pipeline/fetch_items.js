/**
 * 아이템 데이터 자동 생성기 (Enhanced + Multilingual + Raw Save)
 * 
 * ko_KR 데이터에서 이름과 설명을 가져오고,
 * en_US 데이터에서 정밀 스탯을 파싱하여 병합합니다.
 * 원본 데이터도 별도로 저장하여 검증에 사용합니다.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_PATH = path.join(__dirname, '../../src/data/json/items.json');
const RAW_DIR = path.join(__dirname, '../../src/data/json/raw');
const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

// 유틸리티: JSON Fetch
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.error(`Failed to parse JSON from ${url}`);
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

function cleanDescription(desc) {
  if (!desc) return "";
  let clean = desc.replace(/<br\s*\/?>/gi, '\n');
  clean = clean.replace(/<[^>]+>/g, '');
  return clean;
}

function parseStatsFromEnglishDesc(desc, stats) {
  const cleanDesc = cleanDescription(desc);
  
  const patterns = [
    { key: 'abilityHaste', regex: /(\d+)\s+Ability Haste/i },
    { key: 'lifesteal', regex: /(\d+)%\s+Life Steal/i, percent: true },
    { key: 'omnivamp', regex: /(\d+)%\s+Omnivamp/i, percent: true },
    { key: 'lethality', regex: /(\d+)\s+Lethality/i },
    { key: 'magicPenFlat', regex: /(\d+)\s+Magic Penetration/i },
    { key: 'magicPenPercent', regex: /(\d+)%\s+Magic Penetration/i, percent: true },
    { key: 'armorPen', regex: /(\d+)%\s+Armor Penetration/i, percent: true },
    { key: 'critChance', regex: /(\d+)%\s+Critical Strike Chance/i, percent: true },
    { key: 'movementSpeedPercent', regex: /(\d+)%\s+Move Speed/i, percent: true },
    { key: 'tenacity', regex: /(\d+)%\s+Tenacity/i, percent: true }
  ];

  patterns.forEach(p => {
    const match = cleanDesc.match(p.regex);
    if (match) {
      let val = parseFloat(match[1]);
      if (p.percent) val /= 100;
      if (!stats[p.key]) stats[p.key] = val;
    }
  });

  return stats;
}

function parseItemEffects(enDesc) {
  const effects = [];
  const cleanDesc = cleanDescription(enDesc);
  
  const onHitRegex = /Basic attacks deal\s+(\d+)\s+bonus\s+(physical|magic) damage/i;
  const onHitMatch = cleanDesc.match(onHitRegex);
  if (onHitMatch) {
    effects.push({
      type: 'onHit',
      damageType: onHitMatch[2].toLowerCase() === 'magic' ? 'Magical' : 'Physical',
      base: parseInt(onHitMatch[1])
    });
  }

  const hpMatch = cleanDesc.match(/(\d+)%\s+(current|max)\s+Health/i);
  if (hpMatch) {
    effects.push({
      type: 'onHit',
      damageType: 'Physical',
      targetHpBased: {
        type: hpMatch[2].toLowerCase() === 'current' ? 'current' : 'max',
        percent: parseInt(hpMatch[1]) / 100
      }
    });
  }

  if (cleanDesc.match(/After using an ability, your next attack/i)) {
     effects.push({ type: 'spellblade' });
  }

  return effects;
}

async function main() {
  try {
    console.log('Fetching version...');
    const versions = await fetchJson(`${DDRAGON_BASE}/api/versions.json`);
    const version = versions[0];
    console.log(`Latest version: ${version}`);

    console.log('Fetching item lists (ko_KR and en_US)...');
    const [koRes, enRes] = await Promise.all([
      fetchJson(`${DDRAGON_BASE}/cdn/${version}/data/ko_KR/item.json`),
      fetchJson(`${DDRAGON_BASE}/cdn/${version}/data/en_US/item.json`)
    ]);

    const koData = koRes.data;
    const enData = enRes.data;

    // 원본 데이터 저장
    fs.writeFileSync(path.join(RAW_DIR, 'items_ko.json'), JSON.stringify(koData, null, 2));
    fs.writeFileSync(path.join(RAW_DIR, 'items_en.json'), JSON.stringify(enData, null, 2));
    console.log('Saved raw item data to src/data/json/raw/');

    const parsedItems = {};

    Object.keys(koData).forEach(key => {
      const itemKo = koData[key];
      const itemEn = enData[key];
      if (!itemEn) return;

      const id = parseInt(key);

      if (!itemKo.gold.purchasable) return;
      if (itemKo.maps && !itemKo.maps["11"]) return; 
      if (itemKo.tags && (itemKo.tags.includes("Consumable") || itemKo.tags.includes("Trinket"))) return;

      const stats = {};
      if (itemKo.stats.FlatPhysicalDamageMod) stats.ad = itemKo.stats.FlatPhysicalDamageMod;
      if (itemKo.stats.FlatMagicDamageMod) stats.ap = itemKo.stats.FlatMagicDamageMod;
      if (itemKo.stats.FlatHPPoolMod) stats.hp = itemKo.stats.FlatHPPoolMod;
      if (itemKo.stats.FlatMPPoolMod) stats.mana = itemKo.stats.FlatMPPoolMod;
      if (itemKo.stats.FlatArmorMod) stats.armor = itemKo.stats.FlatArmorMod;
      if (itemKo.stats.FlatSpellBlockMod) stats.mr = itemKo.stats.FlatSpellBlockMod;
      if (itemKo.stats.PercentAttackSpeedMod) stats.attackSpeed = itemKo.stats.PercentAttackSpeedMod;
      if (itemKo.stats.FlatCritChanceMod) stats.critChance = itemKo.stats.FlatCritChanceMod;
      if (itemKo.stats.FlatMovementSpeedMod) stats.movementSpeed = itemKo.stats.FlatMovementSpeedMod;
      
      parseStatsFromEnglishDesc(itemEn.description, stats);
      
      parsedItems[id] = {
        id: id,
        name: itemKo.name,
        description: cleanDescription(itemKo.description),
        price: itemKo.gold.total,
        from: itemKo.from,
        tags: itemKo.tags,
        stats: stats,
        effects: parseItemEffects(itemEn.description)
      };
    });

    console.log(`Parsed ${Object.keys(parsedItems).length} items.`);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(parsedItems, null, 2));
    console.log(`Saved parsed items to ${OUTPUT_PATH}`);

  } catch (e) {
    console.error('Error:', e);
  }
}

main();