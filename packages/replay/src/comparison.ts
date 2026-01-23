/**
 * Comparison utilities for replay analysis
 */

import { estimateTokens, textSimilarity } from '@blackbox/shared';
import type { CallComparison, ReplayOutput } from './types.js';

export interface ComparisonSummary {
  /**
   * Total number of calls compared
   */
  totalCalls: number;

  /**
   * Average semantic similarity (0-1)
   */
  avgSimilarity: number;

  /**
   * Number of functional matches (high similarity)
   */
  functionalMatches: number;

  /**
   * Match rate (0-1)
   */
  matchRate: number;

  /**
   * Total token difference (positive = replay used more)
   */
  totalTokenDiff: number;

  /**
   * Average token difference per call
   */
  avgTokenDiff: number;

  /**
   * Total latency difference in ms (positive = replay slower)
   */
  totalLatencyDiff: number;

  /**
   * Average latency difference per call
   */
  avgLatencyDiff: number;

  /**
   * Estimated cost savings (if using tokens as proxy)
   */
  costSavingsEstimate: number;
}

/**
 * Generate a summary of replay comparisons
 */
export function summarizeComparison(output: ReplayOutput): ComparisonSummary {
  const { callComparisons } = output;
  const totalCalls = callComparisons.length;

  if (totalCalls === 0) {
    return {
      totalCalls: 0,
      avgSimilarity: 0,
      functionalMatches: 0,
      matchRate: 0,
      totalTokenDiff: 0,
      avgTokenDiff: 0,
      totalLatencyDiff: 0,
      avgLatencyDiff: 0,
      costSavingsEstimate: 0,
    };
  }

  const totalSimilarity = callComparisons.reduce((sum, c) => sum + c.similarity, 0);
  const functionalMatches = callComparisons.filter((c) => c.functionalMatch).length;
  const totalTokenDiff = callComparisons.reduce((sum, c) => sum + c.tokenDiff, 0);
  const totalLatencyDiff = callComparisons.reduce((sum, c) => sum + c.latencyDiff, 0);

  // Estimate cost savings: assume $0.01 per 1K tokens for cloud vs ~$0 for local
  const originalTokens = callComparisons.reduce((sum, c) => {
    return sum + estimateTokens(c.originalContent || '');
  }, 0);
  const costSavingsEstimate = (originalTokens / 1000) * 0.01;

  return {
    totalCalls,
    avgSimilarity: totalSimilarity / totalCalls,
    functionalMatches,
    matchRate: functionalMatches / totalCalls,
    totalTokenDiff,
    avgTokenDiff: totalTokenDiff / totalCalls,
    totalLatencyDiff,
    avgLatencyDiff: totalLatencyDiff / totalCalls,
    costSavingsEstimate,
  };
}

/**
 * Generate a diff report between original and replay
 */
export function generateDiffReport(comparison: CallComparison): string {
  const lines: string[] = [];

  lines.push(`Call Comparison: ${comparison.originalCallId} vs ${comparison.replayCallId}`);
  lines.push('-'.repeat(60));

  lines.push(`Similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
  lines.push(`Functional Match: ${comparison.functionalMatch ? 'Yes' : 'No'}`);
  lines.push(`Token Diff: ${comparison.tokenDiff > 0 ? '+' : ''}${comparison.tokenDiff}`);
  lines.push(`Latency Diff: ${comparison.latencyDiff > 0 ? '+' : ''}${comparison.latencyDiff}ms`);

  lines.push('');
  lines.push('Original:');
  lines.push(comparison.originalContent || '(empty)');

  lines.push('');
  lines.push('Replay:');
  lines.push(comparison.replayContent || '(empty)');

  return lines.join('\n');
}

/**
 * Find the most different responses
 */
export function findMostDifferent(comparisons: CallComparison[], limit = 5): CallComparison[] {
  return [...comparisons].sort((a, b) => a.similarity - b.similarity).slice(0, limit);
}

/**
 * Find responses with largest token differences
 */
export function findLargestTokenDiff(comparisons: CallComparison[], limit = 5): CallComparison[] {
  return [...comparisons]
    .sort((a, b) => Math.abs(b.tokenDiff) - Math.abs(a.tokenDiff))
    .slice(0, limit);
}

/**
 * Calculate quality score for a replay batch
 */
export function calculateQualityScore(summaries: ComparisonSummary[]): number {
  if (summaries.length === 0) {
    return 0;
  }

  // Weighted score based on:
  // - 60% similarity
  // - 30% match rate
  // - 10% latency improvement (capped)
  const avgSimilarity = summaries.reduce((sum, s) => sum + s.avgSimilarity, 0) / summaries.length;
  const avgMatchRate = summaries.reduce((sum, s) => sum + s.matchRate, 0) / summaries.length;

  // Latency score: positive if replay is faster
  const avgLatencyDiff = summaries.reduce((sum, s) => sum + s.avgLatencyDiff, 0) / summaries.length;
  const latencyScore = Math.max(0, Math.min(1, 1 - avgLatencyDiff / 1000)); // Cap at 1s improvement

  return avgSimilarity * 0.6 + avgMatchRate * 0.3 + latencyScore * 0.1;
}

/**
 * Check if two texts are semantically equivalent
 * Uses a higher threshold than basic similarity
 */
export function areEquivalent(text1: string | null, text2: string | null): boolean {
  if (text1 === null && text2 === null) {
    return true;
  }
  if (text1 === null || text2 === null) {
    return false;
  }
  if (text1 === text2) {
    return true;
  }

  // Normalize and compare
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

  const norm1 = normalize(text1);
  const norm2 = normalize(text2);

  if (norm1 === norm2) {
    return true;
  }

  // Check semantic similarity
  return textSimilarity(text1, text2) > 0.9;
}
