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

# Desktop app (Tauri v2 + React + TypeScript + Tailwind CSS v4)
cd apps/desktop
bun run dev           # Vite dev server only
bun run build         # Build frontend
bun run test          # Run frontend tests (Vitest)
bun run tauri:dev     # Full Tauri development mode
bun run tauri:build   # Build desktop app for distribution

# Rust backend (in apps/desktop/src-tauri)
cargo check           # Type check
cargo test            # Run unit tests
cargo clippy          # Lint
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

| Package                  | Purpose                               |
| ------------------------ | ------------------------------------- |
| `@blackbox/shared`       | Shared types, schemas, utilities      |
| `@blackbox/capture`      | SDK wrapper for capturing LLM calls   |
| `@blackbox/replay`       | Replay engine for local model testing |
| `@blackbox/evaluate`     | Evaluation framework with Phoenix     |
| `@blackbox/improve`      | Rules analysis and improvement        |
| `@blackbox/pr-generator` | Git/GitHub PR creation                |
| `@blackbox/cli`          | Command-line interface                |
| `@blackbox/desktop`      | Tauri desktop menu bar app            |

## Key Files

- `docker-compose.yml` - Infrastructure services (Langfuse, Phoenix, LiteLLM, etc.)
- `.env.example` - Environment variable template
- `packages/*/src/index.ts` - Package entry points
- `apps/desktop/src-tauri/` - Rust backend for desktop app
- `example/traces/` - Sample trace files for testing

## Desktop App Details

The desktop app (`apps/desktop`) is a macOS menu bar app built with:

- **Tauri v2**: Native Rust backend for window management, tray icon, system APIs
- **React 18**: UI framework with React Router for navigation
- **TypeScript**: Strict type checking
- **Tailwind CSS v4**: CSS-first configuration via `@theme` directive
- **Vite**: Development server and bundler
- **Vitest**: Unit testing framework

### Tray Menu Actions

The system tray menu provides:

- **Open Blackbox** (⌘Space) - Opens the main window
- **Send us Feedback** - Opens GitHub issues page
- **Manual** - Opens documentation
- **Troubleshooting** - Opens troubleshooting guide
- **Join our Community** - Opens Slack/community page
- **Follow us on X** - Opens Twitter/X profile
- **Subscribe to our Channel** - Opens YouTube channel
- **Version info** - Shows current version (disabled)
- **About Blackbox** - Opens settings to about section
- **Check for Updates** - Triggers update check
- **Settings...** (⌘,) - Opens settings window
- **Quit Blackbox** (⌘Q) - Exits the application

### Key Files

- `src/App.css` - Tailwind theme configuration (colors, fonts)
- `src/App.tsx` - React Router setup (/, /settings routes)
- `src/views/` - Page components (MainView, SettingsView)
- `src/components/ui/` - Reusable UI components using CVA (class-variance-authority)
- `src/components/theme-provider.tsx` - Theme management (light/dark/system)
- `src-tauri/src/lib.rs` - Tray menu, commands, window management

## Development Workflow

1. Make changes in `packages/*/src/` or `apps/desktop/src/`
2. Run `bun run typecheck` to verify types
3. Run `bun run test` to run tests
4. Run `bun run check:fix` to lint and format
5. Run `bun run build` to build all packages

## Infrastructure Ports

| Service    | Port  | URL                    |
| ---------- | ----- | ---------------------- |
| Langfuse   | 3213  | http://localhost:3213  |
| Phoenix    | 6013  | http://localhost:6013  |
| LiteLLM    | 4213  | http://localhost:4213  |
| Ollama     | 11434 | http://localhost:11434 |
| PostgreSQL | 5413  | localhost:5413         |
| ClickHouse | 8113  | http://localhost:8113  |
| Redis      | 6313  | localhost:6313         |
| MinIO      | 9014  | http://localhost:9014  |

## Testing the Pipeline

```bash
# Run with example traces (skipping replay for quick test)
node packages/cli/dist/index.js run \
  --input example/traces \
  --rules example/CLAUDE.md \
  --skip-replay \
  --output ./test-output
```
