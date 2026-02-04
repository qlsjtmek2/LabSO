/**
 * 아이템 스크립트 생성기 (Advanced)
 * 
 * JSON 데이터와 텍스트 설명을 분석하여 
 * 롤의 복잡한 아이템 효과를 실행 가능한 스크립트로 자동 변환합니다.
 */

import { ItemV2, GameEvent, Entity, SimulationContext, Buff } from '../core/types';
import itemsData from '../../../../data/json/items.json';

export class ItemScriptFactory {
  
  static create(itemId: number): ItemV2 | null {
    const data = (itemsData as any)[itemId];
    if (!data) return null;

    const item: ItemV2 = {
      id: itemId,
      name: data.name,
      stats: data.stats,
      onEvent: (event, owner, ctx) => {
        // 1. JSON에 명시된 효과 처리 (fetch_items.js에서 파싱된 것)
        if (data.effects) {
          data.effects.forEach((effect: any) => {
            handleParsedEffect(effect, event, owner, ctx);
          });
        }

        // 2. 텍스트 기반 자동 스크립팅 (파싱되지 않은 나머지 효과들)
        // Description 텍스트를 분석하여 로직을 수행
        handleDescriptionLogic(data.description, event, owner, ctx, data.stats);
      }
    };

    return item;
  }
}

// 1. 미리 파싱된 효과 처리
function handleParsedEffect(effect: any, event: GameEvent, owner: Entity, ctx: SimulationContext) {
  if (effect.type === 'onHit' && event.type === 'OnHit' && event.source === owner && event.target) {
    let damage = 0;
    if (effect.base) damage += effect.base;
    if (effect.ratio) {
      const statVal = (owner.stats[effect.ratio.stat as keyof typeof owner.stats] as number) || 0;
      damage += statVal * effect.ratio.value;
    }
    if (effect.targetHpBased) {
      const { type, percent } = effect.targetHpBased;
      if (type === 'current') damage += event.target.currentHp * percent;
      if (type === 'max') damage += event.target.stats.maxHp * percent;
    }
    if (damage > 0) {
      ctx.log(`[Item] ${effect.damageType} On-Hit Damage: ${damage.toFixed(1)}`);
      // 실제 데미지 적용은 Engine에서 처리하도록 이벤트에 태우거나 직접 호출해야 함.
      // 여기서는 로그만 남김 (구조상 한계) -> Engine 업데이트 필요
    }
  }
}

// 2. 텍스트 기반 동적 로직 (여기가 핵심)
function handleDescriptionLogic(desc: string, event: GameEvent, owner: Entity, ctx: SimulationContext, stats: any) {
  if (!desc) return;

  // Pattern: Spellblade (주문검)
  // "After using an ability, your next attack..."
  if (desc.includes("After using an ability") || desc.includes("Spellblade")) {
    if (event.type === 'OnSpellCast' && event.source === owner) {
      // 주문검 버프 생성
      const buff: Buff = {
        id: 'Spellblade',
        name: '주문검',
        duration: 10, // 10초 유지
        stacks: 1,
        maxStacks: 1,
        onEvent: (e, c) => {
          // 다음 평타 시 발동
          if (e.type === 'OnHit' && e.source === owner) {
            // 데미지 계산 (기본 AD의 100% ~ 200%)
            // 트포: 200%, 리치베인: 75% base + 50% AP, 얼건: 100%
            let ratio = 1.0;
            if (desc.includes("200%")) ratio = 2.0;
            
            const dmg = owner.stats.ad * ratio; // 기본 AD여야 하지만 편의상 총 AD 사용 (보정 필요)
            c.log(`🗡️ 주문검 발동! 추가 피해: ${Math.round(dmg)}`);
            
            // 버프 소모 (제거)
            owner.removeBuff('Spellblade');
          }
        }
      };
      owner.addBuff(buff);
    }
  }

  // Pattern: Lifeline (생명선)
  // "taking damage that would reduce you below 30% health"
  if (desc.includes("Lifeline") || desc.includes("below 30% health")) {
    if (event.type === 'OnPreTakeDamage' && event.target === owner) { // OnPreTakeDamage 이벤트 필요
      // 현재 체력 체크 (데미지 받기 전 예상 체력)
      const predictedHp = owner.currentHp - (event.damage || 0);
      const threshold = owner.stats.maxHp * 0.3;

      if (predictedHp < threshold) {
        // 쿨다운 체크 필요 (여기선 생략, 무조건 발동)
        // 쉴드 버프 부여
        const shieldAmount = owner.stats.maxHp * 0.8 * 0.5; // 대략적인 값
        ctx.log(`🛡️ 생명선 발동! 쉴드: ${Math.round(shieldAmount)}`);
        // 실제로는 데미지를 쉴드로 먼저 깎는 로직 필요
      }
    }
  }

  // Pattern: Execute (징수의 총)
  // "below 5% health kills"
  if (desc.includes("below 5%") && event.type === 'OnPostTakeDamage' && event.source === owner) {
    if (event.target && event.target.currentHp < event.target.stats.maxHp * 0.05) {
      event.target.currentHp = 0;
      ctx.log(`☠️ 징수의 총 처형!`);
    }
  }

  // Pattern: Armor Penetration / Magic Penetration
  // 스탯에 이미 반영되어 있으므로 별도 로직 불필요 (Engine.ts가 스탯 참조함)
}
