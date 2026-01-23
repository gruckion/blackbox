/**
 * @blackbox/improve - Rules improvement engine
 */

// Export analyzer
export { analyzeTraces, getAnalysisSummary } from "./analyzer.js";
export type { GeneratorConfig } from "./generator.js";

// Export generator
export { createRuleGenerator, RuleGenerator } from "./generator.js";
// Export parser
export { createRulesFile, loadRulesFile, saveRulesFile } from "./parser.js";
// Export types
export type {
  FailurePattern,
  ImproveConfig,
  ImprovementAnalysis,
  ImprovementContext,
  ImprovementOpportunity,
  RulesFile,
  RuleViolation,
  ValidationResult,
} from "./types.js";
