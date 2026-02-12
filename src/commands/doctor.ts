/**
 * ax doctor command - Environment check (Axon 2.0)
 */

import { execSync } from 'node:child_process';
import chalk from 'chalk';
import { Command } from 'commander';
import { t } from '../utils/i18n';

export const doctorCommand = new Command('doctor')
  .description(t('Check environment', '检查环境'))
  .action(async () => {
    console.log(`\n${chalk.bold('🔍 Axon 2.0 环境诊断')}\n`);

    // Check Node/Bun
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
      const bunVersion = execSync('bun --version', { encoding: 'utf-8' }).trim();
      console.log(`  ${chalk.green('✓')} Runtime: Node ${nodeVersion}, Bun ${bunVersion}`);
    } catch {
      console.log(`  ${chalk.red('✗')} Runtime: Node.js or Bun not found`);
    }

    // Check Git
    try {
      execSync('git --version', { encoding: 'utf-8' });
      console.log(`  ${chalk.green('✓')} Git: Installed`);
    } catch {
      console.log(`  ${chalk.red('✗')} Git: Not installed`);
    }

    // Check OpenCode
    try {
      execSync('opencode --version', { encoding: 'utf-8' });
      console.log(`  ${chalk.green('✓')} OpenCode: Installed`);
    } catch {
      console.log(`  ${chalk.yellow('⚠')} OpenCode: Not installed (npm i -g opencode)`);
    }

    // Check Repomix
    try {
      execSync('npx repomix --version', { encoding: 'utf-8' });
      console.log(`  ${chalk.green('✓')} Repomix: Installed`);
    } catch {
      console.log(`  ${chalk.yellow('⚠')} Repomix: Not installed (npx repomix)`);
    }

    // Check skills.sh
    try {
      execSync('npx skills --version', { encoding: 'utf-8' });
      console.log(`  ${chalk.green('✓')} skills.sh: Installed`);
    } catch {
      console.log(`  ${chalk.yellow('⚠')} skills.sh: Not installed (npm i -g @skills/cli)`);
    }

    // Check API keys
    const hasAnthropic = process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-');
    console.log(
      `  ${hasAnthropic ? chalk.green('✓') : chalk.yellow('⚠')} ANTHROPIC_API_KEY: ${hasAnthropic ? 'Configured' : 'Not set'}`,
    );

    console.log('');
  });
