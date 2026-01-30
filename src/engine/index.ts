/**
 * 빌드 추천 엔진
 *
 * 상황 인식형 빌드 추천 시스템의 진입점입니다.
 */

// 규칙 엔진
export { RuleEngine, createRule, combineRulesAnd, combineRulesOr } from './rules/ruleEngine';
export type { Rule, RuleOutput, AppliedRule, EvaluationResult } from './rules/ruleEngine';

// 분석기
export { analyzeTeam, compareTeams } from './analyzer/teamAnalyzer';
export { analyzeMatchup } from './analyzer/matchupAnalyzer';

// 빌드 규칙
export { ALL_BUILD_RULES } from './rules/buildRules';

// 추천기
export { BuildRecommender, getBuildRecommender, recommendBuild } from './recommender/buildRecommender';
