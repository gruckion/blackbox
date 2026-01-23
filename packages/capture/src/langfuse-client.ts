/**
 * Langfuse client wrapper for Blackbox
 */

import { createLogger } from '@blackbox/shared';
import { Langfuse } from 'langfuse';
import type { CapturedCall } from './types.js';

const logger = createLogger('langfuse-client');

export interface LangfuseClientOptions {
  host: string;
  publicKey: string;
  secretKey: string;
  debug?: boolean;
}

export class LangfuseClient {
  private readonly client: Langfuse;
  private readonly options: LangfuseClientOptions;

  constructor(options: LangfuseClientOptions) {
    this.options = options;
    this.client = new Langfuse({
      publicKey: options.publicKey,
      secretKey: options.secretKey,
      baseUrl: options.host,
    });

    if (options.debug) {
      logger.info(`Initialized Langfuse client: ${options.host}`);
    }
  }

  /**
   * Send a captured call as a trace to Langfuse
   */
  sendCall(call: CapturedCall, sessionId?: string): string {
    const trace = this.client.trace({
      id: call.id,
      name: `llm-call-${call.model}`,
      sessionId,
      userId: call.sessionId,
      metadata: {
        provider: call.provider,
        parameters: call.parameters,
      },
      tags: ['blackbox', 'captured'],
    });

    // Add the generation (LLM call)
    trace.generation({
      name: 'llm-generation',
      model: call.model,
      modelParameters: call.parameters,
      input: call.messages,
      output: call.response,
      usage: call.usage
        ? {
            input: call.usage.promptTokens,
            output: call.usage.completionTokens,
            total: call.usage.totalTokens,
          }
        : undefined,
      startTime: new Date(call.timestamp),
      endTime: new Date(new Date(call.timestamp).getTime() + call.latency),
    });

    if (this.options.debug) {
      logger.debug(`Sent trace: ${call.id}`);
    }

    return trace.id;
  }

  /**
   * Send multiple calls as a session
   */
  async sendSession(
    sessionId: string,
    calls: CapturedCall[],
    _metadata?: Record<string, unknown>
  ): Promise<void> {
    for (const call of calls) {
      await this.sendCall(call, sessionId);
    }

    if (this.options.debug) {
      logger.info(`Sent session ${sessionId} with ${calls.length} calls`);
    }
  }

  /**
   * Flush all pending events
   */
  async flush(): Promise<void> {
    await this.client.flushAsync();
  }

  /**
   * Shutdown the client
   */
  async shutdown(): Promise<void> {
    await this.client.shutdownAsync();
  }

  /**
   * Get the underlying Langfuse client
   */
  getClient(): Langfuse {
    return this.client;
  }
}

/**
 * Create a Langfuse client from environment variables
 */
export function createLangfuseClientFromEnv(): LangfuseClient | null {
  const host = process.env.LANGFUSE_HOST;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;

  if (!(host && publicKey && secretKey)) {
    logger.warn('Langfuse credentials not configured');
    return null;
  }

  return new LangfuseClient({
    host,
    publicKey,
    secretKey,
    debug: process.env.BLACKBOX_LOG_LEVEL === 'debug',
  });
}
