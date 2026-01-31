/**
 * 팩트 생성기 (Fact Engine)
 * 
 * 원시 데이터(ChampionMeta[])를 분석하여
 * 규칙 엔진이 이해하기 쉬운 '사실(Fact)'로 변환합니다.
 */

import type { ChampionMeta, TeamAnalysis } from '@/types';
import type { FactBase } from './advancedTypes';

export class FactEngine {
  public static deriveFacts(
    myChampion: ChampionMeta,
    enemies: ChampionMeta[],
    enemyAnalysis: TeamAnalysis
  ): FactBase {
    return {
      // CC 위협 분석
      hasPointClickCC: this.checkPointClickCC(enemies),
      hasHeavyBurst: enemyAnalysis.burstScore > 70,
      hasShieldBow: false, // 추후 로직 추가

      // 데미지 프로필
      enemyDamageProfile: {
        adRatio: enemyAnalysis.adRatio,
        apRatio: enemyAnalysis.apRatio,
        trueDamageThreat: enemies.some(e => e.tags.includes('trueDamage')),
      },

      // 내 스케일링 특성 (카타리나 등 하이브리드 체크)
      myScaling: {
        ad: myChampion.damageType === 'AD' || myChampion.damageType === 'Hybrid',
        ap: myChampion.damageType === 'AP' || myChampion.damageType === 'Hybrid',
        hybrid: myChampion.damageType === 'Hybrid',
      },

      currentPhase: 'Mid', // 기본값 (실제로는 게임 시간 필요)
    };
  }

  // 확정 CC(회피 불가) 보유 여부 체크
  private static checkPointClickCC(enemies: ChampionMeta[]): boolean {
    const pointClickThreats = [
      'TwistedFate', // 골드 카드
      'Pantheon',    // W
      'Lissandra',   // R
      'Malzahar',    // R
      'Fiddlesticks',// R (Fear is point click kinda?) No, Fear Q is point click
      'Renekton',    // W
    ];
    
    return enemies.some(e => pointClickThreats.includes(e.id));
  }
}
