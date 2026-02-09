/**
 * OMO Config Reader - Reads OhMyOpenCode provider configuration
 */

import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { parse } from 'yaml';
import type { OMOProvider } from './types';

/**
 * Gets the OMO config file path
 */
export function getOMOConfigPath(): string {
    return `${homedir()}/.omo/providers.yaml`;
}

/**
 * Check if OMO config exists
 */
export function hasOMOConfig(): boolean {
    return existsSync(getOMOConfigPath());
}

/**
 * Reads and manages OMO provider configuration
 */
export class OMOConfigReader {
    private providers: OMOProvider[] = [];

    constructor() {
        this.loadProviders();
    }

    /**
     * Load providers from OMO config file
     */
    private loadProviders(): void {
        const configPath = getOMOConfigPath();

        if (!existsSync(configPath)) {
            this.providers = [];
            return;
        }

        try {
            const content = readFileSync(configPath, 'utf-8');
            const config = parse(content) as { providers?: OMOProvider[] };
            this.providers = config.providers || [];
        } catch {
            this.providers = [];
        }
    }

    /**
     * Get provider by name
     */
    getProvider(name: string): OMOProvider | null {
        return this.providers.find((p) => p.name === name) || null;
    }

    /**
     * Get all configured providers
     */
    getAllProviders(): OMOProvider[] {
        return [...this.providers];
    }

    /**
     * Get primary provider based on priority
     * Priority: antigravity (cheapest) → anthropic → openai → google
     */
    getPrimaryProvider(): OMOProvider | null {
        const priority = ['antigravity', 'anthropic', 'openai', 'google'];

        for (const name of priority) {
            const provider = this.getProvider(name);
            if (provider) return provider;
        }

        // Return first available provider if none in priority list
        return this.providers[0] || null;
    }

    /**
     * Check if any providers are configured
     */
    hasProviders(): boolean {
        return this.providers.length > 0;
    }

    /**
     * Get provider API key, resolving environment variables
     */
    getProviderApiKey(provider: OMOProvider): string | undefined {
        if (!provider.api_key) return undefined;

        // Resolve ${VAR} patterns
        const match = provider.api_key.match(/^\$\{(\w+)\}$/);
        if (match) {
            return process.env[match[1]];
        }

        return provider.api_key;
    }
}
