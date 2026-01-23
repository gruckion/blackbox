/**
 * Status command - Check service health
 */

import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'ok' | 'error' | 'unknown';
  message?: string;
  responseTime?: number;
}

async function checkService(name: string, url: string): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    const responseTime = Date.now() - start;

    if (response.ok) {
      return { name, url, status: 'ok', responseTime };
    }
    return {
      name,
      url,
      status: 'error',
      message: `HTTP ${response.status}`,
      responseTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return { name, url, status: 'error', message };
  }
}

export const statusCommand = new Command('status')
  .description('Check health of Blackbox services')
  .option('--langfuse <url>', 'Langfuse URL', 'http://localhost:3000')
  .option('--phoenix <url>', 'Phoenix URL', 'http://localhost:6006')
  .option('--litellm <url>', 'LiteLLM URL', 'http://localhost:4000')
  .option('--ollama <url>', 'Ollama URL', 'http://localhost:11434')
  .action(async (options) => {
    const spinner = ora('Checking services...').start();

    console.log(chalk.blue('\n🔍 Blackbox Service Status\n'));

    const services = [
      { name: 'Langfuse', url: `${options.langfuse}/api/public/health` },
      { name: 'Phoenix', url: options.phoenix },
      { name: 'LiteLLM', url: `${options.litellm}/health` },
      { name: 'Ollama', url: `${options.ollama}/api/tags` },
    ];

    const results: ServiceStatus[] = [];

    for (const service of services) {
      spinner.text = `Checking ${service.name}...`;
      const status = await checkService(service.name, service.url);
      results.push(status);
    }

    spinner.stop();

    // Display results
    const maxNameLen = Math.max(...results.map((r) => r.name.length));

    for (const result of results) {
      const nameStr = result.name.padEnd(maxNameLen + 2);
      const urlStr = chalk.gray(`(${result.url})`);

      if (result.status === 'ok') {
        const timeStr = result.responseTime ? chalk.gray(` ${result.responseTime}ms`) : '';
        console.log(chalk.green(`  ✓ ${nameStr}`) + urlStr + timeStr);
      } else {
        const msgStr = result.message ? chalk.red(` - ${result.message}`) : '';
        console.log(chalk.red(`  ✗ ${nameStr}`) + urlStr + msgStr);
      }
    }

    // Summary
    const healthy = results.filter((r) => r.status === 'ok').length;
    const total = results.length;

    console.log('');
    if (healthy === total) {
      console.log(chalk.green(`✓ All ${total} services healthy`));
    } else if (healthy > 0) {
      console.log(chalk.yellow(`⚠ ${healthy}/${total} services healthy`));
    } else {
      console.log(chalk.red('✗ No services responding'));
    }

    // Docker tip
    if (healthy < total) {
      console.log(chalk.gray('\nStart services with: docker compose up -d'));
    }

    // Ollama models
    const ollamaStatus = results.find((r) => r.name === 'Ollama');
    if (ollamaStatus?.status === 'ok') {
      console.log(chalk.gray('\nChecking Ollama models...'));

      try {
        const response = await fetch(`${options.ollama}/api/tags`);
        const data = (await response.json()) as { models?: Array<{ name: string; size: number }> };

        if (data.models && data.models.length > 0) {
          console.log(chalk.gray('Available models:'));
          for (const model of data.models) {
            const sizeGB = (model.size / 1e9).toFixed(1);
            console.log(chalk.gray(`  - ${model.name} (${sizeGB}GB)`));
          }
        } else {
          console.log(
            chalk.yellow('No models installed. Pull a model with: ollama pull llama3.2:3b')
          );
        }
      } catch {
        // Ignore Ollama model check errors
      }
    }
  });
