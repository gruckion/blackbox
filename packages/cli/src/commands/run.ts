/**
 * Run command - Full pipeline: replay, evaluate, improve, and PR
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createDefaultPipeline, type PipelineResult } from "@blackbox/evaluate";
import {
  analyzeTraces,
  createRuleGenerator,
  loadRulesFile,
  type RulesFile,
} from "@blackbox/improve";
import { createPRGenerator } from "@blackbox/pr-generator";
import { createReplayEngine } from "@blackbox/replay";
import type { RuleImprovement, Trace } from "@blackbox/shared";
import chalk from "chalk";
import { Command } from "commander";
import type { Ora } from "ora";
import ora from "ora";

interface PipelineOptions {
  input: string;
  output: string;
  rules: string;
  model: string;
  ollama: string;
  genModel: string;
  maxImprovements: string;
  createPr?: boolean;
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  skipReplay?: boolean;
  skipEvaluate?: boolean;
}

interface PipelineDirs {
  outputDir: string;
  replayDir: string;
  evalDir: string;
}

async function loadTraces(inputDir: string): Promise<Trace[]> {
  const traceFiles = await readdir(inputDir).catch(() => []);
  const traces: Trace[] = [];

  for (const file of traceFiles) {
    if (file.endsWith(".json")) {
      const content = await readFile(join(inputDir, file), "utf-8");
      traces.push(JSON.parse(content));
    }
  }

  return traces;
}

async function replayTraces(
  traces: Trace[],
  options: PipelineOptions,
  dirs: PipelineDirs,
  spinner: Ora
): Promise<Trace[]> {
  if (options.skipReplay) {
    console.log(chalk.gray("  Skipping replay (--skip-replay)"));
    return traces;
  }

  spinner.text = `Replaying ${traces.length} traces against ${options.model}...`;

  const replayEngine = createReplayEngine({
    ollamaHost: options.ollama,
    defaultModel: options.model,
    defaultMode: "semi-live",
  });

  const replayResults = await replayEngine.replayBatch(traces);

  for (let i = 0; i < replayResults.length; i++) {
    const outputFile = join(dirs.replayDir, `${traces[i].id}-replay.json`);
    await writeFile(outputFile, JSON.stringify(replayResults[i], null, 2));
  }

  console.log(chalk.gray(`  Replayed ${replayResults.length} traces`));
  return replayResults.map((r) => r.replayedTrace);
}

async function evaluateTraces(
  traces: Trace[],
  options: PipelineOptions,
  dirs: PipelineDirs,
  spinner: Ora
): Promise<PipelineResult[]> {
  if (options.skipEvaluate) {
    console.log(chalk.gray("  Skipping evaluation (--skip-evaluate)"));
    const evalFiles = await readdir(dirs.evalDir).catch(() => []);
    const evaluations: PipelineResult[] = [];

    for (const file of evalFiles) {
      if (file.endsWith(".json")) {
        const content = await readFile(join(dirs.evalDir, file), "utf-8");
        evaluations.push(JSON.parse(content));
      }
    }

    return evaluations;
  }

  spinner.text = `Evaluating ${traces.length} traces...`;
  const pipeline = createDefaultPipeline();
  const evaluations: PipelineResult[] = [];

  for (const trace of traces) {
    const result = await pipeline.evaluate(trace);
    evaluations.push(result);

    const outputFile = join(dirs.evalDir, `${trace.id}-eval.json`);
    await writeFile(outputFile, JSON.stringify(result, null, 2));
  }

  console.log(chalk.gray(`  Evaluated ${evaluations.length} traces`));
  return evaluations;
}

async function createPullRequests(
  improvements: RuleImprovement[],
  rules: RulesFile,
  options: PipelineOptions,
  dirs: PipelineDirs,
  spinner: Ora
): Promise<void> {
  if (!options.createPr || improvements.length === 0) {
    return;
  }

  if (!(options.githubToken && options.githubOwner && options.githubRepo)) {
    console.log(
      chalk.yellow("\n⚠ PR creation requires --github-token, --github-owner, and --github-repo")
    );
    return;
  }

  spinner.text = "Creating PRs for improvements...";

  const prGenerator = createPRGenerator({
    token: options.githubToken,
    owner: options.githubOwner,
    repo: options.githubRepo,
  });

  const prResults = await prGenerator.generatePRs(improvements, options.rules, (improvement) => {
    const newRule = `- ${improvement.improvedRule.content}\n`;
    return `${rules.content}\n${newRule}`;
  });

  const successfulPRs = prResults.filter((r) => r.success);
  console.log(chalk.gray(`  Created ${successfulPRs.length} PRs`));

  const prResultsFile = join(dirs.outputDir, "pr-results.json");
  await writeFile(prResultsFile, JSON.stringify(prResults, null, 2));

  for (const pr of successfulPRs) {
    console.log(chalk.green(`    PR #${pr.prNumber}: ${pr.prUrl}`));
  }
}

function printSummary(
  traces: Trace[],
  evaluations: PipelineResult[],
  improvements: RuleImprovement[],
  options: PipelineOptions,
  dirs: PipelineDirs
): void {
  console.log(chalk.green("\n📊 Pipeline Summary\n"));
  console.log(chalk.gray(`  Traces processed: ${traces.length}`));
  console.log(chalk.gray(`  Evaluations run: ${evaluations.length}`));
  console.log(chalk.gray(`  Improvements generated: ${improvements.length}`));
  console.log(chalk.gray(`  Output directory: ${dirs.outputDir}`));

  if (improvements.length > 0 && !options.createPr) {
    console.log(chalk.yellow("\n💡 Run with --create-pr to create GitHub PRs for improvements"));
  }
}

export const runCommand = new Command("run")
  .description("Run the full Blackbox pipeline")
  .option("-i, --input <path>", "Input directory with traces", "./traces")
  .option("-o, --output <path>", "Output directory for all results", "./blackbox-output")
  .option("-r, --rules <path>", "Rules file to improve", "./CLAUDE.md")
  .option("-m, --model <name>", "Local model for replay", "llama3.2:3b")
  .option("--ollama <url>", "Ollama host", "http://localhost:11434")
  .option("--gen-model <name>", "Model for improvement generation", "gpt-4o-mini")
  .option("--max-improvements <n>", "Maximum improvements to generate", "5")
  .option("--create-pr", "Create GitHub PRs for improvements")
  .option("--github-token <token>", "GitHub token for PR creation")
  .option("--github-owner <owner>", "GitHub repository owner")
  .option("--github-repo <repo>", "GitHub repository name")
  .option("--skip-replay", "Skip replay step (use existing traces)")
  .option("--skip-evaluate", "Skip evaluation step (use existing evaluations)")
  .action(async (options: PipelineOptions) => {
    const spinner = ora("Starting Blackbox pipeline...").start();

    try {
      console.log(chalk.blue("\n🚀 Blackbox Pipeline\n"));

      const dirs: PipelineDirs = {
        outputDir: options.output,
        replayDir: join(options.output, "replays"),
        evalDir: join(options.output, "evaluations"),
      };

      await mkdir(dirs.outputDir, { recursive: true });
      await mkdir(dirs.replayDir, { recursive: true });
      await mkdir(dirs.evalDir, { recursive: true });

      // Step 1: Load traces
      spinner.text = "Loading traces...";
      const traces = await loadTraces(options.input);

      if (traces.length === 0) {
        spinner.fail("No traces found");
        console.log(chalk.yellow(`\nNo trace files found in ${options.input}`));
        console.log(chalk.gray("Capture traces first using the @blackbox/capture SDK"));
        return;
      }

      console.log(chalk.gray(`  Loaded ${traces.length} traces`));

      // Step 2: Replay
      const replayedTraces = await replayTraces(traces, options, dirs, spinner);

      // Step 3: Evaluate
      const evaluations = await evaluateTraces(replayedTraces, options, dirs, spinner);

      // Step 4: Analyze and Generate Improvements
      spinner.text = "Analyzing and generating improvements...";
      const rules = await loadRulesFile(options.rules);
      const analysis = analyzeTraces(traces, evaluations, rules);

      if (analysis.opportunities.length === 0) {
        spinner.succeed("Pipeline complete - no improvements needed");
        console.log(chalk.green("\n✓ All traces passed quality checks"));
        return;
      }

      const generator = createRuleGenerator({
        model: options.genModel,
        maxImprovements: Number.parseInt(options.maxImprovements, 10),
      });

      const improvements = await generator.generate(analysis, rules);
      console.log(chalk.gray(`  Generated ${improvements.length} improvements`));

      const improvementsFile = join(dirs.outputDir, "improvements.json");
      await writeFile(improvementsFile, JSON.stringify(improvements, null, 2));

      // Step 5: Create PRs
      await createPullRequests(improvements, rules, options, dirs, spinner);

      spinner.succeed("Pipeline complete");
      printSummary(traces, evaluations, improvements, options, dirs);
    } catch (error) {
      spinner.fail("Pipeline failed");
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });
