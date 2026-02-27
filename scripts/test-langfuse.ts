#!/usr/bin/env npx tsx
/**
 * Test script to verify Langfuse integration
 * Run with: npx tsx scripts/test-langfuse.ts
 *
 * Prerequisites:
 *   1. Langfuse running: docker-compose up -d langfuse-web
 *   2. Create an API key in Langfuse UI at http://localhost:3213
 *   3. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY in .env
 */

import { Langfuse } from "langfuse";

const LANGFUSE_HOST = process.env.LANGFUSE_HOST || "http://localhost:3213";
const LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY || "";
const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY || "";

async function testLangfuse() {
  console.log("=".repeat(50));
  console.log("  Langfuse Integration Test");
  console.log("=".repeat(50));
  console.log(`Host: ${LANGFUSE_HOST}`);
  console.log(
    `Public Key: ${LANGFUSE_PUBLIC_KEY ? `${LANGFUSE_PUBLIC_KEY.slice(0, 10)}...` : "NOT SET"}`
  );
  console.log("");

  if (!(LANGFUSE_PUBLIC_KEY && LANGFUSE_SECRET_KEY)) {
    console.log("⚠ Langfuse API keys not configured");
    console.log("");
    console.log("To configure:");
    console.log("  1. Open http://localhost:3213");
    console.log("  2. Create an account and project");
    console.log("  3. Go to Settings > API Keys");
    console.log("  4. Create a new API key");
    console.log("  5. Add to .env:");
    console.log("     LANGFUSE_PUBLIC_KEY=pk-lf-...");
    console.log("     LANGFUSE_SECRET_KEY=sk-lf-...");
    console.log("");
    console.log("Skipping tests...");
    return;
  }

  // Initialize Langfuse client
  const langfuse = new Langfuse({
    publicKey: LANGFUSE_PUBLIC_KEY,
    secretKey: LANGFUSE_SECRET_KEY,
    baseUrl: LANGFUSE_HOST,
  });

  // Test 1: Create a trace
  console.log("[1/4] Creating test trace...");
  try {
    const trace = langfuse.trace({
      name: "blackbox-test-trace",
      userId: "test-user",
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
      tags: ["test", "blackbox"],
    });

    console.log(`✓ Trace created: ${trace.id}\n`);

    // Test 2: Add a generation (simulating LLM call)
    console.log("[2/4] Adding generation to trace...");
    const generation = trace.generation({
      name: "test-generation",
      model: "gpt-4o-mini",
      modelParameters: {
        temperature: 0.7,
        maxTokens: 100,
      },
      input: [{ role: "user", content: "Hello, this is a test message" }],
      output: { role: "assistant", content: "Hello! This is a test response from Blackbox." },
      usage: {
        promptTokens: 10,
        completionTokens: 15,
        totalTokens: 25,
      },
    });

    console.log(`✓ Generation added: ${generation.id}\n`);

    // Test 3: Add a span (simulating tool call)
    console.log("[3/4] Adding span (tool call) to trace...");
    const span = trace.span({
      name: "tool-call",
      input: { tool: "web_search", query: "test query" },
      output: { results: ["result1", "result2"] },
    });
    span.end();

    console.log(`✓ Span added: ${span.id}\n`);

    // Test 4: Add a score
    console.log("[4/4] Adding evaluation score...");
    trace.score({
      name: "quality",
      value: 0.95,
      comment: "Test score from Blackbox integration test",
    });

    console.log("✓ Score added\n");

    // Flush to ensure all events are sent
    await langfuse.flushAsync();

    console.log("=".repeat(50));
    console.log("  Langfuse integration test passed!");
    console.log("=".repeat(50));
    console.log("");
    console.log(`View trace at: ${LANGFUSE_HOST}/trace/${trace.id}`);
    console.log("");
  } catch (error) {
    console.error("✗ Langfuse test failed:", error);
    process.exit(1);
  }
}

testLangfuse().catch(console.error);
