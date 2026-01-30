/**
 * 빌드 규칙
 *
 * 상황별 아이템 추천 규칙을 정의합니다.
 */

import type { RuleContext, ItemRecommendation } from '@/types';
import { createRule, type Rule } from './ruleEngine';

// 아이템 ID 상수 (주요 아이템만)
const ITEMS = {
  // 방어 아이템 (AD)
  PLATED_STEELCAPS: 3047,
  RANDUINS_OMEN: 3143,
  FROZEN_HEART: 3110,
  DEAD_MANS_PLATE: 3742,
  THORNMAIL: 3075,

  // 방어 아이템 (AP)
  MERCURY_TREADS: 3111,
  MAW_OF_MALMORTIUS: 3156,
  HEXDRINKER: 3155,
  SPIRIT_VISAGE: 3065,
  FORCE_OF_NATURE: 4401,
  BANSHEES_VEIL: 3102,

  // 관통 아이템 (AD)
  LORD_DOMINIKS: 3036,
  MORTAL_REMINDER: 3033,
  SERRATED_DIRK: 3134,
  YOUMUUS: 3142,

  // 관통 아이템 (AP)
  VOID_STAFF: 3135,
  SHADOWFLAME: 4645,
  CRYPTBLOOM: 3118,

  // 체력 회복 감소
  EXECUTIONERS_CALLING: 3123,
  OBLIVION_ORB: 3916,
  MORELLONOMICON: 3165,
  CHEMPUNK_CHAINSWORD: 6609,

  // 유틸리티
  GUARDIAN_ANGEL: 3026,
  ZHONYAS_HOURGLASS: 3157,
  QUICKSILVER_SASH: 3140,
  MERCURIAL_SCIMITAR: 3139,
};

// 빌드 규칙 컨텍스트 타입
export type BuildRuleContext = RuleContext;
export type BuildRuleResult = ItemRecommendation;

// ============================================
// 규칙 정의
// ============================================

// 규칙 1: 상대 AP 데미지가 높을 때
export const vsHighAPRule: Rule<BuildRuleContext, BuildRuleResult> = createRule({
  id: 'vs-high-ap',
  name: '대 AP 방어 아이템',
  description: '상대 팀의 AP 딜러가 3명 이상일 때 마법 저항 아이템 추천',
  priority: 80,

  condition: (ctx) => {
    const apCount = ctx.enemies.filter(
      (c) => c.damageType === 'AP' || c.damageType === 'Hybrid'
    ).length;
    return apCount >= 3;
  },

  apply: (ctx) => {
    const myDamage = ctx.myChampion.damageType;
    const item =
      myDamage === 'AD' ? ITEMS.MAW_OF_MALMORTIUS : ITEMS.BANSHEES_VEIL;

    return {
      score: 0.85,
      result: {
        itemId: item,
        slot: 'situational',
        reason: '상대 AP 데미지가 높아 마법 저항 아이템이 효과적입니다.',
        score: 0.85,
        ruleId: 'vs-high-ap',
      },
      reason: '상대 AP 데미지가 높아 마법 저항 아이템이 효과적입니다.',
    };
  },
});

// 규칙 2: 상대 AD 데미지가 높을 때
export const vsHighADRule: Rule<BuildRuleContext, BuildRuleResult> = createRule({
  id: 'vs-high-ad',
  name: '대 AD 방어 아이템',
  description: '상대 팀의 AD 딜러가 3명 이상일 때 방어력 아이템 추천',
  priority: 80,

  condition: (ctx) => {
    const adCount = ctx.enemies.filter((c) => c.damageType === 'AD').length;
    return adCount >= 3;
  },

  apply: (ctx) => ({
    score: 0.85,
    result: {
      itemId: ITEMS.RANDUINS_OMEN,
      slot: 'situational',
      reason: '상대 AD 데미지가 높아 방어력 아이템이 효과적입니다.',
      score: 0.85,
      ruleId: 'vs-high-ad',
    },
    reason: '상대 AD 데미지가 높아 방어력 아이템이 효과적입니다.',
  }),
});

// 규칙 3: 상대에 탱커가 많을 때
export const vsTankyRule: Rule<BuildRuleContext, BuildRuleResult> = createRule({
  id: 'vs-tanky',
  name: '탱커 상대 관통 아이템',
  description: '상대에 탱커/브루저가 2명 이상일 때 관통 아이템 추천',
  priority: 75,

  condition: (ctx) => {
    const tankCount = ctx.enemies.filter(
      (c) => c.class === 'Tank' || c.class === 'Bruiser'
    ).length;
    return tankCount >= 2;
  },

  apply: (ctx) => {
    const myDamage = ctx.myChampion.damageType;
    const item =
      myDamage === 'AD' ? ITEMS.LORD_DOMINIKS : ITEMS.VOID_STAFF;
    const itemName =
      myDamage === 'AD' ? '도미닉 경의 인사' : '공허의 지팡이';

    return {
      score: 0.8,
      result: {
        itemId: item,
        slot: 'core',
        reason: `상대 탱커가 많아 ${itemName}로 딜 효율을 높입니다.`,
        score: 0.8,
        ruleId: 'vs-tanky',
      },
      reason: `상대 탱커가 많아 ${itemName}로 딜 효율을 높입니다.`,
    };
  },
});

