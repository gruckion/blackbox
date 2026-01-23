/**
 * Capture SDK - Wraps OpenAI client to capture all LLM calls
 */

import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import {
  generateCallId,
  generateSessionId,
  generateTraceId,
  now,
  createLogger,
  type Trace,
  type Message,
  type ToolCall,
  type Usage,
} from '@blackbox/shared';
import type {
  CaptureClientOptions,
  CapturedCall,
  CaptureSession,
  CaptureStats,
  CaptureCallback,
  CaptureClient,
} from './types.js';
import { LangfuseClient, createLangfuseClientFromEnv } from './langfuse-client.js';

const logger = createLogger('capture-sdk');

/**
 * Create a capture-enabled OpenAI client
 */
export function createCaptureClient(
  openaiOptions: ConstructorParameters<typeof OpenAI>[0] = {},
  captureOptions: CaptureClientOptions = {}
): OpenAI & CaptureClient {
  // Create the base OpenAI client
  const baseClient = new OpenAI(openaiOptions);

  // Capture state
  let currentSessionId = captureOptions.sessionId;
  const sessions: Map<string, CaptureSession> = new Map();
  const callbacks: CaptureCallback[] = [];
  let stats: CaptureStats = {
    totalCalls: 0,
    totalTokens: 0,
    totalLatencyMs: 0,
    errorCount: 0,
    sessionCount: 0,
  };

  // Langfuse client (optional)
  const langfuseClient = captureOptions.langfuse
    ? new LangfuseClient(captureOptions.langfuse)
    : createLangfuseClientFromEnv();

  // Pending calls to flush
  const pendingCalls: CapturedCall[] = [];
  let flushTimer: NodeJS.Timeout | null = null;

  // Helper to convert OpenAI messages to our format
  function convertMessages(
    messages: ChatCompletionCreateParamsNonStreaming['messages']
  ): Message[] {
    return messages.map((msg) => {
      const base: Message = {
        role: msg.role as Message['role'],
        content: typeof msg.content === 'string' ? msg.content : null,
      };

      if ('name' in msg && msg.name) {
        base.name = msg.name;
      }

      if ('tool_calls' in msg && msg.tool_calls) {
        base.tool_calls = msg.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }));
      }

      if ('tool_call_id' in msg && msg.tool_call_id) {
        base.tool_call_id = msg.tool_call_id;
      }

      return base;
    });
  }

  // Helper to extract usage from response
  function extractUsage(
    usage: OpenAI.Completions.CompletionUsage | undefined
  ): Usage | undefined {
    if (!usage) return undefined;
    return {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    };
  }

  // Helper to extract tool calls from response
  function extractToolCalls(
    choice: OpenAI.Chat.Completions.ChatCompletion.Choice
  ): ToolCall[] | undefined {
    if (!choice.message.tool_calls) return undefined;
    return choice.message.tool_calls.map((tc) => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));
  }

  // Schedule flush
  function scheduleFlush() {
    if (flushTimer) return;
    const interval = captureOptions.flushIntervalMs || 5000;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flushPending();
    }, interval);
  }

  // Flush pending calls
  async function flushPending() {
    if (pendingCalls.length === 0) return;

    const toFlush = [...pendingCalls];
    pendingCalls.length = 0;

    if (langfuseClient) {
      for (const call of toFlush) {
        try {
          await langfuseClient.sendCall(call, currentSessionId);
        } catch (error) {
          logger.error(`Failed to send call to Langfuse: ${error}`);
          stats.errorCount++;
        }
      }
      await langfuseClient.flush();
    }
  }

  // Record a captured call
  async function recordCall(call: CapturedCall) {
    // Update stats
    stats.totalCalls++;
    stats.totalLatencyMs += call.latency;
    if (call.usage) {
      stats.totalTokens += call.usage.totalTokens;
    }
    if (call.error) {
      stats.errorCount++;
    }

    // Add to current session if exists
    if (currentSessionId && sessions.has(currentSessionId)) {
      sessions.get(currentSessionId)!.calls.push(call);
    }

    // Add to pending
    pendingCalls.push(call);

    // Call callbacks
    for (const callback of callbacks) {
      try {
        await callback(call);
      } catch (error) {
        logger.error(`Callback error: ${error}`);
      }
    }

    // Schedule flush if batch size reached
    const batchSize = captureOptions.batchSize || 10;
    if (pendingCalls.length >= batchSize) {
      await flushPending();
    } else {
      scheduleFlush();
    }
  }

  // Wrap chat.completions.create
  const originalCreate = baseClient.chat.completions.create.bind(baseClient.chat.completions);

  // Override with capturing version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (baseClient.chat.completions as any).create = async function (
    params: ChatCompletionCreateParamsNonStreaming
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const callId = generateCallId();
    const startTime = now();
    const startMs = Date.now();

    let response: OpenAI.Chat.Completions.ChatCompletion | undefined;
    let error: string | undefined;

    try {
      response = await originalCreate(params);
      return response;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const endMs = Date.now();
      const latency = endMs - startMs;

      // Convert tools to our format
      const tools = params.tools?.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.function.name,
          description: t.function.description,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parameters: t.function.parameters as any,
        },
      }));

      const captured: CapturedCall = {
        id: callId,
        timestamp: startTime,
        model: params.model,
        provider: 'openai',
        parameters: {
          temperature: params.temperature ?? undefined,
          top_p: params.top_p ?? undefined,
          max_tokens: params.max_tokens ?? undefined,
          frequency_penalty: params.frequency_penalty ?? undefined,
          presence_penalty: params.presence_penalty ?? undefined,
          stop: params.stop ?? undefined,
          seed: params.seed ?? undefined,
        },
        messages: convertMessages(params.messages),
        tools,
        response: {
          content: response?.choices?.[0]?.message?.content ?? null,
          toolCalls: response?.choices?.[0] ? extractToolCalls(response.choices[0]) : undefined,
          finishReason: response?.choices?.[0]?.finish_reason,
        },
        usage: extractUsage(response?.usage),
        latency,
        error,
        sessionId: currentSessionId,
      };

      // Don't await - let it happen in background
      recordCall(captured).catch((e) => logger.error(`Record call failed: ${e}`));
    }
  };

  // CaptureClient methods
  const captureClient: CaptureClient = {
    startSession(name?: string): string {
      const id = generateSessionId();
      sessions.set(id, {
        id,
        name,
        startTime: now(),
        calls: [],
        metadata: captureOptions.metadata,
      });
      currentSessionId = id;
      stats.sessionCount++;

      if (captureOptions.debug) {
        logger.info(`Started session: ${id}`);
      }

      return id;
    },

    endSession(): CaptureSession | undefined {
      if (!currentSessionId) return undefined;

      const session = sessions.get(currentSessionId);
      currentSessionId = undefined;

      if (captureOptions.debug && session) {
        logger.info(`Ended session: ${session.id} with ${session.calls.length} calls`);
      }

      return session;
    },

    getSessionId(): string | undefined {
      return currentSessionId;
    },

    onCapture(callback: CaptureCallback): void {
      callbacks.push(callback);
    },

    getStats(): CaptureStats {
      return { ...stats };
    },

    async flush(): Promise<void> {
      await flushPending();
    },

    export(): Trace[] {
      const traces: Trace[] = [];

      for (const session of sessions.values()) {
        traces.push({
          id: generateTraceId(),
          sessionId: session.id,
          name: session.name,
          startTime: session.startTime,
          endTime: now(),
          calls: session.calls,
          metadata: session.metadata,
        });
      }

      return traces;
    },

    clear(): void {
      sessions.clear();
      pendingCalls.length = 0;
      stats = {
        totalCalls: 0,
        totalTokens: 0,
        totalLatencyMs: 0,
        errorCount: 0,
        sessionCount: 0,
      };
    },
  };

  // Auto-flush on exit
  if (captureOptions.autoFlush !== false) {
    process.on('beforeExit', async () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
      }
      await flushPending();
    });
  }

  // Return combined client
  return Object.assign(baseClient, captureClient);
}

/**
 * Convenience function to create a capture client from environment
 */
export function createCaptureClientFromEnv(
  options: CaptureClientOptions = {}
): OpenAI & CaptureClient {
  const openaiOptions: ConstructorParameters<typeof OpenAI>[0] = {};

  // Use LiteLLM if configured
  const litellmHost = process.env.LITELLM_HOST;
  if (litellmHost) {
    openaiOptions.baseURL = `${litellmHost}/v1`;
    openaiOptions.apiKey = process.env.LITELLM_MASTER_KEY || 'dummy';
  }

  // Langfuse config from env
  if (!options.langfuse) {
    const host = process.env.LANGFUSE_HOST;
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;

    if (host && publicKey && secretKey) {
      options.langfuse = { host, publicKey, secretKey };
    }
  }

  return createCaptureClient(openaiOptions, options);
}
