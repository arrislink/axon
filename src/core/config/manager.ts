/**
 * Configuration Manager
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { AgentConfig, AxonConfig } from '../../types';
import { ConfigError } from '../../utils/errors';
import { DEFAULT_CONFIG } from './defaults';
import { ConfigSchema } from './schema';

export class ConfigManager {
  private config: AxonConfig;
  private configPath: string;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configPath = join(projectRoot, '.axon', 'config.yaml');
    this.config = this.load();
  }

  /**
   * Load configuration from file
   */
  private load(): AxonConfig {
    if (!existsSync(this.configPath)) {
      return { ...DEFAULT_CONFIG } as AxonConfig;
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8');
      const rawConfig = parseYaml(content);

      // Validate configuration
      const result = ConfigSchema.safeParse(rawConfig);
      if (!result.success) {
        const errorMessages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        throw new ConfigError(`配置文件验证失败:\n${errorMessages.join('\n')}`, [
          '检查配置文件格式',
          '运行 `ax doctor --fix` 尝试修复',
        ]);
      }

      return result.data as AxonConfig;
    } catch (error) {
      if (error instanceof ConfigError) throw error;
      throw new ConfigError(`无法解析配置文件: ${(error as Error).message}`);
    }
  }

  /**
   * Save configuration to file
   */
  save(): void {
    const dir = dirname(this.configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const content = stringifyYaml(this.config, {
      indent: 2,
      lineWidth: 0,
    });
    writeFileSync(this.configPath, content, 'utf-8');
  }

  /**
   * Get full configuration
   */
  get(): AxonConfig {
    return this.config;
  }

  /**
   * Update configuration partially
   */
  update(partial: Partial<AxonConfig>): void {
    this.config = this.deepMerge(this.config, partial);
    this.save();
  }

  /**
   * Get agent configuration
   */
  getAgentConfig(name: 'sisyphus' | 'oracle' | 'background'): AgentConfig | undefined {
    return this.config.agents[name];
  }

  /**
   * Get safety limits
   */
  getSafetyLimits() {
    return this.config.safety;
  }

  /**
   * Get project root path
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Get path to a specific configuration directory
   */
  getPath(key: 'openspec' | 'beads' | 'skills_local' | 'skills_global'): string {
    switch (key) {
      case 'openspec':
        return join(this.projectRoot, this.config.tools.openspec.path);
      case 'beads':
        return join(this.projectRoot, this.config.tools.beads.path);
      case 'skills_local':
        return join(this.projectRoot, this.config.tools.skills.local_path);
      case 'skills_global':
        return this.config.tools.skills.global_path;
      default:
        throw new ConfigError(`Unknown path key: ${key}`);
    }
  }

  /**
   * Get the absolute path to the spec file
   */
  getSpecPath(): string {
    return join(this.getPath('openspec'), 'spec.md');
  }

  /**
   * Get the absolute path to the graph file
   */
  getGraphPath(): string {
    return join(this.getPath('beads'), 'graph.json');
  }

  /**
   * Get all relevant skills paths (local and global)
   */
  getAllSkillsPaths(): string[] {
    return [
      this.getPath('skills_local'),
      join(this.projectRoot, '.agents', 'skills'),
      join(this.projectRoot, '.agent', 'skills'),
      this.getPath('skills_global'),
    ];
  }

  /**
   * Check if Axon project exists in current directory
   */
  static isAxonProject(dir: string = process.cwd()): boolean {
    return existsSync(join(dir, '.axon', 'config.yaml'));
  }

  /**
   * Initialize a new project with default configuration
   */
  static initialize(projectRoot: string, projectName: string): ConfigManager {
    const configPath = join(projectRoot, '.axon', 'config.yaml');
    const dir = dirname(configPath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const config: AxonConfig = {
      ...DEFAULT_CONFIG,
      project: {
        name: projectName,
        description: '',
      },
    } as AxonConfig;

    const content = stringifyYaml(config, {
      indent: 2,
      lineWidth: 0,
    });
    writeFileSync(configPath, content, 'utf-8');

    return new ConfigManager(projectRoot);
  }

  /**
   * Deep merge helper
   */
  private deepMerge<T extends object>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        (result as Record<string, unknown>)[key] = this.deepMerge(
          targetValue as object,
          sourceValue as object,
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }

    return result;
  }
}
