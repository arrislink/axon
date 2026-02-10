/**
 * OMO Config Reader - Reads OhMyOpenCode provider configuration
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { parse } from 'yaml';
import type { OMOProvider } from './types';

interface OMOConfig {
  providers?: OMOProvider[];
  default_provider?: string;
  fallback_chain?: string[];
}

interface OpenCodeConfig {
  agents?: Record<string, { model?: string; variant?: string }>;
  provider?: Record<
    string,
    {
      models?: Record<string, unknown>;
      endpoint?: string;
    }
  >;
}

interface AntigravityAccount {
  token?: string;
  refreshToken?: string;
  enabled?: boolean;
}

interface AntigravityAccounts {
  accounts: AntigravityAccount[];
  activeIndex?: number;
}

/**
 * Map model prefix to actual LLM provider type
 */
function resolveProviderType(modelString: string): string {
  const [prefix] = (modelString || '').split('/');
  const typeMap: Record<string, string> = {
    opencode: 'antigravity', // opencode/* models go through Antigravity proxy
    anthropic: 'anthropic',
    google: 'google',
    openai: 'openai',
    mistral: 'mistral',
    deepseek: 'deepseek',
  };
  return typeMap[prefix] || prefix;
}

/**
 * Gets the OMO config file paths in priority order
 */
export function getOMOConfigPaths(): string[] {
  const home = homedir();
  return [
    `${home}/.omo/providers.yaml`,
    `${home}/.config/opencode/oh-my-opencode.json`,
    `${home}/.config/opencode/opencode.json`,
  ];
}

/**
 * Check if any OMO config exists
 */
export function hasOMOConfig(): boolean {
  return getOMOConfigPaths().some((path) => existsSync(path));
}

/**
 * Reads and manages OMO provider configuration
 */
export class OMOConfigReader {
  private providers: OMOProvider[] = [];
  private configSource = '';
  private defaultProvider: string | undefined;
  private fallbackChain: string[] = [];
  private antigravityToken: string | undefined;

  constructor() {
    this.loadConfig();
    this.loadAntigravityToken();
  }

  /**
   * Load configuration from available sources
   */
  private loadConfig(): void {
    const paths = getOMOConfigPaths();

    for (const path of paths) {
      if (existsSync(path)) {
        try {
          const content = readFileSync(path, 'utf-8');
          const currentProvidersCount = this.providers.length;

          if (path.endsWith('.yaml') || path.endsWith('.yml')) {
            this.loadYamlConfig(content);
          } else if (path.endsWith('.json')) {
            this.loadJsonConfig(content, path);
          }

          if (this.providers.length > currentProvidersCount) {
            // Use the first found file as primary source info, but keep going to merge others
            if (!this.configSource) {
              this.configSource = path;
            }
          }
        } catch (e) {
          console.warn(`Failed to parse config at ${path}:`, e);
        }
      }
    }

    // Always try to merge opencode.json providers to enrich model lists
    this.mergeOpenCodeProviders();

    // If we have antigravity token but no provider, add a virtual one
    this.ensureAntigravityProvider();
  }

  /**
   * Ensure antigravity provider exists if token is available
   */
  private ensureAntigravityProvider(): void {
    if (this.antigravityToken && !this.providers.some((p) => p.name === 'antigravity')) {
      this.providers.push({
        name: 'antigravity',
        type: 'antigravity',
        models: [
          'opencode/claude-sonnet-4-20250514',
          'opencode/claude-opus-4-6',
          'opencode/gemini-3-pro',
          'opencode/gemini-3-flash',
          'opencode/deepseek-chat',
          'opencode/deepseek-v3',
          'opencode/deepseek-r1',
          'opencode/kimi-k2.5-free',
          'opencode/minimax-m2.1-free',
          'opencode/big-pickle-free',
          'opencode/trinity-large-preview-free',
          'opencode/zen-pro',
          'opencode/zen-free',
        ],
        endpoint: 'https://api.antigravity.ai/v1',
      });
    }
  }

  /**
   * Load Antigravity auth token from accounts file
   */
  private loadAntigravityToken(): void {
    try {
      const accountsPath = `${homedir()}/.config/opencode/antigravity-accounts.json`;
      if (existsSync(accountsPath)) {
        const accounts = JSON.parse(readFileSync(accountsPath, 'utf-8')) as AntigravityAccounts;
        if (accounts.accounts?.length > 0) {
          // Find the first enabled account, or use activeIndex
          const activeIdx = accounts.activeIndex ?? 0;
          const account =
            accounts.accounts.find((a) => a.enabled !== false) || accounts.accounts[activeIdx];
          if (account) {
            this.antigravityToken = account.token || account.refreshToken;
          }
        }
      }
    } catch {
      // Silently ignore token extraction errors
    }
  }

  /**
   * Merge provider definitions from opencode.json into existing agents
   */
  private mergeOpenCodeProviders(): void {
    const opencodePath = `${homedir()}/.config/opencode/opencode.json`;
    if (!existsSync(opencodePath)) return;

    try {
      const content = readFileSync(opencodePath, 'utf-8');
      const config = JSON.parse(content) as OpenCodeConfig;

      if (config.provider) {
        for (const [name, details] of Object.entries(config.provider)) {
          const existing = this.providers.find((p) => p.name === name);
          const newModels = Object.keys(details.models || {});

          if (existing) {
            // Merge models
            const combined = new Set([...existing.models, ...newModels]);
            
            // Inject free models for OpenCode providers
            if (existing.type === 'antigravity' || existing.name === 'antigravity') {
              combined.add('opencode/kimi-k2.5-free');
              combined.add('opencode/minimax-m2.1-free');
              combined.add('opencode/big-pickle-free');
              combined.add('opencode/trinity-large-preview-free');
              combined.add('opencode/zen-free');
            }
            
            existing.models = Array.from(combined);
            if (!existing.endpoint && details.endpoint) {
              existing.endpoint = details.endpoint;
            }
          } else {
            this.providers.push({
              name,
              type: name,
              models: newModels,
              endpoint: details.endpoint,
            });
          }
        }
      }
    } catch {
      // Silently ignore
    }
  }

  private loadYamlConfig(content: string): void {
    const config = parse(content) as OMOConfig;
    if (config.providers) {
      this.providers = config.providers;
      this.defaultProvider = config.default_provider;
      this.fallbackChain = config.fallback_chain || [];
    }
  }

  private loadJsonConfig(content: string, _filePath?: string): void {
    const config = JSON.parse(content) as OpenCodeConfig;

    // Strategy 1: Map 'agents' to providers (oh-my-opencode.json style)
    if (config.agents) {
      this.providers = Object.entries(config.agents).map(([name, agent]) => {
        const resolvedType = resolveProviderType(agent.model || '');
        const models = [agent.model || 'unknown'];
        
        // Inject free models for opencode agents
        if (resolvedType === 'antigravity') {
          models.push(
            'opencode/kimi-k2.5-free',
            'opencode/minimax-m2.1-free',
            'opencode/big-pickle-free',
            'opencode/trinity-large-preview-free',
            'opencode/zen-free'
          );
        }
        
        return {
          name,
          models,
          type: resolvedType,
          endpoint: undefined,
          api_key: undefined,
        };
      });

      // Infer default from common agent names
      if (config.agents.sisyphus) this.defaultProvider = 'sisyphus';
    }

    // Strategy 2: Map 'provider' objects (opencode.json style)
    if (config.provider && this.providers.length === 0) {
      this.providers = Object.entries(config.provider).map(([name, details]) => ({
        name,
        type: name,
        models: Object.keys(details.models || {}),
        endpoint: details.endpoint,
      }));
    }
  }

  getProvider(name: string): OMOProvider | null {
    return this.providers.find((p) => p.name === name) || null;
  }

  getAllProviders(): OMOProvider[] {
    return [...this.providers];
  }

  getPrimaryProvider(): OMOProvider | null {
    // 1. Explicit default
    if (this.defaultProvider) {
      const p = this.getProvider(this.defaultProvider);
      if (p) return p;
    }

    // 2. Fallback chain
    for (const name of this.fallbackChain) {
      const p = this.getProvider(name);
      if (p) return p;
    }

    // 3. Priority by provider type (match by name OR type)
    const priority = ['antigravity', 'anthropic', 'openai', 'google'];
    for (const target of priority) {
      // Try exact name match first
      const byName = this.getProvider(target);
      if (byName) return byName;
      // Then try type match (e.g. sisyphus has type 'antigravity')
      const byType = this.providers.find((p) => p.type === target);
      if (byType) return byType;
    }

    return this.providers[0] || null;
  }

  isPrimary(name: string): boolean {
    const primary = this.getPrimaryProvider();
    return primary?.name === name;
  }

  getFailoverChain(): string[] {
    return this.fallbackChain.length > 0 ? this.fallbackChain : ['(Auto-detected)'];
  }

  hasProviders(): boolean {
    return this.providers.length > 0;
  }

  getConfigSource(): string {
    return this.configSource;
  }

  /**
   * Check if Antigravity auth is available
   */
  hasAntigravityAuth(): boolean {
    return !!this.antigravityToken;
  }

  /**
   * Get Antigravity token
   */
  getAntigravityToken(): string | undefined {
    return this.antigravityToken;
  }

  /**
   * Get provider API key with env var resolution
   * Resolution order:
   * 1. Explicit api_key in provider config (with ${ENV} expansion)
   * 2. Environment variable (e.g. ANTHROPIC_API_KEY)
   * 3. Antigravity token (universal fallback for proxy-based access)
   */
  getProviderApiKey(provider: OMOProvider): string | undefined {
    // 1. Explicit key from config
    if (provider.api_key) {
      const match = provider.api_key.match(/^\$\{(\w+)\}$/);
      return match ? process.env[match[1]] : provider.api_key;
    }

    // 2. Environment variable based on resolved provider type
    const type = provider.type || provider.name;
    const envMappings: Record<string, string[]> = {
      anthropic: ['ANTHROPIC_API_KEY'],
      openai: ['OPENAI_API_KEY'],
      google: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
      antigravity: ['ANTIGRAVITY_API_KEY'],
      deepseek: ['DEEPSEEK_API_KEY'],
    };

    const envVars = envMappings[type] || [`${type.toUpperCase()}_API_KEY`];
    for (const envVar of envVars) {
      const envKey = process.env[envVar];
      if (envKey) return envKey;
    }

    // 3. Antigravity token as universal fallback
    // Works for providers routed through Antigravity proxy (opencode/*, google/*)
    if (this.antigravityToken) {
      return this.antigravityToken;
    }

    return undefined;
  }
}
