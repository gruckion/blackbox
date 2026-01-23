/**
 * @blackbox/capture - SDK for capturing LLM calls
 */

// Export Langfuse client
export { createLangfuseClientFromEnv, LangfuseClient } from './langfuse-client.js';
// Export main SDK
export { createCaptureClient, createCaptureClientFromEnv } from './sdk.js';

// Export types
export type {
  CaptureCallback,
  CaptureClient,
  CaptureClientOptions,
  CapturedCall,
  CaptureSession,
  CaptureStats,
} from './types.js';
