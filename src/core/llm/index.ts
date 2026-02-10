import { APIError } from '../../utils/errors';
import { AnthropicClient } from '../integrations/anthropic';
import { OMOConfigReader, hasOMOConfig } from './omo-config-reader';
import { OpenCodeLLMClient } from './opencode-client';
import type { LLMMessage, LLMMode, LLMOptions, LLMResponse } from './types';
import { UnifiedLLMClient } from './unified-client';

/**
 * Main Axon LLM Client
 * Orchestrates between CLI, direct API, and fallback modes
 *
 * Resolution priority:
 * 1. CLI mode  — Uses OpenCode CLI (full OMO capabilities)
 * 2. Direct mode — Uses OMO config + Antigravity token for direct API calls
 * 3. Fallback mode — Uses environment variables (ANTHROPIC_API_KEY etc.)
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

    // 2. Check if OMO config exists with usable providers
    if (hasOMOConfig() && this.omoConfig.hasProviders()) {
      // Verify that at least one provider has a resolvable API key
      const primary = this.omoConfig.getPrimaryProvider();
      if (primary && this.omoConfig.getProviderApiKey(primary)) {
        return 'direct';
      }
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
        this.initFallbackClient();
        break;
    }
  }

  /**
   * Initialize fallback client - tries multiple sources
   */
  private initFallbackClient(): void {
    // Try env vars in priority order
    const envKeys = [
      { key: 'ANTHROPIC_API_KEY', model: 'claude-sonnet-4-20250514', provider: 'anthropic' as const },
      { key: 'OPENAI_API_KEY', model: 'gpt-4o', provider: 'openai' as const },
      { key: 'GOOGLE_API_KEY', model: 'gemini-2.0-flash', provider: 'google' as const },
    ];

    for (const { key, model, provider } of envKeys) {
      const apiKey = process.env[key];
      if (apiKey) {
        this.anthropicClient = new AnthropicClient(apiKey, {
          model,
          provider,
          temperature: 0.7,
          max_tokens: 4000,
        });
        return;
      }
    }

    // Last resort: if OMO config has providers with Antigravity token, use UnifiedLLMClient
    // BUT ONLY IF we didn't just come from a failed direct mode attempt
    if (this.mode === 'fallback' && this.omoConfig.hasProviders() && this.omoConfig.hasAntigravityAuth()) {
      // If we don't have any other fallback, this is our only hope
      this.unifiedClient = new UnifiedLLMClient(this.omoConfig);
    }
  }

  /**
   * Send chat messages with cascading fallback
   */
  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    try {
      // Primary path based on detected mode
      if (this.mode === 'cli' && this.openCodeClient) {
        return await this.openCodeClient.chat(messages, options);
      }

      if (this.mode === 'direct' && this.unifiedClient) {
        return await this.unifiedClient.chat(messages, options);
      }

      if (this.mode === 'fallback') {
        // Fallback may have initialized either anthropicClient or unifiedClient
        if (this.anthropicClient) {
          return await this.chatAnthropicFallback(messages, options);
        }
        if (this.unifiedClient) {
          return await this.unifiedClient.chat(messages, options);
        }

        // Nothing available - generate diagnostic info
        const diagInfo = this.getDiagnosticInfo();
        throw new APIError(`未找到有效的 LLM 配置或 API 密钥 (${diagInfo})`, 401);
      }

      throw new Error(`未支持的 LLM 模式: ${this.mode}`);
    } catch (error) {
      return this.handleChatError(error, messages, options);
    }
  }

  /**
   * Handle errors with cascading fallback
   */
  private async handleChatError(
    error: unknown,
    messages: LLMMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse> {
    // CLI → Direct fallback
    if (this.mode === 'cli') {
      console.warn('🧠 Axon: CLI 模式调用失败，尝试 Direct 模式...');
      if (process.env['DEBUG']) console.error(error);

      // Try direct mode with OMO config
      if (this.omoConfig.hasProviders()) {
        const primary = this.omoConfig.getPrimaryProvider();
        if (primary && this.omoConfig.getProviderApiKey(primary)) {
          this.mode = 'direct';
          this.initClient();
          return await this.chat(messages, options);
        }
      }

      // Skip directly to fallback
      console.warn('🧠 Axon: Direct 模式无可用 Provider，尝试 Fallback 模式...');
      this.mode = 'fallback';
      this.initClient();
      return await this.chat(messages, options);
    }

    // Direct → Fallback
    if (this.mode === 'direct' || (this.mode === 'fallback' && this.unifiedClient)) {
      console.warn('🧠 Axon: Direct/Proxy 模式调用失败，尝试环境变量 Fallback...');
      if (process.env['DEBUG']) console.error(error);

      // Clear unifiedClient to prevent re-trying it in fallback
      this.unifiedClient = undefined;
      this.mode = 'fallback';
      this.initClient();
      return await this.chat(messages, options);
    }

    // All modes failed
    throw error;
  }

  /**
   * Generate diagnostic information for error messages
   */
  private getDiagnosticInfo(): string {
    return [
      `配置文件: ${this.omoConfig.getConfigSource() || '未找到'}`,
      `Providers: ${this.omoConfig.getAllProviders().length}`,
      `Antigravity Token: ${this.omoConfig.hasAntigravityAuth() ? '已找到' : '未找到'}`,
      `ANTHROPIC_API_KEY: ${process.env['ANTHROPIC_API_KEY'] ? '已设置' : '未设置'}`,
      `OPENAI_API_KEY: ${process.env['OPENAI_API_KEY'] ? '已设置' : '未设置'}`,
      `GOOGLE_API_KEY: ${process.env['GOOGLE_API_KEY'] ? '已设置' : '未设置'}`,
    ].join(', ');
  }

  /**
   * Fallback chat implementation using direct Anthropic API
   */
  private async chatAnthropicFallback(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): Promise<LLMResponse> {
    if (!this.anthropicClient) throw new Error('Anthropic client not initialized');

    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await this.anthropicClient.chat(chatMessages, {
      model: options?.model,
      maxTokens: options?.maxTokens,
      system: systemMessage?.content || options?.system,
    });

    return {
      content: response.content,
      model: options?.model || 'claude-sonnet-4-20250514',
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      cost: 0,
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
      case 'cli':
        return 'OpenCode CLI (OMO Mode)';
      case 'direct':
        return 'Direct API (OMO Config)';
      case 'fallback':
        return 'Environment Variables (Fallback)';
      default:
        return 'Unknown';
    }
  }
}
