/**
 * Rules File Parser
 * Parses common rules file formats (CLAUDE.md, AGENTS.md)
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import type { Rule } from '@blackbox/shared';
import { createLogger } from '@blackbox/shared';
import type { RulesFile } from './types.js';

const logger = createLogger('rules-parser');

// Top-level regex patterns for markdown parsing
const H2_HEADING_REGEX = /^##\s+(.+)$/;
const H3_HEADING_REGEX = /^###\s+(.+)$/;
const BULLET_REGEX = /^[-*]\s+(.+)$/;
const NUMBERED_REGEX = /^\d+\.\s+(.+)$/;
const NEXT_SECTION_REGEX = /\n##\s+/;
const LINE_NUMBER_REGEX = /:(\d+)$/;
const WHITESPACE_REPLACE_REGEX = /\s+/g;

interface RuleModification {
  type: 'add' | 'modify' | 'remove';
  rule: Rule;
  newContent?: string;
}

interface ParseState {
  rules: Rule[];
  currentRule: Partial<Rule> | null;
  currentCategory: string;
}

/**
 * Create a rule from parsed content
 */
function createRule(
  content: string,
  category: string,
  path: string,
  lineNumber: number,
  existingRulesCount: number
): Rule {
  return {
    id: `rule-${existingRulesCount + 1}`,
    content,
    category,
    source: `${path}:${lineNumber}`,
  };
}

/**
 * Handle H2 heading line
 */
function handleH2Heading(line: string, state: ParseState): boolean {
  const match = line.match(H2_HEADING_REGEX);
  if (!match) {
    return false;
  }

  state.currentCategory = match[1].toLowerCase().replace(WHITESPACE_REPLACE_REGEX, '-');
  return true;
}

/**
 * Handle H3 heading line
 */
function handleH3Heading(
  line: string,
  state: ParseState,
  path: string,
  lineNumber: number
): boolean {
  const match = line.match(H3_HEADING_REGEX);
  if (!match) {
    return false;
  }

  if (state.currentRule) {
    state.rules.push(state.currentRule as Rule);
  }
  state.currentRule = createRule('', state.currentCategory, path, lineNumber, state.rules.length);
  return true;
}

/**
 * Handle bullet point line
 */
function handleBulletPoint(
  line: string,
  state: ParseState,
  path: string,
  lineNumber: number
): boolean {
  const match = line.match(BULLET_REGEX);
  if (!match) {
    return false;
  }

  const ruleContent = match[1].trim();
  if (ruleContent.length > 10) {
    state.rules.push(
      createRule(ruleContent, state.currentCategory, path, lineNumber, state.rules.length)
    );
  }
  return true;
}

/**
 * Handle numbered list line
 */
function handleNumberedList(
  line: string,
  state: ParseState,
  path: string,
  lineNumber: number
): boolean {
  const match = line.match(NUMBERED_REGEX);
  if (!match) {
    return false;
  }

  const ruleContent = match[1].trim();
  if (ruleContent.length > 10) {
    state.rules.push(
      createRule(ruleContent, state.currentCategory, path, lineNumber, state.rules.length)
    );
  }
  return true;
}

/**
 * Handle regular content line
 */
function handleContentLine(line: string, state: ParseState): void {
  if (state.currentRule && line.trim() && !line.startsWith('#')) {
    state.currentRule.content = `${(state.currentRule.content || '') + line.trim()} `;
  }
}

/**
 * Parse a markdown rules file
 */
function parseMarkdownRules(content: string, path: string): Rule[] {
  const lines = content.split('\n');
  const state: ParseState = {
    rules: [],
    currentRule: null,
    currentCategory: 'general',
  };

  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;

    if (handleH2Heading(line, state)) {
      continue;
    }
    if (handleH3Heading(line, state, path, lineNumber)) {
      continue;
    }
    if (handleBulletPoint(line, state, path, lineNumber)) {
      continue;
    }
    if (handleNumberedList(line, state, path, lineNumber)) {
      continue;
    }

    handleContentLine(line, state);
  }

  if (state.currentRule?.content) {
    state.rules.push(state.currentRule as Rule);
  }

  return state.rules;
}

/**
 * Add a new rule to content
 */
function applyAddModification(content: string, mod: RuleModification): string {
  const category = mod.rule.category || 'general';
  const categoryPattern = new RegExp(`^##\\s+${category}`, 'im');
  const categoryMatch = content.match(categoryPattern);

  if (categoryMatch && categoryMatch.index !== undefined) {
    const matchIndex = categoryMatch.index;
    const nextSectionMatch = content.slice(matchIndex).match(NEXT_SECTION_REGEX);
    const insertPos =
      nextSectionMatch?.index !== undefined ? matchIndex + nextSectionMatch.index : content.length;

    return `${content.slice(0, insertPos)}\n- ${mod.rule.content}\n${content.slice(insertPos)}`;
  }

  return `${content}\n\n## ${category}\n\n- ${mod.rule.content}\n`;
}

/**
 * Modify an existing rule in content
 */
function applyModifyModification(content: string, mod: RuleModification): string {
  if (!(mod.rule.source && mod.newContent)) {
    return content;
  }

  const sourceMatch = mod.rule.source.match(LINE_NUMBER_REGEX);
  if (!sourceMatch) {
    return content;
  }

  const lineNum = Number.parseInt(sourceMatch[1], 10);
  const lines = content.split('\n');

  if (lineNum > 0 && lineNum <= lines.length) {
    lines[lineNum - 1] = `- ${mod.newContent}`;
    return lines.join('\n');
  }

  return content;
}

/**
 * Remove a rule from content
 */
function applyRemoveModification(content: string, mod: RuleModification): string {
  if (!mod.rule.source) {
    return content;
  }

  const sourceMatch = mod.rule.source.match(LINE_NUMBER_REGEX);
  if (!sourceMatch) {
    return content;
  }

  const lineNum = Number.parseInt(sourceMatch[1], 10);
  const lines = content.split('\n');

  if (lineNum > 0 && lineNum <= lines.length) {
    lines.splice(lineNum - 1, 1);
    return lines.join('\n');
  }

  return content;
}

/**
 * Apply a single modification to content
 */
function applyModification(content: string, mod: RuleModification): string {
  switch (mod.type) {
    case 'add':
      return applyAddModification(content, mod);
    case 'modify':
      return applyModifyModification(content, mod);
    case 'remove':
      return applyRemoveModification(content, mod);
    default:
      return content;
  }
}

/**
 * Detect file format from path
 */
function detectFormat(path: string): RulesFile['format'] {
  if (path.endsWith('.yaml') || path.endsWith('.yml')) {
    return 'yaml';
  }
  if (path.endsWith('.json')) {
    return 'json';
  }
  return 'markdown';
}

/**
 * Parse JSON content into rules
 */
function parseJsonRules(content: string, path: string): Rule[] {
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.rules || [];
  } catch {
    logger.warn(`Failed to parse JSON rules file: ${path}`);
    return [];
  }
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
  const format = detectFormat(path);

  let rules: Rule[] = [];
  if (format === 'markdown') {
    rules = parseMarkdownRules(content, path);
  } else if (format === 'json') {
    rules = parseJsonRules(content, path);
  }

  logger.info(`Loaded ${rules.length} rules from ${path}`);

  return { path, content, rules, format };
}

/**
 * Save a rules file with modifications
 */
export async function saveRulesFile(
  original: RulesFile,
  modifications: RuleModification[]
): Promise<string> {
  let content = original.content;

  for (const mod of modifications) {
    content = applyModification(content, mod);
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
