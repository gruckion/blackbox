# Blackbox

**Nightly CI for Coding Agents** - Capture, replay, evaluate, and automatically improve your AI coding assistant rules.

## Overview

Blackbox helps you improve your AI coding assistant by:

1. **Capturing** real LLM calls during development
2. **Replaying** them against local models overnight
3. **Evaluating** quality, detecting loops and issues
4. **Improving** rules automatically with regression gating
5. **Shipping** changes as GitHub PRs

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose
- Ollama (for local model replay)

### Installation

```bash
# Clone and install
git clone https://github.com/yourorg/blackbox.git
cd blackbox
pnpm install
pnpm build

# Start infrastructure
docker compose up -d

# Pull a local model
ollama pull llama3.2:3b

# Check services
npx blackbox status
```

### Basic Usage

```bash
# 1. Capture traces (integrate SDK into your agent)
# See "Capture SDK" section below

# 2. Replay against local model
npx blackbox replay -i ./traces -m llama3.2:3b

# 3. Evaluate traces
npx blackbox evaluate -i ./traces

# 4. Generate improvements
npx blackbox improve -t ./traces -e ./eval-results -r ./CLAUDE.md

# 5. Run full pipeline
npx blackbox run -i ./traces --create-pr
```

## Packages

| Package | Description |
|---------|-------------|
| `@blackbox/shared` | Core types and utilities |
| `@blackbox/capture` | OpenAI SDK wrapper for trace capture |
| `@blackbox/replay` | Replay engine for local model testing |
| `@blackbox/evaluate` | Evaluation framework with Phoenix integration |
| `@blackbox/improve` | Rules analysis and improvement generation |
| `@blackbox/pr-generator` | Git/GitHub PR automation |
| `@blackbox/cli` | Command-line interface |

## Capture SDK

Integrate capture into your coding agent:

```typescript
import { createCaptureClient } from '@blackbox/capture';

// Create a capture-enabled OpenAI client
const client = createCaptureClient(
  { apiKey: process.env.OPENAI_API_KEY },
  {
    langfuse: {
      host: 'http://localhost:3000',
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
    },
  }
);

// Use like regular OpenAI SDK - calls are automatically captured
const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Help me fix this bug' }],
  tools: myTools,
});
```

## CLI Commands

### `blackbox capture`
Set up trace capture for your application.

### `blackbox replay`
Replay captured traces against local models.

```bash
blackbox replay \
  -i ./traces \
  -o ./replay-results \
  -m llama3.2:3b \
  --mode semi-live
```

### `blackbox evaluate`
Evaluate traces for quality and issues.

```bash
blackbox evaluate \
  -i ./traces \
  -o ./eval-results \
  --loop-detection
```

### `blackbox improve`
Generate rule improvements from analysis.

```bash
blackbox improve \
  -t ./traces \
  -e ./eval-results \
  -r ./CLAUDE.md \
  --model gpt-4o-mini
```

### `blackbox run`
Run the full pipeline.

```bash
blackbox run \
  -i ./traces \
  -r ./CLAUDE.md \
  --create-pr \
  --github-token $GITHUB_TOKEN \
  --github-owner yourorg \
  --github-repo yourrepo
```

### `blackbox status`
Check health of all services.

## Infrastructure

Blackbox uses these services (via Docker Compose):

- **Langfuse** - LLM observability and tracing
- **Phoenix** - ML evaluation platform
- **LiteLLM** - AI gateway for model routing
- **Ollama** - Local model serving
- **PostgreSQL** - Database for Langfuse
- **ClickHouse** - Analytics for Langfuse
- **Redis** - Caching
- **MinIO** - Object storage

Start all services:
```bash
docker compose up -d
```

## Evaluation

Blackbox includes several evaluators:

### Loop Detection
Identifies stuck patterns:
- Repeated tool calls with same arguments
- Oscillation between states
- Stalled retrieval attempts
- Circular reasoning

### Tool Efficiency
Measures tool usage effectiveness:
- Success rate
- Redundant calls
- Error recovery

### LLM Judge (optional)
Uses an LLM to evaluate response quality.

## Rules Improvement

The improvement engine:

1. **Analyzes** traces to find failure patterns
2. **Identifies** loop patterns and rule violations
3. **Generates** improvement opportunities
4. **Creates** new or modified rules using LLM
5. **Validates** improvements don't cause regressions
6. **Ships** changes as reviewed PRs

## Configuration

Create a `.env` file:

```env
# OpenAI (for capture and improvement generation)
OPENAI_API_KEY=sk-...

# Langfuse (for tracing)
LANGFUSE_HOST=http://localhost:3000
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...

# GitHub (for PR creation)
GITHUB_TOKEN=ghp_...

# Model settings
BLACKBOX_REPLAY_MODEL=llama3.2:3b
BLACKBOX_IMPROVE_MODEL=gpt-4o-mini
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run integration tests
pnpm test:integration

# Type check
pnpm typecheck

# Development mode (watch)
pnpm dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Blackbox CLI                          │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│   Capture   │   Replay    │  Evaluate   │    Improve      │
│     SDK     │   Engine    │  Pipeline   │   Generator     │
├─────────────┴─────────────┴─────────────┴─────────────────┤
│                    Shared Types & Utils                     │
├─────────────────────────────────────────────────────────────┤
│   Langfuse   │   Phoenix   │   LiteLLM   │    Ollama      │
│  (Tracing)   │(Evaluation) │  (Gateway)  │ (Local Models) │
└─────────────────────────────────────────────────────────────┘
```

## License

MIT
