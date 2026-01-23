/**
 * Core types for Blackbox trace capture and replay
 */

import { z } from 'zod';

// =============================================================================
// Message Types
// =============================================================================

export const MessageRoleSchema = z.enum(['system', 'user', 'assistant', 'tool']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const TextContentSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

export const ImageContentSchema = z.object({
  type: z.literal('image_url'),
  image_url: z.object({
    url: z.string(),
    detail: z.enum(['auto', 'low', 'high']).optional(),
  }),
});

export const ContentPartSchema = z.union([TextContentSchema, ImageContentSchema]);
export type ContentPart = z.infer<typeof ContentPartSchema>;

export const MessageContentSchema = z.union([z.string(), z.array(ContentPartSchema)]);
export type MessageContent = z.infer<typeof MessageContentSchema>;

export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: MessageContentSchema.nullable(),
  name: z.string().optional(),
  tool_calls: z.array(ToolCallSchema).optional(),
  tool_call_id: z.string().optional(),
});
export type Message = z.infer<typeof MessageSchema>;

// =============================================================================
// Tool Types
// =============================================================================

export const ToolParameterSchema = z.object({
  type: z.string(),
  description: z.string().optional(),
  enum: z.array(z.string()).optional(),
  items: z.any().optional(),
  properties: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
});

export const ToolDefinitionSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z
      .object({
        type: z.literal('object'),
        properties: z.record(ToolParameterSchema).optional(),
        required: z.array(z.string()).optional(),
      })
      .optional(),
  }),
});
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export const ToolResultSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
  output: z.unknown(),
  error: z.string().optional(),
  duration: z.number().optional(), // ms
});
export type ToolResult = z.infer<typeof ToolResultSchema>;

// =============================================================================
// LLM Call Types
// =============================================================================

export const ModelParametersSchema = z.object({
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  max_tokens: z.number().optional(),
  frequency_penalty: z.number().optional(),
  presence_penalty: z.number().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  seed: z.number().optional(),
});
export type ModelParameters = z.infer<typeof ModelParametersSchema>;

export const UsageSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
});
export type Usage = z.infer<typeof UsageSchema>;

export const LLMCallSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  model: z.string(),
  provider: z.string().optional(),
  parameters: ModelParametersSchema.optional(),
  messages: z.array(MessageSchema),
  tools: z.array(ToolDefinitionSchema).optional(),
  response: z.object({
    content: MessageContentSchema.nullable(),
    toolCalls: z.array(ToolCallSchema).optional(),
    finishReason: z.string().optional(),
  }),
  usage: UsageSchema.optional(),
  latency: z.number(), // ms
  error: z.string().optional(),
});
export type LLMCall = z.infer<typeof LLMCallSchema>;

// =============================================================================
// Trace Types
// =============================================================================

export const TraceMetadataSchema = z.object({
  // Environment info
  repoPath: z.string().optional(),
  gitSha: z.string().optional(),
  gitBranch: z.string().optional(),

  // Runtime info
  nodeVersion: z.string().optional(),
  platform: z.string().optional(),

  // Custom metadata
  tags: z.array(z.string()).optional(),
  custom: z.record(z.unknown()).optional(),
});
export type TraceMetadata = z.infer<typeof TraceMetadataSchema>;

export const TraceSchema = z.object({
  id: z.string(),
  sessionId: z.string().optional(),
  name: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),

  // The captured LLM calls
  calls: z.array(LLMCallSchema),

  // Tool results (for replay)
  toolResults: z.array(ToolResultSchema).optional(),

  // Metadata
  metadata: TraceMetadataSchema.optional(),

  // Outcomes
  outcome: z
    .object({
      success: z.boolean().optional(),
      testsPassed: z.boolean().optional(),
      lintPassed: z.boolean().optional(),
      buildPassed: z.boolean().optional(),
      userRating: z.number().min(1).max(5).optional(),
      error: z.string().optional(),
    })
    .optional(),
});
export type Trace = z.infer<typeof TraceSchema>;

// =============================================================================
// Session Types
// =============================================================================

export const SessionSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  traces: z.array(TraceSchema),
  metadata: TraceMetadataSchema.optional(),
});
export type Session = z.infer<typeof SessionSchema>;

// =============================================================================
// Evaluation Types
// =============================================================================

export const EvaluationScoreSchema = z.object({
  name: z.string(),
  value: z.number(),
  explanation: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type EvaluationScore = z.infer<typeof EvaluationScoreSchema>;

export const EvaluationResultSchema = z.object({
  traceId: z.string(),
  evaluatorName: z.string(),
  scores: z.array(EvaluationScoreSchema),
  timestamp: z.string().datetime(),
});
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

// =============================================================================
// Replay Types
// =============================================================================

export const ReplayModeSchema = z.enum(['exact', 'semi-live', 'live']);
export type ReplayMode = z.infer<typeof ReplayModeSchema>;

export const ReplayResultSchema = z.object({
  originalTraceId: z.string(),
  replayTraceId: z.string(),
  model: z.string(),
  mode: ReplayModeSchema,

  // Comparison metrics
  comparison: z.object({
    semanticSimilarity: z.number().optional(),
    tokenCountDiff: z.number().optional(),
    latencyDiff: z.number().optional(),
    outputMatch: z.boolean().optional(),
  }),

  timestamp: z.string().datetime(),
});
export type ReplayResult = z.infer<typeof ReplayResultSchema>;

// =============================================================================
// Rules/Improvement Types
// =============================================================================

export const RuleSchema = z.object({
  id: z.string(),
  content: z.string(),
  category: z.string().optional(),
  source: z.string().optional(), // e.g., "CLAUDE.md:15"
});
export type Rule = z.infer<typeof RuleSchema>;

export const RuleImprovementSchema = z.object({
  id: z.string(),
  originalRule: RuleSchema.optional(),
  improvedRule: RuleSchema,
  reason: z.string(),
  evidence: z.object({
    tracesImproved: z.number(),
    tracesRegressed: z.number(),
    netScoreDelta: z.number(),
    exampleTraceIds: z.array(z.string()),
  }),
  confidence: z.number().min(0).max(1),
  timestamp: z.string().datetime(),
});
export type RuleImprovement = z.infer<typeof RuleImprovementSchema>;

// =============================================================================
// Loop Detection Types
// =============================================================================

export const LoopPatternSchema = z.object({
  type: z.enum([
    'repeated-tool-call',
    'oscillation',
    'excessive-self-critique',
    'stalled-retrieval',
    'circular-reasoning',
  ]),
  description: z.string(),
  occurrences: z.number(),
  traceIds: z.array(z.string()),
  suggestedFix: z.string().optional(),
});
export type LoopPattern = z.infer<typeof LoopPatternSchema>;

// =============================================================================
// Configuration Types
// =============================================================================

export const BlackboxConfigSchema = z.object({
  // Capture settings
  capture: z
    .object({
      enabled: z.boolean().default(true),
      endpoint: z.string().optional(),
      batchSize: z.number().default(10),
      flushIntervalMs: z.number().default(5000),
    })
    .optional(),

  // Langfuse settings
  langfuse: z
    .object({
      host: z.string(),
      publicKey: z.string(),
      secretKey: z.string(),
    })
    .optional(),

  // LiteLLM settings
  litellm: z
    .object({
      host: z.string(),
      apiKey: z.string().optional(),
    })
    .optional(),

  // Ollama settings
  ollama: z
    .object({
      host: z.string(),
      defaultModel: z.string().default('llama3.2:3b'),
    })
    .optional(),

  // Rules file settings
  rules: z
    .object({
      file: z.string().default('CLAUDE.md'),
      autoImprove: z.boolean().default(false),
    })
    .optional(),

  // GitHub settings
  github: z
    .object({
      token: z.string(),
      owner: z.string(),
      repo: z.string(),
    })
    .optional(),
});
export type BlackboxConfig = z.infer<typeof BlackboxConfigSchema>;
