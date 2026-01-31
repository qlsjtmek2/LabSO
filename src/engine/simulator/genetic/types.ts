/**
 * 유전 알고리즘 타입 정의
 * 
 * 아이템과 룬을 모두 포함하는 완전체 유전자(Genome)를 정의합니다.
 */

export interface GeneLoadout {
  // 아이템 유전자 (6슬롯)
  items: number[]; 
  
  // 룬 유전자
  primaryStyle: string; // Precision, Domination...
  subStyle: string;
  primaryRunes: string[]; 
  subRunes: string[];
  statRunes: string[];

  // 스펠 유전자
  summonerSpells: string[]; // ['Flash', 'Ignite']

  // 스킬 순서 유전자 (예: ['Q', 'E', 'W'])
  skillOrder: string[];

  // 시작 아이템 유전자
  starterItem: number; 
}

export interface Individual {
  genes: GeneLoadout;
  fitness: number; // 적합도 점수
  stats: {
    damage: number;
    survivability: number;
    utility: number;
    synergy: number;
  };
}

export interface GeneticConfig {
  populationSize: number; // 세대당 개체 수 (예: 50)
  generations: number;    // 반복할 세대 수 (예: 20)
  mutationRate: number;   // 돌연변이 확률 (예: 0.05)
  eliteCount: number;     // 다음 세대로 직행할 엘리트 수
}
