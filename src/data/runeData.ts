/**
 * 룬 정적 데이터
 *
 * 모든 룬 정보와 트리 구조를 정의합니다.
 */

import type { RuneTree, RuneInfo, StatRuneInfo } from '@/types';

// 룬 트리 정보
export const RUNE_TREES: Record<RuneTree, { name: string; color: string }> = {
  Precision: { name: '정밀', color: '#C8AA6E' },
  Domination: { name: '지배', color: '#D44545' },
  Sorcery: { name: '마법', color: '#9FAAFC' },
  Resolve: { name: '결의', color: '#A1D586' },
  Inspiration: { name: '영감', color: '#49AAF1' },
};

// 키스톤 룬
export const KEYSTONES: Record<string, RuneInfo> = {
  // 정밀
  PressTheAttack: {
    id: 'PressTheAttack',
    name: '집중 공격',
    description: '3회 연속 공격 시 추가 피해 및 피해 증가 효과',
    longDescription: '기본 공격으로 3회 연속 공격하면 추가 적응형 피해를 입히고, 대상이 받는 피해가 증가합니다.',
    tree: 'Precision',
    slot: 0,
    icon: 'perk-images/Styles/Precision/PressTheAttack/PressTheAttack.png',
  },
  LethalTempo: {
    id: 'LethalTempo',
    name: '치명적 속도',
    description: '전투 시 공격 속도 지속 증가',
    longDescription: '챔피언을 공격하면 공격 속도가 점점 증가합니다. 최대 스택 시 사거리가 증가합니다.',
    tree: 'Precision',
    slot: 0,
    icon: 'perk-images/Styles/Precision/LethalTempo/LethalTempoTemp.png',
  },
  FleetFootwork: {
    id: 'FleetFootwork',
    name: '기민한 발놀림',
    description: '이동과 공격 시 에너지 충전, 완충 시 체력 회복',
    longDescription: '이동과 공격 시 에너지가 충전됩니다. 완충 시 다음 공격이 체력을 회복하고 이동 속도를 증가시킵니다.',
    tree: 'Precision',
    slot: 0,
    icon: 'perk-images/Styles/Precision/FleetFootwork/FleetFootwork.png',
  },
  Conqueror: {
    id: 'Conqueror',
    name: '정복자',
    description: '전투 시 적응형 능력치 스택, 최대 스택 시 체력 흡수',
    longDescription: '챔피언과의 전투 시 적응형 능력치가 스택됩니다. 최대 스택 시 피해량의 일부를 체력으로 흡수합니다.',
    tree: 'Precision',
    slot: 0,
    icon: 'perk-images/Styles/Precision/Conqueror/Conqueror.png',
  },

  // 지배
  Electrocute: {
    id: 'Electrocute',
    name: '감전',
    description: '3회 개별 공격/스킬 적중 시 추가 피해',
    longDescription: '3초 내에 3회의 개별 공격이나 스킬로 적중하면 추가 적응형 피해를 입힙니다.',
    tree: 'Domination',
    slot: 0,
    icon: 'perk-images/Styles/Domination/Electrocute/Electrocute.png',
  },
  DarkHarvest: {
    id: 'DarkHarvest',
    name: '어둠의 수확',
    description: '체력이 낮은 적 공격 시 영혼 수확, 피해 증가',
    longDescription: '체력이 낮은 챔피언을 공격하면 영혼을 수확합니다. 수확한 영혼만큼 피해가 증가합니다.',
    tree: 'Domination',
    slot: 0,
    icon: 'perk-images/Styles/Domination/DarkHarvest/DarkHarvest.png',
  },
  HailOfBlades: {
    id: 'HailOfBlades',
    name: '칼날비',
    description: '전투 시작 시 공격 속도 폭발적 증가',
    longDescription: '전투 시작 시 처음 3회 기본 공격의 공격 속도가 폭발적으로 증가합니다.',
    tree: 'Domination',
    slot: 0,
    icon: 'perk-images/Styles/Domination/HailOfBlades/HailOfBlades.png',
  },

  // 마법
  SummonAery: {
    id: 'SummonAery',
    name: '콩콩이 소환',
    description: '스킬 적중 시 콩콩이가 피해 또는 보호막 제공',
    longDescription: '스킬로 적을 공격하면 콩콩이가 피해를 입히고, 아군에게 스킬 사용 시 보호막을 제공합니다.',
    tree: 'Sorcery',
    slot: 0,
    icon: 'perk-images/Styles/Sorcery/SummonAery/SummonAery.png',
  },
  ArcaneComet: {
    id: 'ArcaneComet',
    name: '신비로운 유성',
    description: '스킬 적중 시 유성 발사',
    longDescription: '챔피언에게 스킬로 피해를 입히면 유성이 발사됩니다. 스킬 적중 시 쿨다운이 감소합니다.',
    tree: 'Sorcery',
    slot: 0,
    icon: 'perk-images/Styles/Sorcery/ArcaneComet/ArcaneComet.png',
  },
  PhaseRush: {
    id: 'PhaseRush',
    name: '신속한 발',
    description: '3회 개별 공격 적중 시 이동 속도 대폭 증가',
    longDescription: '4초 내에 3회 개별 공격으로 챔피언에게 피해를 입히면 이동 속도가 대폭 증가합니다.',
    tree: 'Sorcery',
    slot: 0,
    icon: 'perk-images/Styles/Sorcery/PhaseRush/PhaseRush.png',
  },

  // 결의
  GraspOfTheUndying: {
    id: 'GraspOfTheUndying',
    name: '착취의 손아귀',
    description: '전투 유지 시 다음 기본 공격이 체력 흡수 및 영구 체력 증가',
    longDescription: '전투 중 4초마다 다음 기본 공격이 추가 피해를 입히고 체력을 회복하며 영구적으로 최대 체력이 증가합니다.',
    tree: 'Resolve',
    slot: 0,
    icon: 'perk-images/Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png',
  },
  Aftershock: {
    id: 'Aftershock',
    name: '여진',
    description: 'CC기 적중 시 방어력/마저 증가 후 폭발',
    longDescription: '적 챔피언에게 이동 불가 효과를 적용하면 방어력과 마법 저항력이 증가하고, 잠시 후 주변에 피해를 입힙니다.',
    tree: 'Resolve',
    slot: 0,
    icon: 'perk-images/Styles/Resolve/VeteranAftershock/VeteranAftershock.png',
  },
  Guardian: {
    id: 'Guardian',
    name: '수호자',
    description: '가까운 아군과 함께 피해를 받으면 보호막 생성',
    longDescription: '가까운 아군 챔피언과 함께 있을 때 피해를 받으면 둘 다에게 보호막이 생성됩니다.',
    tree: 'Resolve',
    slot: 0,
    icon: 'perk-images/Styles/Resolve/Guardian/Guardian.png',
  },

  // 영감
  GlacialAugment: {
    id: 'GlacialAugment',
    name: '빙결 강화',
    description: '적 챔피언을 이동 불가로 만들면 빙결 광선 생성',
    longDescription: '적 챔피언을 이동 불가 상태로 만들면 주변으로 빙결 광선이 뻗어나가 적들을 둔화시킵니다.',
    tree: 'Inspiration',
    slot: 0,
    icon: 'perk-images/Styles/Inspiration/GlacialAugment/GlacialAugment.png',
  },
  UnsealedSpellbook: {
    id: 'UnsealedSpellbook',
    name: '봉인 풀린 주문서',
    description: '게임 중 소환사 주문 교체 가능',
    longDescription: '게임 중 소환사 주문을 다른 주문으로 교체할 수 있습니다. 교체할 때마다 추가 효과를 얻습니다.',
    tree: 'Inspiration',
    slot: 0,
    icon: 'perk-images/Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook.png',
  },
  FirstStrike: {
    id: 'FirstStrike',
    name: '선제 공격',
    description: '전투를 먼저 시작하면 추가 피해 및 골드 획득',
    longDescription: '전투를 먼저 시작하면 추가 피해를 입히고, 입힌 피해량에 비례하여 골드를 획득합니다.',
    tree: 'Inspiration',
    slot: 0,
    icon: 'perk-images/Styles/Inspiration/FirstStrike/FirstStrike.png',
  },
};

