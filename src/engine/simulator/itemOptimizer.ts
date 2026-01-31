import { ItemScript, CombatStats, SimulationResult } from './core/types';
import { KatarinaModel } from './models/Katarina';

// 모의 아이템 데이터 (나중에는 API에서 파싱)
const MOCK_ITEMS: Record<string, ItemScript> = {
  BoRK: {
    id: 3153,
    name: 'Blade of the Ruined King',
    stats: { ad: 40, attackSpeed: 0.25, lifesteal: 0.08 },
    onHit: (target) => ({
      type: 'Physical',
      damage: target.hp * 0.09 // 현재 체력 9% (단순화: 여기서는 maxHp 기준으로 가정하거나 시뮬레이션 루프에서 hp 감소 반영해야 함)
    })
  },
  Nashor: {
    id: 3115,
    name: "Nashor's Tooth",
    stats: { ap: 100, attackSpeed: 0.5, abilityHaste: 15 },
    onHit: (target, source) => ({
      type: 'Magical',
      damage: 15 + (source.ap * 0.2)
    })
  }
};

// 시뮬레이션 실행기
export class SimulationRunner {
  static runComparison(
    myBaseStats: CombatStats,
    enemyStats: CombatStats
  ): { winnerItem: string; results: Record<string, number> } {
    
    // 비교할 아이템 목록
    const candidates = ['BoRK', 'Nashor'];
    const results: Record<string, number> = {};

    candidates.forEach(itemName => {
      const item = MOCK_ITEMS[itemName];
      const kat = new KatarinaModel(myBaseStats, [item]);
      
      // 스킬 데이터 (API에서 가져왔다고 가정)
      const skillData = {
        q: { base: 75, adRatio: 0, apRatio: 0.3 },
        e: { base: 15, adRatio: 0.5, apRatio: 0.25, onHitEffectiveness: 1.0 },
        r: { basePerDagger: 25, adRatio: 0.16, apRatio: 0.19, attackSpeedRatio: 0.8, onHitEffectiveness: 0.3, duration: 2.5 }
      };

      const damageLog = kat.simulateCombo(enemyStats, skillData);
      const totalDamage = damageLog.reduce((sum, evt) => sum + evt.mitigatedDamage, 0);
      
      results[itemName] = Math.round(totalDamage);
    });

    // 가장 높은 데미지를 준 아이템 선정
    const winner = Object.entries(results).sort((a, b) => b[1] - a[1])[0][0];

    return {
      winnerItem: winner,
      results
    };
  }
}
