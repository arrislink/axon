/**
 * OMO Config Reader - Reads OhMyOpenCode provider configuration
 */

import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { parse } from 'yaml';
import type { OMOProvider } from './types';

interface OMOConfig {
  providers?: OMOProvider[];
  default_provider?: string;
  fallback_chain?: string[];
}

interface OpenCodeConfig {
  agents?: Record<string, { model?: string; variant?: string }>;
  provider?: Record<string, any>;
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

  constructor() {
    this.loadConfig();
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

          if (path.endsWith('.yaml') || path.endsWith('.yml')) {
            this.loadYamlConfig(content);
          } else if (path.endsWith('.json')) {
            this.loadJsonConfig(content);
          }

          if (this.providers.length > 0) {
            this.configSource = path;
            break; // Stop after finding valid config
          }
        } catch (e) {
          console.warn(`Failed to parse config at ${path}:`, e);
        }
      }
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

  private loadJsonConfig(content: string): void {
    const config = JSON.parse(content) as OpenCodeConfig;

    // Strategy 1: Map 'agents' to providers (oh-my-opencode.json style)
    if (config.agents) {
      this.providers = Object.entries(config.agents).map(([name, agent]) => {
        const [providerType] = (agent.model || '').split('/');
        return {
          name,
          models: [agent.model || 'unknown'],
          type: providerType || 'unknown',
          endpoint: undefined,
          api_key: undefined, // JSON configs usually don't have raw keys
        };
      });

      // Infer default from common agent names
      if (config.agents['sisyphus']) this.defaultProvider = 'sisyphus';
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

    // 3. Priority list
    const priority = ['antigravity', 'anthropic', 'openai', 'google', 'sisyphus'];
    for (const name of priority) {
      const p = this.getProvider(name);
      if (p) return p;
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
   * Get provider API key with env var resolution
   * Note: API keys are rarely in JSON configs, usually in ~/.config/opencode/antigravity-accounts.json
   * or environment variables.
   */
  getProviderApiKey(provider: OMOProvider): string | undefined {
    if (provider.api_key) {
      const match = provider.api_key.match(/^\$\{(\w+)\}$/);
      return match ? process.env[match[1]] : provider.api_key;
    }

    // Fallback for known provider types
    const type = provider.type || provider.name;
    const envVar = `${type.toUpperCase()}_API_KEY`;
    const envKey = process.env[envVar];
    if (envKey) return envKey;

    // Try antigravity token as universal fallback
    try {
      const accountsPath = `${homedir()}/.config/opencode/antigravity-accounts.json`;
      if (existsSync(accountsPath)) {
        const accounts = JSON.parse(readFileSync(accountsPath, 'utf-8'));
        if (accounts.accounts?.length > 0) {
          const activeIdx = accounts.activeIndex ?? 0;
          const account = accounts.accounts[activeIdx];
          return account?.token || account?.refreshToken;
        }
      }
    } catch {
      // Silently ignore antigravity token extraction errors
    }

    return undefined;
  }
}
