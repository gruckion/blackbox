/**
 * Rules File Parser
 * Parses common rules file formats (CLAUDE.md, AGENTS.md)
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { Rule } from '@blackbox/shared';
import type { RulesFile } from './types.js';
import { createLogger } from '@blackbox/shared';

const logger = createLogger('rules-parser');

/**
 * Parse a markdown rules file
 */
function parseMarkdownRules(content: string, path: string): Rule[] {
  const rules: Rule[] = [];
  const lines = content.split('\n');

  let currentRule: Partial<Rule> | null = null;
  let currentCategory = 'general';
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;

    // Track headings for category
    const h2Match = line.match(/^##\s+(.+)$/);
    const h3Match = line.match(/^###\s+(.+)$/);

    if (h2Match) {
      currentCategory = h2Match[1].toLowerCase().replace(/\s+/g, '-');
      continue;
    }

    if (h3Match) {
      // Subsection, could be a rule name
      if (currentRule) {
        rules.push(currentRule as Rule);
      }
      currentRule = {
        id: `rule-${rules.length + 1}`,
        content: '',
        category: currentCategory,
        source: `${path}:${lineNumber}`,
      };
      continue;
    }

    // Look for bullet points as rules
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const ruleContent = bulletMatch[1].trim();
      if (ruleContent.length > 10) {
        // Ignore very short bullets
        rules.push({
          id: `rule-${rules.length + 1}`,
          content: ruleContent,
          category: currentCategory,
          source: `${path}:${lineNumber}`,
        });
      }
      continue;
    }

    // Look for numbered lists
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      const ruleContent = numberedMatch[1].trim();
      if (ruleContent.length > 10) {
        rules.push({
          id: `rule-${rules.length + 1}`,
          content: ruleContent,
          category: currentCategory,
          source: `${path}:${lineNumber}`,
        });
      }
      continue;
    }

    // Append to current rule if we have one
    if (currentRule && line.trim() && !line.startsWith('#')) {
      currentRule.content = (currentRule.content || '') + line.trim() + ' ';
    }
  }

  // Push final rule
  if (currentRule && currentRule.content) {
    rules.push(currentRule as Rule);
  }

  return rules;
}

/**
 * Load and parse a rules file
 */
export async function loadRulesFile(path: string): Promise<RulesFile> {
  if (!existsSync(path)) {
    logger.info(`Rules file not found at ${path}, creating empty rules`);
    return {
      path,
      content: '',
      rules: [],
      format: 'markdown',
    };
  }

  const content = await readFile(path, 'utf-8');

  // Detect format
  let format: RulesFile['format'] = 'markdown';
  if (path.endsWith('.yaml') || path.endsWith('.yml')) {
    format = 'yaml';
  } else if (path.endsWith('.json')) {
    format = 'json';
  }

  let rules: Rule[] = [];

  if (format === 'markdown') {
    rules = parseMarkdownRules(content, path);
  } else if (format === 'json') {
    try {
      const parsed = JSON.parse(content);
      rules = Array.isArray(parsed) ? parsed : parsed.rules || [];
    } catch {
      logger.warn(`Failed to parse JSON rules file: ${path}`);
    }
  }

  logger.info(`Loaded ${rules.length} rules from ${path}`);

  return {
    path,
    content,
    rules,
    format,
  };
}

/**
 * Save a rules file with modifications
 */
export async function saveRulesFile(
  original: RulesFile,
  modifications: Array<{
    type: 'add' | 'modify' | 'remove';
    rule: Rule;
    newContent?: string;
  }>
): Promise<string> {
  let content = original.content;

  for (const mod of modifications) {
    if (mod.type === 'add') {
      // Add new rule at the end of the appropriate section
      const category = mod.rule.category || 'general';
      const categoryPattern = new RegExp(`^##\\s+${category}`, 'im');
      const categoryMatch = content.match(categoryPattern);

      if (categoryMatch) {
        // Find the end of this section (next ## or end of file)
        const nextSectionMatch = content.slice(categoryMatch.index!).match(/\n##\s+/);
        const insertPos = nextSectionMatch
          ? categoryMatch.index! + nextSectionMatch.index!
          : content.length;

        content =
          content.slice(0, insertPos) +
          `\n- ${mod.rule.content}\n` +
          content.slice(insertPos);
      } else {
        // Add new section
        content += `\n\n## ${category}\n\n- ${mod.rule.content}\n`;
      }
    } else if (mod.type === 'modify' && mod.rule.source && mod.newContent) {
      // Find and replace the rule
      const sourceMatch = mod.rule.source.match(/:(\d+)$/);
      if (sourceMatch) {
        const lineNum = parseInt(sourceMatch[1], 10);
        const lines = content.split('\n');
        if (lineNum > 0 && lineNum <= lines.length) {
          lines[lineNum - 1] = `- ${mod.newContent}`;
          content = lines.join('\n');
        }
      }
    } else if (mod.type === 'remove' && mod.rule.source) {
      // Remove the rule line
      const sourceMatch = mod.rule.source.match(/:(\d+)$/);
      if (sourceMatch) {
        const lineNum = parseInt(sourceMatch[1], 10);
        const lines = content.split('\n');
        if (lineNum > 0 && lineNum <= lines.length) {
          lines.splice(lineNum - 1, 1);
          content = lines.join('\n');
        }
      }
    }
  }

  await writeFile(original.path, content, 'utf-8');
  logger.info(`Saved modifications to ${original.path}`);

  return content;
}

/**
 * Create a new rules file with default content
 */
export async function createRulesFile(path: string): Promise<RulesFile> {
  const defaultContent = `# CLAUDE.md

This file provides guidance to Claude Code when working with this codebase.

## General Rules

- Follow existing code patterns and conventions
- Write clear, self-documenting code
- Include error handling for edge cases

## Code Style

- Use consistent naming conventions
- Keep functions focused and single-purpose
- Add comments only where the logic isn't self-evident

## Testing

- Write tests for new functionality
- Ensure tests pass before committing
`;

  await writeFile(path, defaultContent, 'utf-8');

  return loadRulesFile(path);
}
