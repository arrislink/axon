import { AnthropicClient } from '../integrations/anthropic';
import { OpenCodeLLMClient } from './opencode-client';
import { UnifiedLLMClient } from './unified-client';
import { OMOConfigReader, hasOMOConfig } from './omo-config-reader';
import type { LLMMessage, LLMResponse, LLMOptions, LLMMode } from './types';
import { APIError } from '../../utils/errors';

/**
 * Main Axon LLM Client
 * Orchestrates between CLI, direct API, and fallback modes
 */
export class AxonLLMClient {
    private mode: LLMMode;
    private openCodeClient?: OpenCodeLLMClient;
    private unifiedClient?: UnifiedLLMClient;
    private anthropicClient?: AnthropicClient;
    private omoConfig: OMOConfigReader;

    constructor(preferredMode?: LLMMode) {
        this.omoConfig = new OMOConfigReader();
        this.mode = preferredMode || this.detectMode();
        this.initClient();
    }

    private detectedCommand: string[] = ['opencode'];

    /**
     * Detect the best available LLM mode
     */
    private detectMode(): LLMMode {
        // 1. Check if opencode CLI is available
        try {
            const proc = Bun.spawnSync(['opencode', '--version']);
            if (proc.success) {
                this.detectedCommand = ['opencode'];
                return 'cli';
            }
        } catch { }

        try {
            const proc = Bun.spawnSync(['bunx', 'opencode', '--version']);
            if (proc.success) {
                this.detectedCommand = ['bunx', 'opencode'];
                return 'cli';
            }
        } catch { }

        // 2. Check if OMO config exists for direct API
        if (hasOMOConfig() && this.omoConfig.hasProviders()) {
            return 'direct';
        }

        // 3. Fallback to env variables
        return 'fallback';
    }

    /**
     * Initialize the underlying client based on mode
     */
    private initClient(): void {
        switch (this.mode) {
            case 'cli':
                this.openCodeClient = new OpenCodeLLMClient('sisyphus', this.detectedCommand);
                break;
            case 'direct':
                this.unifiedClient = new UnifiedLLMClient(this.omoConfig);
                break;
            case 'fallback':
                const apiKey = process.env['ANTHROPIC_API_KEY'];
                if (apiKey) {
                    this.anthropicClient = new AnthropicClient(apiKey, {
                        model: 'claude-3-5-sonnet-20240620',
                        provider: 'anthropic',
                        temperature: 0.7,
                        max_tokens: 4000,
                    });
                }
                break;
        }
    }

    /**
     * Send chat messages
     */
    async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
        try {
            if (this.mode === 'cli' && this.openCodeClient) {
                return await this.openCodeClient.chat(messages, options);
            }

            if (this.mode === 'direct' && this.unifiedClient) {
                return await this.unifiedClient.chat(messages, options);
            }

            if (this.mode === 'fallback') {
                if (this.anthropicClient) {
                    return await this.chatAnthropicFallback(messages, options);
                }
                throw new APIError('未找到有效的 LLM 配置或 API 密钥', 401);
            }

            throw new Error(`未支持的 LLM 模式: ${this.mode}`);
        } catch (error) {
            // If CLI or direct fails, try auto-fallback
            if (this.mode !== 'fallback') {
                console.warn(`🧠 Axon: ${this.mode} 模式调用失败或响应为空，尝试回退...`);
                if (process.env['DEBUG']) console.error(error);
                this.mode = 'fallback';
                this.initClient();
                return await this.chat(messages, options);
            }
            throw error;
        }
    }

    /**
     * Fallback chat implementation using direct Anthropic API
     */
    private async chatAnthropicFallback(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
        if (!this.anthropicClient) throw new Error('Anthropic client not initialized');

        const systemMessage = messages.find(m => m.role === 'system');
        const chatMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            }));

        const response = await this.anthropicClient.chat(chatMessages, {
            model: options?.model,
            maxTokens: options?.maxTokens,
            system: systemMessage?.content || options?.system,
        });

        return {
            content: response.content,
            model: options?.model || 'claude-3-5-sonnet-20240620',
            tokens: {
                input: response.usage.input_tokens,
                output: response.usage.output_tokens,
            },
            cost: 0 // Fallback mode cost not tracked locally
        };
    }

    /**
     * Simple completion
     */
    async complete(prompt: string, options?: LLMOptions): Promise<string> {
        const result = await this.chat([{ role: 'user', content: prompt }], options);
        return result.content;
    }

    /**
     * Check if client is available
     */
    isAvailable(): boolean {
        return !!(this.openCodeClient || this.unifiedClient || this.anthropicClient);
    }

    /**
     * Get current mode
     */
    getMode(): LLMMode {
        return this.mode;
    }

    /**
     * Get mode description
     */
    getModeDescription(): string {
        switch (this.mode) {
            case 'cli': return 'OpenCode CLI (OMO Mode)';
            case 'direct': return 'Direct API (OMO Config)';
            case 'fallback': return 'Environment Variables (Fallback)';
            default: return 'Unknown';
        }
    }
}
