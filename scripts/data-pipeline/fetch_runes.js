/**
 * 룬 데이터 자동 생성기 (Korean + Raw Save)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_PATH = path.join(__dirname, '../../src/data/json/runes.json');
const RAW_DIR = path.join(__dirname, '../../src/data/json/raw');
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
    
    // ko_KR 로 변경
    const res = await fetchJson(`${DDRAGON_BASE}/cdn/${version}/data/ko_KR/runesReforged.json`);
    
    // 원본 저장
    fs.writeFileSync(path.join(RAW_DIR, 'runes_ko.json'), JSON.stringify(res, null, 2));
    console.log('Saved raw rune data to src/data/json/raw/');

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
            slot: slotIdx,
            icon: rune.icon
          };
        });
      });
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(parsedRunes, null, 2));
    console.log(`Saved ${Object.keys(parsedRunes.allRunes).length} runes in Korean to ${OUTPUT_PATH}`);

  } catch (e) {
    console.error('Error:', e);
  }
}

main();
