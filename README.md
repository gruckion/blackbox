![Blackbox - Nightly CI for Coding Agents](assets/banner.jpeg)

# Blackbox

**Nightly CI for Coding Agents** — Capture, replay, evaluate, and automatically improve your AI coding assistant rules.

## Overview

Blackbox helps you improve your AI coding assistant by:

1. **Capturing** real LLM calls during development
2. **Replaying** them against local models overnight
3. **Evaluating** quality, detecting loops and issues
4. **Improving** rules automatically with regression gating
5. **Shipping** changes as GitHub PRs

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) 1.0+
- Docker & Docker Compose
- Ollama (for local model replay)
- Rust (for desktop app only)

### Installation

```bash
# Clone and install
git clone https://github.com/yourorg/blackbox.git
cd blackbox
bun install
bun run build

# Start infrastructure
bun run docker:up

# Pull a local model
ollama pull llama3.2:3b

# Check services
node packages/cli/dist/index.js status
```

### Basic Usage

```bash
# 1. Capture traces (integrate SDK into your agent)
# See "Capture SDK" section below

# 2. Replay against local model
node packages/cli/dist/index.js replay -i ./traces -m llama3.2:3b

# 3. Evaluate traces
node packages/cli/dist/index.js evaluate -i ./traces

# 4. Generate improvements
node packages/cli/dist/index.js improve -t ./traces -e ./eval-results -r ./CLAUDE.md

# 5. Run full pipeline
node packages/cli/dist/index.js run -i ./traces --create-pr
```

## Project Structure

```text
blackbox/
├── packages/           # Core library packages
│   ├── shared/         # Shared types, schemas, utilities
│   ├── capture/        # SDK wrapper for capturing LLM calls
│   ├── replay/         # Replay engine for local model testing
│   ├── evaluate/       # Evaluation framework with Phoenix
│   ├── improve/        # Rules analysis and improvement
│   ├── pr-generator/   # Git/GitHub PR creation
│   └── cli/            # Command-line interface
├── apps/
│   └── desktop/        # Tauri desktop menu bar app
├── examples/           # Example agents, traces, and rules
└── tests/              # Integration tests
```

## Packages

| Package                  | Description                                   |
| ------------------------ | --------------------------------------------- |
| `@blackbox/shared`       | Core types and utilities                      |
| `@blackbox/capture`      | SDK wrapper for capturing LLM calls           |
| `@blackbox/replay`       | Replay engine for local model testing         |
| `@blackbox/evaluate`     | Evaluation framework with Phoenix integration |
| `@blackbox/improve`      | Rules analysis and improvement generation     |
| `@blackbox/pr-generator` | Git/GitHub PR creation and automation         |
| `@blackbox/cli`          | Command-line interface                        |
| `@blackbox/desktop`      | Tauri desktop menu bar app                    |

## Capture SDK

Integrate capture into your coding agent:

```typescript
import { createCaptureClient } from "@blackbox/capture";

// Create a capture-enabled OpenAI client
const client = createCaptureClient(
  { apiKey: process.env.OPENAI_API_KEY },
  {
    langfuse: {
      host: "http://localhost:3213",
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
    },
  },
);

// Use like regular OpenAI SDK - calls are automatically captured
const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Help me fix this bug" }],
  tools: myTools,
});
```

## CLI Commands

### `blackbox status`

Check health of all services.

### `blackbox capture`

Set up trace capture for your application.

### `blackbox replay`

Replay captured traces against local models.

```bash
node packages/cli/dist/index.js replay \
  -i ./traces \
  -o ./replay-results \
  -m llama3.2:3b \
  --mode semi-live
```

### `blackbox evaluate`

Evaluate traces for quality and issues.

```bash
node packages/cli/dist/index.js evaluate \
  -i ./traces \
  -o ./eval-results
```

### `blackbox improve`

Generate rule improvements from analysis.

```bash
node packages/cli/dist/index.js improve \
  -t ./traces \
  -e ./eval-results \
  -r ./CLAUDE.md \
  --model gpt-4o-mini
```

### `blackbox run`

Run the full pipeline.

