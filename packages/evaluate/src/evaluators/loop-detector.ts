/**
 * Loop Detection Evaluator
 * Detects stuck loops, oscillations, and repetitive behavior in traces
 */

import type { EvaluationScore } from '@blackbox/shared';
import { textSimilarity } from '@blackbox/shared';
import type { Evaluator, EvaluatorContext, LoopPattern } from '../types.js';

/**
 * Detect repeated tool calls (same tool with same/similar arguments)
 */
function detectRepeatedToolCalls(context: EvaluatorContext): LoopPattern[] {
  const patterns: LoopPattern[] = [];
  const { trace } = context;

  // Group tool calls by name
  const toolCallGroups = new Map<string, Array<{ callId: string; args: string }>>();

  for (const call of trace.calls) {
    if (call.response.toolCalls) {
      for (const tc of call.response.toolCalls) {
        const existing = toolCallGroups.get(tc.function.name) || [];
        existing.push({
          callId: call.id,
          args: tc.function.arguments,
        });
        toolCallGroups.set(tc.function.name, existing);
      }
    }
  }

  // Check for repeated calls
  for (const [toolName, calls] of toolCallGroups) {
    if (calls.length < 3) {
      continue;
    }

    // Check for identical or very similar arguments
    let repeatCount = 0;
    const repeatedCallIds: string[] = [];

    for (let i = 1; i < calls.length; i++) {
      const similarity = textSimilarity(calls[i - 1].args, calls[i].args);
      if (similarity > 0.9) {
        repeatCount++;
        if (!repeatedCallIds.includes(calls[i - 1].callId)) {
          repeatedCallIds.push(calls[i - 1].callId);
        }
        repeatedCallIds.push(calls[i].callId);
      }
    }

    if (repeatCount >= 2) {
      patterns.push({
        type: 'repeated-tool-call',
        description: `Tool "${toolName}" called ${repeatCount + 1} times with similar arguments`,
        callIds: repeatedCallIds,
        count: repeatCount + 1,
      });
    }
  }

  return patterns;
}

/**
 * Detect oscillation patterns (A -> B -> A -> B)
 */
function detectOscillation(context: EvaluatorContext): LoopPattern[] {
  const patterns: LoopPattern[] = [];
  const { trace } = context;

  if (trace.calls.length < 4) {
    return patterns;
  }

  // Look for alternating patterns in response content
  const contents = trace.calls.map((c) =>
    typeof c.response.content === 'string' ? c.response.content : ''
  );

  for (let windowSize = 2; windowSize <= 4; windowSize++) {
    for (let i = 0; i < contents.length - windowSize * 2; i++) {
      const pattern1 = contents.slice(i, i + windowSize);
      const pattern2 = contents.slice(i + windowSize, i + windowSize * 2);

      // Check if patterns are similar
      const similarities = pattern1.map((p1, j) => textSimilarity(p1, pattern2[j]));
      const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;

      if (avgSimilarity > 0.8) {
        const callIds = trace.calls.slice(i, i + windowSize * 2).map((c) => c.id);
        patterns.push({
          type: 'oscillation',
          description: `Oscillation detected: ${windowSize}-step pattern repeating`,
          callIds,
          count: 2,
        });
        break; // Only report first occurrence
      }
    }
  }

  return patterns;
}

/**
 * Detect stalled progress (low novelty in consecutive responses)
 */
function detectStalled(context: EvaluatorContext): LoopPattern[] {
  const patterns: LoopPattern[] = [];
  const { trace } = context;

  if (trace.calls.length < 5) {
    return patterns;
  }

  // Check for low novelty in consecutive responses
  const contents = trace.calls.map((c) =>
    typeof c.response.content === 'string' ? c.response.content : ''
  );

  let stalledRun = 0;
  const stalledCallIds: string[] = [];

  for (let i = 1; i < contents.length; i++) {
    const similarity = textSimilarity(contents[i - 1], contents[i]);

    if (similarity > 0.7) {
      stalledRun++;
      if (stalledRun === 1) {
        stalledCallIds.push(trace.calls[i - 1].id);
      }
      stalledCallIds.push(trace.calls[i].id);
    } else {
      if (stalledRun >= 3) {
        patterns.push({
          type: 'stalled',
          description: `Progress stalled: ${stalledRun + 1} consecutive similar responses`,
          callIds: [...stalledCallIds],
          count: stalledRun + 1,
        });
      }
      stalledRun = 0;
      stalledCallIds.length = 0;
    }
  }

  // Check final run
  if (stalledRun >= 3) {
    patterns.push({
      type: 'stalled',
      description: `Progress stalled: ${stalledRun + 1} consecutive similar responses`,
      callIds: stalledCallIds,
      count: stalledRun + 1,
    });
  }

  return patterns;
}

/**
 * Loop Detection Evaluator
 */
export const loopDetector: Evaluator = {
  config: {
    name: 'loop-detector',
    description: 'Detects stuck loops, oscillations, and repetitive behavior',
    requiresLLM: false,
  },

  async evaluate(context: EvaluatorContext): Promise<EvaluationScore[]> {
    const allPatterns: LoopPattern[] = [
      ...detectRepeatedToolCalls(context),
      ...detectOscillation(context),
      ...detectStalled(context),
    ];

    // Calculate severity based on patterns
    let severity = 0;
    for (const pattern of allPatterns) {
      switch (pattern.type) {
        case 'repeated-tool-call':
          severity += 0.3 * Math.min(pattern.count / 5, 1);
          break;
        case 'oscillation':
          severity += 0.4;
          break;
        case 'stalled':
          severity += 0.2 * Math.min(pattern.count / 10, 1);
          break;
        case 'circular':
          severity += 0.5;
          break;
        default:
          break;
      }
    }

    severity = Math.min(severity, 1);

    const scores: EvaluationScore[] = [
      {
        name: 'loop_free',
        value: 1 - severity,
        explanation:
          allPatterns.length === 0
            ? 'No loop patterns detected'
            : `Detected ${allPatterns.length} loop pattern(s): ${allPatterns.map((p) => p.type).join(', ')}`,
        metadata: {
          patterns: allPatterns,
          patternCount: allPatterns.length,
        },
      },
    ];

    // Add per-pattern scores
    if (allPatterns.some((p) => p.type === 'repeated-tool-call')) {
      scores.push({
        name: 'no_repeated_tools',
        value: 0,
        explanation: 'Repeated tool calls detected',
      });
    }

    if (allPatterns.some((p) => p.type === 'oscillation')) {
      scores.push({
        name: 'no_oscillation',
        value: 0,
        explanation: 'Oscillation pattern detected',
      });
    }

    if (allPatterns.some((p) => p.type === 'stalled')) {
      scores.push({
        name: 'making_progress',
        value: 0,
        explanation: 'Progress appears stalled',
      });
    }

    return scores;
  },
};