// 규칙 4: 상대에 암살자가 있을 때 (내가 딜러)
export const vsAssassinRule: Rule<BuildRuleContext, BuildRuleResult> = createRule({
  id: 'vs-assassin',
  name: '암살자 상대 생존 아이템',
  description: '상대에 암살자가 있고 내가 취약한 딜러일 때 생존 아이템 추천',
  priority: 85,

  condition: (ctx) => {
    const hasAssassin = ctx.enemies.some((c) => c.class === 'Assassin');
    const amSquishyCarry =
      ctx.myChampion.class === 'Marksman' ||
      ctx.myChampion.class === 'Mage' ||
      ctx.myChampion.class === 'Artillery';
    return hasAssassin && amSquishyCarry;
  },

  apply: (ctx) => {
    const assassin = ctx.enemies.find((c) => c.class === 'Assassin');
    const isADAssassin = assassin?.damageType === 'AD';
    const myDamage = ctx.myChampion.damageType;

    let item: number;
    let itemName: string;

    if (isADAssassin) {
      item = myDamage === 'AD' ? ITEMS.GUARDIAN_ANGEL : ITEMS.ZHONYAS_HOURGLASS;
      itemName = myDamage === 'AD' ? '수호 천사' : '존야의 모래시계';
    } else {
      item = myDamage === 'AD' ? ITEMS.MAW_OF_MALMORTIUS : ITEMS.BANSHEES_VEIL;
      itemName = myDamage === 'AD' ? '맬모셔스의 아귀' : '밴시의 장막';
    }

    return {
      score: 0.9,
      result: {
        itemId: item,
        slot: 'situational',
        reason: `상대 암살자 대비 ${itemName}로 생존력을 확보하세요.`,
        score: 0.9,
        ruleId: 'vs-assassin',
      },
      reason: `상대 암살자 대비 ${itemName}로 생존력을 확보하세요.`,
    };
  },
});

// 규칙 5: 상대에 힐러/드레인 챔피언이 있을 때
export const vsHealingRule: Rule<BuildRuleContext, BuildRuleResult> = createRule({
  id: 'vs-healing',
  name: '체력 회복 감소 아이템',
  description: '상대에 회복 능력이 강한 챔피언이 있을 때 회복 감소 추천',
  priority: 70,

  condition: (ctx) => {
    const healingChamps = ['Aatrox', 'Soraka', 'Yuumi', 'Sona', 'Vladimir', 'DrMundo', 'Fiora', 'Warwick', 'Sylas', 'Swain'];
    return ctx.enemies.some((c) => healingChamps.includes(c.id) || c.tags.includes('drain'));
  },

  apply: (ctx) => {
    const myDamage = ctx.myChampion.damageType;
    const item =
      myDamage === 'AD' ? ITEMS.MORTAL_REMINDER : ITEMS.MORELLONOMICON;
    const itemName = myDamage === 'AD' ? '필멸자의 인사' : '모렐로노미콘';

    return {
      score: 0.75,
      result: {
        itemId: item,
        slot: 'situational',
        reason: `상대 회복 챔피언 대비 ${itemName}가 효과적입니다.`,
        score: 0.75,
        ruleId: 'vs-healing',
      },
      reason: `상대 회복 챔피언 대비 ${itemName}가 효과적입니다.`,
    };
  },
});

// 규칙 6: 상대 CC가 많을 때
export const vsHeavyCCRule: Rule<BuildRuleContext, BuildRuleResult> = createRule({
  id: 'vs-heavy-cc',
  name: '강제 CC 대비 아이템',
  description: '상대 CC가 강력할 때 수은 아이템 추천',
  priority: 72,

  condition: (ctx) => {
    const ccScore = ctx.enemies.reduce((sum, c) => sum + c.ccPower, 0);
    const hasHardCC = ctx.enemies.some(
      (c) =>
        c.ccTypes.includes('Stun') ||
        c.ccTypes.includes('Charm') ||
        c.ccTypes.includes('Fear') ||
        c.ccTypes.includes('Root')
    );
    return ccScore >= 25 && hasHardCC;
  },

  apply: (ctx) => ({
    score: 0.7,
    result: {
      itemId: ITEMS.QUICKSILVER_SASH,
      slot: 'situational',
      reason: '상대 CC가 많아 수은 장신구가 필요합니다.',
      score: 0.7,
      ruleId: 'vs-heavy-cc',
    },
    reason: '상대 CC가 많아 수은 장신구가 필요합니다.',
  }),
});

