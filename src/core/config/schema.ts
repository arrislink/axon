/**
 * Configuration Schema using Zod
 */

import { z } from 'zod';

export const AgentConfigSchema = z.object({
  model: z.string().optional(),
  provider: z.enum(['anthropic', 'openai', 'google']).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
});

export const ToolsConfigSchema = z.object({
  openspec: z.object({
    enabled: z.boolean(),
    path: z.string(),
  }),
  beads: z.object({
    enabled: z.boolean(),
    path: z.string(),
    auto_commit: z.boolean(),
    commit_template: z.string().optional(),
  }),
  skills: z.object({
    enabled: z.boolean(),
    local_path: z.string(),
    global_path: z.string(),
    auto_match: z.boolean(),
  }),
});

export const SafetyConfigSchema = z.object({
  daily_token_limit: z.number().positive(),
  cost_alert_threshold: z.number().positive(),
  auto_pause_on_error: z.boolean(),
  max_retries: z.number().positive(),
});

export const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']),
  file: z.string(),
});

export const HooksConfigSchema = z
  .object({
    before_bead: z.string().optional(),
    after_bead: z.string().optional(),
    on_error: z.string().optional(),
  })
  .optional();

export const ConfigSchema = z.object({
  version: z.string(),
  project: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
  tools: ToolsConfigSchema,
  agents: z.object({
    sisyphus: AgentConfigSchema,
    oracle: AgentConfigSchema.optional(),
    background: AgentConfigSchema.optional(),
  }),
  safety: SafetyConfigSchema,
  logging: LoggingConfigSchema,
  hooks: HooksConfigSchema,
});

export type ValidatedConfig = z.infer<typeof ConfigSchema>;
