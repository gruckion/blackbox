/**
 * Types for the replay engine
 */

import type { ReplayMode, ReplayResult, Trace } from '@blackbox/shared';

export interface ReplayEngineOptions {
  /**
   * Ollama host URL
   */
  ollamaHost?: string;

  /**
   * Default model to use for replay
   */
  defaultModel?: string;

  /**
   * Default replay mode
   */
  defaultMode?: ReplayMode;

  /**
   * Whether to enable debug logging
   */
  debug?: boolean;

  /**
   * Timeout for each replay in milliseconds
   */
  timeoutMs?: number;
}

export interface ReplayRequest {
  /**
   * The trace to replay
   */
  trace: Trace;

  /**
   * Model to use for replay (defaults to defaultModel)
   */
  model?: string;

  /**
   * Replay mode (defaults to defaultMode)
   */
  mode?: ReplayMode;

  /**
   * Custom tool outputs for exact mode
   */
  toolOutputs?: Map<string, unknown>;
}

export interface ReplayOutput {
  /**
   * The replay result
   */
  result: ReplayResult;

  /**
   * The replayed trace with new outputs
   */
  replayedTrace: Trace;

  /**
   * Detailed comparison for each call
   */
  callComparisons: CallComparison[];
}

export interface CallComparison {
  /**
   * Original call ID
   */
  originalCallId: string;

  /**
   * Replay call ID
   */
  replayCallId: string;

  /**
   * Original response content
   */
  originalContent: string | null;

  /**
   * Replay response content
   */
  replayContent: string | null;

  /**
   * Semantic similarity (0-1)
   */
  similarity: number;

  /**
   * Token count difference
   */
  tokenDiff: number;

  /**
   * Latency difference in ms
   */
  latencyDiff: number;

  /**
   * Whether the responses are functionally equivalent
   */
  functionalMatch: boolean;
}

export interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaListResponse {
  models: OllamaModelInfo[];
}

export interface OllamaChatMessage {
  role: string;
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}
