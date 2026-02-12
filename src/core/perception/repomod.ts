/**
 * Repomod Integration - Codebase Context Provider
 *
 * Uses Repomix to generate XML representation of the codebase
 * for injection into LLM prompts.
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export interface RepomodOptions {
  style?: 'xml' | 'json' | 'markdown';
  include?: string[];
  exclude?: string[];
  outputFile?: string;
}

export interface RepomodResult {
  success: boolean;
  context: string;
  error?: string;
}

export class Repomod {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Execute repomod to generate codebase context
   */
  async generateContext(options: RepomodOptions = {}): Promise<RepomodResult> {
    const {
      style = 'xml',
      include = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.md'],
      outputFile = path.join(this.projectRoot, '.axon/repomix_output.xml'),
    } = options;

    try {
      logger.info('📦 Generating codebase context with Repomod...');

      // Build repomod command
      const args = [
        'npx',
        'repomod',
        this.projectRoot,
        '--style',
        style,
        '--include',
        include.join(','),
        '--output',
        outputFile,
        '--no-timestamp',
      ];

      // Execute repomod
      await execAsync(args.join(' '), {
        cwd: this.projectRoot,
        timeout: 60000, // 60 seconds timeout
      });

      // Read generated context
      if (fs.existsSync(outputFile)) {
        const context = fs.readFileSync(outputFile, 'utf-8');
        logger.success('✅ Codebase context generated successfully');
        return { success: true, context };
      } else {
        return {
          success: false,
          context: '',
          error: 'Repomod output file not found',
        };
      }
    } catch (error) {
      logger.error(`❌ Repomod failed: ${error}`);
      return {
        success: false,
        context: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Quick context generation for specific files
   */
  async generatePartialContext(patterns: string[]): Promise<RepomodResult> {
    return this.generateContext({
      include: patterns,
      style: 'xml',
      outputFile: path.join(this.projectRoot, '.axon/repomix_partial.xml'),
    });
  }

  /**
   * Validate repomod is available
   */
  async validate(): Promise<boolean> {
    try {
      await execAsync('npx repomod --version', { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }
}
