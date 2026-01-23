/**
 * @blackbox/pr-generator - Git operations and GitHub PR generation
 */

// Export generator
export { createPRGenerator, PRGenerator } from './generator.js';

// Export git operations
export { createGitOperations, GitOperations } from './git.js';

// Export GitHub operations
export { createGitHubOperations, GitHubOperations } from './github.js';

// Export types
export type {
  CommitInfo,
  FileChange,
  ImprovementPR,
  PRContent,
  PRGeneratorConfig,
  PRResult,
} from './types.js';
