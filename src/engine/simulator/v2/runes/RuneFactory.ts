/**
 * V2 룬 구현체 (정복자, 감전 등)
 */

import { Buff, SimulationContext, GameEvent, Entity } from '../core/types';

export class RuneFactory {
  
  static create(runeId: string): Buff | null {
    switch (runeId) {
      case 'Conqueror': return this.Conqueror();
      case 'Electrocute': return this.Electrocute();
      case 'LethalTempo': return this.LethalTempo();
      // ... 추가 룬
      default: return null;
    }
  }

  // 1. 정복자 (Conqueror)
  static Conqueror(): Buff {
    return {
      id: 'Conqueror',
      name: '정복자',
      duration: 0, // 영구 지속 (전투 중)
      stacks: 0,
      maxStacks: 12,
      stats: {}, // 동적 스탯은 onEvent에서 처리

      onEvent: (event, ctx) => {
        const owner = event.source;
        if (!owner) return;

        // 스택 쌓기: 공격이나 스킬 적중 시
        if ((event.type === 'OnHit' || event.type === 'OnSpellHit') && event.source === owner) {
          const self = owner.buffs.find(b => b.id === 'Conqueror');
          if (!self) return;

          // 근접 2스택, 원거리 1스택 (여기선 근접 가정)
          const stackGain = 2; 
          self.stacks = Math.min(self.maxStacks, self.stacks + stackGain);
          
          // 스택당 적응형 능력치 (레벨 비례, 여기선 18렙 기준 4.5로 가정)
          // 실제로는 owner.stats.ad/ap를 직접 수정하거나 별도 버프 로직 필요
          // V2 엔진은 stats 재계산 로직이 필요함. 일단 로그로 확인.
          ctx.log(`정복자 스택: ${self.stacks}`);
        }

        // 풀스택 효과: 피해량의 8% 회복
        if (event.type === 'OnPostTakeDamage' && event.source === owner) {
          const self = owner.buffs.find(b => b.id === 'Conqueror');
          if (self && self.stacks >= self.maxStacks) {
            const healing = (event.damage || 0) * 0.08;
            owner.currentHp = Math.min(owner.stats.maxHp, owner.currentHp + healing);
            ctx.log(`정복자 회복: ${healing.toFixed(1)}`);
          }
        }
      }
    };
  }

  // 2. 감전 (Electrocute)
  static Electrocute(): Buff {
    // 감전은 내부 쿨다운과 카운트가 필요함.
    // Buff의 'stacks'를 카운트로 활용 (3타)
    return {
      id: 'Electrocute',
      name: '감전',
      duration: 0,
      stacks: 0,
      maxStacks: 3,
      
      onEvent: (event, ctx) => {
        const owner = event.source;
        if (!owner) return;
        const self = owner.buffs.find(b => b.id === 'Electrocute');
        if (!self) return;

        // 쿨다운 중이면 무시 (duration을 쿨다운 타이머로 사용)
        if (self.duration > 0) return;

        // 3초 내에 3타 (시간 제한 로직은 복잡하니 단순화: 쿨 아니면 스택 쌓임)
        if ((event.type === 'OnHit' || event.type === 'OnSpellHit') && event.source === owner) {
          self.stacks++;
          
          if (self.stacks >= 3) {
            // 발동!
            const level = 18;
            const baseDmg = 30 + 150; // 180 (18렙)
            const bonusAd = owner.stats.ad - 100; // 대충 추가 AD 추정
            const ap = owner.stats.ap;
            
            const damage = baseDmg + (bonusAd * 0.4) + (ap * 0.25);
            
            // 데미지 적용 요청 (이벤트 발생이 아니라 직접 적용해야 무한 루프 방지)
            // 하지만 여기선 구조상 이벤트로 처리하거나 엔진 메서드 필요
            ctx.log(`⚡ 감전 발동! ${damage.toFixed(1)} 데미지`);
            
            // 쿨다운 적용 (20초)
            self.duration = 20; 
            self.stacks = 0;
          }
        }
      }
    };
  }

  // 3. 치명적 속도 (Lethal Tempo)
  static LethalTempo(): Buff {
    return {
      id: 'LethalTempo',
      name: '치명적 속도',
      duration: 0,
      stacks: 0,
      maxStacks: 6,
      
      onEvent: (event, ctx) => {
        const owner = event.source;
        if (!owner) return;
        
        if (event.type === 'OnAttack' && event.source === owner) {
          const self = owner.buffs.find(b => b.id === 'LethalTempo');
          if (self) {
            self.stacks = Math.min(self.maxStacks, self.stacks + 1);
            // 공속 증가 로직 (스택당 10% 가정)
            // owner.stats.attackSpeed += ... (동적 스탯 재계산 필요)
            ctx.log(`치속 스택: ${self.stacks} (공속 증가)`);
          }
        }
      }
    };
  }
}
