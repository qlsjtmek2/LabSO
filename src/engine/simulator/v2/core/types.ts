/**
 * V2 시뮬레이터 코어 타입 정의
 */

import { CombatStats } from '../../core/types';

export type { CombatStats };

export type EventType = 
  | 'OnPreAttack'     // 공격 전 (사거리 체크 등)
  | 'OnAttack'        // 공격 모션 시작
  | 'OnHit'           // 적중 시 (온힛 효과)
  | 'OnSpellCast'     // 스킬 시전
  | 'OnSpellHit'      // 스킬 적중
  | 'OnPreTakeDamage' // 데미지 받기 전 (쉴드 등)
  | 'OnTakeDamage'    // 맞았을 때 (방어력 계산 전)
  | 'OnPostTakeDamage'// 맞은 후 (실제 체력 감소 후)
  | 'OnKill'          // 킬
  | 'OnTick';         // 매 시간(0.1초)마다

export interface GameEvent {
  type: EventType;
  source: Entity;
  target?: Entity;
  damage?: number;
  damageType?: 'Physical' | 'Magical' | 'True';
  data?: any; // 추가 데이터
}

export interface Buff {
  id: string;
  name: string;
  duration: number; // 남은 시간
  stacks: number;
  maxStacks: number;
  stats?: Partial<CombatStats>; // 버프로 인한 스탯 증가
  
  onEvent?: (event: GameEvent, context: SimulationContext) => void;
}

export interface Entity {
  id: string;
  stats: CombatStats;
  currentHp: number;
  buffs: Buff[];
  items: ItemV2[];
  
  addBuff(buff: Buff): void;
  removeBuff(id: string): void;
}

export interface ItemV2 {
  id: number;
  name: string;
  stats: Partial<CombatStats>;
  
  // 아이템 고유 효과 리스너
  onEvent?: (event: GameEvent, owner: Entity, context: SimulationContext) => void;
}

export interface ISimulationEngine {
  applyDamage(source: Entity, target: Entity, rawAmount: number, type: 'Physical' | 'Magical' | 'True'): void;
  broadcastEvent(event: GameEvent): void;
}

export interface SimulationContext {
  time: number;
  events: GameEvent[];
  log: (msg: string) => void;
  engine: ISimulationEngine;
}
