/**
 * 타임라인 시뮬레이터
 * 
 * 0분부터 엔드게임까지 시간 흐름에 따른 성장과 전투를 시뮬레이션합니다.
 */

import { ChampionSchema } from '../../data/schemas';
import { CombatStats } from '../../core/types';
import { ChampionModelV2 } from '../models/ChampionModelV2';
import { SimulationEngine } from '../core/engine';
import { ItemScriptFactory } from '../items/itemFactory';
import { BuildPathGenerator } from './BuildPathGenerator';

// 분당 평균 골드 획득량 (CS + 자연 + 킬/어시 등)
const GPM = {
  EARLY: 250, // 0~10분 (CS 낮음)
  MID: 350,   // 10~20분 (CS + 오브젝트)
  LATE: 400   // 20분~ (CS + 킬)
};

export class TimelineSimulator {
  private mySchema: ChampionSchema;
  private enemySchema: ChampionSchema;
  private myBuild: number[]; // 목표 빌드 순서
  private enemyBuild: number[]; // 적 빌드 순서

  constructor(
    mySchema: ChampionSchema, 
    enemySchema: ChampionSchema, 
    myBuild: number[], 
    enemyBuild: number[]
  ) {
    this.mySchema = mySchema;
    this.enemySchema = enemySchema;
    this.myBuild = myBuild;
    this.enemyBuild = enemyBuild;
  }

  // 전체 시뮬레이션 실행 및 종합 점수 반환
  run(): number {
    let totalScore = 0;
    let currentGold = 500; // 시작 골드

    // 체크포인트: 5분, 10분, 15분, 20분, 25분
    const checkpoints = [5, 10, 15, 20, 25];

    checkpoints.forEach(time => {
      // 1. 골드 획득
      if (time <= 10) currentGold += 5 * GPM.EARLY;
      else if (time <= 20) currentGold += 5 * GPM.MID;
      else currentGold += 5 * GPM.LATE;

      // 2. 아이템 쇼핑 (양쪽 다)
      // 적은 나보다 약간 더 잘 컸거나 못 컸을 수 있음 (랜덤성 or 고정)
      const enemyGold = currentGold; // 대등한 성장 가정

      const myInventory = BuildPathGenerator.getInventoryAtGold(this.myBuild, currentGold);
      const enemyInventory = BuildPathGenerator.getInventoryAtGold(this.enemyBuild, enemyGold);

      // 3. 챔피언 모델 생성 (레벨은 시간 비례)
      const level = Math.min(18, Math.floor(time * 0.7) + 1); // 대략적인 레벨
      
      const myItems = myInventory.map(id => ItemScriptFactory.create(id)).filter((i): i is NonNullable<typeof i> => !!i);
      const enemyItems = enemyInventory.map(id => ItemScriptFactory.create(id)).filter((i): i is NonNullable<typeof i> => !!i);

      // 룬은 일단 생략 (복잡도 감소)
      const me = new ChampionModelV2(this.mySchema, myItems, [], level);
      const enemy = new ChampionModelV2(this.enemySchema, enemyItems, [], level);
      // 적 스탯 보정 (기본 스탯 + 아이템 스탯)
      
      // 4. 전투 시뮬레이션 (AI 맞대결)
      const engine = new SimulationEngine(me, enemy);
      engine.run(10.0); // 10초 전투

      // 5. 점수 계산 (후반일수록 가중치 높음)
      const weight = time / 5; // 1, 2, 3, 4, 5
      
      let score = 0;
      if (enemy.currentHp <= 0) score += 1000; // 킬
      score += (me.currentHp / me.stats.maxHp) * 500; // 생존
      score += (1 - (enemy.currentHp / enemy.stats.maxHp)) * 500; // 딜링

      totalScore += score * weight;
    });

    return totalScore;
  }
}
