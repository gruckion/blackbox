/**
 * Integration Test for Blackbox Pipeline
 *
 * This test runs the full pipeline: parse traces → evaluate → analyze → generate improvements
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Import packages
import type { Trace } from '@blackbox/shared';
import { createDefaultPipeline } from '@blackbox/evaluate';
import { loadRulesFile, analyzeTraces, getAnalysisSummary } from '@blackbox/improve';

const EXAMPLE_DIR = join(__dirname, '..', 'example');

describe('Blackbox Integration', () => {
  let sampleTrace: Trace;
  let loopTrace: Trace;

  beforeAll(async () => {
    // Load sample traces
    const trace1Content = await readFile(
      join(EXAMPLE_DIR, 'traces', 'sample-trace-1.json'),
      'utf-8'
    );
    sampleTrace = JSON.parse(trace1Content);

    const trace2Content = await readFile(
      join(EXAMPLE_DIR, 'traces', 'sample-trace-2-loop.json'),
      'utf-8'
    );
    loopTrace = JSON.parse(trace2Content);
  });

  describe('Trace Loading', () => {
    it('should load valid traces', () => {
      expect(sampleTrace).toBeDefined();
      expect(sampleTrace.id).toBe('trace-sample-001');
      expect(sampleTrace.calls).toHaveLength(2);
    });

    it('should have proper trace structure', () => {
      expect(sampleTrace.calls[0]).toHaveProperty('id');
      expect(sampleTrace.calls[0]).toHaveProperty('model');
      expect(sampleTrace.calls[0]).toHaveProperty('messages');
      expect(sampleTrace.calls[0]).toHaveProperty('response');
    });

    it('should identify loop trace with issues', () => {
      expect(loopTrace.outcome?.success).toBe(false);
      expect(loopTrace.calls.length).toBeGreaterThan(3);
    });
  });

  describe('Evaluation Pipeline', () => {
    it('should create evaluation pipeline', () => {
      const pipeline = createDefaultPipeline();
      expect(pipeline).toBeDefined();
    });

    it('should evaluate a successful trace', async () => {
      const pipeline = createDefaultPipeline();
      const result = await pipeline.evaluate(sampleTrace);

      expect(result).toBeDefined();
      expect(result.traceId).toBe(sampleTrace.id);
      expect(result.results).toBeDefined();
      expect(result.aggregateScores).toBeDefined();
    });

    it('should detect loops in problematic trace', async () => {
      const pipeline = createDefaultPipeline();
      const result = await pipeline.evaluate(loopTrace);

      expect(result.hasIssues).toBe(true);

      // Should have loop detector results
      const loopResult = result.results.find(
        r => r.evaluatorName === 'loop-detector'
      );
      expect(loopResult).toBeDefined();
    });
  });

  describe('Rules Analysis', () => {
    it('should load rules file', async () => {
      const rules = await loadRulesFile(join(EXAMPLE_DIR, 'CLAUDE.md'));

      expect(rules).toBeDefined();
      expect(rules.path).toContain('CLAUDE.md');
      expect(rules.rules.length).toBeGreaterThan(0);
    });

    it('should analyze traces and find patterns', async () => {
      const pipeline = createDefaultPipeline();

      // Evaluate both traces
      const eval1 = await pipeline.evaluate(sampleTrace);
      const eval2 = await pipeline.evaluate(loopTrace);

      const rules = await loadRulesFile(join(EXAMPLE_DIR, 'CLAUDE.md'));

      const analysis = analyzeTraces(
        [sampleTrace, loopTrace],
        [eval1, eval2],
        rules
      );

      expect(analysis).toBeDefined();
      expect(analysis.traceCount).toBe(2);

      // Should identify failure patterns from the loop trace
      expect(analysis.failurePatterns.length).toBeGreaterThan(0);
    });

    it('should generate improvement opportunities', async () => {
      const pipeline = createDefaultPipeline();
      const eval2 = await pipeline.evaluate(loopTrace);

      const rules = await loadRulesFile(join(EXAMPLE_DIR, 'CLAUDE.md'));

      const analysis = analyzeTraces([loopTrace], [eval2], rules);

      // Should have at least one improvement opportunity
      expect(analysis.opportunities.length).toBeGreaterThan(0);

      // Opportunities should have required fields
      const opp = analysis.opportunities[0];
      expect(opp.id).toBeDefined();
      expect(opp.priority).toBeGreaterThanOrEqual(0);
      expect(opp.type).toBeDefined();
      expect(opp.description).toBeDefined();
    });

    it('should produce readable summary', async () => {
      const pipeline = createDefaultPipeline();
      const eval1 = await pipeline.evaluate(sampleTrace);
      const eval2 = await pipeline.evaluate(loopTrace);

      const rules = await loadRulesFile(join(EXAMPLE_DIR, 'CLAUDE.md'));
      const analysis = analyzeTraces([sampleTrace, loopTrace], [eval1, eval2], rules);

      const summary = getAnalysisSummary(analysis);

      expect(summary).toBeDefined();
      expect(summary).toContain('Analysis of 2 traces');
    });
  });

  describe('Full Pipeline Flow', () => {
    it('should complete full analysis flow without errors', async () => {
      // 1. Load traces
      const traces = [sampleTrace, loopTrace];

      // 2. Evaluate traces
      const pipeline = createDefaultPipeline();
      const evaluations = await Promise.all(
        traces.map(t => pipeline.evaluate(t))
      );

      expect(evaluations).toHaveLength(2);

      // 3. Load and analyze rules
      const rules = await loadRulesFile(join(EXAMPLE_DIR, 'CLAUDE.md'));
      const analysis = analyzeTraces(traces, evaluations, rules);

      expect(analysis).toBeDefined();

      // 4. Verify results
      expect(analysis.traceCount).toBe(2);
      expect(analysis.opportunities).toBeDefined();

      console.log('\n--- Integration Test Summary ---');
      console.log(getAnalysisSummary(analysis));
    });
  });
});
