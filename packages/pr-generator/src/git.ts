/**
 * Git operations using simple-git
 */

import { existsSync, mkdirSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createLogger } from '@blackbox/shared';
import { type SimpleGit, simpleGit } from 'simple-git';
import type { CommitInfo, FileChange } from './types.js';

const logger = createLogger('git');

export class GitOperations {
  private readonly git: SimpleGit;
  private readonly repoPath: string;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current || 'main';
  }

  /**
   * Get current commit SHA
   */
  async getCurrentSha(): Promise<string> {
    const log = await this.git.log({ n: 1 });
    return log.latest?.hash || '';
  }

  /**
   * Check if working directory is clean
   */
  async isClean(): Promise<boolean> {
    const status = await this.git.status();
    return status.isClean();
  }

  /**
   * Create a new branch from current HEAD
   */
  async createBranch(branchName: string, checkout = true): Promise<void> {
    logger.info(`Creating branch: ${branchName}`);

    if (checkout) {
      await this.git.checkoutLocalBranch(branchName);
    } else {
      await this.git.branch([branchName]);
    }
  }

  /**
   * Checkout an existing branch
   */
  async checkout(branchName: string): Promise<void> {
    logger.info(`Checking out branch: ${branchName}`);
    await this.git.checkout(branchName);
  }

  /**
   * Delete a local branch
   */
  async deleteBranch(branchName: string, force = false): Promise<void> {
    logger.info(`Deleting branch: ${branchName}`);
    const flag = force ? '-D' : '-d';
    await this.git.branch([flag, branchName]);
  }

  /**
   * Apply file changes to the working directory
   */
  async applyChanges(changes: FileChange[]): Promise<void> {
    for (const change of changes) {
      const fullPath = join(this.repoPath, change.path);

      if (change.type === 'delete') {
        logger.info(`Deleting file: ${change.path}`);
        await unlink(fullPath);
      } else {
        logger.info(`${change.type === 'create' ? 'Creating' : 'Modifying'} file: ${change.path}`);

        // Ensure directory exists
        const dir = dirname(fullPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        await writeFile(fullPath, change.content, 'utf-8');
      }
    }
  }

  /**
   * Stage files for commit
   */
  async stageFiles(files: string[]): Promise<void> {
    logger.info(`Staging ${files.length} files`);
    await this.git.add(files);
  }

  /**
   * Create a commit
   */
  async commit(message: string): Promise<string> {
    logger.info(`Creating commit: ${message.slice(0, 50)}...`);
    const result = await this.git.commit(message);
    return result.commit;
  }

  /**
   * Apply changes and create a commit
   */
  async applyAndCommit(commitInfo: CommitInfo): Promise<string> {
    // Apply file changes
    await this.applyChanges(commitInfo.files);

    // Stage all changed files
    const filePaths = commitInfo.files.map((f) => f.path);
    await this.stageFiles(filePaths);

    // Create commit
    return this.commit(commitInfo.message);
  }

  /**
   * Push branch to remote
   */
  async push(branchName: string, remote = 'origin', force = false): Promise<void> {
    logger.info(`Pushing branch ${branchName} to ${remote}`);

    const options = force ? ['--force'] : [];
    await this.git.push(remote, branchName, options);
  }

  /**
   * Pull latest from remote
   */
  async pull(remote = 'origin', branch?: string): Promise<void> {
    const targetBranch = branch || (await this.getCurrentBranch());
    logger.info(`Pulling ${remote}/${targetBranch}`);
    await this.git.pull(remote, targetBranch);
  }

  /**
   * Fetch from remote
   */
  async fetch(remote = 'origin'): Promise<void> {
    logger.info(`Fetching from ${remote}`);
    await this.git.fetch(remote);
  }

  /**
   * Check if a branch exists locally
   */
  async branchExists(branchName: string): Promise<boolean> {
    const branches = await this.git.branchLocal();
    return branches.all.includes(branchName);
  }

  /**
   * Get list of changed files since a commit
   */
  async getChangedFiles(sinceCommit: string): Promise<string[]> {
    const diff = await this.git.diff(['--name-only', sinceCommit]);
    return diff.split('\n').filter(Boolean);
  }

  /**
   * Reset to a specific commit
   */
  async reset(commit: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed'): Promise<void> {
    logger.info(`Resetting to ${commit} (${mode})`);
    await this.git.reset([`--${mode}`, commit]);
  }

  /**
   * Get diff for files
   */
  async getDiff(files?: string[]): Promise<string> {
    if (files && files.length > 0) {
      return this.git.diff(['--', ...files]);
    }
    return this.git.diff();
  }

  /**
   * Stash changes
   */
  async stash(message?: string): Promise<void> {
    const args = message ? ['push', '-m', message] : ['push'];
    await this.git.stash(args);
  }

  /**
   * Pop stashed changes
   */
  async stashPop(): Promise<void> {
    await this.git.stash(['pop']);
  }
}

/**
 * Create git operations instance
 */
export function createGitOperations(repoPath?: string): GitOperations {
  return new GitOperations(repoPath);
}
