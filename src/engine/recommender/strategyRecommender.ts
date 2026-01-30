/**
 * 전략 생성기
 *
 * 팀 구성과 매치업을 기반으로 게임 전략 가이드를 생성합니다.
 */

import type {
  ChampionMeta,
  TeamAnalysis,
  MatchupAnalysis,
  StrategyGuide,
} from '@/types';

// 전략 가이드 생성
export function generateStrategy(
  myChampion: ChampionMeta,
  allies: ChampionMeta[],
  enemies: ChampionMeta[],
  allyAnalysis: TeamAnalysis,
  enemyAnalysis: TeamAnalysis,
  matchup: MatchupAnalysis | null
): StrategyGuide {
  return {
    earlyGame: generateEarlyGameStrategy(myChampion, matchup, allyAnalysis, enemyAnalysis),
    midGame: generateMidGameStrategy(myChampion, allies, enemies, allyAnalysis),
    lateGame: generateLateGameStrategy(myChampion, allies, allyAnalysis, enemyAnalysis),
    teamRole: determineTeamRole(myChampion, allies),
    priorityTargets: determinePriorityTargets(myChampion, enemies),
    threatsToWatch: determineThreats(myChampion, enemies, enemyAnalysis),
  };
}

// 초반 전략 생성
function generateEarlyGameStrategy(
  myChampion: ChampionMeta,
  matchup: MatchupAnalysis | null,
  allyAnalysis: TeamAnalysis,
  enemyAnalysis: TeamAnalysis
): StrategyGuide['earlyGame'] {
  const objectives: string[] = [];
  const warnings: string[] = [];
  const tips: string[] = [];

  // 라인전 기반
  if (matchup) {
    if (matchup.advantageScore >= 3) {
      objectives.push('적극적인 트레이딩으로 라인 주도권 확보');
      objectives.push('상대 CS 방해 및 경험치 격차 벌리기');
      tips.push('상대 정글러 위치 확인 후 교전');
    } else if (matchup.advantageScore <= -3) {
      objectives.push('CS에 집중하며 경험치 유지');
      objectives.push('타워 밑 안전한 파밍');
      tips.push('정글러 갱킹 기회를 기다리세요');
    } else {
      objectives.push('CS 우선, 기회 봐서 트레이딩');
    }

    // 킬각 기반
    if (matchup.killPotential.early === 'High') {
      tips.push('레벨 2-3 타이밍에 올인 시도 가능');
    }
    if (matchup.killPotential.withJungler === 'High') {
      tips.push('정글러와 함께하면 킬 확률 높음');
    }
  }

  // 팀 파워 커브 기반
  if (allyAnalysis.powerCurve.early > enemyAnalysis.powerCurve.early + 1) {
    objectives.push('정글러와 함께 인베이드/스커미시 주도');
    tips.push('초반 오브젝트(해롤드, 드래곤) 적극 참여');
  } else if (allyAnalysis.powerCurve.early < enemyAnalysis.powerCurve.early - 1) {
    warnings.push('초반 정글 싸움 자제');
    tips.push('라인 안정화 후 스케일링');
  }

  // 상대 정글러 위협
  const enemyJungler = myChampion.lanes.includes('JGL')
    ? null
    : (allyAnalysis as any).enemies?.find((e: ChampionMeta) => e.lanes.includes('JGL'));
  if (enemyJungler && enemyJungler.powerSpike.early >= 8) {
    warnings.push('상대 정글러 초반 강함 - 와드 필수');
  }

  // 기본 팁
  if (tips.length === 0) {
    tips.push('레벨 2 먼저 달성하여 유리하게 교전');
  }

  return { objectives, warnings, tips };
}

