/**
 * Evaluation Pipeline
 * Orchestrates running multiple evaluators on traces
 */

import { createLogger, type EvaluationResult, now, type Trace } from '@blackbox/shared';
import { createLLMJudge, loopDetector, toolEfficiency } from './evaluators/index.js';
import type {
  EvaluationPipelineConfig,
  Evaluator,
  EvaluatorContext,
  PipelineResult,
} from './types.js';

const logger = createLogger('eval-pipeline');

export class EvaluationPipeline {
  private readonly evaluators: Evaluator[];
  private readonly parallel: boolean;
  private readonly debug: boolean;

  constructor(config: EvaluationPipelineConfig) {
    this.evaluators = config.evaluators;
    this.parallel = config.parallel ?? true;
    this.debug = config.debug ?? false;

    if (this.debug) {
      logger.info(
        `Pipeline initialized with ${this.evaluators.length} evaluators: ${this.evaluators.map((e) => e.config.name).join(', ')}`
      );
    }
  }

  /**
   * Run all evaluators on a trace
   */
  async evaluate(trace: Trace, originalTrace?: Trace): Promise<PipelineResult> {
    const context: EvaluatorContext = {
      trace,
      originalTrace,
    };

    const results: EvaluationResult[] = [];
    const timestamp = now();

    if (this.parallel) {
      // Run evaluators in parallel
      const evalPromises = this.evaluators.map(async (evaluator) => {
        try {
          const scores = await evaluator.evaluate(context);
          return {
            traceId: trace.id,
            evaluatorName: evaluator.config.name,
            scores,
            timestamp,
          } as EvaluationResult;
        } catch (error) {
          logger.error(`Evaluator ${evaluator.config.name} failed: ${error}`);
          return {
            traceId: trace.id,
            evaluatorName: evaluator.config.name,
            scores: [
              {
                name: 'error',
                value: 0,
                explanation: `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            timestamp,
          } as EvaluationResult;
        }
      });

      const evalResults = await Promise.all(evalPromises);
      results.push(...evalResults);
    } else {
      // Run evaluators sequentially
      for (const evaluator of this.evaluators) {
        try {
          const scores = await evaluator.evaluate(context);
          results.push({
            traceId: trace.id,
            evaluatorName: evaluator.config.name,
            scores,
            timestamp,
          });
        } catch (error) {
          logger.error(`Evaluator ${evaluator.config.name} failed: ${error}`);
          results.push({
            traceId: trace.id,
            evaluatorName: evaluator.config.name,
            scores: [
              {
                name: 'error',
                value: 0,
                explanation: `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            timestamp,
          });
        }
      }
    }

    // Calculate aggregate scores
    const aggregateScores: Record<string, number> = {};
    const issues: string[] = [];

    for (const result of results) {
      for (const score of result.scores) {
        aggregateScores[score.name] = score.value;

        // Flag issues (low scores)
        if (score.value < 0.5 && score.name !== 'error') {
          issues.push(
            `${result.evaluatorName}: ${score.name} = ${score.value.toFixed(2)} - ${score.explanation}`
          );
        }
      }
    }

    // Calculate overall score
    const scoreValues = Object.values(aggregateScores).filter((v) => !Number.isNaN(v));
    if (scoreValues.length > 0) {
      aggregateScores.overall = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
    }

    return {
      traceId: trace.id,
      results,
      aggregateScores,
      hasIssues: issues.length > 0,
      issues,
      timestamp,
    };
  }

  /**
   * Run evaluation on multiple traces
   */
  async evaluateBatch(
    traces: Trace[],
    options?: { concurrency?: number }
  ): Promise<PipelineResult[]> {
    const concurrency = options?.concurrency || 5;
    const results: PipelineResult[] = [];

    for (let i = 0; i < traces.length; i += concurrency) {
      const batch = traces.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map((trace) => this.evaluate(trace)));
      results.push(...batchResults);

      if (this.debug) {
        logger.info(
          `Evaluated ${Math.min(i + concurrency, traces.length)}/${traces.length} traces`
        );
      }
    }

    return results;
  }

  /**
   * Add an evaluator to the pipeline
   */
  addEvaluator(evaluator: Evaluator): void {
    this.evaluators.push(evaluator);
  }

  /**
   * Get evaluator names
   */
  getEvaluatorNames(): string[] {
    return this.evaluators.map((e) => e.config.name);
  }
}

/**
 * Create a default evaluation pipeline
 */
export function createDefaultPipeline(
  config?: Partial<EvaluationPipelineConfig>
): EvaluationPipeline {
  const evaluators: Evaluator[] = [loopDetector, toolEfficiency];

  // Add LLM judge if OpenAI config provided
  if (config?.openai) {
    evaluators.push(
      createLLMJudge({
        openai: config.openai,
        model: config.judgeModel,
      })
    );
  }

  return new EvaluationPipeline({
    evaluators,
    parallel: config?.parallel ?? true,
    debug: config?.debug,
    ...config,
  });
}

/**
 * Create a minimal pipeline (no LLM, fast)
 */
export function createMinimalPipeline(debug?: boolean): EvaluationPipeline {
  return new EvaluationPipeline({
    evaluators: [loopDetector, toolEfficiency],
    parallel: true,
    debug,
  });
}
