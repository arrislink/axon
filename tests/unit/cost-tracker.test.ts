/**
 * Unit tests for CostTracker
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import { CostTracker } from '../../src/core/agents/cost-tracker';
import { CostLimitError } from '../../src/utils/errors';

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker({
      daily_token_limit: 100000,
      cost_alert_threshold: 1.0,
      auto_pause_on_error: true,
      max_retries: 3,
    });
  });

  test('records usage correctly', () => {
    const cost = tracker.recordUsage('claude-sonnet-4-20250514', 1000);

    expect(cost).toBeGreaterThan(0);
    expect(tracker.getDailyTokens()).toBe(1000);
  });

  test('calculates cost based on model', () => {
    const cost1 = tracker.calculateCost('claude-sonnet-4-20250514', 1000000);
    const cost2 = tracker.calculateCost('gemini-2.0-flash-exp', 1000000);

    // Claude should be more expensive than Gemini
    expect(cost1).toBeGreaterThan(cost2);
  });

  test('throws error when limit exceeded', async () => {
    // Use most of the limit
    tracker.recordUsage('claude-sonnet-4-20250514', 90000);

    // Try to use more than remaining
    await expect(tracker.checkLimit(20000)).rejects.toThrow(CostLimitError);
  });

  test('allows usage within limit', async () => {
    tracker.recordUsage('claude-sonnet-4-20250514', 10000);

    // Should not throw
    await tracker.checkLimit(5000);
  });

  test('returns correct statistics', () => {
    tracker.recordUsage('claude-sonnet-4-20250514', 5000);
    tracker.recordUsage('gemini-2.0-flash-exp', 3000);
    tracker.recordUsage('claude-sonnet-4-20250514', 2000);

    const stats = tracker.getStatistics();

    expect(stats.total_tokens).toBe(10000);
    expect(stats.by_model['claude-sonnet-4-20250514'].tokens).toBe(7000);
    expect(stats.by_model['gemini-2.0-flash-exp'].tokens).toBe(3000);
  });

  test('calculates remaining tokens', () => {
    tracker.recordUsage('claude-sonnet-4-20250514', 10000);

    const stats = tracker.getStatistics();
    expect(stats.remaining_tokens).toBe(90000);
  });

  test('reset clears all records', () => {
    tracker.recordUsage('claude-sonnet-4-20250514', 10000);
    tracker.reset();

    expect(tracker.getDailyTokens()).toBe(0);
    expect(tracker.getDailyCost()).toBe(0);
  });
});
