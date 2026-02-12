/**
 * Verification Layer - Trust but Verify for Axon 2.0
 *
 * Independently validates OMO execution results
 * to ensure quality and catch failures.
 */

import { exec } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export interface VerificationResult {
  passed: boolean;
  beadId: string;
  testsRun: TestResult[];
  error?: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  output: string;
  duration: number;
}

export interface CustomCheck {
  name: string;
  command: string;
}

export interface VerificationConfig {
  testCommand?: string;
  lintCommand?: string;
  typeCheckCommand?: string;
  customChecks?: CustomCheck[];
}

export interface BeadVerificationInput {
  beadId: string;
  acceptanceCriteria: string[];
}

export class Verifier {
  private projectRoot: string;
  private config: VerificationConfig;

  constructor(projectRoot: string, config?: VerificationConfig) {
    this.projectRoot = projectRoot;
    this.config = config || this.loadConfig();
  }

  /**
   * Verify bead execution - Trust but Verify
   *
   * Even if OMO reports [[AXON_STATUS:COMPLETED]],
   * we independently run verification checks.
   */
  async verifyBead(beadId: string, acceptanceCriteria?: string[]): Promise<VerificationResult> {
    logger.info(`Verifying bead: ${beadId}`);

    const tests: TestResult[] = [];

    // Run type check if available
    if (this.config.typeCheckCommand) {
      const result = await this.runCheck('Type Check', this.config.typeCheckCommand);
      tests.push(result);
    }

    // Run lint if available
    if (this.config.lintCommand) {
      const result = await this.runCheck('Linting', this.config.lintCommand);
      tests.push(result);
    }

    // Run tests if available
    if (this.config.testCommand) {
      const result = await this.runCheck('Tests', this.config.testCommand);
      tests.push(result);
    }

    // Run custom checks
    for (const check of this.config.customChecks || []) {
      const result = await this.runCheck(check.name, check.command);
      tests.push(result);
    }

    // Verify acceptance criteria if provided
    if (acceptanceCriteria && acceptanceCriteria.length > 0) {
      const criteriaResult = await this.verifyAcceptanceCriteria(acceptanceCriteria);
      tests.push(...criteriaResult);
    }

    const allPassed = tests.every((t) => t.passed);

    // Log verification failure
    if (!allPassed) {
      logger.warn(`Verification failed for bead: ${beadId}`);
      const failedTests = tests.filter((t) => !t.passed);
      for (const test of failedTests) {
        logger.warn(`  - ${test.name}: ${test.output}`);
      }
    } else {
      logger.success(`Verification passed for bead: ${beadId}`);
    }

    return {
      passed: allPassed,
      beadId,
      testsRun: tests,
    };
  }

  /**
   * Verify acceptance criteria against bead requirements
   */
  private async verifyAcceptanceCriteria(criteria: string[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < criteria.length; i++) {
      const criterion = criteria[i];
      // For now, we check if the criterion mentions specific tests to run
      // In future, this could be more sophisticated
      let passed = true;
      let output = `Criterion: ${criterion}`;

      // Check if criterion suggests a specific test command
      const testMatch = criterion.match(/test[s]?\s+[`"']([^`"']+)[`"']/i);
      if (testMatch) {
        const testCommand = testMatch[1];
        try {
          const { stdout } = await execAsync(testCommand, {
            cwd: this.projectRoot,
            timeout: 60000,
          });
          output = stdout;
        } catch (error) {
          passed = false;
          output = error instanceof Error ? error.message : String(error);
        }
      }

      results.push({
        name: `Acceptance Criterion ${i + 1}`,
        passed,
        output,
        duration: Date.now() - startTime,
      });
    }

    return results;
  }

  /**
   * Run a verification check
   */
  private async runCheck(name: string, command: string): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot,
        timeout: 120000, // 2 minutes
      });

      const passed = this.interpretResult(name, stdout + stderr);

      return {
        name,
        passed,
        output: stdout + stderr,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const output = error instanceof Error ? error.message : String(error);
      return {
        name,
        passed: false,
        output,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Interpret check result based on command type
   */
  private interpretResult(name: string, output: string): boolean {
    const lowerOutput = output.toLowerCase();

    // TypeScript/tsc
    if (name.toLowerCase().includes('type')) {
      return !output.includes('error') && !lowerOutput.includes('typeerror');
    }

    // ESLint/Prettier
    if (name.toLowerCase().includes('lint')) {
      return !lowerOutput.includes('error') && !lowerOutput.includes('failed');
    }

    // Vitest/Jest
    if (name.toLowerCase().includes('test')) {
      return lowerOutput.includes('pass') || lowerOutput.includes('success');
    }

    // Default: assume success if no obvious failure
    return !lowerOutput.includes('fail') && !lowerOutput.includes('error');
  }

  /**
   * Load verification config from .axon/verify.json
   */
  private loadConfig(): VerificationConfig {
    const configPath = join(this.projectRoot, '.axon', 'verify.json');

    if (!existsSync(configPath)) {
      return {
        testCommand: 'bun test',
        typeCheckCommand: 'bun run type-check',
        lintCommand: 'bun run lint',
        customChecks: [],
      };
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {
        testCommand: 'bun test',
        typeCheckCommand: 'bun run type-check',
        lintCommand: 'bun run lint',
        customChecks: [],
      };
    }
  }

  /**
   * Save verification config
   */
  saveConfig(config: VerificationConfig): void {
    const configPath = join(this.projectRoot, '.axon', 'verify.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}
