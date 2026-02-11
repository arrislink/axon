import chalk from 'chalk';
import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';

export interface CheckResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class CheckRunner {
  private cwd: string;
  private commands: string[];

  constructor(cwd: string, commands: string[]) {
    this.cwd = cwd;
    this.commands = commands.map((c) => c.trim()).filter(Boolean);
  }

  runAll(): CheckResult[] {
    const results: CheckResult[] = [];
    if (this.commands.length > 0) {
      logger.info(t('Running verification checks...', '正在运行验证检查...'));
    }

    for (const command of this.commands) {
      logger.info(`${chalk.dim('•')} ${t('Executing:', '正在执行:')} ${chalk.cyan(command)}`);
      const proc = Bun.spawnSync(['bash', '-lc', command], {
        cwd: this.cwd,
        stdout: 'pipe',
        stderr: 'pipe',
        env: process.env,
      });

      results.push({
        command,
        exitCode: proc.exitCode,
        stdout: new TextDecoder().decode(proc.stdout),
        stderr: new TextDecoder().decode(proc.stderr),
      });
    }
    return results;
  }
}
