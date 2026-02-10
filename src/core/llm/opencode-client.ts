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
    private command: string[];

    constructor(agent: 'sisyphus' | 'oracle' | 'background' = 'sisyphus', command: string[] = ['opencode']) {
        this.agent = agent;
        this.command = command;
    }

    /**
     * Send chat messages and get response via OpenCode CLI
     */
    async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
        const iterator = this.streamChat(messages, options);
        let result = await iterator.next();
        while (!result.done) {
            result = await iterator.next();
        }
        return result.value;
    }

    /**
     * Stream chat response via OpenCode CLI
     */
    async *streamChat(
        messages: LLMMessage[],
        options?: LLMOptions
    ): AsyncGenerator<string, LLMResponse, unknown> {
        const prompt = this.formatMessages(messages);

        const args = [...this.command, 'run', '--agent', this.agent, '--format', 'json'];

        if (options?.model) {
            // If model is "provider/model", pass it directly. 
            // If just "model", let opencode decide or prepend provider if needed?
            // Opencode expects "provider/model" usually.
            args.push('--model', options.model);
        }

        const proc = Bun.spawn(args, {
            stdin: new Blob([prompt]),
            stdout: 'pipe',
            stderr: 'pipe',
        });

        let fullResponse = '';
        let metadata = {
            model: 'unknown',
            tokens: { input: 0, output: 0 },
            cost: 0
        };

        const decoder = new TextDecoder();
        const reader = proc.stdout.getReader();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line

                for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                        const event = JSON.parse(line);

                        // Extract model info (usually in the first message or configuration events)
                        if (event.type === 'config' && event.part?.model) {
                            metadata.model = event.part.model;
                        } else if (event.model && metadata.model === 'unknown') {
                            metadata.model = event.model;
                        }

                        // Handle various text event structures
                        if (event.type === 'text' && event.part?.text) {
                            const text = event.part.text;
                            fullResponse += text;
                            yield text;
                        } else if (event.type === 'content' && event.part?.content) {
                            const text = event.part.content;
                            fullResponse += text;
                            yield text;
                        } else if (event.type === 'step_finish') {
                            if (event.part?.snapshot) {
                                // Ignore snapshot
                            }
                            if (event.part?.tokens) {
                                metadata.tokens.input = event.part.tokens.input || 0;
                                metadata.tokens.output = event.part.tokens.output || 0;
                            }
                            if (event.part?.cost) {
                                metadata.cost = event.part.cost;
                            }
                        }
                    } catch (e) {
                        // Ignore parse errors for non-JSON lines (if any)
                    }
                }
            }
        } finally {
            reader.releaseLock();
            proc.kill(); // Ensure process is killed
        }

        const exitCode = await proc.exited;
        if (exitCode !== 0) {
            const stderr = await new Response(proc.stderr).text();
            throw new Error(`OpenCode CLI Error: ${stderr || 'Unknown error'}`);
        }

        return {
            content: fullResponse,
            model: metadata.model, // TODO: Extract actual model if possible
            tokens: metadata.tokens,
            cost: metadata.cost,
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