// 일반 룬 (슬롯 1-3)
export const MINOR_RUNES: Record<string, RuneInfo> = {
  // 정밀 슬롯 1
  Overheal: {
    id: 'Overheal',
    name: '과다치유',
    description: '초과 회복량을 보호막으로 전환',
    longDescription: '초과 회복량이 보호막으로 전환됩니다.',
    tree: 'Precision',
    slot: 1,
    icon: 'perk-images/Styles/Precision/Overheal.png',
  },
  Triumph: {
    id: 'Triumph',
    name: '승전보',
    description: '챔피언 처치 시 체력 회복 및 추가 골드',
    longDescription: '챔피언 처치 시 잃은 체력을 회복하고 추가 골드를 획득합니다.',
    tree: 'Precision',
    slot: 1,
    icon: 'perk-images/Styles/Precision/Triumph.png',
  },
  PresenceOfMind: {
    id: 'PresenceOfMind',
    name: '정신 집중',
    description: '챔피언 피해 시 마나/기력 회복',
    longDescription: '챔피언에게 피해를 입히면 마나나 기력을 회복합니다.',
    tree: 'Precision',
    slot: 1,
    icon: 'perk-images/Styles/Precision/PresenceOfMind.png',
  },

  // 정밀 슬롯 2
  LegendAlacrity: {
    id: 'LegendAlacrity',
    name: '전설: 민첩함',
    description: '스택당 공격 속도 증가',
    longDescription: '챔피언 처치 시 스택을 얻어 공격 속도가 증가합니다.',
    tree: 'Precision',
    slot: 2,
    icon: 'perk-images/Styles/Precision/LegendAlacrity.png',
  },
  LegendTenacity: {
    id: 'LegendTenacity',
    name: '전설: 강인함',
    description: '스택당 강인함 증가',
    longDescription: '챔피언 처치 시 스택을 얻어 강인함이 증가합니다.',
    tree: 'Precision',
    slot: 2,
    icon: 'perk-images/Styles/Precision/LegendTenacity.png',
  },
  LegendBloodline: {
    id: 'LegendBloodline',
    name: '전설: 피의 길',
    description: '스택당 생명력 흡수 증가',
    longDescription: '챔피언 처치 시 스택을 얻어 생명력 흡수가 증가합니다.',
    tree: 'Precision',
    slot: 2,
    icon: 'perk-images/Styles/Precision/LegendBloodline.png',
  },

  // 정밀 슬롯 3
  CoupDeGrace: {
    id: 'CoupDeGrace',
    name: '최후의 일격',
    description: '체력이 낮은 적에게 추가 피해',
    longDescription: '체력이 40% 이하인 챔피언에게 추가 피해를 입힙니다.',
    tree: 'Precision',
    slot: 3,
    icon: 'perk-images/Styles/Precision/CoupDeGrace.png',
  },
  CutDown: {
    id: 'CutDown',
    name: '체력 차 극복',
    description: '체력이 더 많은 적에게 추가 피해',
    longDescription: '최대 체력이 나보다 높은 챔피언에게 추가 피해를 입힙니다.',
    tree: 'Precision',
    slot: 3,
    icon: 'perk-images/Styles/Precision/CutDown.png',
  },
  LastStand: {
    id: 'LastStand',
    name: '최후의 저항',
    description: '체력이 낮을 때 피해량 증가',
    longDescription: '체력이 낮을수록 피해량이 증가합니다.',
    tree: 'Precision',
    slot: 3,
    icon: 'perk-images/Styles/Precision/LastStand.png',
  },

  // 지배 슬롯 1
  CheapShot: {
    id: 'CheapShot',
    name: '비열한 한 방',
    description: 'CC 걸린 적에게 추가 피해',
    longDescription: '이동이 불가하거나 둔화된 챔피언에게 추가 고정 피해를 입힙니다.',
    tree: 'Domination',
    slot: 1,
    icon: 'perk-images/Styles/Domination/CheapShot.png',
  },
  TasteOfBlood: {
    id: 'TasteOfBlood',
    name: '피의 맛',
    description: '챔피언 공격 시 체력 회복',
    longDescription: '챔피언에게 피해를 입히면 체력을 회복합니다.',
    tree: 'Domination',
    slot: 1,
    icon: 'perk-images/Styles/Domination/TasteOfBlood.png',
  },
  SuddenImpact: {
    id: 'SuddenImpact',
    name: '돌발 일격',
    description: '돌진/점멸 후 관통력 증가',
    longDescription: '돌진, 점멸, 잠복 해제 후 치명타 확률과 관통력이 증가합니다.',
    tree: 'Domination',
    slot: 1,
    icon: 'perk-images/Styles/Domination/SuddenImpact.png',
  },

  // 지배 슬롯 2
  ZombieWard: {
    id: 'ZombieWard',
    name: '좀비 와드',
    description: '적 와드 파괴 시 아군 와드 생성',
    longDescription: '적 와드를 파괴하면 그 자리에 좀비 와드가 생성됩니다.',
    tree: 'Domination',
    slot: 2,
    icon: 'perk-images/Styles/Domination/ZombieWard.png',
  },
  GhostPoro: {
    id: 'GhostPoro',
    name: '유령 포로',
    description: '와드 만료 시 유령 포로 소환',
    longDescription: '와드가 만료되면 유령 포로가 소환되어 시야를 제공합니다.',
    tree: 'Domination',
    slot: 2,
    icon: 'perk-images/Styles/Domination/GhostPoro.png',
  },
  EyeballCollection: {
    id: 'EyeballCollection',
    name: '안구 수집가',
    description: '처치 시 적응형 능력치 획득',
    longDescription: '챔피언 처치 시 안구를 수집하여 적응형 능력치가 증가합니다.',
    tree: 'Domination',
    slot: 2,
    icon: 'perk-images/Styles/Domination/EyeballCollection.png',
  },

  // 지배 슬롯 3
  TreasureHunter: {
    id: 'TreasureHunter',
    name: '보물 사냥꾼',
    description: '첫 처치 시 추가 골드',
    longDescription: '각 적 챔피언을 처음 처치할 때마다 추가 골드를 획득합니다.',
    tree: 'Domination',
    slot: 3,
    icon: 'perk-images/Styles/Domination/TreasureHunter.png',
  },
  IngeniousHunter: {
    id: 'IngeniousHunter',
    name: '교묘한 사냥꾼',
    description: '처치 시 아이템 쿨다운 감소',
    longDescription: '고유 처치 시 아이템 쿨다운 감소가 증가합니다.',
    tree: 'Domination',
    slot: 3,
    icon: 'perk-images/Styles/Domination/IngeniousHunter.png',
  },
  RelentlessHunter: {
    id: 'RelentlessHunter',
    name: '끈질긴 사냥꾼',
    description: '처치 시 비전투 이동 속도 증가',
    longDescription: '고유 처치 시 비전투 시 이동 속도가 증가합니다.',
    tree: 'Domination',
    slot: 3,
    icon: 'perk-images/Styles/Domination/RelentlessHunter.png',
  },
  UltimateHunter: {
    id: 'UltimateHunter',
    name: '궁극의 사냥꾼',
    description: '처치 시 궁극기 쿨다운 감소',
    longDescription: '고유 처치 시 궁극기 쿨다운 감소가 증가합니다.',
    tree: 'Domination',
    slot: 3,
    icon: 'perk-images/Styles/Domination/UltimateHunter.png',
  },

  // 마법 슬롯 1-3 (주요만)
  NullifyingOrb: {
    id: 'NullifyingOrb',
    name: '무효화 구슬',
    description: '체력이 낮을 때 마법 피해 보호막',
    longDescription: '체력이 낮을 때 마법 피해를 받으면 보호막이 생성됩니다.',
    tree: 'Sorcery',
    slot: 1,
    icon: 'perk-images/Styles/Sorcery/NullifyingOrb.png',
  },
  ManaflowBand: {
    id: 'ManaflowBand',
    name: '마나순환 팔찌',
    description: '스킬 적중 시 마나 증가',
    longDescription: '챔피언에게 스킬로 피해를 입히면 최대 마나가 증가합니다.',
    tree: 'Sorcery',
    slot: 1,
    icon: 'perk-images/Styles/Sorcery/ManaflowBand.png',
  },
  NimbusCloak: {
    id: 'NimbusCloak',
    name: '님버스 망토',
    description: '소환사 주문 사용 시 이동 속도 증가',
    longDescription: '소환사 주문 사용 시 잠시 이동 속도가 증가합니다.',
    tree: 'Sorcery',
    slot: 1,
    icon: 'perk-images/Styles/Sorcery/NimbusCloak.png',
  },
  Transcendence: {
    id: 'Transcendence',
    name: '깨달음',
    description: '레벨업 시 스킬 가속 증가',
    longDescription: '레벨업 시 스킬 가속이 증가하고, 처치 시 스킬 쿨다운이 감소합니다.',
    tree: 'Sorcery',
    slot: 2,
    icon: 'perk-images/Styles/Sorcery/Transcendence.png',
  },
  Celerity: {
    id: 'Celerity',
    name: '신속함',
    description: '이동 속도 보너스 증가',
    longDescription: '모든 이동 속도 보너스가 증가합니다.',
    tree: 'Sorcery',
    slot: 2,
    icon: 'perk-images/Styles/Sorcery/Celerity.png',
  },
  AbsoluteFocus: {
    id: 'AbsoluteFocus',
    name: '절대 집중',
    description: '체력이 높을 때 적응형 능력치 증가',
    longDescription: '체력이 70% 이상일 때 적응형 능력치가 증가합니다.',
    tree: 'Sorcery',
    slot: 2,
    icon: 'perk-images/Styles/Sorcery/AbsoluteFocus.png',
  },
  Scorch: {
    id: 'Scorch',
    name: '주문 작열',
    description: '스킬 적중 시 추가 화상 피해',
    longDescription: '챔피언에게 스킬로 피해를 입히면 화상 피해를 입힙니다.',
    tree: 'Sorcery',
    slot: 3,
    icon: 'perk-images/Styles/Sorcery/Scorch.png',
  },
  Waterwalking: {
    id: 'Waterwalking',
    name: '물 위를 걷는 자',
    description: '강에서 이동 속도 및 적응형 능력치 증가',
    longDescription: '강에서 이동 속도와 적응형 능력치가 증가합니다.',
    tree: 'Sorcery',
    slot: 3,
    icon: 'perk-images/Styles/Sorcery/Waterwalking.png',
  },
  GatheringStorm: {
    id: 'GatheringStorm',
    name: '폭풍의 결집',
    description: '시간이 지남에 따라 적응형 능력치 증가',
    longDescription: '게임이 진행됨에 따라 적응형 능력치가 증가합니다.',
    tree: 'Sorcery',
    slot: 3,
    icon: 'perk-images/Styles/Sorcery/GatheringStorm.png',
  },

  // 결의 슬롯 1-3 (주요만)
  Demolish: {
    id: 'Demolish',
    name: '철거',
    description: '포탑 근처에서 충전 후 강력한 공격',
    longDescription: '포탑 근처에서 충전하여 강력한 포탑 공격을 합니다.',
    tree: 'Resolve',
    slot: 1,
    icon: 'perk-images/Styles/Resolve/Demolish.png',
  },
  FontOfLife: {
    id: 'FontOfLife',
    name: '생명의 샘',
    description: '적에게 CC 적용 시 아군에게 회복 제공',
    longDescription: '적에게 이동 불가 효과를 적용하면 아군이 그 적을 공격할 때 체력을 회복합니다.',
    tree: 'Resolve',
    slot: 1,
    icon: 'perk-images/Styles/Resolve/FontOfLife.png',
  },
  ShieldBash: {
    id: 'ShieldBash',
    name: '보호막 강타',
    description: '보호막 보유 시 다음 기본 공격 강화',
    longDescription: '보호막이 있을 때 다음 기본 공격이 강화됩니다.',
    tree: 'Resolve',
    slot: 1,
    icon: 'perk-images/Styles/Resolve/ShieldBash.png',
  },
  Conditioning: {
    id: 'Conditioning',
    name: '조건부 저항',
    description: '12분 후 방어력/마저 증가',
    longDescription: '12분 후 방어력과 마법 저항력이 증가하고, 보너스 방어력/마저의 비율이 증가합니다.',
    tree: 'Resolve',
    slot: 2,
    icon: 'perk-images/Styles/Resolve/Conditioning.png',
  },
  SecondWind: {
    id: 'SecondWind',
    name: '재생의 바람',
    description: '챔피언에게 피해 후 체력 회복',
    longDescription: '챔피언에게 피해를 받은 후 잃은 체력의 일부를 회복합니다.',
    tree: 'Resolve',
    slot: 2,
    icon: 'perk-images/Styles/Resolve/SecondWind.png',
  },
  BonePlating: {
    id: 'BonePlating',
    name: '뼈 방패',
    description: '챔피언 피해 후 잠시 피해 감소',
    longDescription: '챔피언에게 피해를 받은 후 다음 3회의 공격/스킬 피해가 감소합니다.',
    tree: 'Resolve',
    slot: 2,
    icon: 'perk-images/Styles/Resolve/BonePlating.png',
  },
  Overgrowth: {
    id: 'Overgrowth',
    name: '과잉성장',
    description: '근처 미니언 사망 시 영구 체력 증가',
    longDescription: '근처에서 미니언이 사망할 때마다 영구적으로 최대 체력이 증가합니다.',
    tree: 'Resolve',
    slot: 3,
    icon: 'perk-images/Styles/Resolve/Overgrowth.png',
  },
  Revitalize: {
    id: 'Revitalize',
    name: '소생',
    description: '회복 및 보호막 효과 증가',
    longDescription: '회복 및 보호막 효과가 증가합니다. 체력이 낮을 때 더욱 증가합니다.',
    tree: 'Resolve',
    slot: 3,
    icon: 'perk-images/Styles/Resolve/Revitalize.png',
  },
  Unflinching: {
    id: 'Unflinching',
    name: '불굴의 의지',
    description: '체력이 낮을 때 강인함 및 둔화 저항 증가',
    longDescription: '체력이 낮을 때 강인함과 둔화 저항이 증가합니다.',
    tree: 'Resolve',
    slot: 3,
    icon: 'perk-images/Styles/Resolve/Unflinching.png',
  },

  // 영감 슬롯 1-3 (주요만)
  HextechFlashtraption: {
    id: 'HextechFlashtraption',
    name: '마법공학 점멸기',
    description: '점멸 쿨다운 중 대체 점멸 사용 가능',
    longDescription: '점멸이 쿨다운일 때 마법공학 점멸기를 충전하여 사용할 수 있습니다.',
    tree: 'Inspiration',
    slot: 1,
    icon: 'perk-images/Styles/Inspiration/HextechFlashtraption.png',
  },
  MagicalFootwear: {
    id: 'MagicalFootwear',
    name: '마법의 신발',
    description: '12분 후 무료 부츠 획득',
    longDescription: '12분 후 무료로 약간 빠른 장화를 획득합니다. 처치 시 시간이 단축됩니다.',
    tree: 'Inspiration',
    slot: 1,
    icon: 'perk-images/Styles/Inspiration/MagicalFootwear.png',
  },
  PerfectTiming: {
    id: 'PerfectTiming',
    name: '완벽한 타이밍',
    description: '일회용 시계 획득',
    longDescription: '14분에 일회용 시계를 획득합니다. 처치 시 시간이 단축됩니다.',
    tree: 'Inspiration',
    slot: 1,
    icon: 'perk-images/Styles/Inspiration/PerfectTiming.png',
  },
  FuturesMarket: {
    id: 'FuturesMarket',
    name: '선물 시장',
    description: '빚을 내서 아이템 구매 가능',
    longDescription: '골드가 부족해도 빚을 내서 아이템을 구매할 수 있습니다.',
    tree: 'Inspiration',
    slot: 2,
    icon: 'perk-images/Styles/Inspiration/FuturesMarket.png',
  },
  MinionDematerializer: {
    id: 'MinionDematerializer',
    name: '미니언 해체분석기',
    description: '미니언 즉시 처치, 해당 유형에 추가 피해',
    longDescription: '미니언 해체분석기로 미니언을 즉시 처치하고, 해당 유형에 추가 피해를 입힙니다.',
    tree: 'Inspiration',
    slot: 2,
    icon: 'perk-images/Styles/Inspiration/MinionDematerializer.png',
  },
  BiscuitDelivery: {
    id: 'BiscuitDelivery',
    name: '비스킷 배달',
    description: '라인전 중 비스킷 획득',
    longDescription: '게임 초반에 비스킷을 획득하여 체력과 마나를 회복하고, 영구 마나가 증가합니다.',
    tree: 'Inspiration',
    slot: 2,
    icon: 'perk-images/Styles/Inspiration/BiscuitDelivery.png',
  },
  CosmicInsight: {
    id: 'CosmicInsight',
    name: '우주적 통찰력',
    description: '소환사 주문 및 아이템 가속 증가',
    longDescription: '소환사 주문 가속과 아이템 가속이 증가합니다.',
    tree: 'Inspiration',
    slot: 3,
    icon: 'perk-images/Styles/Inspiration/CosmicInsight.png',
  },
  ApproachVelocity: {
    id: 'ApproachVelocity',
    name: '쫓아가기',
    description: '이동이 저해된 적에게 접근 시 이동 속도 증가',
    longDescription: '이동이 저해된 적 챔피언에게 접근할 때 이동 속도가 증가합니다.',
    tree: 'Inspiration',
    slot: 3,
    icon: 'perk-images/Styles/Inspiration/ApproachVelocity.png',
  },
  TimeWarpTonic: {
    id: 'TimeWarpTonic',
    name: '시간 왜곡 물약',
    description: '물약 효과 즉시 일부 적용, 이동 속도 증가',
    longDescription: '물약이나 비스킷 사용 시 효과가 즉시 일부 적용되고 이동 속도가 증가합니다.',
    tree: 'Inspiration',
    slot: 3,
    icon: 'perk-images/Styles/Inspiration/TimeWarpTonic.png',
  },
};

