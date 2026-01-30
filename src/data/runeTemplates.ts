/**
 * 룬 템플릿
 *
 * 챔피언별, 상황별 추천 룬 세트를 정의합니다.
 */

import type { RuneTemplate } from '@/types';

// 기본 룬 템플릿들
export const RUNE_TEMPLATES: Record<string, RuneTemplate> = {
  // ============================================
  // 정밀 키스톤 기반
  // ============================================
  'bruiser-conqueror': {
    id: 'bruiser-conqueror',
    name: '브루저 정복자',
    primaryTree: 'Precision',
    primaryKeystone: 'Conqueror',
    primaryRunes: ['Triumph', 'LegendTenacity', 'LastStand'],
    secondaryTree: 'Resolve',
    secondaryRunes: ['SecondWind', 'Revitalize'],
    statRunes: ['AdaptiveForce', 'AdaptiveForce2', 'Health'],
    priority: 80,
    description: '지속 전투에 강한 브루저용 표준 세팅',
  },

  'adc-lethal-tempo': {
    id: 'adc-lethal-tempo',
    name: 'ADC 치명적 속도',
    primaryTree: 'Precision',
    primaryKeystone: 'LethalTempo',
    primaryRunes: ['Triumph', 'LegendAlacrity', 'CoupDeGrace'],
    secondaryTree: 'Domination',
    secondaryRunes: ['TasteOfBlood', 'TreasureHunter'],
    statRunes: ['AttackSpeed', 'AdaptiveForce2', 'Health'],
    priority: 75,
    description: 'DPS 극대화 ADC 세팅',
  },

  'adc-fleet-footwork': {
    id: 'adc-fleet-footwork',
    name: 'ADC 기민한 발놀림',
    primaryTree: 'Precision',
    primaryKeystone: 'FleetFootwork',
    primaryRunes: ['Overheal', 'LegendBloodline', 'CoupDeGrace'],
    secondaryTree: 'Inspiration',
    secondaryRunes: ['MagicalFootwear', 'BiscuitDelivery'],
    statRunes: ['AttackSpeed', 'AdaptiveForce2', 'Health'],
    priority: 70,
    condition: { playstyle: 'Defensive' },
    description: '라인 유지력이 필요한 ADC 세팅',
  },

  'adc-press-attack': {
    id: 'adc-press-attack',
    name: 'ADC 집중 공격',
    primaryTree: 'Precision',
    primaryKeystone: 'PressTheAttack',
    primaryRunes: ['Triumph', 'LegendAlacrity', 'CutDown'],
    secondaryTree: 'Domination',
    secondaryRunes: ['TasteOfBlood', 'TreasureHunter'],
    statRunes: ['AttackSpeed', 'AdaptiveForce2', 'Health'],
    priority: 72,
    condition: { playstyle: 'Aggressive' },
    description: '버스트와 팀 협동에 좋은 ADC 세팅',
  },

  // ============================================
  // 지배 키스톤 기반
  // ============================================
  'assassin-electrocute': {
    id: 'assassin-electrocute',
    name: '암살자 감전',
    primaryTree: 'Domination',
    primaryKeystone: 'Electrocute',
    primaryRunes: ['SuddenImpact', 'EyeballCollection', 'TreasureHunter'],
    secondaryTree: 'Precision',
    secondaryRunes: ['Triumph', 'CoupDeGrace'],
    statRunes: ['AdaptiveForce', 'AdaptiveForce2', 'Health'],
    priority: 85,
    description: '순간 폭딜 암살자 표준 세팅',
  },

  'assassin-dark-harvest': {
    id: 'assassin-dark-harvest',
    name: '암살자 어둠의 수확',
    primaryTree: 'Domination',
    primaryKeystone: 'DarkHarvest',
    primaryRunes: ['SuddenImpact', 'EyeballCollection', 'UltimateHunter'],
    secondaryTree: 'Sorcery',
    secondaryRunes: ['Transcendence', 'GatheringStorm'],
    statRunes: ['AdaptiveForce', 'AdaptiveForce2', 'Health'],
    priority: 78,
    description: '스케일링 암살자 세팅',
  },

  'burst-hail-of-blades': {
    id: 'burst-hail-of-blades',
    name: '칼날비 버스트',
    primaryTree: 'Domination',
    primaryKeystone: 'HailOfBlades',
    primaryRunes: ['TasteOfBlood', 'EyeballCollection', 'TreasureHunter'],
    secondaryTree: 'Precision',
    secondaryRunes: ['LegendAlacrity', 'CoupDeGrace'],
    statRunes: ['AttackSpeed', 'AdaptiveForce2', 'Health'],
    priority: 75,
    description: '초반 교전 버스트 세팅',
  },

  // ============================================
  // 마법 키스톤 기반
  // ============================================
  'mage-arcane-comet': {
    id: 'mage-arcane-comet',
    name: '마법사 신비로운 유성',
    primaryTree: 'Sorcery',
    primaryKeystone: 'ArcaneComet',
    primaryRunes: ['ManaflowBand', 'Transcendence', 'Scorch'],
    secondaryTree: 'Inspiration',
    secondaryRunes: ['BiscuitDelivery', 'CosmicInsight'],
    statRunes: ['AdaptiveForce', 'AdaptiveForce2', 'Health'],
    priority: 80,
    description: '포킹 마법사 표준 세팅',
  },

  'mage-phase-rush': {
    id: 'mage-phase-rush',
    name: '마법사 신속한 발',
    primaryTree: 'Sorcery',
    primaryKeystone: 'PhaseRush',
    primaryRunes: ['NimbusCloak', 'Transcendence', 'GatheringStorm'],
    secondaryTree: 'Inspiration',
    secondaryRunes: ['BiscuitDelivery', 'TimeWarpTonic'],
    statRunes: ['AdaptiveForce', 'AdaptiveForce2', 'MagicResist'],
    priority: 75,
    condition: { vsClass: ['Assassin'] },
    description: '암살자 상대 회피형 마법사 세팅',
  },

  'enchanter-aery': {
    id: 'enchanter-aery',
    name: '인챈터 콩콩이',
    primaryTree: 'Sorcery',
    primaryKeystone: 'SummonAery',
    primaryRunes: ['ManaflowBand', 'Transcendence', 'Scorch'],
    secondaryTree: 'Resolve',
    secondaryRunes: ['BonePlating', 'Revitalize'],
    statRunes: ['AdaptiveForce', 'AdaptiveForce2', 'Health'],
    priority: 85,
    description: '인챈터 서포터 표준 세팅',
  },

  // ============================================
  // 결의 키스톤 기반
  // ============================================
  'tank-grasp': {
    id: 'tank-grasp',
    name: '탱커 착취의 손아귀',
    primaryTree: 'Resolve',
    primaryKeystone: 'GraspOfTheUndying',
    primaryRunes: ['Demolish', 'SecondWind', 'Overgrowth'],
    secondaryTree: 'Precision',
    secondaryRunes: ['Triumph', 'LegendTenacity'],
    statRunes: ['AttackSpeed', 'AdaptiveForce2', 'Health'],
    priority: 80,
    description: '라인전 강화 탱커 세팅',
  },

  'engage-aftershock': {
    id: 'engage-aftershock',
    name: '이니시에이터 여진',
    primaryTree: 'Resolve',
    primaryKeystone: 'Aftershock',
    primaryRunes: ['FontOfLife', 'BonePlating', 'Unflinching'],
    secondaryTree: 'Inspiration',
    secondaryRunes: ['HextechFlashtraption', 'CosmicInsight'],
    statRunes: ['AbilityHaste', 'AdaptiveForce2', 'Health'],
    priority: 85,
    description: '이니시 탱커 서포터 세팅',
  },

  'peel-guardian': {
    id: 'peel-guardian',
    name: '필 수호자',
    primaryTree: 'Resolve',
    primaryKeystone: 'Guardian',
    primaryRunes: ['FontOfLife', 'BonePlating', 'Revitalize'],
    secondaryTree: 'Inspiration',
    secondaryRunes: ['BiscuitDelivery', 'CosmicInsight'],
    statRunes: ['AbilityHaste', 'AdaptiveForce2', 'Health'],
    priority: 75,
    description: '필 중심 탱커 서포터 세팅',
  },

  // ============================================
  // 영감 키스톤 기반
  // ============================================
  'utility-glacial': {
    id: 'utility-glacial',
    name: '유틸 빙결 강화',
    primaryTree: 'Inspiration',
    primaryKeystone: 'GlacialAugment',
    primaryRunes: ['PerfectTiming', 'BiscuitDelivery', 'CosmicInsight'],
    secondaryTree: 'Sorcery',
    secondaryRunes: ['ManaflowBand', 'Transcendence'],
    statRunes: ['AbilityHaste', 'AdaptiveForce2', 'Health'],
    priority: 70,
    description: 'CC 서포터 유틸리티 세팅',
  },

  'scaling-first-strike': {
    id: 'scaling-first-strike',
    name: '스케일링 선제 공격',
    primaryTree: 'Inspiration',
    primaryKeystone: 'FirstStrike',
    primaryRunes: ['MagicalFootwear', 'FuturesMarket', 'CosmicInsight'],
    secondaryTree: 'Sorcery',
    secondaryRunes: ['Transcendence', 'GatheringStorm'],
    statRunes: ['AdaptiveForce', 'AdaptiveForce2', 'Health'],
    priority: 75,
    description: '골드 및 스케일링 극대화 세팅',
  },

  // ============================================
  // 상황별 특수 세팅
  // ============================================
  'vs-assassin-defensive': {
    id: 'vs-assassin-defensive',
    name: '암살자 상대 방어 세팅',
    primaryTree: 'Resolve',
    primaryKeystone: 'GraspOfTheUndying',
    primaryRunes: ['ShieldBash', 'BonePlating', 'Overgrowth'],
    secondaryTree: 'Precision',
    secondaryRunes: ['Triumph', 'LegendTenacity'],
    statRunes: ['AdaptiveForce', 'AdaptiveForce2', 'Armor'],
    priority: 90,
    condition: { vsClass: ['Assassin'] },
    description: 'AD 암살자 상대 생존 세팅',
  },

  'vs-poke-sustain': {
    id: 'vs-poke-sustain',
    name: '포킹 상대 유지력 세팅',
    primaryTree: 'Resolve',
    primaryKeystone: 'GraspOfTheUndying',
    primaryRunes: ['Demolish', 'SecondWind', 'Revitalize'],
    secondaryTree: 'Inspiration',
    secondaryRunes: ['BiscuitDelivery', 'TimeWarpTonic'],
    statRunes: ['AdaptiveForce', 'AdaptiveForce2', 'MagicResist'],
    priority: 85,
    condition: { playstyle: 'Defensive' },
    description: '포킹 상대 라인 유지 세팅',
  },

  'late-scaling': {
    id: 'late-scaling',
    name: '후반 스케일링',
    primaryTree: 'Sorcery',
    primaryKeystone: 'PhaseRush',
    primaryRunes: ['ManaflowBand', 'Transcendence', 'GatheringStorm'],
    secondaryTree: 'Inspiration',
    secondaryRunes: ['MagicalFootwear', 'CosmicInsight'],
    statRunes: ['AdaptiveForce', 'AdaptiveForce2', 'Health'],
    priority: 70,
    description: '후반 스케일링 극대화 세팅',
  },
};

// 템플릿 ID로 가져오기
export function getRuneTemplate(templateId: string): RuneTemplate | undefined {
  return RUNE_TEMPLATES[templateId];
}

// 모든 템플릿 가져오기
export function getAllRuneTemplates(): RuneTemplate[] {
  return Object.values(RUNE_TEMPLATES);
}

// 조건에 맞는 템플릿 필터링
export function filterRuneTemplates(
  options: {
    primaryTree?: string;
    keystoneId?: string;
    playstyle?: 'Aggressive' | 'Defensive' | 'Scaling' | 'Utility';
    vsClass?: string;
  }
): RuneTemplate[] {
  return Object.values(RUNE_TEMPLATES).filter((t) => {
    if (options.primaryTree && t.primaryTree !== options.primaryTree) return false;
    if (options.keystoneId && t.primaryKeystone !== options.keystoneId) return false;
    if (options.playstyle && t.condition?.playstyle !== options.playstyle) return false;
    if (options.vsClass && !t.condition?.vsClass?.includes(options.vsClass as any)) return false;
    return true;
  });
}
