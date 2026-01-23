/**
 * Types for PR generation
 */

import type { RuleImprovement } from '@blackbox/shared';

export interface PRGeneratorConfig {
  /**
   * GitHub owner (user or organization)
   */
  owner: string;

  /**
   * Repository name
   */
  repo: string;

  /**
   * GitHub token for API access
   */
  token: string;

  /**
   * Base branch to create PRs against
   */
  baseBranch?: string;

  /**
   * Branch prefix for improvement branches
   */
  branchPrefix?: string;

  /**
   * Local repository path
   */
  repoPath?: string;

  /**
   * Whether to auto-merge if tests pass
   */
  autoMerge?: boolean;

  /**
   * Required status checks before merge
   */
  requiredChecks?: string[];
}

export interface PRContent {
  /**
   * PR title
   */
  title: string;

  /**
   * PR body/description
   */
  body: string;

  /**
   * Labels to apply
   */
  labels?: string[];

  /**
   * Reviewers to request
   */
  reviewers?: string[];
}

export interface PRResult {
  /**
   * Whether the PR was created successfully
   */
  success: boolean;

  /**
   * PR number if created
   */
  prNumber?: number;

  /**
   * PR URL
   */
  prUrl?: string;

  /**
   * Branch name
   */
  branchName?: string;

  /**
   * Error message if failed
   */
  error?: string;
}

export interface FileChange {
  /**
   * File path relative to repo root
   */
  path: string;

  /**
   * File content
   */
  content: string;

  /**
   * Change type
   */
  type: 'create' | 'modify' | 'delete';
}

export interface CommitInfo {
  /**
   * Commit message
   */
  message: string;

  /**
   * Files to include in commit
   */
  files: FileChange[];
}

export interface ImprovementPR {
  /**
   * The improvement being applied
   */
  improvement: RuleImprovement;

  /**
   * File changes
   */
  changes: FileChange[];

  /**
   * PR content
   */
  content: PRContent;
}
