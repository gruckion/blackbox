/**
 * Replay Engine - Replays captured traces against local models
 */

import {
  createLogger,
  estimateTokens,
  generateCallId,
  generateTraceId,
  type LLMCall,
  type Message,
  now,
  type ReplayMode,
  type Trace,
  textSimilarity,
} from '@blackbox/shared';
import { createOllamaClient, type OllamaClient } from './ollama-client.js';
import type { CallComparison, ReplayEngineOptions, ReplayOutput, ReplayRequest } from './types.js';

const logger = createLogger('replay-engine');

export class ReplayEngine {
  private readonly ollama: OllamaClient;
  private readonly defaultModel: string;
  private readonly defaultMode: ReplayMode;
  private readonly debug: boolean;
  readonly timeoutMs: number;

  constructor(options: ReplayEngineOptions = {}) {
    this.ollama = createOllamaClient({
      host: options.ollamaHost,
      debug: options.debug,
    });
    this.defaultModel = options.defaultModel || process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2:3b';
    this.defaultMode = options.defaultMode || 'exact';
    this.debug = options.debug ?? false;
    this.timeoutMs = options.timeoutMs || 120_000; // 2 minutes default

    if (this.debug) {
      logger.info(
        `Replay engine initialized: model=${this.defaultModel}, mode=${this.defaultMode}`
      );
    }
  }

  /**
   * Check if the replay engine is ready
   */
  async isReady(): Promise<boolean> {
    const available = await this.ollama.isAvailable();
    if (!available) {
      logger.warn('Ollama is not available');
      return false;
    }

    const hasModel = await this.ollama.hasModel(this.defaultModel);
    if (!hasModel) {
      logger.warn(`Default model ${this.defaultModel} is not available`);
      return false;
    }

    return true;
  }

  /**
   * Replay a single trace
   */
  async replay(request: ReplayRequest): Promise<ReplayOutput> {
    const { trace, model = this.defaultModel, mode = this.defaultMode, toolOutputs } = request;

    if (this.debug) {
      logger.info(`Replaying trace ${trace.id} with model ${model} in ${mode} mode`);
    }

    const replayTraceId = generateTraceId();
    const startTime = now();
    const replayedCalls: LLMCall[] = [];
    const callComparisons: CallComparison[] = [];

    // Process each call in the trace
    for (const originalCall of trace.calls) {
      const replayedCall = await this.replayCall(originalCall, model, mode, toolOutputs);
      replayedCalls.push(replayedCall);

      // Compare original and replayed
      const comparison = this.compareCall(originalCall, replayedCall);
      callComparisons.push(comparison);
    }

    // Calculate aggregate metrics
    const avgSimilarity =
      callComparisons.reduce((sum, c) => sum + c.similarity, 0) / callComparisons.length || 0;
    const totalTokenDiff = callComparisons.reduce((sum, c) => sum + c.tokenDiff, 0);
    const totalLatencyDiff = callComparisons.reduce((sum, c) => sum + c.latencyDiff, 0);
    const allMatch = callComparisons.every((c) => c.functionalMatch);

    const replayedTrace: Trace = {
      id: replayTraceId,
      sessionId: trace.sessionId,
      name: `replay-${trace.name || trace.id}`,
      startTime,
      endTime: now(),
      calls: replayedCalls,
      metadata: {
        ...trace.metadata,
        custom: {
          ...trace.metadata?.custom,
          originalTraceId: trace.id,
          replayModel: model,
          replayMode: mode,
        },
      },
    };

    return {
      result: {
        originalTraceId: trace.id,
        replayTraceId,
        model,
        mode,
        comparison: {
          semanticSimilarity: avgSimilarity,
          tokenCountDiff: totalTokenDiff,
          latencyDiff: totalLatencyDiff,
          outputMatch: allMatch,
        },
        timestamp: now(),
      },
      replayedTrace,
      callComparisons,
    };
  }

