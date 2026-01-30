/**
 * 팀 분석기
 *
 * 5명의 챔피언 조합을 분석하여 팀 특성을 도출합니다.
 */

import type { ChampionMeta, DamageType, TeamAnalysis } from '@/types';

// 팀 분석 수행
export function analyzeTeam(champions: ChampionMeta[]): TeamAnalysis {
  if (champions.length === 0) {
    return getEmptyAnalysis();
  }

  // 기본 카운트
  const totalAD = champions.filter((c) => c.damageType === 'AD').length;
  const totalAP = champions.filter((c) => c.damageType === 'AP').length;
  const totalHybrid = champions.filter((c) => c.damageType === 'Hybrid').length;

  const totalTanks = champions.filter(
    (c) => c.class === 'Tank' || c.subClass === 'Tank'
  ).length;
  const totalAssassins = champions.filter(
    (c) => c.class === 'Assassin' || c.subClass === 'Assassin'
  ).length;
  const totalMarksmen = champions.filter(
    (c) => c.class === 'Marksman'
  ).length;

  // 데미지 밸런스 계산
  const adWeight = totalAD + totalHybrid * 0.5;
  const apWeight = totalAP + totalHybrid * 0.5;
  const total = adWeight + apWeight || 1;

  const adRatio = adWeight / total;
  const apRatio = apWeight / total;

  let damageBalance: DamageType;
  if (adRatio > 0.7) damageBalance = 'AD';
  else if (apRatio > 0.7) damageBalance = 'AP';
  else damageBalance = 'Hybrid';

  // CC 점수 (0-100)
  const ccScore = Math.min(
    100,
    champions.reduce((sum, c) => sum + c.ccPower * 10, 0)
  );

  // 이니시 점수 계산
  const engageScore = calculateEngageScore(champions);

  // 필 점수 계산
  const peelScore = calculatePeelScore(champions);

  // 버스트/지속딜 점수
  const burstScore = Math.min(
    100,
    champions.reduce((sum, c) => sum + c.damageProfile.burst * 10, 0) / 5
  );
  const sustainedScore = Math.min(
    100,
    champions.reduce((sum, c) => sum + c.damageProfile.sustained * 10, 0) / 5
  );

  // 파워 커브 계산
  const powerCurve = calculatePowerCurve(champions);

  // 승리 조건 도출
  const winConditions = deriveWinConditions(champions, {
    damageBalance,
    ccScore,
    engageScore,
    peelScore,
    powerCurve,
  });

  // 약점 도출
  const weaknesses = deriveWeaknesses(champions, {
    totalTanks,
    totalAssassins,
    engageScore,
    ccScore,
    powerCurve,
  });

  return {
    totalAD,
    totalAP,
    totalHybrid,
    totalTanks,
    totalAssassins,
    totalMarksmen,
    damageBalance,
    adRatio,
    apRatio,
    ccScore,
    engageScore,
    peelScore,
    burstScore,
    sustainedScore,
    powerCurve,
    winConditions,
    weaknesses,
  };
}

// 빈 분석 결과
function getEmptyAnalysis(): TeamAnalysis {
  return {
    totalAD: 0,
    totalAP: 0,
    totalHybrid: 0,
    totalTanks: 0,
    totalAssassins: 0,
    totalMarksmen: 0,
    damageBalance: 'Hybrid',
    adRatio: 0.5,
    apRatio: 0.5,
    ccScore: 0,
    engageScore: 0,
    peelScore: 0,
    burstScore: 0,
    sustainedScore: 0,
    powerCurve: { early: 5, mid: 5, late: 5 },
    winConditions: [],
    weaknesses: [],
  };
}

// 이니시 점수 계산
function calculateEngageScore(champions: ChampionMeta[]): number {
  let score = 0;

  for (const champ of champions) {
    // 이니시에이터 역할
    if (champ.winCondition.role === 'Engage') {
      score += 30;
    }

    // 프론트라인 + CC
    if (champ.winCondition.teamfightPriority === 'Frontline' && champ.ccPower >= 6) {
      score += 20;
    }

    // 특정 CC 타입 (에어본, 매혹 등 강제 이동)
    if (champ.ccTypes.includes('Knockup') || champ.ccTypes.includes('Pull')) {
      score += 10;
    }

    // 플랭커 역할
    if (champ.winCondition.teamfightPriority === 'Flank') {
      score += 5;
    }
  }

  return Math.min(100, score);
}

// 필 점수 계산
function calculatePeelScore(champions: ChampionMeta[]): number {
  let score = 0;

  for (const champ of champions) {
    // 필 역할
    if (champ.winCondition.role === 'Peel') {
      score += 30;
    }

    // 인챈터/서포터
    if (champ.class === 'Enchanter' || champ.class === 'Support') {
      score += 15;
    }

    // 슬로우/스턴 CC
    if (champ.ccTypes.includes('Stun') || champ.ccTypes.includes('Root')) {
      score += 10;
    }

    // 백라인 보호형 탱커
    if (
      champ.class === 'Tank' &&
      champ.ccPower >= 7
    ) {
      score += 10;
    }
  }

  return Math.min(100, score);
}

// 파워 커브 계산
function calculatePowerCurve(
  champions: ChampionMeta[]
): { early: number; mid: number; late: number } {
  if (champions.length === 0) {
    return { early: 5, mid: 5, late: 5 };
  }

  const early =
    champions.reduce((sum, c) => sum + c.powerSpike.early, 0) / champions.length;
  const mid =
    champions.reduce((sum, c) => sum + c.powerSpike.mid, 0) / champions.length;
  const late =
    champions.reduce((sum, c) => sum + c.powerSpike.late, 0) / champions.length;

  return {
    early: Math.round(early * 10) / 10,
    mid: Math.round(mid * 10) / 10,
    late: Math.round(late * 10) / 10,
  };
}

