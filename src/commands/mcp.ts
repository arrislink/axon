import chalk from 'chalk';
import { Command } from 'commander';
import { ConfigManager } from '../core/config';
import { type McpLLMMode, startAxonMcpServer } from '../core/mcp/server';
import { AxonError } from '../utils/errors';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';

export const mcpCommand = new Command('mcp').description(t('Run MCP server', '运行 MCP Server'));

mcpCommand
  .command('run', { isDefault: true })
  .description(t('Start the MCP server', '启动 MCP 服务器'))
  .option('--llm <mode>', t('LLM mode: auto|off', 'LLM 模式: auto|off'), 'auto')
  .action(async (options) => {
    const projectRoot = ConfigManager.findRoot(process.cwd());
    if (!projectRoot) {
      throw new AxonError('当前目录或上级目录不是 Axon 项目', 'MCP_ERROR', [
        '请先运行 `ax init` 初始化项目',
      ]);
    }

    const llm = (options.llm === 'off' ? 'off' : 'auto') as McpLLMMode;
    await startAxonMcpServer({ projectRoot, llm });
  });

mcpCommand
  .command('info')
  .description(t('Show MCP configuration info for IDEs', '显示 IDE 的 MCP 配置信息'))
  .action(async () => {
    const projectRoot = ConfigManager.findRoot(process.cwd());
    if (!projectRoot) {
      throw new AxonError('当前目录或上级目录不是 Axon 项目', 'MCP_ERROR', [
        '请先运行 `ax init` 初始化项目',
      ]);
    }

    const axPath = process.argv[1]; // Usually the absolute path to the 'ax' binary or entry point

    logger.title('Axon MCP 集成配置指南');

    console.log(chalk.bold('1. Trae 配置步骤:'));
    console.log('   - 打开 Settings -> MCP');
    console.log('   - 点击 "Add Server"');
    console.log('   - Name: Axon');
    console.log('   - Type: stdio');
    console.log(`   - Command: ${chalk.cyan(axPath)}`);
    console.log(`   - Args: ${chalk.cyan('mcp run --llm off')}`);

    logger.blank();

    console.log(chalk.bold('2. Cursor 配置步骤:'));
    console.log('   - 打开 Settings -> Features -> MCP');
    console.log('   - 点击 "+ Add New MCP Server"');
    console.log('   - Name: Axon');
    console.log('   - Type: command');
    console.log(`   - Command: ${chalk.cyan(`${axPath} mcp run --llm off`)}`);

    logger.blank();

    console.log(chalk.bold('3. JSON 配置块 (可直接复制到 mcpservers.json):'));
    const configJson = {
      mcpServers: {
        Axon: {
          command: axPath,
          args: ['mcp', 'run', '--llm', 'off'],
          env: {
            PROJECT_ROOT: projectRoot,
          },
        },
      },
    };
    console.log(chalk.dim(JSON.stringify(configJson, null, 2)));

    logger.blank();
    logger.info(
      chalk.yellow('💡 提示: --llm off 模式将完全消耗 IDE 的模型额度，这是推荐的集成方式。'),
    );
  });
