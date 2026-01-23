#!/usr/bin/env npx tsx
/**
 * Test script to verify LiteLLM gateway is working
 * Run with: npx tsx scripts/test-litellm.ts
 */

const LITELLM_HOST = process.env.LITELLM_HOST || 'http://localhost:4000';
const LITELLM_KEY = process.env.LITELLM_MASTER_KEY || 'sk-blackbox-litellm-key';

interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface ModelsResponse {
  object: string;
  data: ModelInfo[];
}

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function testLiteLLM() {
  console.log('='.repeat(50));
  console.log('  LiteLLM Gateway Test');
  console.log('='.repeat(50));
  console.log(`Host: ${LITELLM_HOST}\n`);

  // Test 1: Health check
  console.log('[1/4] Checking LiteLLM health...');
  try {
    const response = await fetch(`${LITELLM_HOST}/health`, {
      headers: { Authorization: `Bearer ${LITELLM_KEY}` },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    console.log('✓ LiteLLM is healthy\n');
  } catch (error) {
    console.error('✗ Failed to connect to LiteLLM');
    console.error('  Make sure docker-compose is running: docker-compose up -d');
    console.error('  Error:', error);
    process.exit(1);
  }

  // Test 2: List available models
  console.log('[2/4] Listing available models...');
  try {
    const response = await fetch(`${LITELLM_HOST}/v1/models`, {
      headers: { Authorization: `Bearer ${LITELLM_KEY}` },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as ModelsResponse;
    console.log(`✓ Found ${data.data?.length || 0} models`);

    if (data.data?.length) {
      console.log('Available models:');
      for (const model of data.data.slice(0, 10)) {
        console.log(`  - ${model.id}`);
      }
      if (data.data.length > 10) {
        console.log(`  ... and ${data.data.length - 10} more`);
      }
    }
    console.log('');
  } catch (error) {
    console.error('✗ Failed to list models:', error);
  }

  // Test 3: Test chat completion with local model (if available)
  console.log('[3/4] Testing local model (llama3.2:3b via Ollama)...');
  try {
    const response = await fetch(`${LITELLM_HOST}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LITELLM_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        messages: [{ role: 'user', content: 'Say "Hello from local LLM!" and nothing else.' }],
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`⚠ Local model not available (${response.status})`);
      console.log(`  This is expected if Ollama is not running`);
      console.log(`  Error: ${errorText.slice(0, 100)}`);
    } else {
      const data = (await response.json()) as ChatResponse;
      console.log('✓ Local model working');
      console.log(`  Response: "${data.choices?.[0]?.message?.content?.trim()}"`);
      if (data.usage) {
        console.log(`  Tokens: ${data.usage.total_tokens}`);
      }
    }
    console.log('');
  } catch (error) {
    console.log('⚠ Local model test skipped (Ollama may not be running)');
    console.log('');
  }

  // Test 4: Test routing info
  console.log('[4/4] Checking model routing configuration...');
  try {
    const response = await fetch(`${LITELLM_HOST}/model/info`, {
      headers: { Authorization: `Bearer ${LITELLM_KEY}` },
    });
    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>;
      console.log('✓ Model routing info available');
      console.log(`  Configured models: ${Object.keys(data).length}`);
    } else {
      console.log('⚠ Model info endpoint returned:', response.status);
    }
    console.log('');
  } catch (error) {
    console.log('⚠ Could not fetch model info');
  }

  console.log('='.repeat(50));
  console.log('  LiteLLM gateway is configured');
  console.log('='.repeat(50));
  console.log('');
  console.log('Next steps:');
  console.log('  1. Set OPENAI_API_KEY and/or ANTHROPIC_API_KEY in .env');
  console.log('  2. Start Ollama for local model testing');
  console.log('  3. Configure Langfuse keys for tracing');
}

testLiteLLM().catch(console.error);
