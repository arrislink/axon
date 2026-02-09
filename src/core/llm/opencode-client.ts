/**
 * OpenCode LLM Client - CLI-based LLM calls through OMO
 */

import type { LLMMessage, LLMResponse, LLMOptions } from './types';

/**
 * LLM Client that calls OpenCode CLI
 * Automatically uses OMO configured providers
 */
export class OpenCodeLLMClient {
    private agent: string;

    constructor(agent: 'sisyphus' | 'oracle' | 'background' = 'sisyphus') {
        this.agent = agent;
    }

    /**
     * Send chat messages and get response via OpenCode CLI
     */
    async chat(messages: LLMMessage[], _options?: LLMOptions): Promise<LLMResponse> {
        const prompt = this.formatMessages(messages);

        try {
            // Call opencode CLI with JSON output
            const proc = Bun.spawn(['opencode', '--agent', this.agent, '--json-output'], {
                stdin: new Blob([prompt]),
                stdout: 'pipe',
                stderr: 'pipe',
            });

            // Read response
            const output = await new Response(proc.stdout).text();
            const stderr = await new Response(proc.stderr).text();

            const exitCode = await proc.exited;
            if (exitCode !== 0) {
                throw new Error(`OpenCode CLI 执行失败: ${stderr}`);
            }

            // Parse JSON response
            const parsed = JSON.parse(output);

            return {
                content: parsed.response || parsed.content || output,
                model: parsed.model_used || parsed.model || 'unknown',
                tokens: {
                    input: parsed.usage?.input_tokens || 0,
                    output: parsed.usage?.output_tokens || 0,
                },
                cost: parsed.usage?.cost_usd || 0,
            };
        } catch (error) {
            const err = error as Error;
            throw new Error(`OpenCode CLI 调用失败: ${err.message}`);
        }
    }

    /**
     * Stream chat response via OpenCode CLI
     */
    async *streamChat(
        messages: LLMMessage[],
        _options?: LLMOptions
    ): AsyncGenerator<string, LLMResponse, unknown> {
        const prompt = this.formatMessages(messages);

        const proc = Bun.spawn(
            ['opencode', '--agent', this.agent, '--stream', '--json-metadata'],
            {
                stdin: new Blob([prompt]),
                stdout: 'pipe',
                stderr: 'pipe',
            }
        );

        let fullResponse = '';
        let metadata: {
            model_used?: string;
            usage?: { input_tokens: number; output_tokens: number };
            cost_usd?: number;
        } | null = null;

        const decoder = new TextDecoder();
        const reader = proc.stdout.getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);
                const lines = text.split('\n');

                for (const line of lines) {
                    if (line.startsWith('DATA:')) {
                        const content = line.slice(5);
                        fullResponse += content;
                        yield content;
                    } else if (line.startsWith('META:')) {
                        metadata = JSON.parse(line.slice(5));
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        return {
            content: fullResponse,
            model: metadata?.model_used || 'unknown',
            tokens: {
                input: metadata?.usage?.input_tokens || 0,
                output: metadata?.usage?.output_tokens || 0,
            },
            cost: metadata?.cost_usd || 0,
        };
    }

    /**
     * Simple completion (single message)
     */
    async complete(prompt: string, options?: LLMOptions): Promise<string> {
        const result = await this.chat([{ role: 'user', content: prompt }], options);
        return result.content;
    }

    /**
     * Format messages for OpenCode CLI input
     */
    private formatMessages(messages: LLMMessage[]): string {
        return messages.map((m) => `<${m.role}>\n${m.content}\n</${m.role}>`).join('\n\n');
    }
}
