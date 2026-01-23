/**
 * Capture command - Start capturing LLM calls
 */

import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";

export const captureCommand = new Command("capture")
  .description("Capture LLM calls from your application")
  .option("-o, --output <path>", "Output directory for traces", "./traces")
  .option("-e, --endpoint <url>", "Langfuse endpoint", "http://localhost:3000")
  .option("--public-key <key>", "Langfuse public key")
  .option("--secret-key <key>", "Langfuse secret key")
  .action((options) => {
    const spinner = ora("Setting up capture...").start();

    try {
      console.log(chalk.blue("\n📡 Blackbox Capture\n"));

      console.log(chalk.gray("Configuration:"));
      console.log(chalk.gray(`  Output: ${options.output}`));
      console.log(chalk.gray(`  Endpoint: ${options.endpoint}`));

      spinner.succeed("Capture configured");

      console.log(chalk.green("\n✓ To capture LLM calls, use the @blackbox/capture SDK:"));
      console.log(
        chalk.cyan(`
  import { createCaptureClient } from '@blackbox/capture';

  const client = createCaptureClient({
    // OpenAI options
  }, {
    langfuse: {
      host: '${options.endpoint}',
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
    },
  });

  // Use client like regular OpenAI SDK
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Hello!' }],
  });
`)
      );
    } catch (error) {
      spinner.fail("Failed to set up capture");
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });
