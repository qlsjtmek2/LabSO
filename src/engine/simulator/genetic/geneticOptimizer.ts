/**
 * 유전 알고리즘 엔진
 * 
 * 세대 교체를 통해 최적의 빌드를 진화시킵니다.
 */

import { GeneLoadout, Individual, GeneticConfig } from './types';
import { FitnessCalculatorV2 } from '../v2/fitnessCalculatorV2';
import { ChampionSchema } from '../data/schemas';
import { CombatStats } from '../core/types';
import runesData from '../../../data/json/runes.json';
import spellsData from '../../../data/json/spells.json';
import itemsData from '../../../data/json/items.json';

// 아이템 ID 목록 (랜덤 선택용)
const ITEM_IDS = Object.values(itemsData)
  .filter((i: any) => i.price > 2000) // 싼 거 제외
  .map((i: any) => i.id);

export class GeneticOptimizer {
  private config: GeneticConfig;
  private champion: ChampionSchema;
  private enemyStats: CombatStats;
  private enemySchema?: ChampionSchema; // 추가
  private fitnessCache: Map<string, Individual> = new Map();

  constructor(
    champ: ChampionSchema, 
    enemy: CombatStats, 
    config: GeneticConfig,
    enemySchema?: ChampionSchema // 추가
  ) {
    this.config = config;
    this.champion = champ;
    this.enemyStats = enemy;
    this.enemySchema = enemySchema;
  }

  // 개체의 유전자 문자열 생성 (캐시 키용)
  private getGeneKey(genes: GeneLoadout): string {
    return `${genes.items.sort().join(',')}|${genes.primaryStyle}|${genes.primaryRunes.join(',')}|${genes.summonerSpells.sort().join(',')}`;
  }

  // 최적화 실행 (진화 시작)

  async run(): Promise<Individual> {
    let population = await this.initializePopulation();

    for (let gen = 0; gen < this.config.generations; gen++) {
      population.sort((a, b) => b.fitness - a.fitness);
      const nextGen = population.slice(0, this.config.eliteCount);

      while (nextGen.length < this.config.populationSize) {
        const parentA = this.selectParent(population);
        const parentB = this.selectParent(population);
        
        let childGenes = this.crossover(parentA.genes, parentB.genes);
        childGenes = this.mutate(childGenes);

        const key = this.getGeneKey(childGenes);
        if (this.fitnessCache.has(key)) {
          nextGen.push(this.fitnessCache.get(key)!);
        } else {
          // V2 계산기 사용
          const child = await FitnessCalculatorV2.evaluate(
            childGenes, 
            this.champion, 
            this.enemyStats,
            this.enemySchema
          );
          this.fitnessCache.set(key, child);
          nextGen.push(child);
        }
      }

      population = nextGen;
    }

    return population.sort((a, b) => b.fitness - a.fitness)[0];
  }

  private async initializePopulation(): Promise<Individual[]> {
    const pop: Individual[] = [];
    for (let i = 0; i < this.config.populationSize; i++) {
      const genes = this.createRandomGenes();
      const key = this.getGeneKey(genes);
      // V2 계산기 사용
      const ind = await FitnessCalculatorV2.evaluate(
        genes, 
        this.champion, 
        this.enemyStats,
        this.enemySchema
      );
      this.fitnessCache.set(key, ind);
      pop.push(ind);
    }
    return pop;
  }

  // ... (나머지 메서드 동일)

  // 랜덤 유전자 생성
  private createRandomGenes(): GeneLoadout {
    const items: number[] = [];
    const picked = new Set<number>();
    
    while (items.length < 6) {
      const id = ITEM_IDS[Math.floor(Math.random() * ITEM_IDS.length)];
      if (!picked.has(id)) {
        picked.add(id);
        items.push(id);
      }
    }

    // ... (룬/스펠 선택 로직 동일)
    const trees = Object.keys((runesData as any).trees);
    const primaryTreeKey = trees[Math.floor(Math.random() * trees.length)];
    let subTreeKey = trees[Math.floor(Math.random() * trees.length)];
    while (subTreeKey === primaryTreeKey) {
      subTreeKey = trees[Math.floor(Math.random() * trees.length)];
    }

    const primaryTree = (runesData as any).trees[primaryTreeKey];
    const subTree = (runesData as any).trees[subTreeKey];

    const primaryRunes = primaryTree.slots.map((slot: any[]) => slot[Math.floor(Math.random() * slot.length)]);
    
    const subRowIndices = [1, 2, 3].sort(() => Math.random() - 0.5).slice(0, 2).sort();
    const subRunes = subRowIndices.map(idx => {
      const slot = subTree.slots[idx]; 
      return slot[Math.floor(Math.random() * slot.length)];
    });

    const statRunes = ['AdaptiveForce', 'AdaptiveForce', 'Armor']; 

    const spellKeys = Object.keys(spellsData);
    const spells: string[] = [];
    while (spells.length < 2) {
      const s = spellKeys[Math.floor(Math.random() * spellKeys.length)];
      if (!spells.includes(s)) spells.push(s);
    }

    const skillOrder = ['Q', 'W', 'E'].sort(() => Math.random() - 0.5);
    const starterPool = [1055, 1056, 1054, 1036, 1001];
    const starterItem = starterPool[Math.floor(Math.random() * starterPool.length)];

    return {
      items,
      primaryStyle: primaryTreeKey,
      subStyle: subTreeKey,
      primaryRunes,
      subRunes,
      statRunes,
      summonerSpells: spells,
      skillOrder,
      starterItem
    };
  }

  // ... (생략)

  // 교배 (Single Point Crossover)
  private crossover(p1: GeneLoadout, p2: GeneLoadout): GeneLoadout {
    const splitPoint = 3;
    let newItems = [...p1.items.slice(0, splitPoint), ...p2.items.slice(splitPoint)];
    
    // 중복 제거 및 보충
    const uniqueItems = new Set(newItems);
    if (uniqueItems.size < 6) {
      const finalItems = Array.from(uniqueItems);
      while (finalItems.length < 6) {
        const randomId = ITEM_IDS[Math.floor(Math.random() * ITEM_IDS.length)];
        if (!uniqueItems.has(randomId)) {
          uniqueItems.add(randomId);
          finalItems.push(randomId);
        }
      }
      newItems = finalItems;
    }
    
    return {
      items: newItems,
      primaryStyle: Math.random() > 0.5 ? p1.primaryStyle : p2.primaryStyle,
      subStyle: Math.random() > 0.5 ? p1.subStyle : p2.subStyle,
      primaryRunes: Math.random() > 0.5 ? [...p1.primaryRunes] : [...p2.primaryRunes],
      subRunes: Math.random() > 0.5 ? [...p1.subRunes] : [...p2.subRunes],
      statRunes: Math.random() > 0.5 ? [...p1.statRunes] : [...p2.statRunes],
      summonerSpells: Math.random() > 0.5 ? [...p1.summonerSpells] : [...p2.summonerSpells],
      skillOrder: Math.random() > 0.5 ? [...p1.skillOrder] : [...p2.skillOrder],
      starterItem: Math.random() > 0.5 ? p1.starterItem : p2.starterItem
    };
  }

  // 부모 선택 (토너먼트 방식)
  private selectParent(pop: Individual[]): Individual {
    const k = 3;
    let best = pop[Math.floor(Math.random() * pop.length)];
    for (let i = 0; i < k - 1; i++) {
      const candidate = pop[Math.floor(Math.random() * pop.length)];
      if (candidate.fitness > best.fitness) best = candidate;
    }
    return best;
  }

  // 돌연변이
  private mutate(genes: GeneLoadout): GeneLoadout {
    // 아이템 돌연변이
    if (Math.random() < this.config.mutationRate) {
      const slot = Math.floor(Math.random() * 6);
      let newItem = ITEM_IDS[Math.floor(Math.random() * ITEM_IDS.length)];
      
      // 이미 있는 아이템이면 다른 거 찾을 때까지 반복
      let attempts = 0;
      while (genes.items.includes(newItem) && attempts < 10) {
        newItem = ITEM_IDS[Math.floor(Math.random() * ITEM_IDS.length)];
        attempts++;
      }
      
      genes.items[slot] = newItem;
    }
    // ... (이하 동일)

    // 룬 돌연변이 (키스톤)
    if (Math.random() < this.config.mutationRate) {
      const tree = (runesData as any).trees[genes.primaryStyle];
      if (tree) {
        const newKeystone = tree.slots[0][Math.floor(Math.random() * tree.slots[0].length)];
        genes.primaryRunes[0] = newKeystone;
      }
    }

    // 스펠 변이 (전체 교체 확률 추가)
    if (Math.random() < this.config.mutationRate) {
      const spellKeys = Object.keys(spellsData);
      if (Math.random() > 0.5) {
        // 하나만 교체
        const newSpell = spellKeys[Math.floor(Math.random() * spellKeys.length)];
        if (!genes.summonerSpells.includes(newSpell)) {
          genes.summonerSpells[Math.floor(Math.random() * 2)] = newSpell;
        }
      } else {
        // 아예 새로운 세트로 교체 (다양성 확보)
        const spells: string[] = [];
        while (spells.length < 2) {
          const s = spellKeys[Math.floor(Math.random() * spellKeys.length)];
          if (!spells.includes(s)) spells.push(s);
        }
        genes.summonerSpells = spells;
      }
    }

    // 스킬 순서 변이 (완전 셔플 확률 추가)
    if (Math.random() < this.config.mutationRate) {
      if (Math.random() > 0.5) {
        // 미세 조정 (인접한 두 개 스왑)
        const idx = Math.floor(Math.random() * 2);
        const temp = genes.skillOrder[idx];
        genes.skillOrder[idx] = genes.skillOrder[idx+1];
        genes.skillOrder[idx+1] = temp;
      } else {
        // 완전 셔플
        genes.skillOrder.sort(() => Math.random() - 0.5);
      }
    }

    return genes;
  }
}
