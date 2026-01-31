/**
 * 아이템 데이터 자동 생성기
 * 
 * DataDragon에서 모든 아이템 데이터를 가져와서
 * 시뮬레이터가 이해할 수 있는 JSON 포맷으로 변환합니다.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_PATH = path.join(__dirname, '../../src/data/json/items.json');
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

// 아이템 태그 분석 및 효과 파싱
function parseItemEffects(item) {
  const effects = [];
  const desc = item.description || "";
  
  // 1. 온힛 데미지 (On-Hit) 파싱 (간이 로직)
  // 예: "Basic attacks deal ... bonus magic damage"
  if (desc.includes("Basic attacks") || desc.includes("On-Hit")) {
    const isMagic = desc.includes("magic damage");
    
    // 수치 파싱 (정규식으로 기본값 추출 시도)
    const baseMatch = desc.match(/(\d+)\s+bonus/);
    const baseDmg = baseMatch ? parseInt(baseMatch[1]) : 0;

    effects.push({
      type: 'onHit',
      damageType: isMagic ? 'Magical' : 'Physical',
      base: baseDmg > 0 ? baseDmg : 15, // 기본값 없으면 15 가정
      // 계수는 텍스트에서 100% 정확히 뽑기 어려우므로, 주요 아이템은 추후 수동 보정
    });
  }

  // 2. 체력 비례 데미지 (몰왕검 등)
  if (desc.includes("current Health") || desc.includes("max Health")) {
    const percentMatch = desc.match(/(\d+)%/);
    const percent = percentMatch ? parseInt(percentMatch[1]) / 100 : 0.05;
    
    effects.push({
      type: 'onHit',
      damageType: 'Physical',
      targetHpBased: {
        type: desc.includes("current") ? 'current' : 'max',
        percent: percent
      }
    });
  }

  return effects;
}

// 메인 로직
async function main() {
  try {
    console.log('Fetching version...');
    const versions = await fetchJson(`${DDRAGON_BASE}/api/versions.json`);
    const version = versions[0];
    console.log(`Latest version: ${version}`);

    console.log('Fetching item list...');
    const res = await fetchJson(`${DDRAGON_BASE}/cdn/${version}/data/en_US/item.json`);
    const rawItems = res.data;

    const parsedItems = {};

    Object.keys(rawItems).forEach(key => {
      const item = rawItems[key];
      const id = parseInt(key);

      // 소모품, 장신구, 맵 전용 아이템 등 제외
      // 맵 11(소환사의 협곡)이 아니거나, 구매 불가(purchasable=false) 제외
      if (!item.gold.purchasable) return;
      if (item.maps && !item.maps["11"]) return; 
      if (item.tags && item.tags.includes("Consumable")) return;
      if (item.tags && item.tags.includes("Trinket")) return;

      // 스탯 변환
      const stats = {};
      if (item.stats.FlatPhysicalDamageMod) stats.ad = item.stats.FlatPhysicalDamageMod;
      if (item.stats.FlatMagicDamageMod) stats.ap = item.stats.FlatMagicDamageMod;
      if (item.stats.FlatHPPoolMod) stats.hp = item.stats.FlatHPPoolMod;
      if (item.stats.FlatArmorMod) stats.armor = item.stats.FlatArmorMod;
      if (item.stats.FlatSpellBlockMod) stats.mr = item.stats.FlatSpellBlockMod;
      if (item.stats.PercentAttackSpeedMod) stats.attackSpeed = item.stats.PercentAttackSpeedMod;
      if (item.stats.FlatCritChanceMod) stats.critChance = item.stats.FlatCritChanceMod;
      if (item.stats.FlatMovementSpeedMod) stats.movementSpeed = item.stats.FlatMovementSpeedMod;
      
      // 스킬 가속은 DataDragon 구버전 필드명이 다를 수 있음, 확인 필요
      // 최근엔 FlatCooldownReduction 대신 AbilityHaste 사용 안 함? 
      // DataDragon은 아직 스탯 필드가 구형일 수 있음. 설명 텍스트에서 파싱해야 할 수도.
      
      parsedItems[id] = {
        id: id,
        name: item.name,
        description: item.plaintext, // 간단 설명
        price: item.gold.total,
        from: item.from, // 하위 아이템 ID 목록
        tags: item.tags,
        stats: stats,
        effects: parseItemEffects(item)
      };
    });

    console.log(`Parsed ${Object.keys(parsedItems).length} items.`);
    
    // 파일 저장
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(parsedItems, null, 2));
    console.log(`Saved to ${OUTPUT_PATH}`);

  } catch (e) {
    console.error('Error:', e);
  }
}

main();
