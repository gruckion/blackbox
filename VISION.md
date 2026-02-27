# Blackbox Vision

> Local LLM proxy with a plugin extension architecture.

## Core Concept

Blackbox sits between the user and their LLMs. All LLM traffic — cloud or local — routes through Blackbox, giving it full visibility into inputs and outputs. Users install extensions (plugins) that transform, optimize, and analyze traffic in real time.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S MACHINE                           │
│                                                                 │
│  ┌───────────┐   ┌──────────────────────────────────────────┐  │
│  │ Browser   │   │           BLACKBOX PROXY                  │  │
│  │ (ChatGPT, │──▶│                                          │  │
│  │  Claude,  │   │  ┌─────────────────────────────────┐     │  │
│  │  Gemini)  │   │  │     Plugin Pipeline (ordered)    │     │  │
│  └───────────┘   │  │                                  │     │  │
│       ▲          │  │  INPUT                           │     │  │
│  mitmproxy       │  │  ┌──────────┐  ┌──────────────┐ │     │  │
│  (transparent    │  │  │ Query    │  │ JSON → TOON   │ │     │  │
│   intercept)     │  │  │ Optimize │─▶│ Converter    │─┼──┐  │  │
│                  │  │  └──────────┘  └──────────────┘ │  │  │  │
│  ┌───────────┐   │  │                                  │  │  │  │
│  │ IDE/CLI   │   │  │  OUTPUT                          │  │  │  │
│  │ (Cursor,  │──▶│  │  ┌──────────┐  ┌──────────────┐ │  │  │  │
│  │  Claude   │   │  │  │ TOON →   │  │ Response     │ │  │  │  │
│  │  Code,    │   │  │  │ JSON     │◀─│ Analyzer     │◀┼──┘  │  │
│  │  Copilot) │   │  │  └──────────┘  └──────────────┘ │     │  │
│  └───────────┘   │  │                                  │     │  │
│       │          │  └─────────────────────────────────┘     │  │
│  base_url swap   │           │              ▲               │  │
│  (explicit)      │           ▼              │               │  │
│                  │  ┌──────────────────────────────┐        │  │
│                  │  │        LiteLLM Gateway       │        │  │
│                  │  │  (routing, cost tracking,     │        │  │
│                  │  │   model management)           │        │  │
│                  │  └──────────┬───────────────────┘        │  │
│                  └─────────────┼─────────────────────────────┘  │
│                               │                                 │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
             ┌──────────┐          ┌──────────────┐
             │  Ollama  │          │ Cloud LLMs   │
             │ (local)  │          │ (OpenAI,     │
             └──────────┘          │  Anthropic,  │
                                   │  Google)     │
                                   └──────────────┘
```

## Two Interception Modes

### 1. Explicit (base_url swap)

For tools that support configuring an API endpoint (IDE extensions, CLI tools, custom apps). The user points their tool at Blackbox's local endpoint instead of the cloud API directly.

- User sets `base_url=http://localhost:<blackbox-port>/v1`
- Blackbox receives the request, runs the plugin pipeline, forwards via LiteLLM
- Zero certificate issues, full request/response visibility

### 2. Transparent (mitmproxy)

For tools that don't support base_url configuration — browser-based LLM sessions (ChatGPT web, Claude web, Gemini web) and desktop apps with hardcoded endpoints.

- Blackbox runs mitmproxy as a transparent/system proxy
- Intercepts HTTPS traffic to known LLM API domains (api.openai.com, api.anthropic.com, generativelanguage.googleapis.com)
- Provides frictionless experience — no configuration changes needed in the target app
- Requires one-time trust of Blackbox's CA certificate

## Plugin / Extension System

Plugins are middleware that transform request/response pairs as they flow through Blackbox.

### Plugin Interface

Each plugin implements hooks on the request/response lifecycle:

- `onRequest(request)` — Transform the request before it reaches the LLM
- `onResponse(response)` — Transform the response before it reaches the user
- `onError(error)` — Handle errors in the pipeline

### Example Plugins

**Format Conversion (JSON to TOON)**

- Converts JSON payloads to TOON format before sending to LLM
- Converts TOON responses back to JSON before returning to user
- Reduces token usage while preserving semantic content

**Query Optimization**

- Rewrites user prompts for better LLM performance
- Applies chain-of-thought structuring
- Reorders information for causal progressiveness (atoms of thought)
- Adds relevant context from prior interactions

**Response Caching**

- Caches identical or semantically-similar requests
- Serves cached responses for repeated queries
- Reduces cost and latency

**Token Budget Manager**

- Enforces per-session or per-day token limits
- Warns users when approaching limits
- Optionally downgrades to cheaper models when budget is tight

**Trace Analyzer (the current "nightly CI" functionality)**

- Logs all traffic for later analysis
- Evaluates execution paths for loops, inefficiency, failures
- Generates automatic improvement suggestions
- Users can accept/reject suggestions from the desktop UI

## Improvement Suggestions

Blackbox continuously analyzes LLM interaction history:

1. **Automatic analysis** — Evaluates past execution paths for patterns (loops, wasted tokens, poor tool usage)
2. **Suggestion generation** — Produces concrete improvement suggestions (rule changes, prompt tweaks, model switches)
3. **User review** — Suggestions appear in the desktop app; users accept or reject each one
4. **Suggestion history** — Full history of all suggestions with toggle on/off capability
5. **Regression gating** — Accepted suggestions are validated against held-out traces before applying

## Desktop App Role

The Tauri menu bar app is the control plane:

- **Dashboard** — Live view of traffic flowing through the proxy
- **Extensions** — Install, configure, enable/disable plugins
- **Suggestions** — Review and manage improvement suggestions
- **History** — Full log of all suggestions with on/off toggles
- **Settings** — Proxy configuration, certificate management, hotkeys, appearance
