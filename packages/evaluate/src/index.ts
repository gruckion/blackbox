/**
 * @blackbox/evaluate - Evaluation framework for LLM traces
 */

// Export pipeline
export {
  EvaluationPipeline,
  createDefaultPipeline,
  createMinimalPipeline,
} from './pipeline.js';

// Export evaluators
export {
  loopDetector,
  toolEfficiency,
  createLLMJudge,
  DEFAULT_JUDGE_PROMPTS,
} from './evaluators/index.js';

// Export types
export type {
  EvaluatorConfig,
  EvaluatorContext,
  EvaluatorFunction,
  Evaluator,
  EvaluationPipelineConfig,
  PipelineResult,
  LoopDetectionResult,
  LoopPattern,
  JudgePrompt,
} from './types.js';

// Export LLMJudgeConfig from llm-judge
export type { LLMJudgeConfig } from './evaluators/llm-judge.js';
