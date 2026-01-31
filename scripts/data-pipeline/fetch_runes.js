/**
 * 룬 데이터 자동 생성기
 * 
 * 모든 룬(키스톤, 일반 룬) 정보를 가져와서
 * 유전 알고리즘이 사용할 수 있는 JSON으로 저장합니다.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_PATH = path.join(__dirname, '../../src/data/json/runes.json');
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
    
    // 룬 정보는 runesReforged.json 에 있음
    const res = await fetchJson(`${DDRAGON_BASE}/cdn/${version}/data/en_US/runesReforged.json`);
    
    const parsedRunes = {
      trees: {},
      allRunes: {}
    };

    res.forEach(tree => {
      parsedRunes.trees[tree.key] = {
        id: tree.id,
        name: tree.name,
        key: tree.key,
        slots: tree.slots.map(slot => slot.runes.map(r => r.key))
      };

      tree.slots.forEach((slot, slotIdx) => {
        slot.runes.forEach(rune => {
          parsedRunes.allRunes[rune.key] = {
            id: rune.id,
            key: rune.key,
            name: rune.name,
            tree: tree.key,
            slot: slotIdx, // 0: 키스톤, 1-3: 일반
            icon: rune.icon
          };
        });
      });
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(parsedRunes, null, 2));
    console.log(`Saved ${Object.keys(parsedRunes.allRunes).length} runes to ${OUTPUT_PATH}`);

  } catch (e) {
    console.error('Error:', e);
  }
}

main();
