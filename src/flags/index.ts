export { flags, type FlagsReadSurface } from "./client.js";
export { FlagsScopeError, RAILWAY_PROJECT_ID_ENV, serializeScope } from "./scope.js";
export {
  evaluateFlagRuleset,
  evaluateFlagRulesetSync,
  parseRegistrySignal,
  parseSignalRules,
  resolveSignal,
  traceToSteps,
} from "./resolver.js";
export { signalBucketRatio } from "./bucket.js";
export {
  contextFromPublic,
  flattenEvaluationContext,
  normalizeEvaluationContext,
} from "./context.js";
export type {
  Context,
  Evaluation,
  FlagEvaluationContext,
  FlagsInitOptions,
  FlagsScope,
  RadarClause,
  Reason,
  RegistrySignalRow,
  SignalBucketCompare,
  SignalExpression,
  SignalResolutionTrace,
  SignalResolveResult,
  SignalRule,
  SignalRuleset,
  SignalSource,
  SignalType,
  TraceStep,
} from "./types.js";
