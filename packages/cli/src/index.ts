#!/usr/bin/env node

/**
 * Blackbox CLI - Nightly CI for Coding Agents
 */

import { Command } from 'commander';
import { config } from 'dotenv';

// Load environment variables
config();

// Import commands
import { captureCommand } from './commands/capture.js';
import { evaluateCommand } from './commands/evaluate.js';
import { improveCommand } from './commands/improve.js';
import { replayCommand } from './commands/replay.js';
import { runCommand } from './commands/run.js';
import { statusCommand } from './commands/status.js';

const program = new Command();

program
  .name('blackbox')
  .description('Nightly CI for Coding Agents - Capture, replay, evaluate, and improve')
  .version('0.1.0');

// Register commands
program.addCommand(captureCommand);
program.addCommand(replayCommand);
program.addCommand(evaluateCommand);
program.addCommand(improveCommand);
program.addCommand(runCommand);
program.addCommand(statusCommand);

// Parse arguments
program.parse(process.argv);
