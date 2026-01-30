/**
 * 타입 정의 모음 - 재export
 */

// Champion types
export type {
  ChampionClass,
  DamageType,
  Lane,
  RangeType,
  CCType,
  DamageProfile,
  PowerSpike,
  TeamfightRole,
  ScalingType,
  WinCondition,
  ChampionMeta,
  ChampionSlot,
  TeamComposition,
} from './champion';

// Build types
export type {
  ItemSlot,
  ItemConditionType,
  ItemCondition,
  SituationalItem,
  BootsChoice,
  BuildCondition,
  BuildTemplate,
  ItemRecommendation,
  BuildRecommendation,
  ItemInfo,
} from './build';

// Rune types
export type {
  RuneTree,
  RuneCondition,
  RuneTemplate,
  RuneInfo,
  StatRuneInfo,
  RuneRecommendation,
  RunePage,
} from './rune';

// Analysis types
export type {
  TeamAnalysis,
  MatchupAnalysis,
  StrategyGuide,
  FullAnalysis,
  RuleContext,
} from './analysis';
