/**
 * Spinner utility for loading animations
 */

import ora, { type Ora } from 'ora';
import chalk from 'chalk';

class SpinnerManager {
    private spinner: Ora | null = null;

    start(text: string): Ora {
        this.stop();
        this.spinner = ora({
            text,
            color: 'cyan',
            spinner: 'dots',
        }).start();
        return this.spinner;
    }

    update(text: string): void {
        if (this.spinner) {
            this.spinner.text = text;
        }
    }

    succeed(text?: string): void {
        if (this.spinner) {
            this.spinner.succeed(text);
            this.spinner = null;
        }
    }

    fail(text?: string): void {
        if (this.spinner) {
            this.spinner.fail(text);
            this.spinner = null;
        }
    }

    warn(text?: string): void {
        if (this.spinner) {
            this.spinner.warn(text);
            this.spinner = null;
        }
    }

    info(text?: string): void {
        if (this.spinner) {
            this.spinner.info(text);
            this.spinner = null;
        }
    }

    stop(): void {
        if (this.spinner) {
            this.spinner.stop();
            this.spinner = null;
        }
    }

    isRunning(): boolean {
        return this.spinner !== null && this.spinner.isSpinning;
    }
}

export const spinner = new SpinnerManager();

/**
 * Progress bar for multi-step operations
 */
export function progressBar(current: number, total: number, width: number = 20): string {
    const progress = Math.min(current / total, 1);
    const filled = Math.round(width * progress);
    const empty = width - filled;

    const bar = chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
    const percentage = Math.round(progress * 100);

    return `${bar} ${percentage}%`;
}
