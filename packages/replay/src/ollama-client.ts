/**
 * Ollama client for local model replay
 */

import { createLogger } from '@blackbox/shared';
import type {
  OllamaListResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaModelInfo,
} from './types.js';

const logger = createLogger('ollama-client');

export interface OllamaClientOptions {
  host?: string;
  debug?: boolean;
}

export class OllamaClient {
  private host: string;
  private debug: boolean;

  constructor(options: OllamaClientOptions = {}) {
    this.host = options.host || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.debug = options.debug ?? false;

    if (this.debug) {
      logger.info(`Ollama client initialized: ${this.host}`);
    }
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModelInfo[]> {
    const response = await fetch(`${this.host}/api/tags`);

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = (await response.json()) as OllamaListResponse;
    return data.models || [];
  }

  /**
   * Check if a specific model is available
   */
  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some((m) => m.name === modelName || m.name.startsWith(`${modelName}:`));
  }

  /**
   * Pull a model (if not already available)
   */
  async pullModel(modelName: string): Promise<void> {
    if (await this.hasModel(modelName)) {
      if (this.debug) {
        logger.info(`Model ${modelName} already available`);
      }
      return;
    }

    logger.info(`Pulling model ${modelName}...`);

    const response = await fetch(`${this.host}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.status}`);
    }

    // Stream the response to wait for completion
    const reader = response.body?.getReader();
    if (reader) {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }

    logger.info(`Model ${modelName} pulled successfully`);
  }

  /**
   * Send a chat completion request
   */
  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    const startTime = Date.now();

    if (this.debug) {
      logger.debug(`Chat request to ${request.model}`);
    }

    const response = await fetch(`${this.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat request failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;

    if (this.debug) {
      const duration = Date.now() - startTime;
      logger.debug(`Chat completed in ${duration}ms`);
    }

    return data;
  }

  /**
   * Send a chat completion using OpenAI-compatible endpoint
   */
  async chatOpenAI(
    model: string,
    messages: Array<{ role: string; content: string }>,
    options?: {
      temperature?: number;
      max_tokens?: number;
      stop?: string[];
    }
  ): Promise<{
    content: string;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  }> {
    const response = await fetch(`${this.host}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature,
        max_tokens: options?.max_tokens,
        stop: options?.stop,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI-compatible chat failed: ${response.status} - ${errorText}`);
    }

    interface OpenAIResponse {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    }

    const data = (await response.json()) as OpenAIResponse;

    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage,
    };
  }

  /**
   * Get the host URL
   */
  getHost(): string {
    return this.host;
  }
}

/**
 * Create an Ollama client from environment variables
 */
export function createOllamaClient(options?: OllamaClientOptions): OllamaClient {
  return new OllamaClient({
    host: options?.host || process.env.OLLAMA_HOST,
    debug: options?.debug ?? process.env.BLACKBOX_LOG_LEVEL === 'debug',
  });
}
