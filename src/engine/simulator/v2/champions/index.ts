/**
 * 챔피언별 특수 로직 구현체 모음
 */

import { Buff, SimulationContext, GameEvent, Entity } from '../core/types';

// 1. 카타리나 (Katarina)
export const KatarinaLogic: Buff = {
  id: 'Katarina_Mechanics',
  name: '탐욕 (Passive)',
  duration: 0,
  stacks: 0,
  maxStacks: 1,
  onEvent: (event, ctx) => {
    const me = event.source as any; // ChampionModelV2 타입 캐스팅 필요
    if (!me || event.source !== me) return;

    // 패시브: 단검 줍기 (스킬 사용 후 1.5초 뒤 줍는다고 가정 or Q/W 사용 시 즉시 줍기 가정)
    // 시뮬레이션 단순화를 위해, Q나 W를 쓰면 1초 뒤에 '단검 줍기' 데미지가 터지고 E 쿨이 준다고 가정.
    if (event.type === 'OnSpellCast') {
      const spellKey = event.data?.spell;
      if (spellKey === 'Q' || spellKey === 'W') {
        // 단검 줍기 이벤트 예약 (비동기 처리 대신 즉시 효과 적용하되 딜레이 가정)
        // 실제로는 엔진의 타이머를 써야 하지만, 여기선 "스킬 시전 시 E 쿨타임 대폭 감소"로 구현
        if (me.cooldowns) {
          me.cooldowns['E'] = Math.max(0, (me.cooldowns['E'] || 0) - 3); // 3초 감소
        }
      }
    }

    // R: 온힛 효율 적용 (카타 궁은 온힛 25/30/35% 적용)
    // 이는 ChampionModelV2의 castSpell에서 이미 처리할 수도 있지만, 여기서 명시적으로 
    // "R 틱마다 OnHit 발생"을 구현해야 함.
    // 하지만 현재 엔진은 R을 '한 번 시전'으로 처리하므로, 여기서 R 시전 시 
    // 6번의 OnHit 이벤트를 연달아 발생시키는 것이 맞음.
    if (event.type === 'OnSpellCast' && event.data?.spell === 'R') {
      for (let i = 0; i < 6; i++) {
        // R 틱 데미지 + 온힛 (엔진이 처리하도록 OnHit 발생)
        // 단, 데미지는 25%만 적용되어야 함. 이건 ItemScript에서 처리하거나 여기서 계수 조절.
        // 복잡하므로 로그만 남김 "R 채널링 중"
      }
    }
  }
};

// 2. 이즈리얼 (Ezreal)
export const EzrealLogic: Buff = {
  id: 'Ezreal_Mechanics',
  name: '끓어오르는 주문의 힘',
  duration: 0,
  stacks: 0,
  maxStacks: 5,
  onEvent: (event, ctx) => {
    const me = event.source as any;
    if (!me || event.source !== me) return;

    // Q 적중 시: 모든 스킬 쿨타임 1.5초 감소
    if (event.type === 'OnSpellHit' && event.data?.spell === 'Q') {
      if (me.cooldowns) {
        Object.keys(me.cooldowns).forEach(key => {
          if (me.cooldowns[key] > ctx.time) {
            me.cooldowns[key] -= 1.5;
          }
        });
        ctx.log(`[Ezreal] Q 적중! 쿨타임 1.5초 감소`);
      }
      
      // 패시브: 공속 증가 (스택)
      const passive = me.buffs.find((b: any) => b.id === 'Ezreal_Passive');
      if (!passive) {
        me.addBuff({ 
          id: 'Ezreal_Passive', name: '끓어오르는 주문의 힘', duration: 6, stacks: 1, maxStacks: 5,
          stats: { attackSpeed: 0.1 } // 스택당 공속 10%
        });
      } else {
        passive.stacks = Math.min(5, passive.stacks + 1);
        passive.duration = 6;
      }
    }
  }
};

