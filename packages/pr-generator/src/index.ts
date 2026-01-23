/**
 * @blackbox/pr-generator - Git operations and GitHub PR generation
 */

// Export generator
export { PRGenerator, createPRGenerator } from './generator.js';

// Export git operations
export { GitOperations, createGitOperations } from './git.js';

// Export GitHub operations
export { GitHubOperations, createGitHubOperations } from './github.js';

// Export types
export type {
  PRGeneratorConfig,
  PRContent,
  PRResult,
  FileChange,
  CommitInfo,
  ImprovementPR,
} from './types.js';
