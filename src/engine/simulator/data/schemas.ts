/**
 * 범용 시뮬레이션 스키마
 * 
 * 모든 챔피언과 아이템을 표현하기 위한 표준 데이터 포맷입니다.
 */

export type DamageType = 'Physical' | 'Magical' | 'True';
export type StatType = 'ad' | 'ap' | 'hp' | 'armor' | 'mr' | 'attackSpeed' | 'missingHp' | 'currentHp';

// 데미지 계산 공식 스키마
export interface DamageLogic {
  base: number[];           // 레벨별 기본 데미지 [Lv1, Lv2, ...]
  ratios: {
    stat: StatType;         // 계수 대상 (예: 'totalAD', 'bonusAP')
    ratio: number;          // 계수 (예: 0.6)
  }[];
  damageType: DamageType;
  
  // 특수 로직
  onHitEffectiveness?: number; // 온힛 효율 (카타 R: 0.3 등)
  targetHpBased?: {            // 체력 비례 데미지
    type: 'current' | 'max' | 'missing';
    percent: number;
  };
}

// 스킬 정의
export interface SpellSchema {
  id: string; // Q, W, E, R
  name: string;
  cooldown: number[];
  cost: number[];
  
  // 스킬 사용 시 발생하는 효과들
  effects: {
    type: 'damage' | 'heal' | 'shield' | 'buff' | 'cc';
    logic: DamageLogic;     // 데미지 공식
    ticks?: number;         // 도트 데미지 횟수 (모르가나 W 등)
    duration?: number;      // 지속 시간
  }[];
}

// 챔피언 정의
export interface ChampionSchema {
  id: string;
  name: string;
  baseStats: {
    hp: number; hpPerLevel: number;
    mp: number; mpPerLevel: number;
    ad: number; adPerLevel: number;
    armor: number; armorPerLevel: number;
    mr: number; mrPerLevel: number;
    attackSpeed: number; attackSpeedRatio: number;
    range: number;
  };
  spells: {
    P: SpellSchema; // 패시브
    Q: SpellSchema;
    W: SpellSchema;
    E: SpellSchema;
    R: SpellSchema;
  };
}
