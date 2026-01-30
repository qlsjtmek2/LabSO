/**
 * 규칙 엔진 코어
 *
 * 확장 가능한 규칙 기반 추천 시스템의 핵심 모듈입니다.
 * 새로운 규칙을 쉽게 추가할 수 있는 플러그인 방식 구조입니다.
 */

// 규칙 출력
export interface RuleOutput<TResult> {
  score: number; // 0-1 사이 가중치
  result: TResult;
  reason: string; // 사용자에게 보여줄 이유
}

// 적용된 규칙 정보
export interface AppliedRule<TResult> {
  ruleId: string;
  ruleName: string;
  score: number;
  result: TResult;
  reason: string;
}

// 규칙 인터페이스
export interface Rule<TContext, TResult> {
  id: string;
  name: string;
  description: string;
  priority: number; // 높을수록 먼저 적용

  // 규칙 적용 조건
  condition: (context: TContext) => boolean;

  // 규칙 실행
  apply: (context: TContext) => RuleOutput<TResult>;
}

// 평가 결과
export interface EvaluationResult<TResult> {
  appliedRules: AppliedRule<TResult>[];
  aggregatedResults: TResult[];
  topResult: TResult | null;
  totalScore: number;
}

// 규칙 엔진 클래스
export class RuleEngine<TContext, TResult> {
  private rules: Rule<TContext, TResult>[] = [];
  private name: string;

  constructor(name: string = 'default') {
    this.name = name;
  }

  // 규칙 추가
  addRule(rule: Rule<TContext, TResult>): this {
    this.rules.push(rule);
    // priority 기준 내림차순 정렬
    this.rules.sort((a, b) => b.priority - a.priority);
    return this;
  }

  // 여러 규칙 추가
  addRules(rules: Rule<TContext, TResult>[]): this {
    rules.forEach((rule) => this.addRule(rule));
    return this;
  }

  // 규칙 제거
  removeRule(ruleId: string): this {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
    return this;
  }

  // 규칙 가져오기
  getRule(ruleId: string): Rule<TContext, TResult> | undefined {
    return this.rules.find((r) => r.id === ruleId);
  }

  // 모든 규칙 가져오기
  getAllRules(): Rule<TContext, TResult>[] {
    return [...this.rules];
  }

  // 규칙 평가
  evaluate(context: TContext): EvaluationResult<TResult> {
    const appliedRules: AppliedRule<TResult>[] = [];

    for (const rule of this.rules) {
      try {
        if (rule.condition(context)) {
          const output = rule.apply(context);
          appliedRules.push({
            ruleId: rule.id,
            ruleName: rule.name,
            score: output.score,
            result: output.result,
            reason: output.reason,
          });
        }
      } catch (error) {
        console.error(`Rule "${rule.id}" failed:`, error);
      }
    }

    // 점수 기준 정렬
    appliedRules.sort((a, b) => b.score - a.score);

    const aggregatedResults = appliedRules.map((r) => r.result);
    const topResult = appliedRules.length > 0 ? appliedRules[0].result : null;
    const totalScore = appliedRules.reduce((sum, r) => sum + r.score, 0);

    return {
      appliedRules,
      aggregatedResults,
      topResult,
      totalScore,
    };
  }

  // 상위 N개 결과만 반환
  evaluateTop(context: TContext, n: number): EvaluationResult<TResult> {
    const result = this.evaluate(context);
    return {
      ...result,
      appliedRules: result.appliedRules.slice(0, n),
      aggregatedResults: result.aggregatedResults.slice(0, n),
    };
  }

  // 특정 점수 이상만 반환
  evaluateAboveThreshold(context: TContext, threshold: number): EvaluationResult<TResult> {
    const result = this.evaluate(context);
    const filtered = result.appliedRules.filter((r) => r.score >= threshold);
    return {
      appliedRules: filtered,
      aggregatedResults: filtered.map((r) => r.result),
      topResult: filtered.length > 0 ? filtered[0].result : null,
      totalScore: filtered.reduce((sum, r) => sum + r.score, 0),
    };
  }

  // 디버그용 정보
  debug(): string {
    return `RuleEngine "${this.name}" with ${this.rules.length} rules:\n${this.rules
      .map((r) => `  - ${r.id} (priority: ${r.priority}): ${r.description}`)
      .join('\n')}`;
  }
}

// 규칙 빌더 헬퍼
export function createRule<TContext, TResult>(
  config: Rule<TContext, TResult>
): Rule<TContext, TResult> {
  return config;
}

// 복합 규칙 (여러 조건을 AND로 결합)
export function combineRulesAnd<TContext, TResult>(
  id: string,
  name: string,
  rules: Rule<TContext, TResult>[],
  combineResults: (results: TResult[]) => TResult
): Rule<TContext, TResult> {
  return {
    id,
    name,
    description: `Combined rule: ${rules.map((r) => r.name).join(' AND ')}`,
    priority: Math.max(...rules.map((r) => r.priority)),
    condition: (ctx) => rules.every((r) => r.condition(ctx)),
    apply: (ctx) => {
      const outputs = rules.map((r) => r.apply(ctx));
      const avgScore = outputs.reduce((sum, o) => sum + o.score, 0) / outputs.length;
      return {
        score: avgScore,
        result: combineResults(outputs.map((o) => o.result)),
        reason: outputs.map((o) => o.reason).join('; '),
      };
    },
  };
}

// 복합 규칙 (여러 조건을 OR로 결합)
export function combineRulesOr<TContext, TResult>(
  id: string,
  name: string,
  rules: Rule<TContext, TResult>[],
  selectResult: (outputs: RuleOutput<TResult>[]) => RuleOutput<TResult>
): Rule<TContext, TResult> {
  return {
    id,
    name,
    description: `Combined rule: ${rules.map((r) => r.name).join(' OR ')}`,
    priority: Math.max(...rules.map((r) => r.priority)),
    condition: (ctx) => rules.some((r) => r.condition(ctx)),
    apply: (ctx) => {
      const matchingRules = rules.filter((r) => r.condition(ctx));
      const outputs = matchingRules.map((r) => r.apply(ctx));
      return selectResult(outputs);
    },
  };
}
