/**
 * 챔피언 데이터 자동 생성기
 * 
 * CommunityDragon API를 사용하여 모든 챔피언의 상세 데이터를 가져오고,
 * 시뮬레이터가 이해할 수 있는 Schema 포맷으로 변환합니다.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('Script started');

const OUTPUT_DIR = path.join(__dirname, '../../src/engine/simulator/data/samples');

// DataDragon API 사용
const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

// 1. 최신 버전 및 챔피언 목록 가져오기
async function fetchChampionList() {
  console.log('Fetching version...');
  const versions = await fetchJson(`${DDRAGON_BASE}/api/versions.json`);
  if (!versions || versions.length === 0) {
    console.error('Failed to fetch versions');
    return [];
  }
  const version = versions[0];
  console.log(`Latest version: ${version}`);

  console.log('Fetching champion list...');
  const res = await fetchJson(`${DDRAGON_BASE}/cdn/${version}/data/en_US/champion.json`);
  
  if (!res || !res.data) {
    console.error('Failed to fetch champion list data');
    return [];
  }

  // DataDragon은 Map 형태 ("Aatrox": { ... })로 반환하므로 배열로 변환
  const champions = Object.values(res.data).map((c) => ({
    id: c.id, // "Aatrox"
    key: c.key, // "266"
    name: c.name,
    version: version // 상위 버전 사용
  }));
  
  return champions;
}

// 2. 개별 챔피언 상세 데이터 가져오기
async function fetchChampionDetail(champ) {
  const url = `${DDRAGON_BASE}/cdn/${champ.version}/data/en_US/champion/${champ.id}.json`;
  const res = await fetchJson(url);
  return res.data[champ.id];
}

// 3. 데이터 변환 (DataDragon -> Our Schema)
function transformChampion(data) {
  const stats = data.stats;
  
  return {
    id: data.id,
    name: data.name,
    baseStats: {
      hp: stats.hp,
      hpPerLevel: stats.hpperlevel,
      mp: stats.mp,
      mpPerLevel: stats.mpperlevel,
      ad: stats.attackdamage,
      adPerLevel: stats.attackdamageperlevel,
      armor: stats.armor,
      armorPerLevel: stats.armorperlevel,
      mr: stats.spellblock,
      mrPerLevel: stats.spellblockperlevel,
      attackSpeed: stats.attackspeed,
      attackSpeedRatio: stats.attackspeedperlevel,
      range: stats.attackrange
    },
    spells: {
      P: parseSpell(data.passive, 'P'),
      Q: parseSpell(data.spells[0], 'Q'),
      W: parseSpell(data.spells[1], 'W'),
      E: parseSpell(data.spells[2], 'E'),
      R: parseSpell(data.spells[3], 'R')
    }
  };
}

// 스킬 파싱 (정밀 버전)
function parseSpell(spellData, key) {
  if (!spellData) return { id: key, name: '', cooldown: [], cost: [], effects: [] };

  const effects = [];
  const tooltip = spellData.tooltip || "";
  const vars = spellData.vars || []; // 계수 정보 (key: "a1", link: "attackdamage", coeff: 0.6)
  const effectBurn = spellData.effectBurn || []; // 기본 데미지 (e1, e2...)

  // 1. 데미지 타입 추론
  let damageType = "Physical";
  if (tooltip.includes("magic damage")) damageType = "Magical";
  else if (tooltip.includes("true damage")) damageType = "True";

  // 2. 기본 데미지 추출 (e1, e2... 중 데미지로 추정되는 것 찾기)
  // 보통 e1이 주 데미지임. 툴팁에서 {{ e1 }}을 찾으면 확실함.
  let baseDamage = [0,0,0,0,0];
  let usedEffectIndex = 1;

  if (tooltip.includes("{{ e1 }}")) {
    baseDamage = effectBurn[1] ? effectBurn[1].split('/').map(Number) : [0];
    usedEffectIndex = 1;
  } else if (tooltip.includes("{{ e2 }}")) {
    baseDamage = effectBurn[2] ? effectBurn[2].split('/').map(Number) : [0];
    usedEffectIndex = 2;
  }

  // 3. 계수 추출 (vars 배열 분석)
  const ratios = [];
  vars.forEach(v => {
    // 툴팁에 포함된 계수만 유효한 것으로 간주
    if (tooltip.includes(`{{ ${v.key} }}`)) {
      let stat = "";
      if (v.link === "attackdamage") stat = "ad";
      else if (v.link === "spelldamage") stat = "ap";
      else if (v.link === "armor") stat = "armor";
      else if (v.link === "spellblock") stat = "mr";
      else if (v.link === "health") stat = "hp";
      
      // bonusattackdamage 등은 일단 ad로 통합 (정밀도 향상 필요 시 분리)
      if (v.link && v.link.includes("attackdamage")) stat = "ad";

      if (stat) {
        // coeff가 배열일 수도 있고 숫자일 수도 있음
        const ratioVal = Array.isArray(v.coeff) ? v.coeff[0] : v.coeff;
        ratios.push({ stat, ratio: ratioVal });
      }
    }
  });

  // 데미지 스킬로 판단되면 효과 추가
  // (기본뎀이 0이 아니거나 계수가 있는 경우)
  if (baseDamage.some(d => d > 0) || ratios.length > 0) {
    effects.push({
      type: "damage",
      logic: {
        damageType: damageType,
        base: baseDamage,
        ratios: ratios
      }
    });
  }

  return {
    id: key,
    name: spellData.name,
    cooldown: spellData.cooldownBurn ? spellData.cooldownBurn.split('/').map(Number) : [10],
    cost: spellData.costBurn ? spellData.costBurn.split('/').map(Number) : [50],
    effects: effects
  };
}

// 유틸리티: JSON Fetch
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Status Code: ${res.statusCode}`));
      }

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
    });
    
    req.on('error', (err) => {
      console.error(`Network error for ${url}:`, err);
      reject(err);
    });

    req.end();
  });
}

// 메인 실행 함수
async function main() {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const champions = await fetchChampionList();
    console.log(`Found ${champions.length} champions.`);

    // 10개만 테스트로 먼저 생성
    const targets = champions; 

    for (const champ of targets) {
      try {
        console.log(`Processing ${champ.id}...`);
        const detail = await fetchChampionDetail(champ);
        const schema = transformChampion(detail);
        
        fs.writeFileSync(
          path.join(OUTPUT_DIR, `${champ.id.toLowerCase()}.json`), 
          JSON.stringify(schema, null, 2)
        );
      } catch (e) {
        console.error(`Error processing ${champ.id}:`, e);
      }
    }

    console.log('Done!');
  } catch (error) {
    console.error('Main error:', error);
  }
}

main();
