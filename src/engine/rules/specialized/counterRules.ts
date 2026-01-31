/**
 * 확정 CC 카운터 규칙
 * 
 * 요청하신 "트페 골카 씹기 위해 밤끝/밴시 추천 및 타이밍 계산"
 */

import { AdvancedRule, RulePriority, AdvancedContext } from '../../core/advancedTypes';

export const AntiPointClickCCRule: AdvancedRule = {
  id: 'counter-point-click-cc',
  name: '확정 CC 카운터 (스펠 쉴드)',
  description: '피할 수 없는 CC기(트페 골카 등)가 있을 때 스펠 쉴드 아이템을 추천합니다.',
  
  // 트리거: 팩트 엔진이 hasPointClickCC를 true로 설정했을 때
  triggers: ['PointClickCC'], 
  priority: RulePriority.CRITICAL,

  condition: (ctx: AdvancedContext) => {
    return ctx.facts.hasPointClickCC;
  },

  action: (ctx: AdvancedContext) => {
    const isAD = ctx.myChampion.damageType === 'AD' || ctx.activeStrategy === 'AD_ONHIT';
    
    // 아이템 선택
    const itemId = isAD ? 3814 : 3102; // 밤의 끝자락(3814) or 밴시의 장막(3102)
    const itemName = isAD ? '밤의 끝자락' : '밴시의 장막';

    // 타이밍 계산 (효율성 판단)
    // 1. 상대 트페가 잘 컸는가? (여기서는 간단히 상대 위협도 점수로 대체)
    // 2. 내가 진입해야 하는 챔피언인가? (암살자/다이버)
    const amIDiver = ctx.myChampion.class === 'Assassin' || ctx.myChampion.class === 'Bruiser';
    
    // 타이밍 결정 로직
    let reason = '';
    let score = 0.9; // 기본적으로 매우 높음

    if (amIDiver) {
      reason = `진입 시 ${itemName}으로 확정 CC를 막는 것이 생존의 핵심입니다. 2-3코어로 추천합니다.`;
    } else {
      reason = `상대 이니시를 막기 위해 ${itemName}이 필요합니다.`;
      score = 0.85;
    }

    return [
      {
        itemId: itemId,
        slot: 'situational', // 상황별 아이템이지만 점수가 높아서 상위 노출됨
        reason: reason,
        score: score,
        ruleId: 'counter-point-click-cc'
      }
    ];
  }
};
