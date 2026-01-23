/**
 * Improve command - Generate rule improvements
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PipelineResult } from '@blackbox/evaluate';
import {
  analyzeTraces,
  createRuleGenerator,
  getAnalysisSummary,
  loadRulesFile,
} from '@blackbox/improve';
import type { Trace } from '@blackbox/shared';
import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';

export const improveCommand = new Command('improve')
  .description('Generate rule improvements from trace analysis')
  .option('-t, --traces <path>', 'Input directory with traces', './traces')
  .option('-e, --evaluations <path>', 'Input directory with evaluations', './eval-results')
  .option('-r, --rules <path>', 'Rules file to improve', './CLAUDE.md')
  .option('--model <name>', 'Model to use for generation', 'gpt-4o-mini')
  .option('--max <n>', 'Maximum improvements to generate', '5')
  .option('--dry-run', 'Show analysis without generating improvements')
  .action(async (options) => {
    const spinner = ora('Loading data...').start();

    try {
      console.log(chalk.blue('\n🔧 Blackbox Improve\n'));

      // Load traces
      const traceFiles = await readdir(options.traces).catch(() => []);
      const traces: Trace[] = [];

      for (const file of traceFiles) {
        if (file.endsWith('.json')) {
          const content = await readFile(join(options.traces, file), 'utf-8');
          traces.push(JSON.parse(content));
        }
      }

      // Load evaluations
      const evalFiles = await readdir(options.evaluations).catch(() => []);
      const evaluations: PipelineResult[] = [];

      for (const file of evalFiles) {
        if (file.endsWith('.json')) {
          const content = await readFile(join(options.evaluations, file), 'utf-8');
          evaluations.push(JSON.parse(content));
        }
      }

      if (traces.length === 0) {
        spinner.warn('No traces found');
        return;
      }

      spinner.text = `Loaded ${traces.length} traces and ${evaluations.length} evaluations`;

      // Load rules file
      const rules = await loadRulesFile(options.rules);
      spinner.text = `Loaded ${rules.rules.length} existing rules`;

      // Analyze traces
      spinner.text = 'Analyzing traces...';
      const analysis = analyzeTraces(traces, evaluations, rules);

      spinner.succeed('Analysis complete');

      // Show analysis summary
      console.log(chalk.gray(`\n${getAnalysisSummary(analysis)}`));

      if (options.dryRun) {
        console.log(chalk.yellow('\n--dry-run specified, skipping improvement generation'));
        return;
      }

      if (analysis.opportunities.length === 0) {
        console.log(chalk.green('\n✓ No improvement opportunities found'));
        return;
      }

      // Generate improvements
      spinner.start('Generating improvements...');

      const generator = createRuleGenerator({
        model: options.model,
        maxImprovements: Number.parseInt(options.max, 10),
      });

      const improvements = await generator.generate(analysis, rules);

      spinner.succeed(`Generated ${improvements.length} improvements`);

      // Display improvements
      console.log(chalk.green('\n📋 Generated Improvements:\n'));

      for (const improvement of improvements) {
        console.log(
          chalk.cyan(
            `[${(improvement.confidence * 100).toFixed(0)}%] ${improvement.improvedRule.content}`
          )
        );
        console.log(chalk.gray(`  Reason: ${improvement.reason}`));
        console.log(
          chalk.gray(`  Expected impact: ${improvement.evidence.tracesImproved} traces improved`)
        );
        console.log('');
      }

      console.log(chalk.yellow('Use `blackbox run` to create PRs for these improvements'));
    } catch (error) {
      spinner.fail('Improvement generation failed');
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });
