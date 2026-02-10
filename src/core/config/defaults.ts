/**
 * Default configuration constants
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AxonConfig } from '../../types';

export const DEFAULT_CONFIG: AxonConfig = {
  version: '1.0',

  project: {
    name: 'my-project',
    description: '',
  },

  tools: {
    openspec: {
      enabled: true,
      path: '.openspec',
    },
    beads: {
      enabled: true,
      path: '.beads',
      auto_commit: true,
      commit_template: '✅ {bead_id}: {title}',
    },
    skills: {
      enabled: true,
      local_path: '.skills',
      global_path: join(homedir(), '.axon', 'skills'),
      auto_match: true,
    },
  },

  agents: {
    sisyphus: {
      temperature: 0.7,
      max_tokens: 8000,
    },
    oracle: {
      temperature: 0.3,
      max_tokens: 4000,
    },
    background: {
      temperature: 0.5,
      max_tokens: 4000,
    },
  },

  safety: {
    daily_token_limit: 1000000,
    cost_alert_threshold: 10.0,
    auto_pause_on_error: true,
    max_retries: 3,
  },

  logging: {
    level: 'info',
    file: '.axon/logs/axon.log',
  },
};

/**
 * Default directories structure for an Axon project
 */
export const DEFAULT_DIRECTORIES = ['.axon', '.axon/logs', '.openspec', '.beads', '.skills'];

/**
 * Model pricing (per 1M tokens)
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-opus-4-5-20251101': { input: 15.0, output: 75.0 },
  'claude-opus-4-6': { input: 15.0, output: 75.0 },
  'gemini-2.0-flash-exp': { input: 0.5, output: 0.5 },
  'gemini-3-pro': { input: 1.25, output: 3.75 },
  'gemini-3-flash': { input: 0.1, output: 0.4 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4o': { input: 5.0, output: 15.0 },
  'gpt-5.3-codex': { input: 10.0, output: 30.0 },
  'gpt-5-nano': { input: 0.5, output: 1.5 },
  'glm-4.7-free': { input: 0.0, output: 0.0 },
};
