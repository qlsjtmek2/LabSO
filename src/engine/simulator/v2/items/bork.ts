/**
 * 아이템 스크립트 예시
 */

import { ItemV2, GameEvent } from '../core/types';

export const BladeOfRuinedKing: ItemV2 = {
  id: 3153,
  name: "몰락한 왕의 검",
  stats: { ad: 40, attackSpeed: 0.25, lifesteal: 0.08 },
  
  onEvent: (event, owner, ctx) => {
    // 적중 시(OnHit) 효과
    if (event.type === 'OnHit' && event.source === owner && event.target) {
      // 현재 체력 9% 데미지
      const damage = event.target.currentHp * 0.09;
      
      // 데미지 이벤트 발생 (이게 또 다른 이벤트를 트리거함)
      // 실제로는 Engine에 데미지 적용 요청을 보내야 함
      ctx.log(`몰왕검 효과 발동: ${damage.toFixed(1)} 물리 피해`);
      
      // 3타 이동속도 훔치기 로직도 여기에 구현 가능 (버프 부여)
    }
  }
};
