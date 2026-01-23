/**
 * @blackbox/replay - Replay engine for LLM traces
 */

// Export engine
export { ReplayEngine, createReplayEngine } from './engine.js';

// Export Ollama client
export { OllamaClient, createOllamaClient } from './ollama-client.js';

// Export comparison utilities
export {
  summarizeComparison,
  generateDiffReport,
  findMostDifferent,
  findLargestTokenDiff,
  calculateQualityScore,
  areEquivalent,
  type ComparisonSummary,
} from './comparison.js';

// Export types
export type {
  ReplayEngineOptions,
  ReplayRequest,
  ReplayOutput,
  CallComparison,
  OllamaModelInfo,
  OllamaListResponse,
  OllamaChatMessage,
  OllamaChatRequest,
  OllamaChatResponse,
} from './types.js';