// 스탯 룬
export const STAT_RUNES: Record<string, StatRuneInfo> = {
  // 슬롯 0 (공격)
  AdaptiveForce: {
    id: 'AdaptiveForce',
    name: '적응형 능력치',
    description: '공격력 +5.4 또는 주문력 +9',
    slot: 0,
    icon: 'perk-images/StatMods/StatModsAdaptiveForceIcon.png',
  },
  AttackSpeed: {
    id: 'AttackSpeed',
    name: '공격 속도',
    description: '공격 속도 +10%',
    slot: 0,
    icon: 'perk-images/StatMods/StatModsAttackSpeedIcon.png',
  },
  AbilityHaste: {
    id: 'AbilityHaste',
    name: '스킬 가속',
    description: '스킬 가속 +8',
    slot: 0,
    icon: 'perk-images/StatMods/StatModsCDRScalingIcon.png',
  },

  // 슬롯 1 (유연)
  AdaptiveForce2: {
    id: 'AdaptiveForce2',
    name: '적응형 능력치',
    description: '공격력 +5.4 또는 주문력 +9',
    slot: 1,
    icon: 'perk-images/StatMods/StatModsAdaptiveForceIcon.png',
  },
  MovementSpeed: {
    id: 'MovementSpeed',
    name: '이동 속도',
    description: '이동 속도 +2%',
    slot: 1,
    icon: 'perk-images/StatMods/StatModsMovementSpeedIcon.png',
  },
  HealthScaling: {
    id: 'HealthScaling',
    name: '체력 (레벨 비례)',
    description: '레벨당 체력 +10-180',
    slot: 1,
    icon: 'perk-images/StatMods/StatModsHealthScalingIcon.png',
  },

  // 슬롯 2 (방어)
  Health: {
    id: 'Health',
    name: '체력',
    description: '체력 +65',
    slot: 2,
    icon: 'perk-images/StatMods/StatModsHealthPlusIcon.png',
  },
  Armor: {
    id: 'Armor',
    name: '방어력',
    description: '방어력 +6',
    slot: 2,
    icon: 'perk-images/StatMods/StatModsArmorIcon.png',
  },
  MagicResist: {
    id: 'MagicResist',
    name: '마법 저항력',
    description: '마법 저항력 +8',
    slot: 2,
    icon: 'perk-images/StatMods/StatModsMagicResIcon.png',
  },
};

// 룬 ID로 정보 가져오기
export function getRuneInfo(runeId: string): RuneInfo | undefined {
  return KEYSTONES[runeId] || MINOR_RUNES[runeId];
}

// 스탯 룬 ID로 정보 가져오기
export function getStatRuneInfo(runeId: string): StatRuneInfo | undefined {
  return STAT_RUNES[runeId];
}

// 트리별 키스톤 가져오기
export function getKeystonesByTree(tree: RuneTree): RuneInfo[] {
  return Object.values(KEYSTONES).filter((r) => r.tree === tree);
}

// 트리별 일반 룬 가져오기
export function getMinorRunesByTree(tree: RuneTree): RuneInfo[] {
  return Object.values(MINOR_RUNES).filter((r) => r.tree === tree);
}

// 슬롯별 일반 룬 가져오기
export function getMinorRunesBySlot(tree: RuneTree, slot: number): RuneInfo[] {
  return Object.values(MINOR_RUNES).filter((r) => r.tree === tree && r.slot === slot);
}
