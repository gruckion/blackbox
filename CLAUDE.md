# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Blackbox is a "Nightly CI for coding agents" - it captures LLM calls during development, replays them against local models, automatically improves repo rules/policies, and ships changes as regression-gated PRs.

## Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Start infrastructure (Langfuse, Phoenix, LiteLLM)
pnpm docker:up

# CLI commands (after build)
pnpm --filter @blackbox/cli start capture    # Start capture mode
pnpm --filter @blackbox/cli start replay     # Replay traces
pnpm --filter @blackbox/cli start evaluate   # Run evaluations
pnpm --filter @blackbox/cli start improve    # Generate improvements
pnpm --filter @blackbox/cli start pr         # Create PR
pnpm --filter @blackbox/cli start run        # Full nightly pipeline
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

## Package Structure

| Package | Purpose |
|---------|---------|
| `@blackbox/shared` | Shared types, schemas, utilities |
| `@blackbox/capture` | SDK wrapper for capturing LLM calls |
| `@blackbox/replay` | Replay engine for local model testing |
| `@blackbox/evaluate` | Evaluation framework with Phoenix |
| `@blackbox/improve` | Rules analysis and improvement |
| `@blackbox/pr-generator` | Git/GitHub PR creation |
| `@blackbox/cli` | Command-line interface |

## Key Files

- `docker-compose.yml` - Infrastructure services
- `.env.example` - Environment variable template
- `packages/*/src/index.ts` - Package entry points
- `examples/sample-agent/` - Test agent for demos

## Development Workflow

1. Make changes in `packages/*/src/`
2. Run `pnpm typecheck` to verify types
3. Run `pnpm test` to run tests
4. Run `pnpm build` to build all packages

## Infrastructure Ports

| Service | Port | URL |
|---------|------|-----|
| Langfuse | 3000 | http://localhost:3000 |
| Phoenix | 6006 | http://localhost:6006 |
| LiteLLM | 4000 | http://localhost:4000 |
| Ollama | 11434 | http://localhost:11434 |
