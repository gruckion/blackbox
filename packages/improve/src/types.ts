/**
 * Types for the improvement engine
 */

import type { Trace, Rule, RuleImprovement, LoopPattern } from '@blackbox/shared';
import type { PipelineResult } from '@blackbox/evaluate';

export interface RulesFile {
  /**
   * File path
   */
  path: string;

  /**
   * File content
   */
  content: string;

  /**
   * Parsed rules
   */
  rules: Rule[];

  /**
   * File format
   */
  format: 'markdown' | 'yaml' | 'json';
}

export interface ImprovementAnalysis {
  /**
   * Traces analyzed
   */
  traceCount: number;

  /**
   * Common failure patterns
   */
  failurePatterns: FailurePattern[];

  /**
   * Loop patterns detected
   */
  loopPatterns: LoopPattern[];

  /**
   * Rule violation patterns
   */
  ruleViolations: RuleViolation[];

  /**
   * Improvement opportunities
   */
  opportunities: ImprovementOpportunity[];
}

export interface FailurePattern {
  /**
   * Pattern type
   */
  type: 'error' | 'low_quality' | 'timeout' | 'loop' | 'regression';

  /**
   * Description
   */
  description: string;

  /**
   * Frequency (0-1)
   */
  frequency: number;

  /**
   * Affected trace IDs
   */
  traceIds: string[];

  /**
   * Potential fixes
   */
  potentialFixes: string[];
}

export interface RuleViolation {
  /**
   * Rule that was violated
   */
  rule: Rule;

  /**
   * Number of violations
   */
  count: number;

  /**
   * Example trace IDs
   */
  exampleTraceIds: string[];
}

export interface ImprovementOpportunity {
  /**
   * Opportunity ID
   */
  id: string;

  /**
   * Priority (0-1, higher is more important)
   */
  priority: number;

  /**
   * Type of improvement
   */
  type: 'new_rule' | 'modify_rule' | 'remove_rule' | 'add_example';

  /**
   * Description
   */
  description: string;

  /**
   * Estimated impact
   */
  estimatedImpact: {
    tracesImproved: number;
    confidenceScore: number;
  };

  /**
   * Related patterns
   */
  relatedPatterns: string[];
}

export interface ImproveConfig {
  /**
   * Path to rules file
   */
  rulesFile: string;

  /**
   * OpenAI configuration for improvement generation
   */
  openai?: {
    apiKey: string;
    baseUrl?: string;
  };

  /**
   * Model to use for improvement generation
   */
  model?: string;

  /**
   * Maximum improvements to generate
   */
  maxImprovements?: number;

  /**
   * Minimum confidence threshold
   */
  minConfidence?: number;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

export interface ValidationResult {
  /**
   * Whether the improvement is valid
   */
  valid: boolean;

  /**
   * Traces that improved
   */
  improved: string[];

  /**
   * Traces that regressed
   */
  regressed: string[];

  /**
   * Net improvement score
   */
  netScore: number;

  /**
   * Details
   */
  details: string;
}

export interface ImprovementContext {
  /**
   * Current rules
   */
  rules: RulesFile;

  /**
   * Traces to analyze
   */
  traces: Trace[];

  /**
   * Evaluation results
   */
  evaluations: PipelineResult[];

  /**
   * Previous improvements (for context)
   */
  previousImprovements?: RuleImprovement[];
}
