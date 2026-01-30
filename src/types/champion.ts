/**
 * 챔피언 관련 타입 정의
 */

// 챔피언 클래스 (역할군)
export type ChampionClass =
  | 'Assassin'    // 암살자
  | 'Bruiser'     // 브루저/전사
  | 'Tank'        // 탱커
  | 'Mage'        // 마법사
  | 'Marksman'    // 원거리 딜러
  | 'Support'     // 서포터
  | 'Enchanter'   // 인챈터
  | 'Artillery';  // 포병 (럭스, 제라스 등)

// 데미지 유형
export type DamageType = 'AD' | 'AP' | 'Hybrid' | 'True';

// 라인
export type Lane = 'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP';

// 사거리 유형
export type RangeType = 'Melee' | 'Short' | 'Mid' | 'Long';

// CC 유형
export type CCType =
  | 'Knockup'   // 에어본
  | 'Stun'      // 기절
  | 'Root'      // 속박
  | 'Slow'      // 둔화
  | 'Silence'   // 침묵
  | 'Charm'     // 매혹
  | 'Fear'      // 공포
  | 'Suppress'  // 억압
  | 'Pull'      // 끌어당기기
  | 'Knockback' // 밀어내기
  | 'Ground';   // 이동기 봉인

// 데미지 프로필 (딜 패턴)
export interface DamageProfile {
  burst: number;      // 0-10, 순간 폭딜 능력
  sustained: number;  // 0-10, 지속 딜 능력
  poke: number;       // 0-10, 포킹 능력
}

// 파워 스파이크 정보
export interface PowerSpike {
  early: number;        // 1-10, 1-6레벨 강도
  mid: number;          // 1-10, 7-13레벨 강도
  late: number;         // 1-10, 14-18레벨 강도
  itemSpikes: number[]; // 1/2/3코어 완성 시 스파이크 강도 [7, 9, 8]
  levelSpikes: number[]; // 특정 레벨 스파이크 (예: [6, 11, 16])
}

// 팀파이트 역할
export type TeamfightRole = 'Frontline' | 'Backline' | 'Flank' | 'Neutral';

// 스케일링 유형
export type ScalingType = 'Early' | 'Mid' | 'Late' | 'Flat';

// 승리 조건
export interface WinCondition {
  role: 'Carry' | 'Engage' | 'Peel' | 'SplitPush' | 'Poke' | 'Utility';
  teamfightPriority: TeamfightRole;
  scalingType: ScalingType;
}

// 챔피언 메타데이터 (핵심)
export interface ChampionMeta {
  id: string;                     // DataDragon ID (예: "Aatrox", "Ahri")
  name: string;                   // 한글 이름

  // 분류
  class: ChampionClass;           // 주 클래스
  subClass?: ChampionClass;       // 보조 클래스 (옵션)

  // 데미지 정보
  damageType: DamageType;
  damageProfile: DamageProfile;

  // 라인 정보
  lanes: Lane[];                  // 가능한 라인들
  primaryLane: Lane;              // 주 라인

  // 파워 그래프
  powerSpike: PowerSpike;

  // CC 정보
  ccTypes: CCType[];
  ccPower: number;                // 1-10, 총 CC 점수

  // 기동성 & 사거리
  range: RangeType;
  mobility: number;               // 1-10

  // 승리 조건
  winCondition: WinCondition;

  // 기본 빌드/룬은 별도 파일에서 연결
  defaultBuildIds: string[];      // BuildTemplate IDs
  defaultRuneIds: string[];       // RuneTemplate IDs

  // 특수 태그 (시너지/카운터 분석용)
  tags: string[];                 // ["antiTank", "towerdive", "splitPush", ...]
}

// 챔피언 슬롯 (팀 구성용)
export interface ChampionSlot {
  lane: Lane;
  champion: ChampionMeta | null;
  isMyChampion?: boolean;         // 내 챔피언 여부
  isEnemyLaner?: boolean;         // 상대 라이너 여부
}

// 팀 구성
export interface TeamComposition {
  allies: ChampionSlot[];         // 우리팀 5명
  enemies: ChampionSlot[];        // 상대팀 5명
  myChampionLane: Lane | null;    // 내 라인
  enemyLanerLane: Lane | null;    // 상대 라이너 라인
}
