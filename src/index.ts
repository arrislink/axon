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

// Dynamically get version from package.json - use import to inline during build
import pkg from '../package.json';
const VERSION = pkg.version || '1.5.0';

const program = new Command();

program
  .name('ax')
  .description(
    `${chalk.green('🧠')} ${chalk.bold('Axon')} - AI-Powered Development Operating System (v${VERSION})

  From requirements to code, let AI be your development partner, not a tool.
  从需求到代码，让 AI 成为你的开发伙伴，而非工具。`,
  )
  .version(VERSION, '-v, --version', 'Show version')
  .helpOption('-h, --help', 'Show help information');

// Register commands
program.addCommand(initCommand);
program.addCommand(specCommand);
program.addCommand(planCommand);
program.addCommand(workCommand);
program.addCommand(skillsCommand);
program.addCommand(statusCommand);
program.addCommand(doctorCommand);
program.addCommand(configCommand);
program.addCommand(docsCommand);
program.addCommand(flowCommand);
program.addCommand(mcpCommand);

// Custom help
program.addHelpText(
  'after',
  `
${chalk.bold('Examples (English):')}
  ${chalk.cyan('ax init my-project')}          Initialize a new project
  ${chalk.cyan('ax spec init')}                Create specification interactively
  ${chalk.cyan('ax config keys anthropic')}   Configure API key
  ${chalk.cyan('ax plan')}                     Generate task graph
  ${chalk.cyan('ax work')}                     Execute next task
  ${chalk.cyan('ax status')}                   View project status

${chalk.bold('Quick Start (English):')}
  1. ${chalk.cyan('ax init my-app')}           Create project
  2. ${chalk.cyan('cd my-app')}
  3. ${chalk.cyan('ax spec init')}             Define requirements
  4. ${chalk.cyan('ax plan')}                  Break down tasks
  5. ${chalk.cyan('ax work')}                  Start execution

${chalk.bold('示例（中文）:')}
  ${chalk.cyan('ax init my-project')}          初始化新项目
  ${chalk.cyan('ax spec init')}                交互式创建规格
  ${chalk.cyan('ax config keys anthropic')}   配置 API 密钥
  ${chalk.cyan('ax plan')}                     生成任务图
  ${chalk.cyan('ax work')}                     执行下一个任务
  ${chalk.cyan('ax status')}                   查看项目状态

${chalk.bold('快速开始（中文）:')}
  1. ${chalk.cyan('ax init my-app')}           创建项目
  2. ${chalk.cyan('cd my-app')}
  3. ${chalk.cyan('ax spec init')}             定义需求
  4. ${chalk.cyan('ax plan')}                  拆解任务
  5. ${chalk.cyan('ax work')}                  开始执行

${chalk.dim('Documentation: https://github.com/arrislink/axon')}
${chalk.dim('Issues: https://github.com/arrislink/axon/issues')}
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
