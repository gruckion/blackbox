# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Blackbox is a "Nightly CI for coding agents" - it captures LLM calls during development, replays them against local models, automatically improves repo rules/policies, and ships changes as regression-gated PRs.

## Commands

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

# Lint and format (uses Ultracite/Biome)
bun run check        # Check linting and formatting
bun run check:fix    # Auto-fix issues (includes --unsafe fixes)

# Clean build artifacts
bun run clean

# Start infrastructure (Langfuse, Phoenix, LiteLLM)
bun run docker:up
bun run docker:down

# CLI commands (after build)
node packages/cli/dist/index.js status              # Check service health
node packages/cli/dist/index.js capture             # Start capture mode
node packages/cli/dist/index.js replay              # Replay traces
node packages/cli/dist/index.js evaluate            # Run evaluations
node packages/cli/dist/index.js improve             # Generate improvements
node packages/cli/dist/index.js run                 # Full nightly pipeline

# Desktop app (Tauri)
cd apps/desktop
bun run tauri:dev     # Development mode
bun run tauri:build   # Build desktop app
```

## Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Your App   │───▶│   LiteLLM    │───▶│ Cloud Models │
└──────────────┘    └──────┬───────┘    └──────────────┘
                          │ Traces
                          ▼
                   ┌──────────────┐
                   │   Langfuse   │
                   └──────┬───────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Replay     │ │  Evaluator   │ │   Rules      │
│   Engine     │ │  (Phoenix)   │ │  Improver    │
└──────┬───────┘ └──────────────┘ └──────┬───────┘
       ▼                                 ▼
┌──────────────┐                 ┌──────────────┐
│   Ollama     │                 │ PR Generator │
└──────────────┘                 └──────────────┘
```

## Project Structure

```
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
│   └── desktop/        # Tauri desktop app (menu bar)
├── example/            # Example traces and CLAUDE.md
├── scripts/            # Development/testing scripts
└── tests/              # Integration tests
```

## Package Details

| Package | Purpose |
|---------|---------|
| `@blackbox/shared` | Shared types, schemas, utilities |
| `@blackbox/capture` | SDK wrapper for capturing LLM calls |
| `@blackbox/replay` | Replay engine for local model testing |
| `@blackbox/evaluate` | Evaluation framework with Phoenix |
| `@blackbox/improve` | Rules analysis and improvement |
| `@blackbox/pr-generator` | Git/GitHub PR creation |
| `@blackbox/cli` | Command-line interface |
| `@blackbox/desktop` | Tauri desktop menu bar app |

## Key Files

- `docker-compose.yml` - Infrastructure services (Langfuse, Phoenix, LiteLLM, etc.)
- `.env.example` - Environment variable template
- `packages/*/src/index.ts` - Package entry points
- `apps/desktop/src-tauri/` - Rust backend for desktop app
- `example/traces/` - Sample trace files for testing

## Development Workflow

1. Make changes in `packages/*/src/` or `apps/desktop/src/`
2. Run `bun run typecheck` to verify types
3. Run `bun run test` to run tests
4. Run `bun run check:fix` to lint and format
5. Run `bun run build` to build all packages

## Infrastructure Ports

| Service | Port | URL |
|---------|------|-----|
| Langfuse | 3000 | http://localhost:3000 |
| Phoenix | 6006 | http://localhost:6006 |
| LiteLLM | 4000 | http://localhost:4000 |
| Ollama | 11434 | http://localhost:11434 |
| PostgreSQL | 5432 | localhost:5432 |
| ClickHouse | 8123 | http://localhost:8123 |
| Redis | 6379 | localhost:6379 |
| MinIO | 9001 | http://localhost:9001 |

## Testing the Pipeline

```bash
# Run with example traces (skipping replay for quick test)
node packages/cli/dist/index.js run \
  --input example/traces \
  --rules example/CLAUDE.md \
  --skip-replay \
  --output ./test-output
```