```bash
node packages/cli/dist/index.js run \
  -i ./traces \
  -r ./CLAUDE.md \
  --create-pr \
  --github-token $GITHUB_TOKEN \
  --github-owner yourorg \
  --github-repo yourrepo
```

## Desktop Application

Blackbox includes a Tauri v2-based desktop menu bar app for macOS. The app lives in your menu bar for quick access to settings and controls.

### Key Desktop Features

- **Menu bar integration**: Lives in the macOS menu bar (system tray)
- **Global hotkey**: Open Blackbox with ⌘Space (customizable)
- **Settings panel**: Configure launch at login, global hotkey, appearance (light/dark/system)
- **Minimal footprint**: No Dock icon, lightweight native performance

### Tray Menu

The system tray provides quick access to:

- **Open Blackbox** - Main app window
- **Documentation** - Manual and troubleshooting guides
- **Community** - Slack, X (Twitter), YouTube links
- **Settings** - App preferences
- **About & Updates** - Version info and update checking

### Tech Stack

- **Tauri v2**: Native Rust backend with web frontend
- **React 18**: UI framework with React Router
- **TypeScript**: Type-safe frontend code
- **Tailwind CSS v4**: CSS-first configuration, utility classes
- **Vite**: Fast development and building

### Desktop Development

```bash
cd apps/desktop
bun install
bun run tauri:dev    # Development mode with hot reload
bun run tauri:build  # Build for production
bun run test         # Run frontend tests
```

### Rust Backend Development

```bash
cd apps/desktop/src-tauri
cargo check          # Type check Rust code
cargo test           # Run Rust unit tests
cargo clippy         # Lint Rust code
```

### Desktop Project Layout

```text
apps/desktop/
├── src/                    # React frontend
│   ├── App.tsx             # Main app with routing
│   ├── App.css             # Tailwind CSS configuration
│   ├── components/         # UI components
│   │   ├── ui/             # Reusable UI primitives (Button, Input, etc.)
│   │   ├── settings/       # Settings-specific components
│   │   └── theme-provider.tsx  # Theme management (light/dark/system)
│   ├── views/              # Page views (MainView, SettingsView)
│   └── lib/                # Utilities and Tauri commands
├── src-tauri/              # Rust backend
│   ├── src/lib.rs          # Tray menu, commands, window management
│   ├── tauri.conf.json     # Tauri configuration
│   └── capabilities/       # Permission capabilities
├── vite.config.ts          # Vite + Tailwind configuration
└── package.json            # Frontend dependencies
```

## Infrastructure

Blackbox uses these services (via Docker Compose):

| Service    | Port  | Purpose                       |
| ---------- | ----- | ----------------------------- |
| Langfuse   | 3213  | LLM observability and tracing |
| Phoenix    | 6013  | ML evaluation platform        |
| LiteLLM    | 4213  | AI gateway for model routing  |
| Ollama     | 11434 | Local model serving           |
| PostgreSQL | 5413  | Database for Langfuse         |
| ClickHouse | 8113  | Analytics for Langfuse        |
| Redis      | 6313  | Caching                       |
| MinIO      | 9014  | Object storage                |

Start all services:

```bash
bun run docker:up
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

Create a `.env` file (see `.env.example`):

```env
# OpenAI (for capture and improvement generation)
OPENAI_API_KEY=sk-...

# Langfuse (for tracing)
LANGFUSE_HOST=http://localhost:3213
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
bun install

# Build all packages
bun run build

# Run tests
bun run test

# Run integration tests
bun run test:integration

# Type check
bun run typecheck

# Lint and format
bun run check:fix

# Clean build artifacts
bun run clean

# Development mode (watch)
bun run dev
```

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       Blackbox CLI                          │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│   Capture   │   Replay    │  Evaluate   │    Improve        │
│     SDK     │   Engine    │  Pipeline   │   Generator       │
├─────────────┴─────────────┴─────────────┴───────────────────┤
│                    Shared Types & Utils                     │
├─────────────────────────────────────────────────────────────┤
│   Langfuse   │   Phoenix   │   LiteLLM   │    Ollama        │
│  (Tracing)   │(Evaluation) │  (Gateway)  │ (Local Models)   │
└─────────────────────────────────────────────────────────────┘
```

## License

MIT
