/**
 * Evaluate command - Evaluate traces for quality
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createDefaultPipeline } from '@blackbox/evaluate';
import type { EvaluationResult, EvaluationScore, Trace } from '@blackbox/shared';
import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';

export const evaluateCommand = new Command('evaluate')
  .description('Evaluate traces for quality and issues')
  .option('-i, --input <path>', 'Input directory with traces', './traces')
  .option('-o, --output <path>', 'Output directory for evaluation results', './eval-results')
  .option('--phoenix <url>', 'Phoenix endpoint', 'http://localhost:6006')
  .option('--llm-judge', 'Enable LLM judge evaluation')
  .option('--loop-detection', 'Enable loop detection', true)
  .action(async (options) => {
    const spinner = ora('Loading traces...').start();

    try {
      console.log(chalk.blue('\n📊 Blackbox Evaluate\n'));

      // Load traces
      const traceFiles = await readdir(options.input).catch(() => []);
      const traces: Trace[] = [];

      for (const file of traceFiles) {
        if (file.endsWith('.json')) {
          const content = await readFile(join(options.input, file), 'utf-8');
          traces.push(JSON.parse(content));
        }
      }

      if (traces.length === 0) {
        spinner.warn('No traces found');
        console.log(chalk.yellow(`\nNo trace files found in ${options.input}`));
        return;
      }

      spinner.text = `Loaded ${traces.length} traces`;

      // Create evaluation pipeline
      const pipeline = createDefaultPipeline({
        phoenix: {
          host: options.phoenix,
        },
      });

      spinner.text = `Evaluating ${traces.length} traces...`;

      // Evaluate traces
      const results: Awaited<ReturnType<typeof pipeline.evaluate>>[] = [];
      for (const trace of traces) {
        const result = await pipeline.evaluate(trace);
        results.push(result);
      }

      spinner.succeed(`Evaluated ${results.length} traces`);

      // Save results
      await mkdir(options.output, { recursive: true });

      for (const result of results) {
        const outputFile = join(options.output, `${result.traceId}-eval.json`);
        await writeFile(outputFile, JSON.stringify(result, null, 2));
      }

      console.log(chalk.green(`\n✓ Results saved to ${options.output}`));

      // Show summary
      console.log(chalk.gray('\nSummary:'));

      // Calculate averages
      let totalOverall = 0;
      let loopCount = 0;

      for (const result of results) {
        totalOverall += result.aggregateScores.overall || 0;

        const loopResult = result.results.find(
          (r: EvaluationResult) => r.evaluatorName === 'loop-detector'
        );
        if (loopResult) {
          const loopScore = loopResult.scores.find((s: EvaluationScore) => s.name === 'loop-score');
          if (loopScore && loopScore.value < 1) {
            loopCount++;
          }
        }
      }

      const avgOverall = totalOverall / results.length;
      console.log(chalk.gray(`  Average Overall Score: ${(avgOverall * 100).toFixed(1)}%`));
      if (loopCount > 0) {
        console.log(chalk.yellow(`  Traces with loops: ${loopCount}`));
      }
    } catch (error) {
      spinner.fail('Evaluation failed');
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });
