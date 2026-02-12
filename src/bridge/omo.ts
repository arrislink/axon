/**
 * OMO Bridge - Execution Layer for Axon 2.0
 *
 * Handles subprocess communication with OpenCode CLI
 * using Bun.spawn for reliable process management.
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { logger } from '../utils/logger';

export interface OMOExecutionOptions {
  beadId: string;
  instruction: string;
  contextFiles?: string[];
  systemPrompt: string;
  maxDuration?: number; // milliseconds
}

export interface OMOExecutionResult {
  success: boolean;
  beadId: string;
  output: string;
  error?: string;
  duration: number;
}

export type CompletionHandler = (result: OMOExecutionResult) => void;

export class OMOBridge {
  private projectRoot: string;
  private activeProcess: ChildProcess | null = null;
  private completionPattern = /\[\[AXON_STATUS:COMPLETED\]\]/;
  private failurePattern = /\[\[AXON_STATUS:FAILED:([^\]]+)\]\]/;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Execute a bead using OMO CLI subprocess
   *
   * Protocol:
   * 1. Spawn opencode run --agent sisyphus
   * 2. Feed system prompt + instruction via stdin
   * 3. Watch stdout for completion signal
   * 4. Return on signal detection or timeout
   */
  async execute(options: OMOExecutionOptions): Promise<OMOExecutionResult> {
    const startTime = Date.now();
    const { beadId, instruction, contextFiles = [], systemPrompt, maxDuration = 600000 } = options;

    logger.info(`Executing bead: ${beadId}`);

    return new Promise((resolve) => {
      // Build command arguments
      const args = ['run', '--agent', 'sisyphus', '--no-interactive'];

      if (contextFiles.length > 0) {
        args.push('--context', contextFiles.join(','));
      }

      // Build full prompt
      const fullPrompt = this.buildPrompt(beadId, systemPrompt, instruction);

      // Spawn OMO process
      this.activeProcess = spawn('opencode', args, {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          AXON_BEAD_ID: beadId,
        },
      });

      let output = '';
      let errorOutput = '';
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.killProcess();
          resolve({
            success: false,
            beadId,
            output,
            error: 'Timeout: Execution exceeded maximum duration',
            duration: Date.now() - startTime,
          });
        }
      }, maxDuration);

      // Handle stdout
      this.activeProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        logger.debug(`OMO stdout: ${chunk.slice(0, 200)}...`);

        if (!resolved && this.checkCompletion(output)) {
          resolved = true;
          clearTimeout(timeout);
          this.killProcess();
          resolve({
            success: true,
            beadId,
            output: this.extractResult(output),
            duration: Date.now() - startTime,
          });
        }
      });

      // Handle stderr
      this.activeProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        logger.warn(`OMO stderr: ${chunk}`);
      });

      // Handle process exit
      this.activeProcess.on('close', (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);

          // Check for failure pattern in output
          const failureMatch =
            errorOutput.match(this.failurePattern) || output.match(this.failurePattern);
          if (failureMatch) {
            resolve({
              success: false,
              beadId,
              output,
              error: failureMatch[1],
              duration: Date.now() - startTime,
            });
          } else if (code !== 0 && !this.checkCompletion(output)) {
            resolve({
              success: false,
              beadId,
              output,
              error: `Process exited with code ${code}`,
              duration: Date.now() - startTime,
            });
          } else {
            resolve({
              success: this.checkCompletion(output),
              beadId,
              output: this.extractResult(output),
              duration: Date.now() - startTime,
            });
          }
        }
      });

      // Handle spawn error
      this.activeProcess.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            beadId,
            output,
            error: `Process spawn failed: ${err.message}`,
            duration: Date.now() - startTime,
          });
        }
      });

      // Send prompt via stdin
      this.activeProcess.stdin?.write(fullPrompt);
      this.activeProcess.stdin?.end();
    });
  }

  /**
   * Build the full prompt for OMO
   */
  private buildPrompt(beadId: string, systemPrompt: string, instruction: string): string {
    return `You are an AI code implementation agent.

## Task Context
Bead ID: ${beadId}

${systemPrompt}

## Current Task
${instruction}

## Instructions
1. Understand the task and existing codebase context
2. Implement the required changes
3. Verify your implementation works
4. When complete, output exactly: [[AXON_STATUS:COMPLETED]]
5. If you cannot fix errors after multiple retries, output: [[AXON_STATUS:FAILED:Reason]]
`.trim();
  }

  /**
   * Check for completion signal in output
   */
  private checkCompletion(output: string): boolean {
    return this.completionPattern.test(output);
  }

  /**
   * Extract the actual result/output from the full response
   */
  private extractResult(output: string): string {
    // Remove the completion signal and return the meaningful output
    return output.replace(this.completionPattern, '').replace(this.failurePattern, '').trim();
  }

  /**
   * Kill the active process
   */
  private killProcess(): void {
    if (this.activeProcess && !this.activeProcess.killed) {
      this.activeProcess.kill('SIGTERM');
      // Force kill after timeout
      setTimeout(() => {
        if (this.activeProcess && !this.activeProcess.killed) {
          this.activeProcess.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  /**
   * Validate OMO CLI is available
   */
  async validate(): Promise<boolean> {
    try {
      const { execSync } = require('node:child_process');
      execSync('opencode --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}
