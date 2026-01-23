/**
 * @blackbox/improve - Rules improvement engine
 */

// Export parser
export { loadRulesFile, saveRulesFile, createRulesFile } from './parser.js';

// Export analyzer
export { analyzeTraces, getAnalysisSummary } from './analyzer.js';

// Export generator
export { RuleGenerator, createRuleGenerator } from './generator.js';

// Export types
export type {
  RulesFile,
  ImprovementAnalysis,
  FailurePattern,
  RuleViolation,
  ImprovementOpportunity,
  ImproveConfig,
  ValidationResult,
  ImprovementContext,
} from './types.js';

export type { GeneratorConfig } from './generator.js';
