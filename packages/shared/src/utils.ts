/**
 * Utility functions for Blackbox
 */

import { randomUUID } from 'node:crypto';

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generate a unique trace ID
 */
export function generateTraceId(): string {
  return `trace_${randomUUID().replace(/-/g, '')}`;
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${randomUUID().replace(/-/g, '')}`;
}

/**
 * Generate a unique call ID
 */
export function generateCallId(): string {
  return `call_${randomUUID().replace(/-/g, '')}`;
}

// =============================================================================
// Time Utilities
// =============================================================================

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Calculate duration between two timestamps in milliseconds
 */
export function durationMs(start: string, end: string): number {
  return new Date(end).getTime() - new Date(start).getTime();
}

/**
 * Format milliseconds as human-readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// =============================================================================
// Token Estimation
// =============================================================================

/**
 * Rough estimate of tokens in a string (for estimation only)
 * Uses ~4 characters per token as a rough heuristic
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens in messages array
 */
export function estimateMessageTokens(
  messages: Array<{ role: string; content: string | null }>
): number {
  return messages.reduce((sum, msg) => {
    const content = msg.content || '';
    // Add overhead for role tokens
    return sum + estimateTokens(content) + 4;
  }, 0);
}

// =============================================================================
// Semantic Similarity (Simple)
// =============================================================================

/**
 * Calculate simple text similarity using Jaccard index
 * For more accurate results, use embeddings
 */
export function textSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(Boolean));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(Boolean));

  if (words1.size === 0 && words2.size === 0) {
    return 1;
  }
  if (words1.size === 0 || words2.size === 0) {
    return 0;
  }

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

// =============================================================================
// JSON Utilities
// =============================================================================

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Pretty print JSON
 */
export function prettyJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength - 3)}...`;
}

// =============================================================================
// Environment Utilities
// =============================================================================

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, fallback = ''): string {
  return process.env[key] || fallback;
}

/**
 * Get required environment variable (throws if not set)
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

// =============================================================================
// Async Utilities
// =============================================================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30_000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        break;
      }

      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

// =============================================================================
// Batch Processing
// =============================================================================

/**
 * Process items in batches
 */
export async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Process items in parallel with concurrency limit
 */
export async function processParallel<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const promise = processor(items[i]).then((result) => {
      results[i] = result;
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      executing.splice(executing.indexOf(promise), 1);
    }
  }

  await Promise.all(executing);
  return results;
}
