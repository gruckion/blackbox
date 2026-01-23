/**
 * GitHub API operations using Octokit
 */

import { createLogger } from '@blackbox/shared';
import { Octokit } from '@octokit/rest';
import type { PRContent, PRGeneratorConfig, PRResult } from './types.js';

const logger = createLogger('github');

export class GitHubOperations {
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;

  constructor(config: PRGeneratorConfig) {
    this.octokit = new Octokit({
      auth: config.token,
    });
    this.owner = config.owner;
    this.repo = config.repo;
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    branchName: string,
    baseBranch: string,
    content: PRContent
  ): Promise<PRResult> {
    try {
      logger.info(`Creating PR: ${content.title}`);

      const response = await this.octokit.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title: content.title,
        body: content.body,
        head: branchName,
        base: baseBranch,
      });

      const prNumber = response.data.number;
      const prUrl = response.data.html_url;

      // Add labels if provided
      if (content.labels && content.labels.length > 0) {
        await this.addLabels(prNumber, content.labels);
      }

      // Request reviewers if provided
      if (content.reviewers && content.reviewers.length > 0) {
        await this.requestReviewers(prNumber, content.reviewers);
      }

      logger.info(`Created PR #${prNumber}: ${prUrl}`);

      return {
        success: true,
        prNumber,
        prUrl,
        branchName,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to create PR: ${message}`);

      return {
        success: false,
        error: message,
        branchName,
      };
    }
  }

  /**
   * Add labels to a PR
   */
  async addLabels(prNumber: number, labels: string[]): Promise<void> {
    try {
      await this.octokit.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        labels,
      });
      logger.info(`Added labels to PR #${prNumber}: ${labels.join(', ')}`);
    } catch (error) {
      logger.warn(`Failed to add labels: ${error}`);
    }
  }

  /**
   * Request reviewers for a PR
   */
  async requestReviewers(prNumber: number, reviewers: string[]): Promise<void> {
    try {
      await this.octokit.pulls.requestReviewers({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        reviewers,
      });
      logger.info(`Requested reviewers for PR #${prNumber}: ${reviewers.join(', ')}`);
    } catch (error) {
      logger.warn(`Failed to request reviewers: ${error}`);
    }
  }

  /**
   * Get PR status checks
   */
  async getPRChecks(prNumber: number): Promise<{
    status: 'pending' | 'success' | 'failure';
    checks: Array<{ name: string; status: string; conclusion: string | null }>;
  }> {
    const pr = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    const ref = pr.data.head.sha;

    const checkRuns = await this.octokit.checks.listForRef({
      owner: this.owner,
      repo: this.repo,
      ref,
    });

    const checks = checkRuns.data.check_runs.map((check) => ({
      name: check.name,
      status: check.status,
      conclusion: check.conclusion,
    }));

    // Determine overall status
    const hasFailures = checks.some((c) => c.conclusion === 'failure');
    const hasPending = checks.some((c) => c.status !== 'completed');

    let status: 'pending' | 'success' | 'failure' = 'success';
    if (hasFailures) {
      status = 'failure';
    } else if (hasPending) {
      status = 'pending';
    }

    return { status, checks };
  }

  /**
   * Merge a PR
   */
  async mergePR(
    prNumber: number,
    method: 'merge' | 'squash' | 'rebase' = 'squash'
  ): Promise<boolean> {
    try {
      await this.octokit.pulls.merge({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        merge_method: method,
      });
      logger.info(`Merged PR #${prNumber}`);
      return true;
    } catch (error) {
      logger.error(`Failed to merge PR #${prNumber}: ${error}`);
      return false;
    }
  }

  /**
   * Close a PR without merging
   */
  async closePR(prNumber: number): Promise<void> {
    await this.octokit.pulls.update({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      state: 'closed',
    });
    logger.info(`Closed PR #${prNumber}`);
  }

  /**
   * Add a comment to a PR
   */
  async addComment(prNumber: number, body: string): Promise<void> {
    await this.octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body,
    });
    logger.info(`Added comment to PR #${prNumber}`);
  }

  /**
   * Check if branch exists on remote
   */
  async branchExists(branchName: string): Promise<boolean> {
    try {
      await this.octokit.repos.getBranch({
        owner: this.owner,
        repo: this.repo,
        branch: branchName,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a remote branch
   */
  async deleteBranch(branchName: string): Promise<void> {
    try {
      await this.octokit.git.deleteRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branchName}`,
      });
      logger.info(`Deleted remote branch: ${branchName}`);
    } catch (error) {
      logger.warn(`Failed to delete branch ${branchName}: ${error}`);
    }
  }

  /**
   * Get default branch for the repo
   */
  async getDefaultBranch(): Promise<string> {
    const repo = await this.octokit.repos.get({
      owner: this.owner,
      repo: this.repo,
    });
    return repo.data.default_branch;
  }

  /**
   * List open PRs
   */
  async listOpenPRs(head?: string): Promise<Array<{ number: number; title: string; url: string }>> {
    const params: Parameters<typeof this.octokit.pulls.list>[0] = {
      owner: this.owner,
      repo: this.repo,
      state: 'open',
    };

    if (head) {
      params.head = `${this.owner}:${head}`;
    }

    const prs = await this.octokit.pulls.list(params);

    return prs.data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
    }));
  }
}

/**
 * Create GitHub operations instance
 */
export function createGitHubOperations(config: PRGeneratorConfig): GitHubOperations {
  return new GitHubOperations(config);
}
