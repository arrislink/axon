/**
 * Unified LLM Client - Direct API calls using OMO configuration
 */

import { AnthropicClient } from '../integrations/anthropic';
import type { LLMMessage, LLMResponse, LLMOptions, OMOProvider } from './types';
import { OMOConfigReader } from './omo-config-reader';
import { MODEL_PRICING } from '../config/defaults';

/**
 * Unified LLM Client that reads OMO config and makes direct API calls
 */
export class UnifiedLLMClient {
    private omoConfig: OMOConfigReader;

    constructor(omoConfig?: OMOConfigReader) {
        this.omoConfig = omoConfig || new OMOConfigReader();
    }

    /**
     * Send chat messages using the best available provider
     */
    async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
        const provider = this.omoConfig.getPrimaryProvider();

        if (!provider) {
            throw new Error('未找到可用的 LLM Provider');
        }

        switch (provider.name) {
            case 'anthropic':
            case 'antigravity':
                return this.chatAnthropic(provider, messages, options);

            default:
                // Default to Anthropic-compatible API
                return this.chatAnthropic(provider, messages, options);
        }
    }

    /**
     * Simple completion (single message)
     */
    async complete(prompt: string, options?: LLMOptions): Promise<string> {
        const result = await this.chat([{ role: 'user', content: prompt }], options);
        return result.content;
    }

    /**
     * Call Anthropic or Anthropic-compatible API (like Antigravity)
     */
    private async chatAnthropic(
        provider: OMOProvider,
        messages: LLMMessage[],
        options?: LLMOptions
    ): Promise<LLMResponse> {
        const apiKey = this.omoConfig.getProviderApiKey(provider) || process.env['ANTHROPIC_API_KEY'];

        if (!apiKey) {
            throw new Error(`未找到 ${provider.name} 的 API 密钥`);
        }

        const client = new AnthropicClient(apiKey, {
            model: options?.model || provider.models?.[0] || 'claude-sonnet-4-20250514',
            provider: 'anthropic',
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens || 8000,
        }, provider.endpoint);

        // Filter out system messages for Anthropic API
        const systemMessage = messages.find((m) => m.role === 'system');
        const chatMessages = messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            }));

        const response = await client.chat(chatMessages, {
            system: systemMessage?.content || options?.system,
        });

        return {
            content: response.content,
            model: options?.model || provider.models?.[0] || 'unknown',
            tokens: {
                input: response.usage.input_tokens,
                output: response.usage.output_tokens,
            },
            cost: this.calculateCost(options?.model || provider.models?.[0] || 'unknown', response.usage),
        };
    }

    /**
     * Calculate cost based on model pricing
     */
    private calculateCost(
        model: string,
        usage: { input_tokens: number; output_tokens: number }
    ): number {
        const rate = MODEL_PRICING[model] || { input: 3.0, output: 15.0 };
        const inputCost = (usage.input_tokens / 1_000_000) * rate.input;
        const outputCost = (usage.output_tokens / 1_000_000) * rate.output;
        return inputCost + outputCost;
    }
}
