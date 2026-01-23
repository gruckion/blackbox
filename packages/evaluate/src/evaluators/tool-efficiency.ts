/**
 * Tool Efficiency Evaluator
 * Measures how efficiently tools are used
 */

import type { EvaluationScore } from '@blackbox/shared';
import type { Evaluator, EvaluatorContext } from '../types.js';

/**
 * Tool Efficiency Evaluator
 */
export const toolEfficiency: Evaluator = {
  config: {
    name: 'tool-efficiency',
    description: 'Evaluates efficiency of tool usage',
    requiresLLM: false,
  },

  evaluate(context: EvaluatorContext): Promise<EvaluationScore[]> {
    const { trace } = context;
    const scores: EvaluationScore[] = [];

    // Count tool calls
    let totalToolCalls = 0;
    let failedToolCalls = 0;
    const uniqueTools = new Set<string>();

    for (const call of trace.calls) {
      if (call.response.toolCalls) {
        for (const tc of call.response.toolCalls) {
          totalToolCalls++;
          uniqueTools.add(tc.function.name);
        }
      }

      // Check for tool errors in subsequent messages
      if (call.error) {
        failedToolCalls++;
      }
    }

    // Score: Tool success rate
    if (totalToolCalls > 0) {
      const successRate = 1 - failedToolCalls / totalToolCalls;
      scores.push({
        name: 'tool_success_rate',
        value: successRate,
        explanation:
          failedToolCalls === 0
            ? 'All tool calls succeeded'
            : `${failedToolCalls} of ${totalToolCalls} tool calls failed`,
        metadata: {
          totalToolCalls,
          failedToolCalls,
          uniqueTools: uniqueTools.size,
        },
      });
    }

    // Score: Tool diversity (using multiple tools vs just one)
    if (totalToolCalls > 0 && uniqueTools.size > 0) {
      // Higher is better - using diverse tools appropriately
      const diversityScore = Math.min(uniqueTools.size / Math.max(totalToolCalls / 3, 1), 1);
      scores.push({
        name: 'tool_diversity',
        value: diversityScore,
        explanation: `Used ${uniqueTools.size} unique tools across ${totalToolCalls} calls`,
        metadata: {
          tools: Array.from(uniqueTools),
        },
      });
    }

    // Score: Token efficiency (tokens per successful outcome)
    const totalTokens = trace.calls.reduce((sum, c) => sum + (c.usage?.totalTokens || 0), 0);
    const callCount = trace.calls.length;

    if (callCount > 0) {
      // Lower tokens per call is better (normalized to 0-1 scale)
      // Assume 500 tokens/call is "average", < 300 is "efficient", > 1000 is "inefficient"
      const tokensPerCall = totalTokens / callCount;
      const efficiencyScore = Math.max(0, Math.min(1, 1 - (tokensPerCall - 300) / 700));

      scores.push({
        name: 'token_efficiency',
        value: efficiencyScore,
        explanation: `${Math.round(tokensPerCall)} tokens per call on average`,
        metadata: {
          totalTokens,
          callCount,
          tokensPerCall: Math.round(tokensPerCall),
        },
      });
    }

    // Score: Call efficiency (fewer calls to achieve outcome is better)
    // This is more meaningful with outcome data, but we can estimate based on trace length
    if (callCount > 0) {
      // Assume 5-10 calls is typical, < 5 is efficient, > 20 is inefficient
      const callEfficiency = Math.max(0, Math.min(1, 1 - (callCount - 5) / 15));
      scores.push({
        name: 'call_efficiency',
        value: callEfficiency,
        explanation: `Completed in ${callCount} LLM calls`,
        metadata: {
          callCount,
        },
      });
    }

    // Overall efficiency score
    if (scores.length > 0) {
      const avgScore = scores.reduce((sum, s) => sum + s.value, 0) / scores.length;
      scores.unshift({
        name: 'overall_efficiency',
        value: avgScore,
        explanation: `Overall efficiency score based on ${scores.length} metrics`,
      });
    }

    return Promise.resolve(scores);
  },
};
