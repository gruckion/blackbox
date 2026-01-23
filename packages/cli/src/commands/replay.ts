/**
 * Replay command - Replay traces against local models
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createReplayEngine, type ReplayEngineOptions } from '@blackbox/replay';
import type { Trace } from '@blackbox/shared';
import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';

export const replayCommand = new Command('replay')
  .description('Replay captured traces against local models')
  .option('-i, --input <path>', 'Input directory with traces', './traces')
  .option('-o, --output <path>', 'Output directory for replay results', './replay-results')
  .option('-m, --model <name>', 'Model to replay against', 'llama3.2:3b')
  .option('--litellm <url>', 'LiteLLM proxy URL', 'http://localhost:4000')
  .option('--mode <mode>', 'Replay mode (exact, semi-live, live)', 'semi-live')
  .option('--concurrency <n>', 'Number of concurrent replays', '2')
  .action(async (options) => {
    const spinner = ora('Loading traces...').start();

    try {
      console.log(chalk.blue('\n🔄 Blackbox Replay\n'));

      // Load traces from input directory
      const traceFiles = await readdir(options.input).catch(() => []);
      const traces: Trace[] = [];

      for (const file of traceFiles) {
        if (file.endsWith('.json')) {
          const content = await readFile(join(options.input, file), 'utf-8');
          traces.push(JSON.parse(content));
        }
      }

      if (traces.length === 0) {
        spinner.warn('No traces found in input directory');
        console.log(chalk.yellow(`\nNo trace files found in ${options.input}`));
        console.log(chalk.gray('Run with captured traces or use blackbox capture first'));
        return;
      }

      spinner.text = `Loaded ${traces.length} traces`;

      // Create replay engine
      const config: ReplayEngineOptions = {
        ollamaHost: options.litellm.replace(':4000', ':11434'), // Map to Ollama port
        defaultModel: options.model,
        defaultMode: options.mode,
      };

      const engine = createReplayEngine(config);

      spinner.text = `Replaying ${traces.length} traces against ${options.model}...`;

      // Replay traces
      const results = await engine.replayBatch(traces, {
        concurrency: Number.parseInt(options.concurrency, 10),
      });

      spinner.succeed(`Replayed ${results.length} traces`);

      // Save results
      await mkdir(options.output, { recursive: true });

      for (const result of results) {
        const outputFile = join(options.output, `${result.result.originalTraceId}-replay.json`);
        await writeFile(outputFile, JSON.stringify(result, null, 2));
      }

      console.log(chalk.green(`\n✓ Results saved to ${options.output}`));

      // Show summary
      const successful = results.filter((r) => r.replayedTrace).length;
      const failed = results.length - successful;

      console.log(chalk.gray('\nSummary:'));
      console.log(chalk.gray(`  Total: ${results.length}`));
      console.log(chalk.green(`  Successful: ${successful}`));
      if (failed > 0) {
        console.log(chalk.red(`  Failed: ${failed}`));
      }
    } catch (error) {
      spinner.fail('Replay failed');
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });
