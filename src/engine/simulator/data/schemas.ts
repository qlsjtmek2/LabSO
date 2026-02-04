/**
 * 범용 시뮬레이션 스키마 (V2)
 * 
 * 모든 챔피언과 아이템을 표현하기 위한 표준 데이터 포맷입니다.
 * 단순 데미지뿐만 아니라 조건부 로직, 스택, 상태 이상 등을 포함합니다.
 */

export type DamageType = 'Physical' | 'Magical' | 'True';
export type StatType = 'ad' | 'bonusAd' | 'ap' | 'hp' | 'bonusHp' | 'armor' | 'bonusArmor' | 'mr' | 'bonusMr' | 'attackSpeed' | 'missingHp' | 'currentHp' | 'maxHp' | 'level' | 'critChance';

// 조건부 로직 정의
export interface Condition {
  type: 'stat' | 'buff' | 'cc' | 'position';
  target: 'self' | 'enemy';
  stat?: StatType;
  value?: number; // 비교값 (예: hp < 0.5)
  operator?: '>' | '<' | '>=' | '<=' | '==';
  buffName?: string; // 특정 버프/스택 이름
}

// 계수 로직 정의 (단순 계수 + 레벨링 + 기본값)
export interface Scaling {
  stat: StatType;         // 계수 대상
  ratio: number | number[]; // 고정 계수 또는 레벨별 계수
  base?: number | number[]; // 깡뎀 (레벨별)
}

// 데미지 계산 공식 스키마
export interface DamageLogic {
  damageType: DamageType;
  
  // 기본 데미지 (스킬 레벨별)
  base: number[]; 
  
  // 챔피언 레벨 기반 여부 (true면 base가 1~18레벨 대응)
  levelScaling?: boolean; 

  // 계수 목록
  scalings: Scaling[];

  // 조건부 데미지 증가 (예: 적 체력 50% 미만 시 2배)
  modifiers?: {
    condition: Condition;
    multiplier?: number; // 데미지 증폭 (1.5 = 50% 증가)
    flat?: number;       // 고정 추뎀
  }[];

  // 특수 로직
  onHitEffectiveness?: number; // 온힛 효율 (0~1)
  ticks?: number; // 도트 데미지 횟수 (주로 지속 데미지용)
  
  // 고도화 로직 추가
  multiHit?: number;        // 연타 횟수 (예: 루시안 궁극기)
  multiHitInterval?: number; // 연타 간격 (초)
  returnDamage?: boolean;   // 돌아올 때 데미지 여부 (예: 아리 Q)
  projectileSpeed?: number;  // 투사체 속도 (도착 시간 계산용)
  delay?: number;           // 시전 후 데미지 발생까지의 추가 지연 시간 (초)
}

// 스킬 효과 정의
export interface Effect {
  type: 'damage' | 'heal' | 'shield' | 'buff' | 'cc';
  logic?: DamageLogic;     // 데미지/쉴드 공식
  duration?: number;       // 지속 시간
  stack?: {                // 스택 부여 (예: 다리우스 출혈)
    name: string;
    max: number;
  };
}

// 스킬 정의
export interface SpellSchema {
  id: string; // Q, W, E, R, P
  name: string;
  cooldown: number[];
  cost: number[];
  costType?: 'Mana' | 'Health' | 'CurrentHealth' | 'MaxHealth' | 'Energy' | 'None';
  costRatio?: number[]; // For % costs (e.g. 0.2 for 20%)
  range?: number[];
  effects: Effect[];
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
    moveSpeed: number;
  };
  spells: {
    P: SpellSchema;
    Q: SpellSchema;
    W: SpellSchema;
    E: SpellSchema;
    R: SpellSchema;
  };
  mechanics?: string[]; // 특수 메커니즘 태그 (예: 'Transformer', 'Stacker', 'FormChange')
}
