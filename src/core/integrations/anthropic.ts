/**
 * Vendor-neutral LLM HTTP client for Anthropic-compatible APIs
 */

import type { AgentConfig } from '../../types';
import { APIError } from '../../utils/errors';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  system?: string;
}

interface AnthropicResponse {
  content?: Array<{
    type: string;
    text?: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  error?: {
    message?: string;
  };
}

/**
 * Generic HTTP client for Anthropic-compatible APIs (Anthropic, Antigravity, OMO)
 */
export class AnthropicClient {
  private apiKey: string;
  private defaultConfig: AgentConfig;
  private baseURL: string;

  constructor(
    apiKey: string,
    defaultConfig: AgentConfig,
    baseURL = 'https://api.anthropic.com/v1',
  ) {
    if (!apiKey) {
      throw new APIError('API 密钥未设置', 401);
    }
    this.apiKey = apiKey;
    this.defaultConfig = defaultConfig;
    this.baseURL = baseURL;
  }

  /**
   * Send a chat message and get response via HTTP
   */
  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): Promise<{
    content: string;
    usage: { input_tokens: number; output_tokens: number };
  }> {
    try {
      const url = this.baseURL.endsWith('/')
        ? `${this.baseURL}messages`
        : `${this.baseURL}/messages`;

      const body = {
        model: options.model || this.defaultConfig.model,
        max_tokens: options.maxTokens || this.defaultConfig.max_tokens || 8000,
        temperature: options.temperature ?? this.defaultConfig.temperature ?? 0.7,
        system: options.system,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorData: AnthropicResponse = { usage: { input_tokens: 0, output_tokens: 0 } };
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use raw text if available
        }

        throw new APIError(
          `LLM API 调用失败 (${response.status}): ${errorData.error?.message || errorText || response.statusText}`,
          response.status,
        );
      }

      const responseText = await response.text();
      let data: AnthropicResponse;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        throw new APIError(
          `LLM API 响应解析失败 (无效的 JSON): ${responseText.substring(0, 100)}...`,
          500,
        );
      }

      const textContent = data.content?.find((c) => c.type === 'text');
      const content = textContent?.text || '';

      return {
        content,
        usage: {
          input_tokens: data.usage.input_tokens,
          output_tokens: data.usage.output_tokens,
        },
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(`LLM API 连接失败: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Simple completion (single message)
   */
  async complete(prompt: string, options: ChatOptions = {}): Promise<string> {
    const result = await this.chat([{ role: 'user', content: prompt }], options);
    return result.content;
  }

  /**
   * Validate API key by making a minimal request
   */
  async validateKey(): Promise<boolean> {
    try {
      await this.chat([{ role: 'user', content: 'Hi' }], { maxTokens: 5 });
      return true;
    } catch {
      return false;
    }
  }
}
