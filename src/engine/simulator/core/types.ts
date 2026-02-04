/**
 * 시뮬레이터 타입 정의 (V2)
 */

// 기본 스탯
export interface CombatStats {
  level: number; // 레벨 추가
  hp: number;
  maxHp: number;
  mana: number;
  
  ad: number;
  ap: number;
  
  armor: number;
  mr: number;
  
  attackSpeed: number;
  range: number; // 사거리 추가
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
  
  // 상태 이상 상태 (시뮬레이션용)
  ccStatus?: {
    stunned?: boolean;
    charmed?: boolean;
    slowed?: boolean;
    rooted?: boolean;
    suppressed?: boolean;
    airborne?: boolean;
  };
}

// 데미지 결과
export interface DamageResult {
  type: 'Physical' | 'Magical' | 'True';
  damage: number;
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
  id?: number;
  name: string;
  stats: Partial<CombatStats>;
  
  // 공격 동작 시 발동 (구인수 스택 등)
  onAttack?: (target: CombatStats, source: CombatStats, state: ItemState) => void; 

  // 공격 적중 시 발동 (온힛)
  onHit?: (target: CombatStats, source: CombatStats, state: ItemState) => DamageResult | null;
  
  // 스킬 적중 시 발동 (리안드리, 루덴 등)
  onSpellHit?: (target: CombatStats, source: CombatStats, state: ItemState, isUltimate: boolean) => DamageResult | null;

  // 피격 시 발동 (가시 갑옷, 판금 장화)
  onBeingHit?: (attacker: CombatStats, defender: CombatStats, state: ItemState, damageType: string, isAutoAttack: boolean) => { damageRes?: DamageResult, multiplier?: number } | null;

  // 패시브 효과 (스탯 보정 등 - 합산 과정에서 적용)
  passive?: (stats: CombatStats, state: ItemState) => void;

  // 모든 스탯 합산 후 최종 적용 (라바돈 %증폭 등)
  finalizeStats?: (stats: CombatStats, state: ItemState) => void;
}

// 아이템 상태 관리 (쿨타임, 스택 등)
export interface ItemState {
  cooldownRemaining: number;
  stacks: number;
  charges: number;
  lastTriggeredTime: number;
  customData: Record<string, any>;
}

// 아이템 인스턴스 (스크립트 + 현재 상태)
export interface ItemInstance {
  script: ItemScript;
  state: ItemState;
}
