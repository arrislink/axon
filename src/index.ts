#!/usr/bin/env bun
/**
 * Axon 2.0 CLI - AI-Powered Development Operating System
 *
 * Simplified Architecture: Perception -> Planning -> Execution -> Verification
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { doctorCommand, driveCommand, initCommand, skillsCommand, statusCommand } from './commands';
import { handleError } from './utils/errors';
import { t } from './utils/i18n';

import pkg from '../package.json';
const VERSION = pkg.version || '2.0.0';

const program = new Command();

program
  .name('ax')
  .description(
    `${chalk.green('🧠')} ${chalk.bold('Axon 2.0')} - ${t('AI-Driven Development OS', 'AI 驱动的开发操作系统')} (v${VERSION})

${t('From requirements to code, let AI be your partner.', '从需求到代码，让 AI 成为你的开发伙伴。')}`,
  )
  .version(VERSION, '-v, --version', t('Show version', '显示版本信息'))
  .helpOption('-h, --help', t('Show help', '显示帮助'));

program.configureHelp({
  subcommandTerm: (cmd) => chalk.cyan(cmd.name().padEnd(12)),
  subcommandDescription: (cmd) => cmd.description(),
});

// Version command
program
  .command('version')
  .description(t('Show version info', '显示版本信息'))
  .action(() => {
    console.log(`${chalk.green('🧠')} Axon v${VERSION}`);
  });

// Core commands
program.addCommand(initCommand);
program.addCommand(driveCommand);
program.addCommand(statusCommand);
program.addCommand(skillsCommand);
program.addCommand(doctorCommand);

// Help text
program.addHelpText(
  'after',
  `
${chalk.bold(t('Commands:', '命令:'))}
  ${chalk.cyan('ax init <name>')}    ${t('Initialize project', '初始化项目')}
  ${chalk.cyan('ax drive "<task>"')} ${t('Execute task with AI', 'AI 执行开发任务')}
  ${chalk.cyan('ax status')}         ${t('Show progress', '显示进度')}
  ${chalk.cyan('ax skills add <pkg>')} ${t('Install skill', '安装技能')}
  ${chalk.cyan('ax doctor')}         ${t('Check environment', '检查环境')}

${chalk.bold(t('Quick Start:', '快速开始:'))}
  1. ${chalk.cyan('ax init my-app')}
  2. ${chalk.cyan('ax drive "实现用户认证功能"')}
  3. ${chalk.cyan('ax status')}

${chalk.dim(t('Docs:', '文档:'))} ${chalk.blue('docs/GUIDE.md')}
`,
);

// Error handling
process.on('uncaughtException', handleError);
process.on('unhandledRejection', (reason) => {
  handleError(reason as Error);
});

// Run
try {
  await program.parseAsync(process.argv);
} catch (error) {
  handleError(error as Error);
}