  /**
   * Replay a single LLM call
   */
  private async replayCall(
    originalCall: LLMCall,
    model: string,
    mode: ReplayMode,
    toolOutputs?: Map<string, unknown>
  ): Promise<LLMCall> {
    const callId = generateCallId();
    const startTime = now();
    const startMs = Date.now();

    // Convert messages for Ollama
    const messages = this.prepareMessages(originalCall.messages, mode, toolOutputs);

    try {
      const response = await this.ollama.chatOpenAI(model, messages, {
        temperature: originalCall.parameters?.temperature,
        max_tokens: originalCall.parameters?.max_tokens,
        stop:
          typeof originalCall.parameters?.stop === 'string'
            ? [originalCall.parameters.stop]
            : originalCall.parameters?.stop,
      });

      const latency = Date.now() - startMs;

      return {
        id: callId,
        timestamp: startTime,
        model,
        provider: 'ollama',
        parameters: originalCall.parameters,
        messages: originalCall.messages,
        tools: originalCall.tools,
        response: {
          content: response.content,
          finishReason: 'stop',
        },
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startMs;
      const errorMsg = error instanceof Error ? error.message : String(error);

      logger.error(`Replay call failed: ${errorMsg}`);

      return {
        id: callId,
        timestamp: startTime,
        model,
        provider: 'ollama',
        parameters: originalCall.parameters,
        messages: originalCall.messages,
        tools: originalCall.tools,
        response: {
          content: null,
          finishReason: 'error',
        },
        latency,
        error: errorMsg,
      };
    }
  }

  /**
   * Prepare messages for replay
   */
  private prepareMessages(
    messages: Message[],
    mode: ReplayMode,
    toolOutputs?: Map<string, unknown>
  ): Array<{ role: string; content: string }> {
    return messages
      .map((msg) => {
        // For exact mode, replace tool outputs with captured values
        if (mode === 'exact' && msg.role === 'tool' && msg.tool_call_id && toolOutputs) {
          const output = toolOutputs.get(msg.tool_call_id);
          if (output) {
            return {
              role: msg.role,
              content: JSON.stringify(output),
            };
          }
        }

        // Convert content to string
        let content: string;
        if (msg.content === null) {
          content = '';
        } else if (typeof msg.content === 'string') {
          content = msg.content;
        } else {
          // Handle array content (text + images)
          content = msg.content
            .filter((part) => part.type === 'text')
            .map((part) => ('text' in part ? part.text : ''))
            .join('\n');
        }

        return {
          role: msg.role,
          content,
        };
      })
      .filter((msg) => msg.content.length > 0);
  }

  /**
   * Compare original and replayed calls
   */
  private compareCall(original: LLMCall, replayed: LLMCall): CallComparison {
    const originalContent =
      typeof original.response.content === 'string' ? original.response.content : null;
    const replayContent =
      typeof replayed.response.content === 'string' ? replayed.response.content : null;

    // Calculate similarity
    const similarity =
      originalContent && replayContent ? textSimilarity(originalContent, replayContent) : 0;

    // Calculate token difference
    const originalTokens = original.usage?.totalTokens || estimateTokens(originalContent || '');
    const replayTokens = replayed.usage?.totalTokens || estimateTokens(replayContent || '');
    const tokenDiff = replayTokens - originalTokens;

    // Calculate latency difference
    const latencyDiff = replayed.latency - original.latency;

    // Determine functional match (high similarity threshold)
    const functionalMatch = similarity > 0.8 || originalContent === replayContent;

    return {
      originalCallId: original.id,
      replayCallId: replayed.id,
      originalContent,
      replayContent,
      similarity,
      tokenDiff,
      latencyDiff,
      functionalMatch,
    };
  }

  /**
   * Replay multiple traces
   */
  async replayBatch(
    traces: Trace[],
    options?: {
      model?: string;
      mode?: ReplayMode;
      concurrency?: number;
    }
  ): Promise<ReplayOutput[]> {
    const results: ReplayOutput[] = [];
    const concurrency = options?.concurrency || 1;

    // Process in batches for concurrency control
    for (let i = 0; i < traces.length; i += concurrency) {
      const batch = traces.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((trace) =>
          this.replay({
            trace,
            model: options?.model,
            mode: options?.mode,
          })
        )
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    const models = await this.ollama.listModels();
    return models.map((m) => m.name);
  }

  /**
   * Get the Ollama client
   */
  getOllamaClient(): OllamaClient {
    return this.ollama;
  }
}

/**
 * Create a replay engine from environment variables
 */
export function createReplayEngine(options?: ReplayEngineOptions): ReplayEngine {
  return new ReplayEngine({
    ollamaHost: options?.ollamaHost || process.env.OLLAMA_HOST,
    defaultModel: options?.defaultModel || process.env.OLLAMA_DEFAULT_MODEL,
    debug: options?.debug ?? process.env.BLACKBOX_LOG_LEVEL === 'debug',
    ...options,
  });
}
