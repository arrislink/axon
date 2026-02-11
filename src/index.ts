#!/usr/bin/env bun
/**
 * Axon CLI - AI-Powered Development Operating System
 *
 * Entry point for the CLI application
 */

import chalk from 'chalk';
import { Command } from 'commander';
import {
  configCommand,
  docsCommand,
  doctorCommand,
  cleanCommand,
  flowCommand,
  initCommand,
  mcpCommand,
  planCommand,
  skillsCommand,
  specCommand,
  statusCommand,
  workCommand,
} from './commands';
import { handleError } from './utils/errors';
import { t } from './utils/i18n';

// Dynamically get version from package.json - use import to inline during build
import pkg from '../package.json';
const VERSION = pkg.version || '1.6.0';

const program = new Command();

program
  .name('ax')
  .description(
    `${chalk.green('🧠')} ${chalk.bold('Axon')} - ${t('AI-Powered Development Operating System', 'AI 驱动的开发操作系统')} (v${VERSION})
  
  ${t('From requirements to code, let AI be your development partner, not a tool.', '从需求到代码，让 AI 成为你的开发伙伴，而非工具。')}`,
  );

program
  .version(VERSION, '-v, --version', t('Show version', '显示版本信息'))
  .helpOption('-h, --help', t('Show help information', '显示帮助信息'));

program.configureHelp({
  subcommandTerm: (cmd) => chalk.cyan(cmd.name().padEnd(15)),
  subcommandDescription: (cmd) => cmd.description(),
  commandUsage: (cmd) => `${chalk.bold(cmd.name())} [options] [command]`,
});

// version command
program
  .command('version')
  .description(t('Show version information', '显示版本详细信息'))
  .action(() => {
    console.log(`${chalk.green('🧠')} ${chalk.bold('Axon')} v${VERSION}`);
    console.log(chalk.dim(`Node: ${process.version}`));
    console.log(chalk.dim(`Arch: ${process.arch} (${process.platform})`));
  });

// Register commands - Organized by lifecycle
program.addCommand(initCommand);
program.addCommand(flowCommand);
program.addCommand(statusCommand);

program.addCommand(specCommand);
program.addCommand(planCommand);
program.addCommand(workCommand);

program.addCommand(skillsCommand);
program.addCommand(docsCommand);
program.addCommand(configCommand);
program.addCommand(doctorCommand);
program.addCommand(cleanCommand);
program.addCommand(mcpCommand);

// Custom help
program.addHelpText(
  'after',
  `
${chalk.bold(t('Examples:', '使用示例:'))}
  ${chalk.cyan('ax init my-project')}      ${t('Initialize a new project', '初始化新项目')}
  ${chalk.cyan('ax spec init')}           ${t('Create specification interactively', '交互式创建需求规格')}
  ${chalk.cyan('ax flow run')}            ${t('Run end-to-end workflow', '执行端到端工作流')}
  ${chalk.cyan('ax status')}              ${t('View project status', '查看项目状态')}
  ${chalk.cyan('ax clean')}               ${t('Clean logs and artifacts', '清理日志与产物')}

${chalk.bold(t('Quick Start:', '快速开始:'))}
  1. ${chalk.cyan('ax init my-app')}      ${t('Create project', '创建项目')}
  2. ${chalk.cyan('cd my-app')}           ${t('Enter directory', '进入目录')}
  3. ${chalk.cyan('ax flow run')}         ${t('Define & Build', '定义并构建')}

${chalk.dim(t('Documentation:', '项目文档:'))} ${chalk.blue('https://github.com/arrislink/axon')}
${chalk.dim(t('Issues:', '问题反馈:'))} ${chalk.blue('https://github.com/arrislink/axon/issues')}
`,
);

// Global error handler
process.on('uncaughtException', handleError);
process.on('unhandledRejection', (reason) => {
  handleError(reason as Error);
});

// Parse and execute
try {
  await program.parseAsync(process.argv);
} catch (error) {
  handleError(error as Error);
}
