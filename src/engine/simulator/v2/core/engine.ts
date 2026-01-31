/**
 * V2 시뮬레이션 엔진
 * 
 * 시간 흐름과 이벤트 전파를 담당합니다.
 */

import { Entity, GameEvent, SimulationContext } from './types';

export class SimulationEngine {
  private time: number = 0;
  private entities: Entity[] = [];
  private eventLog: string[] = [];

  constructor(p1: Entity, p2: Entity) {
    this.entities = [p1, p2];
  }

  // 시뮬레이션 실행
  run(duration: number): void {
    const tickRate = 0.1; // 0.1초 단위
    
    while (this.time < duration) {
      // 1. 틱 이벤트 발생
      this.broadcastEvent({ type: 'OnTick', source: null as any });

      // 2. 버프 지속시간 감소
      this.entities.forEach(entity => {
        entity.buffs.forEach(buff => {
          buff.duration -= tickRate;
        });
        entity.buffs = entity.buffs.filter(b => b.duration > 0);
      });

      // 3. AI 행동 결정 (공격/스킬) - 1:1 결투 가정
      if (this.entities.length === 2) {
        const p1 = this.entities[0];
        const p2 = this.entities[1];
        
        // p1의 타겟은 p2, p2의 타겟은 p1
        if ((p1 as any).update) (p1 as any).update(this.time, p2, this);
        if ((p2 as any).update) (p2 as any).update(this.time, p1, this);
      }

      this.time += tickRate;
      
      // 종료 조건 (누군가 죽음)
      if (this.entities.some(e => e.currentHp <= 0)) break;
    }
  }

  // 이벤트 전파 (가장 중요)
  broadcastEvent(event: GameEvent): void {
    const context: SimulationContext = {
      time: this.time,
      events: [],
      log: (msg) => this.eventLog.push(`[${this.time.toFixed(1)}] ${msg}`)
    };

    // 1. 소스(가해자)의 아이템/버프 효과 발동
    if (event.source) {
      event.source.items.forEach(item => item.onEvent?.(event, event.source, context));
      event.source.buffs.forEach(buff => buff.onEvent?.(event, context));
    }

    // 2. 타겟(피해자)의 아이템/버프 효과 발동 (예: 닌탑, 뼈방패)
    if (event.target) {
      const target = event.target;
      target.items.forEach(item => item.onEvent?.(event, target, context));
      target.buffs.forEach(buff => buff.onEvent?.(event, context));
    }

    // 3. 글로벌 룰 (데미지 계산 등) 처리
    this.handleGlobalRules(event);
  }

  private handleGlobalRules(event: GameEvent) {
    // 1. 기본 평타 적중 시 데미지 처리
    if (event.type === 'OnHit' && event.source && event.target) {
      // 평타 기본 데미지 (AD)
      const baseDamage = event.source.stats.ad;
      // 치명타 계산 로직 추가 필요
      
      this.applyDamage(event.source, event.target, baseDamage, 'Physical');
    }
  }

  // 데미지 적용 (방어력 계산 포함)
  applyDamage(source: Entity, target: Entity, rawAmount: number, type: 'Physical' | 'Magical' | 'True'): void {
    // 1. 방어력/마저 계산
    let mitigation = 0;
    if (type === 'Physical') {
      const armor = target.stats.armor; // 관통력 적용 필요
      mitigation = armor >= 0 ? 100 / (100 + armor) : 2 - (100 / (100 - armor));
    } else if (type === 'Magical') {
      const mr = target.stats.mr;
      mitigation = mr >= 0 ? 100 / (100 + mr) : 2 - (100 / (100 - mr));
    } else {
      mitigation = 1.0; // True damage
    }

    const finalDamage = rawAmount * mitigation;

    // 2. 이벤트: 데미지 받기 전 (쉴드/생명선 등 발동 기회)
    this.broadcastEvent({ 
      type: 'OnPreTakeDamage', 
      source, 
      target, 
      damage: finalDamage, 
      damageType: type 
    });

    // 3. 체력 감소
    // (실제로는 쉴드 차감 로직이 필요하지만, 여기선 생명선이 발동되어 currentHp나 maxHp가 변했을 수 있음)
    // 간단한 쉴드 로직: currentHp가 maxHp를 넘을 수 있게 하여 쉴드처럼 처리 (임시)
    
    target.currentHp -= finalDamage;
    this.eventLog.push(`[${this.time.toFixed(1)}] ${source.id} deals ${finalDamage.toFixed(1)} (${type}) to ${target.id}`);

    // 4. 이벤트: 데미지 받은 후 (흡혈 등)
    this.broadcastEvent({ 
      type: 'OnPostTakeDamage', 
      source, 
      target, 
      damage: finalDamage, 
      damageType: type 
    });

    // 5. 사망 처리
    if (target.currentHp <= 0) {
      this.broadcastEvent({ type: 'OnKill', source, target });
    }
  }
}
