/**
 * Types for the evaluation framework
 */

import type { EvaluationResult, EvaluationScore, Trace } from '@blackbox/shared';

export interface EvaluatorConfig {
  /**
   * Name of the evaluator
   */
  name: string;

  /**
   * Description of what this evaluator measures
   */
  description?: string;

  /**
   * Whether this evaluator requires an LLM
   */
  requiresLLM?: boolean;

  /**
   * Model to use for LLM-based evaluation
   */
  model?: string;
}

export interface EvaluatorContext {
  /**
   * The trace being evaluated
   */
  trace: Trace;

  /**
   * Original trace (for comparison evaluations)
   */
  originalTrace?: Trace;

  /**
   * Additional context data
   */
  metadata?: Record<string, unknown>;
}

export type EvaluatorFunction = (context: EvaluatorContext) => Promise<EvaluationScore[]>;

export interface Evaluator {
  config: EvaluatorConfig;
  evaluate: EvaluatorFunction;
}

export interface EvaluationPipelineConfig {
  /**
   * Evaluators to run
   */
  evaluators: Evaluator[];

  /**
   * Whether to run evaluators in parallel
   */
  parallel?: boolean;

  /**
   * Model for LLM-as-judge evaluations
   */
  judgeModel?: string;

  /**
   * Phoenix client configuration
   */
  phoenix?: {
    host: string;
  };

  /**
   * OpenAI configuration for LLM evaluators
   */
  openai?: {
    apiKey: string;
    baseUrl?: string;
  };

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

export interface PipelineResult {
  /**
   * Trace that was evaluated
   */
  traceId: string;

  /**
   * All evaluation results
   */
  results: EvaluationResult[];

  /**
   * Aggregate scores
   */
  aggregateScores: Record<string, number>;

  /**
   * Whether any evaluator flagged issues
   */
  hasIssues: boolean;

  /**
   * Issues found
   */
  issues: string[];

  /**
   * Timestamp
   */
  timestamp: string;
}

export interface LoopDetectionResult {
  /**
   * Whether loops were detected
   */
  hasLoops: boolean;

  /**
   * Detected loop patterns
   */
  patterns: LoopPattern[];

  /**
   * Severity score (0-1)
   */
  severity: number;
}

export interface LoopPattern {
  /**
   * Type of loop pattern
   */
  type: 'repeated-tool-call' | 'oscillation' | 'stalled' | 'circular';

  /**
   * Description of the pattern
   */
  description: string;

  /**
   * Call IDs involved
   */
  callIds: string[];

  /**
   * Number of occurrences
   */
  count: number;
}

export interface JudgePrompt {
  /**
   * System prompt for the judge
   */
  system: string;

  /**
   * User prompt template (use {{content}} for placeholder)
   */
  userTemplate: string;

  /**
   * Rubric for scoring
   */
  rubric: string;

  /**
   * Score range
   */
  scoreRange: {
    min: number;
    max: number;
  };
}
