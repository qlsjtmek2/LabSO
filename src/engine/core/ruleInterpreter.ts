/**
 * YAML 규칙 해석기
 * 
 * YAML로 정의된 데이터 기반 규칙을 실행 가능한 TypeScript 함수로 변환합니다.
 * 이 모듈을 통해 코드를 수정하지 않고도 데이터 파일만으로 로직을 확장할 수 있습니다.
 */

import yaml from 'js-yaml';
import { AdvancedRule, AdvancedContext, RulePriority } from './advancedTypes';
import type { ItemRecommendation } from '@/types';

// YAML 규칙 스키마
interface YamlRule {
  id: string;
  name: string;
  description?: string;
  priority: number;
  triggers: string[];
  condition: YamlCondition;
  action: YamlAction;
}

type YamlCondition = 
  | { type: 'OR'; conditions: YamlCondition[] }
  | { type: 'AND'; conditions: YamlCondition[] }
  | { type: 'EnemyLanerIs'; values: string[] }
  | { type: 'EnemyTeamStat'; stat: 'TankCount' | 'APCount' | 'ADCount'; operator: 'gte' | 'lte' | 'eq'; value: number }
  | { type: 'StrategyIs'; value: string }
  | { type: 'FactIsTrue'; fact: string };

type YamlAction = 
  | { type: 'ChangeStrategy'; value: string }
  | { type: 'RecommendItems'; items: YamlItemRecommendation[] };

interface YamlItemRecommendation {
  id?: number;
  dynamicId?: string; // 'SpellShield' 등
  slot: 'core' | 'situational' | 'starter' | 'boots';
  reason: string;
  score: number;
}

export class RuleInterpreter {
  // YAML 조건을 실제 함수로 변환
  static parseCondition(cond: YamlCondition): (ctx: AdvancedContext) => boolean {
    switch (cond.type) {
      case 'OR':
        return (ctx) => cond.conditions.some(c => this.parseCondition(c)(ctx));
      
      case 'AND':
        return (ctx) => cond.conditions.every(c => this.parseCondition(c)(ctx));
      
      case 'EnemyLanerIs':
        return (ctx) => {
          if (!ctx.enemyLaner) return false;
          return cond.values.includes(ctx.enemyLaner.id);
        };
      
      case 'EnemyTeamStat':
        return (ctx) => {
          let count = 0;
          if (cond.stat === 'TankCount') {
            count = ctx.enemies.filter(e => e.class === 'Tank').length;
          }
          // 다른 스탯 구현 가능
          
          if (cond.operator === 'gte') return count >= cond.value;
          if (cond.operator === 'lte') return count <= cond.value;
          return count === cond.value;
        };
        
      case 'StrategyIs':
        return (ctx) => ctx.activeStrategy === cond.value;
        
      case 'FactIsTrue':
        return (ctx) => !!(ctx.facts as any)[cond.fact];
        
      default:
        console.warn(`Unknown condition type: ${(cond as any).type}`);
        return () => false;
    }
  }

  // YAML 액션을 실제 함수로 변환
  static parseAction(action: YamlAction): (ctx: AdvancedContext) => ItemRecommendation[] | { strategyChange: string } {
    if (action.type === 'ChangeStrategy') {
      return () => ({ strategyChange: action.value });
    }

    if (action.type === 'RecommendItems') {
      return (ctx) => {
        return action.items.map(item => {
          let itemId = item.id || 0;
          
          // 동적 아이템 ID 해석
          if (item.dynamicId === 'SpellShield') {
            const isAD = ctx.myChampion.damageType === 'AD' || ctx.activeStrategy === 'AD_ONHIT';
            itemId = isAD ? 3814 : 3102; // 밤끝 / 밴시
          }

          return {
            itemId,
            slot: item.slot,
            reason: item.reason,
            score: item.score,
            ruleId: 'yaml-rule'
          };
        });
      };
    }

    return () => [];
  }

  // YAML 텍스트를 AdvancedRule 객체로 변환
  static parseYaml(yamlContent: string): AdvancedRule[] {
    try {
      const rawRules = yaml.load(yamlContent) as YamlRule[];
      if (!Array.isArray(rawRules)) return [];

      return rawRules.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        priority: r.priority,
        triggers: r.triggers,
        condition: this.parseCondition(r.condition),
        action: this.parseAction(r.action)
      }));
    } catch (e) {
      console.error('Failed to parse YAML rule:', e);
      return [];
    }
  }
}
