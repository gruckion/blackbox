/**
 * Rule Generator
 * Generates improved rules using LLM
 */

import OpenAI from 'openai';
import { createLogger, now, type Rule, type RuleImprovement } from '@blackbox/shared';
import type { ImprovementAnalysis, ImprovementOpportunity, RulesFile } from './types.js';

const logger = createLogger('generator');

export interface GeneratorConfig {
  openai?: OpenAI | { apiKey: string; baseUrl?: string };
  model?: string;
  temperature?: number;
  maxImprovements?: number;
}

export class RuleGenerator {
  private openai: OpenAI;
  private model: string;
  private temperature: number;
  private maxImprovements: number;

  constructor(config: GeneratorConfig = {}) {
    if (config.openai instanceof OpenAI) {
      this.openai = config.openai;
    } else if (config.openai) {
      this.openai = new OpenAI({
        apiKey: config.openai.apiKey,
        baseURL: config.openai.baseUrl,
      });
    } else {
      this.openai = new OpenAI();
    }

    this.model = config.model || 'gpt-4o-mini';
    this.temperature = config.temperature ?? 0.7;
    this.maxImprovements = config.maxImprovements ?? 5;
  }

  /**
   * Generate improved rules from analysis
   */
  async generate(
    analysis: ImprovementAnalysis,
    currentRules: RulesFile
  ): Promise<RuleImprovement[]> {
    const improvements: RuleImprovement[] = [];

    // Take top opportunities
    const topOpportunities = analysis.opportunities.slice(0, this.maxImprovements);

    for (const opportunity of topOpportunities) {
      try {
        const improvement = await this.generateImprovement(
          opportunity,
          currentRules,
          analysis
        );
        if (improvement) {
          improvements.push(improvement);
        }
      } catch (error) {
        logger.error(`Failed to generate improvement for ${opportunity.id}: ${error}`);
      }
    }

    return improvements;
  }

  /**
   * Generate a single improvement
   */
  private async generateImprovement(
    opportunity: ImprovementOpportunity,
    currentRules: RulesFile,
    analysis: ImprovementAnalysis
  ): Promise<RuleImprovement | null> {
    const systemPrompt = `You are an expert at writing clear, actionable rules for AI coding assistants.
Your task is to generate or improve rules based on observed patterns and issues.

Rules should be:
- Clear and unambiguous
- Actionable (tell the AI what to do or not do)
- Specific enough to be useful
- General enough to apply to multiple situations

Output format: Return ONLY the improved rule text, nothing else.`;

    const context = this.buildContext(opportunity, currentRules, analysis);

    const userPrompt = `Based on the following analysis, generate an improved rule:

Context:
${context}

Opportunity Type: ${opportunity.type}
Description: ${opportunity.description}
Related Patterns: ${opportunity.relatedPatterns.join(', ') || 'None'}

Current relevant rules:
${currentRules.rules.slice(0, 5).map((r) => `- ${r.content}`).join('\n')}

Generate a single clear, actionable rule that addresses this opportunity.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        temperature: this.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 200,
      });

      const generatedContent = response.choices[0]?.message?.content?.trim();

      if (!generatedContent) {
        return null;
      }

      // Find the original rule if this is a modification
      let originalRule: Rule | undefined;
      if (opportunity.type === 'modify_rule') {
        originalRule = currentRules.rules.find((r) =>
          opportunity.description.includes(r.content.slice(0, 30))
        );
      }

      const improvement: RuleImprovement = {
        id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        originalRule,
        improvedRule: {
          id: `rule-new-${Date.now()}`,
          content: generatedContent,
          category: originalRule?.category || 'general',
          source: 'generated',
        },
        reason: opportunity.description,
        evidence: {
          tracesImproved: opportunity.estimatedImpact.tracesImproved,
          tracesRegressed: 0,
          netScoreDelta: opportunity.estimatedImpact.confidenceScore,
          exampleTraceIds: [],
        },
        confidence: opportunity.estimatedImpact.confidenceScore,
        timestamp: now(),
      };

      return improvement;
    } catch (error) {
      logger.error(`LLM call failed: ${error}`);
      return null;
    }
  }

  /**
   * Build context string for the prompt
   */
  private buildContext(
    _opportunity: ImprovementOpportunity,
    _currentRules: RulesFile,
    analysis: ImprovementAnalysis
  ): string {
    const lines: string[] = [];

    lines.push(`Total traces analyzed: ${analysis.traceCount}`);

    if (analysis.failurePatterns.length > 0) {
      lines.push(`\nFailure patterns found:`);
      for (const pattern of analysis.failurePatterns.slice(0, 3)) {
        lines.push(`- ${pattern.type}: ${pattern.description}`);
      }
    }

    if (analysis.loopPatterns.length > 0) {
      lines.push(`\nLoop patterns found:`);
      for (const pattern of analysis.loopPatterns.slice(0, 3)) {
        lines.push(`- ${pattern.type}: ${pattern.description}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format an improvement for display
   */
  formatImprovement(improvement: RuleImprovement): string {
    const lines: string[] = [];

    lines.push(`Improvement: ${improvement.id}`);
    lines.push('-'.repeat(40));

    if (improvement.originalRule) {
      lines.push(`Original: ${improvement.originalRule.content}`);
      lines.push('');
    }

    lines.push(`Improved: ${improvement.improvedRule.content}`);
    lines.push('');
    lines.push(`Reason: ${improvement.reason}`);
    lines.push(`Confidence: ${(improvement.confidence * 100).toFixed(0)}%`);
    lines.push(`Expected improvement: ${improvement.evidence.tracesImproved} traces`);

    return lines.join('\n');
  }
}

/**
 * Create a rule generator from environment
 */
export function createRuleGenerator(config?: GeneratorConfig): RuleGenerator {
  return new RuleGenerator({
    model: config?.model || process.env.BLACKBOX_IMPROVE_MODEL || 'gpt-4o-mini',
    ...config,
  });
}
