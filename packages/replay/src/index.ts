/**
 * @blackbox/replay - Replay engine for LLM traces
 */

// Export comparison utilities
export {
  areEquivalent,
  type ComparisonSummary,
  calculateQualityScore,
  findLargestTokenDiff,
  findMostDifferent,
  generateDiffReport,
  summarizeComparison,
} from "./comparison.js";
// Export engine
export { createReplayEngine, ReplayEngine } from "./engine.js";
// Export Ollama client
export { createOllamaClient, OllamaClient } from "./ollama-client.js";

// Export types
export type {
  CallComparison,
  OllamaChatMessage,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaListResponse,
  OllamaModelInfo,
  ReplayEngineOptions,
  ReplayOutput,
  ReplayRequest,
} from "./types.js";
