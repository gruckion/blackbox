/**
 * Run command - Full pipeline: replay, evaluate, improve, and PR
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFile, readdir, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createReplayEngine } from '@blackbox/replay';
import { createDefaultPipeline } from '@blackbox/evaluate';
import { loadRulesFile, analyzeTraces, createRuleGenerator } from '@blackbox/improve';
import { createPRGenerator } from '@blackbox/pr-generator';
import type { Trace, RuleImprovement } from '@blackbox/shared';

export const runCommand = new Command('run')
  .description('Run the full Blackbox pipeline')
  .option('-i, --input <path>', 'Input directory with traces', './traces')
  .option('-o, --output <path>', 'Output directory for all results', './blackbox-output')
  .option('-r, --rules <path>', 'Rules file to improve', './CLAUDE.md')
  .option('-m, --model <name>', 'Local model for replay', 'llama3.2:3b')
  .option('--ollama <url>', 'Ollama host', 'http://localhost:11434')
  .option('--gen-model <name>', 'Model for improvement generation', 'gpt-4o-mini')
  .option('--max-improvements <n>', 'Maximum improvements to generate', '5')
  .option('--create-pr', 'Create GitHub PRs for improvements')
  .option('--github-token <token>', 'GitHub token for PR creation')
  .option('--github-owner <owner>', 'GitHub repository owner')
  .option('--github-repo <repo>', 'GitHub repository name')
  .option('--skip-replay', 'Skip replay step (use existing traces)')
  .option('--skip-evaluate', 'Skip evaluation step (use existing evaluations)')
  .action(async (options) => {
    const spinner = ora('Starting Blackbox pipeline...').start();

    try {
      console.log(chalk.blue('\n🚀 Blackbox Pipeline\n'));

      const outputDir = options.output;
      const replayDir = join(outputDir, 'replays');
      const evalDir = join(outputDir, 'evaluations');

      await mkdir(outputDir, { recursive: true });
      await mkdir(replayDir, { recursive: true });
      await mkdir(evalDir, { recursive: true });

      // Step 1: Load traces
      spinner.text = 'Loading traces...';
      const traceFiles = await readdir(options.input).catch(() => []);
      const traces: Trace[] = [];

      for (const file of traceFiles) {
        if (file.endsWith('.json')) {
          const content = await readFile(join(options.input, file), 'utf-8');
          traces.push(JSON.parse(content));
        }
      }

      if (traces.length === 0) {
        spinner.fail('No traces found');
        console.log(chalk.yellow(`\nNo trace files found in ${options.input}`));
        console.log(chalk.gray('Capture traces first using the @blackbox/capture SDK'));
        return;
      }

      console.log(chalk.gray(`  Loaded ${traces.length} traces`));

      // Step 2: Replay (optional)
      let replayedTraces = traces;
      if (!options.skipReplay) {
        spinner.text = `Replaying ${traces.length} traces against ${options.model}...`;

        const replayEngine = createReplayEngine({
          ollamaHost: options.ollama,
          defaultModel: options.model,
          defaultMode: 'semi-live',
        });

        const replayResults = await replayEngine.replayBatch(traces);
        replayedTraces = replayResults.map(r => r.replayedTrace);

        // Save replay results
        for (let i = 0; i < replayResults.length; i++) {
          const outputFile = join(replayDir, `${traces[i].id}-replay.json`);
          await writeFile(outputFile, JSON.stringify(replayResults[i], null, 2));
        }

        console.log(chalk.gray(`  Replayed ${replayResults.length} traces`));
      } else {
        console.log(chalk.gray('  Skipping replay (--skip-replay)'));
      }

      // Step 3: Evaluate
      let evaluations = [];
      if (!options.skipEvaluate) {
        spinner.text = `Evaluating ${replayedTraces.length} traces...`;

        const pipeline = createDefaultPipeline();

        for (const trace of replayedTraces) {
          const result = await pipeline.evaluate(trace);
          evaluations.push(result);

          const outputFile = join(evalDir, `${trace.id}-eval.json`);
          await writeFile(outputFile, JSON.stringify(result, null, 2));
        }

        console.log(chalk.gray(`  Evaluated ${evaluations.length} traces`));
      } else {
        // Load existing evaluations
        console.log(chalk.gray('  Skipping evaluation (--skip-evaluate)'));
        const evalFiles = await readdir(evalDir).catch(() => []);
        for (const file of evalFiles) {
          if (file.endsWith('.json')) {
            const content = await readFile(join(evalDir, file), 'utf-8');
            evaluations.push(JSON.parse(content));
          }
        }
      }

      // Step 4: Analyze and Generate Improvements
      spinner.text = 'Analyzing and generating improvements...';

      const rules = await loadRulesFile(options.rules);
      const analysis = analyzeTraces(traces, evaluations, rules);

      if (analysis.opportunities.length === 0) {
        spinner.succeed('Pipeline complete - no improvements needed');
        console.log(chalk.green('\n✓ All traces passed quality checks'));
        return;
      }

      const generator = createRuleGenerator({
        model: options.genModel,
        maxImprovements: parseInt(options.maxImprovements, 10),
      });

      const improvements = await generator.generate(analysis, rules);
      console.log(chalk.gray(`  Generated ${improvements.length} improvements`));

      // Save improvements
      const improvementsFile = join(outputDir, 'improvements.json');
      await writeFile(improvementsFile, JSON.stringify(improvements, null, 2));

      // Step 5: Create PRs (optional)
      if (options.createPr && improvements.length > 0) {
        if (!options.githubToken || !options.githubOwner || !options.githubRepo) {
          console.log(chalk.yellow('\n⚠ PR creation requires --github-token, --github-owner, and --github-repo'));
        } else {
          spinner.text = 'Creating PRs for improvements...';

          const prGenerator = createPRGenerator({
            token: options.githubToken,
            owner: options.githubOwner,
            repo: options.githubRepo,
          });

          const prResults = await prGenerator.generatePRs(
            improvements,
            options.rules,
            (improvement: RuleImprovement) => {
              // Apply improvement to rules file content
              const newRule = `- ${improvement.improvedRule.content}\n`;
              return rules.content + '\n' + newRule;
            }
          );

          const successfulPRs = prResults.filter(r => r.success);
          console.log(chalk.gray(`  Created ${successfulPRs.length} PRs`));

          // Save PR results
          const prResultsFile = join(outputDir, 'pr-results.json');
          await writeFile(prResultsFile, JSON.stringify(prResults, null, 2));

          for (const pr of successfulPRs) {
            console.log(chalk.green(`    PR #${pr.prNumber}: ${pr.prUrl}`));
          }
        }
      }

      spinner.succeed('Pipeline complete');

      // Summary
      console.log(chalk.green('\n📊 Pipeline Summary\n'));
      console.log(chalk.gray(`  Traces processed: ${traces.length}`));
      console.log(chalk.gray(`  Evaluations run: ${evaluations.length}`));
      console.log(chalk.gray(`  Improvements generated: ${improvements.length}`));
      console.log(chalk.gray(`  Output directory: ${outputDir}`));

      if (improvements.length > 0 && !options.createPr) {
        console.log(chalk.yellow('\n💡 Run with --create-pr to create GitHub PRs for improvements'));
      }

    } catch (error) {
      spinner.fail('Pipeline failed');
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });
