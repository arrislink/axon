/**
 * Configuration types for Axon
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type Provider = 'anthropic' | 'openai' | 'google';

export interface AgentConfig {
  model?: string;
  provider?: Provider;
  temperature?: number;
  max_tokens?: number;
}

export interface ToolsConfig {
  openspec: {
    enabled: boolean;
    path: string;
  };
  beads: {
    enabled: boolean;
    path: string;
    auto_commit: boolean;
    commit_template?: string;
    commit_scope?: 'all' | 'artifacts';
    commit_graph?: boolean;
  };
  skills: {
    enabled: boolean;
    local_path: string;
    global_path: string;
    auto_match: boolean;
  };
}

export interface AgentsConfig {
  sisyphus: AgentConfig;
  oracle?: AgentConfig;
  background?: AgentConfig;
}

export interface SafetyConfig {
  daily_token_limit: number;
  cost_alert_threshold: number;
  auto_pause_on_error: boolean;
  max_retries: number;
}

export interface LoggingConfig {
  level: LogLevel;
  file: string;
}

export interface VerifyConfig {
  commands: string[];
}

export interface ProjectConfig {
  name: string;
  description?: string;
}

export interface HooksConfig {
  before_bead?: string;
  after_bead?: string;
  on_error?: string;
}

export interface AxonConfig {
  version: string;
  project: ProjectConfig;
  tools: ToolsConfig;
  agents: AgentsConfig;
  safety: SafetyConfig;
  logging: LoggingConfig;
  hooks?: HooksConfig;
  verify?: VerifyConfig;
}
