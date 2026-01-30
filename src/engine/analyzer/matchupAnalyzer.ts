/**
 * 매치업 분석기
 *
 * 1:1 라인전 매치업을 분석합니다.
 */

import type { ChampionMeta, MatchupAnalysis } from '@/types';

// 매치업 분석
export function analyzeMatchup(
  myChampion: ChampionMeta,
  enemyLaner: ChampionMeta
): MatchupAnalysis {
  // 기본 유불리 점수 계산 (-10 ~ +10)
  const advantageScore = calculateAdvantageScore(myChampion, enemyLaner);

  // 단계별 유불리
  const earlyAdvantage = calculateEarlyAdvantage(myChampion, enemyLaner);
  const midAdvantage = calculateMidAdvantage(myChampion, enemyLaner);
  const lateAdvantage = calculateLateAdvantage(myChampion, enemyLaner);

  // 유불리 레벨
  const advantageLevel = getAdvantageLevel(advantageScore);

  // 라인전 팁
  const tips = generateLaningTips(myChampion, enemyLaner, {
    earlyAdvantage,
    midAdvantage,
    advantageScore,
  });

  // 주의사항
  const warnings = generateWarnings(myChampion, enemyLaner);

  // 추천 태그
  const recommendedTags = generateRecommendedTags(myChampion, enemyLaner, {
    advantageScore,
    earlyAdvantage,
  });

  // 킬 포텐셜
  const killPotential = calculateKillPotential(myChampion, enemyLaner);

  return {
    myChampion,
    enemyLaner,
    advantageScore,
    advantageLevel,
    earlyAdvantage,
    midAdvantage,
    lateAdvantage,
    tips,
    warnings,
    recommendedTags,
    killPotential,
  };
}

// 기본 유불리 점수 계산
function calculateAdvantageScore(
  myChampion: ChampionMeta,
  enemy: ChampionMeta
): number {
  let score = 0;

  // 레인지 어드밴티지
  const rangeOrder = { Melee: 0, Short: 1, Mid: 2, Long: 3 };
  const rangeDiff = rangeOrder[myChampion.range] - rangeOrder[enemy.range];
  score += rangeDiff * 1.5;

  // 초반 파워 비교
  score += (myChampion.powerSpike.early - enemy.powerSpike.early) * 0.8;

  // 기동성 비교 (근접전에서 중요)
  if (myChampion.range === 'Melee' && enemy.range === 'Melee') {
    score += (myChampion.mobility - enemy.mobility) * 0.3;
  }

  // 클래스 상성
  score += getClassMatchupBonus(myChampion.class, enemy.class);

  // 데미지 타입 상성
  score += getDamageTypeMatchupBonus(myChampion.damageType, enemy.class);

  // CC 우위
  score += (myChampion.ccPower - enemy.ccPower) * 0.2;

  return Math.max(-10, Math.min(10, Math.round(score * 10) / 10));
}

// 클래스 상성 보너스
function getClassMatchupBonus(myClass: string, enemyClass: string): number {
  const matchups: Record<string, Record<string, number>> = {
    Assassin: {
      Mage: 2,
      Marksman: 2,
      Enchanter: 2,
      Tank: -2,
      Bruiser: -1,
    },
    Bruiser: {
      Tank: 1,
      Assassin: 1,
      Mage: 0,
      Marksman: 0,
    },
    Tank: {
      Bruiser: -1,
      Assassin: 2,
      Mage: 0,
      Marksman: -1,
    },
    Mage: {
      Tank: 1,
      Bruiser: 0,
      Assassin: -2,
      Artillery: 0,
    },
    Marksman: {
      Tank: 1,
      Assassin: -2,
      Bruiser: -1,
    },
    Artillery: {
      Assassin: -2,
      Bruiser: -1,
      Tank: 1,
    },
    Enchanter: {
      Assassin: -2,
      Tank: 0,
    },
  };

  return matchups[myClass]?.[enemyClass] || 0;
}

// 데미지 타입 상성
function getDamageTypeMatchupBonus(myDamage: string, enemyClass: string): number {
  // AD vs 탱커는 불리
  if (myDamage === 'AD' && enemyClass === 'Tank') {
    return -1;
  }
  // True 데미지는 탱커에게 유리
  if (myDamage === 'True' && enemyClass === 'Tank') {
    return 2;
  }
  return 0;
}

// 초반 유불리
function calculateEarlyAdvantage(my: ChampionMeta, enemy: ChampionMeta): number {
  let score = 0;
  score += (my.powerSpike.early - enemy.powerSpike.early) * 1.5;

  // 레벨 1 강한 챔피언
  if (my.powerSpike.levelSpikes.includes(1)) score += 1;
  if (enemy.powerSpike.levelSpikes.includes(1)) score -= 1;

  return Math.max(-10, Math.min(10, Math.round(score)));
}

// 중반 유불리
function calculateMidAdvantage(my: ChampionMeta, enemy: ChampionMeta): number {
  let score = 0;
  score += (my.powerSpike.mid - enemy.powerSpike.mid) * 1.5;

  // 1코어 스파이크
  const myFirstSpike = my.powerSpike.itemSpikes[0] || 5;
  const enemyFirstSpike = enemy.powerSpike.itemSpikes[0] || 5;
  score += (myFirstSpike - enemyFirstSpike) * 0.5;

  return Math.max(-10, Math.min(10, Math.round(score)));
}

// 후반 유불리
function calculateLateAdvantage(my: ChampionMeta, enemy: ChampionMeta): number {
  let score = 0;
  score += (my.powerSpike.late - enemy.powerSpike.late) * 1.5;

  return Math.max(-10, Math.min(10, Math.round(score)));
}

