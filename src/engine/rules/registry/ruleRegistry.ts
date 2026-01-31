/**
 * 규칙 레지스트리 (Rule Registry)
 * 
 * 수천 개의 규칙을 효율적으로 관리하고 검색하기 위한 인덱싱 시스템입니다.
 */

import { AdvancedRule, AdvancedContext } from '../../core/advancedTypes';
import { KatarinaAdaptiveRule, KatarinaADItemsRule } from '../specialized/katarinaRules';
import { AntiPointClickCCRule } from '../specialized/counterRules';

export class RuleRegistry {
  private rules: AdvancedRule[] = [];
  private index: Map<string, AdvancedRule[]> = new Map();

  constructor() {
    // 초기 규칙 등록
    this.registerRule(KatarinaAdaptiveRule);
    this.registerRule(KatarinaADItemsRule);
    this.registerRule(AntiPointClickCCRule);
  }

  // 규칙 등록 및 인덱싱
  registerRule(rule: AdvancedRule) {
    this.rules.push(rule);
    
    // 트리거 기반 인덱싱
    rule.triggers.forEach(trigger => {
      if (!this.index.has(trigger)) {
        this.index.set(trigger, []);
      }
      this.index.get(trigger)!.push(rule);
    });
  }

  // 상황에 맞는 규칙 검색 (O(N) 방지)
  getRelevantRules(ctx: AdvancedContext): AdvancedRule[] {
    const relevantRules = new Set<AdvancedRule>();

    // 1. 내 챔피언 관련 규칙
    const myChampRules = this.index.get(ctx.myChampion.id) || [];
    myChampRules.forEach(r => relevantRules.add(r));

    // 2. 팩트 기반 규칙 (예: PointClickCC)
    if (ctx.facts.hasPointClickCC) {
      const ccRules = this.index.get('PointClickCC') || [];
      ccRules.forEach(r => relevantRules.add(r));
    }

    // 3. 글로벌 규칙 (트리거 없는 것들 - 지금은 없지만 나중에 추가)
    // ...

    return Array.from(relevantRules).sort((a, b) => b.priority - a.priority);
  }
}

// 싱글톤
export const ruleRegistry = new RuleRegistry();
