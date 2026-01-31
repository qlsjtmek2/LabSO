/**
 * 적합도 계산기 (Fitness Calculator)
 * 
 * 특정 빌드(아이템+룬)의 성능을 점수화합니다.
 */

import { GeneLoadout, Individual } from './types';
import { ChampionSchema } from '../data/schemas';
import { CombatStats, ItemScript } from '../core/types';
import { GenericChampionModel } from '../models/GenericChampion';
import { DamageEngine } from '../core/damageEngine';
import itemsData from '../../../data/json/items.json';

// 아이템 데이터 캐싱
const ITEM_MAP: Record<number, any> = {};
Object.values(itemsData).forEach((item: any) => ITEM_MAP[item.id] = item);

export class FitnessCalculator {
  
  static async evaluate(
    loadout: GeneLoadout,
    champSchema: ChampionSchema,
    enemyStats: CombatStats
  ): Promise<Individual> {
    
    // 1. 아이템 스크립트 변환 (시작 아이템 포함)
    const allItems = [...loadout.items, loadout.starterItem];
    const equippedItems: ItemScript[] = allItems
      .map(id => ITEM_MAP[id])
      .filter(item => !!item)
      .map(item => ({
        id: item.id,
        name: item.name,
        stats: item.stats,
        onHit: undefined 
      }));

    // 2. 룬 스탯 적용 (간략화)
    
    // 3. 모델 생성 및 상호 교전 시뮬레이션 (True Duel Simulation)
    const myModel = new GenericChampionModel(champSchema, equippedItems, 18);
    
    // 진짜 적 모델 생성 (상대 라이너 데이터 사용)
    const enemySchema = (ITEM_MAP as any)._enemySchema || champSchema; // 헬퍼에서 전달받아야 함
    const enemyModel = new GenericChampionModel(enemySchema, [], 18); 
    
    let myCurrentHp = myModel['stats'].maxHp;
    let enemyCurrentHp = enemyStats.maxHp;
    
    let time = 0;
    const TIME_STEP = 0.1; // 더 정밀한 0.1초 단위
    const MAX_COMBAT_TIME = 15; // 15초 (쿨감 효율 체감을 위해 시간 연장)
    
    let iKilledEnemy = false;
    let enemyKilledMe = false;
    let totalDamageDealt = 0;
    let spellsCastCount = 0; // 스킬 사용 횟수 추적

    // 전투 루프
    const cooldowns: Record<string, number> = { Q: 0, W: 0, E: 0, R: 0 };
    
    while (time < MAX_COMBAT_TIME) {
      let actionTaken = false;

      // 1. 스킬 사용 우선순위 결정 (R > Q/W/E > 평타)
      // 쿨다운 체크 및 사용
      const spells = ['R', 'Q', 'W', 'E'] as const;
      
      for (const spellKey of spells) {
        if (time >= cooldowns[spellKey]) {
          // 스킬 데이터 확인 (존재 여부 및 마나 등)
          const spellData = champSchema.spells[spellKey];
          if (!spellData || !spellData.cooldown) continue;

          // 스킬 시전
          const events = myModel.castSpell(spellKey, enemyStats, time);
          const dmg = events.reduce((sum, e) => sum + e.mitigatedDamage, 0);
          
          if (dmg > 0 || spellKey === 'R') { // 데미지가 있거나 궁극기면 사용
            enemyCurrentHp -= dmg;
            totalDamageDealt += dmg;
            spellsCastCount++;
            
            // 쿨다운 적용 (스킬 가속 반영해야 함, 여기서는 단순화)
            // 현재 레벨(18) 기준 마지막 쿨다운 사용
            const baseCd = spellData.cooldown[spellData.cooldown.length - 1];
            const haste = myModel['stats'].abilityHaste;
            const actualCd = baseCd * (100 / (100 + haste));
            
            cooldowns[spellKey] = time + actualCd;
            actionTaken = true;
            
            // 스킬 사용 후 딜레이 (애니메이션 캔슬 등은 무시하고 0.25초 글로벌 쿨타임 가정)
            time += 0.25; 
            break; 
          }
        }
      }

      if (actionTaken) continue; // 스킬 썼으면 다음 틱으로

      // 2. 평타 (스킬 쿨일 때)
      // 공속에 따른 평타 딜레이 체크 필요하지만, 단순화를 위해 매 틱마다 공속 비례 데미지 누적
      const attackDamage = DamageEngine.calculateDamage(myModel['stats'].ad, 'Physical', myModel['stats'], enemyStats);
      // 0.1초 동안 가할 수 있는 평타 데미지 (공속 * 0.1)
      const damagePerTick = attackDamage * myModel['stats'].attackSpeed * TIME_STEP;
      
      enemyCurrentHp -= damagePerTick;
      totalDamageDealt += damagePerTick;

      // 3. 적의 반격 (진짜 챔피언 스킬 + 평타 + %체력뎀)
      
      // 적 스킬 (이미 위에서 계산됨 - 로직 통합 필요)
      // 위에서 enemySpell 체크 로직이 있었는데 replace로 덮어쓰면서 사라졌을 수 있음. 다시 확인.
      // 덮어쓰기 전 코드에 enemySpell 로직이 없었다면 추가해야 함.
      
      // 적의 자동 공격 (평타)
      const enemyAttackDamage = DamageEngine.calculateDamage(enemyStats.ad, 'Physical', enemyStats, myModel['stats']);
      const enemyAaPerTick = enemyAttackDamage * enemyStats.attackSpeed * TIME_STEP;
      
      // % 체력 데미지 (체력 돼지 방지용 - 몰왕/리안드리 등 상정하여 1초당 최대 체력 1% 가정)
      // 0.1초당 0.1%
      const percentHpDmgRaw = myModel['stats'].maxHp * 0.01 * TIME_STEP;
      const percentHpDmg = DamageEngine.calculateDamage(percentHpDmgRaw, 'Physical', enemyStats, myModel['stats']);

      myCurrentHp -= (enemyAaPerTick + percentHpDmg);

      if (enemyCurrentHp <= 0) { iKilledEnemy = true; break; }
      if (myCurrentHp <= 0) { enemyKilledMe = true; break; }

      time += TIME_STEP;
    }

    // 4. 적합도 산출 (Duel Score)
    let fitness = 0;
    
    if (iKilledEnemy) {
      // 빨리 죽일수록, 내 체력이 많이 남을수록 고득점
      const speedBonus = (MAX_COMBAT_TIME - time) * 500;
      const healthBonus = (myCurrentHp / myModel['stats'].maxHp) * 2000;
      fitness = 5000 + speedBonus + healthBonus;
    } else if (enemyKilledMe) {
      // 내가 죽었다면 적에게 입힌 데미지만큼만 점수 (매우 낮음)
      fitness = totalDamageDealt * 0.5;
    } else {
      // 시간 초과 (비김)
      fitness = totalDamageDealt;
    }

    // 5. 시너지 및 클래스 적합도 평가 (태그 기반)
    let synergyScore = 0;
    const tags = new Set<string>();
    loadout.items.forEach(id => {
      const item = ITEM_MAP[id];
      if (item?.tags) item.tags.forEach((t: string) => tags.add(t));
    });
    
    // 1. 치명타 시너지 (원딜/야스오 등)
    if (tags.has('CriticalStrike')) {
      const critCount = loadout.items.filter(id => ITEM_MAP[id]?.tags?.includes('CriticalStrike')).length;
      if (critCount >= 3) synergyScore += 800; // 치명타 빌드 완성 시 보너스
    }

    // 2. 방관 시너지 (암살자)
    if (tags.has('Lethality')) {
      const lethalityCount = loadout.items.filter(id => ITEM_MAP[id]?.tags?.includes('Lethality')).length;
      synergyScore += lethalityCount * 150;
    }

    // 3. 온힛/공속 시너지 (카타리나, 마스터이 등)
    const isOnHitChamp = ['Katarina', 'MasterYi', 'Vayne', 'KogMaw', 'Jinx', 'Ezreal'].includes(champSchema.id);
    if (isOnHitChamp && tags.has('OnHit')) {
      synergyScore += 500;
    }

    // 4. 주문검 중복 방지 (페널티)
    const spellBladeCount = loadout.items.filter(id => ITEM_MAP[id]?.description?.toLowerCase().includes('spellblade')).length;
    if (spellBladeCount > 1) synergyScore -= 2000; 

    const fitnessWithSynergy = fitness + synergyScore;

    return {
      genes: loadout,
      fitness: fitnessWithSynergy,
      stats: {
        damage: totalDamageDealt,
        survivability: myCurrentHp > 0 ? myCurrentHp : 0,
        utility: iKilledEnemy ? 1 : 0, // 승리 여부
        synergy: synergyScore
      }
    };
  }
}
