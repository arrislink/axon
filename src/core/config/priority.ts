/**
 * Configuration Priority Resolver
 *
 * Implements the priority logic:
 * 1. CLI Arguments
 * 2. Project Configuration (.axon/config.yaml)
 * 3. OMO Configuration (~/.omo/providers.yaml)
 * 4. Environment Variables
 * 5. Global Defaults
 */

import type { AxonConfig } from '../../types';
import type { OMOConfigReader } from '../llm/omo-config-reader';

export interface ResolvedConfig {
  provider: string;
  model?: string;
  apiKey?: string;
  temperature: number;
  maxTokens?: number;
}

export class ConfigPriorityResolver {
  resolve(context: {
    cliOptions: Record<string, unknown>;
    projectConfig?: AxonConfig;
    omoConfig: OMOConfigReader;
    env: NodeJS.ProcessEnv;
  }): ResolvedConfig {
    const { projectConfig, omoConfig, env } = context;

    // 1. Provider Resolution
    // CLI > Project > OMO > Defaults
    const providerName =
      (context.cliOptions['provider'] as string) ||
      projectConfig?.agents?.sisyphus?.provider ||
      omoConfig.getPrimaryProvider()?.name ||
      'anthropic'; // Default fallback

    // 2. Model Resolution
    // CLI > Project > OMO > Env
    const omoProvider = omoConfig.getProvider(providerName);
    const omoDefaultModel = omoProvider?.models?.[0];

    const model =
      (context.cliOptions['model'] as string) ||
      projectConfig?.agents?.sisyphus?.model ||
      omoDefaultModel ||
      env['AXON_MODEL'];

    // 3. API Key Resolution
    // CLI > OMO > Env
    let apiKey = context.cliOptions['apiKey'] as string | undefined;

    if (!apiKey && omoProvider) {
      // OMO Config (handled by OMOConfigReader's resolution logic if available, or manual here)
      // We use the helper method if we added it, otherwise logic here.
      // OMOConfigReader has getProviderApiKey which handles ${ENV} resolution
      apiKey = omoConfig.getProviderApiKey(omoProvider);
    }

    if (!apiKey) {
      // Env Fallback
      if (providerName.includes('anthropic')) apiKey = env['ANTHROPIC_API_KEY'];
      else if (providerName.includes('openai')) apiKey = env['OPENAI_API_KEY'];
      else if (providerName.includes('google') || providerName.includes('gemini'))
        apiKey = env['GOOGLE_API_KEY'];
      else if (providerName.includes('deepseek')) apiKey = env['DEEPSEEK_API_KEY'];
    }

    // 4. Other Parameters
    const temperature =
      context.cliOptions['temperature'] !== undefined
        ? Number(context.cliOptions['temperature'])
        : (projectConfig?.agents?.sisyphus?.temperature ?? 0.7);

    const maxTokens =
      context.cliOptions['maxTokens'] !== undefined
        ? Number(context.cliOptions['maxTokens'])
        : projectConfig?.agents?.sisyphus?.max_tokens;

    return {
      provider: providerName,
      model,
      apiKey,
      temperature,
      maxTokens,
    };
  }
}
