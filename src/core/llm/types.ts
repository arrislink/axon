/**
 * LLM Types - Unified interfaces for LLM interactions
 */

/**
 * Message format for LLM conversations
 */
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Response from LLM calls
 */
export interface LLMResponse {
  content: string;
  model: string;
  tokens: {
    input: number;
    output: number;
  };
  cost: number;
}

/**
 * Options for LLM calls
 */
export interface LLMOptions {
  model?: string;
  agent?: string; // OMO agent name (e.g., 'sisyphus', 'oracle')
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  system?: string;
  onStream?: (chunk: string) => void;
}

/**
 * OMO Provider configuration
 */
export interface OMOProvider {
  name: string;
  api_key?: string;
  endpoint?: string;
  models: string[];
  auth?: string;
  type?: string; // e.g., 'anthropic', 'openai', 'google'
  is_active?: boolean; // Whether this provider is currently active/selected
}

/**
 * LLM mode detection result
 */
export type LLMMode = 'cli' | 'direct' | 'fallback';
