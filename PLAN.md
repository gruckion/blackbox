# Blackbox POC - Nightly CI for Coding Agents

## Vision

> "Nightly CI for coding agents: capture real runs, replay locally, automatically improve repo rules/tool policies, and ship changes as regression-gated PRs."

## Research Summary

### OSS Building Blocks (Validated)

| Component          | Solution            | License    | Why                                                                     |
| ------------------ | ------------------- | ---------- | ----------------------------------------------------------------------- |
| **Capture/Traces** | Langfuse            | MIT        | Self-hostable, OpenTelemetry support, session replay, 19k+ GitHub stars |
| **Evaluation**     | Arize Phoenix       | Apache 2.0 | Deep agent evaluation, pre-built evaluators, 7.8k+ stars                |
| **Gateway/Proxy**  | LiteLLM             | MIT        | 100+ model support, OpenAI-compatible, cost tracking                    |
| **Local Models**   | Ollama              | MIT        | Simple API, OpenAI-compatible endpoints, LoRA support                   |
| **Parallel Dev**   | git-worktree-runner | Apache 2.0 | Claude Code integration, per-branch isolation                           |

### Ruled Out (Not OSS or Limited)

- Helicone (cloud-first, limited OSS)
- LangSmith (proprietary)
- Braintrust (proprietary)
- OpenPipe (limited OSS)

---

## Phase 1: Foundation Setup & Validation

**Goal:** Get all OSS building blocks running locally and verify they work together.

### Task 1.1: Initialize Project Structure

- Create monorepo structure with pnpm workspaces
- Set up TypeScript configuration
- Configure ESLint, Prettier
- Initialize git repository

### Task 1.2: Docker Infrastructure Setup

- Create docker-compose.yml for all services
- Configure Langfuse (web + worker + postgres + clickhouse + redis)
- Configure Arize Phoenix
- Configure LiteLLM proxy
- Verify all services start and are accessible

### Task 1.3: Ollama Local Model Setup

- Install/verify Ollama
- Pull test models (llama3.2, codellama)
- Verify API endpoints work
- Test OpenAI-compatible API

### Task 1.4: LiteLLM Gateway Configuration

- Configure LiteLLM to route to both cloud (OpenAI/Anthropic) and local (Ollama)
- Set up logging to capture all requests
- Configure Langfuse integration for tracing
- Verify routing works with test requests

### Task 1.5: Langfuse Integration Test

- Create test script that sends requests through LiteLLM
- Verify traces appear in Langfuse UI
- Verify session grouping works
- Test trace export functionality

---

## Phase 2: High-Level Architecture Design

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BLACKBOX SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │   Your App   │───▶│   LiteLLM    │───▶│  Cloud Models        │  │
│  │  (Agent/LLM) │    │   Gateway    │    │  (OpenAI/Anthropic)  │  │
│  └──────────────┘    └──────┬───────┘    └──────────────────────┘  │
│                             │                                        │
│                             │ Traces                                 │
│                             ▼                                        │
│                      ┌──────────────┐                               │
│                      │   Langfuse   │                               │
│                      │   (Storage)  │                               │
│                      └──────┬───────┘                               │
│                             │                                        │
│         ┌───────────────────┼───────────────────┐                   │
│         ▼                   ▼                   ▼                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐           │
│  │    Replay    │   │  Evaluator   │   │    Rules     │           │
│  │    Engine    │   │   (Phoenix)  │   │   Improver   │           │
│  └──────┬───────┘   └──────────────┘   └──────┬───────┘           │
│         │                                      │                    │
│         ▼                                      ▼                    │
│  ┌──────────────┐                      ┌──────────────┐           │
│  │    Ollama    │                      │  PR Generator │           │
│  │ (Local LLMs) │                      │  (Git/GitHub) │           │
│  └──────────────┘                      └──────────────┘           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Packages

```
packages/
├── capture/           # SDK wrapper for capturing LLM calls
├── replay/            # Engine for replaying traces against local models
├── evaluate/          # Evaluation framework using Phoenix
├── improve/           # Rules improvement engine (LLM-based analysis)
├── pr-generator/      # Git operations and PR creation
├── cli/               # Command-line interface
└── shared/            # Shared types, utilities, configs
```

### Data Flow

1. **Capture Phase** (Daytime)
   - LiteLLM proxy intercepts all LLM calls
   - Traces sent to Langfuse with full context
   - Tool calls, retrieval, outcomes all recorded

2. **Replay Phase** (Nightly)
   - Fetch traces from Langfuse for time period
   - Replay each trace against local model (Ollama)
   - Compare outputs (semantic similarity, token efficiency)

3. **Evaluate Phase** (Nightly)
   - Run Phoenix evaluators on both cloud and local outputs
   - Score: correctness, helpfulness, safety, efficiency
   - Detect: loops, regressions, stuck states

4. **Improve Phase** (Nightly)
   - Analyze evaluation results
   - Generate rule improvements using LLM
   - Validate improvements against held-out traces

5. **PR Phase** (Nightly)
   - Create branch with rule changes
   - Include evidence report (episodes improved/regressed)
   - Open PR for human review

---

## Phase 3: POC Implementation Tasks

### Milestone 1: Capture & Storage (Tasks 3.1-3.5)

#### Task 3.1: Create Capture SDK

**Description:** Build a TypeScript SDK that wraps OpenAI/Anthropic clients to capture all calls
**Success Criteria:**

- [ ] SDK intercepts chat completions
- [ ] SDK captures tool calls and responses
- [ ] SDK sends traces to Langfuse
- [ ] Unit tests pass

#### Task 3.2: Implement Trace Schema

**Description:** Define TypeScript types for captured traces
**Success Criteria:**

- [ ] Types for messages, tool calls, metadata
- [ ] Serialization/deserialization works
- [ ] Schema validation tests pass

#### Task 3.3: Langfuse Client Wrapper

**Description:** Create wrapper for Langfuse API to fetch/store traces
**Success Criteria:**

- [ ] Can create traces programmatically
- [ ] Can fetch traces by session/time range
- [ ] Can export traces as JSON
- [ ] Integration tests pass

#### Task 3.4: Session Grouping

**Description:** Implement logic to group related traces into sessions
**Success Criteria:**

- [ ] Traces grouped by conversation/task
- [ ] Session metadata captured
- [ ] Query by session works

#### Task 3.5: Capture Integration Test

**Description:** End-to-end test of capture pipeline
**Success Criteria:**

- [ ] Make 10 test LLM calls with tools
- [ ] All traces appear in Langfuse
- [ ] Sessions correctly grouped
- [ ] Export produces valid JSON

### Milestone 2: Replay Engine (Tasks 3.6-3.10)

#### Task 3.6: Replay Engine Core

**Description:** Build engine that replays captured traces
**Success Criteria:**

- [ ] Can load traces from Langfuse export
- [ ] Can replay against any OpenAI-compatible endpoint
- [ ] Captures replay outputs
- [ ] Unit tests pass

#### Task 3.7: Ollama Integration

**Description:** Integrate Ollama as replay target
**Success Criteria:**

- [ ] Can connect to Ollama API
- [ ] Can list available models
- [ ] Can send chat completions
- [ ] Tool calls work (if model supports)

#### Task 3.8: Replay Modes

**Description:** Implement different replay fidelity modes
**Success Criteria:**

- [ ] Exact mode: frozen tool outputs
- [ ] Semi-live: re-run retrieval only
- [ ] Full-live: re-run everything
- [ ] Mode selection works

#### Task 3.9: Output Comparison

**Description:** Compare original vs replay outputs
**Success Criteria:**

- [ ] Semantic similarity scoring
- [ ] Token count comparison
- [ ] Latency comparison
- [ ] Diff generation

#### Task 3.10: Replay Integration Test

**Description:** End-to-end replay test
**Success Criteria:**

- [ ] Capture 5 traces with cloud model
- [ ] Replay all against Ollama
- [ ] Comparison report generated
- [ ] Results stored

### Milestone 3: Evaluation Framework (Tasks 3.11-3.15)

#### Task 3.11: Phoenix Integration

**Description:** Set up Arize Phoenix for evaluation
**Success Criteria:**

- [ ] Phoenix client configured
- [ ] Can send traces to Phoenix
- [ ] Can run built-in evaluators
- [ ] Results retrievable

#### Task 3.12: Custom Evaluators

**Description:** Build evaluators specific to coding agents
**Success Criteria:**

- [ ] Code correctness evaluator
- [ ] Loop detection evaluator
- [ ] Tool usage efficiency evaluator
- [ ] Tests for each evaluator

#### Task 3.13: LLM-as-Judge Setup

**Description:** Configure LLM judges for subjective quality
**Success Criteria:**

- [ ] Judge prompt templates created
- [ ] Multi-judge voting implemented
- [ ] Calibration dataset created
- [ ] Judge consistency measured

#### Task 3.14: Hard Signal Integration

**Description:** Integrate non-LLM signals (tests, lint, build)
**Success Criteria:**

- [ ] Test pass/fail captured
- [ ] Lint results captured
- [ ] Build success captured
- [ ] Signals aggregated per trace

#### Task 3.15: Evaluation Pipeline

**Description:** Orchestrate full evaluation pipeline
**Success Criteria:**

- [ ] Pipeline runs all evaluators
- [ ] Results aggregated into report
- [ ] Regressions flagged
- [ ] Report exportable

### Milestone 4: Rules Improvement (Tasks 3.16-3.20)

#### Task 3.16: Rules File Parser

**Description:** Parse common rules file formats (CLAUDE.md, AGENTS.md)
**Success Criteria:**

- [ ] Parse markdown rules files
- [ ] Extract individual rules
- [ ] Modify rules programmatically
- [ ] Serialize back to markdown

#### Task 3.17: Improvement Analyzer

**Description:** Analyze traces to identify improvement opportunities
**Success Criteria:**

- [ ] Detect common failure patterns
- [ ] Detect loop patterns
- [ ] Rank by impact potential
- [ ] Generate improvement hypotheses

#### Task 3.18: Rule Generator

**Description:** Generate improved rules using LLM
**Success Criteria:**

- [ ] Prompt templates for rule generation
- [ ] Generate rule variants
- [ ] Validate rule syntax
- [ ] Score rule clarity

#### Task 3.19: Rule Validator

**Description:** Validate rule changes against held-out traces
**Success Criteria:**

- [ ] Split traces into train/test
- [ ] Simulate rule application
- [ ] Measure improvement
- [ ] Reject regressions

#### Task 3.20: Improvement Pipeline

**Description:** Orchestrate full improvement pipeline
**Success Criteria:**

- [ ] Analyze → Generate → Validate flow
- [ ] Track which traces improved
- [ ] Evidence report generated
- [ ] Top N improvements selected

### Milestone 5: PR Generation (Tasks 3.21-3.25)

#### Task 3.21: Git Operations

**Description:** Implement git operations for rule changes
**Success Criteria:**

- [ ] Create branch
- [ ] Apply file changes
- [ ] Commit with message
- [ ] Push to remote

#### Task 3.22: PR Template

**Description:** Create PR template with evidence
**Success Criteria:**

- [ ] Summary of changes
- [ ] Episodes improved count
- [ ] Episodes regressed count
- [ ] Evaluation scores

#### Task 3.23: GitHub Integration

**Description:** Create PRs via GitHub API
**Success Criteria:**

- [ ] Authenticate with GitHub
- [ ] Create PR programmatically
- [ ] Add labels
- [ ] Request reviewers

#### Task 3.24: Loop Report Generation

**Description:** Generate report on stuck loops
**Success Criteria:**

- [ ] Detect loop patterns in traces
- [ ] Classify loop types
- [ ] Suggest fixes
- [ ] Include in PR

#### Task 3.25: PR Pipeline

**Description:** Orchestrate full PR creation
**Success Criteria:**

- [ ] Gather improvements
- [ ] Create branch and commits
- [ ] Generate PR body
- [ ] Open PR

### Milestone 6: CLI & Integration (Tasks 3.26-3.30)

#### Task 3.26: CLI Framework

**Description:** Set up CLI using Commander.js
**Success Criteria:**

- [ ] CLI scaffolding works
- [ ] Help text for all commands
- [ ] Config file support
- [ ] Environment variable support

#### Task 3.27: CLI Commands

**Description:** Implement all CLI commands
**Success Criteria:**

- [ ] `blackbox capture start/stop`
- [ ] `blackbox replay <session>`
- [ ] `blackbox evaluate <session>`
- [ ] `blackbox improve`
- [ ] `blackbox pr`
- [ ] `blackbox run` (full pipeline)

#### Task 3.28: Configuration System

**Description:** Implement configuration management
**Success Criteria:**

- [ ] Config file format defined
- [ ] Defaults sensible
- [ ] Override via CLI/env
- [ ] Validation on load

#### Task 3.29: Nightly Job Runner

**Description:** Implement scheduler for nightly runs
**Success Criteria:**

- [ ] Cron-style scheduling
- [ ] Run full pipeline
- [ ] Handle errors gracefully
- [ ] Notify on completion

#### Task 3.30: End-to-End Test

**Description:** Full system integration test
**Success Criteria:**

- [ ] Start infrastructure
- [ ] Make test LLM calls
- [ ] Run nightly pipeline
- [ ] PR created with improvements
- [ ] All tests green

---

## Phase 4: Task Execution Plan

### Parallel Work Strategy

Using Claude Code's Task List feature with git worktrees for parallel execution:

```
Main Session (Orchestrator)
├── Worker 1: Infrastructure (Docker, services)
├── Worker 2: Capture package
├── Worker 3: Replay package
├── Worker 4: Evaluate package
└── Worker 5: Improve + PR packages
```

### Task Dependencies

