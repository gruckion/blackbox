/**
 * Improvement Analyzer
 * Analyzes traces to identify improvement opportunities
 */

import type { PipelineResult } from '@blackbox/evaluate';
import type { LoopPattern, Trace } from '@blackbox/shared';
import type {
  FailurePattern,
  ImprovementAnalysis,
  ImprovementOpportunity,
  RulesFile,
  RuleViolation,
} from './types.js';

// Internal type for evaluator loop patterns before conversion
interface EvaluatorLoopPattern {
  type: string;
  description: string;
  count: number;
  callIds: string[];
}

/**
 * Analyze traces to find patterns and improvement opportunities
 */
export function analyzeTraces(
  traces: Trace[],
  evaluations: PipelineResult[],
  rules: RulesFile
): ImprovementAnalysis {
  const failurePatterns = findFailurePatterns(traces, evaluations);
  const loopPatterns = findLoopPatterns(evaluations);
  const ruleViolations = findRuleViolations(traces, rules);
  const opportunities = generateOpportunities(failurePatterns, loopPatterns, ruleViolations);

  return {
    traceCount: traces.length,
    failurePatterns,
    loopPatterns,
    ruleViolations,
    opportunities,
  };
}

/**
 * Find common failure patterns
 */
function findFailurePatterns(traces: Trace[], evaluations: PipelineResult[]): FailurePattern[] {
  const patterns: FailurePattern[] = [];

  // Group traces by outcome
  const errorTraces = traces.filter((t) => t.outcome?.success === false);
  const lowQualityTraces: string[] = [];

  for (const evaluation of evaluations) {
    if (evaluation.aggregateScores.overall < 0.5) {
      lowQualityTraces.push(evaluation.traceId);
    }
  }

  // Error pattern
  if (errorTraces.length > 0) {
    const frequency = errorTraces.length / traces.length;
    patterns.push({
      type: 'error',
      description: `${errorTraces.length} traces ended with errors`,
      frequency,
      traceIds: errorTraces.map((t) => t.id),
      potentialFixes: [
        'Add error handling rules',
        'Include common error recovery strategies',
        'Add validation before risky operations',
      ],
    });
  }

  // Low quality pattern
  if (lowQualityTraces.length > 0) {
    const frequency = lowQualityTraces.length / traces.length;
    patterns.push({
      type: 'low_quality',
      description: `${lowQualityTraces.length} traces had low quality scores`,
      frequency,
      traceIds: lowQualityTraces,
      potentialFixes: [
        'Add quality guidelines to rules',
        'Include examples of good outputs',
        'Add review steps before completion',
      ],
    });
  }

  return patterns;
}

/**
 * Map evaluator loop type to shared loop pattern type
 */
function mapLoopType(type: string): LoopPattern['type'] {
  const typeMap: Record<string, LoopPattern['type']> = {
    'repeated-tool-call': 'repeated-tool-call',
    oscillation: 'oscillation',
    'excessive-self-critique': 'excessive-self-critique',
    'stalled-retrieval': 'stalled-retrieval',
    'circular-reasoning': 'circular-reasoning',
    // Map common variations
    repeated_tool_call: 'repeated-tool-call',
    'repeated-calls': 'repeated-tool-call',
    stuck: 'stalled-retrieval',
    loop: 'circular-reasoning',
  };
  return typeMap[type] || 'circular-reasoning';
}

/**
 * Extract loop patterns from evaluations
 */
function findLoopPatterns(evaluations: PipelineResult[]): LoopPattern[] {
  const allPatterns: EvaluatorLoopPattern[] = [];

  for (const evaluation of evaluations) {
    const loopResult = evaluation.results.find((r) => r.evaluatorName === 'loop-detector');

    if (loopResult) {
      for (const score of loopResult.scores) {
        if (score.metadata?.patterns) {
          const patterns = score.metadata.patterns as EvaluatorLoopPattern[];
          allPatterns.push(...patterns);
        }
      }
    }
  }

  // Deduplicate and aggregate similar patterns
  const patternMap = new Map<string, EvaluatorLoopPattern>();

  for (const pattern of allPatterns) {
    const key = `${pattern.type}-${pattern.description}`;
    const existing = patternMap.get(key);

    if (existing) {
      existing.count += pattern.count;
      existing.callIds.push(...pattern.callIds);
    } else {
      patternMap.set(key, { ...pattern });
    }
  }

  // Convert evaluator patterns to shared LoopPattern format
  return Array.from(patternMap.values()).map(
    (p): LoopPattern => ({
      type: mapLoopType(p.type),
      description: p.description,
      occurrences: p.count,
      traceIds: p.callIds, // callIds serve as trace/call identifiers
    })
  );
}

