/**
 * Types specific to the capture package
 */

import type { Trace, TraceMetadata, LLMCall } from '@blackbox/shared';

export interface CaptureClientOptions {
  /**
   * Langfuse configuration for sending traces
   */
  langfuse?: {
    host: string;
    publicKey: string;
    secretKey: string;
  };

  /**
   * Session ID to group traces
   */
  sessionId?: string;

  /**
   * Trace metadata to attach to all captures
   */
  metadata?: TraceMetadata;

  /**
   * Whether to automatically flush on process exit
   */
  autoFlush?: boolean;

  /**
   * Batch size for flushing traces
   */
  batchSize?: number;

  /**
   * Flush interval in milliseconds
   */
  flushIntervalMs?: number;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

export interface CapturedCall extends LLMCall {
  /**
   * Session this call belongs to
   */
  sessionId?: string;

  /**
   * Parent trace ID if nested
   */
  parentTraceId?: string;
}

export interface CaptureSession {
  id: string;
  name?: string;
  startTime: string;
  calls: CapturedCall[];
  metadata?: TraceMetadata;
}

export interface CaptureStats {
  totalCalls: number;
  totalTokens: number;
  totalLatencyMs: number;
  errorCount: number;
  sessionCount: number;
}

export type CaptureCallback = (call: CapturedCall) => void | Promise<void>;

export interface CaptureClient {
  /**
   * Start a new capture session
   */
  startSession(name?: string): string;

  /**
   * End the current session
   */
  endSession(): CaptureSession | undefined;

  /**
   * Get the current session ID
   */
  getSessionId(): string | undefined;

  /**
   * Add a callback to be called on each capture
   */
  onCapture(callback: CaptureCallback): void;

  /**
   * Get capture statistics
   */
  getStats(): CaptureStats;

  /**
   * Flush pending captures to Langfuse
   */
  flush(): Promise<void>;

  /**
   * Export all captured traces
   */
  export(): Trace[];

  /**
   * Clear all captured data
   */
  clear(): void;
}
