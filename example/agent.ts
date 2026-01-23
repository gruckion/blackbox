/**
 * Example Coding Agent with Blackbox Capture
 *
 * This demonstrates how to integrate Blackbox capture into a coding agent.
 */

import { createCaptureClient } from '@blackbox/capture';

// Create a capture-enabled OpenAI client
const client = createCaptureClient(
  {
    apiKey: process.env.OPENAI_API_KEY,
  },
  {
    // Optional: Configure Langfuse for cloud tracing
    langfuse: {
      host: process.env.LANGFUSE_HOST || 'http://localhost:3000',
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
    },
  }
);

// Tools available to the agent
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The file path to read' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write content to a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The file path to write' },
          content: { type: 'string', description: 'The content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_command',
      description: 'Run a shell command',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The command to run' },
        },
        required: ['command'],
      },
    },
  },
];

// Simulated tool execution
function executeToolCall(name: string, args: Record<string, string>): string {
  switch (name) {
    case 'read_file':
      return `Contents of ${args.path}:\n// Sample file contents`;
    case 'write_file':
      return `Successfully wrote to ${args.path}`;
    case 'run_command':
      return `Command output: ${args.command}\nSuccess`;
    default:
      return 'Unknown tool';
  }
}

// Agent loop
async function runAgent(task: string) {
  console.log(`\n🤖 Starting agent for task: ${task}\n`);

  // Start a trace
  client.startTrace({
    name: `coding-task-${Date.now()}`,
    metadata: {
      task,
      timestamp: new Date().toISOString(),
    },
  });

  const messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>;
    tool_call_id?: string;
  }> = [
    {
      role: 'system',
      content: `You are a helpful coding assistant. Use the available tools to complete the task.
Always explain what you're doing before taking action.
Be efficient and don't repeat the same actions.`,
    },
    {
      role: 'user',
      content: task,
    },
  ];

  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    iterations++;
    console.log(`\n--- Iteration ${iterations} ---`);

    // Call the LLM
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
    });

    const assistantMessage = response.choices[0].message;
    console.log(`Assistant: ${assistantMessage.content || '(tool call)'}`);

    // Add assistant message to history
    messages.push(assistantMessage as typeof messages[number]);

    // Check if we're done
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      console.log('\n✅ Agent completed task');
      break;
    }

    // Execute tool calls
    for (const toolCall of assistantMessage.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`  Tool: ${toolCall.function.name}(${JSON.stringify(args)})`);

      const result = executeToolCall(toolCall.function.name, args);
      console.log(`  Result: ${result.slice(0, 100)}...`);

      // Add tool result to messages
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  // End trace
  const trace = client.endTrace({
    success: true,
  });

  console.log(`\n📊 Trace ID: ${trace.id}`);
  console.log(`   Calls: ${trace.calls.length}`);

  return trace;
}

// Example tasks
const tasks = [
  'Create a simple hello world function in JavaScript',
  'Read the package.json file and list the dependencies',
  'Fix the bug in the main.ts file where the loop never terminates',
];

async function main() {
  console.log('🚀 Blackbox Example Agent\n');
  console.log('This example demonstrates capturing LLM traces.\n');

  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  No OPENAI_API_KEY found, running in demo mode');
    console.log('Set OPENAI_API_KEY to run with real LLM calls\n');
    return;
  }

  // Run agent with first task
  const task = tasks[0];
  await runAgent(task);

  // Flush any buffered captures
  await client.flush();

  console.log('\n✨ Done! Traces have been captured.');
  console.log('Run `blackbox replay` to replay against local models.');
}

main().catch(console.error);
