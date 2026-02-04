/**
 * 챔피언 클래스별 평균 스탯 계산 스크립트
 *
 * 사용법: npx ts-node scripts/calculateClassAverages.ts
 * 출력: src/data/dummyPresets.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ChampionBaseStats {
  hp: number;
  hpPerLevel: number;
  mp: number;
  mpPerLevel: number;
  ad: number;
  adPerLevel: number;
  armor: number;
  armorPerLevel: number;
  mr: number;
  mrPerLevel: number;
  attackSpeed: number;
  range: number;
  moveSpeed: number;
}

interface ChampionData {
  id: string;
  name: string;
  roles: string[];
  baseStats: ChampionBaseStats;
}

// 챔피언 분류 (LoL 공식 분류 기반)
type ChampionClass = 'Squishy' | 'Bruiser' | 'Tank';

// 역할별 분류 매핑
const ROLE_TO_CLASS: Record<string, ChampionClass> = {
  // Squishy (물몸)
  'Mage': 'Squishy',
  'Marksman': 'Squishy',
  'Assassin': 'Squishy',

  // Bruiser (브루저)
  'Fighter': 'Bruiser',
  'Skirmisher': 'Bruiser',

  // Tank (탱커)
  'Tank': 'Tank',
  'Juggernaut': 'Tank',
  'Vanguard': 'Tank',
  'Warden': 'Tank',

  // 기타 (기본 브루저로)
  'Support': 'Squishy', // 서포터는 대체로 물몸
  'Specialist': 'Bruiser'
};

// 레벨별 스탯 계산 (LoL 성장 공식)
function calculateStatAtLevel(base: number, perLevel: number, level: number): number {
  return base + perLevel * (level - 1) * (0.7025 + 0.0175 * (level - 1));
}

// 레벨별 평균 골드 (LoL 일반적인 골드 커브)
const GOLD_BY_LEVEL: Record<number, number> = {
  1: 500,
  2: 800,
  3: 1200,
  4: 1600,
  5: 2100,
  6: 2700,
  7: 3400,
  8: 4200,
  9: 5100,
  10: 6000,
  11: 7000,
  12: 8100,
  13: 9300,
  14: 10600,
  15: 12000,
  16: 13500,
  17: 15000,
  18: 16500
};

// 골드 -> 추가 스탯 변환 (아이템 효율 기반)
function goldToStats(gold: number, championClass: ChampionClass): { hp: number; armor: number; mr: number } {
  switch (championClass) {
    case 'Tank':
      // 탱커: 체력 + 방저 + 마저 우선
      return {
        hp: gold * 0.15,      // 1500 골드 = 225 HP
        armor: gold * 0.012,  // 1500 골드 = 18 방어력
        mr: gold * 0.008      // 1500 골드 = 12 마저
      };
    case 'Bruiser':
      // 브루저: 체력 + 약간의 방어
      return {
        hp: gold * 0.10,      // 1500 골드 = 150 HP
        armor: gold * 0.008,  // 1500 골드 = 12 방어력
        mr: gold * 0.004      // 1500 골드 = 6 마저
      };
    case 'Squishy':
    default:
      // 물몸: 최소한의 방어 스탯
      return {
        hp: gold * 0.05,      // 1500 골드 = 75 HP
        armor: gold * 0.004,  // 1500 골드 = 6 방어력
        mr: gold * 0.002      // 1500 골드 = 3 마저
      };
  }
}

async function main() {
  const samplesDir = path.join(__dirname, '../src/engine/simulator/data/samples');
  const files = fs.readdirSync(samplesDir).filter(f => f.endsWith('.json'));

  console.log(`Found ${files.length} champion files`);

  // 클래스별 챔피언 그룹화
  const championsByClass: Record<ChampionClass, ChampionData[]> = {
    Squishy: [],
    Bruiser: [],
    Tank: []
  };

  for (const file of files) {
    const filePath = path.join(samplesDir, file);
    const data: ChampionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 첫 번째 역할로 분류
    const primaryRole = data.roles[0] || 'Fighter';
    const championClass = ROLE_TO_CLASS[primaryRole] || 'Bruiser';

    championsByClass[championClass].push(data);
  }

  console.log(`\nChampion counts by class:`);
  console.log(`  Squishy: ${championsByClass.Squishy.length}`);
  console.log(`  Bruiser: ${championsByClass.Bruiser.length}`);
  console.log(`  Tank: ${championsByClass.Tank.length}`);

  // 클래스별 평균 baseStats 계산
  const classAverages: Record<ChampionClass, ChampionBaseStats> = {} as any;

  for (const [className, champions] of Object.entries(championsByClass) as [ChampionClass, ChampionData[]][]) {
    if (champions.length === 0) continue;

    const avg: ChampionBaseStats = {
      hp: 0, hpPerLevel: 0,
      mp: 0, mpPerLevel: 0,
      ad: 0, adPerLevel: 0,
      armor: 0, armorPerLevel: 0,
      mr: 0, mrPerLevel: 0,
      attackSpeed: 0, range: 0, moveSpeed: 0
    };

    for (const champ of champions) {
      const bs = champ.baseStats;
      avg.hp += bs.hp;
      avg.hpPerLevel += bs.hpPerLevel;
      avg.mp += bs.mp;
      avg.mpPerLevel += bs.mpPerLevel;
      avg.ad += bs.ad;
      avg.adPerLevel += bs.adPerLevel;
      avg.armor += bs.armor;
      avg.armorPerLevel += bs.armorPerLevel;
      avg.mr += bs.mr;
      avg.mrPerLevel += bs.mrPerLevel;
      avg.attackSpeed += bs.attackSpeed;
      avg.range += bs.range;
      avg.moveSpeed += bs.moveSpeed;
    }

    const count = champions.length;
    avg.hp = Math.round(avg.hp / count);
    avg.hpPerLevel = Math.round(avg.hpPerLevel / count * 10) / 10;
    avg.mp = Math.round(avg.mp / count);
    avg.mpPerLevel = Math.round(avg.mpPerLevel / count * 10) / 10;
    avg.ad = Math.round(avg.ad / count);
    avg.adPerLevel = Math.round(avg.adPerLevel / count * 10) / 10;
    avg.armor = Math.round(avg.armor / count);
    avg.armorPerLevel = Math.round(avg.armorPerLevel / count * 10) / 10;
    avg.mr = Math.round(avg.mr / count);
    avg.mrPerLevel = Math.round(avg.mrPerLevel / count * 10) / 10;
    avg.attackSpeed = Math.round(avg.attackSpeed / count * 1000) / 1000;
    avg.range = Math.round(avg.range / count);
    avg.moveSpeed = Math.round(avg.moveSpeed / count);

    classAverages[className] = avg;

    console.log(`\n${className} averages:`);
    console.log(`  HP: ${avg.hp} (+${avg.hpPerLevel}/lvl)`);
    console.log(`  Armor: ${avg.armor} (+${avg.armorPerLevel}/lvl)`);
    console.log(`  MR: ${avg.mr} (+${avg.mrPerLevel}/lvl)`);
  }

  // dummyPresets.ts 파일 생성
  const outputPath = path.join(__dirname, '../src/data/dummyPresets.ts');

  const outputContent = `/**
 * 샌드백 프리셋 데이터
 * 자동 생성 by scripts/calculateClassAverages.ts
 *
 * 172개 챔피언 데이터 기반 클래스별 평균 스탯
 */

