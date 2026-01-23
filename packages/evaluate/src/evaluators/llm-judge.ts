/**
 * LLM-as-Judge Evaluator
 * Uses an LLM to evaluate quality of responses
 */

import type { EvaluationScore } from "@blackbox/shared";
import { createLogger } from "@blackbox/shared";
import OpenAI from "openai";
import type { Evaluator, EvaluatorContext, JudgePrompt } from "../types.js";

const logger = createLogger("llm-judge");

// Top-level regex for score extraction
const SCORE_REGEX = /\b([1-5])\b/;

/**
 * Default judge prompts for common evaluation criteria
 */
export const DEFAULT_JUDGE_PROMPTS: Record<string, JudgePrompt> = {
  helpfulness: {
    system: `You are an expert evaluator assessing the helpfulness of AI assistant responses.
Rate how well the response addresses the user's needs and provides actionable information.`,
    userTemplate: `Evaluate the following response for helpfulness:

{{content}}

Provide a score from 1-5 and brief explanation.`,
    rubric: `
1 = Not helpful at all, misses the point entirely
2 = Minimally helpful, addresses only part of the request
3 = Moderately helpful, addresses the request but lacks depth
4 = Very helpful, thoroughly addresses the request
5 = Exceptionally helpful, exceeds expectations`,
    scoreRange: { min: 1, max: 5 },
  },

  correctness: {
    system: `You are an expert evaluator assessing the correctness of AI-generated code or technical content.
Rate the technical accuracy and correctness of the response.`,
    userTemplate: `Evaluate the following response for technical correctness:

{{content}}

Provide a score from 1-5 and brief explanation.`,
    rubric: `
1 = Contains significant errors or incorrect information
2 = Has some errors that would cause problems
3 = Mostly correct with minor issues
4 = Correct with negligible issues
5 = Completely correct and accurate`,
    scoreRange: { min: 1, max: 5 },
  },

  clarity: {
    system: `You are an expert evaluator assessing the clarity and readability of responses.
Rate how clear, well-organized, and easy to understand the response is.`,
    userTemplate: `Evaluate the following response for clarity:

{{content}}

Provide a score from 1-5 and brief explanation.`,
    rubric: `
1 = Confusing and hard to understand
2 = Somewhat unclear, requires effort to understand
3 = Reasonably clear but could be improved
4 = Clear and well-organized
5 = Exceptionally clear and well-structured`,
    scoreRange: { min: 1, max: 5 },
  },
};

export interface LLMJudgeConfig {
  /**
   * OpenAI client or configuration
   */
  openai?: OpenAI | { apiKey: string; baseUrl?: string };

  /**
   * Model to use for judging
   */
  model?: string;

  /**
   * Judge prompts to use
   */
  prompts?: Record<string, JudgePrompt>;

  /**
   * Temperature for judge responses
   */
  temperature?: number;
}

/**
 * Create an LLM judge evaluator
 */
export function createLLMJudge(config: LLMJudgeConfig = {}): Evaluator {
  let openai: OpenAI;

  if (config.openai instanceof OpenAI) {
    openai = config.openai;
  } else if (config.openai) {
    openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseUrl,
    });
  } else {
    openai = new OpenAI();
  }

  const model = config.model || "gpt-4o-mini";
  const prompts = { ...DEFAULT_JUDGE_PROMPTS, ...config.prompts };
  const temperature = config.temperature ?? 0.3;

  return {
    config: {
      name: "llm-judge",
      description: "LLM-based quality evaluation",
      requiresLLM: true,
      model,
    },

    async evaluate(context: EvaluatorContext): Promise<EvaluationScore[]> {
      const { trace } = context;
      const scores: EvaluationScore[] = [];

      // Get the last meaningful response
      const lastResponse = trace.calls.filter((c) => c.response.content).pop();

      if (!lastResponse?.response.content) {
        return [
          {
            name: "llm_judge_skipped",
            value: 0,
            explanation: "No response content to evaluate",
          },
        ];
      }

      const content =
        typeof lastResponse.response.content === "string"
          ? lastResponse.response.content
          : JSON.stringify(lastResponse.response.content);

      // Run each judge prompt
      for (const [name, prompt] of Object.entries(prompts)) {
        try {
          const userPrompt = prompt.userTemplate.replace("{{content}}", content);

          const response = await openai.chat.completions.create({
            model,
            temperature,
            messages: [
              { role: "system", content: `${prompt.system}\n\nRubric:\n${prompt.rubric}` },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 200,
          });

          const judgeResponse = response.choices[0]?.message?.content || "";

          // Extract score from response
          const scoreMatch = judgeResponse.match(SCORE_REGEX);
          const score = scoreMatch ? Number.parseInt(scoreMatch[1], 10) : 3;

          // Normalize to 0-1 scale
          const normalizedScore =
            (score - prompt.scoreRange.min) / (prompt.scoreRange.max - prompt.scoreRange.min);

          scores.push({
            name: `judge_${name}`,
            value: normalizedScore,
            explanation: judgeResponse.slice(0, 200),
            metadata: {
              rawScore: score,
              model,
            },
          });
        } catch (error) {
          logger.error(`Judge evaluation failed for ${name}: ${error}`);
          scores.push({
            name: `judge_${name}`,
            value: 0.5,
            explanation: `Evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }
      }

      // Calculate overall judge score
      if (scores.length > 0) {
        const avgScore = scores.reduce((sum, s) => sum + s.value, 0) / scores.length;
        scores.unshift({
          name: "judge_overall",
          value: avgScore,
          explanation: `Average judge score across ${scores.length} criteria`,
        });
      }

      return scores;
    },
  };
}
