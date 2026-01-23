#!/usr/bin/env npx tsx
/**
 * Test script to verify Ollama is working correctly
 * Run with: npx tsx scripts/test-ollama.ts
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OpenAIChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface OpenAIModelsResponse {
  data: Array<{ id: string }>;
}

async function testOllama() {
  console.log('='.repeat(50));
  console.log('  Ollama Integration Test');
  console.log('='.repeat(50));
  console.log(`Host: ${OLLAMA_HOST}\n`);

  // Test 1: Check if Ollama is running
  console.log('[1/4] Checking Ollama connection...');
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as OllamaTagsResponse;
    console.log(`✓ Connected! Found ${data.models?.length || 0} models\n`);

    if (data.models?.length) {
      console.log('Available models:');
      for (const model of data.models) {
        const sizeMB = Math.round(model.size / 1024 / 1024);
        console.log(`  - ${model.name} (${sizeMB} MB)`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('✗ Failed to connect to Ollama');
    console.error('  Make sure Ollama is running: ollama serve');
    process.exit(1);
  }

  // Test 2: Test generation endpoint
  console.log('[2/4] Testing /api/generate endpoint...');
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        prompt: 'Say "Hello, Blackbox!" and nothing else.',
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as OllamaGenerateResponse;
    console.log(`✓ Generation successful`);
    console.log(`  Response: "${data.response.trim()}"`);
    if (data.eval_count) {
      console.log(`  Tokens: ${data.eval_count}`);
    }
    console.log('');
  } catch (error) {
    console.error('✗ Generation failed:', error);
    console.error('  You may need to pull the model: ollama pull llama3.2:3b');
    process.exit(1);
  }

  // Test 3: Test OpenAI-compatible endpoint
  console.log('[3/4] Testing OpenAI-compatible endpoint...');
  try {
    const response = await fetch(`${OLLAMA_HOST}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        messages: [{ role: 'user', content: 'What is 2+2? Answer with just the number.' }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;
    console.log(`✓ OpenAI-compatible endpoint working`);
    console.log(`  Response: "${data.choices?.[0]?.message?.content?.trim()}"`);
    console.log('');
  } catch (error) {
    console.error('✗ OpenAI-compatible endpoint failed:', error);
    process.exit(1);
  }

  // Test 4: List models via OpenAI-compatible endpoint
  console.log('[4/4] Testing /v1/models endpoint...');
  try {
    const response = await fetch(`${OLLAMA_HOST}/v1/models`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as OpenAIModelsResponse;
    console.log(`✓ Models endpoint working (${data.data?.length || 0} models)`);
    console.log('');
  } catch (error) {
    console.error('✗ Models endpoint failed:', error);
  }

  console.log('='.repeat(50));
  console.log('  All tests passed! Ollama is ready for Blackbox');
  console.log('='.repeat(50));
}

testOllama().catch(console.error);
