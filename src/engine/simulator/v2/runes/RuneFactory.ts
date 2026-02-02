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
      case 'PressTheAttack': return this.PressTheAttack();
      default: return null;
    }
  }

  // 1. 정복자 (Conqueror)
  static Conqueror(): Buff {
    return {
      id: 'Conqueror',
      name: '정복자',
      duration: 5, // 스택 지속시간 (갱신됨)
      stacks: 0,
      maxStacks: 12,
      
      onEvent: (event, ctx) => {
        const owner = event.source;
        if (!owner) return;
        const self = owner.buffs.find(b => b.id === 'Conqueror');
        if (!self) return;

        // 스택 쌓기
        if ((event.type === 'OnHit' || event.type === 'OnSpellHit') && event.source === owner && event.target) {
          // 근접 2, 원거리 1 (일단 2로 고정)
          const stackGain = 2; 
          const prevStacks = self.stacks;
          self.stacks = Math.min(self.maxStacks, self.stacks + stackGain);
          self.duration = 5; // 지속시간 갱신

          if (prevStacks < self.maxStacks && self.stacks === self.maxStacks) {
            ctx.log(`[Rune] 정복자 풀스택 달성!`);
          }
        }

        // 데미지 증가 (단순화: 이벤트 때마다 추가 데미지를 주는 방식이 아니라 스탯이 올라야 함)
        // 여기서는 풀스택 힐링만 구현
        if (event.type === 'OnPostTakeDamage' && event.source === owner && event.damageType !== 'True') {
          if (self.stacks >= self.maxStacks) {
            const healing = (event.damage || 0) * 0.08; // 8% 흡혈
            owner.currentHp = Math.min(owner.stats.maxHp, owner.currentHp + healing);
            // ctx.log(`[Rune] 정복자 회복: ${healing.toFixed(1)}`);
          }
        }
      }
    };
  }

  // 2. 감전 (Electrocute)
  static Electrocute(): Buff {
    // 내부 상태: lastHitTime, hitCount, cooldown
    // Buff 객체는 단순 데이터라 클로저 변수 사용 불가 (매번 create되므로 가능할지도? 하지만 직렬화 고려하면 buff.data 같은게 있어야 함)
    // 여기서는 stacks를 hitCount로, duration을 cooldown으로 활용
    return {
      id: 'Electrocute',
      name: '감전',
      duration: 0, // 쿨다운 타이머로 사용
      stacks: 0,   // 적중 횟수
      maxStacks: 3,
      
      onEvent: (event, ctx) => {
        const owner = event.source;
        if (!owner) return;
        const self = owner.buffs.find(b => b.id === 'Electrocute');
        if (!self) return;

        // 쿨다운 체크
        if (self.duration > 0) return;

        // 스택 쌓기 (3초 내 3타 로직은 복잡하므로 단순화: 쿨 아니면 쌓임. 타임아웃은 별도 로직 필요하지만 생략)
        if ((event.type === 'OnHit' || event.type === 'OnSpellHit') && event.source === owner && event.target) {
          self.stacks++;
          
          if (self.stacks >= 3) {
            // 데미지 계산 (18레벨 기준)
            const baseDmg = 180; 
            const bonusAd = owner.stats.ad - 100; // 기본 AD 제외 근사치
            const ap = owner.stats.ap;
            const damage = baseDmg + (bonusAd * 0.4) + (ap * 0.25);
            
            ctx.log(`[Rune] ⚡ 감전 발동!`);
            ctx.engine.applyDamage(owner, event.target, damage, 'Magical'); // 적응형이라 보통 마법/물리
            
            // 쿨다운 및 리셋
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
      duration: 6, 
      stacks: 0,
      maxStacks: 6,
      
      onEvent: (event, ctx) => {
        const owner = event.source;
        if (!owner) return;
        
        if (event.type === 'OnAttack' && event.source === owner) {
          const self = owner.buffs.find(b => b.id === 'LethalTempo');
          if (self) {
            self.stacks = Math.min(self.maxStacks, self.stacks + 1);
            self.duration = 6;
            // 공속 증가는 ChampionModel의 getStats() 같은 곳에서 처리해야 함
            // 여기선 로그만
          }
        }
      }
    };
  }

  // 4. 집중 공격 (Press the Attack)
  static PressTheAttack(): Buff {
    // 3타 적중 시 추가 데미지 + 약점 노출(디버프)
    return {
      id: 'PressTheAttack',
      name: '집중 공격',
      duration: 0, // 쿨다운 X (대상별 쿨다운이지만 1:1 가정)
      stacks: 0,
      maxStacks: 3,
      
      onEvent: (event, ctx) => {
        const owner = event.source;
        if (!owner) return;
        const self = owner.buffs.find(b => b.id === 'PressTheAttack');
        if (!self) return;

        // 평타 적중 시
        if (event.type === 'OnHit' && event.source === owner && event.target && event.data?.isAutoAttack !== false) {
           // 같은 대상 계속 공격 가정
           self.stacks++;

           if (self.stacks === 3) {
             // 1. 추가 데미지 (40~180)
             const dmg = 180; 
             ctx.log(`[Rune] 🎯 집공 터짐! 추가 데미지 ${dmg}`);
             ctx.engine.applyDamage(owner, event.target, dmg, 'True'); // 적응형

             // 2. 약점 노출 디버프 적용
             const exposedBuff: Buff = {
               id: 'PTA_Exposed',
               name: '약점 노출',
               duration: 6,
               stacks: 1,
               maxStacks: 1,
               onEvent: (e, c) => {
                 // 데미지 받을 때 증폭
                 if (e.type === 'OnPreTakeDamage' && e.target === event.target) {
                   // e.damage를 수정해야 하는데, event 객체는 참조이므로 수정 가능?
                   // GameEvent는 readonly가 아니므로 가능할 듯
                   if (e.damage) {
                     e.damage *= 1.08; // 8% 증가
                     // c.log(`[Rune] 약점 노출로 데미지 증가`);
                   }
                 }
               }
             };
             event.target.addBuff(exposedBuff);

             self.stacks = 0; // 초기화 (대상 변경 로직 없으므로 계속 터지는거 방지용)
           }
        }
      }
    };
  }
}