```
[1.1] Project Structure
  │
  ▼
[1.2] Docker Infrastructure ──────────────────┐
  │                                            │
  ▼                                            │
[1.3] Ollama Setup                            │
  │                                            │
  ▼                                            │
[1.4] LiteLLM Config ◀────────────────────────┘
  │
  ▼
[1.5] Langfuse Integration Test
  │
  ├──────────────────────────────────────────┐
  ▼                                          ▼
[3.1-3.5] Capture Milestone           [3.6-3.10] Replay Milestone
  │                                          │
  └──────────────┬───────────────────────────┘
                 ▼
         [3.11-3.15] Evaluate Milestone
                 │
                 ▼
         [3.16-3.20] Improve Milestone
                 │
                 ▼
         [3.21-3.25] PR Milestone
                 │
                 ▼
         [3.26-3.30] CLI Milestone
```

---

## Success Criteria (POC Complete)

### Functional

- [ ] Can capture LLM calls from any OpenAI-compatible app
- [ ] Can replay traces against local Ollama models
- [ ] Can evaluate and compare cloud vs local outputs
- [ ] Can detect stuck loops and failure patterns
- [ ] Can generate rule improvements with evidence
- [ ] Can create PRs automatically

### Non-Functional

- [ ] All services start with single `docker-compose up`
- [ ] CLI is intuitive and well-documented
- [ ] Tests cover critical paths
- [ ] Documentation explains setup and usage

### Demo Scenario

1. Run a sample coding agent making 20 LLM calls
2. Capture all calls to Langfuse
3. Run nightly pipeline
4. See PR created with:
   - 2-3 rule improvements
   - Evidence of which traces improved
   - Loop detection report

---

## Files to Create

```
blackbox/
├── PLAN.md                    # This file
├── CLAUDE.md                  # Project guidance
├── package.json               # Root package.json (pnpm workspace)
├── pnpm-workspace.yaml        # Workspace config
├── tsconfig.json              # Base TypeScript config
├── docker-compose.yml         # All infrastructure
├── .env.example               # Environment template
├── packages/
│   ├── capture/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── sdk.ts
│   │   │   ├── langfuse-client.ts
│   │   │   └── types.ts
│   │   └── tests/
│   ├── replay/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── engine.ts
│   │   │   ├── ollama-client.ts
│   │   │   └── comparison.ts
│   │   └── tests/
│   ├── evaluate/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── phoenix-client.ts
│   │   │   ├── evaluators/
│   │   │   └── pipeline.ts
│   │   └── tests/
│   ├── improve/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── analyzer.ts
│   │   │   ├── generator.ts
│   │   │   └── validator.ts
│   │   └── tests/
│   ├── pr-generator/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── git-ops.ts
│   │   │   ├── github-client.ts
│   │   │   └── templates.ts
│   │   └── tests/
│   ├── cli/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── commands/
│   │   │   └── config.ts
│   │   └── tests/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── types.ts
│           └── utils.ts
└── examples/
    ├── sample-agent/          # Example agent to test with
    └── demo-rules/            # Example rules files
```

---

## Execution Commands

```bash
# Phase 1: Setup
cd ~/gruckion-workdir/blackbox
pnpm install
docker-compose up -d

# Verify services
curl http://localhost:3213  # Langfuse
curl http://localhost:6013  # Phoenix
curl http://localhost:4213  # LiteLLM
curl http://localhost:11434 # Ollama

# Phase 3: Build packages
pnpm --filter @blackbox/capture build
pnpm --filter @blackbox/replay build
pnpm --filter @blackbox/evaluate build
pnpm --filter @blackbox/improve build
pnpm --filter @blackbox/pr-generator build
pnpm --filter @blackbox/cli build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Full pipeline
pnpm --filter @blackbox/cli start run
```

---

## Timeline Estimate

| Phase               | Tasks  | Parallel Workers | Est. Time      |
| ------------------- | ------ | ---------------- | -------------- |
| Phase 1             | 5      | 1                | 30 min         |
| Phase 3 Milestone 1 | 5      | 2                | 45 min         |
| Phase 3 Milestone 2 | 5      | 2                | 45 min         |
| Phase 3 Milestone 3 | 5      | 2                | 45 min         |
| Phase 3 Milestone 4 | 5      | 2                | 45 min         |
| Phase 3 Milestone 5 | 5      | 1                | 30 min         |
| Phase 3 Milestone 6 | 5      | 1                | 30 min         |
| **Total**           | **35** | -                | **~4-5 hours** |

---

## Next Steps

1. Create project structure (Task 1.1)
2. Set up Task List with all dependencies
3. Start workers in parallel
4. Execute plan
