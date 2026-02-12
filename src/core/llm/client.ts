/**
 * LLM Client for Axon Planning Phase
 *
 * Direct API calls for structured JSON generation.
 * Reads config from OMO but maintains independent calling capability.
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { logger } from '../../utils/logger';

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  success: boolean;
  content: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface AnthropicResponse {
  content: Array<{ text: string }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface OpenAIResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LLMClient {
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = config ? { ...this.loadDefaultConfig(), ...config } : this.loadConfig();
  }

  /**
   * Load config from OMO config file or environment variables
   */
  private loadConfig(): LLMConfig {
    const omoConfig = this.loadOMOConfig();
    const envConfig = this.loadEnvConfig();

    return {
      apiKey: envConfig.apiKey || omoConfig.apiKey || '',
      baseUrl: envConfig.baseUrl || omoConfig.baseUrl || 'https://api.anthropic.com',
      model: envConfig.model || omoConfig.model || 'claude-3-sonnet-20240229',
      maxTokens: envConfig.maxTokens || omoConfig.maxTokens || 4096,
      temperature: envConfig.temperature ?? omoConfig.temperature ?? 0.2,
    };
  }

  /**
   * Load OMO config from ~/.omo/config.yaml or ~/.opencode/config.yaml
   */
  private loadOMOConfig(): Partial<LLMConfig> {
    const configPaths = [
      join(homedir(), '.omo', 'config.yaml'),
      join(homedir(), '.omo', 'config.yml'),
      join(homedir(), '.opencode', 'config.yaml'),
      join(homedir(), '.opencode', 'config.yml'),
    ];

    for (const configPath of configPaths) {
      if (existsSync(configPath)) {
        try {
          const content = readFileSync(configPath, 'utf-8');
          return this.parseYAMLConfig(content);
        } catch {
          // Continue to next path
        }
      }
    }

    return {};
  }

  /**
   * Parse YAML config content (simplified parser)
   */
  private parseYAMLConfig(content: string): Partial<LLMConfig> {
    const config: Partial<LLMConfig> = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('api_key:')) {
        config.apiKey = trimmed.split(':')[1]?.trim();
      } else if (trimmed.startsWith('base_url:')) {
        config.baseUrl = trimmed.split(':')[1]?.trim();
      } else if (trimmed.startsWith('model:')) {
        config.model = trimmed.split(':')[1]?.trim();
      } else if (trimmed.startsWith('max_tokens:')) {
        const value = trimmed.split(':')[1]?.trim();
        if (value) config.maxTokens = Number.parseInt(value, 10);
      } else if (trimmed.startsWith('temperature:')) {
        const value = trimmed.split(':')[1]?.trim();
        if (value) config.temperature = Number.parseFloat(value);
      }
    }

    return config;
  }

  /**
   * Load config from environment variables
   */
  private loadEnvConfig(): Partial<LLMConfig> {
    return {
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
      baseUrl: process.env.LLM_BASE_URL,
      model: process.env.LLM_MODEL,
    };
  }

  /**
   * Default config values
   */
  private loadDefaultConfig(): LLMConfig {
    return {
      apiKey: '',
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4096,
      temperature: 0.2,
    };
  }

  /**
   * Send completion request to LLM
   */
  async complete(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      return {
        success: false,
        content: '',
        error: 'No API key configured. Set ANTHROPIC_API_KEY or configure ~/.omo/config.yaml',
      };
    }

    try {
      const isAnthropic = this.config.baseUrl.includes('anthropic');

      if (isAnthropic) {
        return this.callAnthropic(messages);
      }
      return this.callOpenAICompatible(messages);
    } catch (error) {
      logger.error(`LLM API call failed: ${error}`);
      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(messages: LLMMessage[]): Promise<LLMResponse> {
    const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
    const userMessages = messages.filter((m) => m.role !== 'system');

    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemMessage,
        messages: userMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        content: '',
        error: `API Error ${response.status}: ${error}`,
      };
    }

    const data = (await response.json()) as AnthropicResponse;

    return {
      success: true,
      content: data.content?.[0]?.text || '',
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  }

  /**
   * Call OpenAI-compatible API
   */
  private async callOpenAICompatible(messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        content: '',
        error: `API Error ${response.status}: ${error}`,
      };
    }

    const data = (await response.json()) as OpenAIResponse;

    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Generate structured JSON response
   */
  async completeJSON<T>(
    messages: LLMMessage[],
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const response = await this.complete(messages);

    if (!response.success) {
      return { success: false, error: response.error };
    }

    try {
      const jsonMatch =
        response.content.match(/```json\n?([\s\S]*?)\n?```/) ||
        response.content.match(/\{[\s\S]*\}/);

      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response.content;
      const data = JSON.parse(jsonStr) as T;

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse JSON response: ${error}`,
      };
    }
  }

  /**
   * Validate configuration
   */
  validate(): boolean {
    return !!this.config.apiKey && !!this.config.model;
  }

  /**
   * Get current config (for debugging)
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }
}
