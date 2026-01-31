/**
 * 규칙 자동 생성기 (Rule Generator)
 *
 * 통계 데이터(JSON)를 바탕으로 YAML 규칙 파일을 대량 생산합니다.
 */

const fs = require('fs');
const path = require('path');

// 가상의 매치업 통계 데이터 (나중엔 API로 대체)
const MATCHUP_STATS = [
  { myChamp: 'Katarina', enemyChamp: 'Kassadin', winRate: 0.42, laneKillRate: 0.35, notes: 'Magic Shield' },
  { myChamp: 'Katarina', enemyChamp: 'Galio', winRate: 0.44, laneKillRate: 0.30, notes: 'Taunt' },
  { myChamp: 'Zed', enemyChamp: 'Malphite', winRate: 0.45, laneKillRate: 0.40, notes: 'Armor Stack' },
  { myChamp: 'Vayne', enemyChamp: 'Teemo', winRate: 0.48, laneKillRate: 0.45, notes: 'Blind' },
];

function generateRules() {
  let yamlContent = '# Auto-generated Matchup Rules\n\n';

  MATCHUP_STATS.forEach(match => {
    // 1. 어려운 상성일 때 방어적 플레이 규칙
    if (match.winRate < 0.48) {
      yamlContent += `- id: vs-${match.enemyChamp.toLowerCase()}-defensive\n`;
      yamlContent += `  name: ${match.enemyChamp} 상대 방어 전략\n`;
      yamlContent += `  priority: 70\n`;
      yamlContent += `  triggers: [${match.myChamp}]\n`;
      yamlContent += `  condition:\n`;
      yamlContent += `    type: EnemyLanerIs\n`;
      yamlContent += `    values: [${match.enemyChamp}]\n`;
      yamlContent += `  action:\n`;
      yamlContent += `    type: ChangeStrategy\n`;
      yamlContent += `    value: DEFENSIVE_FARM\n\n`;
    }

    // 2. 특수 카운터 아이템 규칙
    if (match.notes.includes('Magic Shield') || match.notes.includes('Taunt')) {
      yamlContent += `- id: vs-${match.enemyChamp.toLowerCase()}-item\n`;
      yamlContent += `  name: ${match.enemyChamp} 카운터 아이템\n`;
      yamlContent += `  priority: 80\n`;
      yamlContent += `  triggers: [${match.myChamp}]\n`;
      yamlContent += `  condition:\n`;
      yamlContent += `    type: EnemyLanerIs\n`;
      yamlContent += `    values: [${match.enemyChamp}]\n`;
      yamlContent += `  action:\n`;
      yamlContent += `    type: RecommendItems\n`;
      yamlContent += `    items:\n`;
      yamlContent += `      - id: 3156 # 맬모셔스 (AD) 또는 밴시 (AP)\n`;
      yamlContent += `        dynamicId: SpellShield\n`; // 추후 동적 처리
      yamlContent += `        slot: situational\n`;
      yamlContent += `        reason: "${match.enemyChamp}의 스킬셋을 카운터치기 위해 필요"\n`;
      yamlContent += `        score: 0.85\n\n`;
    }
  });

  const outputPath = path.join(__dirname, '../../src/data/rules/generated_matchups.yaml');
  fs.writeFileSync(outputPath, yamlContent);
  console.log(`Generated rules at ${outputPath}`);
}

generateRules();