// 유불리 레벨
function getAdvantageLevel(
  score: number
): MatchupAnalysis['advantageLevel'] {
  if (score >= 4) return 'Heavy Advantage';
  if (score >= 1.5) return 'Advantage';
  if (score >= -1.5) return 'Even';
  if (score >= -4) return 'Disadvantage';
  return 'Heavy Disadvantage';
}

// 라인전 팁 생성
function generateLaningTips(
  my: ChampionMeta,
  enemy: ChampionMeta,
  stats: { earlyAdvantage: number; midAdvantage: number; advantageScore: number }
): string[] {
  const tips: string[] = [];

  // 유리한 매치업
  if (stats.advantageScore >= 2) {
    tips.push('주도적으로 교전을 시도하세요.');
    if (my.powerSpike.early >= 7) {
      tips.push('초반부터 CS 우위와 교환을 동시에 노리세요.');
    }
  }

  // 불리한 매치업
  if (stats.advantageScore <= -2) {
    tips.push('무리한 교전을 피하고 CS에 집중하세요.');
    if (my.powerSpike.late > enemy.powerSpike.late) {
      tips.push('스케일링을 믿고 안전하게 성장하세요.');
    }
  }

  // 암살자 상대
  if (enemy.class === 'Assassin') {
    tips.push('체력 관리에 주의하세요. 60% 이하에서 올인 위험.');
    if (enemy.powerSpike.levelSpikes.includes(6)) {
      tips.push('레벨 6 이전에 최대한 우위를 점하세요.');
    }
  }

  // 포킹 챔피언 상대
  if (enemy.damageProfile.poke >= 7) {
    tips.push('스킬을 피하며 CS를 챙기세요.');
    tips.push('체력 회복 아이템을 고려하세요.');
  }

  // CC 많은 상대
  if (enemy.ccPower >= 7) {
    tips.push('정글러 갱킹에 특히 주의하세요.');
  }

  // 레인지 불리
  if (my.range === 'Melee' && (enemy.range === 'Mid' || enemy.range === 'Long')) {
    tips.push('쿨타임을 노려 접근하세요.');
    tips.push('부시 활용으로 시야 우위를 가져가세요.');
  }

  return tips.slice(0, 4); // 최대 4개
}

// 주의사항 생성
function generateWarnings(my: ChampionMeta, enemy: ChampionMeta): string[] {
  const warnings: string[] = [];

  // 강력한 레벨 스파이크
  for (const level of enemy.powerSpike.levelSpikes) {
    if (level <= 6) {
      warnings.push(`레벨 ${level}에서 상대 파워 스파이크. 조심하세요.`);
    }
  }

  // 높은 버스트
  if (enemy.damageProfile.burst >= 9) {
    warnings.push('순간 폭딜이 매우 높습니다. 체력 관리 필수.');
  }

  // 높은 지속딜
  if (enemy.damageProfile.sustained >= 9) {
    warnings.push('긴 교전에서 불리합니다. 짧은 교환을 노리세요.');
  }

  // CC 체인
  if (enemy.ccTypes.includes('Knockup') || enemy.ccTypes.includes('Suppress')) {
    warnings.push('해당 CC에 정화/수은이 통하지 않습니다.');
  }

  return warnings.slice(0, 3);
}

// 추천 태그 생성
function generateRecommendedTags(
  my: ChampionMeta,
  enemy: ChampionMeta,
  stats: { advantageScore: number; earlyAdvantage: number }
): string[] {
  const tags: string[] = [];

  // 암살자 상대
  if (enemy.class === 'Assassin') {
    tags.push('vsAssassin');
    if (enemy.damageType === 'AD') {
      tags.push('earlyArmor');
    } else {
      tags.push('earlyMR');
    }
  }

  // 탱커 상대
  if (enemy.class === 'Tank') {
    tags.push('vsTank');
    tags.push('penetration');
  }

  // 포킹 상대
  if (enemy.damageProfile.poke >= 7) {
    tags.push('sustain');
  }

  // 불리한 매치업
  if (stats.advantageScore <= -3) {
    tags.push('defensive');
    tags.push('safePlay');
  }

  // 유리한 매치업
  if (stats.advantageScore >= 3) {
    tags.push('aggressive');
    tags.push('snowball');
  }

  // AD 상대
  if (enemy.damageType === 'AD') {
    tags.push('vsAD');
  }

  // AP 상대
  if (enemy.damageType === 'AP') {
    tags.push('vsAP');
  }

  return tags;
}

// 킬 포텐셜 계산
function calculateKillPotential(
  my: ChampionMeta,
  enemy: ChampionMeta
): MatchupAnalysis['killPotential'] {
  const getLevel = (score: number): 'High' | 'Medium' | 'Low' => {
    if (score >= 7) return 'High';
    if (score >= 4) return 'Medium';
    return 'Low';
  };

  // 초반 킬각
  let earlyKill = my.damageProfile.burst + my.powerSpike.early - enemy.powerSpike.early;
  if (my.ccPower >= 5) earlyKill += 2;

  // 정글러와 함께
  let withJungler = earlyKill + 3;
  if (my.ccTypes.length > 0) withJungler += 2;

  // 레벨 6
  let atSix = my.damageProfile.burst + my.powerSpike.mid;
  if (my.powerSpike.levelSpikes.includes(6)) atSix += 3;
  if (enemy.powerSpike.levelSpikes.includes(6)) atSix -= 2;

  return {
    early: getLevel(earlyKill),
    withJungler: getLevel(withJungler),
    atSix: getLevel(atSix),
  };
}