// 규칙 7: 라인전 암살자 상대 방어 선템
export const vsAssassinLaneRule: Rule<BuildRuleContext, BuildRuleResult> = createRule({
  id: 'vs-assassin-lane',
  name: '라인전 암살자 대비 선템',
  description: '상대 라이너가 암살자일 때 방어 선템 추천',
  priority: 90,

  condition: (ctx) => {
    return ctx.enemyLaner?.class === 'Assassin';
  },

  apply: (ctx) => {
    const isAD = ctx.enemyLaner?.damageType === 'AD';
    const item = isAD ? ITEMS.PLATED_STEELCAPS : ITEMS.MERCURY_TREADS;
    const itemName = isAD ? '판금 장화' : '헤르메스의 발걸음';

    return {
      score: 0.88,
      result: {
        itemId: item,
        slot: 'boots',
        reason: `${ctx.enemyLaner?.name}은 암살자입니다. ${itemName}로 라인전을 안정화하세요.`,
        score: 0.88,
        ruleId: 'vs-assassin-lane',
      },
      reason: `${ctx.enemyLaner?.name}은 암살자입니다. ${itemName}로 라인전을 안정화하세요.`,
    };
  },
});

// 규칙 8: 우리팀에 탱커가 없을 때 (브루저가 탱키하게)
export const teamNoTankRule: Rule<BuildRuleContext, BuildRuleResult> = createRule({
  id: 'team-no-tank',
  name: '팀 탱커 부재 대응',
  description: '팀에 탱커가 없고 본인이 브루저일 때 탱키 빌드 추천',
  priority: 65,

  condition: (ctx) => {
    const hasTank = ctx.allies.some((c) => c.class === 'Tank');
    const amBruiser = ctx.myChampion.class === 'Bruiser';
    return !hasTank && amBruiser;
  },

  apply: () => ({
    score: 0.6,
    result: {
      itemId: ITEMS.DEAD_MANS_PLATE,
      slot: 'situational',
      reason: '팀에 탱커가 없으니 방어 아이템으로 프론트라인 역할을 보완하세요.',
      score: 0.6,
      ruleId: 'team-no-tank',
    },
    reason: '팀에 탱커가 없으니 방어 아이템으로 프론트라인 역할을 보완하세요.',
  }),
});

// 규칙 9: 상대 포킹 조합
export const vsPokeRule: Rule<BuildRuleContext, BuildRuleResult> = createRule({
  id: 'vs-poke',
  name: '포킹 조합 대비',
  description: '상대 포킹 챔피언이 많을 때 회복/방어 추천',
  priority: 68,

  condition: (ctx) => {
    const pokers = ctx.enemies.filter((c) => c.damageProfile.poke >= 7).length;
    return pokers >= 2;
  },

  apply: (ctx) => {
    const mainPoker = ctx.enemies.find((c) => c.damageProfile.poke >= 7);
    const isAP = mainPoker?.damageType === 'AP';
    const item = isAP ? ITEMS.FORCE_OF_NATURE : ITEMS.DEAD_MANS_PLATE;

    return {
      score: 0.65,
      result: {
        itemId: item,
        slot: 'situational',
        reason: '상대 포킹이 강합니다. 이동 속도와 방어력으로 접근하세요.',
        score: 0.65,
        ruleId: 'vs-poke',
      },
      reason: '상대 포킹이 강합니다. 이동 속도와 방어력으로 접근하세요.',
    };
  },
});

// 규칙 10: 상대 억압 CC
export const vsSuppressRule: Rule<BuildRuleContext, BuildRuleResult> = createRule({
  id: 'vs-suppress',
  name: '억압 CC 대비',
  description: '상대에 억압 스킬이 있을 때 수은 아이템 추천',
  priority: 78,

  condition: (ctx) => {
    return ctx.enemies.some((c) => c.ccTypes.includes('Suppress'));
  },

  apply: () => ({
    score: 0.82,
    result: {
      itemId: ITEMS.MERCURIAL_SCIMITAR,
      slot: 'situational',
      reason: '상대 억압 스킬 대비 수은의 장검이 필수입니다.',
      score: 0.82,
      ruleId: 'vs-suppress',
    },
    reason: '상대 억압 스킬 대비 수은의 장검이 필수입니다.',
  }),
});

// 모든 빌드 규칙
export const ALL_BUILD_RULES: Rule<BuildRuleContext, BuildRuleResult>[] = [
  vsHighAPRule,
  vsHighADRule,
  vsTankyRule,
  vsAssassinRule,
  vsHealingRule,
  vsHeavyCCRule,
  vsAssassinLaneRule,
  teamNoTankRule,
  vsPokeRule,
  vsSuppressRule,
];
