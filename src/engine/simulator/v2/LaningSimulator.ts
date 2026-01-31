/**
 * 라인전 시뮬레이터
 * 
 * 0~15분 동안의 성장과 전투를 시뮬레이션합니다.
 */

import { EconomyEngine } from './economy/EconomyEngine';
import { ChampionModelV2 } from './models/ChampionModelV2';
import { SimulationEngine } from './core/engine';
import { ChampionSchema } from '../data/schemas';
import { ItemScriptFactory } from './items/itemFactory';

export class LaningSimulator {
  private me: ChampionModelV2;
  private enemy: ChampionModelV2;
  private economy: EconomyEngine;
  private time: number = 0; // 분 단위

  constructor(mySchema: ChampionSchema, enemySchema: ChampionSchema, startItemId: number) {
    this.economy = new EconomyEngine(500);
    
    // 시작템 구매
    this.economy.buyItemTowards(startItemId);

    // 1레벨 챔피언 생성
    this.me = this.createChamp(mySchema, 1);
    this.enemy = this.createChamp(enemySchema, 1);
  }

  private createChamp(schema: ChampionSchema, level: number): ChampionModelV2 {
    const items = this.economy.inventory.map(id => ItemScriptFactory.create(id)).filter((i): i is NonNullable<typeof i> => !!i);
    return new ChampionModelV2(schema, items, [], level); // 룬은 일단 생략
  }

  // 15분 시뮬레이션 실행
  run(aggressionLevel: number): { goldDiff: number, expDiff: number, kills: number } {
    let kills = 0;
    
    // 30초 단위 루프 (30 웨이브)
    for (let wave = 1; wave <= 30; wave++) {
      this.time += 0.5;

      // 1. 기본 골드/경험치 획득 (CS 파밍)
      // 공격적일수록 CS를 놓칠 확률 증가 (리스크)
      const csEfficiency = 1.0 - (aggressionLevel * 0.2); 
      this.economy.addGold(105 * csEfficiency); // 웨이브당 평균 105골드
      
      // 2. 딜교환 시뮬레이션 (짧은 전투)
      if (Math.random() < aggressionLevel) {
        const battle = new SimulationEngine(this.me, this.enemy);
        battle.run(5.0); // 5초 딜교환

        // 킬각?
        if (this.enemy.currentHp <= 0) {
          kills++;
          this.economy.addGold(300);
          this.enemy.currentHp = this.enemy.stats.maxHp; // 부활
        }
        
        // 내 체력이 너무 낮으면 강제 귀환 (손해)
        if (this.me.currentHp < this.me.stats.maxHp * 0.3) {
          this.economy.addGold(-50); // 라인 손실 페널티
          this.recall();
        }
      }

      // 3. 귀환 및 아이템 구매 (3분마다 체크 or 돈 많으면)
      if (this.economy.currentGold > 1300) {
        this.recall();
      }
    }

    return {
      goldDiff: this.economy.currentGold, // 상대 골드는 단순 비교 위해 생략
      expDiff: 0, 
      kills
    };
  }

  private recall() {
    this.me.currentHp = this.me.stats.maxHp;
    // 목표 코어템(예: 몰왕검)을 향해 구매 시도
    // 실제로는 유전자에서 목표 아이템 순서를 받아와야 함
    this.economy.buyItemTowards(3153); // 임시: 몰왕검 목표
    
    // 인벤토리 업데이트 (모델 재생성)
    const newItems = this.economy.inventory.map(id => ItemScriptFactory.create(id)).filter((i): i is NonNullable<typeof i> => !!i);
    this.me.items = newItems;
    // 스탯 재계산 필요 (ChampionModelV2에 updateItems 메서드 필요)
  }
}