// 3. 베인 (Vayne)
export const VayneLogic: Buff = {
  id: 'Vayne_Mechanics',
  name: '은화살',
  duration: 0,
  stacks: 0,
  maxStacks: 3, // 3타 스택
  onEvent: (event, ctx) => {
    const me = event.source;
    if (!me || event.source !== me) return;

    if (event.type === 'OnHit' && event.target) {
      // 3타 카운팅 (타겟에게 디버프를 걸어야 하지만, 1:1이므로 내 버프에 저장해도 됨)
      // 실제로는 타겟별로 관리해야 함. 여기선 1:1 가정.
      const silverBolts = me.buffs.find(b => b.id === 'Vayne_W_Stack');
      
      let stacks = silverBolts ? silverBolts.stacks : 0;
      stacks++;

      if (stacks >= 3) {
        // 3타 터짐: 최대 체력 비례 고정 피해
        const damage = event.target.stats.maxHp * 0.10; // 10% (대략 3~5렙 구간)
        
        // 엔진을 통해 데미지 적용 (True Damage)
        // applyDamage에 접근할 수 없으므로 ctx를 통해 간접 호출하거나,
        // 이벤트를 발생시켜야 하는데 구조상 한계.
        // 임시로 직접 currentHp 깎기 (안 좋지만 동작은 함)
        event.target.currentHp -= damage;
        ctx.log(`[Vayne] 은화살 폭발! ${damage.toFixed(1)} 고정 피해`);
        
        stacks = 0;
      }

      if (!silverBolts) {
        me.addBuff({ id: 'Vayne_W_Stack', name: '은화살 스택', duration: 3, stacks: stacks, maxStacks: 3 });
      } else {
        silverBolts.stacks = stacks;
        silverBolts.duration = 3;
      }
    }
  }
};

// 4. 야스오 (Yasuo) & 요네 (Yone) 공통 로직
const WindBrothersLogic = (name: string): Buff => ({
  id: `${name}_Mechanics`,
  name: '낭인의 길',
  duration: 0,
  stacks: 0,
  maxStacks: 1,
  onEvent: (event, ctx) => {
    const me = event.source;
    if (!me || event.source !== me) return;

    // 치명타 확률 2.5배 뻥튀기 (초기화 시점이나 스탯 재계산 시점에 적용되어야 함)
    // 여기서는 OnTick이나 특정 시점에 강제로 스탯 보정
    if (event.type === 'OnTick') {
      // 이 로직은 매 틱마다 실행되면 안 좋지만, 동적 스탯 반영을 위해 필요
      // 실제로는 me.stats.critChance가 기본 템 스탯이라면, 2.5배 해줌
      // 단, 무한 증식을 막기 위해 원본 스탯을 알아야 함.
      // V2 모델이 'baseStats'와 'bonusStats'를 분리하지 않아서 완벽 구현 불가.
      // 따라서 '치명타 템'이 감지되면 보너스 스탯을 주는 버프를 유지하는 방식 사용.
      
      const critBuff = me.buffs.find(b => b.id === 'Wind_Crit_Bonus');
      if (!critBuff) {
        // 현재 치명타 확률 확인 (단, 100% 넘는 건 의미 없음)
        // 이 부분은 ChampionModelV2 생성자에서 처리하는 게 훨씬 깔끔함.
      }
    }
    
    // Q 쿨타임: 공속에 비례하여 감소
    // 기본 4초 -> 공속 1.43%일 때 1.33초 (최소)
    // ChampionModelV2가 Q 쿨타임 계산할 때 이 로직을 참조해야 함.
  }
});

export const YasuoLogic = WindBrothersLogic('Yasuo');
export const YoneLogic = WindBrothersLogic('Yone');

// 팩토리
export class ChampionLogicFactory {
  static get(championId: string): Buff | undefined {
    switch (championId) {
      case 'Katarina': return KatarinaLogic;
      case 'Ezreal': return EzrealLogic;
      case 'Vayne': return VayneLogic;
      case 'Yasuo': return YasuoLogic;
      case 'Yone': return YoneLogic;
      // 추가 챔피언들...
      default: return undefined;
    }
  }
}
