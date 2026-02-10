/**
 * Unified LLM Client - Direct API calls using OMO configuration
 * Supports: Anthropic, Google Gemini, OpenAI(-compatible), DeepSeek, Antigravity proxy
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

        const providerType = provider.type || provider.name;

        switch (providerType) {
            case 'anthropic':
                return this.chatAnthropic(provider, messages, options);

            case 'antigravity':
                return this.chatAntigravity(provider, messages, options);

            case 'google':
                return this.chatGoogle(provider, messages, options);

            case 'openai':
                return this.chatOpenAI(provider, messages, options);

            case 'deepseek':
                return this.chatOpenAI(provider, messages, options, 'https://api.deepseek.com/v1');

            default:
                // Default to Anthropic-compatible API (most providers support this)
                console.warn(`🧠 Axon: 未知 provider type '${providerType}'，使用 Anthropic 兼容模式`);
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
     * Clean model string for API calls
     * "opencode/claude-opus-4-6" → "claude-opus-4-6"
     * "google/gemini-3-pro" → "gemini-3-pro"
     */
    private cleanModelName(model: string): string {
        // Remove any provider prefix like 'antigravity/', 'google/', 'opencode/', etc.
        return model.replace(/^[^/]+\//, '');
    }

    /**
     * Call Anthropic API directly (native Anthropic key)
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

        const model = this.cleanModelName(options?.model || provider.models?.[0] || 'claude-sonnet-4-20250514');

        const client = new AnthropicClient(apiKey, {
            model,
            provider: 'anthropic',
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens || 8000,
        }, provider.endpoint || 'https://api.anthropic.com/v1');

        return this.executeAnthropicChat(client, model, messages, options);
    }

    /**
     * Call via Antigravity proxy (Anthropic-compatible endpoint)
     * All opencode/* models route through this proxy
     */
    private async chatAntigravity(
        provider: OMOProvider,
        messages: LLMMessage[],
        options?: LLMOptions
    ): Promise<LLMResponse> {
        const apiKey = this.omoConfig.getProviderApiKey(provider);

        if (!apiKey) {
            throw new Error(`未找到 ${provider.name} 的 API 密钥 (Antigravity token 或环境变量均未设置)`);
        }

        // Antigravity proxy accepts the full model string (e.g. opencode/claude-opus-4-6)
        // but we clean it for display and pricing purposes
        const rawModel = options?.model || provider.models?.[0] || 'claude-sonnet-4-20250514';
        const displayModel = this.cleanModelName(rawModel);

        const client = new AnthropicClient(apiKey, {
            model: rawModel, // Pass the full model string to the proxy
            provider: 'anthropic',
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens || 8000,
        }, provider.endpoint || 'https://api.antigravity.ai/v1');

        return this.executeAnthropicChat(client, displayModel, messages, options);
    }

    /**
     * Shared Anthropic-protocol chat execution
     */
    private async executeAnthropicChat(
        client: AnthropicClient,
        model: string,
        messages: LLMMessage[],
        options?: LLMOptions
    ): Promise<LLMResponse> {
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
            model,
            tokens: {
                input: response.usage.input_tokens,
                output: response.usage.output_tokens,
            },
            cost: this.calculateCost(model, response.usage),
        };
    }

    /**
     * Call Google Gemini API directly (with GOOGLE_API_KEY)
     * If Antigravity token is used instead, routes through chatAntigravity()
     */
    private async chatGoogle(
        provider: OMOProvider,
        messages: LLMMessage[],
        options?: LLMOptions
    ): Promise<LLMResponse> {
        const apiKey = this.omoConfig.getProviderApiKey(provider);

        if (!apiKey) {
            throw new Error(`未找到 ${provider.name} 的 API 密钥`);
        }

        const model = this.cleanModelName(options?.model || provider.models?.[0] || 'gemini-2.0-flash');

        // If we're using the Antigravity token (not a real Google API key),
        // route through the Antigravity proxy which speaks Anthropic protocol
        const isAntigravityAuth = this.omoConfig.hasAntigravityAuth() &&
            apiKey === this.omoConfig.getAntigravityToken();

        if (isAntigravityAuth) {
            return this.chatAntigravity({
                ...provider,
                type: 'antigravity',
                endpoint: provider.endpoint || 'https://api.opencode.ai/v1',
            }, messages, options);
        }

        // Direct Google Gemini REST API
        const systemMessage = messages.find((m) => m.role === 'system');
        const chatMessages = messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            }));

        const endpoint = provider.endpoint || 'https://generativelanguage.googleapis.com/v1beta';
        const url = `${endpoint}/models/${model}:generateContent?key=${apiKey}`;

        const body: any = {
            contents: chatMessages,
            generationConfig: {
                temperature: options?.temperature ?? 0.7,
                maxOutputTokens: options?.maxTokens || 8000,
            },
        };

        if (systemMessage) {
            body.systemInstruction = { parts: [{ text: systemMessage.content }] };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as any;
            throw new Error(
                `Google API 调用失败 (${response.status}): ${errorData.error?.message || response.statusText}`
            );
        }

        const data = (await response.json()) as any;
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const usageMetadata = data.usageMetadata || {};

        return {
            content,
            model,
            tokens: {
                input: usageMetadata.promptTokenCount || 0,
                output: usageMetadata.candidatesTokenCount || 0,
            },
            cost: this.calculateCost(model, {
                input_tokens: usageMetadata.promptTokenCount || 0,
                output_tokens: usageMetadata.candidatesTokenCount || 0,
            }),
        };
    }

    /**
     * Call OpenAI-compatible API (OpenAI, DeepSeek, etc.)
     */
    private async chatOpenAI(
        provider: OMOProvider,
        messages: LLMMessage[],
        options?: LLMOptions,
        defaultEndpoint = 'https://api.openai.com/v1'
    ): Promise<LLMResponse> {
        const apiKey = this.omoConfig.getProviderApiKey(provider);

        if (!apiKey) {
            throw new Error(`未找到 ${provider.name} 的 API 密钥`);
        }

        // If using Antigravity token, route through proxy
        const isAntigravityAuth = this.omoConfig.hasAntigravityAuth() &&
            apiKey === this.omoConfig.getAntigravityToken();

        if (isAntigravityAuth) {
            return this.chatAntigravity({
                ...provider,
                type: 'antigravity',
            }, messages, options);
        }

        const model = this.cleanModelName(options?.model || provider.models?.[0] || 'gpt-4o');
        const endpoint = provider.endpoint || defaultEndpoint;
        const url = `${endpoint}/chat/completions`;

        const openaiMessages = messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: openaiMessages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens || 8000,
            }),
        });

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as any;
            throw new Error(
                `OpenAI API 调用失败 (${response.status}): ${errorData.error?.message || response.statusText}`
            );
        }

        const data = (await response.json()) as any;
        const content = data.choices?.[0]?.message?.content || '';
        const usage = data.usage || {};

        return {
            content,
            model,
            tokens: {
                input: usage.prompt_tokens || 0,
                output: usage.completion_tokens || 0,
            },
            cost: this.calculateCost(model, {
                input_tokens: usage.prompt_tokens || 0,
                output_tokens: usage.completion_tokens || 0,
            }),
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
