/**
 * 시뮬레이터 타입 정의
 */

// 기본 스탯
export interface CombatStats {
  hp: number;
  maxHp: number;
  mana: number;
  
  ad: number;
  ap: number;
  
  armor: number;
  mr: number;
  
  attackSpeed: number;
  movementSpeed: number; // 이동 속도 추가
  abilityHaste: number;
  
  critChance: number;
  critDamage: number; // 기본 1.75
  
  lethality: number;      // 물리 관통력 (고정)
  armorPen: number;       // 물리 관통력 (%)
  magicPenFlat: number;   // 마법 관통력 (고정)
  magicPenPercent: number;// 마법 관통력 (%)
  
  omnivamp: number;       // 모든 피해 흡혈
  lifesteal: number;      // 생명력 흡수
}

// 데미지 이벤트
export interface DamageEvent {
  source: string; // 'AutoAttack', 'Q', 'BoRK_Passive'
  type: 'Physical' | 'Magical' | 'True';
  rawDamage: number;
  mitigatedDamage: number; // 방어력 계산 후
  timestamp: number;
  isCrit: boolean;
}

// 시뮬레이션 결과
export interface SimulationResult {
  winner: boolean;
  timeToKill: number;
  totalDamage: number;
  remainingHp: number;
  damageLog: DamageEvent[];
  dps: number;
}

// 아이템 스크립트 인터페이스
export interface ItemScript {
  id: number;
  name: string;
  stats: Partial<CombatStats>;
  
  // 공격 시 발동 효과 (온힛)
  onHit?: (target: CombatStats, source: CombatStats) => { type: 'Physical' | 'Magical'; damage: number };
}
