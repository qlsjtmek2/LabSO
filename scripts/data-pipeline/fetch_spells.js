/**
 * 스펠 데이터 자동 생성기
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_PATH = path.join(__dirname, '../../src/data/json/spells.json');
const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  try {
    const versions = await fetchJson(`${DDRAGON_BASE}/api/versions.json`);
    const version = versions[0];
    const res = await fetchJson(`${DDRAGON_BASE}/cdn/${version}/data/en_US/summoner.json`);
    
    const spells = {};
    Object.values(res.data).forEach(s => {
      // 소환사의 협곡 스펠만 필터링
      if (!s.modes.includes("CLASSIC")) return;

      spells[s.id] = {
        id: s.id,
        name: s.name,
        cooldown: s.cooldown[0],
        description: s.description
      };
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(spells, null, 2));
    console.log(`Saved ${Object.keys(spells).length} spells to ${OUTPUT_PATH}`);
  } catch (e) { console.error(e); }
}

main();