/**
 * Find rule violations
 */
function findRuleViolations(traces: Trace[], rules: RulesFile): RuleViolation[] {
  const violations: RuleViolation[] = [];

  // This is a simplified heuristic - in production you'd use LLM analysis
  for (const rule of rules.rules) {
    const violatingTraces: string[] = [];

    for (const trace of traces) {
      // Check if any response might violate the rule
      // This is a very rough heuristic based on keyword matching
      const ruleKeywords = rule.content
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4);

      for (const call of trace.calls) {
        const content =
          typeof call.response.content === 'string' ? call.response.content.toLowerCase() : '';

        // Check if response seems to contradict rule
        const containsNegation = /\b(don't|not|never|shouldn't|won't)\b/.test(content);
        const containsKeyword = ruleKeywords.some((kw) => content.includes(kw));

        if (containsNegation && containsKeyword) {
          violatingTraces.push(trace.id);
          break;
        }
      }
    }

    if (violatingTraces.length > 0) {
      violations.push({
        rule,
        count: violatingTraces.length,
        exampleTraceIds: violatingTraces.slice(0, 3),
      });
    }
  }

  return violations;
}

/**
 * Generate improvement opportunities from patterns
 */
function generateOpportunities(
  failurePatterns: FailurePattern[],
  loopPatterns: LoopPattern[],
  ruleViolations: RuleViolation[]
): ImprovementOpportunity[] {
  const opportunities: ImprovementOpportunity[] = [];
  let id = 1;

  // Opportunities from failure patterns
  for (const pattern of failurePatterns) {
    const priority = pattern.frequency * 0.8;

    for (const fix of pattern.potentialFixes.slice(0, 1)) {
      opportunities.push({
        id: `opp-${id++}`,
        priority,
        type: 'new_rule',
        description: fix,
        estimatedImpact: {
          tracesImproved: Math.round(pattern.traceIds.length * 0.5),
          confidenceScore: 0.6,
        },
        relatedPatterns: [pattern.type],
      });
    }
  }

  // Opportunities from loop patterns
  for (const pattern of loopPatterns) {
    const priority = 0.7 + pattern.occurrences * 0.05;

    opportunities.push({
      id: `opp-${id++}`,
      priority: Math.min(priority, 1),
      type: 'new_rule',
      description: `Add rule to prevent ${pattern.type}: ${pattern.description}`,
      estimatedImpact: {
        tracesImproved: pattern.occurrences,
        confidenceScore: 0.7,
      },
      relatedPatterns: [pattern.type],
    });
  }

  // Opportunities from rule violations
  for (const violation of ruleViolations) {
    opportunities.push({
      id: `opp-${id++}`,
      priority: 0.5 + violation.count * 0.1,
      type: 'modify_rule',
      description: `Clarify rule: "${violation.rule.content.slice(0, 50)}..."`,
      estimatedImpact: {
        tracesImproved: violation.count,
        confidenceScore: 0.5,
      },
      relatedPatterns: [],
    });
  }

  // Sort by priority
  opportunities.sort((a, b) => b.priority - a.priority);

  return opportunities;
}

/**
 * Get summary statistics from analysis
 */
export function getAnalysisSummary(analysis: ImprovementAnalysis): string {
  const lines: string[] = [];

  lines.push(`Analysis of ${analysis.traceCount} traces:`);
  lines.push('');

  if (analysis.failurePatterns.length > 0) {
    lines.push(`Failure Patterns: ${analysis.failurePatterns.length}`);
    for (const pattern of analysis.failurePatterns) {
      lines.push(
        `  - ${pattern.type}: ${pattern.description} (${(pattern.frequency * 100).toFixed(1)}%)`
      );
    }
    lines.push('');
  }

  if (analysis.loopPatterns.length > 0) {
    lines.push(`Loop Patterns: ${analysis.loopPatterns.length}`);
    for (const pattern of analysis.loopPatterns) {
      lines.push(`  - ${pattern.type}: ${pattern.description} (${pattern.occurrences}x)`);
    }
    lines.push('');
  }

  if (analysis.opportunities.length > 0) {
    lines.push(`Improvement Opportunities: ${analysis.opportunities.length}`);
    for (const opp of analysis.opportunities.slice(0, 5)) {
      lines.push(`  - [${opp.priority.toFixed(2)}] ${opp.type}: ${opp.description}`);
    }
  }

  return lines.join('\n');
}