export type DummyPresetType = 'squishy' | 'bruiser' | 'tank' | 'custom';

export interface DummyPreset {
  id: DummyPresetType;
  name: string;
  nameKo: string;
  baseStats: {
    hp: number;
    hpPerLevel: number;
    armor: number;
    armorPerLevel: number;
    mr: number;
    mrPerLevel: number;
  };
}

// 클래스별 평균 기본 스탯 (172 챔피언 기반)
export const CLASS_AVERAGE_STATS = {
  Squishy: ${JSON.stringify(classAverages.Squishy, null, 4)},
  Bruiser: ${JSON.stringify(classAverages.Bruiser, null, 4)},
  Tank: ${JSON.stringify(classAverages.Tank, null, 4)}
} as const;

// 레벨별 평균 골드 커브 (LoL 일반)
export const GOLD_BY_LEVEL: Record<number, number> = ${JSON.stringify(GOLD_BY_LEVEL, null, 2)};

// 프리셋 정의
export const DUMMY_PRESETS: DummyPreset[] = [
  {
    id: 'squishy',
    name: 'Squishy',
    nameKo: '물몸 (마법사/원딜)',
    baseStats: {
      hp: ${classAverages.Squishy?.hp || 570},
      hpPerLevel: ${classAverages.Squishy?.hpPerLevel || 95},
      armor: ${classAverages.Squishy?.armor || 26},
      armorPerLevel: ${classAverages.Squishy?.armorPerLevel || 4.5},
      mr: ${classAverages.Squishy?.mr || 30},
      mrPerLevel: ${classAverages.Squishy?.mrPerLevel || 1.3}
    }
  },
  {
    id: 'bruiser',
    name: 'Bruiser',
    nameKo: '브루저 (전사)',
    baseStats: {
      hp: ${classAverages.Bruiser?.hp || 620},
      hpPerLevel: ${classAverages.Bruiser?.hpPerLevel || 105},
      armor: ${classAverages.Bruiser?.armor || 35},
      armorPerLevel: ${classAverages.Bruiser?.armorPerLevel || 4.7},
      mr: ${classAverages.Bruiser?.mr || 32},
      mrPerLevel: ${classAverages.Bruiser?.mrPerLevel || 1.8}
    }
  },
  {
    id: 'tank',
    name: 'Tank',
    nameKo: '탱커',
    baseStats: {
      hp: ${classAverages.Tank?.hp || 650},
      hpPerLevel: ${classAverages.Tank?.hpPerLevel || 110},
      armor: ${classAverages.Tank?.armor || 40},
      armorPerLevel: ${classAverages.Tank?.armorPerLevel || 5.0},
      mr: ${classAverages.Tank?.mr || 32},
      mrPerLevel: ${classAverages.Tank?.mrPerLevel || 2.0}
    }
  }
];

