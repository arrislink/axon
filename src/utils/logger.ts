/**
 * Logger utility for Axon
 */

import chalk from 'chalk';
import type { LogLevel } from '../types';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel = 'info';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatTimestamp(): string {
    return chalk.dim(new Date().toISOString().split('T')[1].slice(0, 8));
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatTimestamp(), chalk.gray('[DEBUG]'), ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(...args);
    }
  }

  success(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green('✅'), ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(chalk.yellow('⚠️'), ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red('❌'), ...args);
    }
  }

  // Formatted output helpers
  title(text: string): void {
    console.log(`\n${chalk.bold.cyan('🧠')} ${chalk.bold(text)}\n`);
  }

  section(text: string): void {
    console.log(chalk.bold.blue(`\n${text}`));
    console.log(chalk.dim('─'.repeat(text.length + 2)));
  }

  list(items: string[], prefix = '  •'): void {
    for (const item of items) {
      console.log(`${chalk.dim(prefix)} ${item}`);
    }
  }

  table(rows: Record<string, string | number>): void {
    const maxKeyLen = Math.max(...Object.keys(rows).map((k) => k.length));
    for (const [key, value] of Object.entries(rows)) {
      console.log(`  ${chalk.dim(key.padEnd(maxKeyLen))}  ${value}`);
    }
  }

  divider(): void {
    console.log(chalk.dim('━'.repeat(50)));
  }

  blank(): void {
    console.log();
  }
}

export const logger = new Logger();
