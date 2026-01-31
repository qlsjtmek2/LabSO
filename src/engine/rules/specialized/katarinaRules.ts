/**
 * 카타리나 전용 전략 규칙
 * 
 * 요청하신 "상대가 카사딘/갈리오면 AD 빌드" 로직 구현
 */

import { AdvancedRule, RulePriority, AdvancedContext } from '../../core/advancedTypes';

export const KatarinaAdaptiveRule: AdvancedRule = {
  id: 'katarina-adaptive-build',
  name: '카타리나 하이브리드 적응',
  description: '상대가 마법 저항력이 높은 챔피언(카사딘, 갈리오)일 경우 AD 빌드로 전환합니다.',
  
  // 카타리나일 때만 실행
  triggers: ['Katarina'],
  priority: RulePriority.STRATEGY, // 전략 결정 단계

  condition: (ctx: AdvancedContext) => {
    if (ctx.myChampion.id !== 'Katarina') return false;
    
    // 상대 라이너가 카사딘이나 갈리오인지 확인
    const enemyLanerId = ctx.enemyLaner?.id;
    const isAntiMage = enemyLanerId === 'Kassadin' || enemyLanerId === 'Galio';
    
    // 또는 상대 전체가 마방이 높을 것으로 예상될 때
    const heavyMRTeam = ctx.enemies.filter(e => e.class === 'Tank').length >= 2;

    return isAntiMage || heavyMRTeam;
  },

  action: (ctx: AdvancedContext) => {
    // 전략 변경 신호 반환
    return { strategyChange: 'AD_ONHIT' };
  }
};

/**
 * 카타리나 AD 빌드 아이템 규칙
 * 전략이 'AD_ONHIT'으로 설정되었을 때 구체적인 아이템을 추천
 */
export const KatarinaADItemsRule: AdvancedRule = {
  id: 'katarina-ad-items',
  name: '카타리나 AD 아이템',
  description: 'AD 카타리나 핵심 아이템 추천',
  
  triggers: ['Katarina'],
  priority: RulePriority.TACTICAL,

  condition: (ctx: AdvancedContext) => {
    // 전략이 AD_ONHIT 일 때만 실행
    return ctx.activeStrategy === 'AD_ONHIT';
  },

  action: (ctx: AdvancedContext) => {
    return [
      {
        itemId: 3153, // 몰락한 왕의 검
        slot: 'core',
        reason: 'AD 빌드 핵심: 평타 기반 딜링 강화',
        score: 0.95,
        ruleId: 'katarina-ad-items'
      },
      {
        itemId: 3091, // 마법사의 최후
        slot: 'core',
        reason: 'AP 상대로 강력한 효율 + 온힛 데미지',
        score: 0.90,
        ruleId: 'katarina-ad-items'
      },
      {
        itemId: 3074, // 굶주린 히드라 (또는 거대한 히드라)
        slot: 'situational',
        reason: '라인 클리어 및 광역 AD 흡혈',
        score: 0.85,
        ruleId: 'katarina-ad-items'
      }
    ];
  }
};
