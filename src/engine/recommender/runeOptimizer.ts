/**
 * 룬 최적화 도구 (Rune Optimizer)
 * 
 * 단순 템플릿 반환이 아닌, 상대 조합에 맞춰 스탯 파편을 최적화합니다.
 */

import { RuneTemplate } from '@/types';
import { TeamAnalysis } from '@/types';

export class RuneOptimizer {
  static optimize(
    baseTemplate: RuneTemplate, 
    enemyAnalysis: TeamAnalysis
  ): RuneTemplate {
    // 깊은 복사로 불변성 유지
    const optimized = JSON.parse(JSON.stringify(baseTemplate)) as RuneTemplate;

    // 1. 방어 파편 최적화 (Slot 2, 3)
    // 상대가 올 AD면 방어력 2개, 올 AP면 마저 2개
    if (enemyAnalysis.adRatio > 0.8) {
      optimized.statRunes[2] = 'Armor'; // 3열 방어
      if (enemyAnalysis.adRatio > 0.9) {
        optimized.statRunes[1] = 'Armor'; // 2열도 방어 (극단적 AD)
      }
    } else if (enemyAnalysis.apRatio > 0.8) {
      optimized.statRunes[2] = 'MagicResist';
      if (enemyAnalysis.apRatio > 0.9) {
        optimized.statRunes[1] = 'MagicResist';
      }
    } else {
      optimized.statRunes[2] = 'HealthScaling'; // 밸런스형은 체력
    }

    // 2. 보조 룬 최적화
    // 상대 CC가 많으면(불굴의 의지), 견제가 심하면(재생의 바람)
    if (enemyAnalysis.ccScore > 70 && optimized.secondaryTree === 'Resolve') {
      const idx = optimized.secondaryRunes.indexOf('Overgrowth'); // 과잉성장 대신
      if (idx !== -1) optimized.secondaryRunes[idx] = 'Unflinching'; // 불굴의 의지
    }

    if (enemyAnalysis.damageBalance === 'AP' && optimized.secondaryTree === 'Sorcery') {
        const idx = optimized.secondaryRunes.indexOf('Waterwalking');
        if (idx !== -1) optimized.secondaryRunes[idx] = 'NullifyingOrb'; // 무효화 구슬
    }

    return optimized;
  }
}