// 중반 전략 생성
function generateMidGameStrategy(
  myChampion: ChampionMeta,
  allies: ChampionMeta[],
  enemies: ChampionMeta[],
  allyAnalysis: TeamAnalysis
): StrategyGuide['midGame'] {
  const objectives: string[] = [];
  const tips: string[] = [];
  let playstyle = '';

  // 역할 기반 플레이스타일
  switch (myChampion.winCondition.role) {
    case 'SplitPush':
      playstyle = '사이드 라인 스플릿 푸시';
      objectives.push('TP 챙기고 사이드 압박');
      objectives.push('1:1 상황에서 상대 견제');
      tips.push('팀파이트 전 합류 타이밍 체크');
      break;

    case 'Engage':
      playstyle = '오브젝트 싸움 이니시';
      objectives.push('드래곤/바론 앞 유리한 이니시');
      objectives.push('적 포지셔닝 실수 캐치');
      tips.push('팀원 위치 확인 후 진입');
      break;

    case 'Carry':
      playstyle = '안전한 딜링 포지션 유지';
      objectives.push('팀파이트에서 최대 DPS 출력');
      objectives.push('서포터/탱커와 함께 이동');
      tips.push('상대 CC기 확인 후 포지셔닝');
      break;

    case 'Poke':
      playstyle = '오브젝트 앞 포킹';
      objectives.push('드래곤/바론 앞 체력 깎기');
      objectives.push('시야 장악 후 포킹 유지');
      tips.push('올인 당하지 않도록 거리 유지');
      break;

    case 'Peel':
      playstyle = '캐리 보호';
      objectives.push('ADC/미드 보호 최우선');
      objectives.push('상대 암살자/다이버 견제');
      tips.push('CC기 아껴두다가 적 진입 시 사용');
      break;

    default:
      playstyle = '팀 호흡 맞추기';
      objectives.push('팀과 함께 오브젝트 참여');
  }

  // 팀 구성 기반
  if (allyAnalysis.engageScore >= 60) {
    tips.push('강력한 이니시 보유 - 정면 싸움 유도');
  }
  if (allyAnalysis.engageScore < 30) {
    tips.push('이니시 부족 - 적 실수 기다리기');
  }

  // 상대 구성 기반
  const hasStrongSplitter = enemies.some(
    (e) => e.winCondition.role === 'SplitPush' && e.powerSpike.mid >= 7
  );
  if (hasStrongSplitter) {
    tips.push('상대 스플릿 푸셔 견제 필요');
  }

  return { objectives, playstyle, tips };
}

// 후반 전략 생성
function generateLateGameStrategy(
  myChampion: ChampionMeta,
  allies: ChampionMeta[],
  allyAnalysis: TeamAnalysis,
  enemyAnalysis: TeamAnalysis
): StrategyGuide['lateGame'] {
  const objectives: string[] = [];
  const tips: string[] = [];
  let teamfightRole = '';

  // 팀파이트 역할
  switch (myChampion.winCondition.teamfightPriority) {
    case 'Frontline':
      teamfightRole = '프론트라인 탱킹/이니시';
      objectives.push('상대 스킬 유도 후 팀 진입');
      tips.push('중요 CC기는 상대 캐리에게 사용');
      break;

    case 'Backline':
      teamfightRole = '백라인 딜링';
      objectives.push('안전한 위치에서 최대 DPS');
      tips.push('포지셔닝 > 딜량, 죽지 않는 게 우선');
      break;

    case 'Flank':
      teamfightRole = '플랭크 암살';
      objectives.push('상대 캐리 암살 후 이탈');
      tips.push('팀파이트 시작 후 진입 타이밍');
      break;

    default:
      teamfightRole = '상황에 따른 유동적 역할';
  }

  // 후반 파워 비교
  if (allyAnalysis.powerCurve.late > enemyAnalysis.powerCurve.late) {
    objectives.push('후반 스케일링 우위 - 시간 끌기 유리');
    tips.push('무리한 싸움보다 안전한 성장');
  } else if (allyAnalysis.powerCurve.late < enemyAnalysis.powerCurve.late) {
    objectives.push('바론/엘더 강제로 게임 마무리');
    tips.push('너무 늦기 전에 결전 시도');
  }

  // 바론/엘더 싸움
  objectives.push('바론/엘더 드래곤 싸움 승리');

  // 상대 위협 기반
  const enemyAssassins = allyAnalysis.totalAssassins;
  if (enemyAssassins >= 2) {
    tips.push('팀원과 뭉쳐서 이동, 고립 금지');
  }

  return { objectives, teamfightRole, tips };
}