// 레벨별 스탯 계산 함수 (LoL 성장 공식)
export function calculateStatAtLevel(base: number, perLevel: number, level: number): number {
  return base + perLevel * (level - 1) * (0.7025 + 0.0175 * (level - 1));
}

// 골드 -> 아이템 스탯 변환 (클래스별 빌드 경향 반영)
export function getItemStatsFromGold(gold: number, presetId: DummyPresetType): { hp: number; armor: number; mr: number } {
  switch (presetId) {
    case 'tank':
      return {
        hp: Math.round(gold * 0.15),
        armor: Math.round(gold * 0.012),
        mr: Math.round(gold * 0.008)
      };
    case 'bruiser':
      return {
        hp: Math.round(gold * 0.10),
        armor: Math.round(gold * 0.008),
        mr: Math.round(gold * 0.004)
      };
    case 'squishy':
    default:
      return {
        hp: Math.round(gold * 0.05),
        armor: Math.round(gold * 0.004),
        mr: Math.round(gold * 0.002)
      };
  }
}

// 프리셋 + 레벨 + 골드차이로 최종 더미 스탯 계산
export function calculateDummyStats(
  presetId: DummyPresetType,
  myLevel: number,
  levelDiff: number = 0,
  goldDiff: number = 0
): { hp: number; armor: number; mr: number } {
  const preset = DUMMY_PRESETS.find(p => p.id === presetId);
  if (!preset || presetId === 'custom') {
    return { hp: 2000, armor: 100, mr: 100 };
  }

  const dummyLevel = Math.max(1, Math.min(18, myLevel + levelDiff));
  const baseGold = GOLD_BY_LEVEL[dummyLevel] || 5000;
  const totalGold = Math.max(0, baseGold + goldDiff);

  // 기본 스탯 (레벨 성장 적용)
  const baseHp = calculateStatAtLevel(preset.baseStats.hp, preset.baseStats.hpPerLevel, dummyLevel);
  const baseArmor = calculateStatAtLevel(preset.baseStats.armor, preset.baseStats.armorPerLevel, dummyLevel);
  const baseMr = calculateStatAtLevel(preset.baseStats.mr, preset.baseStats.mrPerLevel, dummyLevel);

  // 아이템 스탯
  const itemStats = getItemStatsFromGold(totalGold, presetId);

  return {
    hp: Math.round(baseHp + itemStats.hp),
    armor: Math.round(baseArmor + itemStats.armor),
    mr: Math.round(baseMr + itemStats.mr)
  };
}
`;

  fs.writeFileSync(outputPath, outputContent);
  console.log(`\nOutput written to: ${outputPath}`);

  // 샘플 출력
  console.log('\n=== Sample calculations ===');
  for (const preset of ['squishy', 'bruiser', 'tank'] as const) {
    console.log(`\n${preset} at level 11 (0 gold diff):`);
    const level11Gold = GOLD_BY_LEVEL[11];
    const baseStats = classAverages[preset.charAt(0).toUpperCase() + preset.slice(1) as ChampionClass];

    if (baseStats) {
      const hp = calculateStatAtLevel(baseStats.hp, baseStats.hpPerLevel, 11);
      const armor = calculateStatAtLevel(baseStats.armor, baseStats.armorPerLevel, 11);
      const mr = calculateStatAtLevel(baseStats.mr, baseStats.mrPerLevel, 11);
      const itemStats = goldToStats(level11Gold, preset.charAt(0).toUpperCase() + preset.slice(1) as ChampionClass);

      console.log(`  Base HP: ${Math.round(hp)} + Item: ${Math.round(itemStats.hp)} = ${Math.round(hp + itemStats.hp)}`);
      console.log(`  Base Armor: ${Math.round(armor)} + Item: ${Math.round(itemStats.armor)} = ${Math.round(armor + itemStats.armor)}`);
      console.log(`  Base MR: ${Math.round(mr)} + Item: ${Math.round(itemStats.mr)} = ${Math.round(mr + itemStats.mr)}`);
    }
  }
}

main().catch(console.error);
