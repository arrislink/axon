#!/usr/bin/env bun
/**
 * Axon CLI - AI-Powered Development Operating System
 *
 * Entry point for the CLI application
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
    initCommand,
    specCommand,
    planCommand,
    workCommand,
    skillsCommand,
    statusCommand,
    doctorCommand,
    configCommand,
} from './commands';
import { handleError } from './utils/errors';

const VERSION = '1.0.0';

const program = new Command();

program
    .name('ax')
    .description(
        `${chalk.green('🧠')} ${chalk.bold('Axon')} - AI-Powered Development Operating System

  ${chalk.dim('从需求到代码，让 AI 成为你的开发伙伴，而非工具。')}`
    )
    .version(VERSION, '-v, --version', '显示版本号')
    .helpOption('-h, --help', '显示帮助信息');

// Register commands
program.addCommand(initCommand);
program.addCommand(specCommand);
program.addCommand(planCommand);
program.addCommand(workCommand);
program.addCommand(skillsCommand);
program.addCommand(statusCommand);
program.addCommand(doctorCommand);
program.addCommand(configCommand);

// Custom help
program.addHelpText('after', `
${chalk.bold('示例:')}
  ${chalk.cyan('ax init my-project')}     初始化新项目
  ${chalk.cyan('ax spec init')}           交互式创建规格
  ${chalk.cyan('ax config keys anthropic')} 配置 API 密钥
  ${chalk.cyan('ax plan')}                生成任务图
  ${chalk.cyan('ax work')}                执行下一个任务
  ${chalk.cyan('ax status')}              查看项目状态

${chalk.bold('快速开始:')}
  1. ${chalk.cyan('ax init my-app')}        创建项目
  2. ${chalk.cyan('cd my-app')}
  3. ${chalk.cyan('ax spec init')}          定义需求
  4. ${chalk.cyan('ax plan')}               拆解任务
  5. ${chalk.cyan('ax work')}               开始执行

${chalk.dim('文档: https://axon.dev/docs')}
${chalk.dim('问题反馈: https://github.com/arrislink/axon/issues')}
`);

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