// 팀 내 역할 결정
function determineTeamRole(
  myChampion: ChampionMeta,
  allies: ChampionMeta[]
): string {
  const role = myChampion.winCondition.role;
  const myClass = myChampion.class;

  // 메인 캐리 여부
  const carries = allies.filter(
    (a) => a.winCondition.role === 'Carry' && a.powerSpike.late >= 8
  );
  if (role === 'Carry' && myChampion.powerSpike.late >= 8) {
    if (carries.length <= 1) {
      return '메인 딜러 - 팀의 주요 데미지원';
    }
    return '서브 딜러 - 보조 데미지원';
  }

  // 유일한 탱커
  const tanks = allies.filter((a) => a.class === 'Tank' || a.subClass === 'Tank');
  if ((myClass === 'Tank' || myChampion.subClass === 'Tank') && tanks.length <= 1) {
    return '메인 탱커 - 프론트라인 책임';
  }

  // 역할별 명칭
  const roleNames: Record<string, string> = {
    Engage: '이니시에이터 - 팀파이트 개시',
    Peel: '필러 - 캐리 보호',
    SplitPush: '스플릿 푸셔 - 사이드 압박',
    Poke: '포커 - 오브젝트 전 딜링',
    Utility: '유틸리티 - 팀 서포트',
    Carry: '캐리 - 데미지 딜링',
  };

  return roleNames[role] || '팀원 역할 수행';
}

// 우선 타겟 결정
function determinePriorityTargets(
  myChampion: ChampionMeta,
  enemies: ChampionMeta[]
): string[] {
  const targets: string[] = [];

  // 암살자/다이버는 적 캐리 우선
  if (
    myChampion.class === 'Assassin' ||
    myChampion.winCondition.teamfightPriority === 'Flank'
  ) {
    const enemyCarries = enemies.filter(
      (e) => e.class === 'Marksman' || e.class === 'Mage'
    );
    enemyCarries.forEach((e) => targets.push(`${e.name} (${e.class})`));
  }

  // 딜러는 접근하는 적 처리
  if (myChampion.winCondition.teamfightPriority === 'Backline') {
    const divers = enemies.filter(
      (e) =>
        e.class === 'Assassin' ||
        e.class === 'Bruiser' ||
        e.winCondition.teamfightPriority === 'Flank'
    );
    divers.forEach((e) => targets.push(`${e.name} (접근 시 처리)`));
  }

  // 탱커는 적 프론트라인 견제
  if (myChampion.winCondition.teamfightPriority === 'Frontline') {
    const enemyFront = enemies.filter(
      (e) => e.winCondition.teamfightPriority === 'Frontline'
    );
    enemyFront.forEach((e) => targets.push(`${e.name} (견제)`));
  }

  return targets.slice(0, 3);
}

// 주의할 위협 결정
function determineThreats(
  myChampion: ChampionMeta,
  enemies: ChampionMeta[],
  enemyAnalysis: TeamAnalysis
): string[] {
  const threats: string[] = [];

  // 암살자 위협
  const assassins = enemies.filter((e) => e.class === 'Assassin');
  assassins.forEach((a) => {
    if (
      myChampion.class === 'Marksman' ||
      myChampion.class === 'Mage' ||
      myChampion.class === 'Enchanter'
    ) {
      threats.push(`${a.name}의 암살 시도 주의`);
    }
  });

  // 강력한 CC
  const ccChamps = enemies.filter((e) => e.ccPower >= 8);
  ccChamps.forEach((c) => {
    threats.push(`${c.name}의 CC기 주의`);
  });

  // 후반 스케일러
  const lateScalers = enemies.filter((e) => e.powerSpike.late >= 9);
  if (lateScalers.length > 0) {
    threats.push('상대 후반 스케일링 주의 - 빠른 마무리 필요');
  }

  // 스플릿 푸셔
  const splitPushers = enemies.filter((e) => e.winCondition.role === 'SplitPush');
  splitPushers.forEach((s) => {
    threats.push(`${s.name}의 스플릿 푸시 대응 필요`);
  });

  return threats.slice(0, 4);
}