// 승리 조건 도출
function deriveWinConditions(
  champions: ChampionMeta[],
  stats: {
    damageBalance: DamageType;
    ccScore: number;
    engageScore: number;
    peelScore: number;
    powerCurve: { early: number; mid: number; late: number };
  }
): string[] {
  const conditions: string[] = [];

  // 초반 강세
  if (stats.powerCurve.early >= 7) {
    conditions.push('초반 주도권 확보 후 스노우볼');
  }

  // 후반 스케일링
  if (stats.powerCurve.late >= 8) {
    conditions.push('후반 팀파이트 스케일링');
  }

  // 강력한 이니시
  if (stats.engageScore >= 60) {
    conditions.push('강력한 이니시로 유리한 팀파이트 유도');
  }

  // 스플릿 푸시
  const splitPushers = champions.filter(
    (c) => c.winCondition.role === 'SplitPush'
  ).length;
  if (splitPushers >= 1) {
    conditions.push('스플릿 푸시로 맵 압박');
  }

  // 픽캐치
  const assassins = champions.filter(
    (c) => c.class === 'Assassin' || c.subClass === 'Assassin'
  ).length;
  if (assassins >= 2) {
    conditions.push('로밍/픽캐치로 숫자 우위 확보');
  }

  // 포킹
  const pokers = champions.filter((c) => c.damageProfile.poke >= 7).length;
  if (pokers >= 2) {
    conditions.push('오브젝트 앞 포킹으로 체력 우위');
  }

  // 하이퍼 캐리 보호
  const carries = champions.filter(
    (c) => c.class === 'Marksman' && c.powerSpike.late >= 8
  ).length;
  if (carries >= 1 && stats.peelScore >= 50) {
    conditions.push('하이퍼 캐리 보호 팀파이트');
  }

  return conditions.length > 0 ? conditions : ['표준 팀파이트'];
}

// 약점 도출
function deriveWeaknesses(
  champions: ChampionMeta[],
  stats: {
    totalTanks: number;
    totalAssassins: number;
    engageScore: number;
    ccScore: number;
    powerCurve: { early: number; mid: number; late: number };
  }
): string[] {
  const weaknesses: string[] = [];

  // 탱커 부재
  if (stats.totalTanks === 0) {
    weaknesses.push('프론트라인 부재로 이니시 취약');
  }

  // 초반 약세
  if (stats.powerCurve.early <= 4) {
    weaknesses.push('초반 정글 싸움 및 인베이드 불리');
  }

  // 후반 약세
  if (stats.powerCurve.late <= 4) {
    weaknesses.push('후반 팀파이트 스케일링 부족');
  }

  // 이니시 부족
  if (stats.engageScore < 30) {
    weaknesses.push('이니시 부족으로 유리한 싸움 유도 어려움');
  }

  // CC 부족
  if (stats.ccScore < 30) {
    weaknesses.push('CC 부족으로 적 캐리 견제 어려움');
  }

  // 암살자만 많음
  if (stats.totalAssassins >= 3) {
    weaknesses.push('지속딜 부족 및 탱커 상대 어려움');
  }

  return weaknesses;
}

// 팀 간 비교 분석
export function compareTeams(
  allies: ChampionMeta[],
  enemies: ChampionMeta[]
): {
  allyAdvantages: string[];
  enemyAdvantages: string[];
  keyMatchups: string[];
} {
  const allyAnalysis = analyzeTeam(allies);
  const enemyAnalysis = analyzeTeam(enemies);

  const allyAdvantages: string[] = [];
  const enemyAdvantages: string[] = [];
  const keyMatchups: string[] = [];

  // 파워 커브 비교
  if (allyAnalysis.powerCurve.early - enemyAnalysis.powerCurve.early >= 2) {
    allyAdvantages.push('초반 파워 우위');
  } else if (enemyAnalysis.powerCurve.early - allyAnalysis.powerCurve.early >= 2) {
    enemyAdvantages.push('초반 파워 우위');
  }

  if (allyAnalysis.powerCurve.late - enemyAnalysis.powerCurve.late >= 2) {
    allyAdvantages.push('후반 스케일링 우위');
  } else if (enemyAnalysis.powerCurve.late - allyAnalysis.powerCurve.late >= 2) {
    enemyAdvantages.push('후반 스케일링 우위');
  }

  // 이니시 비교
  if (allyAnalysis.engageScore - enemyAnalysis.engageScore >= 20) {
    allyAdvantages.push('이니시 능력 우위');
  } else if (enemyAnalysis.engageScore - allyAnalysis.engageScore >= 20) {
    enemyAdvantages.push('이니시 능력 우위');
  }

  // CC 비교
  if (allyAnalysis.ccScore - enemyAnalysis.ccScore >= 20) {
    allyAdvantages.push('CC 총량 우위');
  } else if (enemyAnalysis.ccScore - allyAnalysis.ccScore >= 20) {
    enemyAdvantages.push('CC 총량 우위');
  }

  // 데미지 타입 카운터
  if (allyAnalysis.damageBalance === 'AD' && enemyAnalysis.totalTanks >= 2) {
    keyMatchups.push('상대 방어력 스택 예상 - 관통 아이템 필수');
  }
  if (allyAnalysis.damageBalance === 'AP' && enemyAnalysis.totalTanks >= 2) {
    keyMatchups.push('상대 마저 스택 예상 - 공허 지팡이 필수');
  }

  return { allyAdvantages, enemyAdvantages, keyMatchups };
}
