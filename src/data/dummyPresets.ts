/**
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
  Squishy: {
    "hp": 604,
    "hpPerLevel": 103.1,
    "mp": 356,
    "mpPerLevel": 38.4,
    "ad": 56,
    "adPerLevel": 3,
    "armor": 26,
    "armorPerLevel": 4.5,
    "mr": 30,
    "mrPerLevel": 1.4,
    "attackSpeed": 0.647,
    "range": 463,
    "moveSpeed": 333
},
  Bruiser: {
    "hp": 632,
    "hpPerLevel": 105.3,
    "mp": 440,
    "mpPerLevel": 30.7,
    "ad": 64,
    "adPerLevel": 3.5,
    "armor": 34,
    "armorPerLevel": 4.6,
    "mr": 31,
    "mrPerLevel": 2,
    "attackSpeed": 0.656,
    "range": 160,
    "moveSpeed": 342
},
  Tank: {
    "hp": 641,
    "hpPerLevel": 105.1,
    "mp": 303,
    "mpPerLevel": 40.1,
    "ad": 62,
    "adPerLevel": 3.5,
    "armor": 35,
    "armorPerLevel": 4.7,
    "mr": 31,
    "mrPerLevel": 2.1,
    "attackSpeed": 0.675,
    "range": 142,
    "moveSpeed": 336
}
} as const;

// 레벨별 평균 골드 커브 (LoL 일반)
export const GOLD_BY_LEVEL: Record<number, number> = {
  "1": 500,
  "2": 800,
  "3": 1200,
  "4": 1600,
  "5": 2100,
  "6": 2700,
  "7": 3400,
  "8": 4200,
  "9": 5100,
  "10": 6000,
  "11": 7000,
  "12": 8100,
  "13": 9300,
  "14": 10600,
  "15": 12000,
  "16": 13500,
  "17": 15000,
  "18": 16500
};

// 프리셋 정의
export const DUMMY_PRESETS: DummyPreset[] = [
  {
    id: 'squishy',
    name: 'Squishy',
    nameKo: '물몸 (마법사/원딜)',
    baseStats: {
      hp: 604,
      hpPerLevel: 103.1,
      armor: 26,
      armorPerLevel: 4.5,
      mr: 30,
      mrPerLevel: 1.4
    }
  },
  {
    id: 'bruiser',
    name: 'Bruiser',
    nameKo: '브루저 (전사)',
    baseStats: {
      hp: 632,
      hpPerLevel: 105.3,
      armor: 34,
      armorPerLevel: 4.6,
      mr: 31,
      mrPerLevel: 2
    }
  },
  {
    id: 'tank',
    name: 'Tank',
    nameKo: '탱커',
    baseStats: {
      hp: 641,
      hpPerLevel: 105.1,
      armor: 35,
      armorPerLevel: 4.7,
      mr: 31,
      mrPerLevel: 2.1
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
